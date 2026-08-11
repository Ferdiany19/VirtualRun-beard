import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value));

export const participantGenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);

const instagramUsernameSchema = z
  .string()
  .trim()
  .min(1, 'Username Instagram wajib diisi.')
  .max(64, 'Username Instagram terlalu panjang.')
  .regex(/^@?[A-Za-z0-9._]{1,30}$/, 'Username Instagram tidak valid.');

export const publicRegistrationSchema = z.object({
  categoryIds: z
    .array(z.string().uuid())
    .min(1, 'Pilih minimal satu kategori.'),
  fullName: z.string().trim().min(2, 'Nama lengkap wajib diisi.').max(160),
  displayEmail: z.string().trim().email('Email belum valid.').max(180),
  displayPhone: z.string().trim().min(8, 'Nomor HP wajib diisi.').max(32),
  instagramUsername: instagramUsernameSchema,
  gender: z
    .union([participantGenderSchema, z.literal('')])
    .transform((value) => value || null),
  dateOfBirth: optionalText,
  province: z.string().trim().min(2, 'Provinsi wajib diisi.').max(100),
  cityOrRegency: z
    .string()
    .trim()
    .min(2, 'Kota/kabupaten wajib diisi.')
    .max(120),
  district: optionalText,
  postalCode: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  termsAccepted: z.literal('on', {
    errorMap: () => ({ message: 'Persetujuan syarat wajib dicentang.' }),
  }),
  privacyAccepted: z.literal('on', {
    errorMap: () => ({ message: 'Persetujuan privasi wajib dicentang.' }),
  }),
  dataStatementAccepted: z.literal('on', {
    errorMap: () => ({ message: 'Pernyataan data wajib dicentang.' }),
  }),
  turnstileToken: z.string().trim().min(1).max(4096),
  idempotencyKey: z.string().uuid(),
});

export const participantAccessSchema = z.object({
  displayEmail: z.string().trim().email('Email belum valid.').max(180),
  registrationCode: z
    .string()
    .trim()
    .min(8, 'Kode registrasi wajib diisi.')
    .max(32),
});

export const adminParticipantUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  displayEmail: z.string().trim().email().max(180),
  displayPhone: z.string().trim().min(8).max(32),
  instagramUsername: optionalText,
  gender: z
    .union([participantGenderSchema, z.literal('')])
    .transform((value) => value || null),
  dateOfBirth: optionalText,
  province: z.string().trim().min(2).max(100),
  cityOrRegency: z.string().trim().min(2).max(120),
  district: optionalText,
  postalCode: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
});

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;
export type ParticipantAccessInput = z.infer<typeof participantAccessSchema>;
export type AdminParticipantUpdateInput = z.infer<
  typeof adminParticipantUpdateSchema
>;

function checkedValues(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map((value) => String(value))
    .filter(Boolean);
}

export function parsePublicRegistrationFormData(
  formData: FormData,
): PublicRegistrationInput {
  return publicRegistrationSchema.parse({
    categoryIds: checkedValues(formData, 'categoryIds'),
    fullName: formData.get('fullName'),
    displayEmail: formData.get('displayEmail'),
    displayPhone: formData.get('displayPhone'),
    instagramUsername: formData.get('instagramUsername'),
    gender: formData.get('gender') ?? '',
    dateOfBirth: formData.get('dateOfBirth') ?? '',
    province: formData.get('province'),
    cityOrRegency: formData.get('cityOrRegency'),
    district: formData.get('district') ?? '',
    postalCode: formData.get('postalCode') ?? '',
    emergencyContactName: formData.get('emergencyContactName') ?? '',
    emergencyContactPhone: formData.get('emergencyContactPhone') ?? '',
    termsAccepted: formData.get('termsAccepted'),
    privacyAccepted: formData.get('privacyAccepted'),
    dataStatementAccepted: formData.get('dataStatementAccepted'),
    turnstileToken:
      formData.get('turnstileToken') ?? formData.get('cf-turnstile-response'),
    idempotencyKey: formData.get('idempotencyKey'),
  });
}

export function parseParticipantAccessFormData(
  formData: FormData,
): ParticipantAccessInput {
  return participantAccessSchema.parse({
    displayEmail: formData.get('displayEmail'),
    registrationCode: formData.get('registrationCode'),
  });
}

export function parseAdminParticipantUpdateFormData(
  formData: FormData,
): AdminParticipantUpdateInput {
  return adminParticipantUpdateSchema.parse({
    fullName: formData.get('fullName'),
    displayEmail: formData.get('displayEmail'),
    displayPhone: formData.get('displayPhone'),
    instagramUsername: formData.get('instagramUsername') ?? '',
    gender: formData.get('gender') ?? '',
    dateOfBirth: formData.get('dateOfBirth') ?? '',
    province: formData.get('province'),
    cityOrRegency: formData.get('cityOrRegency'),
    district: formData.get('district') ?? '',
    postalCode: formData.get('postalCode') ?? '',
    emergencyContactName: formData.get('emergencyContactName') ?? '',
    emergencyContactPhone: formData.get('emergencyContactPhone') ?? '',
  });
}
