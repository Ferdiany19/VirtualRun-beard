/* Hallmark · pre-emit critique: P5 H5 E4 S5 R4 V5 */
/* Hallmark · genre: editorial · macrostructure: Upload Ledger · theme: Sport · enrichment: none · design-system: design.md · designed-as-app */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import { resolveEventBannerSrc } from "@/modules/events/components/event-display";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import type { EventRecord } from "@/modules/events/event.types";
import type { ParticipantRegistrationSessionSummary } from "@/modules/registrations/registration.service";
import { activityPlatformLabels } from "@/modules/submissions/submission.schema";
import type {
  SubmissionFormActionState,
  SubmissionFormField,
  SubmissionFormValues,
} from "@/modules/submissions/submission-form-state";
import type {
  AdminSubmissionListItem,
  ParticipantSubmissionCategory,
  SubmissionDetail,
  SubmissionRevisionRecord,
  SubmissionStatus,
} from "@/modules/submissions/submission.types";
import { formatBusinessDate, formatBusinessDateTime } from "@/shared/date/business-timezone";
import { DatePickerInput } from "@/shared/ui/date-picker-input";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

function participantPageShell({ event, children }: { event: EventRecord; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-landing-paper)] text-[var(--color-landing-ink)]">
      <PublicHeader active="events" />
      <main className="app-container py-8 sm:py-12 lg:py-16">{children}</main>
      <PublicFooter contactEmail={event.contactEmail} contactPhone={event.contactPhone} />
    </div>
  );
}

function formatDistanceMeter(distanceMeter: number): string {
  return `${(distanceMeter / 1000).toFixed(2).replace(/\.00$/, "")} km`;
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--color-landing-rule)] py-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[var(--color-landing-ink)]">{value}</p>
    </div>
  );
}

function UploadPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid gap-5 border-b-2 border-[var(--color-landing-ink)] pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-landing-ink-2)]">
          {eyebrow}
        </p>
        <h1 className="landing-display mt-3 max-w-5xl text-5xl leading-[0.95] text-[var(--color-landing-ink)] sm:text-7xl lg:text-8xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-landing-ink-2)] sm:text-base">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function PrimaryAction({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] px-5 py-3 text-sm font-bold text-[var(--color-landing-white)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-teal-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
      href={href}
    >
      {children}
    </Link>
  );
}

function SecondaryAction({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link
      className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] px-5 py-3 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
      href={href}
    >
      {children}
    </Link>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[var(--color-landing-ink)]">
      {label}
      {children}
    </label>
  );
}

function FieldError({ field, errors }: { field: SubmissionFormField; errors: SubmissionFormActionState["fieldErrors"] }) {
  const message = errors[field];
  if (!message) return null;
  const id = `${field}-error`;
  return <p className="text-xs font-bold text-danger" id={id}>{message}</p>;
}

const formControlClass =
  "min-h-12 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] px-4 text-sm text-[var(--color-landing-ink)] outline-none transition-colors duration-[var(--dur-short)] focus-visible:border-[var(--color-landing-orange)] focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]";

const textAreaClass =
  "min-h-32 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] px-4 py-3 text-sm text-[var(--color-landing-ink)] outline-none transition-colors duration-[var(--dur-short)] focus-visible:border-[var(--color-landing-orange)] focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]";

function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-landing-ink-2)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="landing-display mt-2 text-4xl leading-none text-[var(--color-landing-ink)] sm:text-5xl">
        {title}
      </h2>
      <div className="mt-4 h-[3px] w-14 bg-[var(--color-landing-orange)]" />
    </div>
  );
}

function DashboardCard({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      className={`border-t border-[var(--color-landing-rule)] bg-[var(--color-landing-paper)] py-6 ${className}`}
      id={id}
    >
      {children}
    </section>
  );
}

function MiniStat({
  icon,
  label,
  value,
  description,
  tone = "primary",
}: {
  icon: "calendar" | "upload" | "shield" | "clipboard";
  label: string;
  value: string;
  description: string;
  tone?: "primary" | "warning";
}) {
  return (
    <div className="grid min-h-[13rem] content-start border-t border-[var(--color-landing-rule)] py-5">
      <span
        className={[
          "inline-flex h-11 w-11 items-center justify-center border-2",
          tone === "warning"
            ? "border-warning/50 bg-warning/10 text-warning"
            : "border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] text-[var(--color-landing-ink)]",
        ].join(" ")}
      >
        <Icon className="h-6 w-6" name={icon} />
      </span>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
        {label}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm font-black leading-6 text-[var(--color-landing-ink)]">
        {value}
      </p>
      <p className="mt-4 text-xs leading-5 text-[var(--color-landing-ink-2)]">{description}</p>
    </div>
  );
}

function compactDateRange(start: Date, end: Date): string {
  return `${formatBusinessDate(start)} - ${formatBusinessDate(end)}\n00.00 - 23.59 WIB`;
}

function bibStatusLabel(
  status: ParticipantRegistrationSessionSummary["summary"]["registration"]["bibStatus"],
) {
  const labels = {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    READY: "READY",
    FAILED: "FAILED",
  } satisfies Record<
    ParticipantRegistrationSessionSummary["summary"]["registration"]["bibStatus"],
    string
  >;

  return labels[status];
}

function categoryProgress(item: ParticipantSubmissionCategory) {
  const submitted = Boolean(item.submission);
  const approved = item.submission?.status === "APPROVED";
  const rejected =
    item.submission?.status === "REJECTED" || item.submission?.status === "DISQUALIFIED";

  return [
    { label: "Terdaftar", detail: formatBusinessDate(item.registration.registeredAt), done: true },
    {
      label: "Siap Lari",
      detail: `${formatBusinessDate(item.event.activityStartsAt)} - ${formatBusinessDate(item.event.activityEndsAt)}`,
      done: true,
    },
    {
      label: "Upload Hasil",
      detail: `${formatBusinessDate(item.event.uploadStartsAt)} - ${formatBusinessDate(item.event.uploadEndsAt)}`,
      done: submitted,
    },
    {
      label: "Verifikasi",
      detail: approved ? "Disetujui" : rejected ? "Selesai" : "Menunggu",
      done: approved || rejected,
    },
    { label: "Selesai", detail: approved ? "Sertifikat" : "Sertifikat", done: approved },
  ];
}

function ParticipantCategoryDashboardCard({ item }: { item: ParticipantSubmissionCategory }) {
  const href = `/events/${item.event.slug}/participant/submissions/${item.registrationCategoryId}`;
  const historyHref = `${href}/history`;
  const progress = categoryProgress(item);

  return (
    <article className="border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
            {item.category.name}
          </h3>
          <p className="mt-2 text-sm font-bold text-[var(--color-landing-teal-dark)]">
            {formatDistanceMeter(item.category.distanceMeters)}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-landing-ink-2)]">
            Selesaikan lari {formatDistanceMeter(item.category.distanceMeters)} di mana saja dan
            kapan saja selama periode event.
          </p>
        </div>
        <StatusBadge tone={submissionStatusTone(item.submission?.status ?? null)}>
          {submissionStatusLabel(item.submission?.status ?? null)}
        </StatusBadge>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="landing-action inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] px-4 py-2 text-sm font-bold text-[var(--color-landing-white)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-teal-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
          href={href}
        >
          <Icon className="h-4 w-4" name="upload" />
          {item.submission?.status === "REVISION_REQUIRED" ? "Upload Revisi" : "Upload Hasil"}
        </Link>
        <Link
          className="landing-action inline-flex min-h-11 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] px-4 py-2 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
          href={historyHref}
        >
          <Icon className="h-4 w-4" name="clipboard" />
          Riwayat
        </Link>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-5">
        {progress.map((step, index) => (
          <div className="relative min-w-0" key={step.label}>
            {index > 0 ? (
              <svg
                aria-hidden="true"
                className="absolute right-1/2 top-5 hidden h-3 w-full pr-10 text-[var(--color-landing-rule)] sm:block"
                preserveAspectRatio="none"
                viewBox="0 0 100 8"
              >
                <path
                  d="M2 4H98"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="5 6"
                  strokeWidth="2"
                />
              </svg>
            ) : null}
            <span
              className={[
                "relative z-10 inline-flex h-10 w-10 items-center justify-center border-2 text-sm font-bold",
                step.done
                  ? "border-[var(--color-landing-ink)] bg-[var(--color-landing-teal)] text-[var(--color-landing-ink)]"
                  : "border-[var(--color-landing-rule)] bg-[var(--color-landing-paper)] text-[var(--color-landing-ink)]",
              ].join(" ")}
            >
              {step.done && index === 0 ? <Icon className="h-4 w-4" name="check" /> : index + 1}
            </span>
            <p className="mt-3 text-xs font-bold text-[var(--color-landing-ink)]">{step.label}</p>
            <p className="mt-1 text-[11px] leading-4 text-[var(--color-landing-ink-2)]">
              {step.detail}
            </p>
          </div>
        ))}
      </div>
      {!canSubmit(item) ? (
        <div className="mt-6 border border-info/25 bg-info/10 p-3 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
          Upload hasil hanya aktif untuk submission baru atau saat validator meminta revisi.
        </div>
      ) : null}
    </article>
  );
}

function CategorySubmissionRow({ item }: { item: ParticipantSubmissionCategory }) {
  const href = `/events/${item.event.slug}/participant/submissions/${item.registrationCategoryId}`;
  const historyHref = `${href}/history`;

  return (
    <article className="border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] p-4 sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <p className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
            {item.category.name}
          </p>
          <p className="mt-2 text-sm font-bold text-[var(--color-landing-teal-dark)]">
            {formatDistanceMeter(item.category.distanceMeters)}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-landing-ink-2)]">
            Upload bukti aktivitas untuk kategori ini. Revisi lama tetap tersimpan sebagai riwayat.
          </p>
        </div>
        <StatusBadge tone={submissionStatusTone(item.submission?.status ?? null)}>
          {submissionStatusLabel(item.submission?.status ?? null)}
        </StatusBadge>
      </div>
      {item.submission ? (
        <dl className="mt-5 grid gap-4 border-y border-[var(--color-landing-rule)] sm:grid-cols-3">
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
        <p className="mt-5 border-y border-[var(--color-landing-rule)] py-4 text-sm leading-6 text-[var(--color-landing-ink-2)]">
          Belum ada hasil yang dikirim untuk kategori ini.
        </p>
      )}
      {item.submission?.latestParticipantVisibleNote ? (
        <div className="mt-4 border border-warning/35 bg-warning/10 p-4 text-sm text-[var(--color-landing-ink)]">
          <p className="font-bold text-warning">Catatan validator</p>
          <p className="mt-1 leading-6 text-[var(--color-landing-ink)]">
            {item.submission.latestParticipantVisibleNote}
          </p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <PrimaryAction href={href}>
          <Icon className="h-4 w-4" name="upload" />
          {item.submission?.status === "REVISION_REQUIRED" ? "Kirim revisi" : "Upload hasil"}
        </PrimaryAction>
        <SecondaryAction href={historyHref}>
          <Icon className="h-4 w-4" name="clipboard" />
          Riwayat
        </SecondaryAction>
      </div>
      {!canSubmit(item) ? (
        <p className="mt-4 text-xs font-bold leading-5 text-[var(--color-landing-ink-2)]">
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
  const event = summary.event;
  const firstCategory = categories[0] ?? null;
  const submittedCategories = categories.filter((item) => item.submission);
  const approvedCount = categories.filter((item) => item.submission?.status === "APPROVED").length;
  const heroImage = resolveEventBannerSrc(event);
  const categoryText = summary.categories.map((item) => item.name).join(", ");
  const firstUploadHref = firstCategory
    ? `/events/${event.slug}/participant/submissions/${firstCategory.registrationCategoryId}`
    : `/events/${event.slug}/participant/submissions`;

  return participantPageShell({
    event,
    children: (
      <div className="space-y-8 lg:space-y-10">
        <section className="relative overflow-hidden border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)]">
          {heroImage ? (
            <Image
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              fill
              priority
              sizes="100vw"
              src={heroImage}
            />
          ) : null}
          <div className="absolute inset-0 bg-[var(--color-landing-overlay)]" />
          <div className="relative grid min-h-[34rem] gap-8 p-5 text-[var(--color-landing-white)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
            <div className="flex min-w-0 flex-col justify-end">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                Area Peserta
              </p>
              <h1 className="landing-display mt-3 max-w-4xl text-5xl leading-[0.95] text-[var(--color-landing-white)] sm:text-7xl lg:text-8xl">
                {summary.participant.fullName}
              </h1>
              <div className="mt-5 h-[3px] w-16 bg-[var(--color-landing-orange)]" />
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/80">
                Kelola BIB dan upload hasil virtual run untuk event {event.name}.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-white)] bg-[var(--color-landing-white)] px-5 py-3 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-orange)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
                  href={firstUploadHref}
                >
                  <Icon className="h-4 w-4" name="upload" />
                  Upload Hasil
                </Link>
                <Link
                  className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-white)] bg-transparent px-5 py-3 text-sm font-bold text-[var(--color-landing-white)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-white)] hover:text-[var(--color-landing-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
                  href={`/events/${event.slug}/participant/bib`}
                >
                  <Icon className="h-4 w-4" name="clipboard" />
                  Lihat BIB
                </Link>
                <a
                  className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-white)] bg-transparent px-5 py-3 text-sm font-bold text-[var(--color-landing-white)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-white)] hover:text-[var(--color-landing-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
                  href="#panduan-upload"
                >
                  <Icon className="h-4 w-4" name="document" />
                  Lihat Panduan
                </a>
              </div>
            </div>
            <aside className="self-end border-2 border-[var(--color-landing-white)] bg-[var(--color-landing-paper)] p-5 text-[var(--color-landing-ink)]">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-landing-teal-dark)]">
                <Icon className="h-5 w-5" name="bib" />
                Ringkasan Peserta
              </h2>
              <dl className="mt-4 divide-y divide-[var(--color-landing-rule)] border-y border-[var(--color-landing-rule)]">
                {[
                  ["Nomor BIB", summary.registration.bibNumber],
                  ["Status BIB", bibStatusLabel(summary.registration.bibStatus)],
                  ["Kategori", categoryText || "Belum ada kategori"],
                  [
                    "Status Submission",
                    submittedCategories.length > 0
                      ? `${submittedCategories.length} kategori sudah diunggah`
                      : "Belum diunggah",
                  ],
                ].map(([label, value]) => (
                  <div className="py-4" key={label}>
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                      {label}
                    </dt>
                    <dd className="mt-1 text-base font-black text-[var(--color-landing-ink)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </section>

        <section className="grid gap-5 border-y-2 border-[var(--color-landing-ink)] py-6 lg:grid-cols-[minmax(260px,1.25fr)_repeat(4,minmax(0,1fr))]">
          <div className="border-t border-[var(--color-landing-rule)] py-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
              Preview BIB Anda
            </h2>
            {summary.registration.bibStatus === "READY" && summary.bibObjectKey ? (
              <div className="mt-4 overflow-hidden border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`BIB ${summary.registration.bibNumber}`}
                  className="aspect-[1.7/1] w-full object-cover"
                  src={`/api/participant/bib/download?registrationId=${summary.registration.id}&mode=preview`}
                />
              </div>
            ) : (
              <div className="mt-4 flex aspect-[1.7/1] items-center justify-center border-2 border-dashed border-[var(--color-landing-rule)] bg-[var(--color-landing-paper-2)] px-4 text-center text-sm font-bold text-[var(--color-landing-ink-2)]">
                Preview BIB belum tersedia.
              </div>
            )}
          </div>
          <MiniStat
            description="Periode kamu untuk menyelesaikan lari."
            icon="calendar"
            label="Periode Lari"
            value={compactDateRange(event.activityStartsAt, event.activityEndsAt)}
          />
          <MiniStat
            description="Upload hanya pada periode yang ditentukan."
            icon="upload"
            label="Batas Upload Hasil"
            value={compactDateRange(event.uploadStartsAt, event.uploadEndsAt)}
          />
          <MiniStat
            description="Hasil akan diverifikasi oleh tim setelah upload."
            icon="shield"
            label="Status Verifikasi"
            tone={approvedCount > 0 ? "primary" : "warning"}
            value={approvedCount > 0 ? `${approvedCount} Disetujui` : "Menunggu"}
          />
          <MiniStat
            description={
              submittedCategories.length > 0
                ? "Lihat semua riwayat upload."
                : "Belum ada submission."
            }
            icon="clipboard"
            label="Total Submission"
            value={`${submittedCategories.length} Kali`}
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-5">
            <DashboardCard>
              <SectionTitle title="Status per Kategori" />
              <div className="mt-5 grid gap-4">
                {categories.map((item) => (
                  <ParticipantCategoryDashboardCard item={item} key={item.registrationCategoryId} />
                ))}
              </div>
            </DashboardCard>

            <DashboardCard>
              <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                Riwayat Submission
              </h2>
              {submittedCategories.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {submittedCategories.map((item) => (
                    <Link
                      className="landing-action flex items-start justify-between gap-4 border border-[var(--color-landing-rule)] bg-[var(--color-landing-white)] p-4 transition-colors duration-[var(--dur-short)] hover:border-[var(--color-landing-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]"
                      href={`/events/${event.slug}/participant/submissions/${item.registrationCategoryId}/history`}
                      key={item.registrationCategoryId}
                    >
                      <span>
                        <span className="block text-sm font-bold text-[var(--color-landing-ink)]">
                          {item.category.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--color-landing-ink-2)]">
                          {item.submission?.lastSubmittedAt
                            ? `${formatBusinessDateTime(item.submission.lastSubmittedAt)} WIB`
                            : "Belum ada waktu upload"}
                        </span>
                      </span>
                      <StatusBadge tone={submissionStatusTone(item.submission?.status ?? null)}>
                        {submissionStatusLabel(item.submission?.status ?? null)}
                      </StatusBadge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid justify-items-center border border-dashed border-[var(--color-landing-rule)] bg-[var(--color-landing-paper-2)] px-4 py-10 text-center">
                  <Icon
                    className="h-12 w-12 text-[var(--color-landing-teal-dark)]"
                    name="document"
                  />
                  <p className="mt-4 font-bold text-[var(--color-landing-ink)]">
                    Belum ada riwayat submission.
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-landing-ink-2)]">
                    Upload hasil lari kamu untuk mulai mencatat capaianmu.
                  </p>
                </div>
              )}
            </DashboardCard>

            <DashboardCard>
              <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                Checklist Sebelum Upload
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {[
                  [
                    "Aktivitas sesuai kategori",
                    "Pastikan jarak, waktu, dan tanggal sesuai kategori.",
                  ],
                  [
                    "Data jelas & terbaca",
                    "Screenshot harus menampilkan jarak, waktu, dan tanggal.",
                  ],
                  ["Tidak diedit", "Hindari edit atau manipulasi bukti agar verifikasi lancar."],
                  [
                    "Upload dalam periode",
                    "Pastikan upload dilakukan dalam periode yang ditentukan.",
                  ],
                ].map(([title, detail], index) => (
                  <div className="flex gap-3" key={title}>
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-orange)] text-xs font-bold text-[var(--color-landing-ink)]">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-[var(--color-landing-ink)]">
                        {title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-[var(--color-landing-ink-2)]">
                        {detail}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </DashboardCard>
          </div>

          <aside className="space-y-5">
            <DashboardCard className="scroll-mt-24" id="panduan-upload">
              <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                Panduan Upload
              </h2>
              <div className="mt-5 grid gap-4">
                {[
                  [
                    "Siapkan Hasil Lari",
                    "Gunakan aplikasi seperti Strava, Garmin, atau treadmill.",
                  ],
                  [
                    "Upload Hasil",
                    "Foto hasil atau screenshot aktivitas kamu selama periode event.",
                  ],
                  ["Tunggu Verifikasi", "Tim kami akan memverifikasi hasilmu maksimal 3x24 jam."],
                  ["Sertifikat & Hasil", "Setelah disetujui, hasil tercatat pada riwayat kamu."],
                ].map(([title, detail]) => (
                  <div className="flex gap-3" key={title}>
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] text-[var(--color-landing-ink)]">
                      <Icon className="h-5 w-5" name="clipboard" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[var(--color-landing-ink)]">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--color-landing-ink-2)]">
                        {detail}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <Link
                className="landing-action mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--color-landing-teal-dark)] underline decoration-[var(--color-landing-orange)] decoration-2 underline-offset-4"
                href={`/events/${event.slug}/participant/submissions`}
              >
                Lihat Panduan Lengkap
                <Icon className="h-4 w-4" name="arrow-right" />
              </Link>
            </DashboardCard>

            <DashboardCard>
              <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                Kontak Bantuan
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-landing-ink-2)]">
                Butuh bantuan saat upload atau informasi lain?
              </p>
              <div className="mt-4 grid gap-3 text-sm font-bold text-[var(--color-landing-ink)]">
                <p className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-landing-teal-dark)]" name="mail" />
                  {event.contactEmail ?? "Kontak email belum tersedia"}
                </p>
                <p className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-landing-teal-dark)]" name="phone" />
                  {event.contactWhatsapp ?? event.contactPhone ?? "Nomor bantuan belum tersedia"}
                </p>
              </div>
            </DashboardCard>

            <DashboardCard>
              <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                Informasi Event
              </h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                    Event
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">{event.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                    Periode Lari
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">
                    {formatBusinessDate(event.activityStartsAt)} -{" "}
                    {formatBusinessDate(event.activityEndsAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                    Periode Upload
                  </dt>
                  <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">
                    {formatBusinessDate(event.uploadStartsAt)} -{" "}
                    {formatBusinessDate(event.uploadEndsAt)}
                  </dd>
                </div>
              </dl>
            </DashboardCard>

            <DashboardCard>
              <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                Status Akun
              </h2>
              <p className="mt-4 flex items-start gap-3 text-sm text-[var(--color-landing-ink)]">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-teal)] text-[var(--color-landing-ink)]">
                  <Icon className="h-3.5 w-3.5" name="check" />
                </span>
                <span>
                  <span className="block font-bold text-[var(--color-landing-teal-dark)]">
                    Akun Terverifikasi
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-landing-ink-2)]">
                    Akun kamu telah diverifikasi dan siap digunakan untuk semua event.
                  </span>
                </span>
              </p>
            </DashboardCard>
          </aside>
        </div>
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
      <div className="space-y-8">
        <UploadPageHeader
          action={
            <SecondaryAction href={`/events/${event.slug}/participant`}>
              <Icon className="h-4 w-4" name="arrow-right" />
              Area Peserta
            </SecondaryAction>
          }
          description="Pilih kategori yang ingin kamu upload. Setiap kategori menyimpan riwayat revisinya sendiri."
          eyebrow="Upload hasil"
          title={event.name}
        />
        <section className="grid gap-4" aria-label="Kategori upload hasil">
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
  initialState,
}: {
  detail: SubmissionDetail;
  csrfToken: string;
  action: (
    state: SubmissionFormActionState,
    formData: FormData,
  ) => Promise<SubmissionFormActionState>;
  initialState: SubmissionFormActionState;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [formValues, setFormValues] = useState(initialState.values);
  const values = formValues;
  const errors = state.fieldErrors;
  const hasCurrentRevision = Boolean(detail.currentRevision);

  useEffect(() => setFormValues(state.values), [state.values]);

  function updateValue<K extends keyof SubmissionFormValues>(
    name: K,
    value: SubmissionFormValues[K],
  ) {
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  return participantPageShell({
    event: detail.event,
    children: (
      <div className="space-y-8">
        <UploadPageHeader
          action={
            <SecondaryAction
              href={`/events/${detail.event.slug}/participant/submissions/${detail.registrationCategoryId}/history`}
            >
              <Icon className="h-4 w-4" name="clipboard" />
              Riwayat
            </SecondaryAction>
          }
          description="Kirim hasil lari sesuai kategori. Revisi lama tetap tersimpan sebagai riwayat."
          eyebrow="Upload hasil"
          title={detail.category.name}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            {state.formError ? (
              <div className="mb-6 border-2 border-danger/35 bg-danger/10 p-4 text-sm font-bold leading-6 text-danger">
                {state.formError}
              </div>
            ) : null}
            {detail.submission?.latestParticipantVisibleNote ? (
              <div className="mb-6 border border-warning/35 bg-warning/10 p-4 text-sm text-[var(--color-landing-ink)]">
                <p className="font-bold text-warning">Catatan validator</p>
                <p className="mt-1 leading-6">{detail.submission.latestParticipantVisibleNote}</p>
              </div>
            ) : null}

            <form
              action={formAction}
              className="grid gap-7 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] p-5 sm:p-6"
              encType="multipart/form-data"
            >
              <input name="csrfToken" type="hidden" value={csrfToken} />
              <input name="idempotencyKey" type="hidden" value={values.idempotencyKey} readOnly />

              <div>
                <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                  Data Aktivitas
                </h2>
                <div className="mt-5 grid gap-5">
                  <FormField label="Platform aktivitas">
                    <select
                      aria-describedby={errors.activityPlatform ? "activityPlatform-error" : undefined}
                      aria-invalid={Boolean(errors.activityPlatform)}
                      className={formControlClass}
                      onChange={(event) => updateValue("activityPlatform", event.target.value)}
                      value={values.activityPlatform}
                      name="activityPlatform"
                      required
                    >
                      {Object.entries(activityPlatformLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <FieldError errors={errors} field="activityPlatform" />
                  </FormField>
                  <FormField label="Link aktivitas">
                    <input
                      aria-describedby={errors.activityUrl ? "activityUrl-error" : undefined}
                      aria-invalid={Boolean(errors.activityUrl)}
                      className={formControlClass}
                      onChange={(event) => updateValue("activityUrl", event.target.value)}
                      name="activityUrl"
                      placeholder="https://..."
                      type="url"
                      value={values.activityUrl}
                    />
                    <FieldError errors={errors} field="activityUrl" />
                  </FormField>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Tanggal aktivitas">
                      <DatePickerInput
                        ariaDescribedBy={errors.activityDate ? "activityDate-error" : undefined}
                        ariaInvalid={Boolean(errors.activityDate)}
                        name="activityDate"
                        onChange={(value) => updateValue("activityDate", value)}
                        required
                        value={values.activityDate}
                      />
                      <FieldError errors={errors} field="activityDate" />
                    </FormField>
                    <FormField label="Jarak">
                      <input
                        aria-describedby={errors.distanceKilometer ? "distanceKilometer-error" : undefined}
                        aria-invalid={Boolean(errors.distanceKilometer)}
                        className={formControlClass}
                        onChange={(event) => updateValue("distanceKilometer", event.target.value)}
                        min="0.01"
                        name="distanceKilometer"
                        required
                        step="0.01"
                        type="number"
                        value={values.distanceKilometer}
                      />
                      <FieldError errors={errors} field="distanceKilometer" />
                    </FormField>
                  </div>
                  <FormField label="Nama platform lain">
                    <input
                      aria-describedby={errors.activityPlatformOther ? "activityPlatformOther-error" : undefined}
                      aria-invalid={Boolean(errors.activityPlatformOther)}
                      className={formControlClass}
                      onChange={(event) => updateValue("activityPlatformOther", event.target.value)}
                      name="activityPlatformOther"
                      value={values.activityPlatformOther}
                    />
                    <FieldError errors={errors} field="activityPlatformOther" />
                  </FormField>
                </div>
              </div>

              {/*
              <div className="border-t border-[var(--color-landing-rule)] pt-6">
                <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                  Durasi
                </h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  <FormField label="Jam">
                    <input
                      className={formControlClass}
                      defaultValue={current ? Math.floor(current.elapsedTimeSeconds / 3600) : ""}
                      min="0"
                      name="elapsedHours"
                      type="number"
                    />
                  </FormField>
                  <FormField label="Menit">
                    <input
                      className={formControlClass}
                      defaultValue={
                        current ? Math.floor((current.elapsedTimeSeconds % 3600) / 60) : ""
                      }
                      min="0"
                      name="elapsedMinutes"
                      type="number"
                    />
                  </FormField>
                  <FormField label="Detik">
                    <input
                      className={formControlClass}
                      defaultValue={current ? current.elapsedTimeSeconds % 60 : ""}
                      min="0"
                      name="elapsedSeconds"
                      type="number"
                    />
                  </FormField>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  <FormField label="Moving jam">
                    <input
                      className={formControlClass}
                      defaultValue={
                        current?.movingTimeSeconds
                          ? Math.floor(current.movingTimeSeconds / 3600)
                          : ""
                      }
                      min="0"
                      name="movingHours"
                      type="number"
                    />
                  </FormField>
                  <FormField label="Moving menit">
                    <input
                      className={formControlClass}
                      defaultValue={
                        current?.movingTimeSeconds
                          ? Math.floor((current.movingTimeSeconds % 3600) / 60)
                          : ""
                      }
                      min="0"
                      name="movingMinutes"
                      type="number"
                    />
                  </FormField>
                  <FormField label="Moving detik">
                    <input
                      className={formControlClass}
                      defaultValue={
                        current?.movingTimeSeconds ? current.movingTimeSeconds % 60 : ""
                      }
                      min="0"
                      name="movingSeconds"
                      type="number"
                    />
                  </FormField>
                </div>
              </div>

              </div>
              */}

              <div className="border-t border-[var(--color-landing-rule)] pt-6">
                <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
                  Bukti
                </h2>
                <div className="mt-5 grid gap-5">
                  <FormField label="Screenshot bukti">
                    <input
                      aria-describedby={errors.screenshot ? "screenshot-error" : undefined}
                      aria-invalid={Boolean(errors.screenshot)}
                      accept="image/jpeg,image/png,image/webp"
                      className={`${formControlClass} py-3`}
                      name="screenshot"
                      type="file"
                    />
                    <FieldError errors={errors} field="screenshot" />
                  </FormField>
                  <FormField label="Catatan peserta">
                    <textarea
                      aria-describedby={errors.participantNote ? "participantNote-error" : undefined}
                      aria-invalid={Boolean(errors.participantNote)}
                      className={textAreaClass}
                      onChange={(event) => updateValue("participantNote", event.target.value)}
                      name="participantNote"
                      value={values.participantNote}
                    />
                    <FieldError errors={errors} field="participantNote" />
                  </FormField>
                </div>
              </div>

              <div className="border-t border-[var(--color-landing-rule)] pt-6">
                <label className="flex min-h-12 items-start gap-3 text-sm font-bold leading-6 text-[var(--color-landing-ink)]">
                  <input
                    aria-describedby={errors.dataStatementAccepted ? "dataStatementAccepted-error" : undefined}
                    aria-invalid={Boolean(errors.dataStatementAccepted)}
                    checked={values.dataStatementAccepted}
                    className="mt-1 h-5 w-5 accent-primary"
                    name="dataStatementAccepted"
                    onChange={(event) => updateValue("dataStatementAccepted", event.target.checked)}
                    required
                    type="checkbox"
                  />
                  <span>Saya menyatakan hasil dan bukti aktivitas yang dikirim benar.</span>
                </label>
                <FieldError errors={errors} field="dataStatementAccepted" />
                <button className="landing-action mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-orange)] px-5 py-3 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px sm:w-auto">
                  <Icon className="h-4 w-4" name="upload" />
                  Kirim hasil
                </button>
              </div>
            </form>
          </section>
          <aside className="h-fit border-t-2 border-[var(--color-landing-ink)] py-5 lg:sticky lg:top-28">
            <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
              Ringkasan
            </h2>
            <dl className="mt-5 divide-y divide-[var(--color-landing-rule)] border-y border-[var(--color-landing-rule)]">
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
            {hasCurrentRevision ? (
              <div className="mt-5">
                <SecondaryAction
                  href={`/events/${detail.event.slug}/participant/submissions/${detail.registrationCategoryId}/history`}
                >
                  <Icon className="h-4 w-4" name="clipboard" />
                  Lihat riwayat revisi
                </SecondaryAction>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    ),
  });
}

function PublicRevisionCard({ revision }: { revision: SubmissionRevisionRecord }) {
  return (
    <article className="border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
            Revisi {revision.revisionNumber}
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
            {formatBusinessDateTime(revision.submittedAt)} WIB
          </p>
        </div>
        <StatusBadge tone={revision.supersededAt ? "neutral" : "warning"}>
          {revision.supersededAt ? "Superseded" : "Terbaru"}
        </StatusBadge>
      </div>
      <dl className="mt-5 grid gap-4 border-y border-[var(--color-landing-rule)] sm:grid-cols-3">
        <Metric label="Jarak" value={formatDistanceMeter(revision.distanceMeter)} />
      </dl>
      <p className="mt-4 break-words text-xs font-bold leading-5 text-[var(--color-landing-ink-2)]">
        {activityPlatformLabels[revision.activityPlatform]} -{" "}
        {revision.activityUrl ?? "Tanpa link aktivitas"}
      </p>
      {revision.participantNote ? (
        <p className="mt-3 border-l-2 border-[var(--color-landing-orange)] pl-4 text-sm leading-6 text-[var(--color-landing-ink)]">
          {revision.participantNote}
        </p>
      ) : null}
    </article>
  );
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
      <div className="space-y-8">
        <UploadPageHeader
          action={
            <PrimaryAction
              href={`/events/${detail.event.slug}/participant/submissions/${detail.registrationCategoryId}`}
            >
              <Icon className="h-4 w-4" name="upload" />
              Upload hasil
            </PrimaryAction>
          }
          description="Semua revisi tersimpan berurutan. Revisi terbaru dipakai untuk proses validasi."
          eyebrow="Riwayat revisi"
          title={detail.category.name}
        />
        {detail.revisions.length > 0 ? (
          <section className="grid gap-4">
            {detail.revisions.map((revision) => (
              <PublicRevisionCard key={revision.id} revision={revision} />
            ))}
          </section>
        ) : (
          <section className="border border-dashed border-[var(--color-landing-rule)] bg-[var(--color-landing-paper-2)] p-6">
            <p className="font-bold text-[var(--color-landing-ink)]">Belum ada revisi.</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-landing-ink-2)]">
              Upload hasil pertama untuk membuat riwayat submission.
            </p>
          </section>
        )}
        {detail.validationReviews.length > 0 ? (
          <section className="grid gap-3 border-t-2 border-[var(--color-landing-ink)] py-6">
            <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
              Catatan validator
            </h2>
            {detail.validationReviews.map((review) => (
              <article
                key={review.id}
                className="border border-[var(--color-landing-rule)] bg-[var(--color-landing-white)] p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-bold text-[var(--color-landing-ink)]">
                    {submissionStatusLabel(review.resultingStatus)}
                  </p>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                    {formatBusinessDateTime(review.reviewedAt)} WIB
                  </p>
                </div>
                {review.reasonCode ? (
                  <p className="mt-2 text-xs font-bold text-[var(--color-landing-ink-2)]">
                    Alasan: {review.reasonCode}
                  </p>
                ) : null}
                {review.participantVisibleNote ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--color-landing-ink)]">
                    {review.participantVisibleNote}
                  </p>
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
                {formatDistanceMeter(item.currentRevision.distanceMeter)}
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
