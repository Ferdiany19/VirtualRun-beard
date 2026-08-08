import { redirect } from "next/navigation";
import { requireAdminSession } from "@/modules/auth/session";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { ValidationQueueView } from "@/modules/validation/components/validation-views";
import {
  getValidationEvent,
  listEventValidationQueue,
} from "@/modules/validation/validation.service";
import type { ValidationQueueFilters } from "@/modules/validation/validation.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventValidationPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export default async function EventValidationPage({
  params,
  searchParams,
}: EventValidationPageProps) {
  const admin = await requireAdminSession();
  const { eventId } = await params;
  if (!isUuid(eventId)) {
    redirect("/admin/events");
  }
  const query = await searchParams;
  const event = await getValidationEvent({ eventId, admin });
  const filters: ValidationQueueFilters = {
    categoryId: query.categoryId,
    status: query.status as ValidationQueueFilters["status"],
    evidenceType: query.evidenceType as ValidationQueueFilters["evidenceType"],
    search: query.search,
    distanceCheck: query.distanceCheck as ValidationQueueFilters["distanceCheck"],
  };
  const items = await listEventValidationQueue({ eventId, admin, filters });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref={`/admin/events/${event.id}`}
        actionLabel="Kembali"
        description="Queue validation submission untuk event ini."
        eyebrow="Validation Event"
        title={event.name}
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <ValidationQueueView event={event} items={items} query={query} />
    </div>
  );
}
