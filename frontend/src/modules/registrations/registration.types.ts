import type { EventCategoryRecord } from "@/modules/categories/category.types";
import type { EventRecord } from "@/modules/events/event.types";
import type { ParticipantRecord } from "@/modules/participants/participant.repository";

export type RegistrationStatus = "ACTIVE" | "CANCELLED";
export type BibStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type EmailStatus = "PENDING" | "SENT" | "FAILED";

export type EventRegistrationRecord = {
  id: string;
  eventId: string;
  participantId: string;
  registrationCodeLookup: string;
  registrationCodeHash: string;
  bibSequence: number;
  bibNumber: string;
  registrationStatus: RegistrationStatus;
  bibStatus: BibStatus;
  bibDocumentId: string | null;
  bibError: string | null;
  emailStatus: EmailStatus;
  registeredAt: Date;
  termsVersion: string;
  termsAcceptedAt: Date;
  privacyAcceptedAt: Date;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
};

export type RegistrationCategoryRecord = {
  id: string;
  eventRegistrationId: string;
  eventCategoryId: string;
  registrationStatus: RegistrationStatus;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
};

export type RegistrationSummary = {
  event: EventRecord;
  participant: ParticipantRecord;
  registration: EventRegistrationRecord;
  categories: EventCategoryRecord[];
  bibObjectKey: string | null;
  templateVersionId: string | null;
};

export type RegistrationListFilters = {
  search?: string | null;
  categoryId?: string | null;
  registrationStatus?: RegistrationStatus | null;
  bibStatus?: BibStatus | null;
  sort?: "registered_desc" | "registered_asc" | "bib_asc" | "name_asc";
  page?: number;
};

export type RegistrationListItem = {
  registration: EventRegistrationRecord;
  participant: ParticipantRecord;
  categories: EventCategoryRecord[];
};

export type GlobalParticipantStatus = "VERIFIED" | "PENDING_UPLOAD" | "ACTIVE" | "CANCELLED";

export type GlobalParticipantListFilters = {
  search?: string | null;
  eventId?: string | null;
  categoryId?: string | null;
  status?: GlobalParticipantStatus | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: number;
  pageSize?: number;
};

export type GlobalParticipantListItem = {
  registrationId: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  eventId: string;
  eventName: string;
  bibNumber: string;
  categories: string[];
  registeredAt: Date;
  registrationStatus: RegistrationStatus;
  bibStatus: BibStatus;
  emailStatus: EmailStatus;
  submittedCategoryCount: number;
  totalCategoryCount: number;
  status: GlobalParticipantStatus;
};

export type GlobalParticipantStats = {
  totalParticipants: number;
  verifiedEmailCount: number;
  pendingUploadCount: number;
  newThisMonthCount: number;
};

export type GlobalParticipantTopEvent = {
  eventId: string;
  eventName: string;
  registrationCount: number;
  categories: string[];
};

export type GlobalParticipantRecentActivity = {
  id: string;
  participantName: string;
  eventName: string;
  action: "REGISTERED" | "SUBMITTED" | "PENDING_UPLOAD";
  createdAt: Date;
};

export type GlobalParticipantFilterOptions = {
  events: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; eventId: string; name: string }>;
};

export type GlobalParticipantPageData = {
  stats: GlobalParticipantStats;
  items: GlobalParticipantListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  latestParticipants: GlobalParticipantListItem[];
  topEvents: GlobalParticipantTopEvent[];
  recentActivities: GlobalParticipantRecentActivity[];
  filterOptions: GlobalParticipantFilterOptions;
};

export type AdminParticipantDetailSubmission = {
  registrationCategoryId: string;
  categoryId: string;
  categoryName: string;
  targetDistanceMeter: number;
  submissionId: string | null;
  submissionStatus: string | null;
  firstSubmittedAt: Date | null;
  lastSubmittedAt: Date | null;
  approvedAt: Date | null;
  validationCompletedAt: Date | null;
  revisionId: string | null;
  revisionNumber: number | null;
  activityDate: string | null;
  distanceMeter: number | null;
  elapsedTimeSeconds: number | null;
  movingTimeSeconds: number | null;
  activityPlatform: string | null;
  activityUrl: string | null;
  submittedAt: Date | null;
  fileId: string | null;
  fileName: string | null;
  fileCreatedAt: Date | null;
};

export type AdminParticipantDetailEmailDelivery = {
  id: string;
  emailType: string;
  recipientEmail: string;
  status: string;
  attempts: number;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminParticipantDetailBibDocument = {
  id: string;
  status: string;
  attemptCount: number;
  errorMessage: string | null;
  generatedAt: Date | null;
  createdAt: Date;
};

export type AdminParticipantDetailValidationReview = {
  id: string;
  submissionId: string;
  categoryName: string;
  action: string;
  previousStatus: string;
  resultingStatus: string;
  reviewerName: string | null;
  reviewedAt: Date;
};

export type AdminParticipantDetailActivity = {
  id: string;
  action: "REGISTERED" | "EMAIL" | "BIB" | "SUBMISSION" | "VALIDATION";
  title: string;
  description: string;
  occurredAt: Date;
};

export type AdminParticipantDetail = RegistrationSummary & {
  submissions: AdminParticipantDetailSubmission[];
  emailDeliveries: AdminParticipantDetailEmailDelivery[];
  bibDocument: AdminParticipantDetailBibDocument | null;
  validationReviews: AdminParticipantDetailValidationReview[];
  activities: AdminParticipantDetailActivity[];
};
