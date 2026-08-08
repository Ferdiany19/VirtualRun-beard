import { notFound } from "next/navigation";
import { getPublicEventBySlug } from "@/modules/events/event.service";
import { getParticipantSessionToken } from "@/modules/registrations/participant-session";
import { ParticipantAccessView } from "@/modules/registrations/components/registration-views";
import { participantAccessAction } from "@/app/(public)/events/[slug]/participant/actions";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { ParticipantSubmissionDashboardView } from "@/modules/submissions/components/submission-views";
import { getParticipantSubmissionDashboard } from "@/modules/submissions/submission.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantAccessPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ParticipantAccessPage({
  params,
  searchParams,
}: ParticipantAccessPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await getPublicEventBySlug(slug).catch(() => null);

  if (!data) {
    notFound();
  }

  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (session && session.summary.event.slug === slug) {
    const categories = await getParticipantSubmissionDashboard(session);
    return <ParticipantSubmissionDashboardView categories={categories} session={session} />;
  }

  return (
    <ParticipantAccessView
      action={participantAccessAction.bind(null, slug)}
      error={query.error}
      event={data.event}
    />
  );
}
