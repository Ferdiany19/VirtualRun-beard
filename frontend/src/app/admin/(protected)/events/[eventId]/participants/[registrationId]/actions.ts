"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminSession, validateAdminCsrfToken } from "@/modules/auth/session";
import { requestBibRegenerationForAdmin } from "@/modules/bib/bib.service";
import { parseAdminParticipantUpdateFormData } from "@/modules/registrations/registration.schema";
import { updateParticipantForAdmin } from "@/modules/registrations/registration.service";
import { getRequestContext } from "@/shared/http/request-context";

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

export async function updateParticipantAction(
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await updateParticipantForAdmin({
      registrationId,
      admin,
      participant: parseAdminParticipantUpdateFormData(formData),
      correlationId: requestContext.correlationId,
    });
    revalidatePath(`/admin/events/${eventId}/participants`);
    revalidatePath(`/admin/events/${eventId}/participants/${registrationId}`);
  } catch {
    redirect(`/admin/events/${eventId}/participants/${registrationId}?error=updated`);
  }

  redirect(`/admin/events/${eventId}/participants/${registrationId}?success=updated`);
}

export async function regenerateBibAction(
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await requestBibRegenerationForAdmin({
      registrationId,
      admin,
      correlationId: requestContext.correlationId,
    });
    revalidatePath(`/admin/events/${eventId}/participants/${registrationId}`);
  } catch {
    redirect(`/admin/events/${eventId}/participants/${registrationId}?error=regenerate`);
  }

  redirect(`/admin/events/${eventId}/participants/${registrationId}?success=regenerate`);
}

export async function resendRegistrationEmailAction(
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const csrfToken = String(formData.get("csrfToken") ?? "");
  const cookieHeader = (await cookies()).toString();

  try {
    const response = await fetch(
      apiUrl(`/api/admin/registrations/${registrationId}/email/resend`),
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
          cookie: cookieHeader,
        },
        body: JSON.stringify({ csrfToken }),
      },
    );

    if (!response.ok) {
      throw new Error("Email resend failed");
    }

    revalidatePath(`/admin/events/${eventId}/participants/${registrationId}`);
  } catch {
    redirect(`/admin/events/${eventId}/participants/${registrationId}?error=email`);
  }

  redirect(`/admin/events/${eventId}/participants/${registrationId}?success=email`);
}
