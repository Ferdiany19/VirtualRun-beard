export type ErrorCode =
  | 'CONFIGURATION_MISSING'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export class ApplicationError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly safeMessage: string;
  readonly details?: Record<string, unknown>;

  constructor(input: {
    code: ErrorCode;
    message: string;
    safeMessage?: string;
    statusCode?: number;
    details?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = 'ApplicationError';
    this.code = input.code;
    this.statusCode = input.statusCode ?? 500;
    this.safeMessage =
      input.safeMessage ?? 'Terjadi kesalahan. Silakan coba lagi.';
    this.details = input.details;
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}
