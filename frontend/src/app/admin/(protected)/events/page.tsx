import Image from "next/image";
import Link from "next/link";
import { archiveEventAction } from "@/app/admin/(protected)/events/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import {
  eventStatusLabel,
  formatDistance,
  publicationStatusLabel,
  resolveAdminEventImageSrc,
} from "@/modules/events/components/event-display";
import {
  EventListFilters,
  PageSizeAutoSelect,
} from "@/modules/events/components/event-list-filters";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { publicationStatuses } from "@/modules/events/event.schema";
import { getEventManagementPageData } from "@/modules/events/event.service";
import type { ManageableEventListItem, PublicationStatus } from "@/modules/events/event.types";
import { formatBusinessDate } from "@/shared/date/business-timezone";
import { Icon, type IconName } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

type EventsPageProps = {
  searchParams: Promise<{
    search?: string;
    publication?: string;
    period?: string;
    page?: string;
    pageSize?: string;
    error?: string;
    success?: string;
  }>;
};

const periodValues = ["UPCOMING", "ONGOING", "PAST"] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatCompactDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function eventCode(item: ManageableEventListItem): string {
  return `EV-${item.event.createdAt.getFullYear()}-${item.event.id.slice(0, 6).toUpperCase()}`;
}

function categoryLabel(item: ManageableEventListItem): string {
  if (item.categories.length === 0) {
    return "Belum ada kategori";
  }

  return item.categories
    .slice(0, 3)
    .map((category) => formatDistance(category.distanceMeters))
    .join(" · ");
}

function imageAlt(item: ManageableEventListItem): string {
  return `Banner ${item.event.name}`;
}

function EventThumbnail({
  item,
  size = "large",
}: {
  item: ManageableEventListItem;
  size?: "small" | "large";
}) {
  const imageSrc = resolveAdminEventImageSrc(item.event);
  const sizeClass = size === "small" ? "h-12 w-12" : "h-[88px] w-[120px]";

  if (imageSrc) {
    return (
      <Image
        alt={imageAlt(item)}
        className={`${sizeClass} shrink-0 rounded-app object-cover`}
        height={size === "small" ? 48 : 88}
        src={imageSrc}
        width={size === "small" ? 48 : 120}
      />
    );
  }

  return (
    <div
      aria-label={`Banner belum tersedia untuk ${item.event.name}`}
      className={`${sizeClass} flex shrink-0 items-end rounded-app bg-navy p-2 text-[10px] font-bold leading-tight text-white`}
      role="img"
    >
      {item.event.name}
    </div>
  );
}

function DateRange({ start, end }: { start: Date; end: Date }) {
  return (
    <span className="leading-5">
      {formatCompactDate(start)}
      <br />
      <span className="text-foreground-muted">– {formatCompactDate(end)}</span>
    </span>
  );
}

function statusTone(status: PublicationStatus): "neutral" | "success" | "warning" {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "warning";
  return "neutral";
}

function buildPageHref(params: Awaited<EventsPageProps["searchParams"]>, nextPage: number): string {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.publication) query.set("publication", params.publication);
  if (params.period) query.set("period", params.period);
  if (params.pageSize) query.set("pageSize", params.pageSize);
  query.set("page", String(nextPage));
  return `/admin/events?${query.toString()}`;
}

function pageNumbers(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function activityCopy(action: string): string {
  const labels: Record<string, string> = {
    EVENT_CREATED: "membuat event baru",
    EVENT_UPDATED: "memperbarui event",
    EVENT_PUBLISHED: "menerbitkan event",
    EVENT_UNPUBLISHED: "menonaktifkan publikasi event",
    EVENT_ARCHIVED: "mengarsipkan event",
    CATEGORY_CREATED: "menambahkan kategori event",
    CATEGORY_UPDATED: "memperbarui kategori event",
  };

  return labels[action] ?? "melakukan pembaruan event";
}

export default async function AdminEventsPage({ searchParams }: EventsPageProps) {
  const admin = await requireAdminSession();
  const params = await searchParams;

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const publicationStatus = publicationStatuses.find((item) => item === params.publication) ?? null;
  const period = periodValues.find((item) => item === params.period) ?? null;
  const parsedPage = Number(params.page ?? "1");
  const parsedPageSize = Number(params.pageSize ?? "10");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = [5, 10, 20, 50].includes(parsedPageSize) ? parsedPageSize : 10;
  const data = await getEventManagementPageData(admin, {
    search: params.search ?? null,
    eventStatus: null,
    publicationStatus,
    period,
    page,
    pageSize,
  });
  const exportParams = new URLSearchParams();

  if (params.search) exportParams.set("search", params.search);
  if (publicationStatus) exportParams.set("publication", publicationStatus);
  if (period) exportParams.set("period", period);

  const stats: Array<{
    label: string;
    value: number;
    detail: string;
    icon: IconName;
    tone: string;
  }> = [
    {
      label: "Total Event",
      value: data.counts.totalEvents,
      detail: "Event yang dapat Anda kelola",
      icon: "calendar",
      tone: "bg-primary text-white",
    },
    {
      label: "Event Aktif",
      value: data.counts.activeEvents,
      detail: "Terbit dan belum diarsipkan",
      icon: "runner",
      tone: "bg-emerald-600 text-white",
    },
    {
      label: "Draft",
      value: data.counts.draftEvents,
      detail: "Masih perlu disiapkan",
      icon: "document",
      tone: "bg-amber-500 text-white",
    },
    {
      label: "Arsip",
      value: data.counts.archivedEvents,
      detail: "Event yang telah diarsipkan",
      icon: "clipboard",
      tone: "bg-slate-500 text-white",
    },
  ];

  return (
    <div className="space-y-6 pb-4">
      <AdminPageHeader
        actionHref="/admin/events/new"
        actionLabel="Buat Event"
        description="Inventori event virtual run, status publikasi, window operasional, peserta, dan aksi cepat."
        title="Event Virtual Run"
      />

      <FormMessage error={params.error ?? null} success={params.success ?? null} />

      <section
        aria-label="Ringkasan event"
        className="grid gap-3 rounded-section border border-border bg-surface p-3 shadow-soft sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <article
            className="border-t-2 border-navy bg-surface p-4"
            key={stat.label}
          >
            <div className="grid gap-3">
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-app ${stat.tone}`}
              >
                <Icon className="h-5 w-5" name={stat.icon} />
              </span>
              <p className="text-sm font-semibold text-foreground-muted">{stat.label}</p>
              <p className="text-3xl font-black text-navy">{formatNumber(stat.value)}</p>
              <p className="text-[11px] leading-4 text-foreground-muted">{stat.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <EventListFilters
        exportHref={`/api/admin/events/export?${exportParams.toString()}`}
        initialPeriod={params.period ?? ""}
        initialPublication={params.publication ?? ""}
        initialSearch={params.search ?? ""}
        pageSize={data.pageSize}
        publicationStatuses={publicationStatuses}
      />

      <section className="overflow-visible rounded-section border border-border bg-surface">
        <div className="hidden overflow-visible xl:block">
          <table className="w-full min-w-[1110px] border-collapse text-left text-xs">
            <thead>
              <tr className="text-[14px] font-bold text-navy">
                <th className="border-b border-border px-4 py-4">Banner</th>
                <th className="border-b border-border px-3 py-4">Nama Event</th>
                <th className="border-b border-border px-3 py-4">Status</th>
                <th className="border-b border-border px-3 py-4">Periode Pendaftaran</th>
                <th className="border-b border-border px-3 py-4">Periode Lari</th>
                <th className="border-b border-border px-3 py-4">Upload Hasil</th>
                <th className="border-b border-border px-3 py-4">Kategori</th>
                <th className="border-b border-border px-3 py-4 text-right">Pendaftar</th>
                <th className="border-b border-border px-4 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((item) => (
                <tr className="hover:bg-surface-muted/50" key={item.event.id}>
                  <td className="px-2 py-3 pl-3 align-middle">
                    <EventThumbnail item={item} />
                  </td>
                  <td className="max-w-[220px] px-3 py-3 align-middle">
                    <Link
                      className="font-bold text-navy hover:text-primary"
                      href={`/admin/events/${item.event.id}`}
                    >
                      {item.event.name}
                    </Link>
                    <p className="mt-2 inline-flex rounded bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                      {categoryLabel(item)}
                    </p>
                    <p className="mt-2 text-[10px] text-foreground-muted">ID: {eventCode(item)}</p>
                    <p className="mt-1 text-[10px] text-foreground-muted">
                      Dibuat: {formatCompactDate(item.event.createdAt)}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={statusTone(item.event.publicationStatus)}>
                        {publicationStatusLabel(item.event.publicationStatus)}
                      </StatusBadge>
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 rounded-full ${
                          item.event.publicationStatus === "PUBLISHED"
                            ? "bg-success"
                            : item.event.publicationStatus === "DRAFT"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-foreground-muted">
                      {eventStatusLabel(item.event.eventStatus)}
                    </p>
                  </td>
                  <td className="px-3 py-3 align-middle text-navy">
                    <DateRange
                      end={item.event.registrationEndsAt}
                      start={item.event.registrationStartsAt}
                    />
                  </td>
                  <td className="px-3 py-3 align-middle text-navy">
                    <DateRange
                      end={item.event.activityEndsAt}
                      start={item.event.activityStartsAt}
                    />
                  </td>
                  <td className="px-3 py-3 align-middle text-navy">
                    <DateRange end={item.event.uploadEndsAt} start={item.event.uploadStartsAt} />
                  </td>
                  <td className="max-w-40 px-3 py-3 align-middle">
                    <p className="font-bold text-primary">{categoryLabel(item)}</p>
                    <p className="mt-1 text-[10px] text-foreground-muted">
                      {item.activeCategoryCount} aktif
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right align-middle text-sm font-bold text-navy">
                    {formatNumber(item.activeRegistrationCount)}
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <details className="relative inline-block text-left">
                      <summary className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-app border border-border text-lg font-bold text-navy hover:border-primary hover:text-primary">
                        <span aria-hidden="true">⋮</span>
                        <span className="sr-only">Aksi untuk {item.event.name}</span>
                      </summary>
                      <div className="absolute right-0 z-20 mt-2 grid w-44 gap-1 rounded-app border border-border bg-surface p-2 shadow-floating">
                        <Link
                          className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface-muted"
                          href={`/admin/events/${item.event.id}`}
                        >
                          Detail
                        </Link>
                        <Link
                          className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface-muted"
                          href={`/admin/events/${item.event.id}/edit`}
                        >
                          Edit event
                        </Link>
                        <Link
                          className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface-muted"
                          href={`/admin/events/${item.event.id}/preview`}
                        >
                          Preview
                        </Link>
                        {item.event.eventStatus !== "ARCHIVED" ? (
                          <form action={archiveEventAction.bind(null, item.event.id)}>
                            <input name="csrfToken" type="hidden" value={csrfToken} />
                            <button className="min-h-10 w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-red-50">
                              Arsipkan
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border xl:hidden">
          {data.items.map((item) => (
            <article className="p-4" key={item.event.id}>
              <div className="flex gap-3">
                <EventThumbnail item={item} size="small" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        className="font-bold text-navy hover:text-primary"
                        href={`/admin/events/${item.event.id}`}
                      >
                        {item.event.name}
                      </Link>
                      <p className="mt-1 text-[11px] text-foreground-muted">{eventCode(item)}</p>
                    </div>
                    <StatusBadge tone={statusTone(item.event.publicationStatus)}>
                      {publicationStatusLabel(item.event.publicationStatus)}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs font-bold text-primary">{categoryLabel(item)}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="font-bold text-foreground-muted">Pendaftaran</dt>
                  <dd className="mt-1 text-navy">
                    {formatCompactDate(item.event.registrationEndsAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground-muted">Periode lari</dt>
                  <dd className="mt-1 text-navy">
                    {formatCompactDate(item.event.activityStartsAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground-muted">Pendaftar</dt>
                  <dd className="mt-1 font-bold text-navy">
                    {formatNumber(item.activeRegistrationCount)}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground-muted">Aksi</dt>
                  <dd className="mt-1">
                    <Link
                      className="font-bold text-primary hover:underline"
                      href={`/admin/events/${item.event.id}`}
                    >
                      Kelola event
                    </Link>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        {data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground-muted">
              <Icon name="calendar" />
            </span>
            <h2 className="mt-3 font-bold text-navy">Event tidak ditemukan</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Ubah kata pencarian atau reset filter untuk melihat event lain.
            </p>
          </div>
        ) : null}

        <footer className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <label htmlFor="page-size">Baris per halaman</label>
            <PageSizeAutoSelect
              period={period ?? undefined}
              publication={publicationStatus ?? undefined}
              search={params.search}
              value={data.pageSize}
            />
          </div>
          <p className="text-xs text-foreground-muted">
            Menampilkan{" "}
            <strong className="text-navy">
              {data.totalFiltered === 0 ? 0 : (data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.totalFiltered)}
            </strong>{" "}
            dari <strong className="text-navy">{formatNumber(data.totalFiltered)}</strong> data
          </p>
          <nav aria-label="Pagination event" className="flex items-center gap-1">
            {data.page > 1 ? (
              <Link
                aria-label="Halaman sebelumnya"
                className="inline-flex h-10 w-10 items-center justify-center rounded-app border border-border hover:border-primary hover:text-primary"
                href={buildPageHref(params, data.page - 1)}
              >
                <Icon className="h-4 w-4" name="chevron-left" />
              </Link>
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-app border border-border text-border">
                <Icon className="h-4 w-4" name="chevron-left" />
              </span>
            )}
            {pageNumbers(data.page, data.totalPages).map((pageNumber) => (
              <Link
                aria-current={pageNumber === data.page ? "page" : undefined}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-app px-2 text-xs font-bold ${
                  pageNumber === data.page
                    ? "bg-primary text-white"
                    : "border border-transparent text-navy hover:border-border"
                }`}
                href={buildPageHref(params, pageNumber)}
                key={pageNumber}
              >
                {pageNumber}
              </Link>
            ))}
            {data.page < data.totalPages ? (
              <Link
                aria-label="Halaman berikutnya"
                className="inline-flex h-10 w-10 items-center justify-center rounded-app border border-border hover:border-primary hover:text-primary"
                href={buildPageHref(params, data.page + 1)}
              >
                <Icon className="h-4 w-4" name="chevron-right" />
              </Link>
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-app border border-border text-border">
                <Icon className="h-4 w-4" name="chevron-right" />
              </span>
            )}
          </nav>
        </footer>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-section border border-border bg-surface p-4">
          <header className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
              <span className="text-danger">◷</span>
              Event Terdekat Ditutup
            </h2>
          </header>
          <div className="divide-y divide-border">
            {data.nearestClosing.map((item) => (
              <div className="flex gap-3 py-3" key={item.event.id}>
                <EventThumbnail item={item} size="small" />
                <div className="min-w-0 flex-1">
                  <Link
                    className="line-clamp-1 text-xs font-bold text-navy hover:text-primary"
                    href={`/admin/events/${item.event.id}`}
                  >
                    {item.event.name}
                  </Link>
                  <p className="mt-1 text-[11px] text-foreground-muted">Tutup pendaftaran dalam</p>
                  <p className="mt-0.5 text-[11px] font-bold text-danger">
                    {daysUntil(item.event.registrationEndsAt)} hari lagi
                  </p>
                </div>
                <time className="text-[10px] text-foreground-muted">
                  {formatCompactDate(item.event.registrationEndsAt)}
                </time>
              </div>
            ))}
            {data.nearestClosing.length === 0 ? (
              <p className="py-6 text-center text-xs text-foreground-muted">
                Tidak ada pendaftaran aktif yang mendekati penutupan.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-section border border-border bg-surface p-4">
          <header className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
              <span className="text-amber-500">♢</span>
              Top Event by Registrations
            </h2>
          </header>
          <ol className="divide-y divide-border">
            {data.topRegistrations.map((item, index) => (
              <li className="flex items-center gap-3 py-2.5" key={item.event.id}>
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    index === 0 ? "bg-primary text-white" : "bg-surface-muted text-navy"
                  }`}
                >
                  {index + 1}
                </span>
                <EventThumbnail item={item} size="small" />
                <div className="min-w-0">
                  <Link
                    className="line-clamp-1 text-xs font-bold text-navy hover:text-primary"
                    href={`/admin/events/${item.event.id}`}
                  >
                    {item.event.name}
                  </Link>
                  <p className="mt-1 text-[11px] font-bold text-primary">
                    {formatNumber(item.activeRegistrationCount)} pendaftar
                  </p>
                </div>
              </li>
            ))}
            {data.topRegistrations.length === 0 ? (
              <p className="py-6 text-center text-xs text-foreground-muted">
                Belum ada data event.
              </p>
            ) : null}
          </ol>
        </article>

        <article className="rounded-section border border-border bg-surface p-4">
          <header className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-navy">
              <span className="text-info">⌁</span>
              Aktivitas Terbaru
            </h2>
          </header>
          <ol className="space-y-4 pt-4">
            {data.recentActivities.map((activity) => (
              <li className="flex gap-3" key={activity.id}>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Icon className="h-4 w-4" name="document" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] leading-4 text-foreground-muted">
                    <strong className="text-navy">{activity.actorName ?? "Admin"}</strong>{" "}
                    {activityCopy(activity.action)}
                  </p>
                  {activity.eventId && activity.eventName ? (
                    <Link
                      className="mt-0.5 line-clamp-1 text-xs font-bold text-navy hover:text-primary"
                      href={`/admin/events/${activity.eventId}`}
                    >
                      {activity.eventName}
                    </Link>
                  ) : null}
                  <time className="mt-0.5 block text-[10px] text-foreground-muted">
                    {formatBusinessDate(activity.createdAt)}
                  </time>
                </div>
              </li>
            ))}
            {data.recentActivities.length === 0 ? (
              <p className="py-6 text-center text-xs text-foreground-muted">
                Belum ada aktivitas event.
              </p>
            ) : null}
          </ol>
        </article>
      </section>
    </div>
  );
}
