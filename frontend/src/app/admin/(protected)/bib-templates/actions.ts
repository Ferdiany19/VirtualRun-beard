"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminSession, validateAdminCsrfToken } from "@/modules/auth/session";
import { parseBibSettingsFormData } from "@/modules/bib/bib.schema";

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

function redirectError(templateVersionId: string, code = "action") {
  redirect(`/admin/bib-templates/${templateVersionId}?error=bib-${code}`);
}

async function csrfHeaders(formData: FormData) {
  const csrfToken = String(formData.get("csrfToken") ?? "");

  return {
    "x-csrf-token": csrfToken,
    cookie: (await cookies()).toString(),
  };
}

export async function updateBibTemplateMetadataAction(
  templateVersionId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);

  try {
    const response = await fetch(apiUrl(`/api/admin/bib-templates/${templateVersionId}/metadata`), {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(await csrfHeaders(formData)),
      },
      body: JSON.stringify({
        csrfToken: formData.get("csrfToken"),
        name: formData.get("name"),
        description: formData.get("description"),
      }),
    });

    if (!response.ok) throw new Error("metadata failed");
  } catch {
    redirectError(templateVersionId, "metadata");
  }

  revalidatePath("/admin/bib-templates");
  revalidatePath(`/admin/bib-templates/${templateVersionId}`);
  redirect(`/admin/bib-templates/${templateVersionId}?success=draft`);
}

export async function updateBibTemplateSettingsAction(
  templateVersionId: string,
  eventId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);

  try {
    const response = await fetch(apiUrl(`/api/admin/events/${eventId}/bib/settings`), {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(await csrfHeaders(formData)),
      },
      body: JSON.stringify({
        ...parseBibSettingsFormData(formData),
        csrfToken: formData.get("csrfToken"),
      }),
    });

    if (!response.ok) throw new Error("settings failed");
  } catch {
    redirectError(templateVersionId, "settings");
  }

  revalidatePath("/admin/bib-templates");
  revalidatePath(`/admin/bib-templates/${templateVersionId}`);
  redirect(`/admin/bib-templates/${templateVersionId}?success=settings`);
}

export async function uploadBibTemplateDraftAction(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const template = formData.get("template");
  let templateVersionId = "";

  try {
    if (!(template instanceof File) || template.size <= 0) {
      throw new Error("missing template");
    }

    formData.set("status", "DRAFT");
    const response = await fetch(apiUrl(`/api/admin/events/${eventId}/bib/template`), {
      method: "POST",
      cache: "no-store",
      headers: await csrfHeaders(formData),
      body: formData,
    });

    if (!response.ok) throw new Error("upload failed");
    const data = (await response.json()) as { id: string };
    templateVersionId = data.id;
  } catch {
    redirect(`/admin/bib-templates?error=bib-upload`);
  }

  revalidatePath("/admin/bib-templates");
  redirect(`/admin/bib-templates/${templateVersionId}?success=uploaded`);
}

export async function publishBibTemplateAction(
  templateVersionId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);

  try {
    const response = await fetch(apiUrl(`/api/admin/bib-templates/${templateVersionId}/publish`), {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(await csrfHeaders(formData)),
      },
      body: JSON.stringify({
        csrfToken: formData.get("csrfToken"),
        eventId: formData.get("eventId"),
        settings: parseBibSettingsFormData(formData),
      }),
    });

    if (!response.ok) throw new Error("publish failed");
  } catch {
    redirectError(templateVersionId, "publish");
  }

  revalidatePath("/admin/bib-templates");
  revalidatePath(`/admin/bib-templates/${templateVersionId}`);
  redirect(`/admin/bib-templates/${templateVersionId}?success=published`);
}

export async function archiveBibTemplateAction(
  templateVersionId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);

  try {
    const response = await fetch(apiUrl(`/api/admin/bib-templates/${templateVersionId}/archive`), {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(await csrfHeaders(formData)),
      },
      body: JSON.stringify({ csrfToken: formData.get("csrfToken") }),
    });

    if (!response.ok) throw new Error("archive failed");
  } catch {
    redirectError(templateVersionId, "archive");
  }

  revalidatePath("/admin/bib-templates");
  revalidatePath(`/admin/bib-templates/${templateVersionId}`);
  redirect(`/admin/bib-templates/${templateVersionId}?success=archived`);
}

export async function duplicateBibTemplateAction(
  templateVersionId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  let duplicateId = "";

  try {
    const response = await fetch(
      apiUrl(`/api/admin/bib-templates/${templateVersionId}/duplicate`),
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          ...(await csrfHeaders(formData)),
        },
        body: JSON.stringify({ csrfToken: formData.get("csrfToken") }),
      },
    );

    if (!response.ok) throw new Error("duplicate failed");
    const data = (await response.json()) as { id: string };
    duplicateId = data.id;
  } catch {
    redirectError(templateVersionId, "duplicate");
  }

  revalidatePath("/admin/bib-templates");
  redirect(`/admin/bib-templates/${duplicateId}?success=duplicated`);
}
