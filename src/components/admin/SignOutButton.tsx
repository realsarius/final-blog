"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export default function SignOutButton({ className, label = "Sign out" }: SignOutButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      {label}
    </button>
  );
}
