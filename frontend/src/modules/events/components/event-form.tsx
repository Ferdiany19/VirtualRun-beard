"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import type { EventInput, EventRecord } from "@/modules/events/event.types";
import { Field } from "@/modules/events/components/field";
import { createSlugSuggestion } from "@/modules/events/event.policy";
import { toJakartaDateTimeLocalValue } from "@/shared/date/business-timezone";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

type EventFormProps = {
  action: (formData: FormData) => Promise<void>;
  csrfToken: string;
  event?: EventRecord | null;
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
  number,
  title,
  description,
  children,
}: {
  id?: string;
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="scroll-mt-24 rounded-section border border-border bg-surface p-5 shadow-soft"
      id={id}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {number}
        </span>
        <div>
          <h2 className="text-lg font-bold text-navy">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-foreground-muted">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function EventForm({ action, csrfToken, event }: EventFormProps) {
  const dates = defaultDates();
  const [name, setName] = useState(event?.name ?? "");
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(event?.slug));
  const [brandPrimaryColor, setBrandPrimaryColor] = useState(event?.brandPrimaryColor ?? "#009a89");

  const onNameChange = (value: string) => {
    setName(value);

    if (!slugManuallyEdited) {
      setSlug(createSlugSuggestion(value));
    }
  };

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
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

      <div className="space-y-6">
        <FormSection
          description="Nama, slug, dan copy utama yang terlihat di public event page."
          id="informasi"
          number={1}
          title="Informasi Event"
        >
          <div className="grid gap-4 md:grid-cols-2">
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
            <Field htmlFor="shortDescription" label="Deskripsi pendek">
              <textarea
                className="form-textarea min-h-28"
                defaultValue={event?.shortDescription}
                id="shortDescription"
                name="shortDescription"
                required
              />
            </Field>
            <Field htmlFor="fullDescription" label="Tentang event">
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
          description="Banner dan warna brand dipakai di public presentation. Upload R2 belum tersedia pada fase ini."
          id="branding"
          number={2}
          title="Branding dan Banner"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_180px]">
            <Field
              description="Gunakan object key lokal/R2 yang sudah tersedia."
              htmlFor="bannerObjectKey"
              label="Banner object key"
            >
              <input
                className="form-control"
                defaultValue={event?.bannerObjectKey ?? ""}
                id="bannerObjectKey"
                name="bannerObjectKey"
                placeholder="/events/example/banner.png"
              />
            </Field>
            <Field htmlFor="thumbnailObjectKey" label="Thumbnail object key">
              <input
                className="form-control"
                defaultValue={event?.thumbnailObjectKey ?? ""}
                id="thumbnailObjectKey"
                name="thumbnailObjectKey"
                placeholder="/events/example/banner.png"
              />
            </Field>
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
          description="Semua tanggal dibaca dan ditampilkan sebagai WIB."
          id="periode"
          number={3}
          title="Periode Event"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              [
                "registrationStartsAt",
                "Pendaftaran dibuka",
                event?.registrationStartsAt ?? dates.registrationStartsAt,
              ],
              [
                "registrationEndsAt",
                "Pendaftaran ditutup",
                event?.registrationEndsAt ?? dates.registrationEndsAt,
              ],
              [
                "activityStartsAt",
                "Aktivitas dimulai",
                event?.activityStartsAt ?? dates.activityStartsAt,
              ],
              [
                "activityEndsAt",
                "Aktivitas berakhir",
                event?.activityEndsAt ?? dates.activityEndsAt,
              ],
              ["uploadStartsAt", "Upload dibuka", event?.uploadStartsAt ?? dates.uploadStartsAt],
              ["uploadEndsAt", "Upload ditutup", event?.uploadEndsAt ?? dates.uploadEndsAt],
            ].map(([nameValue, label, value]) => (
              <Field key={String(nameValue)} htmlFor={String(nameValue)} label={`${label} (WIB)`}>
                <input
                  className="form-control"
                  defaultValue={toJakartaDateTimeLocalValue(value as Date)}
                  id={String(nameValue)}
                  name={String(nameValue)}
                  required
                  type="datetime-local"
                />
              </Field>
            ))}
          </div>
        </FormSection>

        <FormSection
          description="Kategori dikelola sebagai resource terpisah agar publish rule tetap jelas."
          id="kategori"
          number={4}
          title="Category"
        >
          {event ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border bg-surface px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
              href={`/admin/events/${event.id}/categories`}
            >
              Kelola kategori
              <Icon className="h-4 w-4" name="arrow-right" />
            </Link>
          ) : (
            <p className="small-copy">
              Simpan draft event terlebih dahulu, lalu tambahkan minimal satu kategori aktif sebelum
              publish.
            </p>
          )}
        </FormSection>

        <FormSection id="instruksi" number={5} title="Instruksi">
          <div className="grid gap-4 md:grid-cols-2">
            <Field htmlFor="registrationInstructions" label="Instruksi pendaftaran">
              <textarea
                className="form-textarea min-h-36"
                defaultValue={event?.registrationInstructions}
                id="registrationInstructions"
                name="registrationInstructions"
                required
              />
            </Field>
            <Field htmlFor="uploadInstructions" label="Instruksi upload">
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

        <FormSection id="syarat" number={6} title="Syarat dan Ketentuan">
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
          id="faq"
          number={7}
          title="FAQ"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="grid gap-3 rounded-app border border-border bg-surface-muted p-4"
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

        <FormSection id="kontak" number={8} title="Kontak">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        </FormSection>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <p className="eyebrow">Publication</p>
          <h2 className="mt-2 text-lg font-bold text-navy">
            {event ? "Status event" : "Draft baru"}
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
          <div className="mt-4 rounded-app bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Publish hanya berhasil jika event memiliki minimal satu kategori aktif.
          </div>
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
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app bg-primary px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover">
            <Icon className="h-4 w-4" name="check" />
            Simpan draft
          </button>
        </div>
      </aside>
    </form>
  );
}
