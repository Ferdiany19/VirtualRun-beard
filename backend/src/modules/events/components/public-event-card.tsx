import Image from "next/image";
import Link from "next/link";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import {
  eventStatusLabel,
  formatDateRange,
  formatDistance,
  resolveEventImageSrc,
} from "@/modules/events/components/event-display";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Icon } from "@/shared/ui/icons";

type PublicEventCardProps = {
  event: EventRecord;
  categories: EventCategoryRecord[];
};

export function PublicEventCard({ event, categories }: PublicEventCardProps) {
  const imageSrc = resolveEventImageSrc(event);

  return (
    <article className="group overflow-hidden rounded-app border border-border bg-surface shadow-soft transition-transform hover:-translate-y-0.5 focus-within:-translate-y-0.5">
      <div className="grid gap-0 md:grid-cols-[180px_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted md:aspect-auto md:min-h-full">
          {imageSrc ? (
            <Image
              alt={`Banner ${event.name}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              fill
              sizes="(min-width: 768px) 180px, 100vw"
              src={imageSrc}
            />
          ) : (
            <div className="flex h-full min-h-44 items-center justify-center bg-surface-muted text-sm font-bold text-foreground-muted">
              Virtual Run
            </div>
          )}
        </div>
        <div className="grid gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="success">{eventStatusLabel(event.eventStatus)}</StatusBadge>
            <span className="text-xs font-bold text-foreground-muted">
              {categories.length} kategori
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight text-navy">{event.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-foreground-muted">
              {event.shortDescription}
            </p>
          </div>
          <div className="grid gap-2 text-sm text-foreground-muted">
            <p className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" name="calendar" />
              <span>
                <span className="font-bold text-foreground">Pendaftaran:</span>{" "}
                {formatDateRange(event.registrationStartsAt, event.registrationEndsAt)}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" name="flag" />
              <span>
                <span className="font-bold text-foreground">Aktivitas:</span>{" "}
                {formatDateRange(event.activityStartsAt, event.activityEndsAt)}
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {categories.slice(0, 4).map((category) => (
                <span
                  key={category.id}
                  className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
                >
                  {formatDistance(category.distanceMeters)}
                </span>
              ))}
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-action px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-action-hover"
              href={`/events/${event.slug}`}
            >
              Lihat detail
              <Icon className="h-4 w-4" name="arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
