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
    primary: "border-primary text-primary",
    warning: "border-warning text-warning",
    success: "border-success text-success",
    info: "border-info text-info",
  }[tone];

  return (
    <article className="border-t-2 border-navy bg-surface p-4">
      <div className="grid gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-app border ${toneClass}`}
        >
          <Icon className="h-5 w-5" name={icon} />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground-muted">{label}</p>
          <p className="mt-1 text-4xl font-black text-navy">{value}</p>
        </div>
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
        description="Pusat kerja admin untuk event, peserta, BIB, validasi hasil, dan sertifikat."
        title="Dashboard admin"
      />

      <section className="grid gap-3 rounded-section border border-border bg-surface p-3 shadow-soft sm:grid-cols-2 xl:grid-cols-5">
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
          <div className="border-b-2 border-navy p-5">
            <h2 className="text-xl font-black text-navy">Log aktivitas terbaru</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Jejak perubahan penting dari seluruh area admin.
            </p>
          </div>
          <div className="divide-y divide-border">
            {recentAuditLogs.length === 0 ? (
              <p className="p-5 text-sm text-foreground-muted">
                Belum ada aktivitas admin yang tercatat.
              </p>
            ) : (
              recentAuditLogs.map((auditLog) => (
                <div
                  key={auditLog.id}
                  className="grid gap-2 p-5 text-sm sm:grid-cols-[1fr_auto] sm:items-start"
                >
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
          <h2 className="text-xl font-black text-navy">Aksi berikutnya</h2>
          <p className="mt-1 text-sm leading-6 text-foreground-muted">
            Mulai dari event, lalu lanjutkan kategori, peserta, BIB, dan validasi.
          </p>
          <div className="mt-4 grid gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-app border-2 border-navy bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-primary"
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
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
              href="/admin/participants"
            >
              Database peserta
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
