export const adminRoles = ["SUPER_ADMIN", "EVENT_ADMIN", "VALIDATOR", "REPORT_VIEWER"] as const;

export type AdminRole = (typeof adminRoles)[number];

export function isAdminRole(value: string): value is AdminRole {
  return adminRoles.includes(value as AdminRole);
}
