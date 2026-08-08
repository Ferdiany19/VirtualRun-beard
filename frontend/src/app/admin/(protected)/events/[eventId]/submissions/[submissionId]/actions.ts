"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession, validateAdminCsrfToken } from "@/modules/auth/session";
import { errorToSearchParam } from "@/modules/events/components/form-message";
import {
  claimSubmissionForReview,
  releaseSubmissionClaim,
  saveValidationDecision,
} from "@/modules/validation/validation.service";
import type { ValidationDecisionInput } from "@/modules/validation/validation.schema";
import { getRequestContext } from "@/shared/http/request-context";

function submissionPath(eventId: string, submissionId: string, query: string): string {
  return `/admin/events/${eventId}/submissions/${submissionId}?${query}`;
}

export async function claimSubmissionAction(
  eventId: string,
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await claimSubmissionForReview({
      admin,
      form: {
        submissionId: String(formData.get("submissionId") ?? submissionId),
        expectedReviewVersion: Number(formData.get("expectedReviewVersion") ?? 0),
        reason: String(formData.get("reason") ?? "").trim() || null,
      },
      requestContext,
    });
    revalidatePath(`/admin/events/${eventId}/submissions`);
    redirect(submissionPath(eventId, submissionId, "success=claimed"));
  } catch (error) {
    redirect(submissionPath(eventId, submissionId, `error=${errorToSearchParam(error)}`));
  }
}

export async function releaseSubmissionClaimAction(
  eventId: string,
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();

  try {
    await releaseSubmissionClaim({
      admin,
      submissionId: String(formData.get("submissionId") ?? submissionId),
      expectedReviewVersion: Number(formData.get("expectedReviewVersion") ?? 0),
      requestContext,
    });
    revalidatePath(`/admin/events/${eventId}/submissions`);
    redirect(submissionPath(eventId, submissionId, "success=released"));
  } catch (error) {
    redirect(submissionPath(eventId, submissionId, `error=${errorToSearchParam(error)}`));
  }
}

export async function saveValidationDecisionAction(
  eventId: string,
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminSession();
  await validateAdminCsrfToken(formData, admin);
  const requestContext = await getRequestContext();
  const form: ValidationDecisionInput = {
    submissionId: String(formData.get("submissionId") ?? submissionId),
    revisionId: String(formData.get("revisionId") ?? ""),
    expectedReviewVersion: Number(formData.get("expectedReviewVersion") ?? 0),
    action: String(formData.get("action") ?? "") as ValidationDecisionInput["action"],
    reasonCode: String(formData.get("reasonCode") ?? "").trim() || null,
    participantVisibleNote: String(formData.get("participantVisibleNote") ?? "").trim() || null,
    internalNote: String(formData.get("internalNote") ?? "").trim() || null,
  };

  try {
    await saveValidationDecision({ admin, form, requestContext });
    revalidatePath(`/admin/events/${eventId}/submissions`);
    redirect(submissionPath(eventId, submissionId, "success=decision"));
  } catch (error) {
    redirect(submissionPath(eventId, submissionId, `error=${errorToSearchParam(error)}`));
  }
}
