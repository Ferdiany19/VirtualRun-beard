export type GenderDivision = 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN';

export type EventCategory = {
  id: string;
  eventId: string;
  name: string;
  slug: string;
  distanceMeters: number;
  distanceToleranceMeters: number;
  minimumAgeYears: number | null;
  maximumAgeYears: number | null;
  genderDivision: GenderDivision | null;
  participantQuota: number | null;
  rankingEnabled: boolean;
  certificateEnabled: boolean;
  displayOrder: number;
  isActive: boolean;
};
