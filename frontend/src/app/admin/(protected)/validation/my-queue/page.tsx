import { requireAdminSession } from "@/modules/auth/session";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { ValidationQueueView } from "@/modules/validation/components/validation-views";
import { listValidationQueueForAdmin } from "@/modules/validation/validation.service";
import type { ValidationQueueFilters } from "@/modules/validation/validation.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MyValidationQueuePageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function MyValidationQueuePage({ searchParams }: MyValidationQueuePageProps) {
  const admin = await requireAdminSession();
  const query = await searchParams;
  const filters: ValidationQueueFilters = {
    eventId: query.eventId,
    status: query.status as ValidationQueueFilters["status"],
    evidenceType: query.evidenceType as ValidationQueueFilters["evidenceType"],
    search: query.search,
    distanceCheck: query.distanceCheck as ValidationQueueFilters["distanceCheck"],
  };
  const items = await listValidationQueueForAdmin({ admin, filters });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Daftar submission lintas event yang bisa direview oleh admin aktif."
        eyebrow="Validation"
        title="Queue Validation"
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <ValidationQueueView items={items} query={query} />
    </div>
  );
}
