import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  formDataFromRecord,
  requireAdminFromRequest,
  requestContext,
} from '@/http/request';
import {
  listAdminEventSubmissions,
  getAdminEventSubmissionDetail,
} from '@/modules/submissions/submission.service';
import {
  assignEventValidator,
  claimSubmissionForReview,
  getEventValidatorManagement,
  getValidationEvent,
  getValidationSubmissionDetail,
  listEventValidationQueue,
  listValidationQueueForAdmin,
  releaseSubmissionClaim,
  revokeEventValidator,
  saveValidationDecision,
} from '@/modules/validation/validation.service';
import {
  claimSubmissionSchema,
  validationDecisionSchema,
  validationQueueSchema,
} from '@/modules/validation/validation.schema';
import type { SubmissionStatus } from '@/modules/submissions/submission.types';

const submissionStatuses = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REVISION_REQUIRED',
  'APPROVED',
  'REJECTED',
  'DISQUALIFIED',
] as const satisfies readonly SubmissionStatus[];
const submissionSorts = [
  'submitted_desc',
  'submitted_asc',
  'bib_asc',
  'distance_desc',
] as const;

function queueFilters(query: Record<string, string | undefined>) {
  return validationQueueSchema.parse({
    eventId: query.eventId ?? null,
    categoryId: query.categoryId ?? null,
    status: query.status ?? null,
    activityPlatform: query.activityPlatform ?? null,
    evidenceType: query.evidenceType ?? null,
    search: query.search ?? null,
    hasWarning: query.hasWarning,
    distanceCheck: query.distanceCheck ?? null,
    sort: query.sort,
    page: query.page,
  });
}

@Controller('api/admin')
export class AdminValidationController {
  @Get('validation/queue')
  async queue(
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return {
      items: await listValidationQueueForAdmin({
        admin: await requireAdminFromRequest(request),
        filters: queueFilters(query),
      }),
    };
  }

  @Get('events/:eventId/validation')
  async eventValidation(
    @Param('eventId') eventId: string,
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return {
      event: await getValidationEvent({
        eventId,
        admin: await requireAdminFromRequest(request),
      }),
      items: await listEventValidationQueue({
        eventId,
        admin: await requireAdminFromRequest(request),
        filters: queueFilters(query),
      }),
    };
  }

  @Get('events/:eventId/submissions')
  async eventSubmissions(
    @Param('eventId') eventId: string,
    @Query() query: Record<string, string | undefined>,
    @Req() request: Request,
  ) {
    return {
      items: await listAdminEventSubmissions({
        eventId,
        admin: await requireAdminFromRequest(request),
        filters: {
          categoryId: query.categoryId ?? null,
          status:
            submissionStatuses.find((item) => item === query.status) ?? null,
          search: query.search ?? null,
          sort:
            submissionSorts.find((item) => item === query.sort) ??
            'submitted_desc',
        },
      }),
    };
  }

  @Get('submissions/:submissionId')
  async submissionDetail(
    @Param('submissionId') submissionId: string,
    @Req() request: Request,
  ) {
    return getAdminEventSubmissionDetail({
      submissionId,
      admin: await requireAdminFromRequest(request),
    });
  }

  @Get('validation/submissions/:submissionId')
  async validationDetail(
    @Param('submissionId') submissionId: string,
    @Req() request: Request,
  ) {
    return getValidationSubmissionDetail({
      submissionId,
      admin: await requireAdminFromRequest(request),
    });
  }

  @Post('validation/submissions/:submissionId/claim')
  async claim(
    @Param('submissionId') submissionId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    await claimSubmissionForReview({
      admin: await requireAdminFromRequest(request),
      form: claimSubmissionSchema.parse({ ...(body as object), submissionId }),
      requestContext: requestContext(request),
    });

    return { ok: true };
  }

  @Post('validation/submissions/:submissionId/release')
  async release(
    @Param('submissionId') submissionId: string,
    @Body() body: { expectedReviewVersion?: number },
    @Req() request: Request,
  ) {
    await releaseSubmissionClaim({
      admin: await requireAdminFromRequest(request),
      submissionId,
      expectedReviewVersion: Number(body.expectedReviewVersion),
      requestContext: requestContext(request),
    });

    return { ok: true };
  }

  @Post('validation/submissions/:submissionId/decision')
  async decision(
    @Param('submissionId') submissionId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    await saveValidationDecision({
      admin: await requireAdminFromRequest(request),
      form: validationDecisionSchema.parse({
        ...(body as object),
        submissionId,
      }),
      requestContext: requestContext(request),
    });

    return { ok: true };
  }

  @Get('events/:eventId/validators')
  async validators(@Param('eventId') eventId: string, @Req() request: Request) {
    return getEventValidatorManagement({
      eventId,
      admin: await requireAdminFromRequest(request),
    });
  }

  @Post('events/:eventId/validators')
  async assignValidator(
    @Param('eventId') eventId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    await assignEventValidator({
      eventId,
      admin: await requireAdminFromRequest(request),
      formData: formDataFromRecord(body),
      requestContext: requestContext(request),
    });

    return { ok: true };
  }

  @Post('events/:eventId/validators/revoke')
  async revokeValidator(
    @Param('eventId') eventId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    await revokeEventValidator({
      eventId,
      admin: await requireAdminFromRequest(request),
      formData: formDataFromRecord(body),
      requestContext: requestContext(request),
    });

    return { ok: true };
  }
}
