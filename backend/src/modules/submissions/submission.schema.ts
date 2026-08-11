import { z } from 'zod';
import type { ActivityPlatform } from '@/modules/submissions/submission.types';

export const activityPlatformSchema = z.enum([
  'STRAVA',
  'GARMIN_CONNECT',
  'NIKE_RUN_CLUB',
  'ADIDAS_RUNNING',
  'COROS',
  'POLAR',
  'SUUNTO',
  'SAMSUNG_HEALTH',
  'APPLE_FITNESS',
  'GOOGLE_FIT',
  'TREADMILL',
  'OTHER',
]);

export const submissionFormSchema = z.object({
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  distanceKilometer: z.string().trim().min(1).max(12),
  activityPlatform: activityPlatformSchema,
  activityPlatformOther: z
    .string()
    .trim()
    .max(40)
    .transform((value) => (value === '' ? null : value)),
  activityUrl: z
    .string()
    .trim()
    .max(2048)
    .transform((value) => (value === '' ? null : value)),
  participantNote: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => (value === '' ? null : value)),
  dataStatementAccepted: z.literal('on', {
    errorMap: () => ({ message: 'Pernyataan kebenaran data wajib dicentang.' }),
  }),
  idempotencyKey: z.string().uuid(),
});

export type SubmissionFormInput = z.infer<typeof submissionFormSchema>;

export const activityPlatformLabels: Record<ActivityPlatform, string> = {
  STRAVA: 'Strava',
  GARMIN_CONNECT: 'Garmin Connect',
  NIKE_RUN_CLUB: 'Nike Run Club',
  ADIDAS_RUNNING: 'Adidas Running',
  COROS: 'Coros',
  POLAR: 'Polar',
  SUUNTO: 'Suunto',
  SAMSUNG_HEALTH: 'Samsung Health',
  APPLE_FITNESS: 'Apple Fitness',
  GOOGLE_FIT: 'Google Fit',
  TREADMILL: 'Treadmill',
  OTHER: 'Lainnya',
};

export function parseSubmissionFormData(formData: FormData): {
  input: SubmissionFormInput;
  screenshot: File | null;
} {
  const screenshot = formData.get('screenshot');

  return {
    input: submissionFormSchema.parse({
      activityDate: formData.get('activityDate'),
      distanceKilometer: formData.get('distanceKilometer'),
      activityPlatform: formData.get('activityPlatform'),
      activityPlatformOther: formData.get('activityPlatformOther') ?? '',
      activityUrl: formData.get('activityUrl') ?? '',
      participantNote: formData.get('participantNote') ?? '',
      dataStatementAccepted: formData.get('dataStatementAccepted'),
      idempotencyKey: formData.get('idempotencyKey'),
    }),
    screenshot:
      screenshot instanceof File && screenshot.size > 0 ? screenshot : null,
  };
}
