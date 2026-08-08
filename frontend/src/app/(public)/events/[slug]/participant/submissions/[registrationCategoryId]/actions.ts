"use server";

import { redirect } from "next/navigation";
import {
  getParticipantSessionToken,
  validateParticipantCsrfToken,
} from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { parseSubmissionFormData } from "@/modules/submissions/submission.schema";
import { submitParticipantRevision } from "@/modules/submissions/submission.service";
import { getRequestContext } from "@/shared/http/request-context";

export async function submitParticipantRevisionAction(
  slug: string,
  registrationCategoryId: string,
  formData: FormData,
): Promise<void> {
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
  } catch {
    redirect(`/events/${slug}/participant/submissions/${registrationCategoryId}?error=submit`);
  }

  redirect(
    `/events/${slug}/participant/submissions/${registrationCategoryId}/history?success=submitted`,
  );
}
