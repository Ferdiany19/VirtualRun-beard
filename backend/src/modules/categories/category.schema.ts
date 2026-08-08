import { z } from 'zod';
import { eventSlugSchema } from '@/modules/events/event.schema';

export const categoryInputSchema = z.object({
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

export function parseCategoryFormData(formData: FormData) {
  const nullableText = (name: string) => {
    const value = String(formData.get(name) ?? '').trim();
    return value.length > 0 ? value : null;
  };
  const nullableNumber = (name: string) => {
    const value = String(formData.get(name) ?? '').trim();
    return value.length > 0 ? Number(value) : null;
  };

  return categoryInputSchema.parse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    description: nullableText('description'),
    distanceMeters: Number(String(formData.get('distanceMeters') ?? '')),
    distanceToleranceMeters: Number(
      String(formData.get('distanceToleranceMeters') ?? '0'),
    ),
    minimumAgeYears: nullableNumber('minimumAgeYears'),
    maximumAgeYears: nullableNumber('maximumAgeYears'),
    genderDivision: nullableText('genderDivision'),
    participantQuota: nullableNumber('participantQuota'),
    rankingEnabled: formData.get('rankingEnabled') === 'on',
    certificateEnabled: formData.get('certificateEnabled') === 'on',
    priceAmountCents: Number(String(formData.get('priceAmountCents') ?? '0')),
    displayOrder: Number(String(formData.get('displayOrder') ?? '0')),
  });
}
