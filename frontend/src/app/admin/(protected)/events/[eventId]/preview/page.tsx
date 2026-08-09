import { notFound } from "next/navigation";
import Link from "next/link";
import { publishEventAction } from "@/app/admin/(protected)/events/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getManageableEventWithCategories } from "@/modules/events/event.service";
import { EventLandingPage } from "@/modules/events/components/event-landing-page";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import {
  eventStatusLabel,
  publicationStatusLabel,
  resolveAdminEventBannerSrc,
} from "@/modules/events/components/event-display";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type PreviewPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function AdminEventPreviewPage({ params }: PreviewPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const { eventId } = await params;
  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const eventWithCategories = await getManageableEventWithCategories(eventId, admin).catch(
    () => null,
  );

  if (!eventWithCategories) {
    notFound();
  }

  return (
    <div className="-mx-4 -my-6 bg-background sm:-mx-6 lg:-mx-8">
      <div className="sticky top-16 z-20 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Mode Preview</p>
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge tone="neutral">
                {eventStatusLabel(eventWithCategories.event.eventStatus)}
              </StatusBadge>
              <StatusBadge
                tone={
                  eventWithCategories.event.publicationStatus === "PUBLISHED"
                    ? "success"
                    : "warning"
                }
              >
                {publicationStatusLabel(eventWithCategories.event.publicationStatus)}
              </StatusBadge>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-app border border-amber-300 bg-white px-4 py-2 text-sm font-bold"
              href={`/admin/events/${eventWithCategories.event.id}/edit`}
            >
              Kembali ke editor
            </Link>
            {eventWithCategories.event.publicationStatus !== "PUBLISHED" ? (
              <form action={publishEventAction.bind(null, eventWithCategories.event.id)}>
                <input name="csrfToken" type="hidden" value={csrfToken} />
                <button className="inline-flex min-h-11 w-full items-center justify-center rounded-app bg-primary px-4 py-2 text-sm font-bold text-white">
                  Publish
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
      <EventLandingPage
        bannerSrc={resolveAdminEventBannerSrc(eventWithCategories.event)}
        categories={eventWithCategories.categories}
        event={eventWithCategories.event}
      />
    </div>
  );
}
