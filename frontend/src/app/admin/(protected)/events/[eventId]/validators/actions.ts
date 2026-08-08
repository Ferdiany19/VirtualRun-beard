"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession, validateAdminCsrfToken } from "@/modules/auth/session";
import { errorToSearchParam } from "@/modules/events/components/form-message";
import {
  assignEventValidator,
  revokeEventValidator,
} from "@/modules/validation/validation.service";
import { getRequestContext } from "@/shared/http/request-context";

function validatorsPath(eventId: string, query: string): string {
  return `/admin/events/${eventId}/validators?${query}`;
}

export async function assignValidatorAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await assignEventValidator({ eventId, admin, formData, requestContext });
    revalidatePath(`/admin/events/${eventId}/validators`);
    redirect(validatorsPath(eventId, "success=assigned"));
  } catch (error) {
    redirect(validatorsPath(eventId, `error=${errorToSearchParam(error)}`));
  }
}

export async function revokeValidatorAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await revokeEventValidator({ eventId, admin, formData, requestContext });
    revalidatePath(`/admin/events/${eventId}/validators`);
    redirect(validatorsPath(eventId, "success=revoked"));
  } catch (error) {
    redirect(validatorsPath(eventId, `error=${errorToSearchParam(error)}`));
  }
}
