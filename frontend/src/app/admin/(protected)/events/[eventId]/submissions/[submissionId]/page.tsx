import {
  claimSubmissionAction,
  releaseSubmissionClaimAction,
  saveValidationDecisionAction,
} from "@/app/admin/(protected)/events/[eventId]/submissions/[submissionId]/actions";
import { getAdminCsrfTokenForForm, requireAdminSession } from "@/modules/auth/session";
import { AdminPageHeader } from "@/modules/events/components/admin-page-header";
import { FormMessage } from "@/modules/events/components/form-message";
import { ValidationDetailView } from "@/modules/validation/components/validation-views";
import {
  getValidationEvent,
  getValidationSubmissionDetail,
} from "@/modules/validation/validation.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminSubmissionDetailPageProps = {
  params: Promise<{ eventId: string; submissionId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function AdminSubmissionDetailPage({
  params,
  searchParams,
}: AdminSubmissionDetailPageProps) {
  const admin = await requireAdminSession();
  const csrfToken = await getAdminCsrfTokenForForm(admin);
  const { eventId, submissionId } = await params;
  const query = await searchParams;
  const event = await getValidationEvent({ eventId, admin });
  const detail = await getValidationSubmissionDetail({ submissionId, admin });
  const claimAction = claimSubmissionAction.bind(null, event.id, submissionId);
  const releaseAction = releaseSubmissionClaimAction.bind(null, event.id, submissionId);
  const decisionAction = saveValidationDecisionAction.bind(null, event.id, submissionId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        actionHref={`/admin/events/${event.id}/submissions`}
        actionLabel="Kembali"
        description="Claim submission sebelum menyimpan approve, request revision, reject, atau disqualify."
        eyebrow="Validation Detail"
        title={`${event.name} - ${detail.participant.fullName}`}
      />
      <FormMessage error={query.error ?? null} success={query.success ?? null} />
      <ValidationDetailView
        admin={admin}
        claimAction={claimAction}
        csrfToken={csrfToken}
        decisionAction={decisionAction}
        detail={detail}
        releaseAction={releaseAction}
      />
    </div>
  );
}
