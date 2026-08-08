import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (value === null || value === undefined ? '' : value),
  z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value)),
);

export const bibSettingsSchema = z.object({
  bibPrefix: z.string().max(16),
  bibSuffix: optionalString,
  sequenceStart: z.coerce.number().int().min(1),
  numericPadding: z.coerce.number().int().min(1).max(8),
  nextSequence: z.coerce.number().int().min(1),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  fontFamily: z.enum([
    'Montserrat',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
  ]),
  fontSize: z.coerce.number().int().min(16).max(240),
  fontWeight: z.coerce
    .number()
    .pipe(
      z.union([
        z.literal(400),
        z.literal(500),
        z.literal(600),
        z.literal(700),
        z.literal(800),
      ]),
    ),
  textAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']),
  numberAreaX: z.coerce.number().int().min(0).max(4000),
  numberAreaY: z.coerce.number().int().min(0).max(4000),
  numberAreaWidth: z.coerce.number().int().min(1).max(4000),
  numberAreaHeight: z.coerce.number().int().min(1).max(4000),
  showParticipantName: z.boolean(),
  participantNameX: z.coerce.number().int().min(0).max(4000),
  participantNameY: z.coerce.number().int().min(0).max(4000),
  participantNameWidth: z.coerce.number().int().min(1).max(4000),
  participantNameHeight: z.coerce.number().int().min(1).max(4000),
  participantNameFontSize: z.coerce.number().int().min(10).max(180),
  showCategoryLabel: z.boolean(),
  categoryLabelX: z.coerce.number().int().min(0).max(4000),
  categoryLabelY: z.coerce.number().int().min(0).max(4000),
  categoryLabelWidth: z.coerce.number().int().min(1).max(4000),
  categoryLabelHeight: z.coerce.number().int().min(1).max(4000),
  categoryLabelFontSize: z.coerce.number().int().min(10).max(180),
  templateCanvasWidth: z.coerce.number().int().min(600).max(4000),
  templateCanvasHeight: z.coerce.number().int().min(400).max(4000),
});

export type BibSettingsInput = z.infer<typeof bibSettingsSchema>;

export const bibTemplateStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const bibTemplateListFilterSchema = z.object({
  search: z.string().trim().max(120).optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  status: bibTemplateStatusSchema.optional().nullable(),
  orientation: z.enum(['LANDSCAPE', 'PORTRAIT']).optional().nullable(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const bibTemplateMetadataSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
});

export type BibTemplateListFilterInput = z.infer<
  typeof bibTemplateListFilterSchema
>;
export type BibTemplateMetadataInput = z.infer<
  typeof bibTemplateMetadataSchema
>;

export function parseBibSettingsFormData(formData: FormData): BibSettingsInput {
  return bibSettingsSchema.parse({
    bibPrefix: formData.get('bibPrefix') ?? '',
    bibSuffix: formData.get('bibSuffix') ?? '',
    sequenceStart: formData.get('sequenceStart'),
    numericPadding: formData.get('numericPadding'),
    nextSequence: formData.get('nextSequence'),
    textColor: formData.get('textColor'),
    fontFamily: formData.get('fontFamily'),
    fontSize: formData.get('fontSize'),
    fontWeight: formData.get('fontWeight'),
    textAlignment: formData.get('textAlignment'),
    numberAreaX: formData.get('numberAreaX'),
    numberAreaY: formData.get('numberAreaY'),
    numberAreaWidth: formData.get('numberAreaWidth'),
    numberAreaHeight: formData.get('numberAreaHeight'),
    showParticipantName: formData.get('showParticipantName') === 'on',
    participantNameX: formData.get('participantNameX'),
    participantNameY: formData.get('participantNameY'),
    participantNameWidth: formData.get('participantNameWidth'),
    participantNameHeight: formData.get('participantNameHeight'),
    participantNameFontSize: formData.get('participantNameFontSize'),
    showCategoryLabel: formData.get('showCategoryLabel') === 'on',
    categoryLabelX: formData.get('categoryLabelX'),
    categoryLabelY: formData.get('categoryLabelY'),
    categoryLabelWidth: formData.get('categoryLabelWidth'),
    categoryLabelHeight: formData.get('categoryLabelHeight'),
    categoryLabelFontSize: formData.get('categoryLabelFontSize'),
    templateCanvasWidth: formData.get('templateCanvasWidth'),
    templateCanvasHeight: formData.get('templateCanvasHeight'),
  });
}
