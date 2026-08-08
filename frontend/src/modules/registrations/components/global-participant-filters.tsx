"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { GlobalParticipantFilterOptions } from "@/modules/registrations/registration.types";
import { Icon } from "@/shared/ui/icons";

type GlobalParticipantFiltersProps = {
  initialSearch: string;
  initialEventId: string;
  initialCategoryId: string;
  initialStatus: string;
  initialDateFrom: string;
  initialDateTo: string;
  pageSize: number;
  filterOptions: GlobalParticipantFilterOptions;
};

type HrefInput = {
  pathname: string;
  search: string;
  eventId: string;
  categoryId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  pageSize: number;
  page?: number;
};

function buildHref(input: HrefInput) {
  const query = new URLSearchParams();
  const trimmedSearch = input.search.trim();

  if (trimmedSearch) query.set("search", trimmedSearch);
  if (input.eventId) query.set("eventId", input.eventId);
  if (input.categoryId) query.set("categoryId", input.categoryId);
  if (input.status) query.set("status", input.status);
  if (input.dateFrom) query.set("dateFrom", input.dateFrom);
  if (input.dateTo) query.set("dateTo", input.dateTo);
  if (input.page && input.page > 1) query.set("page", String(input.page));
  if (input.pageSize !== 10) query.set("pageSize", String(input.pageSize));

  const serialized = query.toString();
  return serialized ? `${input.pathname}?${serialized}` : input.pathname;
}

export function globalParticipantHref(input: HrefInput) {
  return buildHref(input);
}

export function GlobalParticipantFilters({
  initialSearch,
  initialEventId,
  initialCategoryId,
  initialStatus,
  initialDateFrom,
  initialDateTo,
  pageSize,
  filterOptions,
}: GlobalParticipantFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [eventId, setEventId] = useState(initialEventId);
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [status, setStatus] = useState(initialStatus);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const categories = useMemo(
    () =>
      eventId
        ? filterOptions.categories.filter((category) => category.eventId === eventId)
        : filterOptions.categories,
    [eventId, filterOptions.categories],
  );

  const targetHref = useMemo(
    () =>
      buildHref({
        pathname,
        search,
        eventId,
        categoryId,
        status,
        dateFrom,
        dateTo,
        pageSize,
      }),
    [categoryId, dateFrom, dateTo, eventId, pageSize, pathname, search, status],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(() => router.replace(targetHref, { scroll: false }));
    }, 350);

    return () => window.clearTimeout(handle);
  }, [router, targetHref]);

  return (
    <section className="rounded-section border border-border bg-surface p-4 shadow-soft">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.2fr)_180px_180px_180px_180px_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          <span className="sr-only">Cari peserta</span>
          <div className="relative">
            <input
              className="form-control pr-10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, email, atau BIB peserta..."
              type="search"
              value={search}
            />
            <span className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center text-navy">
              <Icon className="h-5 w-5" name="search" />
            </span>
          </div>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          Event
          <select
            className="form-select font-normal"
            onChange={(event) => {
              setEventId(event.target.value);
              setCategoryId("");
            }}
            value={eventId}
          >
            <option value="">Semua Event</option>
            {filterOptions.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          Kategori
          <select
            className="form-select font-normal"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            <option value="">Semua Kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          Status
          <select
            className="form-select font-normal"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">Semua Status</option>
            <option value="VERIFIED">Verifikasi</option>
            <option value="PENDING_UPLOAD">Belum Upload</option>
            <option value="ACTIVE">Aktif</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-navy">
          Tanggal Daftar
          <div className="grid grid-cols-2 gap-2">
            <input
              className="form-control px-2 text-xs"
              onChange={(event) => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
            <input
              className="form-control px-2 text-xs"
              onChange={(event) => setDateTo(event.target.value)}
              type="date"
              value={dateTo}
            />
          </div>
        </label>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border border-border px-3 py-2 text-sm font-bold text-foreground-muted hover:border-primary hover:text-primary"
            href="/admin/participants"
          >
            <Icon className="h-4 w-4" name="x" />
            Reset Filter
          </Link>
          <button
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-app border border-border px-3 py-2 text-sm font-bold text-foreground-muted opacity-70"
            disabled
            title="Export peserta global belum tersedia"
            type="button"
          >
            <Icon className="h-4 w-4" name="download" />
            Export Excel
          </button>
        </div>
      </div>
      {isPending ? <span className="sr-only">Memuat filter peserta</span> : null}
    </section>
  );
}

export function GlobalParticipantPageSizeSelect({
  value,
  filters,
}: {
  value: number;
  filters: Omit<HrefInput, "pathname" | "pageSize">;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      className="h-10 rounded-app border border-border bg-surface px-3 font-bold text-navy"
      onChange={(event) => {
        router.replace(
          buildHref({
            ...filters,
            pathname,
            pageSize: Number(event.target.value),
          }),
        );
      }}
      value={value}
    >
      {[10, 20, 50, 100].map((size) => (
        <option key={size} value={size}>
          {size}
        </option>
      ))}
    </select>
  );
}
