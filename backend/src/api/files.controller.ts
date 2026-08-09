import ExcelJS from 'exceljs';
import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { getEventRegistrationForAdmin } from '@/modules/registrations/registration.service';
import { getRegistrationForParticipantSession } from '@/modules/registrations/registration.service';
import {
  getAdminEvidenceFile,
  getParticipantEvidenceFile,
} from '@/modules/submissions/submission.service';
import { getBibTemplatePreviewForAdmin } from '@/modules/bib/bib.service';
import { getCertificateTemplatePreviewForAdmin } from '@/modules/certificates/certificate.service';
import { getPrivateObject } from '@/modules/storage/storage.service';
import { eventStatuses } from '@/modules/events/domain/event-status';
import { publicationStatuses } from '@/modules/events/event.schema';
import {
  getManageableEvent,
  listManageableEventListItems,
} from '@/modules/events/event.service';
import type { ManageableEventListItem } from '@/modules/events/event.types';
import {
  eventStatusLabel,
  formatDistance,
} from '@/modules/events/components/event-display';
import { getPublicEventBySlug } from '@/modules/events/event.service';
import { formatBusinessDate } from '@/shared/date/business-timezone';
import { isApplicationError } from '@/shared/errors/application-error';
import { ApplicationError } from '@/shared/errors/application-error';
import {
  getAdminSessionToken,
  getParticipantSessionToken,
  requestContext,
} from '@/http/request';
import { requireAdminSessionFromToken } from '@/modules/auth/session';

const periods = ['UPCOMING', 'ONGOING', 'PAST'] as const;

@Controller('api')
export class FilesController {
  @Get('public/events/:slug/banner')
  async publicEventBanner(
    @Param('slug') slug: string,
    @Res() response: Response,
  ) {
    const data = await getPublicEventBySlug(slug);
    const objectKey =
      data?.event.bannerObjectKey ?? data?.event.thumbnailObjectKey ?? null;

    if (!data || !objectKey || objectKey.startsWith('/')) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Event banner not found',
        safeMessage: 'Banner event tidak ditemukan.',
        statusCode: 404,
      });
    }

    const body = await getPrivateObject(objectKey);
    response
      .status(200)
      .setHeader('content-type', 'image/png')
      .setHeader('cache-control', 'public, max-age=300')
      .send(body);
  }

  @Get('admin/events/:eventId/banner')
  async adminEventBanner(
    @Param('eventId') eventId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );
    const event = await getManageableEvent(eventId, admin);
    const objectKey = event.bannerObjectKey ?? event.thumbnailObjectKey ?? null;

    if (!objectKey || objectKey.startsWith('/')) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Event banner not found',
        safeMessage: 'Banner event tidak ditemukan.',
        statusCode: 404,
      });
    }

    const body = await getPrivateObject(objectKey);
    response
      .status(200)
      .setHeader('content-type', 'image/png')
      .setHeader('cache-control', 'private, max-age=60')
      .send(body);
  }

  @Get('admin/bib/download')
  async adminBibDownload(
    @Query('registrationId') registrationId: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );

    if (!registrationId) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'Missing registration id',
        safeMessage: 'Registration wajib diisi.',
        statusCode: 400,
      });
    }

    const summary = await getEventRegistrationForAdmin({
      registrationId,
      admin,
    });

    if (summary.registration.bibStatus !== 'READY' || !summary.bibObjectKey) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'BIB is not ready',
        safeMessage: 'BIB belum tersedia.',
        statusCode: 404,
      });
    }

    const body = await getPrivateObject(summary.bibObjectKey);
    response
      .status(200)
      .setHeader('content-type', 'image/png')
      .setHeader('cache-control', 'private, no-store')
      .setHeader(
        'content-disposition',
        `attachment; filename="${summary.registration.bibNumber}.png"`,
      )
      .send(body);
  }

  @Get('participant/bib/download')
  async participantBibDownload(
    @Query('registrationId') registrationId: string | undefined,
    @Query('mode') mode: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const session = await getRegistrationForParticipantSession(
      getParticipantSessionToken(request),
    );

    if (
      !registrationId ||
      !session ||
      session.summary.registration.id !== registrationId ||
      session.summary.registration.bibStatus !== 'READY' ||
      !session.summary.bibObjectKey
    ) {
      throw new ApplicationError({
        code: 'FORBIDDEN',
        message: 'Participant cannot access BIB',
        safeMessage: 'BIB belum dapat dibuka.',
        statusCode: 403,
      });
    }

    const body = await getPrivateObject(session.summary.bibObjectKey);
    response
      .status(200)
      .setHeader('content-type', 'image/png')
      .setHeader('cache-control', 'private, no-store')
      .setHeader(
        'content-disposition',
        mode === 'preview'
          ? 'inline'
          : `attachment; filename="${session.summary.registration.bibNumber}.png"`,
      )
      .send(body);
  }

  @Get('admin/bib/template-preview')
  async templatePreview(
    @Query('templateVersionId') templateVersionId: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );

    if (!templateVersionId) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'Template version is required',
        safeMessage: 'Template version wajib diisi.',
        statusCode: 400,
      });
    }

    try {
      const { buffer } = await getBibTemplatePreviewForAdmin({
        templateVersionId,
        admin,
      });
      response
        .status(200)
        .setHeader('Cache-Control', 'private, max-age=60')
        .setHeader('Content-Type', 'image/png')
        .send(buffer);
    } catch (error) {
      if (isApplicationError(error)) {
        throw error;
      }

      throw new ApplicationError({
        code: 'INTERNAL_ERROR',
        message: 'Template preview failed',
        safeMessage: 'Template belum dapat dibuka.',
        statusCode: 500,
        cause: error,
      });
    }
  }

  @Get('admin/certificates/template-preview')
  async certificateTemplatePreview(
    @Query('eventId') eventId: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );

    if (!eventId) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'Event id is required',
        safeMessage: 'Event wajib diisi.',
        statusCode: 400,
      });
    }

    const { buffer } = await getCertificateTemplatePreviewForAdmin({
      eventId,
      admin,
    });
    response
      .status(200)
      .setHeader('Cache-Control', 'private, max-age=60')
      .setHeader('Content-Type', 'image/png')
      .send(buffer);
  }

  @Get('admin/submission-file/download')
  async adminSubmissionFile(
    @Query('fileId') fileId: string | undefined,
    @Query('mode') mode: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );

    if (!fileId) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'Missing file id',
        safeMessage: 'File wajib diisi.',
        statusCode: 400,
      });
    }

    const file = await getAdminEvidenceFile({ admin, fileId });
    response
      .status(200)
      .setHeader('content-type', file.detectedMimeType)
      .setHeader('cache-control', 'private, no-store')
      .setHeader(
        'content-disposition',
        mode === 'preview'
          ? 'inline'
          : `attachment; filename="${file.originalFilename}"`,
      )
      .send(file.body);
  }

  @Get('participant/submission-file/download')
  async participantSubmissionFile(
    @Query('fileId') fileId: string | undefined,
    @Query('mode') mode: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const session = await getRegistrationForParticipantSession(
      getParticipantSessionToken(request),
    );

    if (!fileId || !session) {
      throw new ApplicationError({
        code: 'FORBIDDEN',
        message: 'Participant cannot access evidence file',
        safeMessage: 'File belum dapat dibuka.',
        statusCode: 403,
      });
    }

    const file = await getParticipantEvidenceFile({
      session,
      fileId,
      requestContext: requestContext(request),
    });
    response
      .status(200)
      .setHeader('content-type', file.detectedMimeType)
      .setHeader('cache-control', 'private, no-store')
      .setHeader(
        'content-disposition',
        mode === 'preview'
          ? 'inline'
          : `attachment; filename="${file.originalFilename}"`,
      )
      .send(file.body);
  }

  @Get('admin/events/export')
  async eventExport(@Req() request: Request, @Res() response: Response) {
    const admin = await requireAdminSessionFromToken(
      getAdminSessionToken(request),
    );
    const url = new URL(
      `${request.protocol}://${request.get('host')}${request.originalUrl}`,
    );
    const statusValue = url.searchParams.get('status');
    const publicationValue = url.searchParams.get('publication');
    const periodValue = url.searchParams.get('period');
    const search = url.searchParams.get('search')?.trim() || null;
    const eventStatus =
      eventStatuses.find((item) => item === statusValue) ?? null;
    const publicationStatus =
      publicationStatuses.find((item) => item === publicationValue) ?? null;
    const period = periods.find((item) => item === periodValue) ?? null;
    const items: ManageableEventListItem[] = [];

    for (let page = 1; page <= 100; page += 1) {
      const batch = await listManageableEventListItems(admin, {
        search,
        eventStatus,
        publicationStatus,
        period,
        page,
        pageSize: 100,
      });
      items.push(...batch);

      if (batch.length < 100) {
        break;
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VirtualRun Beard Admin';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Daftar Event', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = [
      { header: 'Nama Event', key: 'name', width: 34 },
      { header: 'Slug', key: 'slug', width: 30 },
      { header: 'Status', key: 'status', width: 22 },
      { header: 'Publikasi', key: 'publication', width: 16 },
      { header: 'Periode Pendaftaran', key: 'registration', width: 34 },
      { header: 'Periode Lari', key: 'activity', width: 34 },
      { header: 'Upload Hasil', key: 'upload', width: 34 },
      { header: 'Kategori', key: 'categories', width: 36 },
      { header: 'Pendaftar Aktif', key: 'registrations', width: 18 },
    ];

    for (const item of items) {
      worksheet.addRow({
        name: item.event.name,
        slug: item.event.slug,
        status: eventStatusLabel(item.event.eventStatus),
        publication: item.event.publicationStatus,
        registration: `${formatBusinessDate(item.event.registrationStartsAt)} - ${formatBusinessDate(item.event.registrationEndsAt)}`,
        activity: `${formatBusinessDate(item.event.activityStartsAt)} - ${formatBusinessDate(item.event.activityEndsAt)}`,
        upload: `${formatBusinessDate(item.event.uploadStartsAt)} - ${formatBusinessDate(item.event.uploadEndsAt)}`,
        categories: item.categories
          .map(
            (category) =>
              `${formatDistance(category.distanceMeters)} - ${category.name}`,
          )
          .join(', '),
        registrations: item.activeRegistrationCount,
      });
    }

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007F73' },
    };
    worksheet.getRow(1).height = 24;
    worksheet.autoFilter = { from: 'A1', to: 'I1' };
    worksheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'top', wrapText: true };

      if (rowNumber > 1 && rowNumber % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF4F8F7' },
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `event-virtual-run-${new Date().toISOString().slice(0, 10)}.xlsx`;

    response
      .status(200)
      .setHeader('cache-control', 'no-store')
      .setHeader('content-disposition', `attachment; filename="${filename}"`)
      .setHeader(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .send(Buffer.from(buffer));
  }
}
