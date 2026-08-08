import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { getParticipantSessionToken, requestContext } from '@/http/request';
import { fileToWebFile } from '@/http/file';
import type { UploadedMemoryFile } from '@/http/file';
import { getRegistrationForParticipantSession } from '@/modules/registrations/registration.service';
import {
  getParticipantSubmissionDashboard,
  getParticipantSubmissionDetailForSession,
  submitParticipantRevision,
} from '@/modules/submissions/submission.service';
import { submissionFormSchema } from '@/modules/submissions/submission.schema';
import { ApplicationError } from '@/shared/errors/application-error';

async function requireParticipantSession(request: Request) {
  const session = await getRegistrationForParticipantSession(
    getParticipantSessionToken(request),
  );

  if (!session) {
    throw new ApplicationError({
      code: 'UNAUTHORIZED',
      message: 'Participant session is required',
      safeMessage: 'Sesi peserta tidak valid.',
      statusCode: 401,
    });
  }

  return session;
}

@Controller('api/participant')
export class ParticipantController {
  @Get('submissions')
  async dashboard(@Req() request: Request) {
    const session = await requireParticipantSession(request);
    return { items: await getParticipantSubmissionDashboard(session) };
  }

  @Get('events/:eventSlug/submissions/:registrationCategoryId')
  async detail(
    @Param('eventSlug') eventSlug: string,
    @Param('registrationCategoryId') registrationCategoryId: string,
    @Req() request: Request,
  ) {
    return getParticipantSubmissionDetailForSession({
      session: await requireParticipantSession(request),
      eventSlug,
      registrationCategoryId,
    });
  }

  @Post('events/:eventSlug/submissions/:registrationCategoryId/revisions')
  @UseInterceptors(FileInterceptor('screenshot'))
  async submitRevision(
    @Param('eventSlug') eventSlug: string,
    @Param('registrationCategoryId') registrationCategoryId: string,
    @Body() body: unknown,
    @UploadedFile() screenshot: UploadedMemoryFile | undefined,
    @Req() request: Request,
  ) {
    return submitParticipantRevision({
      session: await requireParticipantSession(request),
      eventSlug,
      registrationCategoryId,
      form: submissionFormSchema.parse(body),
      screenshot: fileToWebFile(screenshot),
      requestContext: requestContext(request),
    });
  }
}
