/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Hallmark · genre: editorial · macrostructure: Confirmation Docket · theme: Sport · enrichment: event photography · design-system: design.md · designed-as-app */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatDateRange,
  formatDistance,
  resolveEventBannerSrc,
} from "@/modules/events/components/event-display";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import { RegistrationStatusRefresh } from "@/modules/registrations/components/registration-status-refresh";
import type { RegistrationSummary } from "@/modules/registrations/registration.types";
import { Icon, type IconName } from "@/shared/ui/icons";

type RegistrationSuccessViewProps = {
  summary: RegistrationSummary;
  registrationCode: string | null;
};

const panelClass =
  "border-t border-[var(--color-landing-rule)] bg-[var(--color-landing-paper)] py-6";

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "neutral";
}) {
  return (
    <span
      className={[
        "inline-flex min-h-8 items-center border px-3 text-xs font-bold uppercase tracking-[0.08em]",
        tone === "success"
          ? "border-success/35 bg-success/10 text-success"
          : tone === "warning"
            ? "border-warning/35 bg-warning/10 text-warning"
            : "border-[var(--color-landing-rule)] bg-[var(--color-landing-white)] text-[var(--color-landing-ink-2)]",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function RegistrationSuccessView({
  summary,
  registrationCode,
}: RegistrationSuccessViewProps) {
  const { event, participant, registration, categories } = summary;
  const bannerSrc = resolveEventBannerSrc(event);
  const categoryLabel = categories.map((category) => category.name).join(", ");
  const categoryDistance = categories
    .map((category) => formatDistance(category.distanceMeters))
    .join(", ");
  const isBibReady = registration.bibStatus === "READY" && Boolean(summary.bibObjectKey);
  const isEmailSent = registration.emailStatus === "SENT";
  const isBackgroundProcessing =
    registration.bibStatus === "PENDING" ||
    registration.bibStatus === "PROCESSING" ||
    registration.emailStatus === "PENDING";

  return (
    <div className="min-h-screen bg-[var(--color-landing-paper)] text-[var(--color-landing-ink)]">
      <RegistrationStatusRefresh active={isBackgroundProcessing} />
      <PublicHeader active="events" />
      <main>
        <div className="app-container py-8 sm:py-12 lg:py-16">
          <section className="relative overflow-hidden border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)]">
            {bannerSrc ? (
              <Image
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                fill
                priority
                sizes="100vw"
                src={bannerSrc}
              />
            ) : null}
            <div className="absolute inset-0 bg-[var(--color-landing-overlay)]" />
            <div className="relative grid min-h-[34rem] gap-8 p-5 text-[var(--color-landing-white)] sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
              <div className="flex min-w-0 flex-col justify-end">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                  Pendaftaran Berhasil
                </p>
                <h1 className="landing-display mt-3 max-w-4xl text-5xl leading-[0.95] text-[var(--color-landing-white)] sm:text-7xl lg:text-8xl">
                  BIB kamu sudah tercatat.
                </h1>
                <div className="mt-5 h-[3px] w-16 bg-[var(--color-landing-orange)]" />
                <p className="mt-6 max-w-2xl text-base leading-7 text-white/80">
                  Terima kasih, <strong>{participant.fullName}</strong>. Pendaftaran untuk{" "}
                  {event.name} telah kami terima.
                </p>
              </div>

              <aside className="self-end border-2 border-[var(--color-landing-white)] bg-[var(--color-landing-paper)] p-5 text-[var(--color-landing-ink)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-teal)] text-[var(--color-landing-ink)]">
                    <Icon className="h-6 w-6" name="check" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                      Nomor BIB
                    </p>
                    <p className="landing-display mt-1 text-5xl leading-none text-[var(--color-landing-ink)]">
                      {registration.bibNumber}
                    </p>
                  </div>
                </div>
                <dl className="mt-5 divide-y divide-[var(--color-landing-rule)] border-y border-[var(--color-landing-rule)] text-sm">
                  <div className="py-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                      Kategori
                    </dt>
                    <dd className="mt-1 font-bold text-[var(--color-landing-ink)]">
                      {categoryLabel}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                      Email
                    </dt>
                    <dd className="mt-1 break-all font-bold text-[var(--color-landing-ink)]">
                      {participant.displayEmail}
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
                      Status
                    </dt>
                    <dd className="mt-2">
                      <StatusPill tone={isEmailSent ? "success" : "warning"}>
                        {isEmailSent ? "Email terkirim" : "Email diproses"}
                      </StatusPill>
                    </dd>
                  </div>
                </dl>
              </aside>
            </div>
          </section>

          <RegistrationProgress emailSent={isEmailSent} />

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <RegistrationSummaryPanel
              category={categoryLabel}
              email={participant.displayEmail}
              eventName={event.name}
              fullName={participant.fullName}
              bibNumber={registration.bibNumber}
              registrationCode={registrationCode}
              runPeriod={formatDateRange(event.activityStartsAt, event.activityEndsAt)}
              uploadPeriod={formatDateRange(event.uploadStartsAt, event.uploadEndsAt)}
            />
            <BibPreviewPanel
              bibNumber={registration.bibNumber}
              category={categoryLabel}
              categoryDistance={categoryDistance}
              eventSlug={event.slug}
              fullName={participant.fullName}
              isReady={isBibReady}
              registrationId={registration.id}
              status={registration.bibStatus}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <EmailConfirmationPanel
              bibNumber={registration.bibNumber}
              category={categoryLabel}
              email={participant.displayEmail}
              emailStatus={registration.emailStatus}
              eventName={event.name}
              fullName={participant.fullName}
            />
            <NextStepsPanel />
          </div>
        </div>
      </main>
      <PublicFooter contactEmail={event.contactEmail} contactPhone={event.contactPhone} />
    </div>
  );
}

function RegistrationProgress({ emailSent }: { emailSent: boolean }) {
  const steps = [
    {
      marker: <Icon className="h-5 w-5" name="check" />,
      title: "Daftar Selesai",
      description: "Pendaftaran berhasil",
      complete: true,
    },
    {
      marker: "2",
      title: emailSent ? "Email Terkirim" : "Email Diproses",
      description: emailSent ? "Konfirmasi telah dikirim" : "Konfirmasi sedang disiapkan",
      complete: emailSent,
    },
    {
      marker: "3",
      title: "Siap Upload Hasil",
      description: "Ikuti instruksi email",
      complete: false,
    },
  ];

  return (
    <section
      aria-label="Status pendaftaran"
      className={`${panelClass} mt-8 grid gap-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center`}
    >
      {steps.map((step, index) => (
        <div className="contents" key={step.title}>
          <div className="flex items-center gap-3">
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center border-2 text-sm font-bold",
                step.complete
                  ? "border-[var(--color-landing-ink)] bg-[var(--color-landing-teal)] text-[var(--color-landing-ink)]"
                  : "border-[var(--color-landing-rule)] bg-[var(--color-landing-white)] text-[var(--color-landing-ink)]",
              ].join(" ")}
            >
              {step.marker}
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--color-landing-ink)]">{step.title}</p>
              <p className="mt-1 text-xs text-[var(--color-landing-ink-2)]">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 ? (
            <div className="hidden items-center sm:flex" aria-hidden="true">
              <svg
                className="h-3 w-20 text-[var(--color-landing-rule)]"
                preserveAspectRatio="none"
                viewBox="0 0 100 8"
              >
                <path
                  d="M2 4H88"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray="5 6"
                  strokeWidth="2"
                />
                <path d="m86 1 10 3-10 3" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function RegistrationSummaryPanel({
  category,
  email,
  eventName,
  fullName,
  bibNumber,
  registrationCode,
  runPeriod,
  uploadPeriod,
}: {
  category: string;
  email: string;
  eventName: string;
  fullName: string;
  bibNumber: string;
  registrationCode: string | null;
  runPeriod: string;
  uploadPeriod: string;
}) {
  const items: Array<{ label: string; value: string }> = [
    { label: "Nama Peserta", value: fullName },
    { label: "Email", value: email },
    { label: "Event", value: eventName },
    { label: "Kategori", value: category },
    { label: "Periode lari", value: runPeriod },
    { label: "Periode upload", value: uploadPeriod },
  ];

  return (
    <section className={panelClass}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
          Ringkasan Pendaftaran
        </h2>
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-orange)] text-[var(--color-landing-ink)] sm:inline-flex">
          <Icon className="h-5 w-5" name="clipboard" />
        </span>
      </div>
      <dl className="mt-5 divide-y divide-[var(--color-landing-rule)] border-y border-[var(--color-landing-rule)]">
        <div className="py-4">
          <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
            Nomor BIB
          </dt>
          <dd className="landing-display mt-1 text-5xl leading-none text-[var(--color-landing-ink)]">
            {bibNumber}
          </dd>
        </div>
        {items.map((item) => (
          <div className="py-4" key={item.label}>
            <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink-2)]">
              {item.label}
            </dt>
            <dd className="mt-1 break-words text-sm font-bold text-[var(--color-landing-ink)]">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex gap-3 border border-info/25 bg-info/10 p-4">
        <Icon className="h-5 w-5 shrink-0 text-info" name="info" />
        <div>
          <p className="text-xs font-bold text-[var(--color-landing-ink)]">
            Simpan nomor BIB dengan baik.
          </p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--color-landing-ink-2)]">
            {registrationCode
              ? `Kode akses Anda: ${registrationCode}`
              : "Kode akses telah dikirim melalui email konfirmasi."}
          </p>
        </div>
      </div>
    </section>
  );
}

function BibPreviewPanel({
  bibNumber,
  category,
  categoryDistance,
  eventSlug,
  fullName,
  isReady,
  registrationId,
  status,
}: {
  bibNumber: string;
  category: string;
  categoryDistance: string;
  eventSlug: string;
  fullName: string;
  isReady: boolean;
  registrationId: string;
  status: RegistrationSummary["registration"]["bibStatus"];
}) {
  return (
    <section className={panelClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
            Preview BIB Anda
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-landing-ink-2)]">
            Tunjukkan BIB ini saat upload hasil.
          </p>
        </div>
        <StatusPill tone={isReady ? "success" : status === "FAILED" ? "warning" : "neutral"}>
          {isReady ? "BIB siap" : status === "FAILED" ? "Perlu proses ulang" : "BIB diproses"}
        </StatusPill>
      </div>

      <div className="mt-5 overflow-hidden border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)]">
        {isReady ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`BIB ${bibNumber} milik ${fullName}`}
            className="aspect-[3/2] w-full object-contain"
            src={`/api/participant/bib/download?registrationId=${registrationId}&mode=preview`}
          />
        ) : (
          <div className="aspect-[3/2] min-h-64">
            <div className="flex h-[18%] items-center justify-between bg-[var(--color-landing-ink)] px-5 text-[var(--color-landing-white)]">
              <span className="flex items-center gap-2 text-base font-bold">
                <Icon className="h-6 w-6 text-[var(--color-landing-orange)]" name="runner" />
                Virtual<span className="text-[var(--color-landing-teal)]">Run</span>
              </span>
              <span className="border border-white/35 px-3 py-1 text-sm font-bold">
                {categoryDistance}
              </span>
            </div>
            <div className="flex h-[52%] items-center justify-center px-5 text-center">
              <p className="landing-display break-all text-5xl leading-none text-[var(--color-landing-ink)] sm:text-7xl">
                {bibNumber}
              </p>
            </div>
            <div className="grid h-[30%] grid-cols-2 items-center gap-4 bg-[var(--color-landing-ink)] px-5 text-[var(--color-landing-white)]">
              <div>
                <p className="text-[10px] uppercase text-white/60">Nama Peserta</p>
                <p className="mt-1 truncate text-xs font-bold sm:text-sm">{fullName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/60">Kategori</p>
                <p className="mt-1 truncate text-xs font-bold sm:text-sm">{category}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isReady ? (
        <p className="mt-3 text-xs font-bold leading-5 text-warning">
          {status === "FAILED"
            ? "BIB belum dapat dibuat. Admin akan memproses ulang."
            : "BIB sedang dibuat. Preview akan tersedia setelah proses selesai."}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {isReady ? (
          <a
            className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-orange)] px-3 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
            href={`/api/participant/bib/download?registrationId=${registrationId}`}
          >
            <Icon className="h-4 w-4" name="download" />
            Download BIB
          </a>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 border-2 border-[var(--color-landing-rule)] bg-[var(--color-landing-paper-2)] px-3 text-sm font-bold text-[var(--color-landing-ink-2)]"
          >
            <Icon className="h-4 w-4" name="download" />
            BIB Diproses
          </span>
        )}
        <Link
          className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] px-3 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
          href={`/events/${eventSlug}`}
        >
          <Icon className="h-4 w-4" name="clipboard" />
          Detail Event
        </Link>
        <Link
          className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] px-3 text-sm font-bold text-[var(--color-landing-ink)] transition-colors duration-[var(--dur-short)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-landing-focus)] active:translate-y-px"
          href={`/events/${eventSlug}/participant/submissions`}
        >
          <Icon className="h-4 w-4" name="upload" />
          Upload Nanti
        </Link>
      </div>
    </section>
  );
}

function EmailConfirmationPanel({
  bibNumber,
  category,
  email,
  emailStatus,
  eventName,
  fullName,
}: {
  bibNumber: string;
  category: string;
  email: string;
  emailStatus: RegistrationSummary["registration"]["emailStatus"];
  eventName: string;
  fullName: string;
}) {
  const isSent = emailStatus === "SENT";

  return (
    <section className={panelClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
            {isSent ? "Email Konfirmasi Terkirim" : "Email Konfirmasi Diproses"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-landing-ink-2)]">
            {isSent
              ? `Detail pendaftaran telah dikirim ke ${email}.`
              : "Sistem sedang menyiapkan email konfirmasi Anda."}
          </p>
        </div>
        <StatusPill tone={isSent ? "success" : "warning"}>
          {isSent ? "Terkirim" : "Diproses"}
        </StatusPill>
      </div>

      <div className="mt-5 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] p-5">
        <div className="flex items-center gap-3 border-b border-[var(--color-landing-rule)] pb-4">
          <span className="flex h-9 w-9 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] text-[var(--color-landing-orange)]">
            <Icon className="h-5 w-5" name="runner" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--color-landing-ink)]">VirtualRun Beard</p>
            <p className="truncate text-[10px] text-[var(--color-landing-ink-2)]">
              Konfirmasi untuk {email}
            </p>
          </div>
        </div>
        <div className="pt-5 text-xs leading-6 text-[var(--color-landing-ink)]">
          <h3 className="text-sm font-bold">Konfirmasi Pendaftaran VirtualRun</h3>
          <p className="mt-3">Halo {fullName},</p>
          <p>Terima kasih telah mendaftar di {eventName}.</p>
          <dl className="mt-3 grid grid-cols-[90px_1fr] gap-x-3">
            <dt className="text-[var(--color-landing-ink-2)]">Nomor BIB</dt>
            <dd className="font-bold">{bibNumber}</dd>
            <dt className="text-[var(--color-landing-ink-2)]">Event</dt>
            <dd className="font-bold">{eventName}</dd>
            <dt className="text-[var(--color-landing-ink-2)]">Kategori</dt>
            <dd className="font-bold">{category}</dd>
          </dl>
          <p className="mt-3 font-bold">
            Simpan nomor BIB Anda dan ikuti instruksi event untuk upload hasil.
          </p>
        </div>
      </div>
    </section>
  );
}

function NextStepsPanel() {
  const steps: Array<{
    icon: IconName;
    title: string;
    description: string;
  }> = [
    {
      icon: "mail",
      title: "Cek Email Anda",
      description: "Buka email konfirmasi dan baca informasi penting terkait event.",
    },
    {
      icon: "upload",
      title: "Siapkan Aktivitasmu",
      description: "Lakukan lari sesuai kategori dan periode event yang ditentukan.",
    },
    {
      icon: "clipboard",
      title: "Upload Hasil",
      description: "Kirim bukti aktivitas melalui halaman peserta sesuai instruksi.",
    },
    {
      icon: "medal",
      title: "Tunggu Verifikasi",
      description: "Tim event akan memeriksa hasil dan mengirim status verifikasi.",
    },
  ];

  return (
    <section className={panelClass}>
      <div>
        <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)]">
          Langkah Selanjutnya
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-landing-ink-2)]">
          Ikuti langkah berikut agar hasilmu dapat divalidasi.
        </p>
      </div>
      <ol className="mt-6 grid gap-5">
        {steps.map((step, index) => (
          <li className="relative grid grid-cols-[48px_1fr] gap-4" key={step.title}>
            {index > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-5 left-6 h-5 border-l border-dashed border-[var(--color-landing-rule)]"
              />
            ) : null}
            <span className="flex h-12 w-12 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-white)] text-[var(--color-landing-ink)]">
              <Icon className="h-6 w-6" name={step.icon} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-landing-ink)]">{step.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--color-landing-ink-2)]">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
