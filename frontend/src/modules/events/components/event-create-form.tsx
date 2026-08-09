"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";
import type { CreateEventActionState } from "@/app/admin/(protected)/events/actions";
import { createSlugSuggestion } from "@/modules/events/event.policy";
import { FormMessage } from "@/modules/events/components/form-message";
import { Icon } from "@/shared/ui/icons";

type CreateEventAction = (
  previousState: CreateEventActionState,
  formData: FormData,
) => Promise<CreateEventActionState>;

type CategoryDraft = {
  id: string;
  name: string;
  description: string;
  distanceMeters: number;
  priceAmount: number;
  quota: number;
};

type FaqDraft = {
  id: string;
  question: string;
  answer: string;
};

const defaultCategories: CategoryDraft[] = [
  {
    id: "5k",
    name: "5K",
    description: "Lari 5 Kilometer",
    distanceMeters: 5000,
    priceAmount: 75000,
    quota: 1000,
  },
  {
    id: "10k",
    name: "10K",
    description: "Lari 10 Kilometer",
    distanceMeters: 10000,
    priceAmount: 100000,
    quota: 1000,
  },
  {
    id: "21k",
    name: "21K",
    description: "Lari 21 Kilometer",
    distanceMeters: 21000,
    priceAmount: 150000,
    quota: 1000,
  },
];

const defaultFaqs: FaqDraft[] = [
  { id: "faq-1", question: "Bagaimana cara mengikuti event ini?", answer: "" },
  { id: "faq-2", question: "Kapan saya akan menerima medal?", answer: "" },
  { id: "faq-3", question: "Apakah saya bisa mengganti kategori?", answer: "" },
];

const benefitOptions = [
  {
    key: "medal-finisher",
    label: "Medal Finisher",
    description: "Medali dikirim ke peserta",
  },
  {
    key: "e-certificate",
    label: "E-Sertifikat Finisher",
    description: "Sertifikat digital otomatis",
  },
  {
    key: "e-bib",
    label: "E-BIB Digital",
    description: "BIB number otomatis",
  },
  {
    key: "sponsor-voucher",
    label: "Voucher Diskon Sponsor",
    description: "Voucher eksklusif peserta",
  },
];

function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function dateToJakartaIso(value: string, endOfDay = false): string {
  return `${value}T${endOfDay ? "23:59:00" : "00:00:00"}+07:00`;
}

function formatDate(value: string): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {number}
        </span>
        <h2 className="text-base font-bold text-navy">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function inputClass(extra = "") {
  return `min-h-11 rounded-app border border-border bg-white px-3 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 ${extra}`;
}

export function EventCreateForm({
  action,
  csrfToken,
}: {
  action: CreateEventAction;
  csrfToken: string;
}) {
  const [actionState, formAction] = useActionState(action, { error: null });
  const today = useMemo(() => new Date(), []);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("Virtual Run (Digital)");
  const [status, setStatus] = useState("DRAFT");
  const [quota, setQuota] = useState(3000);
  const [registrationStart, setRegistrationStart] = useState(addDays(today, 1));
  const [registrationEnd, setRegistrationEnd] = useState(addDays(today, 61));
  const [activityStart, setActivityStart] = useState(addDays(today, 76));
  const [activityEnd, setActivityEnd] = useState(addDays(today, 107));
  const [uploadStart, setUploadStart] = useState(addDays(today, 77));
  const [uploadEnd, setUploadEnd] = useState(addDays(today, 108));
  const [categories, setCategories] = useState(defaultCategories);
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  const [faqs, setFaqs] = useState(defaultFaqs);
  const [rules, setRules] = useState(
    "Peserta wajib menyelesaikan aktivitas sesuai kategori.\nHasil harus diupload dalam periode yang ditentukan.\nKeputusan panitia bersifat final.",
  );
  const [benefits, setBenefits] = useState<Record<string, boolean>>({
    "medal-finisher": true,
    "e-certificate": true,
    "e-bib": true,
    "sponsor-voucher": false,
  });
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [publicVisible, setPublicVisible] = useState(true);
  const [seoIndex, setSeoIndex] = useState(true);
  const [racePackEnabled, setRacePackEnabled] = useState(false);
  const [emergencyContactEnabled, setEmergencyContactEnabled] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const selectedCategories = categories.filter((category) => category.name.trim().length > 0);
  const categorySummary = selectedCategories.map((category) => category.name).join(" - ");
  const totalQuota = selectedCategories.reduce(
    (total, category) => total + (category.quota || 0),
    0,
  );
  const eventTitle = name.trim() || "Nama Event Baru";
  const eventSlug = slug.trim() || createSlugSuggestion(eventTitle);

  const payload = {
    event: {
      name: eventTitle,
      slug: eventSlug,
      shortDescription:
        description.trim().length >= 20
          ? description.trim().slice(0, 320)
          : "Event virtual run yang dapat diikuti dari lokasi masing-masing peserta.",
      fullDescription:
        description.trim().length >= 40
          ? description.trim()
          : `${description.trim() || "Event virtual run untuk peserta dari berbagai kota."} Lengkapi aktivitas, unggah hasil, dan ikuti proses verifikasi dari panitia.`,
      termsAndConditions: rules,
      registrationInstructions:
        "Pilih kategori, isi data peserta, lalu simpan kode registrasi yang dikirimkan sistem.",
      uploadInstructions:
        "Upload bukti aktivitas sesuai kategori selama periode upload hasil masih dibuka.",
      registrationStartsAt: dateToJakartaIso(registrationStart),
      registrationEndsAt: dateToJakartaIso(registrationEnd, true),
      activityStartsAt: dateToJakartaIso(activityStart),
      activityEndsAt: dateToJakartaIso(activityEnd, true),
      uploadStartsAt: dateToJakartaIso(uploadStart),
      uploadEndsAt: dateToJakartaIso(uploadEnd, true),
      bannerObjectKey: null,
      thumbnailObjectKey: null,
      maximumParticipants: quota || null,
      contactEmail: null,
      contactPhone: null,
      contactWhatsapp: null,
      brandPrimaryColor: "#009a89",
      faqItems: faqs
        .filter((faq) => faq.question.trim().length > 0 && faq.answer.trim().length > 0)
        .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() })),
      seoTitle: seoTitle.trim() || `${eventTitle} - VirtualRun`,
      seoDescription: seoDescription.trim() || description.trim().slice(0, 160) || null,
      seoIndexEnabled: seoIndex,
      publicVisibilityEnabled: publicVisible,
      participantBenefits: benefitOptions.map((benefit) => ({
        ...benefit,
        enabled: Boolean(benefits[benefit.key]),
      })),
      racePackEnabled,
      emergencyContactEnabled,
    },
    categories: selectedCategories.map((category, index) => ({
      name: category.name.trim(),
      slug: createSlugSuggestion(category.name),
      description: category.description.trim() || null,
      distanceMeters: category.distanceMeters,
      distanceToleranceMeters: Math.max(100, Math.round(category.distanceMeters * 0.03)),
      minimumAgeYears: null,
      maximumAgeYears: null,
      genderDivision: "OPEN",
      participantQuota: category.quota || null,
      rankingEnabled: true,
      certificateEnabled: true,
      priceAmountCents: isFreeEvent ? 0 : category.priceAmount,
      displayOrder: index + 1,
    })),
  };

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(createSlugSuggestion(value));
      setSeoTitle(value ? `${value} - VirtualRun` : "");
    }
  };

  const updateCategory = (id: string, patch: Partial<CategoryDraft>) => {
    setCategories((current) =>
      current.map((category) => (category.id === id ? { ...category, ...patch } : category)),
    );
  };

  return (
    <form action={formAction} className="space-y-5">
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <input name="payload" type="hidden" value={JSON.stringify(payload)} />
      <FormMessage error={actionState.error} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          <Section number={1} title="Informasi Event">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold text-navy">
                Nama Event <span className="sr-only">wajib</span>
                <input
                  className={inputClass()}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Contoh: Sunrise Challenge 2026"
                  required
                  value={name}
                />
              </label>
              <label className="grid gap-2 text-xs font-bold text-navy">
                Slug URL
                <div className="flex min-h-11 overflow-hidden rounded-app border border-border bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                  <span className="inline-flex items-center border-r border-border bg-surface-muted px-3 text-xs text-foreground-muted">
                    virtualrun.id/event/
                  </span>
                  <input
                    className="min-w-0 flex-1 px-3 text-sm text-navy outline-none"
                    onChange={(event) => {
                      setSlug(event.target.value);
                      setSlugEdited(true);
                    }}
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    required
                    value={slug}
                  />
                </div>
                <span className="text-[11px] font-medium text-foreground-muted">
                  Gunakan huruf kecil, angka, dan tanda hubung.
                </span>
              </label>
              <label className="grid gap-2 text-xs font-bold text-navy md:col-span-1">
                Deskripsi Event
                <div className="overflow-hidden rounded-app border border-border bg-white">
                  <div className="flex h-9 items-center gap-3 border-b border-border px-3 text-xs font-bold text-navy">
                    <span>B</span>
                    <span>I</span>
                    <span>U</span>
                    <Icon className="h-4 w-4" name="grid" />
                    <Icon className="h-4 w-4" name="document" />
                  </div>
                  <textarea
                    className="min-h-28 w-full resize-y px-3 py-2 text-sm text-navy outline-none"
                    maxLength={2000}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Ceritakan tentang event Anda, tujuan, keunikan, dan manfaat bagi peserta..."
                    required
                    value={description}
                  />
                  <div className="px-3 pb-2 text-right text-[11px] text-foreground-muted">
                    {description.length} / 2000
                  </div>
                </div>
              </label>
              <div className="grid gap-4">
                <label className="grid gap-2 text-xs font-bold text-navy">
                  Lokasi / Format
                  <select
                    className={inputClass()}
                    onChange={(event) => setFormat(event.target.value)}
                    value={format}
                  >
                    <option>Virtual Run (Digital)</option>
                    <option>Hybrid Event</option>
                    <option>Offline Race</option>
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-bold text-navy">
                  Status Awal
                  <select
                    className={inputClass()}
                    onChange={(event) => setStatus(event.target.value)}
                    value={status}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISH">Published setelah submit</option>
                  </select>
                  <span className="text-[11px] font-medium text-foreground-muted">
                    Event dapat disimpan draft atau langsung dipublikasikan.
                  </span>
                </label>
                <label className="grid gap-2 text-xs font-bold text-navy">
                  Kuota Peserta
                  <input
                    className={inputClass("max-w-[180px]")}
                    min="1"
                    onChange={(event) => setQuota(Number(event.target.value))}
                    type="number"
                    value={quota}
                  />
                </label>
              </div>
            </div>
          </Section>

          <Section number={2} title="Jadwal Event">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-xs font-bold text-navy">
                  Pendaftaran dari
                  <input
                    className={inputClass()}
                    onChange={(event) => setRegistrationStart(event.target.value)}
                    required
                    type="date"
                    value={registrationStart}
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold text-navy">
                  s/d
                  <input
                    className={inputClass()}
                    min={registrationStart}
                    onChange={(event) => setRegistrationEnd(event.target.value)}
                    required
                    type="date"
                    value={registrationEnd}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-xs font-bold text-navy">
                  Lari dari
                  <input
                    className={inputClass()}
                    min={registrationEnd}
                    onChange={(event) => setActivityStart(event.target.value)}
                    required
                    type="date"
                    value={activityStart}
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold text-navy">
                  s/d
                  <input
                    className={inputClass()}
                    min={activityStart}
                    onChange={(event) => setActivityEnd(event.target.value)}
                    required
                    type="date"
                    value={activityEnd}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-xs font-bold text-navy">
                  Upload dari
                  <input
                    className={inputClass()}
                    min={activityEnd}
                    onChange={(event) => setUploadStart(event.target.value)}
                    required
                    type="date"
                    value={uploadStart}
                  />
                </label>
                <label className="grid gap-2 text-xs font-bold text-navy">
                  s/d
                  <input
                    className={inputClass()}
                    min={uploadStart}
                    onChange={(event) => setUploadEnd(event.target.value)}
                    required
                    type="date"
                    value={uploadEnd}
                  />
                </label>
              </div>
            </div>
          </Section>

          <Section number={3} title="Kategori & Harga">
            <div className="mb-4 flex flex-col gap-3 rounded-app border border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-navy">Mode Harga Event</p>
                <p className="text-xs text-foreground-muted">
                  Aktifkan Gratis untuk menyimpan semua harga kategori sebagai 0.
                </p>
              </div>
              <label className="inline-flex min-h-11 items-center gap-3 rounded-app border border-border bg-white px-4 text-sm font-bold text-navy">
                <input
                  checked={isFreeEvent}
                  className="h-4 w-4 accent-primary"
                  onChange={(event) => setIsFreeEvent(event.target.checked)}
                  type="checkbox"
                />
                Gratis
              </label>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[720px] space-y-2">
                <div className="grid grid-cols-[42px_90px_1fr_150px_130px_54px] gap-3 px-2 text-xs font-bold text-foreground-muted">
                  <span />
                  <span>Kategori</span>
                  <span>Deskripsi</span>
                  <span>Harga (IDR)</span>
                  <span>Kuota</span>
                  <span>Aksi</span>
                </div>
                {categories.map((category) => (
                  <div
                    className="grid grid-cols-[42px_90px_1fr_150px_130px_54px] gap-3"
                    key={category.id}
                  >
                    <div className="flex items-center justify-center text-foreground-muted">::</div>
                    <input
                      className={inputClass()}
                      onChange={(event) =>
                        updateCategory(category.id, { name: event.target.value })
                      }
                      value={category.name}
                    />
                    <input
                      className={inputClass()}
                      onChange={(event) =>
                        updateCategory(category.id, { description: event.target.value })
                      }
                      value={category.description}
                    />
                    <div className="relative">
                      <input
                        className={inputClass(
                          isFreeEvent
                            ? "w-full bg-surface-muted pr-20 text-foreground-muted"
                            : "w-full",
                        )}
                        disabled={isFreeEvent}
                        min="0"
                        onChange={(event) =>
                          updateCategory(category.id, { priceAmount: Number(event.target.value) })
                        }
                        type="number"
                        value={isFreeEvent ? 0 : category.priceAmount}
                      />
                      {isFreeEvent ? (
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                          GRATIS
                        </span>
                      ) : null}
                    </div>
                    <input
                      className={inputClass()}
                      min="1"
                      onChange={(event) =>
                        updateCategory(category.id, { quota: Number(event.target.value) })
                      }
                      type="number"
                      value={category.quota}
                    />
                    <button
                      aria-label="Hapus kategori"
                      className="inline-flex h-11 items-center justify-center rounded-app text-danger hover:bg-red-50"
                      onClick={() =>
                        setCategories((current) =>
                          current.filter((item) => item.id !== category.id),
                        )
                      }
                      type="button"
                    >
                      <Icon className="h-4 w-4" name="x" />
                    </button>
                  </div>
                ))}
                <button
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border border-dashed border-border text-sm font-bold text-primary hover:bg-primary/5"
                  onClick={() =>
                    setCategories((current) => [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        name: "Fun Run",
                        description: "Kategori baru",
                        distanceMeters: 5000,
                        priceAmount: 0,
                        quota: 100,
                      },
                    ])
                  }
                  type="button"
                >
                  <Icon className="h-4 w-4" name="plus" />
                  Tambah Kategori
                </button>
              </div>
            </div>
          </Section>

          <Section number={4} title="Banner Event">
            <div className="grid gap-4 md:grid-cols-[1fr_150px] md:items-center">
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
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-app border border-border bg-white px-4 text-sm font-bold text-navy hover:border-primary hover:text-primary">
                Pilih File
                <input
                  accept="image/jpeg,image/png"
                  className="sr-only"
                  name="banner"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setBannerPreview(file ? URL.createObjectURL(file) : null);
                  }}
                  type="file"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-foreground-muted">
              Format JPG/PNG, maksimal 2MB, rasio rekomendasi 16:9.
            </p>
          </Section>

          <Section number={5} title="Benefit Peserta">
            <div className="grid gap-3 md:grid-cols-4">
              {benefitOptions.map((benefit) => (
                <label
                  className="flex min-h-14 items-start gap-3 rounded-app border border-border p-3 text-xs text-navy"
                  key={benefit.key}
                >
                  <input
                    checked={Boolean(benefits[benefit.key])}
                    className="mt-1 h-4 w-4 accent-primary"
                    onChange={(event) =>
                      setBenefits((current) => ({
                        ...current,
                        [benefit.key]: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>
                    <span className="block font-bold">{benefit.label}</span>
                    <span className="text-foreground-muted">{benefit.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </Section>

          <Section number={6} title="Peraturan & FAQ">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold text-navy">
                Peraturan Event
                <textarea
                  className="form-textarea min-h-40"
                  onChange={(event) => setRules(event.target.value)}
                  value={rules}
                />
              </label>
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <div className="grid grid-cols-[1fr_44px] gap-2" key={faq.id}>
                    <div className="grid gap-2">
                      <input
                        className={inputClass()}
                        onChange={(event) =>
                          setFaqs((current) =>
                            current.map((item) =>
                              item.id === faq.id ? { ...item, question: event.target.value } : item,
                            ),
                          )
                        }
                        value={faq.question}
                      />
                      <input
                        className={inputClass()}
                        onChange={(event) =>
                          setFaqs((current) =>
                            current.map((item) =>
                              item.id === faq.id ? { ...item, answer: event.target.value } : item,
                            ),
                          )
                        }
                        placeholder="Jawaban FAQ"
                        value={faq.answer}
                      />
                    </div>
                    <button
                      aria-label="Hapus FAQ"
                      className="mt-0 inline-flex h-11 items-center justify-center rounded-app text-danger hover:bg-red-50"
                      onClick={() =>
                        setFaqs((current) => current.filter((item) => item.id !== faq.id))
                      }
                      type="button"
                    >
                      <Icon className="h-4 w-4" name="x" />
                    </button>
                  </div>
                ))}
                <button
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border border-dashed border-border text-sm font-bold text-primary hover:bg-primary/5"
                  onClick={() =>
                    setFaqs((current) => [
                      ...current,
                      { id: crypto.randomUUID(), question: "", answer: "" },
                    ])
                  }
                  type="button"
                >
                  <Icon className="h-4 w-4" name="plus" />
                  Tambah FAQ
                </button>
              </div>
            </div>
          </Section>

          <Section number={7} title="Pengaturan Publikasi">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-xs font-bold text-navy">
                Slug SEO
                <input
                  className={inputClass()}
                  readOnly
                  value={`virtualrun.id/event/${eventSlug}`}
                />
              </label>
              <label className="grid gap-2 text-xs font-bold text-navy">
                Meta Title (SEO)
                <input
                  className={inputClass()}
                  maxLength={80}
                  onChange={(event) => setSeoTitle(event.target.value)}
                  value={seoTitle}
                />
              </label>
              <label className="grid gap-2 text-xs font-bold text-navy">
                Meta Description (SEO)
                <input
                  className={inputClass()}
                  maxLength={180}
                  onChange={(event) => setSeoDescription(event.target.value)}
                  value={seoDescription}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-app border border-border p-3 text-sm font-bold text-navy">
                Tampilkan di Situs Publik
                <input
                  checked={publicVisible}
                  className="h-5 w-5 accent-primary"
                  onChange={(event) => setPublicVisible(event.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="flex items-center justify-between rounded-app border border-border p-3 text-sm font-bold text-navy">
                Index di Mesin Pencari (SEO)
                <input
                  checked={seoIndex}
                  className="h-5 w-5 accent-primary"
                  onChange={(event) => setSeoIndex(event.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="flex items-center justify-between rounded-app border border-border p-3 text-sm font-bold text-navy">
                Tampilkan Race Pack Digital
                <input
                  checked={racePackEnabled}
                  className="h-5 w-5 accent-primary"
                  onChange={(event) => setRacePackEnabled(event.target.checked)}
                  type="checkbox"
                />
              </label>
              <label className="flex items-center justify-between rounded-app border border-border p-3 text-sm font-bold text-navy">
                Tampilkan Kontak Darurat saat pendaftaran
                <input
                  checked={emergencyContactEnabled}
                  className="h-5 w-5 accent-primary"
                  onChange={(event) => setEmergencyContactEnabled(event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
          </Section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-section border border-border bg-surface p-4 shadow-soft">
            <h2 className="text-base font-bold text-navy">Pratinjau Event</h2>
            <div className="mt-4 overflow-hidden rounded-app border border-border bg-surface-muted">
              <div className="aspect-[4/3]">
                {bannerPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" className="h-full w-full object-cover" src={bannerPreview} />
                ) : (
                  <div className="flex h-full items-center justify-center bg-navy text-center text-lg font-black uppercase text-white">
                    {eventTitle}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-3 inline-flex rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                  {categorySummary || "Kategori belum diisi"}
                </div>
                <h3 className="text-lg font-black text-navy">{eventTitle}</h3>
                <div className="mt-4 space-y-3 text-xs text-navy">
                  <p>
                    <span className="font-bold">Periode Pendaftaran</span>
                    <br />
                    {formatDate(registrationStart)} - {formatDate(registrationEnd)}
                  </p>
                  <p>
                    <span className="font-bold">Periode Lari</span>
                    <br />
                    {formatDate(activityStart)} - {formatDate(activityEnd)}
                  </p>
                  <p>
                    <span className="font-bold">Upload Hasil</span>
                    <br />
                    {formatDate(uploadStart)} - {formatDate(uploadEnd)}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {selectedCategories.slice(0, 3).map((category) => (
                    <div
                      className="rounded-app border border-border p-2 text-center"
                      key={category.id}
                    >
                      <p className="font-black text-navy">{category.name}</p>
                      <p className="text-[11px] text-foreground-muted">
                        {isFreeEvent ? "GRATIS" : formatRupiah(category.priceAmount)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-app bg-action px-4 text-sm font-black text-white">
                  Daftar Sekarang
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-section border border-border bg-surface p-4 shadow-soft">
            <h2 className="text-base font-bold text-navy">Ringkasan Cepat</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Status Event</dt>
                <dd className="font-bold text-warning">
                  {status === "PUBLISH" ? "Published" : "Draft"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Lokasi / Format</dt>
                <dd className="font-bold text-navy">{format}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Kuota Total</dt>
                <dd className="font-bold text-navy">{totalQuota || quota}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Tanggal Pendaftaran</dt>
                <dd className="text-right font-bold text-navy">
                  {formatDate(registrationStart)} - {formatDate(registrationEnd)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Periode Lari</dt>
                <dd className="text-right font-bold text-navy">
                  {formatDate(activityStart)} - {formatDate(activityEnd)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-foreground-muted">Upload Hasil</dt>
                <dd className="text-right font-bold text-navy">
                  {formatDate(uploadStart)} - {formatDate(uploadEnd)}
                </dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-section md:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border bg-white px-5 text-sm font-bold text-navy hover:border-primary hover:text-primary"
            href="/admin/events"
          >
            <Icon className="h-4 w-4" name="chevron-left" />
            Kembali
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border bg-white px-5 text-sm font-bold text-navy hover:border-primary hover:text-primary"
              name="mode"
              type="submit"
              value="DRAFT"
            >
              <Icon className="h-4 w-4" name="document" />
              Simpan Draft
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-action px-5 text-sm font-black text-white hover:bg-action-hover"
              name="mode"
              type="submit"
              value="PUBLISH"
            >
              <Icon className="h-4 w-4" name="upload" />
              Publikasikan
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
