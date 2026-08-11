import { isApplicationError } from "@/shared/errors/application-error";
import { z } from "zod";

const errorMessages: Record<string, string> = {
  validation: "Data belum valid. Periksa field wajib dan urutan tanggal.",
  conflict: "Slug sudah digunakan. Gunakan slug lain.",
  forbidden: "Anda tidak memiliki izin untuk tindakan ini.",
  publish: "Event belum dapat dipublish. Pastikan minimal satu kategori aktif dan BIB Template aktif tersedia.",
  "publish-bib-template":
    "Event belum memiliki BIB Template aktif. Buat atau publikasikan BIB Template terlebih dahulu.",
  auth: "Email atau password tidak sesuai.",
  session: "Sesi admin tidak valid. Muat ulang halaman dan coba lagi.",
  email: "Email belum dapat dikirim ulang.",
  regenerate: "BIB belum dapat diproses ulang.",
  updated: "Perubahan belum dapat disimpan.",
  "bib-action": "Tindakan template BIB belum berhasil.",
  "bib-metadata": "Metadata template BIB belum dapat disimpan.",
  "bib-settings": "Pengaturan BIB belum dapat disimpan.",
  "bib-upload": "Template BIB belum dapat diupload.",
  "bib-publish": "Template BIB belum dapat dipublikasikan.",
  "bib-archive": "Template BIB belum dapat diarsipkan.",
  "bib-duplicate": "Template BIB belum dapat diduplikat.",
  certificate: "Template sertifikat belum dapat diproses.",
};

const successMessages: Record<string, string> = {
  settings: "Pengaturan berhasil disimpan.",
  template: "Template BIB berhasil diupload dan diaktifkan.",
  uploaded: "File berhasil diupload.",
  email: "Email konfirmasi dimasukkan ke antrean pengiriman.",
  regenerate: "BIB dimasukkan ke antrean pemrosesan ulang dan email akan dikirim setelah siap.",
  updated: "Perubahan berhasil disimpan.",
  draft: "Draft template BIB berhasil disimpan.",
  published: "Template BIB berhasil dipublikasikan.",
  archived: "Template BIB berhasil diarsipkan.",
  duplicated: "Template BIB berhasil diduplikat.",
  completed: "Event selesai. Sertifikat eligible dimasukkan ke antrean pengiriman.",
  "certificate-template": "Template sertifikat berhasil diupload.",
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
    if (error.details?.reason === "MISSING_ACTIVE_BIB_TEMPLATE") {
      return "publish-bib-template";
    }

    return "validation";
  }

  return "unknown";
}
