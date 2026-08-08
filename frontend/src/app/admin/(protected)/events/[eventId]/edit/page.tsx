import { updateEventAction } from "@/app/admin/(protected)/events/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { getManageableEvent } from "@/modules/events/event.service";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { EventForm } from "@/modules/events/components/event-form";
import { FormMessage } from "@/modules/events/components/form-message";

type EditEventPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function EditEventPage({ params, searchParams }: EditEventPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManageableEvent(eventId, admin);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Perubahan disimpan sebagai draft data terbaru. Preview admin selalu memakai data ini."
        eyebrow="Event"
        title={`Edit ${event.name}`}
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <EventForm
        action={updateEventAction.bind(null, event.id)}
        csrfToken={csrfToken}
        event={event}
      />
    </div>
  );
}
