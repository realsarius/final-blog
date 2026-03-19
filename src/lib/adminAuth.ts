import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

function buildLoginUrl(callbackUrl: string) {
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export async function requireAdminSession(callbackUrl: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(buildLoginUrl(callbackUrl));
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return session;
}
