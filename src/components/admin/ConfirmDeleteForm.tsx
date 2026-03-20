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
  buttonLabel = "Delete",
  confirmMessage = "Are you sure you want to delete this record?",
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
