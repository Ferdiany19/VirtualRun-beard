import { z } from "zod";
import { activityPlatformSchema } from "@/modules/submissions/submission.schema";

export const revisionRequestReasonCodes = [
  "EVIDENCE_UNREADABLE",
  "ACTIVITY_URL_INACCESSIBLE",
  "DISTANCE_NEEDS_CLARIFICATION",
  "TIME_NEEDS_CLARIFICATION",
  "ACTIVITY_DATE_NEEDS_CLARIFICATION",
  "WRONG_CATEGORY_EVIDENCE",
  "PARTICIPANT_DATA_MISMATCH",
  "INCOMPLETE_EVIDENCE",
  "OTHER_REVISION_REQUIRED",
] as const;

export const rejectionReasonCodes = [
  "ACTIVITY_OUTSIDE_EVENT_PERIOD",
  "DISTANCE_BELOW_ALLOWED_TOLERANCE",
  "INVALID_OR_UNSUPPORTED_EVIDENCE",
  "DUPLICATE_ACTIVITY",
  "ACTIVITY_DOES_NOT_BELONG_TO_PARTICIPANT",
  "INVALID_ACTIVITY_DATA",
  "REVISION_DEADLINE_EXPIRED",
  "OTHER_REJECTION",
] as const;

export const disqualificationReasonCodes = [
  "MANIPULATED_EVIDENCE",
  "SERIOUS_RULE_VIOLATION",
  "IDENTITY_FRAUD",
  "REPEATED_DUPLICATE_SUBMISSION",
  "ORGANIZER_DECISION",
  "OTHER_DISQUALIFICATION",
] as const;

export const validationQueueSchema = z.object({
  eventId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  status: z
    .enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "REVISION_REQUIRED",
      "APPROVED",
      "REJECTED",
      "DISQUALIFIED",
    ])
    .optional()
    .nullable(),
  reviewer: z.string().trim().max(80).optional().nullable(),
  activityPlatform: activityPlatformSchema.optional().nullable(),
  evidenceType: z.enum(["URL", "SCREENSHOT", "BOTH"]).optional().nullable(),
  search: z.string().trim().max(120).optional().nullable(),
  hasWarning: z.coerce.boolean().optional().nullable(),
  distanceCheck: z.enum(["inside", "outside"]).optional().nullable(),
  sort: z.enum(["submitted_desc", "submitted_asc", "bib_asc", "claim_expiry_asc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
});

export const claimSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().nullable(),
  expectedReviewVersion: z.coerce.number().int().min(0),
});

export const validationDecisionSchema = z.object({
  submissionId: z.string().uuid(),
  revisionId: z.string().uuid(),
  expectedReviewVersion: z.coerce.number().int().min(0),
  action: z.enum([
    "APPROVE",
    "REQUEST_REVISION",
    "REJECT",
    "DISQUALIFY",
    "REOPEN_SUBMISSION",
    "RESTORE_TO_REVIEW",
  ]),
  reasonCode: z.string().trim().max(80).optional().nullable(),
  participantVisibleNote: z.string().trim().max(1200).optional().nullable(),
  internalNote: z.string().trim().max(1200).optional().nullable(),
});

export const validatorAssignmentSchema = z.object({
  adminUserId: z.string().uuid(),
});

export const validatorRevocationSchema = z.object({
  assignmentId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
});

export type ValidationDecisionInput = z.infer<typeof validationDecisionSchema>;
