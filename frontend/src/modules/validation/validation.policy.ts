import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";
import type { SubmissionStatus } from "@/modules/submissions/submission.types";
import type {
  DisqualificationReasonCode,
  RejectionReasonCode,
  RevisionRequestReasonCode,
  ValidationAction,
  ValidationReasonCode,
} from "@/modules/validation/validation.types";
import {
  disqualificationReasonCodes,
  rejectionReasonCodes,
  revisionRequestReasonCodes,
} from "@/modules/validation/validation.schema";
import { ApplicationError } from "@/shared/errors/application-error";

export function canViewValidation(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  void admin;
  return true;
}

export function canActOnValidation(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  void admin;
  return true;
}

export function canManageValidatorAssignments(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  void admin;
  return true;
}

export function canDisqualifySubmission(admin: Pick<AuthenticatedAdmin, "roles">): boolean {
  void admin;
  return true;
}

export function isClaimActive(expiresAt: Date | null): boolean {
  return Boolean(expiresAt && expiresAt > new Date());
}

export function assertStatusTransition(input: {
  action: ValidationAction;
  previousStatus: SubmissionStatus;
}): SubmissionStatus {
  const transitions: Partial<
    Record<ValidationAction, Partial<Record<SubmissionStatus, SubmissionStatus>>>
  > = {
    START_REVIEW: {
      SUBMITTED: "UNDER_REVIEW",
      UNDER_REVIEW: "UNDER_REVIEW",
    },
    RELEASE_CLAIM: {
      UNDER_REVIEW: "SUBMITTED",
    },
    APPROVE: {
      SUBMITTED: "APPROVED",
      UNDER_REVIEW: "APPROVED",
    },
    REQUEST_REVISION: {
      SUBMITTED: "REVISION_REQUIRED",
      UNDER_REVIEW: "REVISION_REQUIRED",
    },
    REJECT: {
      SUBMITTED: "REJECTED",
      UNDER_REVIEW: "REJECTED",
    },
    DISQUALIFY: {
      UNDER_REVIEW: "DISQUALIFIED",
    },
    REOPEN_SUBMISSION: {
      APPROVED: "UNDER_REVIEW",
      REJECTED: "UNDER_REVIEW",
    },
    RESTORE_TO_REVIEW: {
      REJECTED: "UNDER_REVIEW",
      DISQUALIFIED: "UNDER_REVIEW",
    },
    OVERRIDE_REVIEW_CLAIM: {
      UNDER_REVIEW: "UNDER_REVIEW",
      SUBMITTED: "UNDER_REVIEW",
    },
  };
  const resultingStatus = transitions[input.action]?.[input.previousStatus];

  if (!resultingStatus) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Invalid validation status transition",
      safeMessage: "Transisi status validation tidak valid untuk kondisi saat ini.",
      statusCode: 409,
    });
  }

  return resultingStatus;
}

export function assertReasonCodeForAction(input: {
  action: ValidationAction;
  reasonCode?: string | null | undefined;
  participantVisibleNote?: string | null | undefined;
  internalNote?: string | null | undefined;
}): ValidationReasonCode | null {
  const reasonCode = input.reasonCode ? (input.reasonCode as ValidationReasonCode) : null;

  if (input.action === "APPROVE") {
    return reasonCode;
  }

  if (input.action === "REQUEST_REVISION") {
    if (
      !reasonCode ||
      !revisionRequestReasonCodes.includes(reasonCode as RevisionRequestReasonCode)
    ) {
      throw invalidReason();
    }
    if (!input.participantVisibleNote) {
      throw participantNoteRequired();
    }
    if (reasonCode === "OTHER_REVISION_REQUIRED" && !input.participantVisibleNote) {
      throw participantNoteRequired();
    }
    return reasonCode;
  }

  if (input.action === "REJECT") {
    if (!reasonCode || !rejectionReasonCodes.includes(reasonCode as RejectionReasonCode)) {
      throw invalidReason();
    }
    if (!input.participantVisibleNote) {
      throw participantNoteRequired();
    }
    return reasonCode;
  }

  if (input.action === "DISQUALIFY") {
    if (
      !reasonCode ||
      !disqualificationReasonCodes.includes(reasonCode as DisqualificationReasonCode)
    ) {
      throw invalidReason();
    }
    if (!input.internalNote) {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Internal note is required for disqualification",
        safeMessage: "Catatan internal wajib diisi untuk diskualifikasi.",
        statusCode: 400,
      });
    }
    if (!input.participantVisibleNote) {
      throw participantNoteRequired();
    }
    return reasonCode;
  }

  if (input.action === "REOPEN_SUBMISSION" || input.action === "RESTORE_TO_REVIEW") {
    if (!input.internalNote) {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Internal note is required for reopen",
        safeMessage: "Alasan internal wajib diisi untuk membuka ulang review.",
        statusCode: 400,
      });
    }
    return (reasonCode ?? "REOPEN_REQUESTED") as ValidationReasonCode;
  }

  return reasonCode;
}

function invalidReason(): ApplicationError {
  return new ApplicationError({
    code: "VALIDATION_FAILED",
    message: "Invalid validation reason code",
    safeMessage: "Kode alasan validation tidak valid.",
    statusCode: 400,
  });
}

function participantNoteRequired(): ApplicationError {
  return new ApplicationError({
    code: "VALIDATION_FAILED",
    message: "Participant visible note is required",
    safeMessage: "Catatan untuk peserta wajib diisi.",
    statusCode: 400,
  });
}
