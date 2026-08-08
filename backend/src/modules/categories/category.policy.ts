import type { CategoryInput } from '@/modules/categories/category.types';
import { ApplicationError } from '@/shared/errors/application-error';

export function assertCategoryPolicy(input: CategoryInput): void {
  if (input.distanceMeters <= 0) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Category distance must be positive',
      safeMessage: 'Jarak kategori harus lebih dari nol.',
      statusCode: 400,
    });
  }

  if (input.distanceToleranceMeters < 0) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Category distance tolerance must not be negative',
      safeMessage: 'Toleransi jarak tidak boleh negatif.',
      statusCode: 400,
    });
  }

  if (
    input.minimumAgeYears !== null &&
    input.maximumAgeYears !== null &&
    input.minimumAgeYears > input.maximumAgeYears
  ) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Minimum age is greater than maximum age',
      safeMessage: 'Usia minimum tidak boleh lebih besar dari usia maksimum.',
      statusCode: 400,
    });
  }
}
