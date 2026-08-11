import Link from "next/link";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import { formatDistance } from "@/modules/events/components/event-display";
import { StatusBadge } from "@/shared/ui/status-badge";
import { Icon } from "@/shared/ui/icons";

type RaceCategoryListProps = {
  categories: EventCategoryRecord[];
  eventId: string;
};

function formatPrice(amountCents: number, currency: string): string {
  if (amountCents <= 0) {
    return "Gratis";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function RaceCategoryList({ categories, eventId }: RaceCategoryListProps) {
  return (
    <div className="grid gap-3">
      {categories.length === 0 ? (
        <div className="rounded-app border border-dashed border-border bg-surface-muted p-4 text-sm text-foreground-muted">
          Belum ada kategori untuk event ini.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-app border border-border">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-surface-muted text-xs text-foreground-muted">
              <tr>
                <th className="px-4 py-3 font-bold">Kategori</th>
                <th className="px-4 py-3 font-bold">Jarak</th>
                <th className="px-4 py-3 font-bold">Harga</th>
                <th className="px-4 py-3 font-bold">Kuota</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-navy">{category.name}</p>
                    <p className="mt-1 text-xs text-foreground-muted">/{category.slug}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-navy">
                    {formatDistance(category.distanceMeters)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">
                    {formatPrice(category.priceAmountCents, category.priceCurrency)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">
                    {category.participantQuota ?? "Tanpa batas"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={category.isActive ? "success" : "warning"}>
                      {category.isActive ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link
        className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-app border border-border px-4 py-2 text-sm font-bold text-navy hover:border-primary hover:text-primary"
        href={`/admin/events/${eventId}/categories`}
      >
        Kelola kategori
        <Icon className="h-4 w-4" name="arrow-right" />
      </Link>
    </div>
  );
}
