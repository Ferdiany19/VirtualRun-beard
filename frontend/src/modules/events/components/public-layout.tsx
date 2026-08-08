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
    <header className="sticky top-0 z-30 border-b-[3px] border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)]">
      <div className="app-container flex h-20 items-center justify-between gap-4 lg:h-[4.5rem]">
        <BrandLogo />
        <p className="hidden text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-landing-ink-2)] lg:block">
          Virtual run · Indonesia
        </p>
        <details className="relative lg:hidden">
          <summary className="landing-action inline-flex min-h-11 w-11 cursor-pointer list-none items-center justify-center border-2 border-[var(--color-landing-ink)] text-[var(--color-landing-ink)]">
            <span className="sr-only">Buka menu navigasi</span>
            <Icon name="menu" />
          </summary>
          <div className="absolute right-0 top-14 z-40 w-[min(18rem,calc(100vw-2rem))] border-2 border-[var(--color-landing-ink)] bg-[var(--color-landing-paper)] p-2">
            {publicNavigation.map((item) => (
              <Link
                key={item.href}
                className="landing-action flex min-h-11 items-center border-b border-[var(--color-landing-rule)] px-3 text-sm font-bold text-[var(--color-landing-ink)] last:border-b-0 hover:bg-[var(--color-landing-ink)] hover:text-[var(--color-landing-white)]"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
      <div className="hidden border-t border-[var(--color-landing-rule)] lg:block">
        <nav
          aria-label="Navigasi publik"
          className="app-container flex h-12 items-center justify-center gap-10 text-xs"
        >
          {publicNavigation.map((item) => {
            const isActive = active === item.key;

            return (
              <Link
                key={item.href}
                className={[
                  "landing-action relative flex h-full items-center font-bold uppercase tracking-[0.08em] text-[var(--color-landing-ink)] hover:text-[var(--color-landing-teal-dark)]",
                  isActive
                    ? "after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:bg-[var(--color-landing-orange)]"
                    : "",
                ].join(" ")}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
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
    <footer id="kontak" className="bg-[var(--color-landing-ink)] text-[var(--color-landing-white)]">
      <div className="app-container py-12 lg:py-16">
        <div className="grid gap-8 border-b border-white/25 pb-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <BrandLogo inverted />
            <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">
              Platform virtual run untuk mengikuti event, menerima BIB, dan mengirim hasil lari
              secara online.
            </p>
          </div>
          <div className="grid min-w-0 gap-5 text-sm text-white/75 sm:grid-cols-2 lg:justify-self-end">
            {contactEmail ? (
              <p className="flex min-w-0 items-center gap-2 break-all">
                <Icon className="h-4 w-4 text-[var(--color-landing-orange)]" name="mail" />
                {contactEmail}
              </p>
            ) : null}
            {contactPhone ? (
              <p className="flex min-w-0 items-center gap-2 break-all">
                <Icon className="h-4 w-4 text-[var(--color-landing-orange)]" name="phone" />
                {contactPhone}
              </p>
            ) : null}
            {!contactEmail && !contactPhone ? (
              <p>Kontak organizer tersedia pada halaman detail event.</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-5 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Navigasi footer" className="flex flex-wrap gap-x-6 gap-y-3">
            <Link className="landing-action hover:text-white" href="/">
              Beranda
            </Link>
            <Link className="landing-action hover:text-white" href="/events">
              Event
            </Link>
            <Link className="landing-action hover:text-white" href="/#cara-kerja">
              Cara Kerja
            </Link>
          </nav>
          <p>© 2026 VirtualRun Beard</p>
        </div>
      </div>
    </footer>
  );
}
