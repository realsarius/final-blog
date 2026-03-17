"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Giriş başarısız. Bilgileri kontrol edin.");
      return;
    }

    router.replace(callbackUrl);
  };

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Admin Girişi</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>E-posta</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Parola</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        {error ? (
          <p style={{ color: "#b91c1c", margin: 0 }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: 12,
            borderRadius: 6,
            border: "none",
            background: "#111827",
            color: "white",
            cursor: "pointer",
          }}
        >
          {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
        </button>
      </form>
    </main>
  );
}
