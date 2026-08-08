"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdminSession, validateAdminCsrfToken } from "@/modules/auth/session";
import { parseCategoryFormData } from "@/modules/categories/category.schema";
import {
  createManagedCategory,
  setManagedCategoryActiveStatus,
  updateManagedCategory,
} from "@/modules/categories/category.service";
import { parseEventFormData } from "@/modules/events/event.schema";
import {
  archiveManagedEvent,
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

export async function createEventAction(formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const mode = String(formData.get("mode") ?? "DRAFT") === "PUBLISH" ? "PUBLISH" : "DRAFT";
  let eventId = "";

  try {
    const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as {
      event?: { bannerObjectKey?: string | null; thumbnailObjectKey?: string | null };
      categories?: unknown[];
    };
    const banner = formData.get("banner");

    if (banner instanceof File && banner.size > 0) {
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
        throw new Error("banner upload failed");
      }

      const uploadData = (await uploadResponse.json()) as { objectKey: string };
      payload.event = {
        ...(payload.event ?? {}),
        bannerObjectKey: uploadData.objectKey,
        thumbnailObjectKey: uploadData.objectKey,
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
      throw new Error("event create failed");
    }

    const data = (await response.json()) as { event: { id: string } };
    eventId = data.event.id;
    revalidatePath("/");
    revalidatePath("/events");
  } catch {
    redirect("/admin/events/new?error=validation");
  }

  redirect(`/admin/events/${eventId}?success=${mode === "PUBLISH" ? "published" : "created"}`);
}

export async function updateEventAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await updateManagedEvent({
      eventId,
      admin,
      event: parseEventFormData(formData),
      correlationId: requestContext.correlationId,
    });
    revalidatePath("/");
    revalidatePath("/events");
    revalidatePath(`/admin/events/${eventId}`);
    redirect(`/admin/events/${eventId}/edit?success=updated`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/edit?error=${errorToSearchParam(error)}`);
  }
}

export async function publishEventAction(eventId: string, formData: FormData): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await publishManagedEvent({ eventId, admin, correlationId: requestContext.correlationId });
    revalidatePath("/");
    revalidatePath("/events");
    redirect(`/admin/events/${eventId}?success=published`);
  } catch (error) {
    redirect(
      `/admin/events/${eventId}?error=${errorToSearchParam(error) === "validation" ? "publish" : errorToSearchParam(error)}`,
    );
  }
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
    revalidatePath(`/admin/events/${eventId}/categories`);
    redirect(`/admin/events/${eventId}/categories?success=category-created`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/categories?error=${errorToSearchParam(error)}`);
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
    revalidatePath(`/admin/events/${eventId}/categories`);
    redirect(`/admin/events/${eventId}/categories?success=category-updated`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/categories?error=${errorToSearchParam(error)}`);
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
    revalidatePath(`/admin/events/${eventId}/categories`);
    redirect(`/admin/events/${eventId}/categories?success=category-status`);
  } catch (error) {
    redirect(`/admin/events/${eventId}/categories?error=${errorToSearchParam(error)}`);
  }
}
