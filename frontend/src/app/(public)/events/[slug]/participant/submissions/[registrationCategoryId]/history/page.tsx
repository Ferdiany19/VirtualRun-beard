import { redirect } from "next/navigation";
import { getParticipantSessionToken } from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { ParticipantSubmissionHistoryView } from "@/modules/submissions/components/submission-views";
import { getParticipantSubmissionDetailForSession } from "@/modules/submissions/submission.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantSubmissionHistoryPageProps = {
  params: Promise<{ slug: string; registrationCategoryId: string }>;
};

export default async function ParticipantSubmissionHistoryPage({
  params,
}: ParticipantSubmissionHistoryPageProps) {
  const { slug, registrationCategoryId } = await params;
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (!session || session.summary.event.slug !== slug) {
    redirect(`/events/${slug}/participant`);
  }

  const detail = await getParticipantSubmissionDetailForSession({
    session,
    eventSlug: slug,
    registrationCategoryId,
  });

  return <ParticipantSubmissionHistoryView detail={detail} />;
}
