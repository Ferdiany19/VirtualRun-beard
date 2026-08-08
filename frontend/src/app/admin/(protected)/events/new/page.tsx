import { createEventAction } from "@/app/admin/(protected)/events/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { requireAdminSession, getAdminCsrfTokenForForm } from "@/modules/auth/session";
import { EventCreateForm } from "@/modules/events/components/event-create-form";
import { FormMessage } from "@/modules/events/components/form-message";
import { Icon } from "@/shared/ui/icons";

type NewEventPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs font-semibold text-foreground-muted"
      >
        <a className="hover:text-primary" href="/admin">
          Dashboard
        </a>
        <Icon className="h-3.5 w-3.5" name="chevron-right" />
        <a className="hover:text-primary" href="/admin/events">
          Event
        </a>
        <Icon className="h-3.5 w-3.5" name="chevron-right" />
        <span className="text-navy">Buat Event</span>
      </nav>
      <div>
        <h1 className="text-2xl font-black text-navy md:text-3xl">Buat Event Baru</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Lengkapi informasi berikut untuk membuat event virtual run baru.
        </p>
      </div>
      <FormMessage error={params.error ?? null} />
      <EventCreateForm action={createEventAction} csrfToken={csrfToken} />
    </div>
  );
}
