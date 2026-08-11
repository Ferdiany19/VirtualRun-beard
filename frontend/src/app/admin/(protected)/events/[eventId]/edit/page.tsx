import {
  publishEventAction,
  updateEventAction,
} from "@/app/admin/(protected)/events/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { getManageableEventWithCategories } from "@/modules/events/event.service";
import { resolveAdminEventBannerSrc } from "@/modules/events/components/event-display";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { EventForm } from "@/modules/events/components/event-form";
import { FormMessage } from "@/modules/events/components/form-message";
import { InlineRaceCategoryManager } from "@/modules/categories/components/inline-race-category-manager";

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
  const { event, categories } = await getManageableEventWithCategories(eventId, admin);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref={`/admin/events/${event.id}`}
        actionLabel="Detail event"
        description="Atur konten public page, window pendaftaran, window upload, instruksi peserta, dan kontak organizer."
        title={`Edit ${event.name}`}
      />
      {event.eventStatus === "DRAFT" ? (
        <div className="flex justify-end">
          <form action={publishEventAction.bind(null, event.id)}>
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-hover"
              type="submit"
            >
              Publikasikan Event
            </button>
          </form>
        </div>
      ) : null}
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <EventForm
        action={updateEventAction.bind(null, event.id)}
        csrfToken={csrfToken}
        event={event}
        bannerSrc={resolveAdminEventBannerSrc(event)}
      />
      <InlineRaceCategoryManager
        categories={categories}
        csrfToken={csrfToken}
        eventId={event.id}
      />
    </div>
  );
}
