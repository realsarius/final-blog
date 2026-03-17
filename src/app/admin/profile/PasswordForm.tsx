"use client";

import { useFormState, useFormStatus } from "react-dom";
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
  const [state, formAction] = useFormState(changePassword, initialState);

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
