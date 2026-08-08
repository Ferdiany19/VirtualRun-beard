import { NextResponse } from "next/server";
import { getParticipantSessionToken } from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { getParticipantEvidenceFile } from "@/modules/submissions/submission.service";
import { getRequestContext } from "@/shared/http/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId");
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (!fileId || !session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const file = await getParticipantEvidenceFile({
    session,
    fileId,
    requestContext: await getRequestContext(),
  });

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
