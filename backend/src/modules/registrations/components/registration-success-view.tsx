import Link from "next/link";
import { formatDistance, resolveEventBannerSrc } from "@/modules/events/components/event-display";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import { RegistrationStatusRefresh } from "@/modules/registrations/components/registration-status-refresh";
import type { RegistrationSummary } from "@/modules/registrations/registration.types";
import { Icon, type IconName } from "@/shared/ui/icons";

type RegistrationSuccessViewProps = {
  summary: RegistrationSummary;
  registrationCode: string | null;
};

const panelClass = "rounded-section border border-border bg-surface shadow-soft";

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
    <div className="min-h-screen bg-background text-foreground">
      <RegistrationStatusRefresh active={isBackgroundProcessing} />
      <PublicHeader active="events" />
      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[540px] bg-cover bg-[70%_center] bg-no-repeat sm:h-[590px]"
          style={bannerSrc ? { backgroundImage: `url("${bannerSrc}")` } : undefined}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[540px] bg-[linear-gradient(90deg,rgba(247,250,249,0.99)_0%,rgba(247,250,249,0.96)_44%,rgba(247,250,249,0.50)_72%,rgba(247,250,249,0.08)_100%)] sm:h-[590px]"
        />

        <div className="app-container relative z-10 py-10 sm:py-14">
          <section className="max-w-4xl">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-soft sm:h-16 sm:w-16">
                <Icon className="h-8 w-8 sm:h-9 sm:w-9" name="check" />
              </span>
              <h1 className="text-3xl font-bold leading-tight text-navy sm:text-5xl">
                Pendaftaran <span className="text-primary">Berhasil!</span>
              </h1>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-navy sm:text-base">
              Terima kasih, <strong>{participant.fullName}</strong>. Pendaftaran Anda telah kami
              terima.{" "}
              {isEmailSent
                ? "Konfirmasi pendaftaran telah dikirim ke email Anda."
                : "Konfirmasi email sedang disiapkan dan akan segera dikirim."}
            </p>
          </section>

          <RegistrationProgress emailSent={isEmailSent} />

          <div className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <RegistrationSummaryPanel
              category={categoryLabel}
              email={participant.displayEmail}
              eventName={event.name}
              fullName={participant.fullName}
              bibNumber={registration.bibNumber}
              registrationCode={registrationCode}
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
      className={`${panelClass} mt-8 grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:px-7`}
    >
      {steps.map((step, index) => (
        <div className="contents" key={step.title}>
          <div className="flex items-center gap-3">
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                step.complete ? "bg-primary text-white" : "bg-surface-muted text-navy",
              ].join(" ")}
            >
              {step.marker}
            </span>
            <div>
              <p className="text-sm font-bold text-navy">{step.title}</p>
              <p className="mt-1 text-xs text-foreground-muted">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 ? (
            <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
              <span className="w-16 border-t border-dashed border-primary" />
              <Icon className="h-3 w-3 text-primary" name="arrow-right" />
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
}: {
  category: string;
  email: string;
  eventName: string;
  fullName: string;
  bibNumber: string;
  registrationCode: string | null;
}) {
  const items: Array<{ icon: IconName; label: string; value: string }> = [
    { icon: "user", label: "Nama Peserta", value: fullName },
    { icon: "mail", label: "Email", value: email },
    { icon: "calendar", label: "Event", value: eventName },
    { icon: "users", label: "Kategori", value: category },
    { icon: "clipboard", label: "Nomor BIB", value: bibNumber },
  ];

  return (
    <section className={`${panelClass} p-5 sm:p-7`}>
      <div className="flex items-center gap-3 border-b border-border pb-5">
        <Icon className="h-7 w-7 text-primary" name="clipboard" />
        <h2 className="text-lg font-bold text-navy">Ringkasan Pendaftaran</h2>
      </div>
      <dl className="mt-5 grid gap-5">
        {items.map((item) => (
          <div className="grid grid-cols-[28px_1fr] gap-3" key={item.label}>
            <Icon className="mt-1 h-5 w-5 text-primary" name={item.icon} />
            <div>
              <dt className="text-xs text-foreground-muted">{item.label}</dt>
              <dd className="mt-1 break-words text-sm font-bold text-navy">{item.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex gap-3 rounded-app bg-primary/10 p-4">
        <Icon className="h-5 w-5 shrink-0 text-primary" name="info" />
        <div>
          <p className="text-xs font-bold text-navy">Simpan nomor BIB dengan baik.</p>
          <p className="mt-1 text-[11px] leading-5 text-foreground-muted">
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
    <section className={`${panelClass} p-5 sm:p-7`}>
      <div className="flex items-center gap-3">
        <Icon className="h-7 w-7 text-primary" name="clipboard" />
        <div>
          <h2 className="text-lg font-bold text-navy">Preview BIB Anda</h2>
          <p className="mt-1 text-xs text-foreground-muted">Tunjukkan BIB ini saat upload hasil.</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-section border border-border bg-white shadow-soft">
        {isReady ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`BIB ${bibNumber} milik ${fullName}`}
            className="aspect-[3/2] w-full object-contain"
            src={`/api/participant/bib/download?registrationId=${registrationId}&mode=preview`}
          />
        ) : (
          <div className="aspect-[3/2] min-h-64">
            <div className="flex h-[18%] items-center justify-between bg-navy px-5 text-white">
              <span className="flex items-center gap-2 text-base font-bold">
                <Icon className="h-6 w-6 text-primary" name="runner" />
                Virtual<span className="text-primary">Run</span>
              </span>
              <span className="rounded-app bg-primary px-3 py-1 text-sm font-bold">
                {categoryDistance}
              </span>
            </div>
            <div className="flex h-[52%] items-center justify-center px-5 text-center">
              <p className="break-all text-3xl font-bold text-navy sm:text-5xl">{bibNumber}</p>
            </div>
            <div className="grid h-[30%] grid-cols-2 items-center gap-4 bg-navy px-5 text-white">
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
        <p className="mt-3 text-xs font-bold text-warning">
          {status === "FAILED"
            ? "BIB belum dapat dibuat. Admin akan memproses ulang."
            : "BIB sedang dibuat. Preview akan tersedia setelah proses selesai."}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {isReady ? (
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-primary px-3 text-sm font-bold text-white hover:bg-primary-hover"
            href={`/api/participant/bib/download?registrationId=${registrationId}`}
          >
            <Icon className="h-4 w-4" name="download" />
            Download BIB
          </a>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-app bg-surface-muted px-3 text-sm font-bold text-foreground-muted"
          >
            <Icon className="h-4 w-4" name="download" />
            BIB Diproses
          </span>
        )}
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-navy px-3 text-sm font-bold text-navy hover:bg-surface-muted"
          href={`/events/${eventSlug}`}
        >
          <Icon className="h-4 w-4" name="clipboard" />
          Detail Event
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-navy px-3 text-sm font-bold text-navy hover:bg-surface-muted"
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
    <section className={`${panelClass} p-5 sm:p-7`}>
      <div className="flex items-center gap-3">
        <Icon className="h-7 w-7 text-primary" name="mail" />
        <div>
          <h2 className="text-lg font-bold text-navy">
            {isSent ? "Email Konfirmasi Terkirim" : "Email Konfirmasi Diproses"}
          </h2>
          <p className="mt-1 text-xs text-foreground-muted">
            {isSent
              ? `Detail pendaftaran telah dikirim ke ${email}.`
              : "Sistem sedang menyiapkan email konfirmasi Anda."}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-section border border-border bg-white p-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-primary">
            <Icon className="h-5 w-5" name="runner" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-navy">VirtualRun</p>
            <p className="truncate text-[10px] text-foreground-muted">Konfirmasi untuk {email}</p>
          </div>
        </div>
        <div className="pt-5 text-xs leading-6 text-navy">
          <h3 className="text-sm font-bold">Konfirmasi Pendaftaran VirtualRun</h3>
          <p className="mt-3">Halo {fullName},</p>
          <p>Terima kasih telah mendaftar di {eventName}.</p>
          <dl className="mt-3 grid grid-cols-[90px_1fr] gap-x-3">
            <dt className="text-foreground-muted">Nomor BIB</dt>
            <dd className="font-bold">{bibNumber}</dd>
            <dt className="text-foreground-muted">Event</dt>
            <dd className="font-bold">{eventName}</dd>
            <dt className="text-foreground-muted">Kategori</dt>
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
    <section className={`${panelClass} p-5 sm:p-7`}>
      <div className="flex items-center gap-3">
        <Icon className="h-7 w-7 text-primary" name="footsteps" />
        <div>
          <h2 className="text-lg font-bold text-navy">Langkah Selanjutnya</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Ikuti langkah berikut agar hasilmu dapat divalidasi.
          </p>
        </div>
      </div>
      <ol className="mt-6 grid gap-5">
        {steps.map((step) => (
          <li className="grid grid-cols-[48px_1fr] items-center gap-4" key={step.title}>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-navy">
              <Icon className="h-6 w-6" name={step.icon} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-navy">{step.title}</h3>
              <p className="mt-1 text-xs leading-5 text-foreground-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
