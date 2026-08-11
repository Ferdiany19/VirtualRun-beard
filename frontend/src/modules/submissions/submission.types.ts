import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import type { ParticipantRecord } from "@/modules/participants/participant.repository";
import type { EventRegistrationRecord } from "@/modules/registrations/registration.types";
import type {
  ValidationReviewRecord,
  ValidationWarning,
} from "@/modules/validation/validation.types";

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REVISION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "DISQUALIFIED";

export type UploadSessionStatus =
  "CREATED" | "UPLOADED" | "FINALIZING" | "READY" | "FAILED" | "EXPIRED";

export type SubmissionFileStatus =
  "PENDING" | "UPLOADED" | "PROCESSING" | "READY" | "FAILED" | "DELETED";

export type ActivityPlatform =
  | "STRAVA"
  | "GARMIN_CONNECT"
  | "NIKE_RUN_CLUB"
  | "ADIDAS_RUNNING"
  | "COROS"
  | "POLAR"
  | "SUUNTO"
  | "SAMSUNG_HEALTH"
  | "APPLE_FITNESS"
  | "GOOGLE_FIT"
  | "TREADMILL"
  | "OTHER";

export type SubmissionRecord = {
  id: string;
  registrationCategoryId: string;
  currentRevisionId: string | null;
  status: SubmissionStatus;
  revisionCount: number;
  firstSubmittedAt: Date | null;
  lastSubmittedAt: Date | null;
  reviewClaimedByAdminUserId: string | null;
  reviewClaimedByAdminName: string | null;
  reviewClaimedAt: Date | null;
  reviewClaimExpiresAt: Date | null;
  reviewVersion: number;
  approvedRevisionId: string | null;
  approvedByAdminUserId: string | null;
  approvedAt: Date | null;
  validationCompletedAt: Date | null;
  rankingEligible: boolean;
  rankingExclusionReason: string | null;
  latestParticipantVisibleNote: string | null;
  latestValidationReasonCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SubmissionRevisionRecord = {
  id: string;
  submissionId: string;
  revisionNumber: number;
  activityDate: string;
  distanceMeter: number;
  elapsedTimeSeconds: number | null;
  movingTimeSeconds: number | null;
  activityPlatform: ActivityPlatform;
  activityPlatformOther: string | null;
  activityUrl: string | null;
  normalizedActivityUrl: string | null;
  participantNote: string | null;
  submittedAt: Date;
  supersededAt: Date | null;
};

export type SubmissionFileRecord = {
  id: string;
  submissionRevisionId: string | null;
  uploadSessionId: string;
  objectKey: string;
  thumbnailObjectKey: string | null;
  originalFilename: string;
  originalMimeType: string | null;
  detectedMimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  checksumSha256: string;
  status: SubmissionFileStatus;
  createdAt: Date;
  finalizedAt: Date | null;
};

export type ParticipantSubmissionCategory = {
  registrationCategoryId: string;
  event: EventRecord;
  registration: EventRegistrationRecord;
  participant: ParticipantRecord;
  category: EventCategoryRecord;
  submission: SubmissionRecord | null;
  currentRevision: SubmissionRevisionRecord | null;
  currentFile: SubmissionFileRecord | null;
};

export type SubmissionDetail = ParticipantSubmissionCategory & {
  revisions: Array<SubmissionRevisionRecord & { file: SubmissionFileRecord | null }>;
  validationReviews: ValidationReviewRecord[];
  warnings: ValidationWarning[];
};

export type AdminSubmissionListItem = {
  submission: SubmissionRecord;
  currentRevision: SubmissionRevisionRecord;
  currentFile: SubmissionFileRecord | null;
  warnings: ValidationWarning[];
  participant: ParticipantRecord;
  event: EventRecord;
  registration: EventRegistrationRecord;
  category: EventCategoryRecord;
};

export type AdminSubmissionFilters = {
  search?: string | null;
  categoryId?: string | null;
  status?: SubmissionStatus | null;
  activityPlatform?: ActivityPlatform | null;
  evidenceType?: "URL" | "SCREENSHOT" | "BOTH" | null;
  sort?: "submitted_desc" | "submitted_asc" | "bib_asc" | "distance_desc";
  page?: number;
};
