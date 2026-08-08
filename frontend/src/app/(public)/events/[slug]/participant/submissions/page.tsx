import { redirect } from "next/navigation";
import { getParticipantSessionToken } from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { ParticipantSubmissionListView } from "@/modules/submissions/components/submission-views";
import { getParticipantSubmissionDashboard } from "@/modules/submissions/submission.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantSubmissionsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ParticipantSubmissionsPage({
  params,
}: ParticipantSubmissionsPageProps) {
  const { slug } = await params;
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (!session || session.summary.event.slug !== slug) {
    redirect(`/events/${slug}/participant`);
  }

  const categories = await getParticipantSubmissionDashboard(session);

  return <ParticipantSubmissionListView categories={categories} event={session.summary.event} />;
}
