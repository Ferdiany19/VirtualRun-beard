import Link from "next/link";
import { BrandLogo } from "@/shared/ui/brand-logo";
import { Icon } from "@/shared/ui/icons";

type PublicHeaderProps = {
  active?: "home" | "events";
};

const publicNavigation = [
  { href: "/", label: "Beranda", key: "home" },
  { href: "/events", label: "Event", key: "events" },
  { href: "/#cara-kerja", label: "Cara Kerja", key: "how" },
  { href: "#kontak", label: "Kontak", key: "contact" },
] as const;

export function PublicHeader({ active }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="app-container flex h-16 items-center justify-between gap-4">
        <BrandLogo />
        <nav aria-label="Navigasi publik" className="hidden items-center gap-8 text-sm lg:flex">
          {publicNavigation.map((item) => {
            const isActive = active === item.key;

            return (
              <Link
                key={item.href}
                className={[
                  "relative font-bold text-navy transition-colors hover:text-primary",
                  isActive
                    ? "after:absolute after:-bottom-5 after:left-0 after:h-0.5 after:w-full after:bg-primary"
                    : "",
                ].join(" ")}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-app bg-action px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-action-hover"
            href="/events"
          >
            Lihat Event
          </Link>
        </div>
        <details className="relative lg:hidden">
          <summary className="inline-flex min-h-11 w-11 cursor-pointer list-none items-center justify-center rounded-app border border-border text-navy">
            <span className="sr-only">Buka menu navigasi</span>
            <Icon name="menu" />
          </summary>
          <div className="absolute right-0 top-12 z-40 w-72 rounded-app border border-border bg-surface p-2 shadow-floating">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                className="flex min-h-11 items-center rounded-app px-3 text-sm font-bold text-navy hover:bg-surface-muted hover:text-primary"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="mt-2 flex min-h-11 items-center justify-center rounded-app bg-action px-3 text-sm font-bold text-white"
              href="/events"
            >
              Lihat Event
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

type PublicFooterProps = {
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export function PublicFooter({ contactEmail, contactPhone }: PublicFooterProps) {
  return (
    <footer id="kontak" className="bg-navy text-white">
      <div className="app-container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr]">
        <div>
          <BrandLogo inverted />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
            Platform event virtual run untuk membantu organizer menyiapkan event, kategori, dan alur
            peserta yang rapi.
          </p>
        </div>
        <nav aria-label="Navigasi footer">
          <h2 className="text-sm font-bold">Navigasi</h2>
          <div className="mt-3 grid gap-2 text-sm text-white/75">
            <Link className="hover:text-white" href="/">
              Beranda
            </Link>
            <Link className="hover:text-white" href="/events">
              Event
            </Link>
            <Link className="hover:text-white" href="/#cara-kerja">
              Cara Kerja
            </Link>
          </div>
        </nav>
        <div>
          <h2 className="text-sm font-bold">Kontak</h2>
          <div className="mt-3 grid gap-3 text-sm text-white/75">
            <p className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" name="mail" />
              {contactEmail ?? "Kontak organizer belum tersedia"}
            </p>
            {contactPhone ? (
              <p className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" name="user" />
                {contactPhone}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="app-container flex flex-col gap-2 py-4 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 VirtualRun Beard.</p>
          <p>Kebijakan publik akan dibuka saat modul peserta tersedia.</p>
        </div>
      </div>
    </footer>
  );
}
