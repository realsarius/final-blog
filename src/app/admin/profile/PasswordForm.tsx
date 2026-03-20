"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { changePassword } from "./actions";
import styles from "./page.module.css";

const initialState = { ok: false, message: "" };

type ProfileMessages = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  submit: string;
  submitting: string;
};

function SubmitButton({ messages }: { messages: ProfileMessages }) {
  const { pending } = useFormStatus();
  return (
    <button className={styles.primary} type="submit" disabled={pending}>
      {pending ? messages.submitting : messages.submit}
    </button>
  );
}

export default function PasswordForm({ messages }: { messages: ProfileMessages }) {
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
        <label htmlFor="currentPassword">{messages.currentPassword}</label>
        <input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="newPassword">{messages.newPassword}</label>
        <input id="newPassword" name="newPassword" type="password" required />
      </div>
      <div className={styles.field}>
        <label htmlFor="confirmPassword">{messages.confirmPassword}</label>
        <input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>

      {state.message ? (
        <p className={state.ok ? styles.success : styles.error}>
          {state.message}
        </p>
      ) : null}

      <SubmitButton messages={messages} />
    </form>
  );
}
