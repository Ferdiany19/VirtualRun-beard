import { notFound } from "next/navigation";
import { ButtonLink } from "@/shared/ui/button";
import { StatusBadge } from "@/shared/ui/status-badge";

export default function FoundationPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen">
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center gap-7">
            <div className="space-y-3">
              <StatusBadge tone="neutral">Development</StatusBadge>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                Foundation technical overview
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Halaman ini hanya tersedia di development untuk memeriksa fondasi teknis.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/admin">Buka admin</ButtonLink>
              <ButtonLink href="/api/health" variant="secondary">
                Cek health endpoint
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
