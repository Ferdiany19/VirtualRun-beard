import { NextResponse } from "next/server";
import { requireAdminSession } from "@/modules/auth/session";
import { getBibTemplatePreviewForAdmin } from "@/modules/bib/bib.service";
import { isApplicationError } from "@/shared/errors/application-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  const templateVersionId = new URL(request.url).searchParams.get("templateVersionId");

  if (!templateVersionId) {
    return NextResponse.json({ error: "Template version wajib diisi." }, { status: 400 });
  }

  try {
    const { buffer } = await getBibTemplatePreviewForAdmin({ templateVersionId, admin });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    const status = isApplicationError(error) ? error.statusCode : 500;
    const message = isApplicationError(error) ? error.safeMessage : "Template belum dapat dibuka.";

    return NextResponse.json({ error: message }, { status });
  }
}
