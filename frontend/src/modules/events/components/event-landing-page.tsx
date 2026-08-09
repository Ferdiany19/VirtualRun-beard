/* Hallmark · pre-emit critique: P5 H5 E4 S5 R4 V5 */
/* Hallmark · genre: editorial · macrostructure: Photographic · theme: Sport · enrichment: event photography · nav: N6 · footer: Ft1 · design-system: design.md · designed-as-app */
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
import { DatePickerInput } from "@/shared/ui/date-picker-input";
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
      className={`border-t border-[var(--color-landing-rule)] py-8 sm:py-10 ${className}`}
      id={id}
    >
      <h2 className="landing-display relative z-10 flex items-center gap-3 text-2xl leading-none text-[var(--color-landing-ink)] sm:text-3xl">
        <Icon className="h-6 w-6 shrink-0 text-[var(--color-landing-orange)]" name={icon} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
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
    <aside className="lg:sticky lg:top-[8.5rem]" id="form-pendaftaran">
      {siteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" /> : null}
      <div className="border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)]">
        <div className="bg-[var(--color-landing-ink)] px-5 py-4 text-[var(--color-landing-white)] sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-white/60">
            Pendaftaran peserta
          </p>
          <h2 className="landing-display mt-1 text-3xl leading-none">Pilih jarakmu.</h2>
        </div>
        <div className="p-5 sm:p-6">
          {isRegistered ? (
            <div className="mb-4 border border-success/30 bg-success/10 p-4 text-sm leading-6 text-success">
              <p className="font-bold">Pendaftaran berhasil.</p>
              <Link
                className="landing-action mt-2 inline-flex min-h-11 items-center font-bold text-primary"
                href={`/events/${event.slug}/participant/bib`}
              >
                Lihat BIB peserta
              </Link>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="mb-4 border border-danger/30 bg-danger/10 p-4 text-sm font-bold leading-6 text-danger">
              {errorMessage}
            </div>
          ) : null}
          {!isRegistered && registrationAvailable && action && idempotencyKey ? (
            <form action={action} className="grid gap-4">
              <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
              {canBypass ? (
                <input name="turnstileToken" type="hidden" value="development-bypass" />
              ) : null}

              <CompactField label="Nama Lengkap">
                <input
                  className="form-control min-h-11 text-sm"
                  name="fullName"
                  placeholder="Contoh: Budi Santoso"
                  required
                />
              </CompactField>
              <CompactField label="Email">
                <input
                  className="form-control min-h-11 text-sm"
                  name="displayEmail"
                  placeholder="Contoh: budi@email.com"
                  required
                  type="email"
                />
              </CompactField>
              <CompactField label="No. WhatsApp">
                <input
                  className="form-control min-h-11 text-sm"
                  name="displayPhone"
                  placeholder="Contoh: 081234567890"
                  required
                  type="tel"
                />
              </CompactField>

              <fieldset>
                <legend className="text-xs font-bold leading-5 text-[var(--color-landing-ink)]">
                  Jenis Kelamin
                </legend>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--color-landing-ink-2)]">
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      className="h-4 w-4 accent-primary"
                      name="gender"
                      type="radio"
                      value="MALE"
                    />
                    Laki-laki
                  </label>
                  <label className="flex min-h-11 items-center gap-2">
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
                <DatePickerInput name="dateOfBirth" />
              </CompactField>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <CompactField label="Provinsi">
                  <input
                    className="form-control min-h-11 text-sm"
                    name="province"
                    placeholder="Contoh: DKI Jakarta"
                    required
                  />
                </CompactField>
                <CompactField label="Kota">
                  <input
                    className="form-control min-h-11 text-sm"
                    name="cityOrRegency"
                    placeholder="Contoh: Jakarta"
                    required
                  />
                </CompactField>
              </div>

              <CompactField label="Pilih Kategori / Jarak">
                <select className="form-select min-h-11 text-sm" name="categoryIds" required>
                  <option value="">Pilih kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} - {formatDistance(category.distanceMeters)}
                    </option>
                  ))}
                </select>
              </CompactField>

              <CompactField label="Ukuran Jersey (Opsional)">
                <select className="form-select min-h-11 text-sm" name="jerseySize">
                  <option value="">Pilih ukuran</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </CompactField>

              {event.emergencyContactEnabled ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <CompactField label="Nama Kontak Darurat">
                    <input
                      className="form-control min-h-11 text-sm"
                      name="emergencyContactName"
                      placeholder="Nama kontak"
                    />
                  </CompactField>
                  <CompactField label="Nomor Kontak">
                    <input
                      className="form-control min-h-11 text-sm"
                      name="emergencyContactPhone"
                      placeholder="08xxxxxxxxxx"
                      type="tel"
                    />
                  </CompactField>
                </div>
              ) : null}

              <div className="mt-1 grid gap-2 border-t border-[var(--color-landing-rule)] pt-4 text-xs leading-5 text-[var(--color-landing-ink-2)]">
                <label className="flex min-h-11 items-start gap-2 py-1">
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
                <label className="flex min-h-11 items-start gap-2 py-1">
                  <input
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    name="privacyAccepted"
                    required
                    type="checkbox"
                  />
                  <span>Saya menyetujui kebijakan privasi dan penggunaan data event.</span>
                </label>
                <label className="flex min-h-11 items-start gap-2 py-1">
                  <input
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                    name="dataStatementAccepted"
                    required
                    type="checkbox"
                  />
                  <span>Saya menyatakan data yang dikirim benar dan milik saya sendiri.</span>
                </label>
              </div>

              {!canBypass && siteKey ? (
                <div className="cf-turnstile" data-sitekey={siteKey} />
              ) : null}
              <button className="landing-action mt-1 inline-flex min-h-12 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] px-5 py-3 text-sm font-bold text-[var(--color-landing-white)] hover:bg-transparent hover:text-[var(--color-landing-ink)]">
                Daftar Sekarang
              </button>
            </form>
          ) : isRegistered ? null : (
            <div className="bg-[var(--color-landing-paper-2)] p-4">
              <p className="text-sm font-bold text-[var(--color-landing-ink)]">
                Pendaftaran belum tersedia
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-landing-ink-2)]">
                Periksa kembali periode pendaftaran atau ketersediaan kuota event ini.
              </p>
              <Link
                className="landing-action mt-4 inline-flex min-h-11 w-full items-center justify-center border border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] px-4 text-sm font-bold text-[var(--color-landing-ink)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)]"
                href={`/events/${event.slug}/participant`}
              >
                Akses Peserta
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="border-x-2 border-b-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper-2)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[var(--color-landing-ink)]">
            Kategori &amp; Harga
          </h2>
          <span className="text-[10px] text-[var(--color-landing-ink-2)]">IDR</span>
        </div>
        <div className="mt-4 grid">
          {categories.map((category) => (
            <div
              className="flex items-center justify-between gap-3 border-t border-[var(--color-landing-rule)] py-3 text-xs"
              key={category.id}
            >
              <span
                className="px-3 py-1 font-bold"
                style={{
                  backgroundColor: event.brandPrimaryColor,
                  color: getAccessibleTextColor(event.brandPrimaryColor),
                }}
              >
                {formatDistance(category.distanceMeters)}
              </span>
              <span className="font-bold tabular-nums text-[var(--color-landing-ink)]">
                {formatPrice(category.priceAmountCents)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function resolveBenefitIcon(key: string, index: number): IconName {
  if (key.includes("bib")) return "shield";
  if (key.includes("certificate")) return "clipboard";
  if (key.includes("upload")) return "upload";
  if (key.includes("medal")) return "check";

  return (["runner", "check", "flag", "shield"] as IconName[])[index % 4] ?? "check";
}

export function EventLandingPage(props: EventLandingPageProps) {
  const { event, categories } = props;
  const imageSrc = resolveEventBannerSrc(event);
  const activeCategories = categories.filter((category) => category.isActive);
  const brandTextColor = getAccessibleTextColor(event.brandPrimaryColor);
  const enabledBenefits = (event.participantBenefits ?? []).filter((benefit) => benefit.enabled);
  const timeline: Array<[string, Date, IconName]> = [
    ["Pendaftaran dibuka", event.registrationStartsAt, "clipboard"],
    ["Mulai berlari", event.activityStartsAt, "runner"],
    ["Upload dibuka", event.uploadStartsAt, "upload"],
    ["Batas upload", event.uploadEndsAt, "flag"],
  ];

  return (
    <div className="min-h-screen bg-[var(--color-landing-paper)] text-[var(--color-landing-ink)]">
      <PublicHeader active="events" />
      <main>
        <section className="relative isolate min-h-[32rem] overflow-hidden border-b-[3px] border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] sm:min-h-[36rem]">
          {imageSrc ? (
            <Image
              alt={`Banner ${event.name}`}
              className="-z-20 object-cover object-center"
              fill
              priority
              sizes="100vw"
              src={imageSrc}
            />
          ) : null}
          <div className="absolute inset-0 -z-10 bg-[var(--color-landing-overlay)]" />
          <div className="app-container flex min-h-[32rem] items-end py-10 sm:min-h-[36rem] sm:py-14 lg:py-16">
            <div className="min-w-0 max-w-4xl text-[var(--color-landing-white)]">
              <div className="flex flex-wrap gap-2">
                {activeCategories.slice(0, 5).map((category) => (
                  <span
                    className="px-3 py-2 text-xs font-bold"
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
              <h1 className="landing-display mt-5 max-w-[13ch] text-5xl leading-none sm:text-6xl lg:text-7xl">
                {event.name}
              </h1>
              <p className="mt-5 max-w-[62ch] text-sm leading-7 text-white/[0.85] sm:text-base">
                {event.shortDescription}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  className="landing-action inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[var(--color-landing-white)] bg-[var(--color-landing-white)] px-5 text-sm font-bold text-[var(--color-landing-ink)] hover:bg-transparent hover:text-[var(--color-landing-white)]"
                  href="#form-pendaftaran"
                >
                  Daftar event
                  <Icon className="h-4 w-4" name="arrow-right" />
                </a>
                <Link
                  className="landing-action inline-flex min-h-12 items-center justify-center border-b border-white/70 px-2 text-sm font-bold text-[var(--color-landing-white)] hover:border-[var(--color-landing-orange)] hover:text-[var(--color-landing-orange)]"
                  href={`/events/${event.slug}/participant`}
                >
                  Akses peserta
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--color-landing-rule)] bg-[var(--color-landing-paper-2)]">
          <dl className="app-container grid sm:grid-cols-2">
            <div className="border-b border-[var(--color-landing-rule)] py-5 sm:border-b-0 sm:border-r sm:pr-6">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-teal-dark)]">
                Periode pendaftaran
              </dt>
              <dd className="mt-2 text-sm font-bold leading-6 tabular-nums">
                {formatDateRange(event.registrationStartsAt, event.registrationEndsAt)}
              </dd>
            </div>
            <div className="py-5 sm:pl-6">
              <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-teal-dark)]">
                Periode lari
              </dt>
              <dd className="mt-2 text-sm font-bold leading-6 tabular-nums">
                {formatDateRange(event.activityStartsAt, event.activityEndsAt)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="app-container grid gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1.55fr)_minmax(21rem,0.75fr)] lg:items-start lg:gap-12 lg:py-16 xl:gap-20">
          <div className="min-w-0">
            <Panel icon="runner" id="tentang" title="Tentang Event">
              <div className="mt-6 max-w-[68ch] space-y-4 text-sm leading-7 text-[var(--color-landing-ink-2)] sm:text-base">
                {paragraphs(event.fullDescription).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </Panel>

            {enabledBenefits.length > 0 ? (
              <Panel icon="check" title="Benefit Peserta">
                <div className="mt-6 border-y border-[var(--color-landing-rule)]">
                  {enabledBenefits.map((benefit, index) => (
                    <div
                      className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 border-b border-[var(--color-landing-rule)] py-4 last:border-b-0 sm:grid-cols-[3rem_minmax(0,0.8fr)_minmax(0,1.2fr)]"
                      key={benefit.key}
                    >
                      <Icon
                        className="h-6 w-6 text-[var(--color-landing-orange)]"
                        name={resolveBenefitIcon(benefit.key, index)}
                      />
                      <h3 className="text-sm font-bold leading-5">{benefit.label}</h3>
                      <p className="col-start-2 text-xs leading-5 text-[var(--color-landing-ink-2)] sm:col-start-auto">
                        {benefit.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            {event.racePackEnabled ? (
              <Panel
                className="relative min-h-[18rem] overflow-hidden bg-[var(--color-landing-paper-2)] px-5 sm:px-8"
                icon="shield"
                title="Race Pack Digital"
              >
                <p className="relative z-10 mt-6 max-w-[45ch] text-sm leading-7 text-[var(--color-landing-ink-2)]">
                  Informasi BIB dan perlengkapan peserta mengikuti benefit yang ditetapkan organizer
                  untuk event ini.
                </p>
                <Image
                  alt="Ilustrasi perlengkapan peserta virtual run"
                  className="object-contain object-right-bottom opacity-90"
                  fill
                  sizes="(min-width: 1024px) 42vw, calc(100vw - 32px)"
                  src="/events/race-pack.png"
                />
              </Panel>
            ) : null}

            <Panel icon="calendar" id="jadwal" title="Timeline Event">
              <ol className="mt-8 grid gap-6 sm:grid-cols-4 sm:gap-0">
                {timeline.map(([label, date, icon], index) => (
                  <li
                    className="relative grid grid-cols-[3rem_minmax(0,1fr)] gap-3 sm:block sm:pr-5"
                    key={label}
                  >
                    {index < timeline.length - 1 ? (
                      <svg
                        aria-hidden="true"
                        className="absolute left-12 top-6 hidden h-2 w-[calc(100%_-_2.5rem)] text-[var(--color-landing-teal-dark)] sm:block"
                        preserveAspectRatio="none"
                        viewBox="0 0 100 8"
                      >
                        <path
                          d="M0 4H100"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="4 6"
                          strokeWidth="1.5"
                        />
                      </svg>
                    ) : null}
                    <span className="relative z-10 inline-flex h-12 w-12 items-center justify-center border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] text-[var(--color-landing-teal-dark)]">
                      <Icon className="h-5 w-5" name={icon} />
                    </span>
                    <div className="sm:mt-4">
                      <p className="text-xs font-bold leading-5">{label}</p>
                      <p className="mt-1 text-xs leading-5 tabular-nums text-[var(--color-landing-ink-2)]">
                        {formatBusinessDate(date)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel icon="clipboard" id="peraturan" title="Peraturan">
              <div className="mt-6 max-w-[68ch] space-y-4 text-sm leading-7 text-[var(--color-landing-ink-2)]">
                {paragraphs(event.termsAndConditions).map((paragraph) => (
                  <p className="border-t border-[var(--color-landing-rule)] pt-4" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </Panel>

            <Panel icon="plus" title="FAQ">
              <div className="mt-6 border-y border-[var(--color-landing-rule)]">
                {event.faqItems.length === 0 ? (
                  <p className="py-5 text-sm text-[var(--color-landing-ink-2)]">
                    FAQ belum ditambahkan oleh organizer.
                  </p>
                ) : (
                  event.faqItems.map((item) => (
                    <details
                      className="group border-b border-[var(--color-landing-rule)] last:border-b-0"
                      key={item.question}
                    >
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-bold">
                        <span>{item.question}</span>
                        <Icon
                          className="h-4 w-4 shrink-0 text-[var(--color-landing-orange)] transition-transform duration-[var(--dur-short)] ease-[var(--ease-in-out)] group-open:rotate-45"
                          name="plus"
                        />
                      </summary>
                      <p className="max-w-[65ch] pb-5 text-sm leading-7 text-[var(--color-landing-ink-2)]">
                        {item.answer}
                      </p>
                    </details>
                  ))
                )}
              </div>
            </Panel>

            <div className="grid border-y border-[var(--color-landing-rule)] sm:grid-cols-2">
              <div className="flex gap-4 border-b border-[var(--color-landing-rule)] py-6 sm:border-b-0 sm:border-r sm:pr-6">
                <Icon className="h-6 w-6 shrink-0 text-[var(--color-landing-orange)]" name="user" />
                <div>
                  <p className="text-sm font-bold">Tanpa akun peserta</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-landing-ink-2)]">
                    Isi formulir pendaftaran dengan data peserta yang benar.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 py-6 sm:pl-6">
                <Icon className="h-6 w-6 shrink-0 text-[var(--color-landing-orange)]" name="mail" />
                <div>
                  <p className="text-sm font-bold">Konfirmasi melalui email</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-landing-ink-2)]">
                    Informasi registrasi dan status BIB dikirim ke email terdaftar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <QuickRegistrationForm {...props} categories={activeCategories} />
        </div>
      </main>
      <PublicFooter contactEmail={event.contactEmail} contactPhone={event.contactPhone} />
    </div>
  );
}
