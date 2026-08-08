import {
  assignValidatorAction,
  revokeValidatorAction,
} from "@/app/admin/(protected)/events/[eventId]/validators/actions";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { getManageableEvent } from "@/modules/events/event.service";
import { ValidatorAssignmentView } from "@/modules/validation/components/validation-views";
import { getEventValidatorManagement } from "@/modules/validation/validation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ValidatorPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function ValidatorPage({ params, searchParams }: ValidatorPageProps) {
  const admin = await requireAdminSession();
  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManageableEvent(eventId, admin);
  const management = await getEventValidatorManagement({ eventId, admin });
  const assignAction = assignValidatorAction.bind(null, event.id);
  const revokeAction = revokeValidatorAction.bind(null, event.id);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref={`/admin/events/${event.id}`}
        actionLabel="Kembali"
        description="Kelola admin yang dapat memvalidasi submission event ini tanpa membuka akses manajemen event penuh."
        eyebrow="Validator"
        title={event.name}
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <ValidatorAssignmentView
        assignAction={assignAction}
        assignments={management.assignments}
        csrfToken={csrfToken}
        eligibleValidators={management.eligibleValidators}
        revokeAction={revokeAction}
      />
    </div>
  );
}
