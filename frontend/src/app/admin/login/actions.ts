"use server";

import { redirect } from "next/navigation";
import { authenticateAdmin } from "@/modules/auth/auth.service";
import { setAdminSessionCookies } from "@/modules/auth/session";
import { errorToSearchParam } from "@/modules/events/components/form-message";
import { getRequestContext } from "@/shared/http/request-context";

export async function loginAction(formData: FormData): Promise<void> {
  const requestContext = await getRequestContext();

  try {
    const tokens = await authenticateAdmin({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      correlationId: requestContext.correlationId,
    });
    await setAdminSessionCookies(tokens);
  } catch (error) {
    redirect(`/admin/login?error=${errorToSearchParam(error)}`);
  }

  redirect("/admin");
}
