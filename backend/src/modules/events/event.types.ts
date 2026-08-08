import type { EventStatus } from '@/modules/events/domain/event-status';

export type PublicationStatus =
  'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export type EventFaqItem = {
  question: string;
  answer: string;
};

export type EventParticipantBenefit = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export type EventRecord = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  termsAndConditions: string;
  registrationInstructions: string;
  uploadInstructions: string;
  registrationStartsAt: Date;
  registrationEndsAt: Date;
  activityStartsAt: Date;
  activityEndsAt: Date;
  uploadStartsAt: Date;
  uploadEndsAt: Date;
  timezone: 'Asia/Jakarta';
  eventStatus: EventStatus;
  publicationStatus: PublicationStatus;
  bannerObjectKey: string | null;
  thumbnailObjectKey: string | null;
  registrationMode: 'FREE' | 'PAID';
  priceAmountCents: number;
  priceCurrency: 'IDR';
  maximumParticipants: number | null;
  allowSameActivityAcrossCategories: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  brandPrimaryColor: string;
  faqItems: EventFaqItem[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoIndexEnabled?: boolean;
  publicVisibilityEnabled?: boolean;
  participantBenefits?: EventParticipantBenefit[];
  createdByAdminUserId: string | null;
  updatedByAdminUserId: string | null;
  assignedAdminUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type EventInput = {
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  termsAndConditions: string;
  registrationInstructions: string;
  uploadInstructions: string;
  registrationStartsAt: Date;
  registrationEndsAt: Date;
  activityStartsAt: Date;
  activityEndsAt: Date;
  uploadStartsAt: Date;
  uploadEndsAt: Date;
  bannerObjectKey: string | null;
  thumbnailObjectKey: string | null;
  maximumParticipants: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  brandPrimaryColor: string;
  faqItems: EventFaqItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  seoIndexEnabled: boolean;
  publicVisibilityEnabled: boolean;
  participantBenefits: EventParticipantBenefit[];
};

export type EventListFilter = {
  search: string | null;
  eventStatus: EventStatus | null;
  publicationStatus?: PublicationStatus | null;
  period?: 'UPCOMING' | 'ONGOING' | 'PAST' | null;
  page?: number;
  pageSize?: number;
};

export type EventDashboardCounts = {
  totalEvents: number;
  activeEvents: number;
  archivedEvents: number;
  draftEvents: number;
  publishedEvents: number;
  registrationOpenEvents: number;
  upcomingEvents: number;
};

export type ManageableEventListItem = {
  event: EventRecord;
  categoryCount: number;
  activeCategoryCount: number;
  activeRegistrationCount: number;
  categories: Array<{
    id: string;
    name: string;
    distanceMeters: number;
    genderDivision: 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN' | null;
  }>;
};

export type EventManagementPageData = {
  counts: EventDashboardCounts;
  items: ManageableEventListItem[];
  totalFiltered: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nearestClosing: ManageableEventListItem[];
  topRegistrations: ManageableEventListItem[];
  recentActivities: Array<{
    id: string;
    action: string;
    eventId: string | null;
    eventName: string | null;
    actorName: string | null;
    createdAt: Date;
  }>;
};
