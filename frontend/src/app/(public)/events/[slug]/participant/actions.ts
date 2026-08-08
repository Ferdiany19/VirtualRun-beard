"use server";

import { redirect } from "next/navigation";
import { parseParticipantAccessFormData } from "@/modules/registrations/registration.schema";
import { createParticipantSessionForAccess } from "@/modules/registrations/registration.service";
import { setParticipantSessionCookie } from "@/modules/registrations/participant-session";
import { getRequestContext } from "@/shared/http/request-context";

export async function participantAccessAction(slug: string, formData: FormData): Promise<void> {
  const requestContext = await getRequestContext();

  try {
    const result = await createParticipantSessionForAccess({
      eventSlug: slug,
      access: parseParticipantAccessFormData(formData),
      requestContext,
    });
    await setParticipantSessionCookie(result.participantSession);
    redirect(`/events/${slug}/participant`);
  } catch {
    redirect(`/events/${slug}/participant?error=access`);
  }
}
