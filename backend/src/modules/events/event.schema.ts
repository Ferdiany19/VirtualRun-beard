import { z } from 'zod';
import { eventStatuses } from '@/modules/events/domain/event-status';
import type { PublicationStatus } from '@/modules/events/event.types';
import { parseJakartaDateTimeLocal } from '@/shared/date/business-timezone';

export const publicationStatuses = [
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
] as const satisfies readonly PublicationStatus[];

export const eventSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const eventPrimaryColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/);

export const eventFaqItemSchema = z.object({
  question: z.string().trim().min(5).max(180),
  answer: z.string().trim().min(5).max(700),
});

export const eventParticipantBenefitSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().trim().min(2).max(80),
  description: z.string().trim().max(180),
  enabled: z.boolean(),
});

export const eventInputSchema = z.object({
  name: z.string().trim().min(3).max(160),
  slug: eventSlugSchema,
  shortDescription: z.string().trim().min(20).max(320),
  fullDescription: z.string().trim().min(40).max(8_000),
  termsAndConditions: z.string().trim().min(20).max(12_000),
  registrationInstructions: z.string().trim().min(20).max(5_000),
  uploadInstructions: z.string().trim().min(20).max(5_000),
  registrationStartsAt: z.coerce.date(),
  registrationEndsAt: z.coerce.date(),
  activityStartsAt: z.coerce.date(),
  activityEndsAt: z.coerce.date(),
  uploadStartsAt: z.coerce.date(),
  uploadEndsAt: z.coerce.date(),
  bannerObjectKey: z.string().trim().max(500).nullable(),
  thumbnailObjectKey: z.string().trim().max(500).nullable(),
  maximumParticipants: z.number().int().positive().nullable(),
  contactEmail: z.string().trim().email().nullable(),
  contactPhone: z.string().trim().min(8).max(32).nullable(),
  contactWhatsapp: z.string().trim().min(8).max(32).nullable(),
  brandPrimaryColor: eventPrimaryColorSchema,
  faqItems: z.array(eventFaqItemSchema).max(12),
  seoTitle: z.string().trim().max(80).nullable().default(null),
  seoDescription: z.string().trim().max(180).nullable().default(null),
  seoIndexEnabled: z.boolean().default(true),
  publicVisibilityEnabled: z.boolean().default(true),
  participantBenefits: z
    .array(eventParticipantBenefitSchema)
    .max(12)
    .default([]),
});

export const eventListFilterSchema = z.object({
  search: z.string().trim().max(120).nullable(),
  eventStatus: z.enum(eventStatuses).nullable(),
  publicationStatus: z.enum(publicationStatuses).nullable().optional(),
  period: z.enum(['UPCOMING', 'ONGOING', 'PAST']).nullable().optional(),
  page: z.number().int().min(1).max(10_000).optional(),
  pageSize: z.number().int().min(5).max(100).optional(),
});

export const eventCreateModeSchema = z.enum(['DRAFT', 'PUBLISH']);

export const eventInlineCategoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: eventSlugSchema,
  description: z.string().trim().max(700).nullable(),
  distanceMeters: z.number().int().positive(),
  distanceToleranceMeters: z.number().int().min(0),
  minimumAgeYears: z.number().int().min(0).nullable(),
  maximumAgeYears: z.number().int().min(0).nullable(),
  genderDivision: z.enum(['MALE', 'FEMALE', 'MIXED', 'OPEN']).nullable(),
  participantQuota: z.number().int().positive().nullable(),
  rankingEnabled: z.boolean(),
  certificateEnabled: z.boolean(),
  priceAmountCents: z.number().int().min(0),
  displayOrder: z.number().int().min(0),
});

export const eventFullCreateSchema = z.object({
  event: eventInputSchema,
  categories: z.array(eventInlineCategoryInputSchema).min(1).max(20),
  mode: eventCreateModeSchema,
});

export function parseEventFormData(formData: FormData) {
  const nullableText = (name: string) => {
    const value = String(formData.get(name) ?? '').trim();
    return value.length > 0 ? value : null;
  };
  const nullableNumber = (name: string) => {
    const value = String(formData.get(name) ?? '').trim();
    return value.length > 0 ? Number(value) : null;
  };
  const faqItems = [0, 1, 2, 3]
    .map((index) => ({
      question: String(formData.get(`faqQuestion${index}`) ?? '').trim(),
      answer: String(formData.get(`faqAnswer${index}`) ?? '').trim(),
    }))
    .filter((item) => item.question.length > 0 || item.answer.length > 0);
  const parseJsonArray = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const participantBenefitsJson = String(
    formData.get('participantBenefitsJson') ?? '[]',
  );
  const participantBenefits = eventParticipantBenefitSchema
    .array()
    .max(12)
    .catch([])
    .parse(parseJsonArray(participantBenefitsJson));

  return eventInputSchema.parse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    shortDescription: String(formData.get('shortDescription') ?? ''),
    fullDescription: String(formData.get('fullDescription') ?? ''),
    termsAndConditions: String(formData.get('termsAndConditions') ?? ''),
    registrationInstructions: String(
      formData.get('registrationInstructions') ?? '',
    ),
    uploadInstructions: String(formData.get('uploadInstructions') ?? ''),
    registrationStartsAt: parseJakartaDateTimeLocal(
      String(formData.get('registrationStartsAt') ?? ''),
    ),
    registrationEndsAt: parseJakartaDateTimeLocal(
      String(formData.get('registrationEndsAt') ?? ''),
    ),
    activityStartsAt: parseJakartaDateTimeLocal(
      String(formData.get('activityStartsAt') ?? ''),
    ),
    activityEndsAt: parseJakartaDateTimeLocal(
      String(formData.get('activityEndsAt') ?? ''),
    ),
    uploadStartsAt: parseJakartaDateTimeLocal(
      String(formData.get('uploadStartsAt') ?? ''),
    ),
    uploadEndsAt: parseJakartaDateTimeLocal(
      String(formData.get('uploadEndsAt') ?? ''),
    ),
    bannerObjectKey: nullableText('bannerObjectKey'),
    thumbnailObjectKey: nullableText('thumbnailObjectKey'),
    maximumParticipants: nullableNumber('maximumParticipants'),
    contactEmail: nullableText('contactEmail'),
    contactPhone: nullableText('contactPhone'),
    contactWhatsapp: nullableText('contactWhatsapp'),
    brandPrimaryColor: String(formData.get('brandPrimaryColor') ?? ''),
    faqItems,
    seoTitle: nullableText('seoTitle'),
    seoDescription: nullableText('seoDescription'),
    seoIndexEnabled: formData.get('seoIndexEnabled') === 'on',
    publicVisibilityEnabled: formData.get('publicVisibilityEnabled') === 'on',
    participantBenefits,
  });
}
