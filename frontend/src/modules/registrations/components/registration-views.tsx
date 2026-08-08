/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Hallmark · genre: editorial · macrostructure: Access Gate · theme: Sport · enrichment: event photography · design-system: design.md · designed-as-app */
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import {
  formatDateRange,
  formatDateTimeRange,
  resolveEventBannerSrc,
} from "@/modules/events/components/event-display";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import { PublicRegistrationForm } from "@/modules/registrations/components/public-registration-form";
import { createPublicRegistrationFormState } from "@/modules/registrations/registration-form-state";
import type { PublicRegistrationFormState } from "@/modules/registrations/registration-form-state";
import type { RegistrationSummary } from "@/modules/registrations/registration.types";
import { env } from "@/shared/config/env";
import { Icon } from "@/shared/ui/icons";

function errorMessage(code?: string): string | null {
  if (!code) {
    return null;
  }

  const messages: Record<string, string> = {
    validation_failed: "Data pendaftaran belum lengkap atau belum sesuai aturan event.",
    conflict: "Pendaftaran belum dapat diproses karena data perlu diverifikasi.",
    "rate-limited": "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
    forbidden: "Verifikasi keamanan belum berhasil.",
    access: "Kode registrasi atau email belum cocok.",
  };

  return messages[code] ?? "Permintaan belum dapat diproses. Coba ulangi beberapa saat lagi.";
}

function PageShell({ event, children }: { event: EventRecord; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-landing-paper)] text-[var(--color-landing-ink)]">
      <PublicHeader active="events" />
      <main className="app-container py-8 sm:py-12 lg:py-16">{children}</main>
      <PublicFooter contactEmail={event.contactEmail} contactPhone={event.contactPhone} />
    </div>
  );
}

export function RegistrationClosedView({
  event,
  title,
  description,
}: {
  event: EventRecord;
  title: string;
  description: string;
}) {
  return (
    <PageShell event={event}>
      <section className="max-w-3xl border-l-4 border-primary bg-surface p-5">
        <p className="eyebrow">{event.name}</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">{title}</h1>
        <p className="body-copy mt-3">{description}</p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-app bg-primary px-4 py-2 text-sm font-bold text-white"
          href={`/events/${event.slug}`}
        >
          Kembali ke detail event
        </Link>
      </section>
    </PageShell>
  );
}

export function RegistrationFormView({
  event,
  categories,
  action,
  idempotencyKey,
}: {
  event: EventRecord;
  categories: EventCategoryRecord[];
  action: (
    state: PublicRegistrationFormState,
    formData: FormData,
  ) => Promise<PublicRegistrationFormState>;
  idempotencyKey: string;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const canBypass = env.TURNSTILE_DEVELOPMENT_BYPASS === "true" && env.NODE_ENV !== "production";

  return (
    <PageShell event={event}>
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" /> : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <p className="eyebrow">Pendaftaran Peserta</p>
          <h1 className="mt-2 text-3xl font-bold text-navy sm:text-5xl">{event.name}</h1>
          <p className="body-copy mt-4">
            Pilih kategori, isi data diri, lalu periksa ringkasan sebelum mengirim. Pendaftaran
            tidak membutuhkan akun peserta.
          </p>
          <PublicRegistrationForm
            action={action}
            canBypassTurnstile={canBypass}
            categories={categories}
            initialState={createPublicRegistrationFormState(idempotencyKey)}
            siteKey={siteKey}
          />
        </section>

        <aside className="h-fit rounded-section border border-border bg-surface p-5 shadow-soft lg:sticky lg:top-24">
          <p className="eyebrow">Ringkasan</p>
          <h2 className="mt-2 text-lg font-bold text-navy">{event.name}</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="rounded-app bg-surface-muted p-3">
              <dt className="caption-copy font-bold">Pendaftaran</dt>
              <dd className="mt-1 font-bold text-foreground">
                {formatDateTimeRange(event.registrationStartsAt, event.registrationEndsAt)}
              </dd>
            </div>
            <div className="rounded-app bg-surface-muted p-3">
              <dt className="caption-copy font-bold">Periode lari</dt>
              <dd className="mt-1 font-bold text-foreground">
                {formatDateTimeRange(event.activityStartsAt, event.activityEndsAt)}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </PageShell>
  );
}

export function ParticipantAccessView({
  event,
  action,
  error,
}: {
  event: EventRecord;
  action: (formData: FormData) => void;
  error?: string;
}) {
  const heroImage = resolveEventBannerSrc(event);
  const message = errorMessage(error);

  return (
    <PageShell event={event}>
      <section className="grid overflow-hidden border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] lg:min-h-[34rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <div className="relative min-h-[18rem] overflow-hidden border-b-2 border-[var(--color-landing-ink)] lg:min-h-full lg:border-b-0 lg:border-r-2">
          {heroImage ? (
            <Image
              alt=""
              className="h-full w-full object-cover"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              src={heroImage}
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-landing-paper-2)]" />
          )}
          <div className="absolute inset-0 bg-[var(--color-landing-overlay)]" />
          <div className="relative flex min-h-[18rem] flex-col justify-between p-5 text-[var(--color-landing-white)] sm:p-8 lg:min-h-full lg:p-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                Akses Peserta
              </p>
              <h1 className="landing-display mt-4 max-w-3xl text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
                Buka BIB dan hasil.
              </h1>
            </div>
            <div className="mt-8 max-w-xl border-t border-white/30 pt-5 text-sm leading-7 text-white/80">
              Masukkan email dan registration code dari pendaftaran untuk membuka area peserta event{" "}
              {event.name}.
            </div>
          </div>
        </div>

        <div className="grid content-between gap-8 p-5 sm:p-8 lg:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-landing-ink-2)]">
              {event.name}
            </p>
            <h2 className="landing-display mt-3 text-4xl leading-none text-[var(--color-landing-ink)] sm:text-5xl">
              Verifikasi peserta
            </h2>
            {message ? (
              <div className="mt-6 border-2 border-danger/40 bg-danger/10 p-4 text-sm font-bold leading-6 text-danger">
                {message}
              </div>
            ) : null}
            <form action={action} className="mt-7 grid gap-5">
              <label className="grid gap-2 text-sm font-bold text-[var(--color-landing-ink)]">
                Email
                <input
                  className="min-h-12 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] px-4 text-sm text-[var(--color-landing-ink)] outline-none transition-colors duration-[var(--dur-short)] focus-visible:border-[var(--color-landing-orange)] focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]"
                  name="displayEmail"
                  required
                  type="email"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[var(--color-landing-ink)]">
                Registration code
                <input
                  className="min-h-12 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] px-4 text-sm uppercase text-[var(--color-landing-ink)] outline-none transition-colors duration-[var(--dur-short)] focus-visible:border-[var(--color-landing-orange)] focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)]"
                  name="registrationCode"
                  required
                />
              </label>
              <button className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] px-5 py-3 text-sm font-bold text-[var(--color-landing-white)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-teal-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px">
                Buka Area Peserta
                <Icon className="h-4 w-4" name="arrow-right" />
              </button>
            </form>
          </div>

          <dl className="grid gap-0 border-y border-[var(--color-landing-rule)] text-sm sm:grid-cols-2 lg:grid-cols-1">
            <div className="border-b border-[var(--color-landing-rule)] py-4 sm:border-b-0 sm:border-r lg:border-b lg:border-r-0">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                Periode lari
              </dt>
              <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">
                {formatDateRange(event.activityStartsAt, event.activityEndsAt)}
              </dd>
            </div>
            <div className="py-4 sm:pl-4 lg:pl-0">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                Periode upload
              </dt>
              <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">
                {formatDateRange(event.uploadStartsAt, event.uploadEndsAt)}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </PageShell>
  );
}

export function ParticipantBibView({ summary }: { summary: RegistrationSummary }) {
  const categoryText = summary.categories.map((category) => category.name).join(", ");

  return (
    <PageShell event={summary.event}>
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-landing-ink-2)]">
            BIB Peserta
          </p>
          <h1 className="landing-display mt-3 text-6xl leading-none text-[var(--color-landing-ink)] sm:text-8xl">
            {summary.registration.bibNumber}
          </h1>
          <p className="mt-3 text-base font-bold text-[var(--color-landing-ink)]">
            {summary.participant.fullName}
          </p>
          <div className="mt-8 overflow-hidden border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)]">
            {summary.registration.bibStatus === "READY" && summary.bibObjectKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`BIB ${summary.registration.bibNumber}`}
                className="w-full"
                src={`/api/participant/bib/download?registrationId=${summary.registration.id}&mode=preview`}
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center bg-[var(--color-landing-paper-2)] p-6 text-center text-sm font-bold text-[var(--color-landing-ink-2)]">
                {summary.registration.bibStatus === "FAILED"
                  ? "BIB gagal diproses. Admin dapat menjalankan retry."
                  : "BIB sedang diproses."}
              </div>
            )}
          </div>
        </div>
        <aside className="h-fit border-t-2 border-[var(--color-landing-ink)] py-5 lg:sticky lg:top-28">
          <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
            Status
          </h2>
          <dl className="mt-5 divide-y divide-[var(--color-landing-rule)] border-y border-[var(--color-landing-rule)] text-sm">
            <div className="py-4">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                Kategori
              </dt>
              <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">
                {categoryText || "Belum ada kategori"}
              </dd>
            </div>
            <div className="py-4">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                Generate BIB
              </dt>
              <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">
                {summary.registration.bibStatus}
              </dd>
            </div>
          </dl>
          {summary.registration.bibStatus === "READY" && summary.bibObjectKey ? (
            <a
              className="landing-action mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-orange)] px-4 py-2 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
              href={`/api/participant/bib/download?registrationId=${summary.registration.id}`}
            >
              <Icon className="h-4 w-4" name="download" />
              Unduh BIB
            </a>
          ) : null}
        </aside>
      </section>
    </PageShell>
  );
}
