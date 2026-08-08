import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

for (const envPath of [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
]) {
  loadDotenv({ path: envPath, override: false });
}

const optionalString = (schema: z.ZodString) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    if (trimmedValue === '' || /<[^>]+>/.test(trimmedValue)) {
      return undefined;
    }

    return trimmedValue;
  }, schema.optional());

const envSchema = z
  .object({
    NODE_ENV: z.preprocess(
      (value) => (value === '' || value === 'undefined' ? undefined : value),
      z.enum(['development', 'test', 'production']).default('development'),
    ),
    APP_URL: z.string().url().default('http://localhost:3000'),
    BUSINESS_TIMEZONE: z.literal('Asia/Jakarta').default('Asia/Jakarta'),
    DATABASE_URL: optionalString(z.string().min(1)),
    ADMIN_SESSION_COOKIE_NAME: z.string().min(1).default('vrb_admin_session'),
    ADMIN_CSRF_COOKIE_NAME: z.string().min(1).default('vrb_admin_csrf'),
    SESSION_SECRET: optionalString(z.string().min(32)),
    TURNSTILE_SECRET_KEY: optionalString(z.string().min(1)),
    TURNSTILE_DEVELOPMENT_BYPASS: z.enum(['true', 'false']).default('false'),
    DEV_ADMIN_EMAIL: z.string().email().default('admin@beard.test'),
    DEV_ADMIN_PASSWORD: z.string().min(12).default('ChangeMe!2026'),
    PARTICIPANT_SESSION_COOKIE_NAME: z
      .string()
      .min(1)
      .default('vrb_participant_session'),
    PARTICIPANT_CSRF_COOKIE_NAME: z
      .string()
      .min(1)
      .default('vrb_participant_csrf'),
    R2_ENDPOINT: optionalString(z.string().url()),
    R2_BUCKET_NAME: optionalString(z.string().min(1)),
    R2_ACCESS_KEY_ID: optionalString(z.string().min(1)),
    R2_SECRET_ACCESS_KEY: optionalString(z.string().min(1)),
    STORAGE_DRIVER: z.enum(['r2', 'local']).default('local'),
    LOCAL_STORAGE_ROOT: z.string().min(1).default('.local-storage'),
    BIB_TEMPLATE_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(4_000_000),
    SUBMISSION_SCREENSHOT_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(6_000_000),
    REVIEW_CLAIM_DURATION_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(30),
    SMTP_HOST: optionalString(z.string().min(1)),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USERNAME: optionalString(z.string().min(1)),
    SMTP_PASSWORD: optionalString(z.string().min(1)),
    SMTP_FROM_EMAIL: optionalString(z.string().email()),
    EMAIL_DRIVER: z.enum(['smtp', 'log']).default('log'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === 'production' &&
      value.TURNSTILE_DEVELOPMENT_BYPASS === 'true'
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['TURNSTILE_DEVELOPMENT_BYPASS'],
        message: 'Turnstile development bypass is not allowed in production',
      });
    }

    if (value.NODE_ENV === 'production' && value.STORAGE_DRIVER === 'local') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STORAGE_DRIVER'],
        message: 'Local storage driver is not allowed in production',
      });
    }

    if (value.NODE_ENV === 'production' && value.EMAIL_DRIVER === 'log') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EMAIL_DRIVER'],
        message: 'Log email driver is not allowed in production',
      });
    }

    if (value.STORAGE_DRIVER === 'r2') {
      for (const key of [
        'R2_ENDPOINT',
        'R2_BUCKET_NAME',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
      ] as const) {
        if (!value[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=r2`,
          });
        }
      }
    }

    if (value.EMAIL_DRIVER === 'smtp') {
      for (const key of [
        'SMTP_HOST',
        'SMTP_USERNAME',
        'SMTP_PASSWORD',
        'SMTP_FROM_EMAIL',
      ] as const) {
        if (!value[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when EMAIL_DRIVER=smtp`,
          });
        }
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => issue.path.join('.'))
    .join(', ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;

export type AppEnv = typeof env;

export function requireEnv<K extends keyof AppEnv>(
  key: K,
): NonNullable<AppEnv[K]> {
  const value = env[key];

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }

  return value as NonNullable<AppEnv[K]>;
}
