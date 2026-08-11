import {
  createCategoryAction,
  deleteCategoryAction,
  setCategoryActiveAction,
  updateCategoryAction,
} from "@/app/admin/(protected)/events/actions";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import { CategoryForm } from "@/modules/categories/components/category-form";
import { ConfirmDeleteCategoryForm } from "@/modules/categories/components/confirm-delete-category-form";
import { formatDistance } from "@/modules/events/components/event-display";
import { StatusBadge } from "@/shared/ui/status-badge";

type InlineRaceCategoryManagerProps = {
  categories: EventCategoryRecord[];
  csrfToken: string;
  eventId: string;
};

export function InlineRaceCategoryManager({
  categories,
  csrfToken,
  eventId,
}: InlineRaceCategoryManagerProps) {
  return (
    <section
      className="rounded-section border border-border bg-surface p-5 shadow-soft"
      id="kategori"
    >
      <div className="border-b border-border pb-5">
        <p className="eyebrow">Kategori</p>
        <h2 className="mt-2 text-xl font-black text-navy">Race category</h2>
        <p className="mt-1 text-sm leading-6 text-foreground-muted">
          Tambah, ubah, aktifkan, nonaktifkan, atau hapus kategori langsung dari halaman edit event.
        </p>
      </div>

      <div className="mt-5 rounded-app border border-border bg-surface-muted p-4">
        <h3 className="text-base font-bold text-navy">Tambah kategori</h3>
        <p className="mt-1 text-sm text-foreground-muted">
          Kategori baru otomatis dibuat dalam status aktif.
        </p>
        <div className="mt-4">
          <CategoryForm
            action={createCategoryAction.bind(null, eventId)}
            csrfToken={csrfToken}
            submitLabel="Tambah kategori"
          />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {categories.length === 0 ? (
          <div className="rounded-app border border-dashed border-border p-5 text-center text-sm text-foreground-muted">
            Belum ada kategori. Tambahkan minimal satu kategori aktif sebelum publish.
          </div>
        ) : (
          categories.map((category, index) => (
            <article className="rounded-app border border-border p-4" key={category.id}>
              <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="caption-copy font-bold">Kategori {index + 1}</p>
                  <h3 className="mt-1 text-lg font-bold text-navy">{category.name}</h3>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {formatDistance(category.distanceMeters)} · /{category.slug}
                  </p>
                </div>
                <StatusBadge tone={category.isActive ? "success" : "warning"}>
                  {category.isActive ? "Aktif" : "Nonaktif"}
                </StatusBadge>
              </div>

              <div className="mt-4">
                <CategoryForm
                  action={updateCategoryAction.bind(null, eventId, category.id)}
                  category={category}
                  csrfToken={csrfToken}
                  submitLabel="Simpan perubahan kategori"
                />
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap">
                <form
                  action={setCategoryActiveAction.bind(
                    null,
                    eventId,
                    category.id,
                    !category.isActive,
                  )}
                >
                  <input name="csrfToken" type="hidden" value={csrfToken} />
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
                    type="submit"
                  >
                    {category.isActive ? "Nonaktifkan kategori" : "Aktifkan kategori"}
                  </button>
                </form>
                <ConfirmDeleteCategoryForm
                  action={deleteCategoryAction.bind(null, eventId, category.id)}
                  csrfToken={csrfToken}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
