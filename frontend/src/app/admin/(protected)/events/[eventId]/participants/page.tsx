import Link from "next/link";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { requireAdminSession } from "@/modules/auth/session";
import { listActiveCategoriesByEventId } from "@/modules/categories/category.repository";
import { getManageableEvent } from "@/modules/events/event.service";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { formatBusinessDateTime } from "@/shared/date/business-timezone";
import { listEventRegistrationsForAdmin } from "@/modules/registrations/registration.service";
import type { BibStatus, RegistrationStatus } from "@/modules/registrations/registration.types";
import { StatusBadge } from "@/shared/ui/status-badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantsPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    registrationStatus?: RegistrationStatus;
    bibStatus?: BibStatus;
    sort?: "registered_desc" | "registered_asc" | "bib_asc" | "name_asc";
  }>;
};

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 5)}****${phone.slice(-3)}`;
}

export default async function AdminParticipantsPage({
  params,
  searchParams,
}: ParticipantsPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManageableEvent(eventId, admin);
  const [categories, registrations] = await Promise.all([
    listActiveCategoriesByEventId(eventId),
    listEventRegistrationsForAdmin({
      eventId,
      admin,
      filters: {
        search: query.search,
        categoryId: query.categoryId,
        registrationStatus: query.registrationStatus,
        bibStatus: query.bibStatus,
        sort: query.sort,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref={`/admin/events/${event.id}`}
        actionLabel="Kembali"
        description="Daftar peserta yang sudah mendaftar pada event."
        eyebrow="Peserta"
        title={event.name}
      />

      <form className="grid gap-3 rounded-section border border-border bg-surface p-4 shadow-soft md:grid-cols-5">
        <input
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          name="search"
          placeholder="Cari nama, BIB, atau lookup code"
          defaultValue={query.search ?? ""}
        />
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          name="categoryId"
          defaultValue={query.categoryId ?? ""}
        >
          <option value="">Semua kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          name="registrationStatus"
          defaultValue={query.registrationStatus ?? ""}
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          className="min-h-11 rounded-app border border-border px-3 text-sm"
          name="bibStatus"
          defaultValue={query.bibStatus ?? ""}
        >
          <option value="">Semua BIB</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="READY">Ready</option>
          <option value="FAILED">Failed</option>
        </select>
        <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white">
          Filter
        </button>
      </form>

      <section className="overflow-hidden rounded-section border border-border bg-surface shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-foreground-muted">
              <tr>
                <th className="px-4 py-3">BIB</th>
                <th className="px-4 py-3">Peserta</th>
                <th className="px-4 py-3">Kontak</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {registrations.map((item) => (
                <tr key={item.registration.id}>
                  <td className="px-4 py-3 font-bold text-navy">{item.registration.bibNumber}</td>
                  <td className="px-4 py-3">{item.participant.fullName}</td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {maskEmail(item.participant.displayEmail)}
                    <br />
                    {maskPhone(item.participant.displayPhone)}
                  </td>
                  <td className="px-4 py-3">
                    {item.categories.map((category) => category.name).join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={
                        item.registration.bibStatus === "READY"
                          ? "success"
                          : item.registration.bibStatus === "FAILED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {item.registration.bibStatus}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {formatBusinessDateTime(item.registration.registeredAt)} WIB
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="font-bold text-primary"
                      href={`/admin/events/${event.id}/participants/${item.registration.id}`}
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {registrations.map((item) => (
            <Link
              key={item.registration.id}
              className="rounded-app border border-border p-4"
              href={`/admin/events/${event.id}/participants/${item.registration.id}`}
            >
              <p className="font-bold text-navy">
                {item.registration.bibNumber} - {item.participant.fullName}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {item.categories.map((category) => category.name).join(", ")}
              </p>
              <p className="mt-2 text-xs font-bold text-primary">{item.registration.bibStatus}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
