"use client";

import { useState, type ReactNode } from "react";
import { AdminMobileMenu, AdminSidebar } from "@/modules/events/components/admin-sidebar";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Icon } from "@/shared/ui/icons";

type AdminShellFrameProps = {
  activeEventId: string | null;
  adminFullName: string;
  adminRoles: string[];
  canManageEvents: boolean;
  canViewValidation: boolean;
  csrfToken: string;
  initialSidebarCollapsed: boolean;
  logoutAction: (formData: FormData) => Promise<void>;
  pendingUploadCount: number;
  children: ReactNode;
};

export function AdminShellFrame({
  activeEventId,
  adminFullName,
  adminRoles,
  canManageEvents,
  canViewValidation,
  csrfToken,
  initialSidebarCollapsed,
  logoutAction,
  pendingUploadCount,
  children,
}: AdminShellFrameProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebarCollapsed);
  const primaryRole = adminRoles[0] ?? "ADMIN";

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      document.cookie = `virtual_run_admin_sidebar_collapsed=${String(next)}; Path=/admin; Max-Age=31536000; SameSite=Lax`;
      return next;
    });
  }

  return (
    <div
      className={[
        "min-h-screen bg-background text-foreground lg:grid",
        sidebarCollapsed
          ? "lg:grid-cols-[76px_minmax(0,1fr)]"
          : "lg:grid-cols-[232px_minmax(0,1fr)]",
      ].join(" ")}
    >
      <AdminSidebar
        activeEventId={activeEventId}
        canManageEvents={canManageEvents}
        canViewValidation={canViewValidation}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        pendingUploadCount={pendingUploadCount}
      />
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-border bg-surface">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <AdminMobileMenu
                activeEventId={activeEventId}
                canManageEvents={canManageEvents}
                canViewValidation={canViewValidation}
                pendingUploadCount={pendingUploadCount}
              />
              <div className="lg:hidden">
                <BrandLogo compact href="/admin" />
              </div>
              <form action="/admin/events" className="relative hidden w-[380px] lg:block">
                <Icon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted"
                  name="search"
                />
                <input
                  aria-label="Cari event"
                  className="h-10 w-full rounded-app border border-border bg-surface pl-9 pr-3 text-xs text-navy placeholder:text-foreground-muted focus:border-primary focus:outline-none"
                  name="search"
                  placeholder="Cari event..."
                  type="search"
                />
              </form>
            </div>
            <details className="relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-app border border-border bg-surface px-3 py-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {adminFullName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("") || "AD"}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-bold text-navy">{adminFullName}</span>
                  <span className="block text-xs text-foreground-muted">{primaryRole}</span>
                </span>
              </summary>
              <div className="absolute right-0 z-40 mt-2 w-72 rounded-app border border-border bg-surface p-3 shadow-floating">
                <p className="text-sm font-bold text-navy">{adminFullName}</p>
                <p className="mt-1 text-xs text-foreground-muted">{adminRoles.join(", ")}</p>
                <form action={logoutAction} className="mt-3">
                  <input name="csrfToken" type="hidden" value={csrfToken} />
                  <button className="min-h-11 w-full rounded-app border border-border bg-surface px-4 py-2 text-sm font-bold text-danger hover:border-danger">
                    Keluar
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
