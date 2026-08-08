import Image from "next/image";
import Link from "next/link";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import {
  eventStatusLabel,
  formatCategorySummary,
  formatDateRange,
  resolveEventImageSrc,
} from "@/modules/events/components/event-display";
import { Icon } from "@/shared/ui/icons";

type PublicEventCardProps = {
  event: EventRecord;
  categories: EventCategoryRecord[];
  activeRegistrationCount: number;
};

const numberFormatter = new Intl.NumberFormat("id-ID");

export function PublicEventCard({
  event,
  categories,
  activeRegistrationCount,
}: PublicEventCardProps) {
  const imageSrc = resolveEventImageSrc(event);

  return (
    <article className="group grid min-w-0 border-b border-[var(--color-landing-rule)] pb-6">
      <Link
        aria-label={`Lihat detail ${event.name}`}
        className="relative aspect-[4/3] min-w-0 overflow-hidden bg-[var(--color-landing-paper-2)]"
        href={`/events/${event.slug}`}
      >
        {imageSrc ? (
          <Image
            alt={`Banner ${event.name}`}
            className="object-cover transition-transform duration-[var(--dur-long)] ease-[var(--ease-out)] group-hover:scale-[1.02]"
            fill
            sizes="(min-width: 1280px) 31vw, (min-width: 640px) 48vw, calc(100vw - 32px)"
            src={imageSrc}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-[var(--color-landing-ink-2)]">
            Virtual Run
          </div>
        )}
        <span className="absolute left-0 top-0 bg-[var(--color-landing-orange)] px-3 py-2 text-[11px] font-bold uppercase leading-none text-[var(--color-landing-accent-ink)]">
          {formatCategorySummary(categories)}
        </span>
        <span className="absolute bottom-0 right-0 bg-[var(--color-landing-ink)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-landing-white)]">
          {eventStatusLabel(event.eventStatus)}
        </span>
      </Link>

      <div className="pt-5">
        <h2 className="landing-display line-clamp-2 min-h-[3.5rem] text-2xl leading-[1.05] text-[var(--color-landing-ink)] sm:text-3xl">
          {event.name}
        </h2>
        <p className="mt-3 line-clamp-2 min-h-12 max-w-[58ch] text-sm leading-6 text-[var(--color-landing-ink-2)]">
          {event.shortDescription}
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-[var(--color-landing-rule)] py-4 text-xs leading-5 text-[var(--color-landing-ink-2)]">
          <div className="min-w-0">
            <dt className="font-bold text-[var(--color-landing-ink)]">Pendaftaran</dt>
            <dd className="mt-1">
              {formatDateRange(event.registrationStartsAt, event.registrationEndsAt)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="font-bold text-[var(--color-landing-ink)]">Peserta</dt>
            <dd className="mt-1 tabular-nums">
              {activeRegistrationCount > 0
                ? `${numberFormatter.format(activeRegistrationCount)} terdaftar`
                : "Belum ada peserta"}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="text-xs text-[var(--color-landing-ink-2)]">
            {categories.length} kategori
          </span>
          <Link
            className="landing-action inline-flex min-h-11 shrink-0 items-center gap-2 border-b border-[var(--color-landing-ink)] text-xs font-bold text-[var(--color-landing-ink)] hover:border-[var(--color-landing-teal-dark)] hover:text-[var(--color-landing-teal-dark)]"
            href={`/events/${event.slug}`}
          >
            Lihat detail
            <Icon className="h-4 w-4" name="arrow-right" />
          </Link>
        </div>
      </div>
    </article>
  );
}
