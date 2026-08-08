import Image from "next/image";
import Link from "next/link";
import {
  archiveEventAction,
  completeEventAction,
  publishEventAction,
  unpublishEventAction,
  uploadCertificateTemplateAction,
} from "@/app/admin/(protected)/events/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { getManagedEventCertificateSummary } from "@/modules/certificates/certificate.service";
import { listManageableCategories } from "@/modules/categories/category.service";
import { getManageableEvent } from "@/modules/events/event.service";
import {
  eventStatusLabel,
  formatDateTimeRange,
  publicationStatusLabel,
} from "@/modules/events/components/event-display";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";

type EventDetailPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManageableEvent(eventId, admin);
  const categories = await listManageableCategories(event.id, admin);
  const certificateSummary = await getManagedEventCertificateSummary(event.id, admin);
  const activeCategoryCount = categories.filter((category) => category.isActive).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref={`/admin/events/${event.id}/edit`}
        actionLabel="Edit Event"
        description={event.shortDescription}
        title={event.name}
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="neutral">{eventStatusLabel(event.eventStatus)}</StatusBadge>
                <StatusBadge tone={event.publicationStatus === "PUBLISHED" ? "success" : "warning"}>
                  {publicationStatusLabel(event.publicationStatus)}
                </StatusBadge>
              </div>
            </div>
            {event.publicationStatus === "PUBLISHED" ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/events/${event.slug}`}
              >
                Buka public URL
              </Link>
            ) : (
              <button
                aria-disabled="true"
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-app border border-border bg-surface-muted px-4 py-2 text-sm font-bold text-foreground-muted"
                disabled
              >
                Public belum aktif
              </button>
            )}
          </div>

          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Slug public", `/${event.slug}`],
              ["Kategori aktif", `${activeCategoryCount} dari ${categories.length}`],
              [
                "Pendaftaran",
                formatDateTimeRange(event.registrationStartsAt, event.registrationEndsAt),
              ],
              ["Aktivitas", formatDateTimeRange(event.activityStartsAt, event.activityEndsAt)],
              ["Upload hasil", formatDateTimeRange(event.uploadStartsAt, event.uploadEndsAt)],
              ["Update terakhir", `${formatBusinessDateTime(event.updatedAt)} WIB`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-app border border-border bg-surface-muted p-4">
                <dt className="caption-copy font-bold">{label}</dt>
                <dd className="mt-1 text-sm font-bold text-navy">{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <aside className="space-y-6">
          <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Lifecycle event</h2>
            <div className="mt-4 grid gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/admin/events/${event.id}/preview`}
              >
                <Icon className="h-4 w-4" name="search" />
                Preview public
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/admin/events/${event.id}/categories`}
              >
                <Icon className="h-4 w-4" name="calendar" />
                Kelola kategori
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/admin/events/${event.id}/bib`}
              >
                <Icon className="h-4 w-4" name="bib" />
                Template BIB
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/admin/events/${event.id}/participants`}
              >
                <Icon className="h-4 w-4" name="user" />
                Peserta
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/admin/events/${event.id}/submissions`}
              >
                <Icon className="h-4 w-4" name="upload" />
                Submission
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/admin/events/${event.id}/validation`}
              >
                <Icon className="h-4 w-4" name="shield" />
                Queue validation
              </Link>
              <form action={publishEventAction.bind(null, event.id)}>
                <input name="csrfToken" type="hidden" value={csrfToken} />
                <button className="min-h-11 w-full rounded-app bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover">
                  Publish event
                </button>
                <p className="mt-2 text-xs leading-5 text-foreground-muted">
                  Publish membutuhkan minimal satu kategori aktif.
                </p>
              </form>
              <form action={unpublishEventAction.bind(null, event.id)}>
                <input name="csrfToken" type="hidden" value={csrfToken} />
                <button className="min-h-11 w-full rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary">
                  Unpublish
                </button>
              </form>
              <form action={archiveEventAction.bind(null, event.id)}>
                <input name="csrfToken" type="hidden" value={csrfToken} />
                <button className="min-h-11 w-full rounded-app border border-red-200 px-4 py-2 text-sm font-bold text-danger hover:border-danger">
                  Archive
                </button>
              </form>
              <form action={completeEventAction.bind(null, event.id)}>
                <input name="csrfToken" type="hidden" value={csrfToken} />
                <button className="min-h-11 w-full rounded-app border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-surface-muted">
                  Selesaikan event
                </button>
                <p className="mt-2 text-xs leading-5 text-foreground-muted">
                  Sertifikat otomatis masuk antrean hanya untuk hasil approved saat event menjadi
                  selesai.
                </p>
              </form>
            </div>
          </section>

          <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Template event</h2>
            {certificateSummary.template ? (
              <div className="mt-4 overflow-hidden rounded-app border border-border">
                <Image
                  alt="Preview template sertifikat"
                  className="block w-full"
                  height={certificateSummary.template.height}
                  src={`/api/admin/certificates/template-preview?eventId=${event.id}`}
                  width={certificateSummary.template.width}
                />
              </div>
            ) : (
              <p className="small-copy mt-3">
                Upload template PNG sebelum event diselesaikan agar sertifikat dapat dibuat.
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-app bg-surface-muted p-3">
                <dt className="caption-copy font-bold">Terkirim</dt>
                <dd className="mt-1 font-bold text-navy">{certificateSummary.emailedCount}</dd>
              </div>
              <div className="rounded-app bg-surface-muted p-3">
                <dt className="caption-copy font-bold">Antrean</dt>
                <dd className="mt-1 font-bold text-navy">{certificateSummary.pendingCount}</dd>
              </div>
              <div className="rounded-app bg-surface-muted p-3">
                <dt className="caption-copy font-bold">Gagal</dt>
                <dd className="mt-1 font-bold text-navy">{certificateSummary.failedCount}</dd>
              </div>
              <div className="rounded-app bg-surface-muted p-3">
                <dt className="caption-copy font-bold">Invalid</dt>
                <dd className="mt-1 font-bold text-navy">{certificateSummary.invalidatedCount}</dd>
              </div>
            </dl>
            <form
              action={uploadCertificateTemplateAction.bind(null, event.id)}
              className="mt-4 grid gap-3"
            >
              <input name="csrfToken" type="hidden" value={csrfToken} />
              <input
                accept="image/png"
                className="block w-full rounded-app border border-border bg-surface px-3 py-2 text-sm"
                name="certificateTemplate"
                required
                type="file"
              />
              <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover">
                Upload template sertifikat
              </button>
            </form>
          </section>
        </aside>
      </section>
    </div>
  );
}
