import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { FormMessage } from "@/modules/events/components/form-message";
import {
  regenerateBibAction,
  resendRegistrationEmailAction,
} from "@/app/admin/(protected)/events/[eventId]/participants/[registrationId]/actions";
import type {
  AdminParticipantDetail,
  AdminParticipantDetailActivity,
  AdminParticipantDetailSubmission,
  RegistrationStatus,
} from "@/modules/registrations/registration.types";
import { formatBusinessDate, formatBusinessDateTime } from "@/shared/date/business-timezone";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantDetailPageProps = {
  params: Promise<{ eventId: string; registrationId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

type ApiAdminParticipantDetail = Omit<
  AdminParticipantDetail,
  | "event"
  | "participant"
  | "registration"
  | "categories"
  | "submissions"
  | "emailDeliveries"
  | "bibDocument"
  | "validationReviews"
  | "activities"
> & {
  event: AdminParticipantDetail["event"] & {
    registrationStartsAt: string;
    registrationEndsAt: string;
    activityStartsAt: string;
    activityEndsAt: string;
    uploadStartsAt: string;
    uploadEndsAt: string;
    createdAt: string;
    updatedAt: string;
  };
  participant: AdminParticipantDetail["participant"] & {
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  registration: AdminParticipantDetail["registration"] & {
    registeredAt: string;
    termsAcceptedAt: string;
    privacyAcceptedAt: string;
    createdAt: string;
    updatedAt: string;
    cancelledAt: string | null;
  };
  categories: Array<
    AdminParticipantDetail["categories"][number] & {
      createdAt: string;
      updatedAt: string;
    }
  >;
  submissions: Array<
    Omit<
      AdminParticipantDetailSubmission,
      | "firstSubmittedAt"
      | "lastSubmittedAt"
      | "approvedAt"
      | "validationCompletedAt"
      | "submittedAt"
      | "fileCreatedAt"
    > & {
      firstSubmittedAt: string | null;
      lastSubmittedAt: string | null;
      approvedAt: string | null;
      validationCompletedAt: string | null;
      submittedAt: string | null;
      fileCreatedAt: string | null;
    }
  >;
  emailDeliveries: Array<
    Omit<
      AdminParticipantDetail["emailDeliveries"][number],
      "sentAt" | "createdAt" | "updatedAt"
    > & {
      sentAt: string | null;
      createdAt: string;
      updatedAt: string;
    }
  >;
  bibDocument:
    | (Omit<NonNullable<AdminParticipantDetail["bibDocument"]>, "generatedAt" | "createdAt"> & {
        generatedAt: string | null;
        createdAt: string;
      })
    | null;
  validationReviews: Array<
    Omit<AdminParticipantDetail["validationReviews"][number], "reviewedAt"> & {
      reviewedAt: string;
    }
  >;
  activities: Array<Omit<AdminParticipantDetailActivity, "occurredAt"> & { occurredAt: string }>;
};

const registrationLabels: Record<RegistrationStatus, string> = {
  ACTIVE: "Aktif",
  CANCELLED: "Dibatalkan",
};

function parseDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function hydrateDetail(data: ApiAdminParticipantDetail): AdminParticipantDetail {
  return {
    ...data,
    event: {
      ...data.event,
      registrationStartsAt: new Date(data.event.registrationStartsAt),
      registrationEndsAt: new Date(data.event.registrationEndsAt),
      activityStartsAt: new Date(data.event.activityStartsAt),
      activityEndsAt: new Date(data.event.activityEndsAt),
      uploadStartsAt: new Date(data.event.uploadStartsAt),
      uploadEndsAt: new Date(data.event.uploadEndsAt),
      createdAt: new Date(data.event.createdAt),
      updatedAt: new Date(data.event.updatedAt),
    },
    participant: {
      ...data.participant,
      deletedAt: parseDate(data.participant.deletedAt),
      createdAt: new Date(data.participant.createdAt),
      updatedAt: new Date(data.participant.updatedAt),
    },
    registration: {
      ...data.registration,
      registeredAt: new Date(data.registration.registeredAt),
      termsAcceptedAt: new Date(data.registration.termsAcceptedAt),
      privacyAcceptedAt: new Date(data.registration.privacyAcceptedAt),
      createdAt: new Date(data.registration.createdAt),
      updatedAt: new Date(data.registration.updatedAt),
      cancelledAt: parseDate(data.registration.cancelledAt),
    },
    categories: data.categories.map((category) => ({
      ...category,
      createdAt: new Date(category.createdAt),
      updatedAt: new Date(category.updatedAt),
    })),
    submissions: data.submissions.map((submission) => ({
      ...submission,
      firstSubmittedAt: parseDate(submission.firstSubmittedAt),
      lastSubmittedAt: parseDate(submission.lastSubmittedAt),
      approvedAt: parseDate(submission.approvedAt),
      validationCompletedAt: parseDate(submission.validationCompletedAt),
      submittedAt: parseDate(submission.submittedAt),
      fileCreatedAt: parseDate(submission.fileCreatedAt),
    })),
    emailDeliveries: data.emailDeliveries.map((email) => ({
      ...email,
      sentAt: parseDate(email.sentAt),
      createdAt: new Date(email.createdAt),
      updatedAt: new Date(email.updatedAt),
    })),
    bibDocument: data.bibDocument
      ? {
          ...data.bibDocument,
          generatedAt: parseDate(data.bibDocument.generatedAt),
          createdAt: new Date(data.bibDocument.createdAt),
        }
      : null,
    validationReviews: data.validationReviews.map((review) => ({
      ...review,
      reviewedAt: new Date(review.reviewedAt),
    })),
    activities: data.activities.map((activity) => ({
      ...activity,
      occurredAt: new Date(activity.occurredAt),
    })),
  };
}

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

function publicApiPath(pathname: string): string {
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}${pathname}`;
}

async function fetchParticipantDetail(registrationId: string): Promise<AdminParticipantDetail> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(apiUrl(`/api/admin/registrations/${registrationId}`), {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat detail peserta (${response.status}).`);
  }

  return hydrateDetail((await response.json()) as ApiAdminParticipantDetail);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDistanceMeter(value: number | null): string {
  if (value === null) return "Belum tersedia";
  return `${(value / 1000).toFixed(2).replace(/\.00$/, "")} km`;
}

function formatOptionalBusinessDate(value: string | null): string {
  if (!value) return "Belum tersedia";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+07:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Belum tersedia";
  }

  return formatBusinessDate(date);
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Belum tersedia";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((item) => item.toString().padStart(2, "0"))
    .join(":");
}

function formatPace(submission: AdminParticipantDetailSubmission | null): string {
  if (!submission?.distanceMeter || !submission.elapsedTimeSeconds) return "Belum tersedia";
  const paceSeconds = Math.round(submission.elapsedTimeSeconds / (submission.distanceMeter / 1000));
  return `${formatDuration(paceSeconds)}/km`;
}

function sourceLabel(source: string | null): string {
  if (!source) return "Belum tersedia";
  return source === "PUBLIC_WEB" ? "Website" : source.replace(/_/g, " ");
}

function categorySummary(categories: AdminParticipantDetail["categories"]): string {
  return categories.map((category) => category.name).join(" + ") || "Belum tersedia";
}

function statusTone(status: string | null) {
  if (status === "ACTIVE" || status === "SENT" || status === "READY" || status === "APPROVED") {
    return "success" as const;
  }

  if (status === "FAILED" || status === "REJECTED" || status === "DISQUALIFIED") {
    return "danger" as const;
  }

  if (status) return "warning" as const;
  return "neutral" as const;
}

function submissionStatusLabel(status: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Dikirim",
    UNDER_REVIEW: "Ditinjau",
    REVISION_REQUIRED: "Perlu Revisi",
    APPROVED: "Berhasil Diverifikasi",
    REJECTED: "Ditolak",
    DISQUALIFIED: "Diskualifikasi",
  };

  return status ? (labels[status] ?? status) : "Belum Upload";
}

function activityIcon(action: AdminParticipantDetailActivity["action"]) {
  const icons: Record<
    AdminParticipantDetailActivity["action"],
    "check" | "mail" | "bib" | "upload" | "shield"
  > = {
    REGISTERED: "check",
    EMAIL: "mail",
    BIB: "bib",
    SUBMISSION: "upload",
    VALIDATION: "shield",
  };

  return icons[action];
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[128px_minmax(0,1fr)] gap-3 text-sm">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="min-w-0 font-bold text-navy">{value}</dd>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: "check" | "upload" | "document" | "grid";
  label: string;
  value: string;
  description: string;
  tone: string;
}) {
  return (
    <article className="flex min-h-28 items-center gap-4 rounded-section border border-border bg-surface p-5 shadow-soft">
      <span
        className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-app ${tone}`}
      >
        <Icon className="h-7 w-7" name={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground-muted">{label}</p>
        <p className="mt-2 text-xl font-bold leading-none text-navy">{value}</p>
        <p className="mt-2 text-xs leading-5 text-foreground-muted">{description}</p>
      </div>
    </article>
  );
}

function TimelineItem({
  title,
  description,
  active = true,
}: {
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <li className="relative grid gap-1 pl-8">
      <span
        className={[
          "absolute left-0 top-0 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
          active
            ? "border-primary bg-primary text-white"
            : "border-border bg-surface text-foreground-muted",
        ].join(" ")}
      >
        <Icon className="h-3 w-3" name="check" />
      </span>
      <p className="text-sm font-bold text-navy">{title}</p>
      <p className="text-xs leading-5 text-foreground-muted">{description}</p>
    </li>
  );
}

export default async function ParticipantDetailPage({
  params,
  searchParams,
}: ParticipantDetailPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const { eventId, registrationId } = await params;
  const query = await searchParams;
  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const detail = await fetchParticipantDetail(registrationId);
  const latestSubmission =
    detail.submissions.find((item) => item.submissionStatus === "APPROVED") ??
    detail.submissions.find((item) => item.submissionId) ??
    null;
  const latestEmail = detail.emailDeliveries[0] ?? null;
  const evidenceItems = detail.submissions.filter((item) => item.fileId).slice(0, 3);
  const submittedCount = detail.submissions.filter((item) => item.submissionId).length;
  const approvedCount = detail.submissions.filter(
    (item) => item.submissionStatus === "APPROVED",
  ).length;
  const bibDownloadHref = publicApiPath(`/api/admin/bib/download?registrationId=${registrationId}`);
  const canResendEmail =
    detail.registration.registrationStatus !== "CANCELLED" &&
    Boolean(detail.participant.displayEmail);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold leading-tight text-navy sm:text-3xl">
              {detail.participant.fullName}
            </h1>
            <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-primary">
              {detail.registration.bibNumber}
            </span>
            <StatusBadge tone={statusTone(detail.registration.registrationStatus)}>
              {registrationLabels[detail.registration.registrationStatus]}
            </StatusBadge>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-foreground-muted">
            <Link className="font-bold text-primary" href="/admin/participants">
              Peserta
            </Link>
            <span>/</span>
            <span>Detail Peserta</span>
          </div>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border bg-surface px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
          href="/admin/participants"
        >
          <Icon className="h-4 w-4" name="chevron-left" />
          Kembali
        </Link>
      </section>

      <FormMessage error={query.error ?? null} success={query.success ?? null} />

      <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-sm text-navy">
              <Icon className="h-5 w-5 text-foreground-muted" name="mail" />
              <span className="font-bold">{detail.participant.displayEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-navy">
              <Icon className="h-5 w-5 text-foreground-muted" name="phone" />
              <span className="font-bold">{detail.participant.displayPhone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-navy">
              <Icon className="h-5 w-5 text-foreground-muted" name="home" />
              <span className="font-bold">
                {[detail.participant.cityOrRegency, detail.participant.province]
                  .filter(Boolean)
                  .join(", ") || "Belum tersedia"}
              </span>
            </div>
          </div>
          <div className="grid gap-4 border-y border-border py-5 xl:border-x xl:border-y-0 xl:px-6 xl:py-0">
            <InfoRow label="Event" value={detail.event.name} />
            <InfoRow label="Kategori" value={categorySummary(detail.categories)} />
            <InfoRow label="Nomor BIB" value={detail.registration.bibNumber} />
          </div>
          <div className="grid gap-4">
            <InfoRow
              label="Tanggal Pendaftaran"
              value={`${formatBusinessDateTime(detail.registration.registeredAt)} WIB`}
            />
            <InfoRow
              label="Terakhir Diperbarui"
              value={`${formatBusinessDateTime(detail.registration.updatedAt)} WIB`}
            />
            <InfoRow label="Sumber Pendaftaran" value={sourceLabel(detail.registration.source)} />
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <form action={regenerateBibAction.bind(null, eventId, registrationId)}>
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border border-primary px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5">
              <Icon className="h-4 w-4" name="bib" />
              Kirim Ulang BIB
            </button>
          </form>
          <form action={resendRegistrationEmailAction.bind(null, eventId, registrationId)}>
            <input name="csrfToken" type="hidden" value={csrfToken} />
            <button
              className={[
                "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border px-3 py-2 text-sm font-bold",
                canResendEmail
                  ? "border-border text-navy hover:border-primary hover:text-primary"
                  : "cursor-not-allowed border-border text-foreground-muted opacity-70",
              ].join(" ")}
              disabled={!canResendEmail}
              type="submit"
            >
              <Icon className="h-4 w-4" name="mail" />
              Kirim Email
            </button>
          </form>
          <button
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-app border border-border px-3 py-2 text-sm font-bold text-foreground-muted opacity-70"
            disabled
            type="button"
          >
            <Icon className="h-4 w-4" name="download" />
            Unduh Data
          </button>
          <button
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-app bg-action px-3 py-2 text-sm font-bold text-white opacity-70"
            disabled
            type="button"
          >
            Aksi Lainnya
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          description={`Pendaftaran sejak ${formatBusinessDate(detail.registration.registeredAt)}`}
          icon="check"
          label="Status Pendaftaran"
          tone="bg-teal-50 text-primary"
          value={
            detail.registration.registrationStatus === "ACTIVE" ? "Terverifikasi" : "Dibatalkan"
          }
        />
        <StatusCard
          description={
            latestSubmission?.lastSubmittedAt
              ? `Dikirim ${formatBusinessDateTime(latestSubmission.lastSubmittedAt)} WIB`
              : "Belum ada upload hasil"
          }
          icon="upload"
          label="Status Upload Hasil"
          tone="bg-emerald-50 text-success"
          value={
            submittedCount > 0
              ? submissionStatusLabel(latestSubmission?.submissionStatus ?? null)
              : "Belum Upload"
          }
        />
        <StatusCard
          description={
            detail.bibDocument?.generatedAt
              ? `Diterbitkan ${formatBusinessDateTime(detail.bibDocument.generatedAt)} WIB`
              : "Dokumen BIB belum siap"
          }
          icon="document"
          label="Status BIB"
          tone="bg-amber-50 text-warning"
          value={
            detail.registration.bibStatus === "READY" ? "Tersedia" : detail.registration.bibStatus
          }
        />
        <StatusCard
          description="Aktivitas tercatat oleh sistem"
          icon="grid"
          label="Total Aktivitas"
          tone="bg-sky-50 text-info"
          value={formatNumber(detail.activities.length)}
        />
      </section>

      <nav className="flex gap-6 border-b border-border text-sm font-bold text-navy">
        {["Overview", "Event Diikuti", "Dokumen", "Riwayat Email"].map((item, index) => (
          <span
            className={[
              "inline-flex min-h-11 items-center border-b-2 px-1",
              index === 0
                ? "border-primary text-primary"
                : "border-transparent text-foreground-muted",
            ].join(" ")}
            key={item}
          >
            {item}
          </span>
        ))}
      </nav>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
        <div className="grid gap-4">
          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Profil Peserta</h2>
            <dl className="mt-5 grid gap-4">
              <InfoRow label="Nama Lengkap" value={detail.participant.fullName} />
              <InfoRow
                label="Tanggal Lahir"
                value={formatOptionalBusinessDate(detail.participant.dateOfBirth)}
              />
              <InfoRow
                label="Jenis Kelamin"
                value={
                  detail.participant.gender === "MALE"
                    ? "Laki-laki"
                    : detail.participant.gender === "FEMALE"
                      ? "Perempuan"
                      : "Belum tersedia"
                }
              />
              <InfoRow label="Provinsi" value={detail.participant.province ?? "Belum tersedia"} />
              <InfoRow
                label="Alamat"
                value={
                  [
                    detail.participant.district,
                    detail.participant.cityOrRegency,
                    detail.participant.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Belum tersedia"
                }
              />
              <InfoRow label="Email" value={detail.participant.displayEmail} />
              <InfoRow label="No. WhatsApp" value={detail.participant.displayPhone} />
            </dl>
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Timeline Pendaftaran</h2>
            <ol className="mt-5 grid gap-5 border-l border-border pl-4">
              <TimelineItem
                description={`${formatBusinessDateTime(detail.registration.registeredAt)} WIB`}
                title="Pendaftaran Event"
              />
              <TimelineItem
                active={detail.registration.emailStatus === "SENT"}
                description={
                  latestEmail
                    ? `${latestEmail.status} - ${formatBusinessDateTime(latestEmail.sentAt ?? latestEmail.createdAt)} WIB`
                    : "Belum ada email terkirim"
                }
                title="Konfirmasi & Email"
              />
              <TimelineItem
                active={detail.registration.bibStatus === "READY"}
                description={
                  detail.bibDocument
                    ? `${detail.bibDocument.status} - ${formatBusinessDateTime(detail.bibDocument.generatedAt ?? detail.bibDocument.createdAt)} WIB`
                    : "BIB belum diterbitkan"
                }
                title="BIB Dikirim"
              />
              <TimelineItem
                active={submittedCount > 0}
                description={
                  latestSubmission?.lastSubmittedAt
                    ? `${formatBusinessDateTime(latestSubmission.lastSubmittedAt)} WIB`
                    : "Belum ada upload"
                }
                title="Upload Hasil"
              />
              <TimelineItem
                active={approvedCount > 0}
                description={
                  latestSubmission?.approvedAt
                    ? `${formatBusinessDateTime(latestSubmission.approvedAt)} WIB`
                    : "Belum diterbitkan"
                }
                title="Verifikasi Hasil"
              />
            </ol>
          </article>
        </div>

        <div className="grid gap-4">
          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Kontak Darurat</h2>
            <dl className="mt-5 grid gap-4">
              <InfoRow
                label="Nama"
                value={detail.participant.emergencyContactName ?? "Belum tersedia"}
              />
              <InfoRow label="Hubungan" value="Belum tersedia" />
              <InfoRow
                label="No. Telepon"
                value={detail.participant.emergencyContactPhone ?? "Belum tersedia"}
              />
            </dl>
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Preview BIB</h2>
            {detail.registration.bibStatus === "READY" && detail.bibObjectKey ? (
              <>
                <div className="mt-4 overflow-hidden rounded-app border border-border bg-surface-muted">
                  <Image
                    alt={`BIB ${detail.registration.bibNumber}`}
                    className="aspect-[3/2] w-full object-cover"
                    height={420}
                    src={bibDownloadHref}
                    unoptimized
                    width={640}
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-app border border-border px-3 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                    href={bibDownloadHref}
                  >
                    <Icon className="h-4 w-4" name="download" />
                    Unduh BIB
                  </a>
                  <Link
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-app border border-border px-3 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                    href={`/admin/events/${detail.event.id}`}
                  >
                    <Icon className="h-4 w-4" name="eye" />
                    Detail Event
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-app border border-border bg-surface-muted p-4 text-sm text-foreground-muted">
                Preview BIB belum tersedia karena dokumen BIB belum siap.
              </p>
            )}
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Status Upload Hasil</h2>
            <dl className="mt-5 grid gap-4">
              <InfoRow
                label="Status"
                value={
                  <StatusBadge tone={statusTone(latestSubmission?.submissionStatus ?? null)}>
                    {submissionStatusLabel(latestSubmission?.submissionStatus ?? null)}
                  </StatusBadge>
                }
              />
              <InfoRow
                label="Tanggal Upload"
                value={
                  latestSubmission?.lastSubmittedAt
                    ? `${formatBusinessDateTime(latestSubmission.lastSubmittedAt)} WIB`
                    : "Belum tersedia"
                }
              />
              <InfoRow
                label="Jarak Tercatat"
                value={formatDistanceMeter(latestSubmission?.distanceMeter ?? null)}
              />
              <InfoRow
                label="Waktu Tempuh"
                value={formatDuration(latestSubmission?.elapsedTimeSeconds ?? null)}
              />
              <InfoRow label="Pace Rata-rata" value={formatPace(latestSubmission)} />
              <InfoRow
                label="Metode Verifikasi"
                value={latestSubmission?.activityPlatform?.replace(/_/g, " ") ?? "Belum tersedia"}
              />
            </dl>
            <Link
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-app border border-border px-3 text-sm font-bold text-primary hover:border-primary"
              href={`/admin/events/${detail.event.id}/submissions`}
            >
              Lihat Detail Verifikasi
            </Link>
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Bukti Aktivitas</h2>
            {evidenceItems.length > 0 ? (
              <>
                <dl className="mt-5 grid gap-4">
                  <InfoRow
                    label="Sumber"
                    value={
                      latestSubmission?.activityPlatform?.replace(/_/g, " ") ?? "Belum tersedia"
                    }
                  />
                  <InfoRow
                    label="Link Aktivitas"
                    value={
                      latestSubmission?.activityUrl ? (
                        <a className="text-primary" href={latestSubmission.activityUrl}>
                          {latestSubmission.activityUrl}
                        </a>
                      ) : (
                        "Belum tersedia"
                      )
                    }
                  />
                </dl>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {evidenceItems.map((item) => (
                    <a
                      className="overflow-hidden rounded-app border border-border bg-surface-muted"
                      href={publicApiPath(
                        `/api/admin/submission-file/download?fileId=${item.fileId}`,
                      )}
                      key={item.fileId}
                    >
                      <Image
                        alt={item.fileName ?? "Bukti aktivitas"}
                        className="aspect-square w-full object-cover"
                        height={160}
                        src={publicApiPath(
                          `/api/admin/submission-file/download?fileId=${item.fileId}&mode=preview`,
                        )}
                        unoptimized
                        width={160}
                      />
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-app border border-border bg-surface-muted p-4 text-sm text-foreground-muted">
                Bukti aktivitas belum tersedia.
              </p>
            )}
          </article>
        </div>

        <div className="grid gap-4">
          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Checklist & Status</h2>
            <dl className="mt-5 divide-y divide-border">
              {[
                [
                  "Pendaftaran",
                  detail.registration.registrationStatus === "ACTIVE"
                    ? "Terverifikasi"
                    : "Dibatalkan",
                ],
                [
                  "Kirim BIB",
                  detail.registration.bibStatus === "READY"
                    ? "Terkirim"
                    : detail.registration.bibStatus,
                ],
                ["Upload Hasil", submittedCount > 0 ? "Berhasil" : "Belum Upload"],
                ["Verifikasi Hasil", approvedCount > 0 ? "Terverifikasi" : "Belum selesai"],
                [
                  "Email",
                  detail.registration.emailStatus === "SENT"
                    ? "Terkirim"
                    : detail.registration.emailStatus,
                ],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between gap-4 py-3 text-sm" key={label}>
                  <dt className="font-bold text-navy">{label}</dt>
                  <dd className="text-right text-xs font-bold text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-lg font-bold text-navy">Aktivitas Terbaru</h2>
            <div className="mt-5 grid gap-4">
              {detail.activities.slice(0, 8).map((activity) => (
                <div className="flex items-start gap-3" key={activity.id}>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-teal-50 text-primary">
                    <Icon className="h-4 w-4" name={activityIcon(activity.action)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy">{activity.title}</p>
                    <p className="mt-1 text-xs leading-5 text-foreground-muted">
                      {activity.description}
                    </p>
                  </div>
                  <time className="shrink-0 text-right text-xs text-foreground-muted">
                    {formatBusinessDateTime(activity.occurredAt)} WIB
                  </time>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
