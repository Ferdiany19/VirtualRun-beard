import { redirect } from "next/navigation";
import {
  getParticipantCsrfTokenForForm,
  getParticipantSessionToken,
} from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { ParticipantSubmissionFormView } from "@/modules/submissions/components/submission-views";
import { getParticipantSubmissionDetailForSession } from "@/modules/submissions/submission.service";
import { submitParticipantRevisionAction } from "@/app/(public)/events/[slug]/participant/submissions/[registrationCategoryId]/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantSubmissionFormPageProps = {
  params: Promise<{ slug: string; registrationCategoryId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ParticipantSubmissionFormPage({
  params,
  searchParams,
}: ParticipantSubmissionFormPageProps) {
  const { slug, registrationCategoryId } = await params;
  const query = await searchParams;
  const session = await getRegistrationForParticipantSession(await getParticipantSessionToken());

  if (!session || session.summary.event.slug !== slug) {
    redirect(`/events/${slug}/participant`);
  }

  const detail = await getParticipantSubmissionDetailForSession({
    session,
    eventSlug: slug,
    registrationCategoryId,
  });
  const csrfToken = await getParticipantCsrfTokenForForm(session);

  return (
    <ParticipantSubmissionFormView
      action={submitParticipantRevisionAction.bind(null, slug, registrationCategoryId)}
      csrfToken={csrfToken}
      detail={detail}
      error={query.error}
    />
  );
}
