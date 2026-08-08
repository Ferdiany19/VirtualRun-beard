import type { z } from 'zod';
import { ApplicationError } from '@/shared/errors/application-error';

export function parseWithSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Input validation failed',
      safeMessage: 'Data yang dikirim belum valid.',
      statusCode: 400,
      details: {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  return result.data;
}
