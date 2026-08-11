"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import type { EventInput, EventRecord } from "@/modules/events/event.types";
import { Field } from "@/modules/events/components/field";
import { createSlugSuggestion } from "@/modules/events/event.policy";
import {
  formatBusinessDateTime,
  toJakartaDateTimeLocalValue,
} from "@/shared/date/business-timezone";
import { Icon, type IconName } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

type EventFormProps = {
  action: (formData: FormData) => Promise<void>;
  csrfToken: string;
  event?: EventRecord | null;
  bannerSrc?: string | null;
};

function defaultDates(): Pick<
  EventInput,
  | "registrationStartsAt"
  | "registrationEndsAt"
  | "activityStartsAt"
  | "activityEndsAt"
  | "uploadStartsAt"
  | "uploadEndsAt"
> {
  const now = new Date();
  const day = 24 * 60 * 60_000;

  return {
    registrationStartsAt: new Date(now.getTime() + day),
    registrationEndsAt: new Date(now.getTime() + 14 * day),
    activityStartsAt: new Date(now.getTime() + 15 * day),
    activityEndsAt: new Date(now.getTime() + 30 * day),
    uploadStartsAt: new Date(now.getTime() + 15 * day),
    uploadEndsAt: new Date(now.getTime() + 33 * day),
  };
}

function FormSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="scroll-mt-24 border-t border-border py-6 first:border-t-0" id={id}>
      <div className="mb-5 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
        <p className="eyebrow">{eyebrow}</p>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-navy">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-foreground-muted">{description}</p>
          ) : null}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border py-3 first:border-t-0">
      <dt className="caption-copy font-bold">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold text-navy">{value || "-"}</dd>
    </div>
  );
}

function SectionJump({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <a
      className="flex min-h-11 items-center gap-3 border-t border-border px-1 py-2 text-sm font-bold text-navy first:border-t-0 hover:text-primary focus-visible:text-primary"
      href={href}
    >
      <Icon className="h-4 w-4 shrink-0 text-primary" name={icon} />
      <span className="truncate">{label}</span>
    </a>
  );
}

function TimelinePair({
  title,
  startName,
  startLabel,
  startValue,
  endName,
  endLabel,
  endValue,
}: {
  title: string;
  startName: keyof Pick<
    EventInput,
    "registrationStartsAt" | "activityStartsAt" | "uploadStartsAt"
  >;
  startLabel: string;
  startValue: Date;
  endName: keyof Pick<EventInput, "registrationEndsAt" | "activityEndsAt" | "uploadEndsAt">;
  endLabel: string;
  endValue: Date;
}) {
  return (
    <div className="grid gap-4 border-t border-border py-5 first:border-t-0 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <p className="text-sm font-black text-navy">{title}</p>
        <p className="mt-1 text-xs leading-5 text-foreground-muted">Jam memakai WIB.</p>
      </div>
      <Field htmlFor={startName} label={startLabel}>
        <input
          className="form-control"
          defaultValue={toJakartaDateTimeLocalValue(startValue)}
          id={startName}
          name={startName}
          required
          type="datetime-local"
        />
      </Field>
      <Field htmlFor={endName} label={endLabel}>
        <input
          className="form-control"
          defaultValue={toJakartaDateTimeLocalValue(endValue)}
          id={endName}
          name={endName}
          required
          type="datetime-local"
        />
      </Field>
    </div>
  );
}

export function EventForm({ action, csrfToken, event, bannerSrc }: EventFormProps) {
  const dates = defaultDates();
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(event?.slug));
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(event?.brandPrimaryColor ?? "#009a89");
  const [bannerPreview, setBannerPreview] = useState<string | null>(bannerSrc ?? null);

  const onNameChange = (value: string) => {
    setName(value);

    if (!slugManuallyEdited) {
      setSlug(createSlugSuggestion(value));
    }
  };

  const registrationStart = event?.registrationStartsAt ?? dates.registrationStartsAt;
  const registrationEnd = event?.registrationEndsAt ?? dates.registrationEndsAt;
  const activityStart = event?.activityStartsAt ?? dates.activityStartsAt;
  const activityEnd = event?.activityEndsAt ?? dates.activityEndsAt;
  const uploadStart = event?.uploadStartsAt ?? dates.uploadStartsAt;
  const uploadEnd = event?.uploadEndsAt ?? dates.uploadEndsAt;

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <input name="seoTitle" type="hidden" value={event?.seoTitle ?? ""} />
      <input name="seoDescription" type="hidden" value={event?.seoDescription ?? ""} />
      <input
        name="seoIndexEnabled"
        type="hidden"
        value={event?.seoIndexEnabled === false ? "" : "on"}
      />
      <input
        name="publicVisibilityEnabled"
        type="hidden"
        value={event?.publicVisibilityEnabled ? "on" : ""}
      />
      <input
        name="participantBenefitsJson"
        type="hidden"
        value={JSON.stringify(event?.participantBenefits ?? [])}
      />

      <div className="rounded-section border border-border bg-surface px-4 py-2 shadow-soft sm:px-6">
        <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
          <div className="min-w-0">
            <h2 className="mt-2 text-2xl font-black text-navy">Konten, jadwal, dan operasional</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
              Perubahan di halaman ini memengaruhi public page, pendaftaran, upload hasil, dan
              komunikasi peserta. Kategori, BIB, dan sertifikat dikelola dari halaman event detail.
            </p>
          </div>
          {event ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
              href={`/admin/events/${event.id}`}
            >
              Detail event
              <Icon className="h-4 w-4" name="arrow-right" />
            </Link>
          ) : null}
        </div>

        <FormSection
          description="Bagian ini adalah sinyal pertama yang dilihat peserta di halaman public."
          eyebrow="Identitas"
          id="informasi"
          title="Nama, URL, dan narasi event"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field htmlFor="name" label="Nama event">
              <input
                className="form-control"
                id="name"
                name="name"
                onChange={(eventTarget) => onNameChange(eventTarget.target.value)}
                required
                value={name}
              />
            </Field>
            <Field
              description={
                event?.publicationStatus === "PUBLISHED"
                  ? "Mengubah slug event published dapat mengubah URL public."
                  : "Slug disarankan otomatis dari nama event dan dapat diedit."
              }
              htmlFor="slug"
              label="Slug"
            >
              <input
                className="form-control"
                id="slug"
                name="slug"
                onChange={(eventTarget) => {
                  setSlug(eventTarget.target.value);
                  setSlugManuallyEdited(true);
                }}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                required
                value={slug}
              />
            </Field>
            <Field
              description="Ringkasan singkat untuk kartu event, preview, dan bagian pembuka public page."
              htmlFor="shortDescription"
              label="Deskripsi pendek"
            >
              <textarea
                className="form-textarea min-h-28"
                defaultValue={event?.shortDescription}
                id="shortDescription"
                name="shortDescription"
                required
              />
            </Field>
            <Field
              description="Cerita utama event. Tulis jelas tanpa klaim sponsor atau benefit yang belum tersedia."
              htmlFor="fullDescription"
              label="Tentang event"
            >
              <textarea
                className="form-textarea min-h-40"
                defaultValue={event?.fullDescription}
                id="fullDescription"
                name="fullDescription"
                required
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          description="Banner dan warna brand dipakai di public presentation. Warna ini juga membantu membedakan event di katalog."
          eyebrow="Visual"
          id="branding"
          title="Aset dan warna public page"
        >
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
              <div>
                <div className="aspect-[16/5] overflow-hidden rounded-app border border-border bg-surface-muted">
                  {bannerPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Preview banner event"
                      className="h-full w-full object-cover"
                      src={bannerPreview}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-foreground-muted">
                      Banner belum dipilih
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-foreground-muted">
                  Pilih file baru jika ingin mengganti banner. Format JPG/PNG, maksimal 2MB, rasio
                  rekomendasi 16:9.
                </p>
                <input name="bannerObjectKey" type="hidden" value={event?.bannerObjectKey ?? ""} />
                <input
                  name="thumbnailObjectKey"
                  type="hidden"
                  value={event?.thumbnailObjectKey ?? event?.bannerObjectKey ?? ""}
                />
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-app border border-border bg-white px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary">
                Pilih File
                <input
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  name="banner"
                  onChange={(changeEvent) => {
                    const file = changeEvent.target.files?.[0] ?? null;
                    setBannerPreview(file ? URL.createObjectURL(file) : bannerSrc ?? null);
                  }}
                  type="file"
                />
              </label>
            </div>
            <Field htmlFor="brandPrimaryColor" label="Primary color">
              <div className="flex min-h-11 overflow-hidden rounded-app border border-border bg-surface">
                <input
                  className="w-14 border-r border-border"
                  id="brandPrimaryColor"
                  name="brandPrimaryColor"
                  onChange={(eventTarget) => setBrandPrimaryColor(eventTarget.target.value)}
                  type="color"
                  value={brandPrimaryColor}
                />
                <input
                  className="w-full px-3 text-sm"
                  onChange={(eventTarget) => setBrandPrimaryColor(eventTarget.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                  value={brandPrimaryColor}
                />
              </div>
            </Field>
          </div>
        </FormSection>

        <FormSection
          description="Urutan window harus jelas: pendaftaran, aktivitas, lalu upload hasil. Semua jam disimpan dan ditampilkan sebagai WIB."
          eyebrow="Jadwal"
          id="periode"
          title="Timeline operasional"
        >
          <div className="rounded-app border border-border px-4">
            <TimelinePair
              endLabel="Pendaftaran ditutup"
              endName="registrationEndsAt"
              endValue={registrationEnd}
              startLabel="Pendaftaran dibuka"
              startName="registrationStartsAt"
              startValue={registrationStart}
              title="Pendaftaran"
            />
            <TimelinePair
              endLabel="Aktivitas berakhir"
              endName="activityEndsAt"
              endValue={activityEnd}
              startLabel="Aktivitas dimulai"
              startName="activityStartsAt"
              startValue={activityStart}
              title="Aktivitas"
            />
            <TimelinePair
              endLabel="Upload ditutup"
              endName="uploadEndsAt"
              endValue={uploadEnd}
              startLabel="Upload dibuka"
              startName="uploadStartsAt"
              startValue={uploadStart}
              title="Upload hasil"
            />
          </div>
        </FormSection>

        <FormSection
          description="Instruksi muncul di flow peserta. Pisahkan instruksi daftar dan instruksi upload supaya tidak tercampur."
          eyebrow="Instruksi"
          id="instruksi"
          title="Arahan untuk peserta"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Field
              description="Contoh isi: cara memilih kategori, data yang harus benar, dan kapan email/BIB dikirim."
              htmlFor="registrationInstructions"
              label="Instruksi pendaftaran"
            >
              <textarea
                className="form-textarea min-h-36"
                defaultValue={event?.registrationInstructions}
                id="registrationInstructions"
                name="registrationInstructions"
                required
              />
            </Field>
            <Field
              description="Contoh isi: platform yang diterima, toleransi jarak, screenshot, dan batas revisi."
              htmlFor="uploadInstructions"
              label="Instruksi upload"
            >
              <textarea
                className="form-textarea min-h-36"
                defaultValue={event?.uploadInstructions}
                id="uploadInstructions"
                name="uploadInstructions"
                required
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          description="Teks ini menjadi rujukan peserta sebelum mendaftar dan saat validasi hasil."
          eyebrow="Legal"
          id="syarat"
          title="Syarat dan ketentuan"
        >
          <Field htmlFor="termsAndConditions" label="Syarat event">
            <textarea
              className="form-textarea min-h-44"
              defaultValue={event?.termsAndConditions}
              id="termsAndConditions"
              name="termsAndConditions"
              required
            />
          </Field>
        </FormSection>

        <FormSection
          description="FAQ kosong tidak akan ditampilkan di public page."
          eyebrow="Bantuan"
          id="faq"
          title="Pertanyaan umum"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="grid gap-3 border-l-2 border-border bg-surface-muted px-4 py-3"
              >
                <Field htmlFor={`faqQuestion${index}`} label={`FAQ ${index + 1} - Pertanyaan`}>
                  <input
                    className="form-control"
                    defaultValue={event?.faqItems[index]?.question ?? ""}
                    id={`faqQuestion${index}`}
                    name={`faqQuestion${index}`}
                  />
                </Field>
                <Field htmlFor={`faqAnswer${index}`} label={`FAQ ${index + 1} - Jawaban`}>
                  <textarea
                    className="form-textarea min-h-24"
                    defaultValue={event?.faqItems[index]?.answer ?? ""}
                    id={`faqAnswer${index}`}
                    name={`faqAnswer${index}`}
                  />
                </Field>
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection
          description="Kontak ini dipakai di public page dan email operasional."
          eyebrow="Operasional"
          id="kontak"
          title="Kontak dan kapasitas"
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <Field htmlFor="contactEmail" label="Email organizer">
              <input
                className="form-control"
                defaultValue={event?.contactEmail ?? ""}
                id="contactEmail"
                name="contactEmail"
                type="email"
              />
            </Field>
            <Field htmlFor="contactPhone" label="Nomor kontak">
              <input
                className="form-control"
                defaultValue={event?.contactPhone ?? ""}
                id="contactPhone"
                inputMode="tel"
                name="contactPhone"
              />
            </Field>
            <Field htmlFor="contactWhatsapp" label="WhatsApp">
              <input
                className="form-control"
                defaultValue={event?.contactWhatsapp ?? ""}
                id="contactWhatsapp"
                inputMode="tel"
                name="contactWhatsapp"
              />
            </Field>
            <Field htmlFor="maximumParticipants" label="Maksimum peserta">
              <input
                className="form-control"
                defaultValue={event?.maximumParticipants ?? ""}
                id="maximumParticipants"
                min="1"
                name="maximumParticipants"
                type="number"
              />
            </Field>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="flex min-h-14 items-center justify-between gap-3 rounded-app border border-border p-3 text-sm font-bold text-navy">
              Tampilkan Race Pack Digital
              <input
                className="h-5 w-5 accent-primary"
                defaultChecked={event?.racePackEnabled ?? false}
                name="racePackEnabled"
                type="checkbox"
              />
            </label>
            <label className="flex min-h-14 items-center justify-between gap-3 rounded-app border border-border p-3 text-sm font-bold text-navy">
              Tampilkan Kontak Darurat saat pendaftaran
              <input
                className="h-5 w-5 accent-primary"
                defaultChecked={event?.emergencyContactEnabled ?? false}
                name="emergencyContactEnabled"
                type="checkbox"
              />
            </label>
          </div>
        </FormSection>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <p className="eyebrow">Status</p>
          <h2 className="mt-2 text-lg font-black text-navy">
            {event ? "Event saat ini" : "Draft baru"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {event ? (
              <>
                <StatusBadge tone="neutral">{event.eventStatus}</StatusBadge>
                <StatusBadge tone={event.publicationStatus === "PUBLISHED" ? "success" : "warning"}>
                  {event.publicationStatus}
                </StatusBadge>
              </>
            ) : (
              <StatusBadge tone="warning">DRAFT</StatusBadge>
            )}
          </div>
          <dl className="mt-4">
            <SummaryLine label="Nama" value={name} />
            <SummaryLine label="Slug public" value={slug ? `/${slug}` : ""} />
            <SummaryLine
              label="Pendaftaran dibuka"
              value={`${formatBusinessDateTime(registrationStart)} WIB`}
            />
            <SummaryLine
              label="Upload ditutup"
              value={`${formatBusinessDateTime(uploadEnd)} WIB`}
            />
          </dl>
          {event ? (
            <Link
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
              href={`/admin/events/${event.id}/preview`}
            >
              Preview public
            </Link>
          ) : null}
        </section>

        <section className="rounded-section border border-border bg-surface p-5">
          <p className="eyebrow">Navigasi</p>
          <nav aria-label="Section editor event" className="mt-3">
            <SectionJump href="#informasi" icon="document" label="Identitas" />
            <SectionJump href="#branding" icon="image" label="Visual" />
            <SectionJump href="#periode" icon="calendar" label="Timeline" />
            <SectionJump href="#kategori" icon="grid" label="Kategori" />
            <SectionJump href="#instruksi" icon="clipboard" label="Instruksi" />
            <SectionJump href="#syarat" icon="shield" label="Syarat" />
            <SectionJump href="#faq" icon="info" label="FAQ" />
            <SectionJump href="#kontak" icon="phone" label="Kontak" />
          </nav>
        </section>

        <section className="rounded-section border border-border bg-surface p-5">
          <p className="eyebrow">Brand color</p>
          <div
            className="mt-3 h-16 rounded-app border border-border"
            style={{ backgroundColor: brandPrimaryColor }}
          />
          <p className="caption-copy mt-3">
            Warna event tetap dicek kontrasnya oleh presentation component.
          </p>
        </section>

        <div className="sticky bottom-4 rounded-section border border-border bg-surface/95 p-4 shadow-floating backdrop-blur">
          <p className="mb-3 text-xs leading-5 text-foreground-muted">
            Simpan memperbarui data terbaru yang dipakai preview admin dan public page.
          </p>
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app bg-primary px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover">
            <Icon className="h-4 w-4" name="check" />
            Simpan perubahan
          </button>
        </div>
      </aside>
    </form>
  );
}
