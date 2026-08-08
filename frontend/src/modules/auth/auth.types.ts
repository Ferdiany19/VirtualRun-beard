import type { AdminRole } from "@/modules/auth/domain/admin-role";

export type AdminUser = {
  id: string;
  normalizedEmail: string;
  displayEmail: string;
  fullName: string;
  status: "ACTIVE" | "DISABLED";
  roles: AdminRole[];
  createdAt: Date;
  updatedAt: Date;
};

export type AdminUserWithPassword = AdminUser & {
  passwordHash: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
};

export type AuthenticatedAdmin = AdminUser & {
  sessionId: string;
  sessionExpiresAt: Date;
  csrfTokenHash: string;
};

export type AdminSessionTokens = {
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
};
