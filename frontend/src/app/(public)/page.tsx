import Image from "next/image";
import Link from "next/link";
import {
  HomepageEventCarousel,
  type HomepageEventCarouselItem,
} from "@/modules/events/components/homepage-event-carousel";
import { HowItWorks } from "@/modules/events/components/how-it-works";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import {
  formatCategorySummary,
  formatDateRange,
  resolveEventBannerSrc,
  resolveEventImageSrc,
} from "@/modules/events/components/event-display";
import {
  getPublicHomepageData,
  type PublicHomepageEventItem,
} from "@/modules/events/event.service";
import { Icon } from "@/shared/ui/icons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("id-ID");

type HomepageTestimonial = {
  participantName: string;
  eventName: string;
  quote: string;
};

const homepageTestimonials: HomepageTestimonial[] = [];

const platformFeatures: Array<{
  title: string;
  description: string;
  illustration: "bib" | "upload" | "validation" | "certificate";
}> = [
  {
    title: "BIB Digital",
    description: "Nomor BIB disiapkan otomatis setelah pendaftaran berhasil.",
    illustration: "bib",
  },
  {
    title: "Upload Hasil",
    description: "Bukti aktivitas dikirim langsung selama periode upload event.",
    illustration: "upload",
  },
  {
    title: "Validasi Hasil",
    description: "Hasil yang masuk diperiksa sebelum dinyatakan disetujui.",
    illustration: "validation",
  },
  {
    title: "E-Sertifikat",
    description: "Sertifikat tersedia untuk kategori yang mengaktifkan fitur ini.",
    illustration: "certificate",
  },
];

async function loadHomepageData() {
  try {
    return await getPublicHomepageData();
  } catch {
    return {
      events: [],
      totalParticipantCount: 0,
    };
  }
}

function HomepageHero({ featuredEvent }: { featuredEvent: PublicHomepageEventItem | undefined }) {
  const imageSrc = featuredEvent ? resolveEventBannerSrc(featuredEvent.event) : null;

  return (
    <section className="relative isolate overflow-hidden border-b-[3px] border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)]">
      {imageSrc && featuredEvent ? (
        <Image
          alt={`Banner ${featuredEvent.event.name}`}
          className="-z-20 object-cover object-[66%_center] lg:object-center"
          fill
          priority
          sizes="100vw"
          src={imageSrc}
          unoptimized={imageSrc.startsWith("/api/")}
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[var(--color-landing-overlay)]"
      />

      <div className="app-container grid min-h-[calc(100svh-5rem)] content-end pb-12 pt-8 sm:pb-14 sm:pt-10 lg:min-h-[calc(100svh-7.5rem)] lg:pb-16 lg:pt-12">
        <div className="min-w-0">
          <h1 className="landing-display landing-marquee-title max-w-[10ch] text-[var(--color-landing-white)]">
            Pilih jarakmu.
            <span className="block text-[var(--color-landing-orange)]">Lari di kotamu.</span>
          </h1>
          <div className="mt-7 flex flex-col gap-2 border-t border-white/40 pt-4 text-xs font-bold uppercase tracking-[0.08em] text-white/80 sm:flex-row sm:items-center sm:justify-between">
            <span>Virtual run · daftar online · upload hasil</span>
            <span className="min-w-0 sm:max-w-[45%] sm:text-right">
              {featuredEvent?.event.name ?? "Event berikutnya sedang disiapkan"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ items }: { items: HomepageTestimonial[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="bg-background pb-8">
      <div className="app-container">
        <div className="rounded-section border border-border bg-surface p-6">
          <h2 className="text-center text-2xl font-bold text-navy">Apa Kata Mereka?</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {items.map((item) => (
              <figure
                className="border border-border p-5"
                key={`${item.participantName}-${item.eventName}`}
              >
                <blockquote className="text-sm leading-6 text-foreground-muted">
                  "{item.quote}"
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="block font-bold text-navy">{item.participantName}</span>
                  <span className="text-xs text-foreground-muted">{item.eventName}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureIllustration({
  name,
}: {
  name: (typeof platformFeatures)[number]["illustration"];
}) {
  if (name === "bib") {
    return (
      <svg
        aria-hidden="true"
        className="mx-auto h-11 w-11 text-current"
        fill="none"
        viewBox="0 0 56 56"
      >
        <path d="m18 7 10 14L38 7" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
        <circle
          cx="28"
          cy="34"
          r="13"
          fill="var(--color-landing-paper-2)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="m23 34 3 3 7-8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (name === "upload") {
    return (
      <svg
        aria-hidden="true"
        className="mx-auto h-11 w-11 text-current"
        fill="none"
        viewBox="0 0 56 56"
      >
        <rect
          x="15"
          y="9"
          width="26"
          height="36"
          rx="4"
          fill="var(--color-landing-paper-2)"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M28 34V19M21 26l7-7 7 7M20 39h16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    );
  }

  if (name === "validation") {
    return (
      <svg
        aria-hidden="true"
        className="mx-auto h-11 w-11 text-current"
        fill="none"
        viewBox="0 0 56 56"
      >
        <path
          d="M28 7 13 13v11c0 10 6 18 15 23 9-5 15-13 15-23V13L28 7Z"
          fill="var(--color-landing-paper-2)"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          d="m21 28 5 5 10-12"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="mx-auto h-11 w-11 text-current"
      fill="none"
      viewBox="0 0 56 56"
    >
      <path
        d="M14 10h22l6 6v30H14V10Z"
        fill="var(--color-landing-paper-2)"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M36 10v8h8M20 27h16M20 35h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="m34 39 4 4 8-10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export default async function PublicHomePage() {
  const data = await loadHomepageData();
  const featuredEvent = data.events[0];
  const eventCarouselItems: HomepageEventCarouselItem[] = data.events.map((item) => ({
    categorySummary: formatCategorySummary(item.categories),
    dateRange: formatDateRange(item.event.activityStartsAt, item.event.activityEndsAt),
    id: item.event.id,
    imageSrc: resolveEventImageSrc(item.event),
    name: item.event.name,
    participantLabel:
      item.activeRegistrationCount > 0
        ? `${numberFormatter.format(item.activeRegistrationCount)} peserta`
        : "Belum ada peserta",
    slug: item.event.slug,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader active="home" />
      <main>
        <HomepageHero featuredEvent={featuredEvent} />

        <section className="bg-[var(--color-landing-paper)] py-16 sm:py-20 lg:py-24">
          <div className="app-container">
            <div>
              <div className="grid gap-6 border-b-[3px] border-[var(--color-landing-ink)] pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <h2 className="landing-display landing-section-title max-w-[9ch] text-[var(--color-landing-ink)]">
                  Event yang tersedia.
                </h2>
                <Link
                  className="landing-action inline-flex min-h-11 items-center gap-2 self-start border-b border-[var(--color-landing-ink)] text-sm font-bold text-[var(--color-landing-ink)] hover:border-[var(--color-landing-teal-dark)] hover:text-[var(--color-landing-teal-dark)] md:self-end"
                  href="/events"
                >
                  Semua event
                  <Icon className="h-4 w-4" name="arrow-right" />
                </Link>
              </div>
              {data.events.length === 0 ? (
                <div className="mt-8 border-b border-[var(--color-landing-rule)] py-10 text-sm text-[var(--color-landing-ink-2)]">
                  Belum ada event publik. Organizer sedang menyiapkan event berikutnya.
                </div>
              ) : (
                <HomepageEventCarousel items={eventCarouselItems} />
              )}
            </div>
          </div>
        </section>

        <HowItWorks />

        <section className="bg-[var(--color-landing-ink)] py-16 text-[var(--color-landing-white)] sm:py-20 lg:py-24">
          <div className="app-container grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-20">
            <div>
              <h2 className="landing-display landing-section-title max-w-[9ch]">
                Satu alur. Semua tercatat.
              </h2>
              <p className="mt-6 max-w-[60ch] text-sm leading-7 text-white/70 sm:text-base">
                Mulai dari pendaftaran sampai hasil lari, setiap tahap berada dalam satu alur yang
                dapat diikuti peserta.
              </p>
            </div>
            <div className="border-t border-white/30">
              {platformFeatures.map((feature) => (
                <div
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-4 border-b border-white/20 py-5 sm:grid-cols-[4.5rem_minmax(0,0.7fr)_minmax(0,1fr)] sm:items-center"
                  key={feature.title}
                >
                  <div className="text-[var(--color-landing-orange)]">
                    <FeatureIllustration name={feature.illustration} />
                  </div>
                  <h3 className="text-sm font-bold leading-5 text-white">{feature.title}</h3>
                  <p className="col-start-2 text-xs leading-5 text-white/60 sm:col-start-auto">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TestimonialsSection items={homepageTestimonials} />

        <section className="border-t-[6px] border-[var(--color-landing-orange)] bg-[var(--color-landing-paper-2)] text-[var(--color-landing-ink)]">
          <div className="app-container">
            <div className="grid gap-8 py-10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:py-12">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="landing-display text-3xl leading-none sm:text-4xl">
                    Siap memilih jarak?
                  </h2>
                  <p className="mt-2 text-sm text-[var(--color-landing-ink-2)]">
                    Lihat jadwal, kategori jarak, dan ketentuan setiap event.
                  </p>
                </div>
              </div>
              <Link
                className="landing-action inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-ink)] px-5 py-2 text-sm font-bold text-[var(--color-landing-white)] hover:bg-transparent hover:text-[var(--color-landing-ink)]"
                href="/events"
              >
                Lihat event
                <Icon className="h-4 w-4" name="arrow-right" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter
        contactEmail={featuredEvent?.event.contactEmail}
        contactPhone={featuredEvent?.event.contactPhone}
      />
    </div>
  );
}
