import { z } from 'zod';
import { activityPlatformSchema } from '@/modules/submissions/submission.schema';

const emptyStringToUndefined = (value: unknown) =>
  value === '' ? undefined : value;
const optionalFilter = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyStringToUndefined, schema.optional().nullable());
const optionalQueryValue = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyStringToUndefined, schema.optional());
const legacyClaimSortToUndefined = (value: unknown) =>
  value === 'claim_expiry_asc' ? undefined : emptyStringToUndefined(value);

export const revisionRequestReasonCodes = [
  'EVIDENCE_UNREADABLE',
  'ACTIVITY_URL_INACCESSIBLE',
  'DISTANCE_NEEDS_CLARIFICATION',
  'TIME_NEEDS_CLARIFICATION',
  'ACTIVITY_DATE_NEEDS_CLARIFICATION',
  'WRONG_CATEGORY_EVIDENCE',
  'PARTICIPANT_DATA_MISMATCH',
  'INCOMPLETE_EVIDENCE',
  'OTHER_REVISION_REQUIRED',
] as const;

export const rejectionReasonCodes = [
  'ACTIVITY_OUTSIDE_EVENT_PERIOD',
  'DISTANCE_BELOW_ALLOWED_TOLERANCE',
  'INVALID_OR_UNSUPPORTED_EVIDENCE',
  'DUPLICATE_ACTIVITY',
  'ACTIVITY_DOES_NOT_BELONG_TO_PARTICIPANT',
  'INVALID_ACTIVITY_DATA',
  'REVISION_DEADLINE_EXPIRED',
  'OTHER_REJECTION',
] as const;

export const disqualificationReasonCodes = [
  'MANIPULATED_EVIDENCE',
  'SERIOUS_RULE_VIOLATION',
  'IDENTITY_FRAUD',
  'REPEATED_DUPLICATE_SUBMISSION',
  'ORGANIZER_DECISION',
  'OTHER_DISQUALIFICATION',
] as const;

export const validationQueueSchema = z.object({
  eventId: optionalFilter(z.string().uuid()),
  categoryId: optionalFilter(z.string().uuid()),
  status: optionalFilter(
    z.enum([
      'SUBMITTED',
      'UNDER_REVIEW',
      'REVISION_REQUIRED',
      'APPROVED',
      'REJECTED',
      'DISQUALIFIED',
    ]),
  ),
  activityPlatform: optionalFilter(activityPlatformSchema),
  evidenceType: optionalFilter(z.enum(['URL', 'SCREENSHOT', 'BOTH'])),
  search: optionalFilter(z.string().trim().max(120)),
  hasWarning: optionalFilter(z.coerce.boolean()),
  distanceCheck: optionalFilter(z.enum(['inside', 'outside'])),
  sort: z.preprocess(
    legacyClaimSortToUndefined,
    z.enum(['submitted_desc', 'submitted_asc', 'bib_asc']).optional(),
  ),
  page: optionalQueryValue(z.coerce.number().int().positive()),
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
    'APPROVE',
    'REQUEST_REVISION',
    'REJECT',
    'DISQUALIFY',
    'REOPEN_SUBMISSION',
    'RESTORE_TO_REVIEW',
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
