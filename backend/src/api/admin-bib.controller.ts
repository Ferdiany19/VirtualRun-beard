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
} from '@/http/request';
import { validateAdminCsrfTokenValue } from '@/modules/auth/session';
import type { AuthenticatedAdmin } from '@/modules/auth/auth.types';
import {
  bibSettingsSchema,
  bibTemplateListFilterSchema,
  bibTemplateMetadataSchema,
  bibTemplatePublishSchema,
  bibTemplateStatusSchema,
} from '@/modules/bib/bib.schema';
import {
  archiveManagedBibTemplate,
  duplicateManagedBibTemplate,
  getBibAdminPageData,
  getBibTemplateDashboardData,
  getBibTemplateDetailData,
  publishManagedBibTemplate,
  requestBibRegenerationForAdmin,
  updateManagedBibTemplateMetadata,
  updateManagedBibSettings,
  uploadManagedBibTemplate,
} from '@/modules/bib/bib.service';
import { ApplicationError } from '@/shared/errors/application-error';

@Controller('api/admin')
export class AdminBibController {
  private async requireAdminWithCsrf(
    request: Request,
    body?: { csrfToken?: string },
  ): Promise<AuthenticatedAdmin> {
    const admin = await requireAdminFromRequest(request);

    validateAdminCsrfTokenValue({
      cookieToken: getAdminCsrfCookie(request),
      formToken: body?.csrfToken ?? request.headers['x-csrf-token']?.toString(),
      session: admin,
    });

    return admin;
  }

  @Get('bib-templates')
  async templates(
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return getBibTemplateDashboardData({
      admin: await requireAdminFromRequest(request),
      filters: bibTemplateListFilterSchema.parse({
        search: query.search,
        eventId: query.eventId,
        status: query.status || null,
        orientation: query.orientation || null,
        page: query.page,
        pageSize: query.pageSize,
      }),
    });
  }

  @Get('bib-templates/:templateVersionId')
  async templateDetail(
    @Param('templateVersionId') templateVersionId: string,
    @Req() request: Request,
  ) {
    return getBibTemplateDetailData({
      templateVersionId,
      admin: await requireAdminFromRequest(request),
    });
  }

  @Get('events/:eventId/bib')
  async pageData(@Param('eventId') eventId: string, @Req() request: Request) {
    return getBibAdminPageData(eventId, await requireAdminFromRequest(request));
  }

  @Patch('events/:eventId/bib/settings')
  async updateSettings(
    @Param('eventId') eventId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const bodyRecord =
      body && typeof body === 'object' ? (body as { csrfToken?: string }) : {};
    const admin = await this.requireAdminWithCsrf(request, bodyRecord);

    return updateManagedBibSettings({
      eventId,
      admin,
      settings: bibSettingsSchema.parse(body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('events/:eventId/bib/template')
  @UseInterceptors(FileInterceptor('template'))
  async uploadTemplate(
    @Param('eventId') eventId: string,
    @Body() body: Record<string, string | undefined>,
    @UploadedFile() template: UploadedMemoryFile | undefined,
    @Req() request: Request,
  ) {
    const file = fileToWebFile(template);

    if (!file) {
      throw new ApplicationError({
        code: 'VALIDATION_FAILED',
        message: 'BIB template file is required',
        safeMessage: 'File template BIB wajib diunggah.',
        statusCode: 400,
      });
    }

    const admin = await this.requireAdminWithCsrf(request, body);

    return uploadManagedBibTemplate({
      eventId,
      admin,
      file,
      name: body.name,
      description: body.description,
      status: body.status
        ? bibTemplateStatusSchema.parse(body.status)
        : undefined,
      correlationId: requestContext(request).correlationId,
    });
  }

  @Patch('bib-templates/:templateVersionId/metadata')
  async updateTemplateMetadata(
    @Param('templateVersionId') templateVersionId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const bodyRecord =
      body && typeof body === 'object' ? (body as { csrfToken?: string }) : {};
    const admin = await this.requireAdminWithCsrf(request, bodyRecord);

    return updateManagedBibTemplateMetadata({
      templateVersionId,
      admin,
      metadata: bibTemplateMetadataSchema.parse(body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('bib-templates/:templateVersionId/publish')
  async publishTemplate(
    @Param('templateVersionId') templateVersionId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const assignment = bibTemplatePublishSchema.parse(body);

    return publishManagedBibTemplate({
      templateVersionId,
      targetEventId: assignment.eventId,
      settings: assignment.settings,
      admin: await this.requireAdminWithCsrf(request, request.body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('bib-templates/:templateVersionId/archive')
  async archiveTemplate(
    @Param('templateVersionId') templateVersionId: string,
    @Req() request: Request,
  ) {
    return archiveManagedBibTemplate({
      templateVersionId,
      admin: await this.requireAdminWithCsrf(request, request.body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('bib-templates/:templateVersionId/duplicate')
  async duplicateTemplate(
    @Param('templateVersionId') templateVersionId: string,
    @Req() request: Request,
  ) {
    return duplicateManagedBibTemplate({
      templateVersionId,
      admin: await this.requireAdminWithCsrf(request, request.body),
      correlationId: requestContext(request).correlationId,
    });
  }

  @Post('registrations/:registrationId/bib/regenerate')
  async regenerate(
    @Param('registrationId') registrationId: string,
    @Req() request: Request,
  ) {
    await requestBibRegenerationForAdmin({
      registrationId,
      admin: await requireAdminFromRequest(request),
      correlationId: requestContext(request).correlationId,
    });

    return { ok: true };
  }
}
