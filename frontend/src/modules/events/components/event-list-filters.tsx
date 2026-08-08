"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { publicationStatusLabel } from "@/modules/events/components/event-display";
import type { PublicationStatus } from "@/modules/events/event.types";
import { Icon } from "@/shared/ui/icons";

type EventListFiltersProps = {
  initialSearch: string;
  initialPublication: string;
  initialPeriod: string;
  pageSize: number;
  exportHref: string;
  publicationStatuses: readonly PublicationStatus[];
};

function buildHref(input: {
  pathname: string;
  search: string;
  publication: string;
  period: string;
  pageSize: number;
}) {
  const query = new URLSearchParams();
  const trimmedSearch = input.search.trim();

  if (trimmedSearch) query.set("search", trimmedSearch);
  if (input.publication) query.set("publication", input.publication);
  if (input.period) query.set("period", input.period);
  if (input.pageSize !== 10) query.set("pageSize", String(input.pageSize));

  const serialized = query.toString();
  return serialized ? `${input.pathname}?${serialized}` : input.pathname;
}

export function EventListFilters({
  initialSearch,
  initialPublication,
  initialPeriod,
  pageSize,
  exportHref,
  publicationStatuses,
}: EventListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [publication, setPublication] = useState(initialPublication);
  const [period, setPeriod] = useState(initialPeriod);

  const targetHref = useMemo(
    () =>
      buildHref({
        pathname,
        search,
        publication,
        period,
        pageSize,
      }),
    [pageSize, pathname, period, publication, search],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(() => router.replace(targetHref, { scroll: false }));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [router, targetHref]);

  return (
    <section className="rounded-section border border-border bg-surface p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_210px_210px_auto_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          <span className="sr-only">Cari nama event</span>
          <div className="relative">
            <input
              className="form-control pr-10"
              name="search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama event..."
              type="search"
              value={search}
            />
            <span className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center text-navy">
              <Icon className="h-5 w-5" name="search" />
            </span>
          </div>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          Status
          <select
            className="form-select font-normal"
            name="publication"
            onChange={(event) => setPublication(event.target.value)}
            value={publication}
          >
            <option value="">Semua Status</option>
            {publicationStatuses.map((item) => (
              <option key={item} value={item}>
                {publicationStatusLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          Periode Event
          <select
            className="form-select font-normal"
            name="period"
            onChange={(event) => setPeriod(event.target.value)}
            value={period}
          >
            <option value="">Semua Periode</option>
            <option value="UPCOMING">Akan datang</option>
            <option value="ONGOING">Sedang berlangsung</option>
            <option value="PAST">Telah selesai</option>
          </select>
        </label>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-3 py-2 text-sm font-bold text-foreground-muted hover:border-primary hover:text-primary"
          href="/admin/events"
        >
          <Icon className="h-4 w-4" name="x" />
          Reset
        </Link>
        <a
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-primary px-3 py-2 text-sm font-bold text-primary hover:bg-primary/5"
          href={exportHref}
        >
          <Icon className="h-4 w-4" name="download" />
          Excel
        </a>
      </div>
      {isPending ? <span className="sr-only">Memuat filter event</span> : null}
    </section>
  );
}

type PageSizeAutoSelectProps = {
  value: number;
  search?: string;
  publication?: string;
  period?: string;
};

export function PageSizeAutoSelect({
  value,
  search,
  publication,
  period,
}: PageSizeAutoSelectProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      className="h-10 rounded-app border border-border bg-surface px-3 font-bold text-navy"
      id="page-size"
      name="pageSize"
      onChange={(event) => {
        const nextPageSize = Number(event.target.value);
        router.replace(
          buildHref({
            pathname,
            search: search ?? "",
            publication: publication ?? "",
            period: period ?? "",
            pageSize: nextPageSize,
          }),
        );
      }}
      value={value}
    >
      {[5, 10, 20, 50].map((size) => (
        <option key={size} value={size}>
          {size}
        </option>
      ))}
    </select>
  );
}
