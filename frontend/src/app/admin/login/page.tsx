import { redirect } from "next/navigation";
import { loginAction } from "@/app/admin/login/actions";
import { getCurrentAdminSession } from "@/modules/auth/session";
import { FormMessage } from "@/modules/events/components/form-message";
import { BrandLogo } from "@/shared/ui/brand-logo";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const session = await getCurrentAdminSession();

  if (session) {
    redirect("/admin");
  }

  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 sm:px-6">
      <section
        aria-labelledby="admin-login-title"
        className="w-full max-w-[440px] rounded-section border border-border bg-surface p-5 shadow-soft sm:p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <BrandLogo />
          <span className="rounded-app border border-border bg-surface-muted px-3 py-1.5 text-xs font-bold text-navy">
            Admin
          </span>
        </div>

        <div className="mt-6">
          <p className="eyebrow">VirtualRun Beard</p>
          <h1 id="admin-login-title" className="mt-2 text-2xl font-bold leading-tight text-navy">
            Masuk ke dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Gunakan akun admin yang sudah terdaftar untuk mengelola event, peserta, BIB, dan
            validasi hasil lari.
          </p>
        </div>

        <div className="mt-5">
          <FormMessage error={params.error ?? null} />
        </div>

        <form action={loginAction} className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-bold text-navy" htmlFor="email">
              Email
            </label>
            <input
              autoComplete="email"
              className="form-control"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-bold text-navy" htmlFor="password">
              Password
            </label>
            <input
              autoComplete="current-password"
              className="form-control"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>
          <button className="min-h-11 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover">
            Masuk
          </button>
        </form>
      </section>
    </main>
  );
}
