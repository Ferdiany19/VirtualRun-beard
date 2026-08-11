import Link from "next/link";
import { cookies } from "next/headers";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { requireAdminSession } from "@/modules/auth/session";
import { BibTemplateFilters } from "@/modules/bib/components/bib-template-filters";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import { Icon } from "@/shared/ui/icons";
import { StatusBadge } from "@/shared/ui/status-badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BibTemplateStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type BibTemplateListItem = {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  description: string | null;
  status: BibTemplateStatus;
  orientation: "LANDSCAPE" | "PORTRAIT";
  canvasWidth: number;
  canvasHeight: number;
  versionNumber: number;
  isActive: boolean;
  updatedAt: string;
  updatedByName: string | null;
  usageCount: number;
};

type BibTemplateDashboardData = {
  stats: {
    totalTemplates: number;
    activeTemplates: number;
    eventsWithTemplate: number;
    draftOrArchivedTemplates: number;
  };
  items: BibTemplateListItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  filterOptions: { events: Array<{ id: string; name: string }> };
  eventsWithoutTemplate: Array<{ id: string; name: string; status: string }>;
  latestTemplates: BibTemplateListItem[];
  topUsedTemplates: BibTemplateListItem[];
  recentActivities: Array<{
    id: string;
    action: string;
    eventId: string | null;
    eventName: string | null;
    actorName: string | null;
    createdAt: string;
  }>;
  assignmentProgress: {
    totalEvents: number;
    eventsWithTemplate: number;
    eventsWithoutTemplate: number;
  };
};

type BibTemplatesPageProps = {
  searchParams: Promise<{
    search?: string;
    eventId?: string;
    status?: string;
    orientation?: string;
    page?: string;
    pageSize?: string;
    success?: string;
    error?: string;
  }>;
};

const statusLabel: Record<BibTemplateStatus, string> = {
  ACTIVE: "Aktif",
  DRAFT: "Draft",
  ARCHIVED: "Arsip",
};

const actionLabel: Record<string, string> = {
  BIB_TEMPLATE_UPLOADED: "mengupload template",
  BIB_TEMPLATE_METADATA_UPDATED: "memperbarui template",
  BIB_TEMPLATE_PUBLISHED: "mempublikasikan template",
  BIB_TEMPLATE_ARCHIVED: "mengarsipkan template",
  BIB_TEMPLATE_DUPLICATED: "menduplikat template",
  BIB_SETTINGS_UPDATED: "menyimpan pengaturan BIB",
};

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function templateHref(input: {
  search: string;
  eventId: string;
  status: string;
  orientation: string;
  page: number;
  pageSize: number;
}) {
  const query = new URLSearchParams();

  if (input.search) query.set("search", input.search);
  if (input.eventId) query.set("eventId", input.eventId);
  if (input.status) query.set("status", input.status);
  if (input.orientation) query.set("orientation", input.orientation);
  if (input.page > 1) query.set("page", String(input.page));
  if (input.pageSize !== 10) query.set("pageSize", String(input.pageSize));

  const serialized = query.toString();
  return serialized ? `/admin/bib-templates?${serialized}` : "/admin/bib-templates";
}

async function fetchBibTemplates(input: {
  search: string;
  eventId: string;
  status: string;
  orientation: string;
  page: number;
  pageSize: number;
}): Promise<BibTemplateDashboardData> {
  const query = new URLSearchParams();

  if (input.search) query.set("search", input.search);
  if (input.eventId) query.set("eventId", input.eventId);
  if (input.status) query.set("status", input.status);
  if (input.orientation) query.set("orientation", input.orientation);
  query.set("page", String(input.page));
  query.set("pageSize", String(input.pageSize));

  const response = await fetch(apiUrl(`/api/admin/bib-templates?${query.toString()}`), {
    cache: "no-store",
    headers: { cookie: (await cookies()).toString() },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat template BIB (${response.status}).`);
  }

  return (await response.json()) as BibTemplateDashboardData;
}

function statusTone(status: BibTemplateStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "DRAFT") return "warning" as const;
  return "neutral" as const;
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: "bib" | "runner" | "document" | "clipboard";
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
      <div>
        <p className="text-xs font-bold text-foreground-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold leading-none text-navy">{numberFormat(value)}</p>
        <p className="mt-2 text-xs text-foreground-muted">{detail}</p>
      </div>
    </article>
  );
}

function Preview({
  className = "w-28",
  template,
}: {
  className?: string;
  template: BibTemplateListItem;
}) {
  return (
    <div
      className={`relative aspect-[1.7/1] shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted ${className}`}
    >
      <img
        alt={`Preview ${template.name}`}
        className="h-full w-full object-cover"
        src={`/api/admin/bib/template-preview?templateVersionId=${template.id}`}
      />
    </div>
  );
}

function TemplateRow({ template }: { template: BibTemplateListItem }) {
  const href = `/admin/bib-templates/${template.id}`;

  return (
    <tr className="align-middle transition-colors hover:bg-surface-muted/70">
      <td className="p-0">
        <Link className="block px-4 py-3" href={href}>
          <Preview template={template} />
        </Link>
      </td>
      <td className="p-0">
        <Link className="block px-3 py-3" href={href}>
          <span className="font-bold text-navy">{template.name}</span>
          <span className="mt-1 block text-xs font-bold text-primary">
            ID: {template.id.slice(0, 8).toUpperCase()}
          </span>
        </Link>
      </td>
      <td className="p-0">
        <Link className="block px-3 py-3 text-sm font-medium text-navy" href={href}>
          {template.eventName}
        </Link>
      </td>
      <td className="p-0">
        <Link className="block px-3 py-3 text-sm text-navy" href={href}>
          {template.orientation === "LANDSCAPE" ? "Landscape" : "Portrait"}
        </Link>
      </td>
      <td className="p-0">
        <Link className="block px-3 py-3 text-sm text-navy" href={href}>
          {template.canvasWidth} x {template.canvasHeight} px
        </Link>
      </td>
      <td className="p-0">
        <Link className="block px-3 py-3 text-sm text-navy" href={href}>
          <span className="block">{formatBusinessDateTime(new Date(template.updatedAt))} WIB</span>
          <span className="text-xs text-foreground-muted">
            {template.updatedByName ?? "Sistem"}
          </span>
        </Link>
      </td>
      <td className="p-0">
        <Link className="block px-3 py-3" href={href}>
          <StatusBadge tone={statusTone(template.status)}>
            {statusLabel[template.status]}
          </StatusBadge>
        </Link>
      </td>
      <td className="relative px-4 py-3 text-right">
        <details className="group relative inline-block">
          <summary className="inline-flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-app border border-border text-navy hover:border-primary hover:text-primary">
            <span className="sr-only">Buka aksi template</span>
            <span aria-hidden="true" className="text-xl leading-none">
              ...
            </span>
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-44 rounded-app border border-border bg-surface p-1 text-left shadow-floating">
            <Link
              className="block rounded-md px-3 py-2 text-sm font-bold text-navy hover:bg-surface-muted"
              href={`/admin/bib-templates/${template.id}`}
            >
              Detail Template
            </Link>
            <Link
              className="block rounded-md px-3 py-2 text-sm font-bold text-navy hover:bg-surface-muted"
              href={`/admin/events/${template.eventId}/bib`}
            >
              Route Event Lama
            </Link>
          </div>
        </details>
      </td>
    </tr>
  );
}

export default async function AdminBibTemplatesPage({ searchParams }: BibTemplatesPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const query = await searchParams;
  const filters = {
    search: query.search?.trim() ?? "",
    eventId: query.eventId ?? "",
    status: ["ACTIVE", "DRAFT", "ARCHIVED"].includes(query.status ?? "")
      ? (query.status ?? "")
      : "",
    orientation: ["LANDSCAPE", "PORTRAIT"].includes(query.orientation ?? "")
      ? (query.orientation ?? "")
      : "",
    page: Math.max(1, toNumber(query.page, 1)),
    pageSize: toNumber(query.pageSize, 10),
  };
  const data = await fetchBibTemplates(filters);
  const firstEventId = data.filterOptions.events[0]?.id ?? null;
  const firstItem = data.pagination.totalItems
    ? (data.pagination.page - 1) * data.pagination.pageSize + 1
    : 0;
  const lastItem = Math.min(
    data.pagination.totalItems,
    data.pagination.page * data.pagination.pageSize,
  );
  const assignedPercent =
    data.assignmentProgress.totalEvents > 0
      ? Math.round(
          (data.assignmentProgress.eventsWithTemplate / data.assignmentProgress.totalEvents) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AdminPageHeader
          description="Pusat template BIB untuk semua event yang dapat Anda kelola."
          title="BIB Template"
        />
        {firstEventId ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-action px-4 text-sm font-bold text-white hover:bg-action-hover"
            href={`/admin/events/${firstEventId}/bib?new=1`}
          >
            <Icon className="h-4 w-4" name="plus" />
            Buat Template Baru
          </Link>
        ) : (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-surface-muted px-4 text-sm font-bold text-foreground-muted"
            disabled
            type="button"
          >
            <Icon className="h-4 w-4" name="plus" />
            Buat Template Baru
          </button>
        )}
      </div>

      <BibTemplateFilters
        events={data.filterOptions.events}
        initialEventId={filters.eventId}
        initialOrientation={filters.orientation}
        initialSearch={filters.search}
        initialStatus={filters.status}
        pageSize={data.pagination.pageSize}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          detail="Template tersimpan"
          icon="bib"
          label="Total Template"
          tone="bg-teal-50 text-primary"
          value={data.stats.totalTemplates}
        />
        <StatCard
          detail="Siap dipakai event"
          icon="runner"
          label="Template Aktif"
          tone="bg-emerald-50 text-success"
          value={data.stats.activeTemplates}
        />
        <StatCard
          detail="Event dengan template aktif"
          icon="document"
          label="Event dengan Template"
          tone="bg-amber-50 text-warning"
          value={data.stats.eventsWithTemplate}
        />
        <StatCard
          detail="Perlu ditinjau"
          icon="clipboard"
          label="Draft / Arsip"
          tone="bg-slate-100 text-navy"
          value={data.stats.draftOrArchivedTemplates}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-visible rounded-section border border-border bg-surface shadow-soft">
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1090px] table-fixed text-left text-sm">
              <thead className="border-b border-border text-xs font-bold text-navy">
                <tr>
                  <th className="w-[140px] px-4 py-4">Preview</th>
                  <th className="w-[190px] px-3 py-4">Nama Template</th>
                  <th className="w-[180px] px-3 py-4">Event</th>
                  <th className="w-[100px] px-3 py-4">Format</th>
                  <th className="w-[130px] px-3 py-4">Dimensi</th>
                  <th className="w-[170px] px-3 py-4">Terakhir Diperbarui</th>
                  <th className="w-[100px] px-3 py-4">Status</th>
                  <th className="w-[80px] px-4 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((template) => (
                  <TemplateRow key={template.id} template={template} />
                ))}
                {data.items.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-14 text-center text-sm text-foreground-muted"
                      colSpan={8}
                    >
                      Belum ada template BIB yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 xl:hidden">
            {data.items.map((template) => (
              <Link
                className="block rounded-app border border-border p-4 transition-colors hover:border-primary hover:bg-surface-muted/70"
                href={`/admin/bib-templates/${template.id}`}
                key={template.id}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <Preview className="w-20 sm:w-28" template={template} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-bold text-navy">{template.name}</p>
                      <StatusBadge tone={statusTone(template.status)}>
                        {statusLabel[template.status]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-foreground-muted">{template.eventName}</p>
                    <p className="mt-2 text-xs text-foreground-muted">
                      {template.canvasWidth} x {template.canvasHeight} px
                    </p>
                  </div>
                </div>
                <span className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-app border border-border px-3 text-sm font-bold text-primary">
                  Detail Template
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t border-border px-4 py-4 text-sm text-foreground-muted lg:flex-row lg:items-center lg:justify-between">
            <p>
              Menampilkan{" "}
              <strong>
                {firstItem} - {lastItem}
              </strong>{" "}
              dari <strong>{numberFormat(data.pagination.totalItems)}</strong> template
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
                href={templateHref({
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
                href={templateHref({
                  ...filters,
                  page: data.pagination.page + 1,
                  pageSize: data.pagination.pageSize,
                })}
              >
                <Icon className="h-4 w-4" name="chevron-right" />
              </Link>
            </div>
          </div>
        </div>

        <aside className="grid gap-4">
          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-bold text-navy">Event tanpa template</h2>
            <div className="mt-4 grid gap-3">
              {data.eventsWithoutTemplate.map((event) => (
                <Link
                  className="flex items-start gap-3 rounded-app p-2 hover:bg-surface-muted"
                  href={`/admin/events/${event.id}/bib`}
                  key={event.id}
                >
                  <Icon className="mt-0.5 h-4 w-4 text-warning" name="calendar" />
                  <span>
                    <span className="block text-sm font-bold text-navy">{event.name}</span>
                    <span className="text-xs text-foreground-muted">Belum ada template aktif</span>
                  </span>
                </Link>
              ))}
              {data.eventsWithoutTemplate.length === 0 ? (
                <p className="text-sm text-foreground-muted">
                  Semua event yang dapat Anda kelola sudah punya template aktif.
                </p>
              ) : null}
            </div>
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-bold text-navy">Template terbaru</h2>
            <div className="mt-4 grid gap-3">
              {data.latestTemplates.map((template) => (
                <Link
                  className="flex items-center gap-3"
                  href={`/admin/bib-templates/${template.id}`}
                  key={template.id}
                >
                  <Preview className="w-20 sm:w-28" template={template} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-navy">
                      {template.name}
                    </span>
                    <span className="block truncate text-xs text-foreground-muted">
                      {template.eventName}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <h2 className="text-base font-bold text-navy">Panduan BIB Template</h2>
            <div className="mt-4 grid gap-3 text-sm text-navy">
              <p>Upload gambar PNG/JPG dari desain final.</p>
              <p>Atur posisi nomor, nama, kategori, dan preview sebelum publish.</p>
              <p>Template aktif akan dipakai worker saat generate BIB.</p>
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-bold text-navy">Template Paling Banyak Digunakan</h2>
          <div className="mt-5 grid gap-3">
            {data.topUsedTemplates.map((template, index) => (
              <Link
                className="flex items-center gap-3"
                href={`/admin/bib-templates/${template.id}`}
                key={template.id}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-navy">
                    {template.name}
                  </span>
                  <span className="block truncate text-xs text-foreground-muted">
                    {template.eventName}
                  </span>
                </span>
                <span className="text-xs font-bold text-navy">
                  {numberFormat(template.usageCount)} BIB
                </span>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-bold text-navy">Aktivitas Terbaru</h2>
          <div className="mt-5 grid gap-4">
            {data.recentActivities.map((activity) => (
              <div className="flex items-start gap-3" key={activity.id}>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-app bg-teal-50 text-primary">
                  <Icon className="h-4 w-4" name="bib" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-navy">
                    <strong>{activity.actorName ?? "Sistem"}</strong>{" "}
                    {actionLabel[activity.action] ?? activity.action.toLowerCase()}
                  </p>
                  <p className="mt-1 truncate text-xs text-foreground-muted">
                    {activity.eventName ?? "Global"}
                  </p>
                </div>
              </div>
            ))}
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-foreground-muted">Belum ada aktivitas template BIB.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <h2 className="text-base font-bold text-navy">Progress Template ke Event</h2>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-[14px] border-primary bg-surface text-center sm:h-32 sm:w-32 sm:border-[18px]">
              <span>
                <span className="block text-xs text-foreground-muted">Total Event</span>
                <span className="block text-2xl font-bold text-navy">
                  {data.assignmentProgress.totalEvents}
                </span>
              </span>
            </div>
            <div className="grid gap-3 text-sm">
              <p className="font-bold text-navy">
                Sudah Ada Template: {data.assignmentProgress.eventsWithTemplate} ({assignedPercent}
                %)
              </p>
              <p className="font-bold text-navy">
                Tanpa Template: {data.assignmentProgress.eventsWithoutTemplate}
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
