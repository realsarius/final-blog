import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

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
        const limiter = await rateLimit(`login:${ip}`);
        if (!limiter.allowed) {
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
          return null;
        }

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
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
        token.id = user.id;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
