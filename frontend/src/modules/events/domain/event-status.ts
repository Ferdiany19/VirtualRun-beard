export const eventStatuses = [
  "DRAFT",
  "SCHEDULED",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "ACTIVITY_OPEN",
  "UPLOAD_OPEN",
  "REVIEW",
  "COMPLETED",
  "ARCHIVED",
] as const;

export type EventStatus = (typeof eventStatuses)[number];

const allowedTransitions: Record<EventStatus, EventStatus[]> = {
  DRAFT: ["SCHEDULED", "ARCHIVED"],
  SCHEDULED: ["REGISTRATION_OPEN", "ARCHIVED"],
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "ACTIVITY_OPEN", "ARCHIVED"],
  REGISTRATION_CLOSED: ["ACTIVITY_OPEN", "ARCHIVED"],
  ACTIVITY_OPEN: ["UPLOAD_OPEN", "REVIEW", "ARCHIVED"],
  UPLOAD_OPEN: ["REVIEW", "ARCHIVED"],
  REVIEW: ["COMPLETED", "UPLOAD_OPEN", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionEventStatus(from: EventStatus, to: EventStatus): boolean {
  if (from === to) {
    return true;
  }

  return allowedTransitions[from].includes(to);
}
