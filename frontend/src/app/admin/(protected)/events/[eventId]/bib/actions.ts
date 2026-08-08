"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession, validateAdminCsrfToken } from "@/modules/auth/session";
import { parseBibSettingsFormData } from "@/modules/bib/bib.schema";
import { updateManagedBibSettings, uploadManagedBibTemplate } from "@/modules/bib/bib.service";
import { isApplicationError } from "@/shared/errors/application-error";
import { getRequestContext } from "@/shared/http/request-context";

function actionErrorParams(error: unknown) {
  const message = isApplicationError(error)
    ? error.safeMessage
    : "Tindakan belum berhasil. Silakan coba lagi.";

  return new URLSearchParams({
    error: "message",
    message: message.slice(0, 180),
  }).toString();
}

export async function updateBibSettingsAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await updateManagedBibSettings({
      eventId,
      admin,
      settings: parseBibSettingsFormData(formData),
      correlationId: requestContext.correlationId,
    });
  } catch (error) {
    redirect(`/admin/events/${eventId}/bib?${actionErrorParams(error)}`);
  }

  revalidatePath(`/admin/events/${eventId}/bib`);
  redirect(`/admin/events/${eventId}/bib?success=settings`);
}

export async function uploadBibTemplateAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();
  const file = formData.get("template");

  try {
    if (!(file instanceof File)) {
      throw new Error("Missing template file");
    }

    await uploadManagedBibTemplate({
      eventId,
      admin,
      file,
      correlationId: requestContext.correlationId,
    });
  } catch (error) {
    redirect(`/admin/events/${eventId}/bib?${actionErrorParams(error)}`);
  }

  revalidatePath(`/admin/events/${eventId}/bib`);
  redirect(`/admin/events/${eventId}/bib?success=template`);
}
