import { NextResponse } from "next/server";
import { getPrivateObject } from "@/modules/storage/storage.service";
import { getParticipantSessionToken } from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const registrationId = url.searchParams.get("registrationId");
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (
    !registrationId ||
    !session ||
    session.summary.registration.id !== registrationId ||
    session.summary.registration.bibStatus !== "READY" ||
    !session.summary.bibObjectKey
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await getPrivateObject(session.summary.bibObjectKey);

  return new NextResponse(new Uint8Array(body), {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, no-store",
      "content-disposition":
        url.searchParams.get("mode") === "preview"
          ? "inline"
          : `attachment; filename="${session.summary.registration.bibNumber}.png"`,
    },
  });
}
