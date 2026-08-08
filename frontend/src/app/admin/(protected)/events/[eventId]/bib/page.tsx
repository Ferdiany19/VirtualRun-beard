import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { uploadBibTemplateDraftAction } from "@/app/admin/(protected)/bib-templates/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { FormMessage } from "@/modules/events/components/form-message";
import { Icon } from "@/shared/ui/icons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BibPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

type BibPageData = {
  settings: {
    activeTemplateVersionId: string | null;
  };
  templates: Array<{
    id: string;
    isActive: boolean;
  }>;
};

function apiUrl(pathname: string): string {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  return new URL(pathname, baseUrl).toString();
}

async function fetchBibPageData(eventId: string): Promise<BibPageData> {
  const response = await fetch(apiUrl(`/api/admin/events/${eventId}/bib`), {
    cache: "no-store",
    headers: { cookie: (await cookies()).toString() },
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat data BIB event (${response.status}).`);
  }

  return (await response.json()) as BibPageData;
}

export default async function AdminBibCompatibilityPage({ params, searchParams }: BibPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const { eventId } = await params;
  const query = await searchParams;
  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const data = await fetchBibPageData(eventId);
  const targetTemplateId =
    data.settings.activeTemplateVersionId ??
    data.templates.find((template) => template.isActive)?.id ??
    data.templates[0]?.id;

  if (targetTemplateId) {
    redirect(`/admin/bib-templates/${targetTemplateId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <div>
        <Link className="text-sm font-bold text-primary" href="/admin/bib-templates">
          Kembali ke BIB Template
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-navy">Template BIB</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          Event ini belum memiliki template. Upload file template pertama untuk membuka editor
          terpadu.
        </p>
      </div>
      <form
        action={uploadBibTemplateDraftAction.bind(null, eventId)}
        className="rounded-section border border-border bg-surface p-5 shadow-soft"
      >
        <input name="csrfToken" type="hidden" value={csrfToken} />
        <label className="grid min-h-40 cursor-pointer place-items-center rounded-app border border-dashed border-border bg-background p-6 text-center text-sm text-navy hover:border-primary">
          <span>
            <Icon className="mx-auto h-8 w-8 text-primary" name="image" />
            <span className="mt-3 block font-bold">Upload template BIB pertama</span>
            <span className="text-xs text-foreground-muted">
              Gunakan PNG/JPG desain BIB, lalu atur posisi elemen di editor.
            </span>
          </span>
          <input accept="image/png,image/jpeg" className="sr-only" name="template" type="file" />
        </label>
        <button className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-app bg-action px-4 text-sm font-bold text-white hover:bg-action-hover">
          <Icon className="h-4 w-4" name="upload" />
          Upload Template
        </button>
      </form>
    </div>
  );
}
