"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Icon } from "@/shared/ui/icons";

export type HomepageEventCarouselItem = {
  id: string;
  slug: string;
  name: string;
  imageSrc: string | null;
  categorySummary: string;
  dateRange: string;
  participantLabel: string;
};

type HomepageEventCarouselProps = {
  items: HomepageEventCarouselItem[];
};

function EventCard({ item }: { item: HomepageEventCarouselItem }) {
  return (
    <article className="group grid border-b border-[var(--color-landing-rule)] bg-[var(--color-landing-paper)] pb-6">
      <Link
        className="relative aspect-[4/3] overflow-hidden bg-[var(--color-landing-paper-2)]"
        href={`/events/${item.slug}`}
      >
        {item.imageSrc ? (
          <Image
            alt={`Banner ${item.name}`}
            className="object-cover transition-transform duration-[var(--dur-long)] ease-[var(--ease-out)] group-hover:scale-[1.02]"
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 88vw"
            src={item.imageSrc}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-foreground-muted">
            Virtual Run
          </div>
        )}
        <span className="absolute left-0 top-0 bg-[var(--color-landing-orange)] px-3 py-2 text-[11px] font-bold uppercase leading-none text-[var(--color-landing-accent-ink)]">
          {item.categorySummary}
        </span>
      </Link>
      <div className="pt-5">
        <h3 className="landing-display line-clamp-2 min-h-[3.5rem] text-2xl leading-[1.05] text-[var(--color-landing-ink)] sm:text-3xl">
          {item.name}
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-landing-rule)] pt-3 text-[11px] leading-5 text-[var(--color-landing-ink-2)]">
          <p>{item.dateRange}</p>
          <p className="text-right">{item.participantLabel}</p>
        </div>
        <div className="mt-5">
          <Link
            className="landing-action inline-flex min-h-11 items-center gap-2 border-b border-[var(--color-landing-ink)] text-xs font-bold text-[var(--color-landing-ink)] hover:border-[var(--color-landing-teal-dark)] hover:text-[var(--color-landing-teal-dark)]"
            href={`/events/${item.slug}`}
          >
            Lihat detail
            <Icon className="h-4 w-4" name="arrow-right" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HomepageEventCarousel({ items }: HomepageEventCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const showControls = items.length > 3;

  const scrollCards = (direction: "previous" | "next") => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      behavior: "smooth",
      left: direction === "next" ? scroller.clientWidth * 0.9 : -scroller.clientWidth * 0.9,
    });
  };

  return (
    <div className="relative mt-8">
      <div
        className="grid auto-cols-[88%] grid-flow-col gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:auto-cols-[calc((100%_-_1.25rem)/2)] lg:auto-cols-[calc((100%_-_2.5rem)/3)] [&::-webkit-scrollbar]:hidden"
        ref={scrollerRef}
      >
        {items.map((item) => (
          <EventCard item={item} key={item.id} />
        ))}
      </div>
      {showControls ? (
        <div className="mt-6 flex justify-end gap-2">
          <button
            aria-label="Event sebelumnya"
            className="landing-action inline-flex h-11 w-11 items-center justify-center border-2 border-[var(--color-landing-ink)] text-[var(--color-landing-ink)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)]"
            onClick={() => scrollCards("previous")}
            type="button"
          >
            <Icon className="h-5 w-5" name="chevron-left" />
          </button>
          <button
            aria-label="Event berikutnya"
            className="landing-action inline-flex h-11 w-11 items-center justify-center border-2 border-[var(--color-landing-ink)] text-[var(--color-landing-ink)] hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)]"
            onClick={() => scrollCards("next")}
            type="button"
          >
            <Icon className="h-5 w-5" name="chevron-right" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
