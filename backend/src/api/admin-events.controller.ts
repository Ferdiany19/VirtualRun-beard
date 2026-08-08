import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { fileToWebFile } from '@/http/file';
import type { UploadedMemoryFile } from '@/http/file';
import {
  getAdminCsrfCookie,
  requireAdminFromRequest,
  requestContext,
  queryNumber,
} from '@/http/request';
import { validateAdminCsrfTokenValue } from '@/modules/auth/session';
import { categoryInputSchema } from '@/modules/categories/category.schema';
import {
  createManagedCategory,
  listManageableCategories,
  setManagedCategoryActiveStatus,
  updateManagedCategory,
} from '@/modules/categories/category.service';
import {
  eventFullCreateSchema,
  eventInputSchema,
  eventListFilterSchema,
  publicationStatuses,
} from '@/modules/events/event.schema';
import { eventStatuses } from '@/modules/events/domain/event-status';
import {
  archiveManagedEvent,
  createManagedEvent,
  createManagedEventWithCategories,
  getAdminDashboardData,
  getAdminSidebarData,
  getEventManagementPageData,
  getManageableEvent,
  getManageableEventWithCategories,
  publishManagedEvent,
  unpublishManagedEvent,
  updateManagedEvent,
  uploadManagedEventBanner,
} from '@/modules/events/event.service';
import {
  getAdminParticipantDetailForAdmin,
  getGlobalParticipantsForAdmin,
  listEventRegistrationsForAdmin,
  requestRegistrationEmailResendForAdmin,
  updateParticipantForAdmin,
} from '@/modules/registrations/registration.service';
import { adminParticipantUpdateSchema } from '@/modules/registrations/registration.schema';
import type {
  BibStatus,
  GlobalParticipantStatus,
  RegistrationStatus,
} from '@/modules/registrations/registration.types';
import { ApplicationError } from '@/shared/errors/application-error';

const registrationStatuses = [
  'ACTIVE',
  'CANCELLED',
] as const satisfies readonly RegistrationStatus[];
const bibStatuses = [
  'PENDING',
  'PROCESSING',
  'READY',
  'FAILED',
] as const satisfies readonly BibStatus[];
const registrationSorts = [
  'registered_desc',
  'registered_asc',
  'bib_asc',
  'name_asc',
] as const;
const globalParticipantStatuses = [
  'VERIFIED',
  'PENDING_UPLOAD',
  'ACTIVE',
  'CANCELLED',
] as const satisfies readonly GlobalParticipantStatus[];

@Controller('api/admin')
export class AdminEventsController {
  private async requireAdminWithCsrf(
    request: Request,
    body?: { csrfToken?: string },
  ) {
    const admin = await requireAdminFromRequest(request);

    validateAdminCsrfTokenValue({
      cookieToken: getAdminCsrfCookie(request),
      formToken: body?.csrfToken ?? request.headers['x-csrf-token']?.toString(),
      session: admin,
    });

    return admin;
  }

  @Get('dashboard')
  async dashboard(@Req() request: Request) {
    return getAdminDashboardData(await requireAdminFromRequest(request));
  }

  @Get('sidebar')
  async sidebar(@Req() request: Request) {
    return getAdminSidebarData(await requireAdminFromRequest(request));
  }

  @Get('events')
  async listEvents(
    @Req() request: Request,
    @Query() query: Record<string, string | undefined>,
  ) {
    const eventStatus =
      eventStatuses.find((item) => item === query.status) ?? null;
    const publicationStatus =
      publicationStatuses.find((item) => item === query.publication) ?? null;
    const filters = eventListFilterSchema.parse({
      search: query.search?.trim() || null,
      eventStatus,
      publicationStatus,
      period: query.period ?? null,
      page: queryNumber(query.page, 1),
      pageSize: queryNumber(query.pageSize, 10),
    });

    return getEventManagementPageData(
      await requireAdminFromRequest(request),
      filters,
    );
  }

  @Post('events')
  async createEvent(@Body() body: unknown, @Req() request: Request) {
    return createManagedEvent({
      admin: await requireAdminFromRequest(request),
      event: eventInputSchema.parse(body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('events/full-create')
  async createFullEvent(@Body() body: unknown, @Req() request: Request) {
    const bodyRecord =
      body && typeof body === 'object' ? (body as { csrfToken?: string }) : {};
    const admin = await this.requireAdminWithCsrf(request, bodyRecord);

    return createManagedEventWithCategories({
      admin,
      payload: eventFullCreateSchema.parse(body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('events/banner')
  @UseInterceptors(FileInterceptor('banner'))
  async uploadBanner(
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() banner: UploadedMemoryFile | undefined,
    @Req() request: Request,
  ) {
    const file = fileToWebFile(banner);

    if (!file) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'Event banner file is required',
        safeMessage: 'File banner wajib diunggah.',
        statusCode: 400,
      });
    }

    return uploadManagedEventBanner({
      admin: await this.requireAdminWithCsrf(request, body),
      file,
      correlationId: requestContext(request).correlationId,
    });
  }

  @Get('events/:eventId')
  async getEvent(@Param('eventId') eventId: string, @Req() request: Request) {
    return getManageableEvent(eventId, await requireAdminFromRequest(request));
  }

  @Get('events/:eventId/with-categories')
  async getEventWithCategories(
    @Param('eventId') eventId: string,
    @Req() request: Request,
  ) {
    return getManageableEventWithCategories(
      eventId,
      await requireAdminFromRequest(request),
    );
  }

  @Patch('events/:eventId')
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return updateManagedEvent({
      eventId,
      admin: await requireAdminFromRequest(request),
      event: eventInputSchema.parse(body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('events/:eventId/publish')
  async publish(@Param('eventId') eventId: string, @Req() request: Request) {
    return publishManagedEvent({
      eventId,
      admin: await requireAdminFromRequest(request),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('events/:eventId/unpublish')
  async unpublish(@Param('eventId') eventId: string, @Req() request: Request) {
    return unpublishManagedEvent({
      eventId,
      admin: await requireAdminFromRequest(request),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('events/:eventId/archive')
  async archive(@Param('eventId') eventId: string, @Req() request: Request) {
    return archiveManagedEvent({
      eventId,
      admin: await requireAdminFromRequest(request),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Get('events/:eventId/categories')
  async listCategories(
    @Param('eventId') eventId: string,
    @Req() request: Request,
  ) {
    return {
      items: await listManageableCategories(
        eventId,
        await requireAdminFromRequest(request),
      ),
    };
  }

  @Post('events/:eventId/categories')
  async createCategory(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return createManagedCategory({
      eventId,
      category: categoryInputSchema.parse(body),
      admin: await requireAdminFromRequest(request),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Patch('categories/:categoryId')
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    return updateManagedCategory({
      categoryId,
      category: categoryInputSchema.parse(body),
      admin: await requireAdminFromRequest(request),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('categories/:categoryId/active')
  async setCategoryActive(
    @Param('categoryId') categoryId: string,
    @Body() body: { isActive?: boolean },
    @Req() request: Request,
  ) {
    return setManagedCategoryActiveStatus({
      categoryId,
      isActive: Boolean(body.isActive),
      admin: await requireAdminFromRequest(request),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Get('participants')
  async globalParticipants(
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return getGlobalParticipantsForAdmin({
      admin: await requireAdminFromRequest(request),
      filters: {
        search: query.search?.trim() || null,
        eventId: query.eventId || null,
        categoryId: query.categoryId || null,
        status:
          globalParticipantStatuses.find((item) => item === query.status) ??
          null,
        dateFrom: query.dateFrom || null,
        dateTo: query.dateTo || null,
        page: queryNumber(query.page, 1),
        pageSize: queryNumber(query.pageSize, 10),
      },
    });
  }

  @Get('events/:eventId/participants')
  async participants(
    @Param('eventId') eventId: string,
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return {
      items: await listEventRegistrationsForAdmin({
        eventId,
        admin: await requireAdminFromRequest(request),
        filters: {
          search: query.search?.trim() || null,
          categoryId: query.categoryId || null,
          registrationStatus:
            registrationStatuses.find(
              (item) => item === query.registrationStatus,
            ) ?? null,
          bibStatus:
            bibStatuses.find((item) => item === query.bibStatus) ?? null,
          sort:
            registrationSorts.find((item) => item === query.sort) ??
            'registered_desc',
        },
      }),
    };
  }

  @Get('registrations/:registrationId')
  async participantDetail(
    @Param('registrationId') registrationId: string,
    @Req() request: Request,
  ) {
    return getAdminParticipantDetailForAdmin({
      registrationId,
      admin: await requireAdminFromRequest(request),
    });
  }

  @Post('registrations/:registrationId/email/resend')
  async resendParticipantEmail(
    @Param('registrationId') registrationId: string,
    @Body() body: { csrfToken?: string } | undefined,
    @Req() request: Request,
  ) {
    const context = requestContext(request);
    const admin = await requireAdminFromRequest(request);

    validateAdminCsrfTokenValue({
      cookieToken: getAdminCsrfCookie(request),
      formToken: body?.csrfToken ?? request.headers['x-csrf-token']?.toString(),
      session: admin,
    });

    await requestRegistrationEmailResendForAdmin({
      registrationId,
      admin,
      correlationId: context.correlationId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { ok: true };
  }

  @Patch('registrations/:registrationId/participant')
  async updateParticipant(
    @Param('registrationId') registrationId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    await updateParticipantForAdmin({
      registrationId,
      admin: await requireAdminFromRequest(request),
      participant: adminParticipantUpdateSchema.parse(body),
      correlationId: requestContext(request).correlationId,
    });

    return { ok: true };
  }
}
