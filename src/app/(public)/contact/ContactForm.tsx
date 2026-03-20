"use client";

import { useState, type FormEvent } from "react";
import styles from "./page.module.css";

type ContactFormMessages = {
  firstName: string;
  lastName: string;
  email: string;
  topic: string;
  topicSelect: string;
  topicCollab: string;
  topicConsult: string;
  topicMentor: string;
  topicOther: string;
  message: string;
  messagePlaceholder: string;
  send: string;
  sending: string;
  formHint: string;
  success: string;
  error: string;
};

type ContactFormProps = {
  messages: ContactFormMessages;
};

type ContactApiResponse = {
  ok?: boolean;
  error?: string;
};

export default function ContactForm({ messages }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSuccessText(null);
    setErrorText(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          email: formData.get("email"),
          topic: formData.get("topic"),
          message: formData.get("message"),
          website: formData.get("website"),
        }),
      });

      const data = await response.json().catch(() => null) as ContactApiResponse | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || messages.error);
      }

      form.reset();
      setSuccessText(messages.success);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : messages.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.formWrap}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className={styles.honeypot}
          aria-hidden="true"
        />

        <div className={styles.row}>
          <label>
            {messages.firstName}
            <input name="firstName" required />
          </label>
          <label>
            {messages.lastName}
            <input name="lastName" required />
          </label>
        </div>

        <label>
          {messages.email}
          <input name="email" type="email" required />
        </label>

        <label>
          {messages.topic}
          <select name="topic" defaultValue="" required>
            <option value="" disabled>{messages.topicSelect}</option>
            <option value="isbirligi">{messages.topicCollab}</option>
            <option value="danismanlik">{messages.topicConsult}</option>
            <option value="mentorluk">{messages.topicMentor}</option>
            <option value="diger">{messages.topicOther}</option>
          </select>
        </label>

        <label>
          {messages.message}
          <textarea
            name="message"
            rows={6}
            placeholder={messages.messagePlaceholder}
            required
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? messages.sending : messages.send}
        </button>
      </form>
      <p className={styles.formHint}>{messages.formHint}</p>
      {successText ? <p className={styles.success}>{successText}</p> : null}
      {errorText ? <p className={styles.error}>{errorText}</p> : null}
    </div>
  );
}
