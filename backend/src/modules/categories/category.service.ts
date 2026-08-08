import { withTransaction } from '@/db/transaction';
import { createAuditLog } from '@/modules/audit/audit.repository';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import { assertCanManageEvent } from '@/modules/events/event.policy';
import {
  getEventById,
  getEventByIdForAdmin,
} from '@/modules/events/event.repository';
import type {
  CategoryInput,
  EventCategoryRecord,
} from '@/modules/categories/category.types';
import { assertCategoryPolicy } from '@/modules/categories/category.policy';
import {
  createCategory,
  getCategoryById,
  listCategoriesByEventId,
  setCategoryActiveStatus,
  updateCategory,
} from '@/modules/categories/category.repository';
import { ApplicationError } from '@/shared/errors/application-error';
import { isDatabaseErrorCode } from '@/shared/errors/database';

function assertCategoryExists(
  category: EventCategoryRecord | null,
): asserts category is EventCategoryRecord {
  if (!category) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Category not found',
      safeMessage: 'Kategori tidak ditemukan.',
      statusCode: 404,
    });
  }
}

async function getAuthorizedEvent(eventId: string, admin: AuthenticatedAdmin) {
  const event = await getEventByIdForAdmin(eventId, admin);

  if (!event) {
    throw new ApplicationError({
      code: 'NOT_FOUND',
      message: 'Event not found or not accessible',
      safeMessage: 'Event tidak ditemukan atau tidak dapat diakses.',
      statusCode: 404,
    });
  }

  assertCanManageEvent(admin, event);
  return event;
}

export async function listManageableCategories(
  eventId: string,
  admin: AuthenticatedAdmin,
): Promise<EventCategoryRecord[]> {
  await getAuthorizedEvent(eventId, admin);
  return listCategoriesByEventId(eventId);
}

export async function createManagedCategory(input: {
  eventId: string;
  category: CategoryInput;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<EventCategoryRecord> {
  assertCategoryPolicy(input.category);

  return withTransaction(async (client) => {
    const event = await getEventById(input.eventId, client);

    if (!event) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Event not found',
        safeMessage: 'Event tidak ditemukan.',
        statusCode: 404,
      });
    }

    assertCanManageEvent(input.admin, event);

    try {
      const category = await createCategory(
        input.eventId,
        input.category,
        client,
      );
      await createAuditLog(
        {
          actorType: 'ADMIN_USER',
          actorId: input.admin.id,
          action: 'CATEGORY_CREATED',
          entityType: 'EVENT_CATEGORY',
          entityId: category.id,
          eventId: input.eventId,
          newValues: {
            name: category.name,
            slug: category.slug,
            distanceMeters: category.distanceMeters,
          },
          correlationId: input.correlationId,
        },
        client,
      );

      return category;
    } catch (error) {
      if (isDatabaseErrorCode(error, '23505')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'Category slug already exists in event',
          safeMessage: 'Slug kategori sudah dipakai di event ini.',
          statusCode: 409,
          cause: error,
        });
      }

      throw error;
    }
  });
}

export async function updateManagedCategory(input: {
  categoryId: string;
  category: CategoryInput;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<EventCategoryRecord> {
  assertCategoryPolicy(input.category);

  return withTransaction(async (client) => {
    const currentCategory = await getCategoryById(input.categoryId, client);
    assertCategoryExists(currentCategory);

    const event = await getEventById(currentCategory.eventId, client);

    if (!event) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Event not found',
        safeMessage: 'Event tidak ditemukan.',
        statusCode: 404,
      });
    }

    assertCanManageEvent(input.admin, event);

    try {
      const category = await updateCategory(
        input.categoryId,
        input.category,
        client,
      );
      await createAuditLog(
        {
          actorType: 'ADMIN_USER',
          actorId: input.admin.id,
          action: 'CATEGORY_UPDATED',
          entityType: 'EVENT_CATEGORY',
          entityId: category.id,
          eventId: category.eventId,
          previousValues: {
            name: currentCategory.name,
            slug: currentCategory.slug,
            isActive: currentCategory.isActive,
          },
          newValues: {
            name: category.name,
            slug: category.slug,
            isActive: category.isActive,
          },
          correlationId: input.correlationId,
        },
        client,
      );

      return category;
    } catch (error) {
      if (isDatabaseErrorCode(error, '23505')) {
        throw new ApplicationError({
          code: 'CONFLICT',
          message: 'Category slug already exists in event',
          safeMessage: 'Slug kategori sudah dipakai di event ini.',
          statusCode: 409,
          cause: error,
        });
      }

      throw error;
    }
  });
}

export async function setManagedCategoryActiveStatus(input: {
  categoryId: string;
  isActive: boolean;
  admin: AuthenticatedAdmin;
  correlationId: string | null;
}): Promise<EventCategoryRecord> {
  return withTransaction(async (client) => {
    const currentCategory = await getCategoryById(input.categoryId, client);
    assertCategoryExists(currentCategory);

    const event = await getEventById(currentCategory.eventId, client);

    if (!event) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Event not found',
        safeMessage: 'Event tidak ditemukan.',
        statusCode: 404,
      });
    }

    assertCanManageEvent(input.admin, event);

    const category = await setCategoryActiveStatus(
      input.categoryId,
      input.isActive,
      client,
    );
    await createAuditLog(
      {
        actorType: 'ADMIN_USER',
        actorId: input.admin.id,
        action: input.isActive ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED',
        entityType: 'EVENT_CATEGORY',
        entityId: category.id,
        eventId: category.eventId,
        previousValues: { isActive: currentCategory.isActive },
        newValues: { isActive: category.isActive },
        correlationId: input.correlationId,
      },
      client,
    );

    return category;
  });
}
