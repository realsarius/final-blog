import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET must be set in production.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        const ip = getClientIp(req);
        const limiterIdentity = ip !== "unknown" ? `ip:${ip}` : `email:${email}`;
        const limiter = await rateLimit(`login:${limiterIdentity}`);
        if (!limiter.allowed) {
          logSecurityEvent({
            event: "login_rate_limited",
            severity: "warn",
            context: { ip, email, limiterIdentity },
          });
          const retryInMinutes = Math.max(
            1,
            Math.ceil((limiter.reset - Date.now()) / 60000)
          );
          throw new Error(`RATE_LIMIT:${retryInMinutes}`);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) {
          logSecurityEvent({
            event: "login_user_inactive_or_missing",
            severity: "warn",
            context: { email, userFound: Boolean(user), isActive: user?.isActive ?? null },
          });
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          logSecurityEvent({
            event: "login_invalid_password",
            severity: "warn",
            context: { email, userId: user.id },
          });
          return null;
        }

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  useSecureCookies: isProd,
  cookies: {
    sessionToken: {
      name:
        isProd
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const userWithRole = user as unknown as { role?: Role; tokenVersion?: number };
        token.id = user.id;
        token.role = userWithRole.role ?? "ADMIN";
        token.tokenVersion = userWithRole.tokenVersion ?? 0;
        token.isActive = true;
        return token;
      }

      if (!token.id) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: {
          id: true,
          role: true,
          isActive: true,
          tokenVersion: true,
        },
      });

      if (!dbUser || !dbUser.isActive) {
        logSecurityEvent({
          event: "session_invalidated_inactive_user",
          severity: "warn",
          context: { userId: token.id ?? null, userFound: Boolean(dbUser) },
        });
        delete token.id;
        delete token.role;
        delete token.tokenVersion;
        token.isActive = false;
        return token;
      }

      if (
        typeof token.tokenVersion === "number"
        && dbUser.tokenVersion !== token.tokenVersion
      ) {
        logSecurityEvent({
          event: "session_invalidated_token_version_mismatch",
          severity: "warn",
          context: { userId: token.id ?? null },
        });
        delete token.id;
        delete token.role;
        delete token.tokenVersion;
        token.isActive = false;
        return token;
      }

      token.role = dbUser.role;
      token.tokenVersion = dbUser.tokenVersion;
      token.isActive = true;
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.id || token.isActive === false || !token.role) {
        session.user = undefined;
        return session;
      }

      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
