import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import type { ComponentProps, ReactNode } from "react";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import { getAccessibleTextColor } from "@/modules/events/event.policy";
import {
  formatDateRange,
  formatDistance,
  resolveEventBannerSrc,
} from "@/modules/events/components/event-display";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import { env } from "@/shared/config/env";
import { formatBusinessDate } from "@/shared/date/business-timezone";
import { Icon } from "@/shared/ui/icons";

type EventLandingPageProps = {
  event: EventRecord;
  categories: EventCategoryRecord[];
  action?: (formData: FormData) => void;
  idempotencyKey?: string;
  registrationError?: string;
  registrationErrorMessage?: string;
  registrationAvailable?: boolean;
  registrationSuccess?: string;
};

type IconName = ComponentProps<typeof Icon>["name"];

function paragraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPrice(amountCents: number) {
  if (amountCents <= 0) {
    return "Gratis";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function Panel({
  id,
  title,
  icon,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  icon: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-app border border-border bg-surface px-4 py-4 sm:px-5 ${className}`}
      id={id}
    >
      <h2 className="relative z-10 flex items-center gap-2 text-base font-bold text-navy">
        <Icon className="h-5 w-5 shrink-0 text-primary" name={icon} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[11px] font-bold leading-4 text-navy">
      {label}
      {children}
    </label>
  );
}

function fallbackRegistrationErrorMessage(code?: string): string | null {
  if (!code) {
    return null;
  }

  const messages: Record<string, string> = {
    validation_failed: "Data pendaftaran belum lengkap atau belum sesuai.",
    conflict: "Pendaftaran belum dapat diproses karena data perlu diverifikasi.",
    "rate-limited": "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
    forbidden: "Verifikasi keamanan belum berhasil.",
    failed: "Pendaftaran belum berhasil. Periksa data lalu coba lagi.",
  };

  return messages[code] ?? messages.failed;
}

function QuickRegistrationForm({
  event,
  categories,
  action,
  idempotencyKey,
  registrationError,
  registrationErrorMessage,
  registrationAvailable,
  registrationSuccess,
}: EventLandingPageProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const canBypass = env.TURNSTILE_DEVELOPMENT_BYPASS === "true" && env.NODE_ENV !== "production";
  const errorMessage =
    registrationErrorMessage ?? fallbackRegistrationErrorMessage(registrationError);
  const isRegistered = registrationSuccess === "registered";

  return (
    <aside className="lg:sticky lg:top-[76px]" id="form-pendaftaran">
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" /> : null}
      <div className="rounded-app border border-border bg-surface p-4 shadow-soft sm:p-5">
        <h2 className="text-lg font-bold text-navy">Form Pendaftaran</h2>
        {isRegistered ? (
          <div className="mt-4 rounded-app border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
            <p className="font-bold">Pendaftaran berhasil.</p>
            <Link
              className="mt-2 inline-flex font-bold text-primary"
              href={`/events/${event.slug}/participant/bib`}
            >
              Lihat BIB peserta
            </Link>
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-4 rounded-app border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-danger">
            {errorMessage}
          </div>
        ) : null}
        {!isRegistered && registrationAvailable && action && idempotencyKey ? (
          <form action={action} className="mt-4 grid gap-3">
            <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
            {canBypass ? (
              <input name="turnstileToken" type="hidden" value="development-bypass" />
            ) : null}

            <CompactField label="Nama Lengkap">
              <input
                className="form-control min-h-10 text-xs"
                name="fullName"
                placeholder="Contoh: Budi Santoso"
                required
              />
            </CompactField>
            <CompactField label="Email">
              <input
                className="form-control min-h-10 text-xs"
                name="displayEmail"
                placeholder="Contoh: budi@email.com"
                required
                type="email"
              />
            </CompactField>
            <CompactField label="No. WhatsApp">
              <input
                className="form-control min-h-10 text-xs"
                name="displayPhone"
                placeholder="Contoh: 081234567890"
                required
                type="tel"
              />
            </CompactField>

            <fieldset>
              <legend className="text-[11px] font-bold leading-4 text-navy">Jenis Kelamin</legend>
              <div className="mt-2 flex gap-6 text-[11px] text-foreground-muted">
                <label className="flex min-h-6 items-center gap-2">
                  <input
                    className="h-4 w-4 accent-primary"
                    name="gender"
                    type="radio"
                    value="MALE"
                  />
                  Laki-laki
                </label>
                <label className="flex min-h-6 items-center gap-2">
                  <input
                    className="h-4 w-4 accent-primary"
                    name="gender"
                    type="radio"
                    value="FEMALE"
                  />
                  Perempuan
                </label>
              </div>
            </fieldset>

            <CompactField label="Tanggal Lahir">
              <input className="form-control min-h-10 text-xs" name="dateOfBirth" type="date" />
            </CompactField>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <CompactField label="Provinsi">
                <input
                  className="form-control min-h-10 text-xs"
                  name="province"
                  placeholder="Contoh: DKI Jakarta"
                  required
                />
              </CompactField>
              <CompactField label="Kota">
                <input
                  className="form-control min-h-10 text-xs"
                  name="cityOrRegency"
                  placeholder="Contoh: Jakarta"
                  required
                />
              </CompactField>
            </div>

            <CompactField label="Pilih Kategori / Jarak">
              <select className="form-select min-h-10 text-xs" name="categoryIds" required>
                <option value="">Pilih kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} - {formatDistance(category.distanceMeters)}
                  </option>
                ))}
              </select>
            </CompactField>

            <CompactField label="Ukuran Jersey (Opsional)">
              <select className="form-select min-h-10 text-xs" name="jerseySize">
                <option value="">Pilih ukuran</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </CompactField>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <CompactField label="Nama Kontak Darurat">
                <input
                  className="form-control min-h-10 text-xs"
                  name="emergencyContactName"
                  placeholder="Nama kontak"
                />
              </CompactField>
              <CompactField label="Nomor Kontak">
                <input
                  className="form-control min-h-10 text-xs"
                  name="emergencyContactPhone"
                  placeholder="08xxxxxxxxxx"
                  type="tel"
                />
              </CompactField>
            </div>

            <div className="mt-1 grid gap-2 text-[10px] leading-4 text-foreground-muted">
              <label className="flex items-start gap-2">
                <input
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  name="termsAccepted"
                  required
                  type="checkbox"
                />
                <span>
                  Saya telah membaca dan menyetujui{" "}
                  <a className="font-bold text-primary" href="#peraturan">
                    Peraturan Event
                  </a>
                  .
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  name="privacyAccepted"
                  required
                  type="checkbox"
                />
                <span>Saya menyetujui kebijakan privasi dan penggunaan data event.</span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  name="dataStatementAccepted"
                  required
                  type="checkbox"
                />
                <span>Saya menyatakan data yang dikirim benar dan milik saya sendiri.</span>
              </label>
            </div>

            {!canBypass && siteKey ? <div className="cf-turnstile" data-sitekey={siteKey} /> : null}
            <button className="mt-1 inline-flex min-h-12 items-center justify-center rounded-app bg-action px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-action-hover">
              Daftar Sekarang
            </button>
          </form>
        ) : isRegistered ? null : (
          <div className="mt-4 rounded-app bg-surface-muted p-4">
            <p className="text-sm font-bold text-navy">Pendaftaran belum tersedia</p>
            <p className="mt-2 text-xs leading-5 text-foreground-muted">
              Periksa kembali periode pendaftaran atau ketersediaan kuota event ini.
            </p>
            <Link
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-app border border-border bg-surface px-4 text-sm font-bold text-navy"
              href={`/events/${event.slug}/participant`}
            >
              Akses Peserta
            </Link>
          </div>
        )}
      </div>

      <section className="mt-3 rounded-app border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-navy">Kategori &amp; Harga</h2>
          <span className="text-[9px] text-foreground-muted">Semua harga dalam IDR</span>
        </div>
        <div className="mt-3 grid gap-2">
          {categories.map((category) => (
            <div className="flex items-center justify-between gap-3 text-[11px]" key={category.id}>
              <span
                className="rounded-md px-3 py-1 font-bold"
                style={{
                  backgroundColor: event.brandPrimaryColor,
                  color: getAccessibleTextColor(event.brandPrimaryColor),
                }}
              >
                {formatDistance(category.distanceMeters)}
              </span>
              <span className="font-bold text-navy">{formatPrice(category.priceAmountCents)}</span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function EventLandingPage(props: EventLandingPageProps) {
  const { event, categories } = props;
  const imageSrc = resolveEventBannerSrc(event);
  const activeCategories = categories.filter((category) => category.isActive);
  const brandTextColor = getAccessibleTextColor(event.brandPrimaryColor);
  const timeline: Array<[string, Date, IconName]> = [
    ["Pendaftaran", event.registrationStartsAt, "clipboard"],
    ["Periode Lari", event.activityStartsAt, "calendar"],
    ["Upload Hasil", event.uploadStartsAt, "upload"],
    ["Pengiriman Race Pack", event.uploadEndsAt, "flag"],
  ];
  const benefitItems: Array<[string, string, IconName]> = [
    ["E-Sertifikat", "Finisher", "clipboard"],
    ["E-BIB", "Personalisasi", "shield"],
    ["Medali", "Finisher", "check"],
    ["Validasi", "Aktivitas", "runner"],
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader active="events" />
      <main className="pb-4">
        <div className="app-container pt-4">
          <section className="relative overflow-hidden rounded-section border border-border bg-navy">
            <div className="relative aspect-[16/8] min-h-[300px] sm:aspect-[16/6] sm:min-h-0 lg:aspect-[3.32/1]">
              {imageSrc ? (
                <Image
                  alt={`Banner ${event.name}`}
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 1280px) 100vw, 1200px"
                  src={imageSrc}
                />
              ) : (
                <div className="absolute inset-0 bg-navy" />
              )}
              <div className="absolute inset-0 bg-navy/45" />
              <div className="absolute inset-y-0 left-0 flex w-full flex-col justify-center p-5 text-white sm:w-[64%] sm:p-8 lg:w-[52%] lg:p-10">
                <h1 className="max-w-lg text-3xl font-bold leading-[1.03] sm:text-4xl lg:text-5xl">
                  {event.name}
                </h1>
                <p className="mt-3 max-w-md text-xs leading-5 text-white/90 sm:text-sm">
                  {event.shortDescription}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeCategories.slice(0, 4).map((category) => (
                    <span
                      className="min-w-16 rounded-md px-3 py-1.5 text-center text-xs font-bold"
                      key={category.id}
                      style={{
                        backgroundColor: event.brandPrimaryColor,
                        color: brandTextColor,
                      }}
                    >
                      {formatDistance(category.distanceMeters)}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid max-w-lg gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-app border border-white/40 bg-navy/55 p-2.5">
                    <Icon className="h-5 w-5 shrink-0" name="calendar" />
                    <div>
                      <p className="text-[9px] text-white/75">Periode Pendaftaran</p>
                      <p className="text-[10px] font-bold">
                        {formatDateRange(event.registrationStartsAt, event.registrationEndsAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-app border border-white/40 bg-navy/55 p-2.5">
                    <Icon className="h-5 w-5 shrink-0" name="flag" />
                    <div>
                      <p className="text-[9px] text-white/75">Periode Lari</p>
                      <p className="text-[10px] font-bold">
                        {formatDateRange(event.activityStartsAt, event.activityEndsAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.58fr)_minmax(320px,1fr)] lg:items-start">
            <div className="grid gap-3">
              <Panel icon="runner" id="tentang" title="Tentang Event">
                <div className="mt-3 space-y-2 text-[11px] leading-5 text-foreground-muted">
                  {paragraphs(event.fullDescription).map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </Panel>

              <Panel icon="check" title="Benefit Peserta">
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {benefitItems.map(([title, description, icon]) => (
                    <div className="flex items-center gap-2" key={title}>
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" name={icon} />
                      </span>
                      <div>
                        <h3 className="text-[10px] font-bold text-navy">{title}</h3>
                        <p className="text-[9px] text-foreground-muted">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {event.racePackEnabled ? (
                <Panel
                  className="relative min-h-[150px] overflow-hidden"
                  icon="shield"
                  title="Race Pack (Digital)"
                >
                  <p className="relative z-10 mt-3 max-w-[44%] text-[10px] leading-4 text-foreground-muted">
                    Semua peserta akan mendapatkan race pack digital yang dikirim melalui email
                    terdaftar setelah registrasi.
                  </p>
                  <Image
                    alt="Jersey, BIB, dan medali finisher"
                    className="object-contain object-right"
                    fill
                    sizes="(max-width: 640px) 65vw, 420px"
                    src="/events/race-pack.png"
                  />
                </Panel>
              ) : null}

              <Panel icon="calendar" id="jadwal" title="Timeline Event">
                <ol className="mt-5 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
                  {timeline.map(([label, date, icon], index) => (
                    <li className="relative text-center" key={label}>
                      {index < timeline.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-[62%] top-5 hidden w-[76%] border-t border-dashed border-primary/70 sm:block"
                        />
                      ) : null}
                      <span className="relative z-10 mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary bg-surface text-primary">
                        <Icon className="h-5 w-5" name={icon} />
                      </span>
                      <p className="mt-2 text-[9px] font-bold text-navy">{label}</p>
                      <p className="mt-1 text-[8px] leading-3 text-foreground-muted">
                        {formatBusinessDate(date)}
                      </p>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel icon="clipboard" id="peraturan" title="Peraturan">
                <div className="mt-3 space-y-2 text-[10px] leading-4 text-foreground-muted">
                  {paragraphs(event.termsAndConditions).map((paragraph) => (
                    <p className="border-l-2 border-primary/50 pl-3" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </Panel>

              <Panel icon="plus" title="FAQ">
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-app border border-border">
                  {event.faqItems.length === 0 ? (
                    <p className="p-3 text-[10px] text-foreground-muted">
                      FAQ belum ditambahkan oleh organizer.
                    </p>
                  ) : (
                    event.faqItems.map((item) => (
                      <details className="group px-3 py-2.5" key={item.question}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-bold text-navy">
                          {item.question}
                          <Icon
                            className="h-3.5 w-3.5 shrink-0 text-primary transition-transform group-open:rotate-45"
                            name="plus"
                          />
                        </summary>
                        <p className="mt-2 text-[10px] leading-4 text-foreground-muted">
                          {item.answer}
                        </p>
                      </details>
                    ))
                  )}
                </div>
              </Panel>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-app border border-border bg-surface p-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                    <Icon className="h-4 w-4" name="user" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-navy">Tidak perlu membuat akun</p>
                    <p className="mt-1 text-[9px] text-foreground-muted">
                      Cukup isi formulir pendaftaran.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-app border border-border bg-surface p-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                    <Icon className="h-4 w-4" name="mail" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-navy">BIB dikirim ke email</p>
                    <p className="mt-1 text-[9px] text-foreground-muted">
                      Setelah pendaftaran berhasil.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <QuickRegistrationForm {...props} categories={activeCategories} />
          </div>
        </div>
      </main>
      <PublicFooter contactEmail={event.contactEmail} contactPhone={event.contactPhone} />
    </div>
  );
}
