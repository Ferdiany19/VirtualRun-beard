import Link from "next/link";
import Script from "next/script";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import { formatDateTimeRange, formatDistance } from "@/modules/events/components/event-display";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
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
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader active="events" />
      <main className="app-container py-8 sm:py-10">{children}</main>
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
  error,
  idempotencyKey,
}: {
  event: EventRecord;
  categories: EventCategoryRecord[];
  action: (formData: FormData) => void;
  error?: string;
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
          {errorMessage(error) ? (
            <div className="mt-5 rounded-app border border-red-200 bg-red-50 p-4 text-sm font-bold text-danger">
              {errorMessage(error)}
            </div>
          ) : null}

          <form action={action} className="mt-8 space-y-8">
            <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
            {canBypass ? (
              <input name="turnstileToken" type="hidden" value="development-bypass" />
            ) : null}

            <section className="border-b border-border pb-8">
              <h2 className="text-xl font-bold text-navy">1. Kategori</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex min-h-16 cursor-pointer gap-3 rounded-app border border-border bg-surface p-4 focus-within:border-primary"
                  >
                    <input
                      className="mt-1 h-5 w-5 accent-primary"
                      name="categoryIds"
                      type="checkbox"
                      value={category.id}
                    />
                    <span>
                      <span className="block font-bold text-navy">{category.name}</span>
                      <span className="small-copy">{formatDistance(category.distanceMeters)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="grid gap-5 border-b border-border pb-8">
              <h2 className="text-xl font-bold text-navy">2. Data peserta</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Nama lengkap
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="fullName"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Email
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="displayEmail"
                    required
                    type="email"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Nomor HP
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="displayPhone"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Gender
                  <select
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="gender"
                  >
                    <option value="">Tidak diisi</option>
                    <option value="MALE">Laki-laki</option>
                    <option value="FEMALE">Perempuan</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Tanggal lahir
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="dateOfBirth"
                    type="date"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Provinsi
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="province"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Kota/kabupaten
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="cityOrRegency"
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Kecamatan
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="district"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Kode pos
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="postalCode"
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-4 border-b border-border pb-8">
              <h2 className="text-xl font-bold text-navy">3. Kontak darurat</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Nama kontak darurat
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="emergencyContactName"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-navy">
                  Nomor kontak darurat
                  <input
                    className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
                    name="emergencyContactPhone"
                  />
                </label>
              </div>
            </section>

            <section className="grid gap-3">
              <h2 className="text-xl font-bold text-navy">4. Persetujuan</h2>
              {[
                ["termsAccepted", "Saya menyetujui syarat dan ketentuan event."],
                [
                  "privacyAccepted",
                  "Saya menyetujui kebijakan privasi dan penggunaan data untuk operasional event.",
                ],
                [
                  "dataStatementAccepted",
                  "Saya menyatakan data yang dikirim benar dan milik saya sendiri.",
                ],
              ].map(([name, label]) => (
                <label
                  key={name}
                  className="flex min-h-11 items-start gap-3 text-sm text-foreground"
                >
                  <input
                    className="mt-1 h-5 w-5 accent-primary"
                    name={name}
                    required
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              ))}
              {!canBypass && siteKey ? (
                <div className="cf-turnstile" data-sitekey={siteKey} />
              ) : null}
              <button className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-app bg-action px-5 py-3 text-sm font-bold text-white hover:bg-action-hover">
                Kirim pendaftaran
                <Icon className="h-4 w-4" name="arrow-right" />
              </button>
            </section>
          </form>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-app border border-border bg-surface p-4">
      <p className="caption-copy font-bold">{label}</p>
      <p className="mt-1 font-bold text-navy">{value}</p>
    </div>
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
  return (
    <PageShell event={event}>
      <section className="max-w-xl">
        <p className="eyebrow">Akses Peserta</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">Buka data pendaftaran</h1>
        <p className="body-copy mt-3">
          Masukkan email dan registration code untuk melihat BIB milik Anda.
        </p>
        {errorMessage(error) ? (
          <div className="mt-5 rounded-app border border-red-200 bg-red-50 p-4 text-sm font-bold text-danger">
            {errorMessage(error)}
          </div>
        ) : null}
        <form action={action} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-navy">
            Email
            <input
              className="min-h-11 rounded-app border border-border px-3 text-foreground focus:border-primary focus:outline-none"
              name="displayEmail"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-navy">
            Registration code
            <input
              className="min-h-11 rounded-app border border-border px-3 uppercase text-foreground focus:border-primary focus:outline-none"
              name="registrationCode"
              required
            />
          </label>
          <button className="inline-flex min-h-12 items-center justify-center rounded-app bg-primary px-5 py-3 text-sm font-bold text-white">
            Buka BIB
          </button>
        </form>
      </section>
    </PageShell>
  );
}

export function ParticipantBibView({ summary }: { summary: RegistrationSummary }) {
  return (
    <PageShell event={summary.event}>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="eyebrow">BIB Peserta</p>
          <h1 className="mt-2 text-3xl font-bold text-navy">{summary.registration.bibNumber}</h1>
          <p className="body-copy mt-3">{summary.participant.fullName}</p>
          <div className="mt-6 overflow-hidden rounded-section border border-border bg-surface">
            {summary.registration.bibStatus === "READY" && summary.bibObjectKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={`BIB ${summary.registration.bibNumber}`}
                className="w-full"
                src={`/api/participant/bib/download?registrationId=${summary.registration.id}&mode=preview`}
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center p-6 text-center text-sm font-bold text-foreground-muted">
                {summary.registration.bibStatus === "FAILED"
                  ? "BIB gagal diproses. Admin dapat menjalankan retry."
                  : "BIB sedang diproses."}
              </div>
            )}
          </div>
        </div>
        <aside className="h-fit rounded-section border border-border bg-surface p-5">
          <h2 className="card-heading">Status</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Info
              label="Kategori"
              value={summary.categories.map((category) => category.name).join(", ")}
            />
            <Info label="Generate BIB" value={summary.registration.bibStatus} />
          </div>
          {summary.registration.bibStatus === "READY" && summary.bibObjectKey ? (
            <a
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-app bg-action px-4 py-2 text-sm font-bold text-white hover:bg-action-hover"
              href={`/api/participant/bib/download?registrationId=${summary.registration.id}`}
            >
              Unduh BIB
            </a>
          ) : null}
        </aside>
      </section>
    </PageShell>
  );
}
