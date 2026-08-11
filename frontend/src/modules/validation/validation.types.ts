import type { AdminRole } from "@/modules/auth/domain/admin-role";
import type { ActivityPlatform, SubmissionStatus } from "@/modules/submissions/submission.types";

export type ValidationAction =
  | "START_REVIEW"
  | "RELEASE_CLAIM"
  | "APPROVE"
  | "REQUEST_REVISION"
  | "REJECT"
  | "DISQUALIFY"
  | "REOPEN_SUBMISSION"
  | "RESTORE_TO_REVIEW"
  | "OVERRIDE_REVIEW_CLAIM";

export type RevisionRequestReasonCode =
  | "EVIDENCE_UNREADABLE"
  | "ACTIVITY_URL_INACCESSIBLE"
  | "DISTANCE_NEEDS_CLARIFICATION"
  | "TIME_NEEDS_CLARIFICATION"
  | "ACTIVITY_DATE_NEEDS_CLARIFICATION"
  | "WRONG_CATEGORY_EVIDENCE"
  | "PARTICIPANT_DATA_MISMATCH"
  | "INCOMPLETE_EVIDENCE"
  | "OTHER_REVISION_REQUIRED";

export type RejectionReasonCode =
  | "ACTIVITY_OUTSIDE_EVENT_PERIOD"
  | "DISTANCE_BELOW_ALLOWED_TOLERANCE"
  | "INVALID_OR_UNSUPPORTED_EVIDENCE"
  | "DUPLICATE_ACTIVITY"
  | "ACTIVITY_DOES_NOT_BELONG_TO_PARTICIPANT"
  | "INVALID_ACTIVITY_DATA"
  | "REVISION_DEADLINE_EXPIRED"
  | "OTHER_REJECTION";

export type DisqualificationReasonCode =
  | "MANIPULATED_EVIDENCE"
  | "SERIOUS_RULE_VIOLATION"
  | "IDENTITY_FRAUD"
  | "REPEATED_DUPLICATE_SUBMISSION"
  | "ORGANIZER_DECISION"
  | "OTHER_DISQUALIFICATION";

export type ValidationReasonCode =
  | RevisionRequestReasonCode
  | RejectionReasonCode
  | DisqualificationReasonCode
  | "REOPEN_REQUESTED"
  | "CLAIM_OVERRIDE";

export type ValidationReviewRecord = {
  id: string;
  submissionId: string;
  submissionRevisionId: string | null;
  eventId: string;
  registrationCategoryId: string;
  reviewerAdminUserId: string | null;
  reviewerName: string | null;
  action: ValidationAction;
  previousStatus: SubmissionStatus;
  resultingStatus: SubmissionStatus;
  reasonCode: ValidationReasonCode | null;
  participantVisibleNote: string | null;
  internalNote: string | null;
  reviewedAt: Date;
  createdAt: Date;
  supersededAt: Date | null;
  metadata: Record<string, unknown> | null;
};

export type EventValidatorAssignmentRecord = {
  id: string;
  eventId: string;
  adminUserId: string;
  adminFullName: string;
  adminDisplayEmail: string;
  roles: AdminRole[];
  assignedByAdminUserId: string | null;
  assignedByName: string | null;
  assignedAt: Date;
  revokedAt: Date | null;
  revokedByAdminUserId: string | null;
  revokedByName: string | null;
  revokeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EligibleValidator = {
  id: string;
  fullName: string;
  displayEmail: string;
  roles: AdminRole[];
};

export type ValidationWarning = {
  code: string;
  tone: "neutral" | "warning" | "danger";
  label: string;
  description: string;
};

export type ValidationQueueFilters = {
  eventId?: string | null;
  categoryId?: string | null;
  status?: SubmissionStatus | null;
  activityPlatform?: ActivityPlatform | null;
  evidenceType?: "URL" | "SCREENSHOT" | "BOTH" | null;
  search?: string | null;
  hasWarning?: boolean | null;
  distanceCheck?: "inside" | "outside" | null;
  sort?: "submitted_desc" | "submitted_asc" | "bib_asc";
  page?: number;
};

export type ValidationQueueItem = {
  submissionId: string;
  eventId: string;
  eventName: string;
  participantName: string;
  bibNumber: string;
  categoryId: string;
  categoryName: string;
  targetDistanceMeter: number;
  toleranceMeter: number;
  currentRevisionId: string;
  revisionNumber: number;
  actualDistanceMeter: number;
  elapsedTimeSeconds: number | null;
  movingTimeSeconds: number | null;
  activityDate: string;
  activityPlatform: ActivityPlatform;
  hasScreenshot: boolean;
  hasActivityUrl: boolean;
  revisionCount: number;
  submittedAt: Date;
  status: SubmissionStatus;
  reviewClaimedByAdminUserId: string | null;
  reviewClaimedByAdminName: string | null;
  reviewClaimExpiresAt: Date | null;
  reviewVersion: number;
  warningCount: number;
};
