import { isApplicationError } from "@/shared/errors/application-error";
import { z } from "zod";

const errorMessages: Record<string, string> = {
  validation: "Data belum valid. Periksa field wajib dan urutan tanggal.",
  conflict: "Slug sudah digunakan. Gunakan slug lain.",
  forbidden: "Anda tidak memiliki izin untuk tindakan ini.",
  publish: "Event belum dapat dipublish. Pastikan minimal satu kategori aktif tersedia.",
  auth: "Email atau password tidak sesuai.",
  session: "Sesi admin tidak valid. Muat ulang halaman dan coba lagi.",
};

const successMessages: Record<string, string> = {
  settings: "Pengaturan berhasil disimpan.",
  template: "Template BIB berhasil diupload dan diaktifkan.",
  uploaded: "File berhasil diupload.",
};

export function FormMessage({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (success) {
    return (
      <div
        className="rounded-app border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-success"
        role="status"
      >
        {successMessages[success] ?? success}
      </div>
    );
  }

  if (!error) {
    return null;
  }

  return (
    <div
      className="rounded-app border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger"
      role="alert"
    >
      {errorMessages[error] ?? error}
    </div>
  );
}

export function errorToSearchParam(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "validation";
  }

  if (!isApplicationError(error)) {
    return "unknown";
  }

  if (error.code === "CONFLICT") {
    return "conflict";
  }

  if (error.code === "FORBIDDEN") {
    return "forbidden";
  }

  if (error.code === "UNAUTHORIZED") {
    return "auth";
  }

  if (error.code === "VALIDATION_FAILED") {
    return "validation";
  }

  return "unknown";
}
