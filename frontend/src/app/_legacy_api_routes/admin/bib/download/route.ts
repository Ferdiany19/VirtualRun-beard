import { NextResponse } from "next/server";
import { requireAdminSession } from "@/modules/auth/session";
import { getEventRegistrationForAdmin } from "@/modules/registrations/registration.service";
import { getPrivateObject } from "@/modules/storage/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  const url = new URL(request.url);
  const registrationId = url.searchParams.get("registrationId");

  if (!registrationId) {
    return NextResponse.json({ error: "missing_registration" }, { status: 400 });
  }

  const summary = await getEventRegistrationForAdmin({ registrationId, admin });

  if (summary.registration.bibStatus !== "READY" || !summary.bibObjectKey) {
    return NextResponse.json({ error: "bib_not_ready" }, { status: 404 });
  }

  const body = await getPrivateObject(summary.bibObjectKey);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${summary.registration.bibNumber}.png"`,
    },
  });
}
