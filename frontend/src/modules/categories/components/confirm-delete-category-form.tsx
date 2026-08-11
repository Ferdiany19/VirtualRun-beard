"use client";

type ConfirmDeleteCategoryFormProps = {
  action: (formData: FormData) => Promise<void>;
  csrfToken: string;
};

export function ConfirmDeleteCategoryForm({
  action,
  csrfToken,
}: ConfirmDeleteCategoryFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Hapus kategori ini secara permanen? Kategori yang sudah dipakai peserta tidak dapat dihapus.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-app border border-red-200 px-4 py-2 text-sm font-bold text-danger hover:border-danger"
        type="submit"
      >
        Hapus kategori
      </button>
    </form>
  );
}
