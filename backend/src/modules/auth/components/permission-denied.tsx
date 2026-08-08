import Link from "next/link";

export function PermissionDenied() {
  return (
    <section className="rounded-section border border-border bg-surface p-6 text-center shadow-soft">
      <p className="text-sm font-bold text-danger">Akses ditolak</p>
      <h2 className="mt-2 text-2xl font-bold text-navy">Akun admin belum dapat membuka halaman ini.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-foreground-muted">
        Pastikan akun admin masih aktif, lalu coba masuk kembali atau hubungi pengelola sistem.
      </p>
      <Link
        className="mt-5 inline-flex min-h-11 items-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
        href="/admin"
      >
        Kembali ke dashboard
      </Link>
    </section>
  );
}
