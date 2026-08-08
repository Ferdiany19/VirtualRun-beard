import Link from "next/link";
import { requireAdminSession } from "@/modules/auth/session";
import { getAdminDashboardData } from "@/modules/events/event.service";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import { Icon, type IconName } from "@/shared/ui/icons";

const labels: Record<string, string> = {
  EVENT_CREATED: "Event dibuat",
  EVENT_UPDATED: "Event diedit",
  EVENT_PUBLISHED: "Event dipublish",
  EVENT_UNPUBLISHED: "Event di-unpublish",
  EVENT_ARCHIVED: "Event diarsipkan",
  CATEGORY_CREATED: "Kategori dibuat",
  CATEGORY_UPDATED: "Kategori diedit",
  CATEGORY_ACTIVATED: "Kategori diaktifkan",
  CATEGORY_DEACTIVATED: "Kategori dinonaktifkan",
};

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: IconName;
  tone: "primary" | "warning" | "success" | "info";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-amber-50 text-warning",
    success: "bg-emerald-50 text-success",
    info: "bg-blue-50 text-info",
  }[tone];

  return (
    <article className="rounded-app border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-navy">{value}</p>
        </div>
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-app ${toneClass}`}
        >
          <Icon className="h-5 w-5" name={icon} />
        </span>
      </div>
    </article>
  );
}

export default async function AdminDashboardPage() {
  const admin = await requireAdminSession();
  const { counts, recentAuditLogs } = await getAdminDashboardData(admin);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref="/admin/events/new"
        actionLabel="Buat Event"
        description="Ringkasan operasional event yang bisa Anda kelola."
        eyebrow="Dashboard"
        title="Operasional event"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon="calendar" label="Total event" tone="primary" value={counts.totalEvents} />
        <StatCard icon="clipboard" label="Draft" tone="warning" value={counts.draftEvents} />
        <StatCard icon="check" label="Published" tone="success" value={counts.publishedEvents} />
        <StatCard
          icon="flag"
          label="Registration open"
          tone="info"
          value={counts.registrationOpenEvents}
        />
        <StatCard
          icon="runner"
          label="Event mendatang"
          tone="primary"
          value={counts.upcomingEvents}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <article className="rounded-section border border-border bg-surface shadow-soft">
          <div className="border-b border-border p-4">
            <h2 className="text-base font-bold text-navy">Perubahan terbaru</h2>
          </div>
          <div className="divide-y divide-border">
            {recentAuditLogs.length === 0 ? (
              <p className="p-4 text-sm text-foreground-muted">
                Belum ada aktivitas admin yang tercatat.
              </p>
            ) : (
              recentAuditLogs.map((auditLog) => (
                <div key={auditLog.id} className="grid gap-1 p-4 text-sm sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-bold text-navy">
                      {labels[auditLog.action] ?? auditLog.action}
                    </p>
                    <p className="text-foreground-muted">{auditLog.entityType}</p>
                  </div>
                  <time className="text-foreground-muted">
                    {formatBusinessDateTime(auditLog.createdAt)} WIB
                  </time>
                </div>
              ))
            )}
          </div>
        </article>

        <aside className="rounded-section border border-border bg-surface p-5 shadow-soft">
          <p className="eyebrow">Shortcut</p>
          <h2 className="mt-2 text-lg font-bold text-navy">Kerja event berikutnya</h2>
          <div className="mt-4 grid gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-action px-4 py-2 text-sm font-bold text-white hover:bg-action-hover"
              href="/admin/events/new"
            >
              <Icon className="h-4 w-4" name="plus" />
              Buat Event
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
              href="/admin/events"
            >
              Kelola event
            </Link>
          </div>
          <p className="caption-copy mt-4">
            Chart peserta dan submission belum ditampilkan karena modul registration/upload belum
            tersedia.
          </p>
        </aside>
      </section>
    </div>
  );
}
