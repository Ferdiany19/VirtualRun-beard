export type CertificateTemplateStatus = "ACTIVE" | "ARCHIVED";
export type CertificateStatus =
  | "PENDING"
  | "GENERATING"
  | "READY"
  | "EMAILED"
  | "FAILED"
  | "INVALIDATED";

export type EventCertificateTemplateRecord = {
  id: string;
  eventId: string;
  objectKey: string;
  width: number;
  height: number;
  status: CertificateTemplateStatus;
  uploadedByAdminUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CertificateRecord = {
  id: string;
  eventId: string;
  registrationCategoryId: string;
  submissionId: string;
  approvedRevisionId: string;
  templateId: string;
  certificateNumber: string;
  verificationCode: string;
  objectKey: string | null;
  status: CertificateStatus;
  generatedAt: Date | null;
  emailedAt: Date | null;
  invalidatedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EventCertificateSummary = {
  template: EventCertificateTemplateRecord | null;
  pendingCount: number;
  readyCount: number;
  emailedCount: number;
  failedCount: number;
  invalidatedCount: number;
};

export type SubmissionCertificateStatus =
  | "NOT_ELIGIBLE"
  | "CONFIGURATION_INCOMPLETE"
  | "WAITING_EVENT_COMPLETION"
  | "QUEUED"
  | "SENT"
  | "FAILED"
  | "INVALIDATED";

export type SubmissionCertificateSummary = {
  status: SubmissionCertificateStatus;
  certificateStatus: CertificateStatus | null;
  certificateNumber: string | null;
  emailedAt: Date | null;
};
