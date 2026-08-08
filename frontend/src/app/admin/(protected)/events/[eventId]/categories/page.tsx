import Link from "next/link";
import {
  createCategoryAction,
  setCategoryActiveAction,
  updateCategoryAction,
} from "@/app/admin/(protected)/events/actions";
import { canAccessEventManagement } from "@/modules/auth/auth.policy";
import { PermissionDenied } from "@/modules/auth/components/permission-denied";
import { CategoryForm } from "@/modules/categories/components/category-form";
import { listManageableCategories } from "@/modules/categories/category.service";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { getManageableEvent } from "@/modules/events/event.service";
import { formatDistance } from "@/modules/events/components/event-display";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Icon } from "@/shared/ui/icons";

type CategoriesPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function EventCategoriesPage({ params, searchParams }: CategoriesPageProps) {
  const admin = await requireAdminSession();

  if (!canAccessEventManagement(admin)) {
    return <PermissionDenied />;
  }

  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const { eventId } = await params;
  const query = await searchParams;
  const event = await getManageableEvent(eventId, admin);
  const categories = await listManageableCategories(event.id, admin);
  const activeCategoryCount = categories.filter((category) => category.isActive).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        description="Kategori tidak dihapus hard delete. Gunakan aktif/nonaktif untuk mengendalikan visibilitas dan kesiapan publish."
        eyebrow="Kategori"
        title={`Kategori ${event.name}`}
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                1
              </span>
              <div>
                <h2 className="text-lg font-bold text-navy">Tambah kategori</h2>
                <p className="mt-1 text-sm leading-6 text-foreground-muted">
                  Tambahkan jarak yang akan ditampilkan pada public event.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <CategoryForm
                action={createCategoryAction.bind(null, event.id)}
                csrfToken={csrfToken}
                submitLabel="Tambah kategori"
              />
            </div>
          </section>

          <section className="space-y-4">
            {categories.length === 0 ? (
              <div className="rounded-section border border-border bg-surface p-6 text-center text-sm text-foreground-muted">
                Belum ada kategori. Tambahkan minimal satu kategori aktif sebelum publish.
              </div>
            ) : (
              categories.map((category, index) => (
                <article
                  key={category.id}
                  className="rounded-section border border-border bg-surface p-5 shadow-soft"
                >
                  <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="caption-copy font-bold">Kategori {index + 1}</p>
                      <h2 className="mt-1 text-lg font-bold text-navy">{category.name}</h2>
                      <p className="mt-1 text-sm text-foreground-muted">
                        {formatDistance(category.distanceMeters)} - slug {category.slug}
                      </p>
                    </div>
                    <StatusBadge tone={category.isActive ? "success" : "warning"}>
                      {category.isActive ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </div>
                  <div className="mt-5">
                    <CategoryForm
                      action={updateCategoryAction.bind(null, event.id, category.id)}
                      category={category}
                      csrfToken={csrfToken}
                      submitLabel="Simpan kategori"
                    />
                  </div>
                  <form
                    action={setCategoryActiveAction.bind(
                      null,
                      event.id,
                      category.id,
                      !category.isActive,
                    )}
                    className="mt-4"
                  >
                    <input name="csrfToken" type="hidden" value={csrfToken} />
                    <button className="min-h-11 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary">
                      {category.isActive ? "Nonaktifkan kategori" : "Aktifkan kategori"}
                    </button>
                  </form>
                </article>
              ))
            )}
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <section className="rounded-section border border-border bg-surface p-5 shadow-soft">
            <p className="eyebrow">Ringkasan</p>
            <h2 className="mt-2 text-lg font-bold text-navy">Kesiapan publish</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="rounded-app bg-surface-muted p-3">
                <dt className="caption-copy font-bold">Total kategori</dt>
                <dd className="mt-1 text-2xl font-bold text-navy">{categories.length}</dd>
              </div>
              <div className="rounded-app bg-surface-muted p-3">
                <dt className="caption-copy font-bold">Kategori aktif</dt>
                <dd className="mt-1 text-2xl font-bold text-navy">{activeCategoryCount}</dd>
              </div>
            </dl>
            <p className="caption-copy mt-4">
              Event membutuhkan minimal satu kategori aktif sebelum bisa dipublish.
            </p>
          </section>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-app border border-border bg-surface px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
            href={`/admin/events/${event.id}`}
          >
            <Icon className="h-4 w-4" name="arrow-right" />
            Kembali ke event
          </Link>
        </aside>
      </section>
    </div>
  );
}
