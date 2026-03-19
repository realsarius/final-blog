"use server";

import { compare, hash } from "bcryptjs";
import { requireAdminSession } from "@/lib/adminAuth";
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
  const session = await requireAdminSession("/admin/profile");

  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!currentPassword || !newPassword) {
    return { ok: false, message: "Tüm alanları doldur." };
  }

  const passwordValidation = passwordSchema.safeParse(newPassword);
  if (!passwordValidation.success) {
    return { ok: false, message: passwordValidation.error.issues[0]?.message ?? "Parola hatalı." };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, message: "Parolalar eşleşmiyor." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { ok: false, message: "Kullanıcı bulunamadı." };
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { ok: false, message: "Mevcut parola hatalı." };
  }

  const passwordHash = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { ok: true, message: "Parola güncellendi." };
}
