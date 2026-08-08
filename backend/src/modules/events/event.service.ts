import { withTransaction } from '@/db/transaction';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import type { z } from 'zod';
import {
  createAuditLog,
  listRecentAuditLogs,
  listRecentEventActivities,
} from '@/modules/audit/audit.repository';
import type { RecentAuditLog } from '@/modules/audit/audit.repository';
import { canAccessEventManagement } from '@/modules/auth/auth.policy';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import {
  createCategory,
  countActiveCategoriesByEventId,
  countCategoriesByEventIds,
  listActiveCategoriesByEventId,
  listActiveCategoriesByEventIds,
} from '@/modules/categories/category.repository';
import type { EventCategoryRecord } from '@/modules/categories/category.types';
import { assertCategoryPolicy } from '@/modules/categories/category.policy';
import {
  eventFullCreateSchema,
  eventInputSchema,
  eventListFilterSchema,
} from '@/modules/events/event.schema';
import type {
  EventDashboardCounts,
  EventManagementPageData,
  EventInput,
  EventListFilter,
  ManageableEventListItem,
  EventRecord,
} from '@/modules/events/event.types';
import {
  assertCanArchiveEvent,
  assertCanManageEvent,
  assertEventDatePolicy,
  isEventPubliclyVisible,
} from '@/modules/events/event.policy';
import {
  countEventsForAdmin,
  countFilteredEventsForAdmin,
  createEvent,
  getEventById,
  getEventByIdForAdmin,
  getPublishedEventBySlug,
  listEventsForAdmin,
  listPublishedEvents,
  setEventPublicationAndStatus,
  updateEvent,
} from '@/modules/events/event.repository';
import { countActiveRegistrationsByEventIds } from '@/modules/registrations/registration.repository';
import {
  countPendingValidationSubmissions,
  listValidationEventIdsForAdmin,
} from '@/modules/validation/validation.repository';
import { ApplicationError } from '@/shared/errors/application-error';
import { isDatabaseErrorCode } from '@/shared/errors/database';
import { putPrivateObject } from '@/modules/storage/storage.service';

export type EventWithCategories = {
  event: EventRecord;
  categories: EventCategoryRecord[];
};

export type EventFullCreateInput = z.infer<typeof eventFullCreateSchema>;

function assertCanAccessEventManagement(admin: AuthenticatedAdmin): void {
  if (!canAccessEventManagement(admin)) {
    throw new ApplicationError({
      code: 'FORBIDDEN',
      message: 'Admin role cannot access event management',
      safeMessage: 'Role Anda belum memiliki akses pengelolaan event.',
      statusCode: 403,
    });
  }
}

function parseEventInput(input: EventInput): EventInput {
  const parsed = eventInputSchema.parse(input);
  assertEventDatePolicy(parsed);
  return parsed;
}

function serializeEventChange(event: EventRecord): Record<string, unknown> {
  return {
    name: event.name,
    slug: event.slug,
    eventStatus: event.eventStatus,
    publicationStatus: event.publicationStatus,
    registrationStartsAt: event.registrationStartsAt.toISOString(),
    registrationEndsAt: event.registrationEndsAt.toISOString(),
    activityStartsAt: event.activityStartsAt.toISOString(),
    activityEndsAt: event.activityEndsAt.toISOString(),
    uploadStartsAt: event.uploadStartsAt.toISOString(),
    uploadEndsAt: event.uploadEndsAt.toISOString(),
  };
}

function assertEventFound(
  event: EventRecord | null,
): asserts event is EventRecord {
  if (!event) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Event not found',
      safeMessage: 'Event tidak ditemukan.',
      statusCode: 404,
    });
  }
}

function assertUuid(value: string, entityName: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: `${entityName} id is invalid`,
      safeMessage: `${entityName} tidak ditemukan.`,
      statusCode: 404,
    });
  }
}

export async function listManageableEvents(
  admin: AuthenticatedAdmin,
  filters: EventListFilter,
): Promise<EventRecord[]> {
  assertCanAccessEventManagement(admin);
  const parsedFilters = eventListFilterSchema.parse(filters);
  return listEventsForAdmin(admin, parsedFilters);
}

export async function listManageableEventListItems(
  admin: AuthenticatedAdmin,
  filters: EventListFilter,
): Promise<ManageableEventListItem[]> {
  const events = await listManageableEvents(admin, filters);
  return hydrateManageableEventListItems(events);
}

async function hydrateManageableEventListItems(
  events: EventRecord[],
): Promise<ManageableEventListItem[]> {
  const eventIds = events.map((event) => event.id);
  const [categoryCounts, categories, registrationCounts] = await Promise.all([
    countCategoriesByEventIds(eventIds),
    listActiveCategoriesByEventIds(eventIds),
    countActiveRegistrationsByEventIds(eventIds),
  ]);
  const countByEventId = new Map(
    categoryCounts.map((item) => [
      item.eventId,
      {
        categoryCount: item.categoryCount,
        activeCategoryCount: item.activeCategoryCount,
      },
    ]),
  );
  const categoriesByEventId = new Map<
    string,
    ManageableEventListItem['categories']
  >();

  for (const category of categories) {
    const current = categoriesByEventId.get(category.eventId) ?? [];
    current.push({
      id: category.id,
      name: category.name,
      distanceMeters: category.distanceMeters,
      genderDivision: category.genderDivision,
    });
    categoriesByEventId.set(category.eventId, current);
  }

  const registrationsByEventId = new Map(
    registrationCounts.map((item) => [item.eventId, item.registrationCount]),
  );

  return events.map((event) => {
    const counts = countByEventId.get(event.id) ?? {
      categoryCount: 0,
      activeCategoryCount: 0,
    };

    return {
      event,
      ...counts,
      activeRegistrationCount: registrationsByEventId.get(event.id) ?? 0,
      categories: categoriesByEventId.get(event.id) ?? [],
    };
  });
}

export async function getEventManagementPageData(
  admin: AuthenticatedAdmin,
  filters: EventListFilter,
): Promise<EventManagementPageData> {
  assertCanAccessEventManagement(admin);
  const parsedFilters = eventListFilterSchema.parse(filters);
  const page = parsedFilters.page ?? 1;
  const pageSize = parsedFilters.pageSize ?? 10;
  const listFilters = { ...parsedFilters, page, pageSize };
  const overviewFilters: EventListFilter = {
    search: null,
    eventStatus: null,
    publicationStatus: null,
    period: null,
    page: 1,
    pageSize: 100,
  };
  const [events, totalFiltered, counts, overviewEvents] = await Promise.all([
    listEventsForAdmin(admin, listFilters),
    countFilteredEventsForAdmin(admin, listFilters),
    countEventsForAdmin(admin),
    listEventsForAdmin(admin, overviewFilters),
  ]);
  const [items, overviewItems] = await Promise.all([
    hydrateManageableEventListItems(events),
    hydrateManageableEventListItems(overviewEvents),
  ]);
  const now = Date.now();
  const nearestClosing = overviewItems
    .filter(
      (item) =>
        item.event.publicationStatus === 'PUBLISHED' &&
        item.event.registrationEndsAt.getTime() >= now,
    )
    .sort(
      (left, right) =>
        left.event.registrationEndsAt.getTime() -
        right.event.registrationEndsAt.getTime(),
    )
    .slice(0, 3);
  const topRegistrations = [...overviewItems]
    .sort(
      (left, right) =>
        right.activeRegistrationCount - left.activeRegistrationCount,
    )
    .slice(0, 5);
  const recentActivities = await listRecentEventActivities(
    overviewItems.map((item) => item.event.id),
    5,
  );
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  return {
    counts,
    items,
    totalFiltered,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
    nearestClosing,
    topRegistrations,
    recentActivities,
  };
}

export async function getManageableEvent(
  eventId: string,
  admin: AuthenticatedAdmin,
): Promise<EventRecord> {
  assertCanAccessEventManagement(admin);
  assertUuid(eventId, 'Event');
  const event = await getEventByIdForAdmin(eventId, admin);
  assertEventFound(event);
  assertCanManageEvent(admin, event);
  return event;
}

export async function getManageableEventWithCategories(
  eventId: string,
  admin: AuthenticatedAdmin,
): Promise<EventWithCategories> {
  const event = await getManageableEvent(eventId, admin);
  const categories = await listActiveCategoriesByEventId(event.id);
  return { event, categories };
}

export async function uploadManagedEventBanner(input: {
  admin: AuthenticatedAdmin;
  file: File;
  correlationId: string | null;
}): Promise<{
  objectKey: string;
  contentType: 'image/png';
  width: number;
  height: number;
}> {
  assertCanAccessEventManagement(input.admin);

  if (input.file.size <= 0 || input.file.size > 2 * 1024 * 1024) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Event banner file size is invalid',
      safeMessage: 'File banner wajib ada dan maksimal 2MB.',
      statusCode: 400,
    });
  }

  const uploadedBuffer = Buffer.from(await input.file.arrayBuffer());
  const metadata = await sharp(uploadedBuffer).metadata();

  if (
    !metadata.width ||
    !metadata.height ||
    !['jpeg', 'jpg', 'png'].includes(metadata.format ?? '')
  ) {
    throw new ApplicationError({
      code: 'VALIDATION_FAILED',
      message: 'Event banner format is invalid',
      safeMessage: 'Banner harus berupa JPG atau PNG yang valid.',
      statusCode: 400,
    });
  }

  const buffer = await sharp(uploadedBuffer)
    .resize({
      width: 1600,
      height: 900,
      fit: 'cover',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  const objectKey = `events/_draft/banners/${randomUUID()}.png`;

  await putPrivateObject({ objectKey, body: buffer, contentType: 'image/png' });
  await createAuditLog({
    actorType: 'ADMIN_USER',
    actorId: input.admin.id,
    action: 'EVENT_BANNER_UPLOADED',
    entityType: 'EVENT',
    entityId: null,
    eventId: null,
    newValues: { objectKey, width: metadata.width, height: metadata.height },
    correlationId: input.correlationId,
  });

  return {
    objectKey,
    contentType: 'image/png',
    width: metadata.width,
    height: metadata.height,
  };
}

export async function createManagedEvent(input: {
  admin: AuthenticatedAdmin;
  event: EventInput;
  correlationId: string | null;
}): Promise<EventRecord> {
  assertCanAccessEventManagement(input.admin);
  const parsedInput = parseEventInput(input.event);

  return withTransaction(async (client) => {
    try {
      const event = await createEvent(parsedInput, input.admin.id, client);
      await createAuditLog(
        {
          actorType: 'ADMIN_USER',
          actorId: input.admin.id,
          action: 'EVENT_CREATED',
          entityType: 'EVENT',
          entityId: event.id,
          eventId: event.id,
          newValues: serializeEventChange(event),
          correlationId: input.correlationId,
        },
        client,
      );

      return event;
    } catch (error) {
      if (isDatabaseErrorCode(error, '23505')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'Event slug already exists',
          safeMessage: 'Slug event sudah digunakan.',
          statusCode: 409,
          cause: error,
        });
      }

      throw error;
    }
  });
}

export async function createManagedEventWithCategories(input: {
  admin: AuthenticatedAdmin;
  payload: EventFullCreateInput;
  correlationId: string | null;
}): Promise<EventWithCategories> {
  assertCanAccessEventManagement(input.admin);
  const parsedPayload = eventFullCreateSchema.parse(input.payload);
  const parsedEvent = parseEventInput(parsedPayload.event);
  for (const category of parsedPayload.categories) {
    assertCategoryPolicy(category);
  }

  return withTransaction(async (client) => {
    try {
      let event = await createEvent(parsedEvent, input.admin.id, client);
      const categories: EventCategoryRecord[] = [];

      for (const categoryInput of parsedPayload.categories) {
        categories.push(await createCategory(event.id, categoryInput, client));
      }

      await createAuditLog(
        {
          actorType: 'ADMIN_USER',
          actorId: input.admin.id,
          action: 'EVENT_CREATED',
          entityType: 'EVENT',
          entityId: event.id,
          eventId: event.id,
          newValues: {
            ...serializeEventChange(event),
            categoryCount: categories.length,
            mode: parsedPayload.mode,
          },
          correlationId: input.correlationId,
        },
        client,
      );

      if (parsedPayload.mode === 'PUBLISH') {
        event = await setEventPublicationAndStatus(
          event.id,
          'PUBLISHED',
          'SCHEDULED',
          input.admin.id,
          client,
        );
        await createAuditLog(
          {
            actorType: 'ADMIN_USER',
            actorId: input.admin.id,
            action: 'EVENT_PUBLISHED',
            entityType: 'EVENT',
            entityId: event.id,
            eventId: event.id,
            newValues: serializeEventChange(event),
            correlationId: input.correlationId,
          },
          client,
        );
      }

      return { event, categories };
    } catch (error) {
      if (isDatabaseErrorCode(error, '23505')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'Event or category slug already exists',
          safeMessage: 'Slug event atau kategori sudah digunakan.',
          statusCode: 409,
          cause: error,
        });
      }

      throw error;
    }
  });
}

export async function updateManagedEvent(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  event: EventInput;
  correlationId: string | null;
}): Promise<EventRecord> {
  assertCanAccessEventManagement(input.admin);
  const parsedInput = parseEventInput(input.event);

  return withTransaction(async (client) => {
    const currentEvent = await getEventById(input.eventId, client);
    assertEventFound(currentEvent);
    assertCanManageEvent(input.admin, currentEvent);

    try {
      const event = await updateEvent(
        input.eventId,
        parsedInput,
        input.admin.id,
        client,
      );
      await createAuditLog(
        {
          actorType: 'ADMIN_USER',
          actorId: input.admin.id,
          action: 'EVENT_UPDATED',
          entityType: 'EVENT',
          entityId: event.id,
          eventId: event.id,
          previousValues: serializeEventChange(currentEvent),
          newValues: serializeEventChange(event),
          correlationId: input.correlationId,
        },
        client,
      );

      return event;
    } catch (error) {
      if (isDatabaseErrorCode(error, '23505')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'Event slug already exists',
          safeMessage: 'Slug event sudah digunakan.',
          statusCode: 409,
          cause: error,
        });
      }

      throw error;
    }
  });
}

export async function publishManagedEvent(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<EventRecord> {
  assertCanAccessEventManagement(input.admin);

  return withTransaction(async (client) => {
    const currentEvent = await getEventById(input.eventId, client);
    assertEventFound(currentEvent);
    assertCanManageEvent(input.admin, currentEvent);

    const activeCategoryCount = await countActiveCategoriesByEventId(
      input.eventId,
      client,
    );

    if (activeCategoryCount < 1) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'Published event requires at least one active category',
        safeMessage: 'Tambahkan minimal satu kategori aktif sebelum publish.',
        statusCode: 400,
      });
    }

    const nextStatus =
      currentEvent.eventStatus === 'DRAFT' ? 'SCHEDULED' : null;
    const event = await setEventPublicationAndStatus(
      input.eventId,
      'PUBLISHED',
      nextStatus,
      input.admin.id,
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'EVENT_PUBLISHED',
        entityType: 'EVENT',
        entityId: event.id,
        eventId: event.id,
        previousValues: serializeEventChange(currentEvent),
        newValues: serializeEventChange(event),
        correlationId: input.correlationId,
      },
      client,
    );

    return event;
  });
}

export async function unpublishManagedEvent(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<EventRecord> {
  assertCanAccessEventManagement(input.admin);

  return withTransaction(async (client) => {
    const currentEvent = await getEventById(input.eventId, client);
    assertEventFound(currentEvent);
    assertCanManageEvent(input.admin, currentEvent);

    const event = await setEventPublicationAndStatus(
      input.eventId,
      'UNPUBLISHED',
      null,
      input.admin.id,
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'EVENT_UNPUBLISHED',
        entityType: 'EVENT',
        entityId: event.id,
        eventId: event.id,
        previousValues: serializeEventChange(currentEvent),
        newValues: serializeEventChange(event),
        correlationId: input.correlationId,
      },
      client,
    );

    return event;
  });
}

export async function archiveManagedEvent(input: {
  eventId: string;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<EventRecord> {
  assertCanAccessEventManagement(input.admin);

  return withTransaction(async (client) => {
    const currentEvent = await getEventById(input.eventId, client);
    assertEventFound(currentEvent);
    assertCanManageEvent(input.admin, currentEvent);
    assertCanArchiveEvent(currentEvent);

    const event = await setEventPublicationAndStatus(
      input.eventId,
      'ARCHIVED',
      'ARCHIVED',
      input.admin.id,
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: 'EVENT_ARCHIVED',
        entityType: 'EVENT',
        entityId: event.id,
        eventId: event.id,
        previousValues: serializeEventChange(currentEvent),
        newValues: serializeEventChange(event),
        correlationId: input.correlationId,
      },
      client,
    );

    return event;
  });
}

export async function getPublicHomepageEvents(): Promise<
  EventWithCategories[]
> {
  const events = await listPublishedEvents();
  const visibleEvents = events.filter(isEventPubliclyVisible);
  const result: EventWithCategories[] = [];

  for (const event of visibleEvents) {
    result.push({
      event,
      categories: await listActiveCategoriesByEventId(event.id),
    });
  }

  return result;
}

export async function getPublicEventBySlug(
  slug: string,
): Promise<EventWithCategories | null> {
  const event = await getPublishedEventBySlug(slug);

  if (!event || !isEventPubliclyVisible(event)) {
    return null;
  }

  return {
    event,
    categories: await listActiveCategoriesByEventId(event.id),
  };
}

export async function getAdminDashboardData(
  admin: AuthenticatedAdmin,
): Promise<{
  counts: EventDashboardCounts;
  recentAuditLogs: RecentAuditLog[];
}> {
  return {
    counts: await countEventsForAdmin(admin),
    recentAuditLogs: await listRecentAuditLogs(8),
  };
}

export async function getAdminSidebarData(admin: AuthenticatedAdmin): Promise<{
  activeEventId: string | null;
  pendingUploadCount: number;
}> {
  const manageableEvents = canAccessEventManagement(admin)
    ? await listManageableEvents(admin, {
        search: null,
        eventStatus: null,
        publicationStatus: null,
      })
    : [];
  const validationEventIds = await listValidationEventIdsForAdmin(admin);

  return {
    activeEventId: manageableEvents[0]?.id ?? validationEventIds?.[0] ?? null,
    pendingUploadCount:
      await countPendingValidationSubmissions(validationEventIds),
  };
}
