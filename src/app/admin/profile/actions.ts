"use server";

import { compare, hash } from "bcryptjs";
import { requireAdminSession } from "@/lib/adminAuth";
import { getMessages, getServerLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validation";

interface ActionState {
  ok: boolean;
  message: string;
}

export async function changePassword(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const locale = await getServerLocale();
  const messages = await getMessages(locale);
  const m = messages.admin.profile;
  const session = await requireAdminSession("/admin/profile");

  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!currentPassword || !newPassword) {
    return { ok: false, message: m.allFieldsRequired };
  }

  const passwordValidation = passwordSchema.safeParse(newPassword);
  if (!passwordValidation.success) {
    return { ok: false, message: m.invalidPassword };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, message: m.passwordMismatch };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { ok: false, message: m.userNotFound };
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { ok: false, message: m.currentPasswordInvalid };
  }

  const passwordHash = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });

  return { ok: true, message: m.passwordUpdated };
}
