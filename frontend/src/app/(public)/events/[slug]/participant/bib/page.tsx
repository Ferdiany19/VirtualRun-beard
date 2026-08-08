import { redirect } from "next/navigation";
import { ParticipantBibView } from "@/modules/registrations/components/registration-views";
import { getParticipantSessionToken } from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantBibPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ParticipantBibPage({ params }: ParticipantBibPageProps) {
  const { slug } = await params;
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (!session || session.summary.event.slug !== slug) {
    redirect(`/events/${slug}/participant`);
  }

  return <ParticipantBibView summary={session.summary} />;
}
