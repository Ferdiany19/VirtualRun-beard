"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import {
  getParticipantSessionToken,
  validateParticipantCsrfToken,
} from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { parseSubmissionFormData } from "@/modules/submissions/submission.schema";
import { submitParticipantRevision } from "@/modules/submissions/submission.service";
import { getRequestContext } from "@/shared/http/request-context";
import { isApplicationError } from "@/shared/errors/application-error";
import {
  submissionApplicationFieldError,
  submissionFormValues,
  submissionZodFieldErrors,
  type SubmissionFormActionState,
} from "@/modules/submissions/submission-form-state";

export async function submitParticipantRevisionAction(
  slug: string,
  registrationCategoryId: string,
  _previousState: SubmissionFormActionState,
  formData: FormData,
): Promise<SubmissionFormActionState> {
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (!session || session.summary.event.slug !== slug) {
    redirect(`/events/${slug}/participant?error=access`);
  }

  try {
    await validateParticipantCsrfToken(formData, session);
    const parsed = parseSubmissionFormData(formData);
    await submitParticipantRevision({
      eventSlug: slug,
      registrationCategoryId,
      form: parsed.input,
      screenshot: parsed.screenshot,
      session,
      requestContext: await getRequestContext(),
    });
  } catch (error) {
    const values = submissionFormValues(formData);
    if (error instanceof ZodError) {
      return { values, fieldErrors: submissionZodFieldErrors(error), formError: null };
    }

    if (isApplicationError(error)) {
      const fieldErrors = submissionApplicationFieldError(error.safeMessage);
      return {
        values,
        fieldErrors,
        formError: Object.keys(fieldErrors).length === 0 ? error.safeMessage : null,
      };
    }

    return {
      values,
      fieldErrors: {},
      formError: "Upload belum berhasil. Periksa kembali data dan coba lagi.",
    };
  }

  redirect(
    `/events/${slug}/participant/submissions/${registrationCategoryId}/history?success=submitted`,
  );
}
