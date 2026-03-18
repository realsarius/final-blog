"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { changePassword } from "./actions";
import styles from "./page.module.css";

const initialState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.primary} type="submit" disabled={pending}>
      {pending ? "Güncelleniyor..." : "Parolayı Güncelle"}
    </button>
  );
}

export default function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialState);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || lastMessageRef.current === state.message) {
      return;
    }
    lastMessageRef.current = state.message;
    if (state.ok) {
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form className={styles.form} action={formAction}>
      <div className={styles.field}>
        <label htmlFor="currentPassword">Mevcut parola</label>
        <input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="newPassword">Yeni parola</label>
        <input id="newPassword" name="newPassword" type="password" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="confirmPassword">Yeni parola (tekrar)</label>
        <input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>

      {state.message ? (
        <p className={state.ok ? styles.success : styles.error}>
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
