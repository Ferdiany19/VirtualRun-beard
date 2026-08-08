"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/shared/ui/icons";

type BibTemplateFiltersProps = {
  events: Array<{ id: string; name: string }>;
  initialSearch: string;
  initialEventId: string;
  initialStatus: string;
  initialOrientation: string;
  pageSize: number;
};

function setQuery(input: {
  search: string;
  eventId: string;
  status: string;
  orientation: string;
  pageSize: number;
}) {
  const query = new URLSearchParams();

  if (input.search) query.set("search", input.search);
  if (input.eventId) query.set("eventId", input.eventId);
  if (input.status) query.set("status", input.status);
  if (input.orientation) query.set("orientation", input.orientation);
  if (input.pageSize !== 10) query.set("pageSize", String(input.pageSize));

  const serialized = query.toString();
  return serialized ? `/admin/bib-templates?${serialized}` : "/admin/bib-templates";
}

export function BibTemplateFilters({
  events,
  initialEventId,
  initialOrientation,
  initialSearch,
  initialStatus,
  pageSize,
}: BibTemplateFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function apply(form: HTMLFormElement) {
    const formData = new FormData(form);

    startTransition(() => {
      router.push(
        setQuery({
          search: String(formData.get("search") ?? "").trim(),
          eventId: String(formData.get("eventId") ?? ""),
          status: String(formData.get("status") ?? ""),
          orientation: String(formData.get("orientation") ?? ""),
          pageSize,
        }),
      );
    });
  }

  return (
    <form
      className="rounded-section border border-border bg-surface p-4 shadow-soft"
      onChange={(event) => apply(event.currentTarget)}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
    >
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto] lg:items-end">
        <label className="grid gap-1 text-xs font-bold text-navy">
          <span className="sr-only">Cari template BIB</span>
          <span className="relative">
            <input
              className="min-h-11 w-full rounded-app border border-border bg-background px-4 pr-11 text-sm font-medium text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              defaultValue={initialSearch}
              name="search"
              placeholder="Cari template BIB..."
              type="search"
            />
            <Icon
              className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/60"
              name="search"
            />
          </span>
        </label>
        <label className="grid gap-1 text-xs font-bold text-navy">
          Pilih Event
          <select
            className="min-h-11 rounded-app border border-border bg-background px-3 text-sm font-bold text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            defaultValue={initialEventId}
            name="eventId"
          >
            <option value="">Semua Event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-navy">
          Status
          <select
            className="min-h-11 rounded-app border border-border bg-background px-3 text-sm font-bold text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            defaultValue={initialStatus}
            name="status"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Arsip</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-navy">
          Orientasi
          <select
            className="min-h-11 rounded-app border border-border bg-background px-3 text-sm font-bold text-navy outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            defaultValue={initialOrientation}
            name="orientation"
          >
            <option value="">Semua Orientasi</option>
            <option value="LANDSCAPE">Landscape</option>
            <option value="PORTRAIT">Portrait</option>
          </select>
        </label>
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-4 text-sm font-bold text-navy hover:border-primary hover:text-primary"
          href="/admin/bib-templates"
        >
          <Icon className="h-4 w-4" name="x" />
          Reset Filter
        </a>
        <button className="sr-only" disabled={isPending} type="submit">
          Terapkan
        </button>
      </div>
    </form>
  );
}
