import Link from "next/link";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: AdminPageHeaderProps) {
  void eyebrow;

  return (
    <section className="border-b-2 border-navy pb-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight text-navy sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">{description}</p>
          ) : null}
        </div>
        {actionHref && actionLabel ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-app border-2 border-navy bg-navy px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
