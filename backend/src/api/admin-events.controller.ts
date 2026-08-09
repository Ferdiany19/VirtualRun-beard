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
import { z } from 'zod';
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

    let payload: z.infer<typeof eventFullCreateSchema>;

    try {
      payload = eventFullCreateSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issue = error.issues[0];
        const fieldPath = issue?.path.join('.') ?? 'data event';
        const fieldLabels: Record<string, string> = {
          'event.name': 'Nama event',
          'event.slug': 'Slug',
          'event.shortDescription': 'Deskripsi singkat',
          'event.fullDescription': 'Deskripsi event',
          'event.registrationStartsAt': 'Tanggal mulai pendaftaran',
          'event.registrationEndsAt': 'Tanggal selesai pendaftaran',
          'event.activityStartsAt': 'Tanggal mulai aktivitas',
          'event.activityEndsAt': 'Tanggal selesai aktivitas',
          'event.uploadStartsAt': 'Tanggal mulai upload',
          'event.uploadEndsAt': 'Tanggal selesai upload',
          categories: 'Kategori',
        };
        const categoryFieldLabels: Record<string, string> = {
          name: 'Nama kategori',
          slug: 'Slug kategori',
          description: 'Deskripsi kategori',
          distanceMeters: 'Jarak kategori',
          distanceToleranceMeters: 'Toleransi jarak kategori',
          participantQuota: 'Kuota kategori',
          priceAmountCents: 'Harga kategori',
        };
        const categoryFieldMatch = /^categories\.(\d+)\.(.+)$/.exec(fieldPath);
        const categoryField = categoryFieldMatch?.[2] ?? '';
        const categoryNumber = categoryFieldMatch
          ? Number(categoryFieldMatch[1]) + 1
          : null;
        const fieldLabel = categoryFieldMatch
          ? `Kategori ke-${categoryNumber} — ${categoryFieldLabels[categoryField] ?? categoryField}`
          : (fieldLabels[fieldPath] ?? fieldPath);
        let issueMessage = 'Periksa kembali nilainya.';
        if (categoryField === 'name' && issue?.code === 'too_small') {
          issueMessage = 'Wajib diisi dan minimal 2 karakter.';
        } else if (categoryField === 'slug' && issue?.code === 'invalid_string') {
          issueMessage = 'Gunakan huruf kecil, angka, dan tanda hubung.';
        } else if (fieldPath === 'categories' && issue?.code === 'too_small') {
          issueMessage = 'Minimal satu kategori harus ditambahkan.';
        } else if (fieldPath === 'event.slug') {
          issueMessage = 'Gunakan huruf kecil, angka, dan tanda hubung.';
        } else if (issue?.code === 'invalid_string') {
          issueMessage = 'Gunakan format yang sesuai.';
        } else if (issue?.code === 'invalid_type') {
          issueMessage = 'Field ini wajib diisi.';
        } else if (issue?.code === 'too_small') {
          issueMessage = 'Nilainya terlalu pendek atau belum diisi.';
        }

        throw new ApplicationError({
          code: 'VALIDATION_FAILED',
          message: `Invalid event field: ${fieldPath}`,
          safeMessage: `${fieldLabel} belum valid. ${issueMessage}`,
          statusCode: 400,
          cause: error,
        });
      }

      throw error;
    }

    return createManagedEventWithCategories({
      admin,
      payload,
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
