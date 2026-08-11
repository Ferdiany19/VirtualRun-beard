import { ZodError } from "zod";
import type { SubmissionDetail } from "@/modules/submissions/submission.types";

export type SubmissionFormField =
  | "activityPlatform"
  | "activityPlatformOther"
  | "activityUrl"
  | "activityDate"
  | "distanceKilometer"
  | "screenshot"
  | "participantNote"
  | "dataStatementAccepted";

export type SubmissionFormValues = {
  activityPlatform: string;
  activityPlatformOther: string;
  activityUrl: string;
  activityDate: string;
  distanceKilometer: string;
  participantNote: string;
  dataStatementAccepted: boolean;
  idempotencyKey: string;
};

export type SubmissionFormActionState = {
  values: SubmissionFormValues;
  fieldErrors: Partial<Record<SubmissionFormField, string>>;
  formError: string | null;
};

export function createSubmissionFormState(detail: SubmissionDetail, idempotencyKey: string): SubmissionFormActionState {
  const current = detail.currentRevision;
  return {
    values: {
      activityPlatform: current?.activityPlatform ?? "STRAVA",
      activityPlatformOther: current?.activityPlatformOther ?? "",
      activityUrl: current?.activityUrl ?? "",
      activityDate: current?.activityDate ?? "",
      distanceKilometer: current ? String(current.distanceMeter / 1000) : "",
      participantNote: current?.participantNote ?? "",
      dataStatementAccepted: false,
      idempotencyKey,
    },
    fieldErrors: {},
    formError: null,
  };
}

export function submissionFormValues(formData: FormData): SubmissionFormValues {
  return {
    activityPlatform: String(formData.get("activityPlatform") ?? ""),
    activityPlatformOther: String(formData.get("activityPlatformOther") ?? ""),
    activityUrl: String(formData.get("activityUrl") ?? ""),
    activityDate: String(formData.get("activityDate") ?? ""),
    distanceKilometer: String(formData.get("distanceKilometer") ?? ""),
    participantNote: String(formData.get("participantNote") ?? ""),
    dataStatementAccepted: formData.get("dataStatementAccepted") === "on",
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  };
}

export function submissionZodFieldErrors(error: ZodError): SubmissionFormActionState["fieldErrors"] {
  const errors: SubmissionFormActionState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "") as SubmissionFormField;
    if (!field || errors[field]) continue;
    errors[field] =
      field === "activityPlatform"
        ? "Pilih platform aktivitas."
        : field === "activityDate"
          ? "Tanggal aktivitas belum valid."
          : field === "distanceKilometer"
            ? "Jarak belum valid."
            : field === "activityPlatformOther"
              ? "Nama platform lain belum valid."
              : field === "activityUrl"
                ? "URL aktivitas belum valid."
                : field === "participantNote"
                  ? "Catatan peserta belum valid."
                  : field === "dataStatementAccepted"
                    ? "Pernyataan kebenaran data wajib dicentang."
                    : "Data ini belum valid.";
  }
  return errors;
}

export function submissionApplicationFieldError(message: string): SubmissionFormActionState["fieldErrors"] {
  if (message.includes("URL aktivitas")) return { activityUrl: message };
  if (message.includes("Tanggal aktivitas")) return { activityDate: message };
  if (message.includes("Jarak aktual")) return { distanceKilometer: message };
  if (message.includes("platform lainnya")) return { activityPlatformOther: message };
  if (message.includes("Screenshot") || message.includes("screenshot") || message.includes("Resolusi")) {
    return { screenshot: message };
  }
  if (message.includes("Pernyataan")) return { dataStatementAccepted: message };
  return {};
}
