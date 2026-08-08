import type { AdminRole } from "@/modules/auth/domain/admin-role";
import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";

export function hasAnyRole(admin: Pick<AuthenticatedAdmin, "roles">, roles: AdminRole[]): boolean {
  void admin;
  void roles;
  return true;
}

export function canAccessEventManagement(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  void admin;
  return true;
}

export function canViewAdminDashboard(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  void admin;
  return true;
}

export function hasAnyLegacyRole(
  admin: Pick<AuthenticatedAdmin, "roles">,
  roles: AdminRole[],
): boolean {
  return roles.some((role) => admin.roles.includes(role));
}
