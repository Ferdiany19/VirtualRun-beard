import { ZodError } from "zod";
import type {
  PublicRegistrationFormField,
  PublicRegistrationFormState,
  PublicRegistrationFormValues,
} from "@/modules/registrations/registration-form-state";
import { isApplicationError } from "@/shared/errors/application-error";

const formFields: PublicRegistrationFormField[] = [
  "categoryIds",
  "fullName",
  "displayEmail",
  "displayPhone",
  "instagramUsername",
  "gender",
  "dateOfBirth",
  "province",
  "cityOrRegency",
  "district",
  "postalCode",
  "emergencyContactName",
  "emergencyContactPhone",
  "termsAccepted",
  "privacyAccepted",
  "dataStatementAccepted",
  "turnstileToken",
  "idempotencyKey",
];

function formValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

export function formValues(formData: FormData): PublicRegistrationFormValues {
  return {
    categoryIds: formData
      .getAll("categoryIds")
      .map((value) => String(value))
      .filter(Boolean),
    fullName: formValue(formData, "fullName"),
    displayEmail: formValue(formData, "displayEmail"),
    displayPhone: formValue(formData, "displayPhone"),
    instagramUsername: formValue(formData, "instagramUsername"),
    gender: formValue(formData, "gender"),
    dateOfBirth: formValue(formData, "dateOfBirth"),
    province: formValue(formData, "province"),
    cityOrRegency: formValue(formData, "cityOrRegency"),
    district: formValue(formData, "district"),
    postalCode: formValue(formData, "postalCode"),
    emergencyContactName: formValue(formData, "emergencyContactName"),
    emergencyContactPhone: formValue(formData, "emergencyContactPhone"),
    termsAccepted: formData.get("termsAccepted") === "on",
    privacyAccepted: formData.get("privacyAccepted") === "on",
    dataStatementAccepted: formData.get("dataStatementAccepted") === "on",
    turnstileToken:
      formValue(formData, "turnstileToken") || formValue(formData, "cf-turnstile-response"),
    idempotencyKey: formValue(formData, "idempotencyKey"),
  };
}

function isFormField(value: string): value is PublicRegistrationFormField {
  return formFields.includes(value as PublicRegistrationFormField);
}

export function zodFieldErrors(error: ZodError): PublicRegistrationFormState["fieldErrors"] {
  const fieldErrors: PublicRegistrationFormState["fieldErrors"] = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");

    if (isFormField(field) && !fieldErrors[field]) {
      if (field === "turnstileToken") {
        fieldErrors[field] =
          "Verifikasi keamanan belum terkirim. Silakan selesaikan verifikasi keamanan.";
        continue;
      }

      if (/Expected .*received null|Invalid input/i.test(issue.message)) {
        const requiredMessages: Partial<Record<PublicRegistrationFormField, string>> = {
          categoryIds: "Pilih minimal satu kategori.",
          fullName: "Nama lengkap wajib diisi.",
          displayEmail: "Email wajib diisi.",
          displayPhone: "Nomor HP wajib diisi.",
          instagramUsername: "Username Instagram wajib diisi.",
          province: "Provinsi wajib diisi.",
          cityOrRegency: "Kota/kabupaten wajib diisi.",
          termsAccepted: "Persetujuan syarat wajib dicentang.",
          privacyAccepted: "Persetujuan privasi wajib dicentang.",
          dataStatementAccepted: "Pernyataan data wajib dicentang.",
        };

        fieldErrors[field] = requiredMessages[field] ?? "Data ini belum diisi dengan benar.";
        continue;
      }

      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

export function domainFieldErrors(error: unknown): PublicRegistrationFormState["fieldErrors"] {
  if (!isApplicationError(error)) {
    return {};
  }

  if (error.safeMessage.includes("Tanggal lahir") || error.safeMessage.includes("Usia peserta")) {
    return { dateOfBirth: error.safeMessage };
  }

  if (error.safeMessage.includes("Gender peserta")) {
    return { gender: error.safeMessage };
  }

  if (error.safeMessage.includes("Kategori")) {
    return { categoryIds: error.safeMessage };
  }

  if (error.safeMessage.includes("email") || error.safeMessage.includes("Email")) {
    return { displayEmail: error.safeMessage };
  }

  if (error.safeMessage.includes("nomor HP") || error.safeMessage.includes("Nomor HP")) {
    return { displayPhone: error.safeMessage };
  }

  return {};
}

export function formError(error: unknown): string {
  if (isApplicationError(error)) {
    if (error.code === "RATE_LIMITED") {
      return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
    }

    return error.safeMessage;
  }

  return "Pendaftaran belum berhasil. Periksa data lalu coba lagi.";
}
