import ExcelJS from "exceljs";
import { requireAdminSession } from "@/modules/auth/session";
import { eventStatuses } from "@/modules/events/domain/event-status";
import { publicationStatuses } from "@/modules/events/event.schema";
import { listManageableEventListItems } from "@/modules/events/event.service";
import type { ManageableEventListItem } from "@/modules/events/event.types";
import { eventStatusLabel, formatDistance } from "@/modules/events/components/event-display";
import { formatBusinessDate } from "@/shared/date/business-timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const periods = ["UPCOMING", "ONGOING", "PAST"] as const;

export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdminSession();
  const url = new URL(request.url);
  const statusValue = url.searchParams.get("status");
  const publicationValue = url.searchParams.get("publication");
  const periodValue = url.searchParams.get("period");
  const search = url.searchParams.get("search")?.trim() || null;
  const eventStatus = eventStatuses.find((item) => item === statusValue) ?? null;
  const publicationStatus = publicationStatuses.find((item) => item === publicationValue) ?? null;
  const period = periods.find((item) => item === periodValue) ?? null;
  const items: ManageableEventListItem[] = [];

  for (let page = 1; page <= 100; page += 1) {
    const batch = await listManageableEventListItems(admin, {
      search,
      eventStatus,
      publicationStatus,
      period,
      page,
      pageSize: 100,
    });
    items.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VirtualRun Beard Admin";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet("Daftar Event", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: "Nama Event", key: "name", width: 34 },
    { header: "Slug", key: "slug", width: 30 },
    { header: "Status", key: "status", width: 22 },
    { header: "Publikasi", key: "publication", width: 16 },
    { header: "Periode Pendaftaran", key: "registration", width: 34 },
    { header: "Periode Lari", key: "activity", width: 34 },
    { header: "Upload Hasil", key: "upload", width: 34 },
    { header: "Kategori", key: "categories", width: 36 },
    { header: "Pendaftar Aktif", key: "registrations", width: 18 },
  ];

  for (const item of items) {
    worksheet.addRow({
      name: item.event.name,
      slug: item.event.slug,
      status: eventStatusLabel(item.event.eventStatus),
      publication: item.event.publicationStatus,
      registration: `${formatBusinessDate(item.event.registrationStartsAt)} – ${formatBusinessDate(item.event.registrationEndsAt)}`,
      activity: `${formatBusinessDate(item.event.activityStartsAt)} – ${formatBusinessDate(item.event.activityEndsAt)}`,
      upload: `${formatBusinessDate(item.event.uploadStartsAt)} – ${formatBusinessDate(item.event.uploadEndsAt)}`,
      categories: item.categories
        .map((category) => `${formatDistance(category.distanceMeters)} · ${category.name}`)
        .join(", "),
      registrations: item.activeRegistrationCount,
    });
  }

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF007F73" },
  };
  worksheet.getRow(1).height = 24;
  worksheet.autoFilter = { from: "A1", to: "I1" };
  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "top", wrapText: true };

    if (rowNumber > 1 && rowNumber % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4F8F7" },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `event-virtual-run-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
