import { redirect } from "next/navigation";
import {
  getParticipantCsrfTokenForForm,
  getParticipantSessionToken,
} from "@/modules/registrations/participant-session";
import { getRegistrationForParticipantSession } from "@/modules/registrations/registration.service";
import { ParticipantSubmissionFormView } from "@/modules/submissions/components/submission-views";
import { getParticipantSubmissionDetailForSession } from "@/modules/submissions/submission.service";
import { submitParticipantRevisionAction } from "@/app/(public)/events/[slug]/participant/submissions/[registrationCategoryId]/actions";
import { createSubmissionFormState } from "@/modules/submissions/submission-form-state";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParticipantSubmissionFormPageProps = {
  params: Promise<{ slug: string; registrationCategoryId: string }>;
};

export default async function ParticipantSubmissionFormPage({
  params,
}: ParticipantSubmissionFormPageProps) {
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
  const csrfToken = await getParticipantCsrfTokenForForm(session);

  return (
    <ParticipantSubmissionFormView
      action={submitParticipantRevisionAction.bind(null, slug, registrationCategoryId)}
      csrfToken={csrfToken}
      detail={detail}
      initialState={createSubmissionFormState(detail, randomUUID())}
    />
  );
}
