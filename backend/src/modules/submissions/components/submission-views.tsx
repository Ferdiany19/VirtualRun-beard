import Link from "next/link";
import Image from "next/image";
import { randomUUID } from "node:crypto";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import { formatDateTimeRange } from "@/modules/events/components/event-display";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import type { EventRecord } from "@/modules/events/event.types";
import type { ParticipantRegistrationSessionSummary } from "@/modules/registrations/registration.service";
import { activityPlatformLabels } from "@/modules/submissions/submission.schema";
import { formatDistanceMeter, formatDuration } from "@/modules/submissions/submission.service";
import type {
  AdminSubmissionListItem,
  ParticipantSubmissionCategory,
  SubmissionDetail,
  SubmissionRevisionRecord,
  SubmissionStatus,
} from "@/modules/submissions/submission.types";
import { formatBusinessDate, formatBusinessDateTime } from "@/shared/date/business-timezone";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

function participantPageShell({
  event,
  children,
}: {
  event: EventRecord;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader active="events" />
      <main className="app-container py-8 sm:py-10">{children}</main>
      <PublicFooter contactEmail={event.contactEmail} contactPhone={event.contactPhone} />
    </div>
  );
}

export function submissionStatusLabel(status: SubmissionStatus | null): string {
  if (!status) {
    return "Belum diunggah";
  }

  const labels: Record<SubmissionStatus, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Sudah dikirim",
    UNDER_REVIEW: "Sedang ditinjau",
    REVISION_REQUIRED: "Perlu perbaikan",
    APPROVED: "Disetujui",
    REJECTED: "Ditolak",
    DISQUALIFIED: "Didiskualifikasi",
  };

  return labels[status];
}

export function submissionStatusTone(status: SubmissionStatus | null) {
  if (status === "APPROVED") {
    return "success" as const;
  }

  if (status === "REJECTED" || status === "DISQUALIFIED") {
    return "danger" as const;
  }

  if (status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "REVISION_REQUIRED") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function isUploadPeriodOpen(event: EventRecord): boolean {
  const now = new Date();
  return event.uploadStartsAt <= now && event.uploadEndsAt >= now;
}

function canSubmit(category: ParticipantSubmissionCategory): boolean {
  return (
    isUploadPeriodOpen(category.event) &&
    (!category.submission || category.submission.status === "REVISION_REQUIRED")
  );
}

function paceSecondsPerKm(revision: SubmissionRevisionRecord): number {
  return Math.round(revision.elapsedTimeSeconds / (revision.distanceMeter / 1000));
}

function dateInputValue(date: Date | string | null): string {
  if (!date) {
    return "";
  }

  if (typeof date === "string") {
    return date;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-app border border-border bg-surface p-4">
      <p className="caption-copy font-bold">{label}</p>
      <p className="mt-1 font-bold text-navy">{value}</p>
    </div>
  );
}

function CategorySubmissionRow({ item }: { item: ParticipantSubmissionCategory }) {
  const href = `/events/${item.event.slug}/participant/submissions/${item.registrationCategoryId}`;
  const historyHref = `${href}/history`;

  return (
    <article className="rounded-app border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-bold text-navy">{item.category.name}</p>
          <p className="small-copy mt-1">{formatDistanceMeter(item.category.distanceMeters)}</p>
        </div>
        <StatusBadge tone={submissionStatusTone(item.submission?.status ?? null)}>
          {submissionStatusLabel(item.submission?.status ?? null)}
        </StatusBadge>
      </div>
      {item.submission ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Revisi" value={`${item.submission.revisionCount}`} />
          <Metric
            label="Jarak terbaru"
            value={
              item.currentRevision ? formatDistanceMeter(item.currentRevision.distanceMeter) : "-"
            }
          />
          <Metric
            label="Dikirim"
            value={
              item.submission.lastSubmittedAt
                ? `${formatBusinessDateTime(item.submission.lastSubmittedAt)} WIB`
                : "-"
            }
          />
        </dl>
      ) : (
        <p className="body-copy mt-4">Belum ada hasil yang dikirim untuk kategori ini.</p>
      )}
      {item.submission?.latestParticipantVisibleNote ? (
        <div className="mt-4 rounded-app border border-amber-200 bg-amber-50 p-3 text-sm text-navy">
          <p className="font-bold">Catatan validator</p>
          <p className="mt-1 leading-6">{item.submission.latestParticipantVisibleNote}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white"
          href={href}
        >
          <Icon className="h-4 w-4" name="upload" />
          {item.submission?.status === "REVISION_REQUIRED" ? "Kirim revisi" : "Upload hasil"}
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
          href={historyHref}
        >
          <Icon className="h-4 w-4" name="clipboard" />
          Riwayat
        </Link>
      </div>
      {!canSubmit(item) ? (
        <p className="mt-3 text-xs font-bold text-foreground-muted">
          Upload hanya aktif untuk submission baru atau saat validator meminta revisi.
        </p>
      ) : null}
    </article>
  );
}

export function ParticipantSubmissionDashboardView({
  session,
  categories,
}: {
  session: ParticipantRegistrationSessionSummary;
  categories: ParticipantSubmissionCategory[];
}) {
  const summary = session.summary;

  return participantPageShell({
    event: summary.event,
    children: (
      <div className="space-y-6">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="eyebrow">Area peserta</p>
            <h1 className="mt-2 text-3xl font-bold text-navy sm:text-5xl">
              {summary.participant.fullName}
            </h1>
            <p className="body-copy mt-4">
              Kelola BIB dan upload hasil virtual run untuk event {summary.event.name}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white"
                href={`/events/${summary.event.slug}/participant/submissions`}
              >
                <Icon className="h-4 w-4" name="upload" />
                Upload hasil
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                href={`/events/${summary.event.slug}/participant/bib`}
              >
                <Icon className="h-4 w-4" name="clipboard" />
                Lihat BIB
              </Link>
            </div>
          </div>
          <aside className="rounded-section border border-border bg-surface p-5">
            <p className="eyebrow">Registrasi</p>
            <dl className="mt-4 grid gap-3">
              <Metric label="Nomor BIB" value={summary.registration.bibNumber} />
              <Metric label="Status BIB" value={summary.registration.bibStatus} />
              <Metric
                label="Kategori"
                value={summary.categories.map((item) => item.name).join(", ")}
              />
            </dl>
          </aside>
        </section>

        <section>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Periode lari"
              value={formatDateTimeRange(
                summary.event.activityStartsAt,
                summary.event.activityEndsAt,
              )}
            />
            <Metric
              label="Upload hasil"
              value={formatDateTimeRange(summary.event.uploadStartsAt, summary.event.uploadEndsAt)}
            />
          </div>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Submission</p>
              <h2 className="mt-1 text-2xl font-bold text-navy">Status per kategori</h2>
            </div>
            <Link className="font-bold text-primary" href={`/events/${summary.event.slug}`}>
              Kembali ke event
            </Link>
          </div>
          {categories.map((item) => (
            <CategorySubmissionRow key={item.registrationCategoryId} item={item} />
          ))}
        </section>
      </div>
    ),
  });
}

export function ParticipantSubmissionListView({
  event,
  categories,
}: {
  event: EventRecord;
  categories: ParticipantSubmissionCategory[];
}) {
  return participantPageShell({
    event,
    children: (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Upload hasil</p>
            <h1 className="mt-2 text-3xl font-bold text-navy">{event.name}</h1>
          </div>
          <Link className="font-bold text-primary" href={`/events/${event.slug}/participant`}>
            Kembali
          </Link>
        </div>
        <section className="grid gap-4">
          {categories.map((item) => (
            <CategorySubmissionRow key={item.registrationCategoryId} item={item} />
          ))}
        </section>
      </div>
    ),
  });
}

export function ParticipantSubmissionFormView({
  detail,
  csrfToken,
  action,
  error,
}: {
  detail: SubmissionDetail;
  csrfToken: string;
  action: (formData: FormData) => void;
  error?: string;
}) {
  const current = detail.currentRevision;

  return participantPageShell({
    event: detail.event,
    children: (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <p className="eyebrow">Upload hasil</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">{detail.category.name}</h1>
          <p className="body-copy mt-3">
            Kirim hasil lari sesuai kategori. Revisi lama tetap tersimpan sebagai riwayat.
          </p>
          {error ? (
            <div className="mt-5 rounded-app border border-red-200 bg-red-50 p-4 text-sm font-bold text-danger">
              Data belum lengkap, file terlalu besar, atau periode upload belum aktif.
            </div>
          ) : null}
          {detail.submission?.latestParticipantVisibleNote ? (
            <div className="mt-5 rounded-app border border-amber-200 bg-amber-50 p-4 text-sm text-navy">
              <p className="font-bold">Catatan validator</p>
              <p className="mt-1 leading-6">{detail.submission.latestParticipantVisibleNote}</p>
            </div>
          ) : null}

          <form action={action} className="mt-8 grid gap-5" encType="multipart/form-data">
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <input name="idempotencyKey" type="hidden" value={randomUUID()} />
            <label className="grid gap-2 text-sm font-bold text-navy">
              Platform aktivitas
              <select
                className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                defaultValue={current?.activityPlatform ?? "STRAVA"}
                name="activityPlatform"
                required
              >
                {Object.entries(activityPlatformLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Link aktivitas
              <input
                className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                defaultValue={current?.activityUrl ?? ""}
                name="activityUrl"
                placeholder="https://..."
                type="url"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-navy">
                Tanggal aktivitas
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={dateInputValue(current?.activityDate ?? null)}
                  name="activityDate"
                  required
                  type="date"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-navy">
                Jarak
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={current ? (current.distanceMeter / 1000).toString() : ""}
                  min="0.01"
                  name="distanceKilometer"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Nama platform lain
              <input
                className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                defaultValue={current?.activityPlatformOther ?? ""}
                name="activityPlatformOther"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-navy">
                Jam
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={current ? Math.floor(current.elapsedTimeSeconds / 3600) : ""}
                  min="0"
                  name="elapsedHours"
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-navy">
                Menit
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={current ? Math.floor((current.elapsedTimeSeconds % 3600) / 60) : ""}
                  min="0"
                  name="elapsedMinutes"
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-navy">
                Detik
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={current ? current.elapsedTimeSeconds % 60 : ""}
                  min="0"
                  name="elapsedSeconds"
                  type="number"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-bold text-navy">
                Moving jam
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={
                    current?.movingTimeSeconds ? Math.floor(current.movingTimeSeconds / 3600) : ""
                  }
                  min="0"
                  name="movingHours"
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-navy">
                Moving menit
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={
                    current?.movingTimeSeconds
                      ? Math.floor((current.movingTimeSeconds % 3600) / 60)
                      : ""
                  }
                  min="0"
                  name="movingMinutes"
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-navy">
                Moving detik
                <input
                  className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                  defaultValue={current?.movingTimeSeconds ? current.movingTimeSeconds % 60 : ""}
                  min="0"
                  name="movingSeconds"
                  type="number"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Screenshot bukti
              <input
                accept="image/jpeg,image/png,image/webp"
                className="min-h-11 rounded-app border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                name="screenshot"
                type="file"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-navy">
              Catatan peserta
              <textarea
                className="min-h-28 rounded-app border border-border px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                defaultValue={current?.participantNote ?? ""}
                name="participantNote"
              />
            </label>
            <label className="flex min-h-11 items-start gap-3 text-sm text-foreground">
              <input
                className="mt-1 h-5 w-5 accent-primary"
                name="dataStatementAccepted"
                required
                type="checkbox"
              />
              <span>Saya menyatakan hasil dan bukti aktivitas yang dikirim benar.</span>
            </label>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-app bg-primary px-5 py-3 text-sm font-bold text-white">
              <Icon className="h-4 w-4" name="upload" />
              Kirim hasil
            </button>
          </form>
        </section>
        <aside className="h-fit rounded-section border border-border bg-surface p-5 shadow-soft lg:sticky lg:top-24">
          <p className="eyebrow">Ringkasan</p>
          <dl className="mt-4 grid gap-3">
            <Metric label="Peserta" value={detail.participant.fullName} />
            <Metric label="BIB" value={detail.registration.bibNumber} />
            <Metric
              label="Target kategori"
              value={formatDistanceMeter(detail.category.distanceMeters)}
            />
            <Metric
              label="Batas toleransi"
              value={formatDistanceMeter(detail.category.distanceToleranceMeters)}
            />
          </dl>
          {current ? (
            <Link
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
              href={`/events/${detail.event.slug}/participant/submissions/${detail.registrationCategoryId}/history`}
            >
              Lihat riwayat revisi
            </Link>
          ) : null}
        </aside>
      </div>
    ),
  });
}

function RevisionCard({ revision }: { revision: SubmissionRevisionRecord }) {
  return (
    <article className="rounded-app border border-border bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-bold text-navy">Revisi {revision.revisionNumber}</p>
          <p className="small-copy mt-1">{formatBusinessDateTime(revision.submittedAt)} WIB</p>
        </div>
        <StatusBadge tone={revision.supersededAt ? "neutral" : "warning"}>
          {revision.supersededAt ? "Superseded" : "Terbaru"}
        </StatusBadge>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Jarak" value={formatDistanceMeter(revision.distanceMeter)} />
        <Metric label="Durasi" value={formatDuration(revision.elapsedTimeSeconds)} />
        <Metric label="Pace" value={formatDuration(paceSecondsPerKm(revision))} />
      </dl>
      <p className="small-copy mt-4">
        {activityPlatformLabels[revision.activityPlatform]} -{" "}
        {revision.activityUrl ?? "Tanpa link aktivitas"}
      </p>
      {revision.participantNote ? (
        <p className="body-copy mt-3">{revision.participantNote}</p>
      ) : null}
    </article>
  );
}

export function ParticipantSubmissionHistoryView({ detail }: { detail: SubmissionDetail }) {
  return participantPageShell({
    event: detail.event,
    children: (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Riwayat revisi</p>
            <h1 className="mt-2 text-3xl font-bold text-navy">{detail.category.name}</h1>
          </div>
          <Link
            className="font-bold text-primary"
            href={`/events/${detail.event.slug}/participant/submissions/${detail.registrationCategoryId}`}
          >
            Upload hasil
          </Link>
        </div>
        {detail.revisions.length > 0 ? (
          <section className="grid gap-4">
            {detail.revisions.map((revision) => (
              <RevisionCard key={revision.id} revision={revision} />
            ))}
          </section>
        ) : (
          <section className="rounded-section border border-border bg-surface p-5">
            <p className="font-bold text-navy">Belum ada revisi.</p>
            <p className="body-copy mt-2">Upload hasil pertama untuk membuat riwayat submission.</p>
          </section>
        )}
        {detail.validationReviews.length > 0 ? (
          <section className="grid gap-3 rounded-section border border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-navy">Catatan validator</h2>
            {detail.validationReviews.map((review) => (
              <article key={review.id} className="rounded-app border border-border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-bold text-navy">
                    {submissionStatusLabel(review.resultingStatus)}
                  </p>
                  <p className="small-copy">{formatBusinessDateTime(review.reviewedAt)} WIB</p>
                </div>
                {review.reasonCode ? (
                  <p className="small-copy mt-2">Alasan: {review.reasonCode}</p>
                ) : null}
                {review.participantVisibleNote ? (
                  <p className="body-copy mt-3">{review.participantVisibleNote}</p>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}
      </div>
    ),
  });
}

export function AdminSubmissionTable({
  event,
  categories,
  submissions,
  query,
}: {
  event: EventRecord;
  categories: EventCategoryRecord[];
  submissions: AdminSubmissionListItem[];
  query: {
    search?: string;
    categoryId?: string;
    status?: string;
    sort?: string;
  };
}) {
  return (
    <div className="space-y-6">
      <form className="grid gap-3 rounded-section border border-border bg-surface p-4 shadow-soft md:grid-cols-5">
        <input
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.search ?? ""}
          name="search"
          placeholder="Cari nama atau BIB"
        />
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.categoryId ?? ""}
          name="categoryId"
        >
          <option value="">Semua kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.status ?? ""}
          name="status"
        >
          <option value="">Semua status</option>
          <option value="SUBMITTED">Sudah dikirim</option>
          <option value="UNDER_REVIEW">Sedang ditinjau</option>
          <option value="REVISION_REQUIRED">Perlu perbaikan</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
          <option value="DISQUALIFIED">Didiskualifikasi</option>
        </select>
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          defaultValue={query.sort ?? "submitted_desc"}
          name="sort"
        >
          <option value="submitted_desc">Terbaru</option>
          <option value="submitted_asc">Terlama</option>
          <option value="bib_asc">BIB</option>
          <option value="distance_desc">Jarak terbesar</option>
        </select>
        <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white">
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-section border border-border bg-surface shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-4 py-3">BIB</th>
                <th className="px-4 py-3">Peserta</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Hasil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dikirim</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {submissions.map((item) => (
                <tr key={item.submission.id}>
                  <td className="px-4 py-3 font-bold text-navy">{item.registration.bibNumber}</td>
                  <td className="px-4 py-3">{item.participant.fullName}</td>
                  <td className="px-4 py-3">{item.category.name}</td>
                  <td className="px-4 py-3">
                    {formatDistanceMeter(item.currentRevision.distanceMeter)}
                    <br />
                    <span className="text-foreground-muted">
                      {formatDuration(item.currentRevision.elapsedTimeSeconds)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={submissionStatusTone(item.submission.status)}>
                      {submissionStatusLabel(item.submission.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {item.submission.lastSubmittedAt
                      ? `${formatBusinessDateTime(item.submission.lastSubmittedAt)} WIB`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="font-bold text-primary"
                      href={`/admin/events/${event.id}/submissions/${item.submission.id}`}
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {submissions.map((item) => (
            <Link
              key={item.submission.id}
              className="rounded-app border border-border p-4"
              href={`/admin/events/${event.id}/submissions/${item.submission.id}`}
            >
              <p className="font-bold text-navy">
                {item.registration.bibNumber} - {item.participant.fullName}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">{item.category.name}</p>
              <p className="mt-2 text-sm font-bold text-navy">
                {formatDistanceMeter(item.currentRevision.distanceMeter)} -{" "}
                {formatDuration(item.currentRevision.elapsedTimeSeconds)}
              </p>
            </Link>
          ))}
        </div>
        {submissions.length === 0 ? (
          <div className="p-6 text-sm text-foreground-muted">
            Belum ada submission sesuai filter.
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function AdminSubmissionDetailView({ detail }: { detail: SubmissionDetail }) {
  const current = detail.currentRevision;
  const file = detail.currentFile;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="eyebrow">Submission detail</p>
              <h1 className="mt-2 text-2xl font-bold text-navy">{detail.participant.fullName}</h1>
              <p className="small-copy mt-1">
                {detail.registration.bibNumber} - {detail.category.name}
              </p>
            </div>
            <StatusBadge tone={submissionStatusTone(detail.submission?.status ?? null)}>
              {submissionStatusLabel(detail.submission?.status ?? null)}
            </StatusBadge>
          </div>
          {current ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Jarak" value={formatDistanceMeter(current.distanceMeter)} />
              <Metric label="Durasi" value={formatDuration(current.elapsedTimeSeconds)} />
              <Metric label="Pace" value={formatDuration(paceSecondsPerKm(current))} />
            </dl>
          ) : null}
          {current ? (
            <div className="mt-5 rounded-app border border-border bg-surface-muted p-4">
              <p className="font-bold text-navy">
                {activityPlatformLabels[current.activityPlatform]}
              </p>
              <p className="small-copy mt-1">
                Aktivitas: {formatBusinessDate(new Date(current.activityDate))}
              </p>
              {current.activityUrl ? (
                <a
                  className="mt-2 block break-all font-bold text-primary"
                  href={current.activityUrl}
                >
                  {current.activityUrl}
                </a>
              ) : null}
              {current.participantNote ? (
                <p className="body-copy mt-3">{current.participantNote}</p>
              ) : null}
            </div>
          ) : null}
        </article>
        <aside className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <p className="eyebrow">Bukti</p>
          {file ? (
            <div className="mt-4">
              <Image
                alt="Screenshot bukti aktivitas"
                className="w-full rounded-app border border-border"
                height={file.height}
                src={`/api/admin/submission-file/download?fileId=${file.id}&mode=preview`}
                width={file.width}
              />
              <a
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-app bg-primary px-4 py-2 text-sm font-bold text-white"
                href={`/api/admin/submission-file/download?fileId=${file.id}`}
              >
                Unduh bukti
              </a>
            </div>
          ) : (
            <p className="body-copy mt-4">Tidak ada screenshot pada revisi terbaru.</p>
          )}
        </aside>
      </section>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold text-navy">Riwayat revisi</h2>
        {detail.revisions.map((revision) => (
          <RevisionCard key={revision.id} revision={revision} />
        ))}
      </section>
    </div>
  );
}
