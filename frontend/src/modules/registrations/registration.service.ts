import { createHash, randomBytes } from "node:crypto";
import { withTransaction } from "@/db/transaction";
import { createAuditLog } from "@/modules/audit/audit.repository";
import type { AuthenticatedAdmin } from "@/modules/auth/auth.types";
import { canAccessEventManagement, hasAnyRole } from "@/modules/auth/auth.policy";
import { listActiveCategoriesByEventId } from "@/modules/categories/category.repository";
import type { EventCategoryRecord } from "@/modules/categories/category.types";
import { createEmailDelivery } from "@/modules/email/email.repository";
import { getPublishedEventBySlug } from "@/modules/events/event.repository";
import { getManageableEvent } from "@/modules/events/event.service";
import { isEventPubliclyVisible } from "@/modules/events/event.policy";
import type { EventRecord } from "@/modules/events/event.types";
import { enqueueBackgroundJob } from "@/modules/jobs/job.repository";
import {
  createParticipant,
  findActiveParticipantByEmail,
  findActiveParticipantByPhone,
  updateParticipantByAdmin,
  type ParticipantInput,
  type ParticipantRecord,
} from "@/modules/participants/participant.repository";
import {
  normalizeEmail,
  normalizeIndonesianPhone,
} from "@/modules/participants/domain/participant-normalization";
import {
  countActiveCategoryRegistrations,
  countActiveEventRegistrations,
  countRecentSecurityAttempts,
  createEventRegistration,
  createIdempotencyRecord,
  createParticipantAccessSession,
  createRegistrationCategory,
  completeIdempotencyRecord,
  findIdempotencyRecord,
  findParticipantSession,
  findLatestEncryptedRegistrationCode,
  findRegistrationForAccess,
  getGlobalParticipantStatsForAdmin,
  getActiveRegistrationByParticipantEvent,
  getOrCreateBibSettingsForUpdate,
  getRegistrationSummary,
  listGlobalParticipantFilterOptionsForAdmin,
  listGlobalParticipantRecentActivitiesForAdmin,
  listGlobalParticipantsForAdmin,
  listGlobalParticipantTopEventsForAdmin,
  listLatestGlobalParticipantsForAdmin,
  listRegistrationsForAdmin,
  recordSecurityAttempt,
  advanceBibSequence,
} from "@/modules/registrations/registration.repository";
import type {
  GlobalParticipantListFilters,
  GlobalParticipantPageData,
  GlobalParticipantStatus,
  RegistrationListFilters,
  RegistrationListItem,
  RegistrationSummary,
} from "@/modules/registrations/registration.types";
import type {
  AdminParticipantUpdateInput,
  ParticipantAccessInput,
  PublicRegistrationInput,
} from "@/modules/registrations/registration.schema";
import { decryptString, encryptString } from "@/shared/security/encryption";
import { createOpaqueToken, hashSensitiveToken } from "@/shared/security/token";
import { env } from "@/shared/config/env";
import { ApplicationError } from "@/shared/errors/application-error";
import { isDatabaseErrorCode } from "@/shared/errors/database";
import { formatBibNumber } from "@/modules/bib/bib.service";

const identityConflictMessage =
  "Data email dan nomor HP belum dapat diverifikasi sebagai identitas yang sama. Periksa kembali data atau gunakan akses peserta untuk melanjutkan.";

const globalParticipantStatuses: GlobalParticipantStatus[] = [
  "VERIFIED",
  "PENDING_UPLOAD",
  "ACTIVE",
  "CANCELLED",
];

const globalParticipantPageSizes = [10, 20, 50, 100];

type RequestContext = {
  correlationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export type ParticipantSessionToken = {
  token: string;
  csrfToken: string;
  expiresAt: Date;
};

export type RegistrationResult = {
  registrationId: string;
  participantSession: ParticipantSessionToken;
};

export type ParticipantRegistrationSessionSummary = {
  summary: RegistrationSummary;
  registrationCode: string | null;
  csrfTokenHash: string | null;
};

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function rateLimitIdentifier(value: string): string {
  return hashSensitiveToken(value);
}

function assertRegistrationOpen(event: EventRecord, categoryCount: number): void {
  const now = new Date();

  if (!isEventPubliclyVisible(event) || event.publicationStatus !== "PUBLISHED") {
    throw new ApplicationError({
      code: "NOT_FOUND",
      message: "Event is not publicly registerable",
      safeMessage: "Event tidak tersedia untuk pendaftaran.",
      statusCode: 404,
    });
  }

  if (event.registrationStartsAt > now) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Registration has not opened",
      safeMessage: "Pendaftaran belum dibuka.",
      statusCode: 400,
    });
  }

  if (event.registrationEndsAt < now) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "Registration has closed",
      safeMessage: "Pendaftaran telah berakhir.",
      statusCode: 400,
    });
  }

  if (categoryCount < 1) {
    throw new ApplicationError({
      code: "VALIDATION_FAILED",
      message: "No active categories",
      safeMessage: "Kategori pendaftaran belum tersedia.",
      statusCode: 400,
    });
  }
}

function calculateAge(dateOfBirth: string, at: Date): number {
  const birth = new Date(`${dateOfBirth}T00:00:00.000Z`);
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - birth.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }

  return age;
}

function assertCategoryRequirements(
  event: EventRecord,
  categories: EventCategoryRecord[],
  input: PublicRegistrationInput,
): void {
  for (const category of categories) {
    if (
      (category.minimumAgeYears !== null || category.maximumAgeYears !== null) &&
      !input.dateOfBirth
    ) {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Date of birth is required by category",
        safeMessage: "Tanggal lahir wajib diisi untuk kategori yang dipilih.",
        statusCode: 400,
      });
    }

    if (input.dateOfBirth) {
      const age = calculateAge(input.dateOfBirth, event.activityStartsAt);

      if (
        (category.minimumAgeYears !== null && age < category.minimumAgeYears) ||
        (category.maximumAgeYears !== null && age > category.maximumAgeYears)
      ) {
        throw new ApplicationError({
          code: "VALIDATION_FAILED",
          message: "Participant age does not match category",
          safeMessage: "Usia peserta belum sesuai dengan kategori yang dipilih.",
          statusCode: 400,
        });
      }
    }

    if (category.genderDivision === "MALE" || category.genderDivision === "FEMALE") {
      if (!input.gender || input.gender !== category.genderDivision) {
        throw new ApplicationError({
          code: "VALIDATION_FAILED",
          message: "Participant gender does not match category",
          safeMessage: "Gender peserta belum sesuai dengan kategori yang dipilih.",
          statusCode: 400,
        });
      }
    }
  }
}

async function verifyTurnstile(token: string, ipAddress: string | null): Promise<void> {
  if (env.TURNSTILE_DEVELOPMENT_BYPASS === "true" && env.NODE_ENV !== "production") {
    return;
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    throw new ApplicationError({
      code: "CONFIGURATION_MISSING",
      message: "Turnstile secret is missing",
      safeMessage: "Verifikasi keamanan belum dikonfigurasi.",
      statusCode: 500,
    });
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
  });

  if (ipAddress) {
    body.set("remoteip", ipAddress);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const result = (await response.json()) as { success?: boolean };

  if (!result.success) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Turnstile verification failed",
      safeMessage: "Verifikasi keamanan belum berhasil. Coba ulangi beberapa saat lagi.",
      statusCode: 403,
    });
  }
}

async function assertRateLimit(input: {
  eventId: string | null;
  type: "REGISTRATION_SUBMIT" | "PARTICIPANT_ACCESS";
  identifiers: string[];
  ipAddress: string | null;
}): Promise<void> {
  const since = new Date(Date.now() - 15 * 60 * 1000);

  for (const identifier of input.identifiers) {
    const count = await countRecentSecurityAttempts({
      eventId: input.eventId,
      attemptType: input.type,
      identifierHash: rateLimitIdentifier(identifier),
      since,
    });

    if (count >= 8) {
      throw new ApplicationError({
        code: "RATE_LIMITED",
        message: "Public registration/access is rate limited",
        safeMessage: "Permintaan belum dapat diproses. Coba lagi beberapa saat lagi.",
        statusCode: 429,
      });
    }
  }
}

function createRegistrationCode(event: EventRecord): string {
  const initials =
    event.name
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((item) => item[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "VRB";
  const year = String(event.activityStartsAt.getFullYear()).slice(-2);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";

  for (const byte of randomBytes(8)) {
    randomPart += alphabet[byte % alphabet.length];
  }

  return `${initials}${year}-${randomPart.slice(0, 6)}`;
}

function sessionExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function createParticipantSessionTokens(): ParticipantSessionToken {
  return {
    token: createOpaqueToken(),
    csrfToken: createOpaqueToken(),
    expiresAt: sessionExpiry(),
  };
}

function participantInputFromRegistration(
  input: PublicRegistrationInput | AdminParticipantUpdateInput,
): ParticipantInput {
  return {
    fullName: input.fullName,
    normalizedEmail: normalizeEmail(input.displayEmail),
    displayEmail: input.displayEmail.trim(),
    normalizedPhone: normalizeIndonesianPhone(input.displayPhone),
    displayPhone: input.displayPhone.trim(),
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    province: input.province,
    cityOrRegency: input.cityOrRegency,
    district: input.district,
    postalCode: input.postalCode,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone
      ? normalizeIndonesianPhone(input.emergencyContactPhone)
      : null,
  };
}

function serializeParticipantForAudit(participant: ParticipantRecord) {
  return {
    fullName: participant.fullName,
    normalizedEmail: participant.normalizedEmail,
    normalizedPhone: participant.normalizedPhone,
    gender: participant.gender,
    dateOfBirth: participant.dateOfBirth,
    province: participant.province,
    cityOrRegency: participant.cityOrRegency,
  };
}

export async function registerParticipantForEvent(input: {
  slug: string;
  registration: PublicRegistrationInput;
  requestContext: RequestContext;
}): Promise<RegistrationResult> {
  const normalizedEmail = normalizeEmail(input.registration.displayEmail);
  const normalizedPhone = normalizeIndonesianPhone(input.registration.displayPhone);
  await assertRateLimit({
    eventId: null,
    type: "REGISTRATION_SUBMIT",
    identifiers: [
      input.requestContext.ipAddress ?? "unknown-ip",
      normalizedEmail,
      normalizedPhone,
      input.slug,
    ],
    ipAddress: input.requestContext.ipAddress,
  });
  await verifyTurnstile(input.registration.turnstileToken, input.requestContext.ipAddress);

  const requestFingerprint = fingerprint({
    ...input.registration,
    displayEmail: normalizedEmail,
    displayPhone: normalizedPhone,
  });
  const operation = `registration:${input.slug}`;

  return withTransaction(async (client) => {
    const idempotencyRecord = await findIdempotencyRecord(
      operation,
      input.registration.idempotencyKey,
      client,
    );

    if (idempotencyRecord) {
      if (idempotencyRecord.requestFingerprint !== requestFingerprint) {
        throw new ApplicationError({
          code: "CONFLICT",
          message: "Idempotency key payload mismatch",
          safeMessage: "Permintaan duplikat tidak cocok dengan data sebelumnya.",
          statusCode: 409,
        });
      }

      if (idempotencyRecord.responseReference) {
        const participantSession = createParticipantSessionTokens();
        const summary = await getRegistrationSummary(idempotencyRecord.responseReference, client);

        if (!summary) {
          throw new ApplicationError({
            code: "NOT_FOUND",
            message: "Idempotent registration result not found",
            safeMessage: "Data pendaftaran belum ditemukan.",
            statusCode: 404,
          });
        }

        await createParticipantAccessSession(
          {
            eventRegistrationId: summary.registration.id,
            participantId: summary.participant.id,
            sessionTokenHash: hashSensitiveToken(participantSession.token),
            csrfTokenHash: hashSensitiveToken(participantSession.csrfToken),
            expiresAt: participantSession.expiresAt,
          },
          client,
        );
        return {
          registrationId: summary.registration.id,
          participantSession,
        };
      }
    } else {
      await createIdempotencyRecord(
        {
          operation,
          key: input.registration.idempotencyKey,
          requestFingerprint,
        },
        client,
      );
    }

    const event = await getPublishedEventBySlug(input.slug, client);

    if (!event) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        message: "Event not found",
        safeMessage: "Event tidak ditemukan.",
        statusCode: 404,
      });
    }

    const activeCategories = await listActiveCategoriesByEventId(event.id, client);
    assertRegistrationOpen(event, activeCategories.length);
    const selectedIds = new Set(input.registration.categoryIds);

    if (selectedIds.size !== input.registration.categoryIds.length) {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Duplicate category selection",
        safeMessage: "Kategori yang dipilih tidak boleh duplikat.",
        statusCode: 400,
      });
    }

    const selectedCategories = activeCategories.filter((category) => selectedIds.has(category.id));

    if (selectedCategories.length !== selectedIds.size) {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Selected category is invalid",
        safeMessage: "Kategori yang dipilih tidak tersedia.",
        statusCode: 400,
      });
    }

    assertCategoryRequirements(event, selectedCategories, input.registration);

    if (event.maximumParticipants !== null) {
      const eventCount = await countActiveEventRegistrations(event.id, client);

      if (eventCount >= event.maximumParticipants) {
        throw new ApplicationError({
          code: "CONFLICT",
          message: "Event quota is full",
          safeMessage: "Kuota event sudah penuh.",
          statusCode: 409,
        });
      }
    }

    for (const category of selectedCategories) {
      if (category.participantQuota !== null) {
        const categoryCount = await countActiveCategoryRegistrations(category.id, client);

        if (categoryCount >= category.participantQuota) {
          throw new ApplicationError({
            code: "CONFLICT",
            message: "Category quota is full",
            safeMessage: `Kuota kategori ${category.name} sudah penuh.`,
            statusCode: 409,
          });
        }
      }
    }

    const emailParticipant = await findActiveParticipantByEmail(normalizedEmail, client);
    const phoneParticipant = await findActiveParticipantByPhone(normalizedPhone, client);

    if (
      (emailParticipant && phoneParticipant && emailParticipant.id !== phoneParticipant.id) ||
      (emailParticipant && !phoneParticipant) ||
      (!emailParticipant && phoneParticipant)
    ) {
      await recordSecurityAttempt(
        {
          eventId: event.id,
          attemptType: "REGISTRATION_SUBMIT",
          identifierHash: rateLimitIdentifier(`${normalizedEmail}:${normalizedPhone}`),
          ipAddress: input.requestContext.ipAddress,
          success: false,
        },
        client,
      );
      await createAuditLog(
        {
          actorType: "PARTICIPANT_PUBLIC",
          actorId: null,
          action: "PARTICIPANT_IDENTITY_CONFLICT",
          entityType: "EVENT",
          entityId: event.id,
          eventId: event.id,
          newValues: { reason: "email_phone_mismatch" },
          ipAddress: input.requestContext.ipAddress,
          userAgent: input.requestContext.userAgent,
          correlationId: input.requestContext.correlationId,
        },
        client,
      );
      throw new ApplicationError({
        code: "CONFLICT",
        message: "Participant identity conflict",
        safeMessage: identityConflictMessage,
        statusCode: 409,
      });
    }

    const participant =
      emailParticipant ??
      (await createParticipant(participantInputFromRegistration(input.registration), client));
    const existingRegistration = await getActiveRegistrationByParticipantEvent(
      participant.id,
      event.id,
      client,
    );

    if (existingRegistration) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: "Participant already registered for event",
        safeMessage:
          "Anda sudah terdaftar pada event ini. Gunakan akses peserta untuk melanjutkan.",
        statusCode: 409,
      });
    }

    const bibSettings = await getOrCreateBibSettingsForUpdate(event.id, client);
    const bibSequence = bibSettings.next_sequence;
    const bibNumber = formatBibNumber({
      sequence: bibSequence,
      prefix: bibSettings.bib_prefix,
      suffix: bibSettings.bib_suffix,
      padding: bibSettings.numeric_padding,
    });
    await advanceBibSequence(event.id, bibSequence + 1, client);
    const registrationCode = createRegistrationCode(event);
    const registrationCodeHash = hashSensitiveToken(registrationCode);
    const registration = await createEventRegistration(
      {
        eventId: event.id,
        participantId: participant.id,
        registrationCodeLookup: registrationCodeHash.slice(0, 16),
        registrationCodeHash,
        bibSequence,
        bibNumber,
        termsVersion: `event:${event.id}:2026-07-24`,
        source: "PUBLIC_WEB",
      },
      client,
    );

    for (const category of selectedCategories) {
      await createRegistrationCategory(registration.id, category.id, client);
    }

    const participantSession = createParticipantSessionTokens();
    await createParticipantAccessSession(
      {
        eventRegistrationId: registration.id,
        participantId: participant.id,
        sessionTokenHash: hashSensitiveToken(participantSession.token),
        encryptedRegistrationCode: encryptString(registrationCode),
        csrfTokenHash: hashSensitiveToken(participantSession.csrfToken),
        expiresAt: participantSession.expiresAt,
      },
      client,
    );
    await createEmailDelivery(
      {
        eventRegistrationId: registration.id,
        recipientEmail: participant.normalizedEmail,
        emailType: "REGISTRATION_CONFIRMATION",
      },
      client,
    );
    await enqueueBackgroundJob(
      {
        jobType: "GENERATE_BIB",
        payload: { registrationId: registration.id },
      },
      client,
    );
    await enqueueBackgroundJob(
      {
        jobType: "SEND_REGISTRATION_CONFIRMATION",
        payload: {
          registrationId: registration.id,
          encryptedRegistrationCode: encryptString(registrationCode),
        },
      },
      client,
    );
    await completeIdempotencyRecord(
      {
        operation,
        key: input.registration.idempotencyKey,
        responseReference: registration.id,
      },
      client,
    );
    await recordSecurityAttempt(
      {
        eventId: event.id,
        attemptType: "REGISTRATION_SUBMIT",
        identifierHash: rateLimitIdentifier(`${normalizedEmail}:${normalizedPhone}`),
        ipAddress: input.requestContext.ipAddress,
        success: true,
      },
      client,
    );
    await createAuditLog(
      {
        actorType: "PARTICIPANT_PUBLIC",
        actorId: participant.id,
        action: "EVENT_REGISTRATION_CREATED",
        entityType: "EVENT_REGISTRATION",
        entityId: registration.id,
        eventId: event.id,
        newValues: {
          categoryCount: selectedCategories.length,
          bibNumber,
        },
        ipAddress: input.requestContext.ipAddress,
        userAgent: input.requestContext.userAgent,
        correlationId: input.requestContext.correlationId,
      },
      client,
    );

    return {
      registrationId: registration.id,
      participantSession,
    };
  }).catch((error) => {
    if (isDatabaseErrorCode(error, "23505")) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: "Registration conflict",
        safeMessage: "Pendaftaran belum dapat diproses karena data sudah digunakan.",
        statusCode: 409,
        cause: error,
      });
    }

    throw error;
  });
}

export async function createParticipantSessionForAccess(input: {
  eventSlug: string;
  access: ParticipantAccessInput;
  requestContext: RequestContext;
}): Promise<RegistrationResult> {
  const normalizedEmail = normalizeEmail(input.access.displayEmail);
  const codeHash = hashSensitiveToken(input.access.registrationCode.toUpperCase());
  await assertRateLimit({
    eventId: null,
    type: "PARTICIPANT_ACCESS",
    identifiers: [normalizedEmail, input.requestContext.ipAddress ?? "unknown-ip"],
    ipAddress: input.requestContext.ipAddress,
  });

  return withTransaction(async (client) => {
    const registration = await findRegistrationForAccess(
      {
        codeLookup: codeHash.slice(0, 16),
        codeHash,
        normalizedEmail,
        eventSlug: input.eventSlug,
      },
      client,
    );

    if (!registration) {
      await recordSecurityAttempt(
        {
          eventId: null,
          attemptType: "PARTICIPANT_ACCESS",
          identifierHash: rateLimitIdentifier(normalizedEmail),
          ipAddress: input.requestContext.ipAddress,
          success: false,
        },
        client,
      );
      throw new ApplicationError({
        code: "UNAUTHORIZED",
        message: "Participant access failed",
        safeMessage: "Kode registrasi atau email belum cocok.",
        statusCode: 401,
      });
    }

    const participantSession = createParticipantSessionTokens();
    await createParticipantAccessSession(
      {
        eventRegistrationId: registration.id,
        participantId: registration.participantId,
        sessionTokenHash: hashSensitiveToken(participantSession.token),
        encryptedRegistrationCode: encryptString(input.access.registrationCode.toUpperCase()),
        csrfTokenHash: hashSensitiveToken(participantSession.csrfToken),
        expiresAt: participantSession.expiresAt,
      },
      client,
    );
    await recordSecurityAttempt(
      {
        eventId: registration.eventId,
        attemptType: "PARTICIPANT_ACCESS",
        identifierHash: rateLimitIdentifier(normalizedEmail),
        ipAddress: input.requestContext.ipAddress,
        success: true,
      },
      client,
    );

    return {
      registrationId: registration.id,
      participantSession,
    };
  });
}

export async function getRegistrationForParticipantSession(
  sessionToken: string | undefined,
): Promise<ParticipantRegistrationSessionSummary | null> {
  if (!sessionToken) {
    return null;
  }

  const session = await findParticipantSession(hashSensitiveToken(sessionToken));

  if (!session) {
    return null;
  }

  const summary = await getRegistrationSummary(session.eventRegistrationId);

  if (!summary) {
    return null;
  }

  return {
    summary,
    registrationCode: session.encryptedRegistrationCode
      ? decryptString(session.encryptedRegistrationCode)
      : null,
    csrfTokenHash: session.csrfTokenHash,
  };
}

export async function listEventRegistrationsForAdmin(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  filters: RegistrationListFilters;
}): Promise<RegistrationListItem[]> {
  if (!canAccessEventManagement(input.admin)) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Admin cannot list participants",
      safeMessage: "Akun admin belum dapat melihat peserta event.",
      statusCode: 403,
    });
  }

  await getManageableEvent(input.eventId, input.admin);
  return listRegistrationsForAdmin(input.eventId, input.filters);
}

function normalizeGlobalParticipantFilters(
  filters: GlobalParticipantListFilters,
): Required<GlobalParticipantListFilters> {
  const page = Math.max(1, Math.trunc(filters.page ?? 1));
  const requestedPageSize = Math.trunc(filters.pageSize ?? 10);
  const pageSize = globalParticipantPageSizes.includes(requestedPageSize) ? requestedPageSize : 10;
  const status = globalParticipantStatuses.find((item) => item === filters.status) ?? null;

  return {
    search: filters.search?.trim() || null,
    eventId: filters.eventId || null,
    categoryId: filters.categoryId || null,
    status,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    page,
    pageSize,
  };
}

export async function getGlobalParticipantsForAdmin(input: {
  admin: AuthenticatedAdmin;
  filters: GlobalParticipantListFilters;
}): Promise<GlobalParticipantPageData> {
  if (!canAccessEventManagement(input.admin)) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Admin cannot list global participants",
      safeMessage: "Akun admin belum dapat melihat database peserta.",
      statusCode: 403,
    });
  }

  const filters = normalizeGlobalParticipantFilters(input.filters);
  const scope = {
    adminId: input.admin.id,
    isSuperAdmin: true,
  };

  const [stats, listResult, latestParticipants, topEvents, recentActivities, filterOptions] =
    await Promise.all([
      getGlobalParticipantStatsForAdmin(scope),
      listGlobalParticipantsForAdmin(scope, filters),
      listLatestGlobalParticipantsForAdmin(scope),
      listGlobalParticipantTopEventsForAdmin(scope),
      listGlobalParticipantRecentActivitiesForAdmin(scope),
      listGlobalParticipantFilterOptionsForAdmin(scope),
    ]);
  const totalPages = Math.max(1, Math.ceil(listResult.totalItems / filters.pageSize));

  return {
    stats,
    items: listResult.items,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      totalItems: listResult.totalItems,
      totalPages,
    },
    latestParticipants,
    topEvents,
    recentActivities,
    filterOptions,
  };
}

export async function getEventRegistrationForAdmin(input: {
  registrationId: string;
  admin: AuthenticatedAdmin;
}): Promise<RegistrationSummary> {
  if (!canAccessEventManagement(input.admin)) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Admin cannot view participant",
      safeMessage: "Akun admin belum dapat melihat peserta event.",
      statusCode: 403,
    });
  }

  const summary = await getRegistrationSummary(input.registrationId);

  if (!summary) {
    throw new ApplicationError({
      code: "NOT_FOUND",
      message: "Registration not found",
      safeMessage: "Pendaftaran tidak ditemukan.",
      statusCode: 404,
    });
  }

  await getManageableEvent(summary.event.id, input.admin);
  return summary;
}

export async function requestRegistrationEmailResendForAdmin(input: {
  registrationId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  if (!hasAnyRole(input.admin, ["SUPER_ADMIN", "EVENT_ADMIN"])) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Admin cannot resend registration email",
      safeMessage: "Akun admin belum dapat mengirim ulang email peserta.",
      statusCode: 403,
    });
  }

  await withTransaction(async (client) => {
    const summary = await getRegistrationSummary(input.registrationId, client);

    if (!summary) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        message: "Registration not found",
        safeMessage: "Pendaftaran tidak ditemukan.",
        statusCode: 404,
      });
    }

    await getManageableEvent(summary.event.id, input.admin);

    if (summary.registration.registrationStatus === "CANCELLED") {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Cancelled registration cannot receive resend email",
        safeMessage: "Email tidak dapat dikirim ulang untuk pendaftaran yang dibatalkan.",
        statusCode: 400,
      });
    }

    if (summary.participant.status !== "ACTIVE") {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Inactive participant cannot receive resend email",
        safeMessage: "Email tidak dapat dikirim ulang untuk peserta yang tidak aktif.",
        statusCode: 400,
      });
    }

    const encryptedRegistrationCode = await findLatestEncryptedRegistrationCode(
      summary.registration.id,
      client,
    );

    if (!encryptedRegistrationCode) {
      throw new ApplicationError({
        code: "VALIDATION_FAILED",
        message: "Encrypted registration code is unavailable",
        safeMessage: "Kode registrasi tidak tersedia untuk dikirim ulang.",
        statusCode: 400,
      });
    }

    const emailDeliveryId = await createEmailDelivery(
      {
        eventRegistrationId: summary.registration.id,
        recipientEmail: summary.participant.normalizedEmail,
        emailType: "REGISTRATION_CONFIRMATION",
      },
      client,
    );

    await enqueueBackgroundJob(
      {
        jobType: "SEND_REGISTRATION_CONFIRMATION",
        payload: {
          registrationId: summary.registration.id,
          encryptedRegistrationCode,
          emailDeliveryId,
        },
      },
      client,
    );

    await createAuditLog(
      {
        actorType: "ADMIN_USER",
        actorId: input.admin.id,
        action: "REGISTRATION_EMAIL_RESEND_REQUESTED",
        entityType: "EVENT_REGISTRATION",
        entityId: summary.registration.id,
        eventId: summary.event.id,
        newValues: {
          emailDeliveryId,
          emailType: "REGISTRATION_CONFIRMATION",
        },
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId,
      },
      client,
    );
  });
}

export async function updateParticipantForAdmin(input: {
  registrationId: string;
  admin: AuthenticatedAdmin;
  participant: AdminParticipantUpdateInput;
  correlationId: string | null;
}): Promise<void> {
  if (!hasAnyRole(input.admin, ["SUPER_ADMIN", "EVENT_ADMIN"])) {
    throw new ApplicationError({
      code: "FORBIDDEN",
      message: "Admin role cannot edit participant",
      safeMessage: "Akun admin belum dapat memperbarui data peserta.",
      statusCode: 403,
    });
  }

  await withTransaction(async (client) => {
    const summary = await getRegistrationSummary(input.registrationId, client);

    if (!summary) {
      throw new ApplicationError({
        code: "NOT_FOUND",
        message: "Registration not found",
        safeMessage: "Pendaftaran tidak ditemukan.",
        statusCode: 404,
      });
    }

    await getManageableEvent(summary.event.id, input.admin);
    const participantInput = participantInputFromRegistration(input.participant);
    const emailOwner = await findActiveParticipantByEmail(participantInput.normalizedEmail, client);
    const phoneOwner = await findActiveParticipantByPhone(participantInput.normalizedPhone, client);

    if (
      (emailOwner && emailOwner.id !== summary.participant.id) ||
      (phoneOwner && phoneOwner.id !== summary.participant.id)
    ) {
      throw new ApplicationError({
        code: "CONFLICT",
        message: "Participant contact uniqueness conflict",
        safeMessage: "Email atau nomor HP sudah digunakan peserta aktif lain.",
        statusCode: 409,
      });
    }

    const updatedParticipant = await updateParticipantByAdmin(
      summary.participant.id,
      participantInput,
      client,
    );
    const shouldRegenerate =
      summary.participant.fullName !== updatedParticipant.fullName &&
      summary.templateVersionId !== null;

    if (shouldRegenerate) {
      await enqueueBackgroundJob(
        {
          jobType: "GENERATE_BIB",
          payload: { registrationId: summary.registration.id },
        },
        client,
      );
    }

    await createAuditLog(
      {
        actorType: "ADMIN_USER",
        actorId: input.admin.id,
        action: "PARTICIPANT_UPDATED",
        entityType: "PARTICIPANT",
        entityId: summary.participant.id,
        eventId: summary.event.id,
        previousValues: serializeParticipantForAudit(summary.participant),
        newValues: serializeParticipantForAudit(updatedParticipant),
        correlationId: input.correlationId,
      },
      client,
    );
  });
}
