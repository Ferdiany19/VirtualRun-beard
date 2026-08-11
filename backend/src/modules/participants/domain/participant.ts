export type ParticipantStatus = 'ACTIVE' | 'SOFT_DELETED';

export type Participant = {
  id: string;
  fullName: string;
  normalizedEmail: string;
  displayEmail: string;
  normalizedPhone: string;
  displayPhone: string;
  instagramUsername: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth: string | null;
  province: string | null;
  city: string | null;
  status: ParticipantStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
