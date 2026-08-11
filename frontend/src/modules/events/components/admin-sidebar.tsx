"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Icon, type IconName } from "@/shared/ui/icons";

type AdminSidebarProps = {
  activeEventId: string | null;
  canManageEvents: boolean;
  canViewValidation: boolean;
  pendingUploadCount: number;
};

type DesktopSidebarProps = AdminSidebarProps & {
  collapsed: boolean;
  onToggle: () => void;
};

type SidebarItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: string | number;
  badgeTone?: "new" | "danger";
  requiresEvent?: boolean;
  requiresEventManagement?: boolean;
  requiresValidation?: boolean;
  match: (pathname: string, searchTab: string | null, eventId: string | null) => boolean;
};

type SidebarSection = {
  group: string | null;
  items: SidebarItem[];
};

function currentEventIdFromPath(pathname: string): string | null {
  const match = /^\/admin\/events\/([^/]+)/.exec(pathname);
  const eventId = match?.[1] ?? null;
  return eventId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(eventId)
    ? eventId
    : null;
}

function eventHref(eventId: string | null, suffix = "") {
  return eventId ? `/admin/events/${eventId}${suffix}` : "/admin/events";
}

function validationHref(kind: "uploads" | "validation") {
  return kind === "uploads"
    ? "/admin/validation/my-queue?status=SUBMITTED"
    : "/admin/validation/my-queue";
}

function navigationForEvent(eventId: string | null, pendingUploadCount: number): SidebarSection[] {
  return [
    {
      group: null,
      items: [
        {
          href: "/admin",
          label: "Dashboard",
          icon: "home",
          match: (pathname) => pathname === "/admin",
        },
      ],
    },
    {
      group: "Operasional",
      items: [
        {
          href: "/admin/events",
          label: "Event",
          icon: "calendar",
          requiresEventManagement: true,
          match: (pathname) => pathname === "/admin/events" || pathname === "/admin/events/new",
        },
        {
          href: eventHref(eventId, "/categories"),
          label: "Kategori Event",
          icon: "grid",
          requiresEvent: true,
          requiresEventManagement: true,
          match: (pathname, _searchTab, currentEventId) =>
            Boolean(currentEventId) && pathname.endsWith("/categories"),
        },
        {
          href: "/admin/participants",
          label: "Peserta",
          icon: "users",
          requiresEventManagement: true,
          match: (pathname) =>
            pathname === "/admin/participants" ||
            (pathname.startsWith("/admin/events/") && pathname.includes("/participants")),
        },
        {
          href: "/admin/bib-templates",
          label: "Template BIB",
          icon: "bib",
          requiresEventManagement: true,
          match: (pathname) =>
            pathname === "/admin/bib-templates" ||
            pathname.startsWith("/admin/bib-templates/") ||
            (pathname.startsWith("/admin/events/") && pathname.endsWith("/bib")),
        },
      ],
    },
    {
      group: "Validasi",
      items: [
        {
          href: validationHref("uploads"),
          label: "Upload Masuk",
          icon: "upload",
          badge: pendingUploadCount > 0 ? pendingUploadCount : undefined,
          badgeTone: "danger",
          requiresValidation: true,
          match: (pathname) => pathname.endsWith("/submissions"),
        },
        {
          href: validationHref("validation"),
          label: "Verifikasi Hasil",
          icon: "shield",
          requiresValidation: true,
          match: (pathname) =>
            pathname.endsWith("/validation") || pathname.startsWith("/admin/validation"),
        },
      ],
    },
    {
      group: "Pengaturan",
      items: [
        {
          href: eventHref(eventId, "/edit"),
          label: "Pengaturan Umum",
          icon: "settings",
          requiresEvent: true,
          requiresEventManagement: true,
          match: (pathname) => pathname.endsWith("/edit"),
        },
      ],
    },
  ];
}

function NavLinks({
  activeEventId,
  canManageEvents,
  canViewValidation,
  pendingUploadCount,
  mobile = false,
  collapsed = false,
}: AdminSidebarProps & { mobile?: boolean; collapsed?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTab = searchParams.get("tab");
  const eventId = currentEventIdFromPath(pathname) ?? activeEventId;
  const navigation = navigationForEvent(eventId, pendingUploadCount);

  return (
    <nav aria-label="Navigasi admin" className="grid gap-6">
      {navigation.map((section) => (
        <div key={section.group ?? "utama"}>
          {section.group ? (
            <p
              className={[
                "px-3 text-[10px] font-black uppercase text-white/45",
                collapsed ? "sr-only" : "",
              ].join(" ")}
            >
              {section.group}
            </p>
          ) : null}
          <div className="mt-2 grid gap-1.5">
            {section.items
              .filter((item) => !item.requiresEventManagement || canManageEvents)
              .filter((item) => !item.requiresValidation || canViewValidation)
              .filter((item) => !item.requiresEvent || Boolean(eventId))
              .map((item) => {
                const active = item.match(pathname, searchTab, currentEventIdFromPath(pathname));

                return (
                  <Link
                    key={item.href}
                    className={[
                      "flex min-h-11 items-center rounded-app border border-transparent text-sm font-bold transition-colors",
                      collapsed ? "justify-center px-2" : "gap-3 px-3",
                      active
                        ? "border-white/15 bg-white text-navy"
                        : "text-white/76 hover:border-white/10 hover:bg-white/10 hover:text-white",
                      mobile ? "text-base" : "",
                    ].join(" ")}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" name={item.icon} />
                    <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>
                      {item.label}
                    </span>
                    {!collapsed && item.badge ? (
                      <span
                        className={[
                          "ml-auto inline-flex min-h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold",
                          item.badgeTone === "danger"
                            ? "bg-danger text-white"
                            : "bg-primary text-white",
                        ].join(" ")}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminSidebar({
  activeEventId,
  canManageEvents,
  canViewValidation,
  collapsed,
  onToggle,
  pendingUploadCount,
}: DesktopSidebarProps) {
  return (
    <aside
      className={[
        "hidden h-screen border-r border-navy-muted bg-navy py-5 text-white transition-[padding] lg:sticky lg:top-0 lg:flex lg:flex-col",
        collapsed ? "px-2" : "px-4",
      ].join(" ")}
    >
      <div
        className={
          collapsed ? "flex flex-col items-center gap-3" : "flex items-center justify-between gap-2"
        }
      >
        <BrandLogo compact={collapsed} href="/admin" inverted />
        <button
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-app border border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
          onClick={onToggle}
          title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          type="button"
        >
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
        </button>
      </div>
      <div className={collapsed ? "mt-6" : "mt-8"}>
        <NavLinks
          activeEventId={activeEventId}
          canManageEvents={canManageEvents}
          canViewValidation={canViewValidation}
          collapsed={collapsed}
          pendingUploadCount={pendingUploadCount}
        />
      </div>
      {collapsed ? null : (
        <footer className="mt-auto border-t border-white/10 pt-4 text-xs leading-5 text-white/55">
          <p className="font-bold text-white/80">VirtualRun Admin</p>
          <p className="mt-2">Event, peserta, BIB, validasi, sertifikat.</p>
        </footer>
      )}
    </aside>
  );
}

export function AdminMobileMenu({
  activeEventId,
  canManageEvents,
  canViewValidation,
  pendingUploadCount,
}: AdminSidebarProps) {
  return (
    <details className="relative lg:hidden">
      <summary className="inline-flex min-h-11 w-11 cursor-pointer list-none items-center justify-center rounded-app border border-border text-navy">
        <span className="sr-only">Buka menu admin</span>
        <Icon name="menu" />
      </summary>
      <div className="fixed inset-x-0 top-16 z-40 border-b border-border bg-surface p-4 shadow-floating">
        <NavLinks
          activeEventId={activeEventId}
          canManageEvents={canManageEvents}
          canViewValidation={canViewValidation}
          mobile
          pendingUploadCount={pendingUploadCount}
        />
      </div>
    </details>
  );
}
