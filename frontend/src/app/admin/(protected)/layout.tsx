import { logoutAction } from "@/app/admin/(protected)/actions";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { AdminShell } from "@/modules/events/components/admin-shell";

export const runtime = "nodejs";

type ProtectedAdminLayoutProps = {
  children: React.ReactNode;
};

export default async function ProtectedAdminLayout({ children }: ProtectedAdminLayoutProps) {
  const admin = await requireAdminSession();
  const csrfToken = await getAdminCsrfTokenForForm(admin);

  return (
    <AdminShell admin={admin} csrfToken={csrfToken} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
