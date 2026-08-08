"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSessionCookies,
  requireAdminSession,
  validateAdminCsrfToken,
} from "@/modules/auth/session";
import { logoutAdmin } from "@/modules/auth/auth.service";
import { getRequestContext } from "@/shared/http/request-context";

export async function logoutAction(formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  const requestContext = await getRequestContext();

  await validateAdminCsrfToken(formData, admin);
  await logoutAdmin({
    admin,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    correlationId: requestContext.correlationId,
  });
  await clearAdminSessionCookies();
  redirect("/admin/login");
}
