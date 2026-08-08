import { NextResponse } from "next/server";
import { requireAdminSession } from "@/modules/auth/session";
import { getAdminEvidenceFile } from "@/modules/submissions/submission.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const file = await getAdminEvidenceFile({ admin, fileId });

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "content-type": file.detectedMimeType,
      "cache-control": "private, no-store",
      "content-disposition":
        url.searchParams.get("mode") === "preview"
          ? "inline"
          : `attachment; filename="${file.originalFilename}"`,
    },
  });
}
