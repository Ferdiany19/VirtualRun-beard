import { redirect } from "next/navigation";
import { RegistrationSuccessView } from "@/modules/registrations/components/registration-success-view";
import { getParticipantSessionToken } from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmationPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { slug } = await params;
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (!session || session.summary.event.slug !== slug) {
    redirect(`/events/${slug}/participant`);
  }

  return (
    <RegistrationSuccessView
      registrationCode={session.registrationCode}
      summary={session.summary}
    />
  );
}
