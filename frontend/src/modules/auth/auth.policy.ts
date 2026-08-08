import type { AdminRole } from "@/modules/auth/domain/admin-role";
import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";

export function hasAnyRole(admin: Pick<AuthenticatedAdmin, "roles">, roles: AdminRole[]): boolean {
  return roles.some((role) => admin.roles.includes(role));
}

export function canAccessEventManagement(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  return hasAnyRole(admin, ["SUPER_ADMIN", "EVENT_ADMIN"]);
}

export function canViewAdminDashboard(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  return hasAnyRole(admin, ["SUPER_ADMIN", "EVENT_ADMIN", "VALIDATOR", "REPORT_VIEWER"]);
}
