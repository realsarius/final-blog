"use client";

type ConfirmDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  idValue: string;
  idName?: string;
  className?: string;
  buttonLabel?: string;
  confirmMessage?: string;
};

export default function ConfirmDeleteForm({
  action,
  idValue,
  idName = "id",
  className,
  buttonLabel = "Sil",
  confirmMessage = "Bu kaydı silmek istediğine emin misin?",
}: ConfirmDeleteFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name={idName} value={idValue} />
      <button className={className} type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}
