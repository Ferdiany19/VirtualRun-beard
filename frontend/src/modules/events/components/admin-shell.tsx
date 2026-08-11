import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";
import { AdminShellFrame } from "@/modules/events/components/admin-shell-frame";
import { getAdminSidebarData } from "@/modules/events/event.service";
import { canViewValidation } from "@/modules/validation/validation.policy";

type AdminShellProps = {
  admin: AuthenticatedAdmin;
  csrfToken: string;
  logoutAction: (formData: FormData) => Promise<void>;
  children: ReactNode;
};

export async function AdminShell({ admin, csrfToken, logoutAction, children }: AdminShellProps) {
  const canManageEvents = canAccessEventManagement(admin);
  const canOpenValidation = canViewValidation(admin);
  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get("virtual_run_admin_sidebar_collapsed")?.value === "true";
  let sidebarData: Awaited<ReturnType<typeof getAdminSidebarData>> = {
    activeEventId: null,
    pendingUploadCount: 0,
  };

  try {
    sidebarData = await getAdminSidebarData(admin);
  } catch {
    // Sidebar data is auxiliary; an unavailable count/event list must not block admin pages.
  }

  return (
    <AdminShellFrame
      activeEventId={sidebarData.activeEventId}
      adminFullName={admin.fullName}
      adminRoles={admin.roles}
      canManageEvents={canManageEvents}
      canViewValidation={canOpenValidation}
      csrfToken={csrfToken}
      initialSidebarCollapsed={initialSidebarCollapsed}
      logoutAction={logoutAction}
      pendingUploadCount={sidebarData.pendingUploadCount}
    >
      {children}
    </AdminShellFrame>
  );
}
