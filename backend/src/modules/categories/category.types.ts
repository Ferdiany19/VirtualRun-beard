export type GenderDivision = 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN';

export type EventCategoryRecord = {
  id: string;
  eventId: string;
  name: string;
  slug: string;
  description: string | null;
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
  priceAmountCents: number;
  priceCurrency: 'IDR';
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryInput = {
  name: string;
  slug: string;
  description: string | null;
  distanceMeters: number;
  distanceToleranceMeters: number;
  minimumAgeYears: number | null;
  maximumAgeYears: number | null;
  genderDivision: GenderDivision | null;
  participantQuota: number | null;
  rankingEnabled: boolean;
  certificateEnabled: boolean;
  priceAmountCents: number;
  displayOrder: number;
};
