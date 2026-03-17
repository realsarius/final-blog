"use server";

import { getServerSession } from "next-auth";
import { compare, hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ActionState {
  ok: boolean;
  message: string;
}

export async function changePassword(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, message: "Oturum bulunamadı." };
  }

  const currentPassword = formData.get("currentPassword")?.toString() ?? "";
  const newPassword = formData.get("newPassword")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (!currentPassword || !newPassword) {
    return { ok: false, message: "Tüm alanları doldur." };
  }

  if (newPassword.length < 8) {
    return { ok: false, message: "Yeni parola en az 8 karakter olmalı." };
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
