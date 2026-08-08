"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { parsePublicRegistrationFormData } from "@/modules/registrations/registration.schema";
import type {
  PublicRegistrationFormField,
  PublicRegistrationFormState,
  PublicRegistrationFormValues,
} from "@/modules/registrations/registration-form-state";
import { registerParticipantForEvent } from "@/modules/registrations/registration.service";
import { setParticipantSessionCookie } from "@/modules/registrations/participant-session";
import { getRequestContext } from "@/shared/http/request-context";
import { isApplicationError } from "@/shared/errors/application-error";

const formFields: PublicRegistrationFormField[] = [
  "categoryIds",
  "fullName",
  "displayEmail",
  "displayPhone",
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

function formValues(formData: FormData): PublicRegistrationFormValues {
  return {
    categoryIds: formData
      .getAll("categoryIds")
      .map((value) => String(value))
      .filter(Boolean),
    fullName: formValue(formData, "fullName"),
    displayEmail: formValue(formData, "displayEmail"),
    displayPhone: formValue(formData, "displayPhone"),
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

function zodFieldErrors(error: ZodError): PublicRegistrationFormState["fieldErrors"] {
  const fieldErrors: PublicRegistrationFormState["fieldErrors"] = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");

    if (isFormField(field) && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

function domainFieldErrors(error: unknown): PublicRegistrationFormState["fieldErrors"] {
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

function formError(error: unknown): string {
  if (isApplicationError(error)) {
    if (error.code === "RATE_LIMITED") {
      return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
    }

    return error.safeMessage;
  }

  return "Pendaftaran belum berhasil. Periksa data lalu coba lagi.";
}

export async function submitRegistrationAction(
  slug: string,
  _state: PublicRegistrationFormState,
  formData: FormData,
): Promise<PublicRegistrationFormState> {
  const requestContext = await getRequestContext();
  const values = formValues(formData);

  try {
    const result = await registerParticipantForEvent({
      slug,
      registration: parsePublicRegistrationFormData(formData),
      requestContext,
    });
    await setParticipantSessionCookie(result.participantSession);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        values,
        fieldErrors: zodFieldErrors(error),
        formError: "Data pendaftaran belum lengkap atau belum sesuai.",
      };
    }

    const fieldErrors = domainFieldErrors(error);

    return {
      values,
      fieldErrors,
      formError: Object.keys(fieldErrors).length > 0 ? null : formError(error),
    };
  }

  redirect(`/events/${slug}/register/confirmation`);
}
