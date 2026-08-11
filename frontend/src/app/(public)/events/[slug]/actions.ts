"use server";

import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { parsePublicRegistrationFormData } from "@/modules/registrations/registration.schema";
import type { PublicRegistrationFormState } from "@/modules/registrations/registration-form-state";
import {
  domainFieldErrors,
  formError,
  formValues,
  zodFieldErrors,
} from "@/modules/registrations/registration-action-state";
import { registerParticipantForEvent } from "@/modules/registrations/registration.service";
import { setParticipantSessionCookie } from "@/modules/registrations/participant-session";
import { getRequestContext } from "@/shared/http/request-context";

export async function submitEventDetailRegistrationAction(
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
