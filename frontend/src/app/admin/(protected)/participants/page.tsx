import Link from "next/link";
import { cookies } from "next/headers";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { requireAdminSession } from "@/modules/auth/session";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import {
  GlobalParticipantFilters,
  GlobalParticipantPageSizeSelect,
} from "@/modules/registrations/components/global-participant-filters";
import {
  GlobalParticipantActionMenu,
  GlobalParticipantActionMenuProvider,
} from "@/modules/registrations/components/global-participant-action-menu";
import type {
  GlobalParticipantListItem,
  GlobalParticipantPageData,
  GlobalParticipantRecentActivity,
  GlobalParticipantStatus,
} from "@/modules/registrations/registration.types";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantsPageProps = {
  searchParams: Promise<{
    search?: string;
    eventId?: string;
    categoryId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
  }>;
};

const statusLabel: Record<GlobalParticipantStatus, string> = {
  VERIFIED: "Verifikasi",
  PENDING_UPLOAD: "Belum Upload",
  ACTIVE: "Aktif",
  CANCELLED: "Dibatalkan",
};

const activityLabel: Record<GlobalParticipantRecentActivity["action"], string> = {
  REGISTERED: "mendaftar event baru",
  SUBMITTED: "berhasil upload hasil",
  PENDING_UPLOAD: "belum upload hasil",
};

const globalParticipantStatuses: GlobalParticipantStatus[] = [
  "VERIFIED",
  "PENDING_UPLOAD",
  "ACTIVE",
  "CANCELLED",
];

const avatarPalette = [
  "bg-teal-50 text-primary",
  "bg-sky-50 text-info",
  "bg-emerald-50 text-success",
  "bg-amber-50 text-warning",
  "bg-slate-100 text-navy",
];

type ApiGlobalParticipantListItem = Omit<GlobalParticipantListItem, "registeredAt"> & {
  registeredAt: string;
};

type ApiGlobalParticipantRecentActivity = Omit<GlobalParticipantRecentActivity, "createdAt"> & {
  createdAt: string;
};

type ApiGlobalParticipantPageData = Omit<
  GlobalParticipantPageData,
  "items" | "latestParticipants" | "recentActivities"
> & {
  items: ApiGlobalParticipantListItem[];
  latestParticipants: ApiGlobalParticipantListItem[];
  recentActivities: ApiGlobalParticipantRecentActivity[];
};

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return (parts[0]?.[0] ?? "P").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function avatarClass(id: string): string {
  const charSum = Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return avatarPalette[charSum % avatarPalette.length];
}

function participantStatusTone(status: GlobalParticipantStatus) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "PENDING_UPLOAD") return "warning" as const;
  if (status === "CANCELLED") return "danger" as const;
  return "neutral" as const;
}

function relativeTime(date: Date): string {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return "baru saja";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari yang lalu`;
}

function categorySummary(categories: string[]): string {
  if (categories.length === 0) return "-";
  if (categories.length <= 2) return categories.join(" + ");
  return `${categories.slice(0, 2).join(" + ")} +${categories.length - 2}`;
}

function pageHref(input: {
  search: string;
  eventId: string;
  categoryId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}) {
  const query = new URLSearchParams();

  if (input.search) query.set("search", input.search);
  if (input.eventId) query.set("eventId", input.eventId);
  if (input.categoryId) query.set("categoryId", input.categoryId);
  if (input.status) query.set("status", input.status);
  if (input.dateFrom) query.set("dateFrom", input.dateFrom);
  if (input.dateTo) query.set("dateTo", input.dateTo);
  if (input.page > 1) query.set("page", String(input.page));
  if (input.pageSize !== 10) query.set("pageSize", String(input.pageSize));

  const serialized = query.toString();
  return serialized ? `/admin/participants?${serialized}` : "/admin/participants";
}

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

function apiQuery(input: {
  search: string;
  eventId: string;
  categoryId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}) {
  const query = new URLSearchParams();

  if (input.search) query.set("search", input.search);
  if (input.eventId) query.set("eventId", input.eventId);
  if (input.categoryId) query.set("categoryId", input.categoryId);
  if (input.status) query.set("status", input.status);
  if (input.dateFrom) query.set("dateFrom", input.dateFrom);
  if (input.dateTo) query.set("dateTo", input.dateTo);
  query.set("page", String(input.page));
  query.set("pageSize", String(input.pageSize));

  return query.toString();
}

function hydrateGlobalParticipant(item: ApiGlobalParticipantListItem): GlobalParticipantListItem {
  return {
    ...item,
    registeredAt: new Date(item.registeredAt),
  };
}

async function fetchGlobalParticipants(input: {
  search: string;
  eventId: string;
  categoryId: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}): Promise<GlobalParticipantPageData> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(apiUrl(`/api/admin/participants?${apiQuery(input)}`), {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat peserta global dari backend (${response.status}).`);
  }

  const data = (await response.json()) as ApiGlobalParticipantPageData;

  return {
    ...data,
    items: data.items.map(hydrateGlobalParticipant),
    latestParticipants: data.latestParticipants.map(hydrateGlobalParticipant),
    recentActivities: data.recentActivities.map((activity) => ({
      ...activity,
      createdAt: new Date(activity.createdAt),
    })),
  };
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: "users" | "mail" | "upload" | "user";
  label: string;
  value: number;
  detail: string;
  tone: string;
}) {
  return (
    <article className="flex min-h-28 items-center gap-4 rounded-section border border-border bg-surface p-5 shadow-soft">
      <span
        className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-app ${tone}`}
      >
        <Icon className="h-7 w-7" name={icon} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold leading-none text-navy">{formatNumber(value)}</p>
        <p className="mt-2 text-xs leading-5 text-foreground-muted">{detail}</p>
      </div>
    </article>
  );
}

function Avatar({ participant }: { participant: GlobalParticipantListItem }) {
  return (
    <span
      className={[
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        avatarClass(participant.participantId),
      ].join(" ")}
    >
      {initials(participant.participantName)}
    </span>
  );
}

export default async function AdminGlobalParticipantsPage({ searchParams }: ParticipantsPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const query = await searchParams;
  const selectedStatus = globalParticipantStatuses.find((item) => item === query.status) ?? null;
  const filters = {
    search: query.search?.trim() ?? "",
    eventId: query.eventId ?? "",
    categoryId: query.categoryId ?? "",
    status: selectedStatus ?? "",
    dateFrom: query.dateFrom ?? "",
    dateTo: query.dateTo ?? "",
    page: Math.max(1, toNumber(query.page, 1)),
    pageSize: toNumber(query.pageSize, 10),
  };
  const data = await fetchGlobalParticipants(filters);
  const firstItem = data.pagination.totalItems
    ? (data.pagination.page - 1) * data.pagination.pageSize + 1
    : 0;
  const lastItem = Math.min(
    data.pagination.totalItems,
    data.pagination.page * data.pagination.pageSize,
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Kelola database peserta dari semua event yang dapat Anda akses."
        title="Peserta"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          detail="Peserta aktif lintas event"
          icon="users"
          label="Total Peserta"
          tone="bg-teal-50 text-primary"
          value={data.stats.totalParticipants}
        />
        <StatCard
          detail="Email registrasi berstatus terkirim"
          icon="mail"
          label="Sudah Verifikasi Email"
          tone="bg-emerald-50 text-success"
          value={data.stats.verifiedEmailCount}
        />
        <StatCard
          detail="Registrasi dengan kategori tanpa hasil"
          icon="upload"
          label="Belum Upload Hasil"
          tone="bg-amber-50 text-warning"
          value={data.stats.pendingUploadCount}
        />
        <StatCard
          detail="Peserta baru bulan berjalan"
          icon="user"
          label="Peserta Baru Bulan Ini"
          tone="bg-sky-50 text-info"
          value={data.stats.newThisMonthCount}
        />
      </section>

      <GlobalParticipantFilters
        filterOptions={data.filterOptions}
        initialCategoryId={filters.categoryId}
        initialDateFrom={filters.dateFrom}
        initialDateTo={filters.dateTo}
        initialEventId={filters.eventId}
        initialSearch={filters.search}
        initialStatus={filters.status}
        pageSize={data.pagination.pageSize}
      />

      <section className="overflow-visible rounded-section border border-border bg-surface shadow-soft">
        <div className="hidden xl:block">
          <GlobalParticipantActionMenuProvider>
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-border text-xs font-bold text-navy">
                <tr>
                  <th className="w-[170px] px-3 py-4">Nama</th>
                  <th className="w-[210px] px-3 py-4">Email</th>
                  <th className="w-[190px] px-3 py-4">Event</th>
                  <th className="w-[120px] px-3 py-4">Nomor BIB</th>
                  <th className="w-[130px] px-3 py-4">Kategori</th>
                  <th className="w-[150px] px-3 py-4">Tanggal Daftar</th>
                  <th className="w-[130px] px-3 py-4">Status</th>
                  <th className="w-[80px] px-4 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item) => (
                  <tr key={item.registrationId} className="align-middle">
                    <td className="px-3 py-3">
                      <p className="truncate font-bold text-navy">{item.participantName}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-foreground-muted">
                      <span className="block truncate">{item.participantEmail}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        className="line-clamp-2 font-bold text-navy hover:text-primary"
                        href={`/admin/events/${item.eventId}`}
                      >
                        {item.eventName}
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-bold text-navy">{item.bibNumber}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex min-h-7 items-center rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-primary">
                        {categorySummary(item.categories)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs leading-5 text-navy">
                      {formatBusinessDateTime(item.registeredAt)} WIB
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={participantStatusTone(item.status)}>
                        {statusLabel[item.status]}
                      </StatusBadge>
                    </td>
                    <td className="relative px-4 py-3 text-right">
                      <GlobalParticipantActionMenu
                        eventId={item.eventId}
                        registrationId={item.registrationId}
                      />
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-14 text-center text-sm text-foreground-muted"
                      colSpan={8}
                    >
                      Belum ada peserta yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </GlobalParticipantActionMenuProvider>
        </div>

        <div className="grid gap-3 p-3 xl:hidden">
          {data.items.map((item) => (
            <article key={item.registrationId} className="rounded-app border border-border p-4">
              <div className="flex items-start gap-3">
                <Avatar participant={item} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy">{item.participantName}</p>
                  <p className="mt-1 truncate text-xs text-foreground-muted">
                    {item.participantEmail}
                  </p>
                  <p className="mt-2 text-sm font-bold text-navy">{item.eventName}</p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {item.bibNumber} / {categorySummary(item.categories)}
                  </p>
                </div>
                <StatusBadge tone={participantStatusTone(item.status)}>
                  {statusLabel[item.status]}
                </StatusBadge>
              </div>
              <Link
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-app border border-border px-3 text-sm font-bold text-primary"
                href={`/admin/events/${item.eventId}/participants/${item.registrationId}`}
              >
                Detail
              </Link>
            </article>
          ))}
          {data.items.length === 0 ? (
            <p className="rounded-app border border-border p-6 text-center text-sm text-foreground-muted">
              Belum ada peserta yang cocok dengan filter saat ini.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 border-t border-border px-4 py-4 text-sm text-foreground-muted lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <GlobalParticipantPageSizeSelect
              filters={{
                search: filters.search,
                eventId: filters.eventId,
                categoryId: filters.categoryId,
                status: filters.status,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                page: 1,
              }}
              value={data.pagination.pageSize}
            />
          </div>
          <p>
            Menampilkan{" "}
            <strong>
              {firstItem} - {lastItem}
            </strong>{" "}
            dari <strong>{formatNumber(data.pagination.totalItems)}</strong> peserta
          </p>
          <div className="flex items-center gap-2">
            <Link
              aria-disabled={data.pagination.page <= 1}
              className={[
                "inline-flex h-10 w-10 items-center justify-center rounded-app border border-border",
                data.pagination.page <= 1
                  ? "pointer-events-none text-foreground-muted/40"
                  : "text-navy hover:border-primary hover:text-primary",
              ].join(" ")}
              href={pageHref({
                ...filters,
                page: data.pagination.page - 1,
                pageSize: data.pagination.pageSize,
              })}
            >
              <Icon className="h-4 w-4" name="chevron-left" />
            </Link>
            <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-app bg-primary px-3 font-bold text-white">
              {data.pagination.page}
            </span>
            <Link
              aria-disabled={data.pagination.page >= data.pagination.totalPages}
              className={[
                "inline-flex h-10 w-10 items-center justify-center rounded-app border border-border",
                data.pagination.page >= data.pagination.totalPages
                  ? "pointer-events-none text-foreground-muted/40"
                  : "text-navy hover:border-primary hover:text-primary",
              ].join(" ")}
              href={pageHref({
                ...filters,
                page: data.pagination.page + 1,
                pageSize: data.pagination.pageSize,
              })}
            >
              <Icon className="h-4 w-4" name="chevron-right" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-navy">Peserta Terbaru</h2>
            <Link className="text-xs font-bold text-primary" href="/admin/participants">
              Lihat semua
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {data.latestParticipants.map((item) => (
              <Link
                className="flex items-center gap-3"
                href={`/admin/events/${item.eventId}/participants/${item.registrationId}`}
                key={item.registrationId}
              >
                <Avatar participant={item} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-navy">
                    {item.participantName}
                  </span>
                  <span className="block truncate text-xs text-foreground-muted">
                    {item.eventName}
                  </span>
                </span>
                <span className="text-xs text-foreground-muted">
                  {relativeTime(item.registeredAt)}
                </span>
              </Link>
            ))}
            {data.latestParticipants.length === 0 ? (
              <p className="text-sm text-foreground-muted">Belum ada peserta terbaru.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-navy">Top Event</h2>
            <Link className="text-xs font-bold text-primary" href="/admin/events">
              Lihat semua
            </Link>
          </div>
          <div className="mt-5 grid gap-4">
            {data.topEvents.map((event, index) => (
              <Link
                className="flex items-center gap-3"
                href={`/admin/events/${event.eventId}`}
                key={event.eventId}
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-surface-muted text-sm font-bold text-navy">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-navy">
                    {event.eventName}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {event.categories.slice(0, 3).map((category) => (
                      <span
                        className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-primary"
                        key={category}
                      >
                        {category}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="text-xs font-bold text-navy">
                  {formatNumber(event.registrationCount)} peserta
                </span>
              </Link>
            ))}
            {data.topEvents.length === 0 ? (
              <p className="text-sm text-foreground-muted">Belum ada event dengan peserta aktif.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-navy">Aktivitas Peserta Terbaru</h2>
          </div>
          <div className="mt-5 grid gap-4">
            {data.recentActivities.map((activity) => (
              <div className="flex items-start gap-3" key={activity.id}>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-teal-50 text-primary">
                  <Icon
                    className="h-4 w-4"
                    name={activity.action === "SUBMITTED" ? "upload" : "mail"}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5 text-navy">
                    <strong>{activity.participantName}</strong> {activityLabel[activity.action]}
                  </p>
                  <p className="mt-1 truncate text-xs text-foreground-muted">
                    {activity.eventName}
                  </p>
                </div>
                <span className="text-xs text-foreground-muted">
                  {relativeTime(activity.createdAt)}
                </span>
              </div>
            ))}
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-foreground-muted">Belum ada aktivitas peserta.</p>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
