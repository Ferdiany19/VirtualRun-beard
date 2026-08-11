import { requireAdminSession } from "@/modules/auth/session";
import { cookies } from "next/headers";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { ValidationQueueView } from "@/modules/validation/components/validation-views";
import type { ValidationQueueItem } from "@/modules/validation/validation.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MyValidationQueuePageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

async function fetchValidationQueue(
  query: Record<string, string | undefined>,
): Promise<ValidationQueueItem[]> {
  const params = new URLSearchParams();
  const filterNames = [
    "eventId",
    "categoryId",
    "status",
    "activityPlatform",
    "evidenceType",
    "search",
    "hasWarning",
    "distanceCheck",
    "sort",
    "page",
  ];

  for (const name of filterNames) {
    const value = query[name];
    if (value) params.set(name, value);
  }

  const response = await fetch(apiUrl(`/api/admin/validation/queue?${params.toString()}`), {
    cache: "no-store",
    headers: { cookie: (await cookies()).toString() },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat antrean validasi (${response.status}).`);
  }

  const payload = (await response.json()) as { items?: ValidationQueueItem[] };
  return Array.isArray(payload.items) ? payload.items : [];
}

export default async function MyValidationQueuePage({ searchParams }: MyValidationQueuePageProps) {
  const admin = await requireAdminSession();
  const query = await searchParams;
  let items: ValidationQueueItem[] = [];
  let queueError = false;

  try {
    items = await fetchValidationQueue(query);
  } catch {
    queueError = true;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Daftar submission lintas event yang bisa direview oleh admin aktif."
        eyebrow="Validation"
        title="Queue Validation"
      />
      <FormMessage
        error={queueError ? "validation-queue" : query.error ?? null}
        success={queueError ? null : query.success ?? null}
      />
      <ValidationQueueView items={items} query={query} />
    </div>
  );
}
