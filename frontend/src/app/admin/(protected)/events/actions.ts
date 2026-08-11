"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminSession, validateAdminCsrfToken } from "@/modules/auth/session";
import { uploadManagedCertificateTemplate } from "@/modules/certificates/certificate.service";
import { parseCategoryFormData } from "@/modules/categories/category.schema";
import {
  createManagedCategory,
  deleteManagedCategory,
  setManagedCategoryActiveStatus,
  updateManagedCategory,
} from "@/modules/categories/category.service";
import { parseEventFormData } from "@/modules/events/event.schema";
import {
  archiveManagedEvent,
  completeManagedEvent,
  publishManagedEvent,
  unpublishManagedEvent,
  updateManagedEvent,
} from "@/modules/events/event.service";
import { errorToSearchParam } from "@/modules/events/components/form-message";
import { getRequestContext } from "@/shared/http/request-context";

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

async function csrfHeaders(formData: FormData) {
  const csrfToken = String(formData.get("csrfToken") ?? "");

  return {
    "x-csrf-token": csrfToken,
    cookie: (await cookies()).toString(),
  };
}

async function uploadEventBanner(formData: FormData): Promise<string | null> {
  const banner = formData.get("banner");

  if (!(banner instanceof File) || banner.size === 0) {
    return null;
  }

  const uploadForm = new FormData();
  uploadForm.set("csrfToken", String(formData.get("csrfToken") ?? ""));
  uploadForm.set("banner", banner);
  const uploadResponse = await fetch(apiUrl("/api/admin/events/banner"), {
    method: "POST",
    cache: "no-store",
    headers: await csrfHeaders(formData),
    body: uploadForm,
  });

  if (!uploadResponse.ok) {
    const responseData = (await uploadResponse.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      responseData?.error?.message ??
        "Banner event belum dapat diupload. Gunakan file JPG atau PNG yang valid.",
    );
  }

  const uploadData = (await uploadResponse.json()) as { objectKey: string };
  return uploadData.objectKey;
}

export type CreateEventActionState = {
  error: string | null;
};

export async function createEventAction(
  _previousState: CreateEventActionState,
  formData: FormData,
): Promise<CreateEventActionState> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const mode = String(formData.get("mode") ?? "DRAFT") === "PUBLISH" ? "PUBLISH" : "DRAFT";
  let eventId = "";

  try {
    const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as {
      event?: { bannerObjectKey?: string | null; thumbnailObjectKey?: string | null };
      categories?: unknown[];
    };
    const bannerObjectKey = await uploadEventBanner(formData);

    if (bannerObjectKey) {
      payload.event = {
        ...(payload.event ?? {}),
        bannerObjectKey,
        thumbnailObjectKey: bannerObjectKey,
      };
    }

    const response = await fetch(apiUrl("/api/admin/events/full-create"), {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(await csrfHeaders(formData)),
      },
      body: JSON.stringify({
        ...payload,
        mode,
        csrfToken: formData.get("csrfToken"),
      }),
    });

    if (!response.ok) {
      const responseData = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      return {
        error:
          responseData?.error?.message ??
          "Event belum dapat disimpan. Periksa kembali data yang diisi.",
      };
    }

    const data = (await response.json()) as { event: { id: string } };
    eventId = data.event.id;
    revalidatePath("/");
    revalidatePath("/events");
  } catch {
    return {
      error: "Event belum dapat disimpan. Periksa kembali data dan koneksi Anda.",
    };
  }

  redirect(`/admin/events/${eventId}?success=${mode === "PUBLISH" ? "published" : "created"}`);
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    const bannerObjectKey = await uploadEventBanner(formData);
    const event = parseEventFormData(formData);

    if (bannerObjectKey) {
      event.bannerObjectKey = bannerObjectKey;
      event.thumbnailObjectKey = bannerObjectKey;
    }

    await updateManagedEvent({
      eventId,
      admin,
      event,
      correlationId: requestContext.correlationId,
    });
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/admin/events/${eventId}`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/edit?error=${errorToSearchParam(error)}`);
  }

  redirect(`/admin/events/${eventId}/edit?success=updated`);
}

export async function publishEventAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await publishManagedEvent({ eventId, admin, correlationId: requestContext.correlationId });
    revalidatePath("/");
    revalidatePath("/events");
  } catch (error) {
    redirect(
      `/admin/events/${eventId}?error=${errorToSearchParam(error) === "validation" ? "publish" : errorToSearchParam(error)}`,
    );
  }

  redirect(`/admin/events/${eventId}?success=published`);
}

export async function unpublishEventAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await unpublishManagedEvent({ eventId, admin, correlationId: requestContext.correlationId });
    revalidatePath("/");
    revalidatePath("/events");
    redirect(`/admin/events/${eventId}?success=unpublished`);
  } catch (error) {
    redirect(`/admin/events/${eventId}?error=${errorToSearchParam(error)}`);
  }
}

export async function archiveEventAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await archiveManagedEvent({ eventId, admin, correlationId: requestContext.correlationId });
    revalidatePath("/");
    revalidatePath("/events");
    redirect(`/admin/events/${eventId}?success=archived`);
  } catch (error) {
    redirect(`/admin/events/${eventId}?error=${errorToSearchParam(error)}`);
  }
}

export async function completeEventAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await completeManagedEvent({ eventId, admin, correlationId: requestContext.correlationId });
    revalidatePath(`/admin/events/${eventId}`);
    redirect(`/admin/events/${eventId}?success=completed`);
  } catch (error) {
    redirect(`/admin/events/${eventId}?error=${errorToSearchParam(error)}`);
  }
}

export async function uploadCertificateTemplateAction(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();
  const template = formData.get("certificateTemplate");

  try {
    if (!(template instanceof File) || template.size === 0) {
      throw new Error("certificate template missing");
    }

    await uploadManagedCertificateTemplate({
      eventId,
      admin,
      file: template,
      correlationId: requestContext.correlationId,
    });
    revalidatePath(`/admin/events/${eventId}`);
    redirect(`/admin/events/${eventId}?success=certificate-template`);
  } catch (error) {
    redirect(`/admin/events/${eventId}?error=${errorToSearchParam(error)}`);
  }
}

export async function createCategoryAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await createManagedCategory({
      eventId,
      admin,
      category: parseCategoryFormData(formData),
      correlationId: requestContext.correlationId,
    });
    revalidatePath(`/admin/events/${eventId}/edit`);
    redirect(`/admin/events/${eventId}/edit?success=category-created#kategori`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/edit?error=${errorToSearchParam(error)}#kategori`);
  }
}

export async function updateCategoryAction(
  eventId: string,
  categoryId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await updateManagedCategory({
      categoryId,
      admin,
      category: parseCategoryFormData(formData),
      correlationId: requestContext.correlationId,
    });
    revalidatePath(`/admin/events/${eventId}/edit`);
    redirect(`/admin/events/${eventId}/edit?success=category-updated#kategori`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/edit?error=${errorToSearchParam(error)}#kategori`);
  }
}

export async function setCategoryActiveAction(
  eventId: string,
  categoryId: string,
  isActive: boolean,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await setManagedCategoryActiveStatus({
      categoryId,
      isActive,
      admin,
      correlationId: requestContext.correlationId,
    });
    revalidatePath(`/admin/events/${eventId}/edit`);
    redirect(`/admin/events/${eventId}/edit?success=category-status#kategori`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/edit?error=${errorToSearchParam(error)}#kategori`);
  }
}

export async function deleteCategoryAction(
  eventId: string,
  categoryId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await deleteManagedCategory({
      categoryId,
      admin,
      correlationId: requestContext.correlationId,
    });
    revalidatePath(`/admin/events/${eventId}/edit`);
    redirect(`/admin/events/${eventId}/edit?success=category-deleted#kategori`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/edit?error=${errorToSearchParam(error)}#kategori`);
  }
}
