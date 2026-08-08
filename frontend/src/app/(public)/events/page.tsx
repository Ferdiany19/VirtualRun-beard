/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Hallmark · genre: editorial · macrostructure: Catalogue · theme: Sport · enrichment: event photography · nav: N6 · footer: Ft1 · design-system: design.md · designed-as-app */
import { PublicEventCard } from "@/modules/events/components/public-event-card";
import { PublicFooter, PublicHeader } from "@/modules/events/components/public-layout";
import { getPublicHomepageData } from "@/modules/events/event.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("id-ID");

export default async function PublicEventsPage() {
  const data = await getPublicHomepageData().catch(() => ({
    events: [],
    totalParticipantCount: 0,
  }));
  const contactEvent = data.events[0]?.event;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader active="events" />
      <main>
        <section className="border-b-[3px] border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)]">
          <div className="app-container grid gap-8 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)] lg:items-end lg:py-20">
            <div className="min-w-0">
              <h1 className="landing-display max-w-[11ch] text-5xl leading-none text-[var(--color-landing-ink)] sm:text-6xl lg:text-7xl">
                Pilih event. Tentukan jarak.
              </h1>
            </div>
            <div className="border-t border-[var(--color-landing-rule)] pt-4 lg:border-t-0 lg:border-l lg:pl-8">
              <p className="max-w-[48ch] text-sm leading-7 text-[var(--color-landing-ink-2)]">
                Buka detail event untuk memeriksa kategori, periode pendaftaran, jadwal lari, dan
                ketentuan sebelum mendaftar.
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-landing-teal-dark)]">
                {numberFormatter.format(data.events.length)} event publik tersedia
              </p>
            </div>
          </div>
        </section>
        <section className="bg-[var(--color-landing-paper)]">
          <div className="app-container py-12 sm:py-16 lg:py-20">
            <div className="flex items-end justify-between gap-4 border-b-[3px] border-[var(--color-landing-ink)] pb-4">
              <h2 className="landing-display text-3xl leading-none text-[var(--color-landing-ink)] sm:text-4xl">
                Semua event
              </h2>
              <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--color-landing-ink-2)]">
                {numberFormatter.format(data.events.length)} hasil
              </span>
            </div>
            {data.events.length === 0 ? (
              <div className="border-b border-[var(--color-landing-rule)] py-12 text-sm leading-7 text-[var(--color-landing-ink-2)]">
                Belum ada event publik yang tersedia. Silakan kembali lagi setelah organizer
                mempublikasikan jadwal berikutnya.
              </div>
            ) : (
              <div className="grid gap-x-5 gap-y-10 pt-8 sm:grid-cols-2 xl:grid-cols-3">
                {data.events.map(({ event, categories, activeRegistrationCount }) => (
                  <PublicEventCard
                    activeRegistrationCount={activeRegistrationCount}
                    categories={categories}
                    event={event}
                    key={event.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <PublicFooter
        contactEmail={contactEvent?.contactEmail}
        contactPhone={contactEvent?.contactPhone}
      />
    </div>
  );
}
