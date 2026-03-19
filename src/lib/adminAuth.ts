import { getServerSession, type Session } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/securityLog";

function buildLoginUrl(callbackUrl: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

type AdminSession = Session & {
  user: NonNullable<Session["user"]> & {
    id: string;
    role: "ADMIN";
  };
};

export async function requireAdminSession(callbackUrl: string): Promise<AdminSession> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    logSecurityEvent({
      event: "admin_session_missing",
      severity: "warn",
      context: { callbackUrl },
    });
    redirect(buildLoginUrl(callbackUrl));
  }

  if (session.user.role !== "ADMIN") {
    logSecurityEvent({
      event: "admin_role_denied",
      severity: "warn",
      context: { callbackUrl, role: session.user.role },
    });
    redirect("/");
  }

  return session as AdminSession;
}
