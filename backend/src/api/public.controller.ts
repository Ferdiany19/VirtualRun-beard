import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  publicRegistrationSchema,
  participantAccessSchema,
} from '@/modules/registrations/registration.schema';
import {
  createParticipantSessionForAccess,
  getRegistrationForParticipantSession,
  registerParticipantForEvent,
} from '@/modules/registrations/registration.service';
import {
  getPublicEventBySlug,
  getPublicHomepageEvents,
} from '@/modules/events/event.service';
import { countActiveEventRegistrations } from '@/modules/registrations/registration.repository';
import { participantSessionCookieHeaders } from '@/modules/registrations/participant-session';
import { ApplicationError } from '@/shared/errors/application-error';
import { getParticipantSessionToken, requestContext } from '@/http/request';

@Controller('api/public')
export class PublicController {
  @Get('events')
  async listEvents() {
    return { items: await getPublicHomepageEvents() };
  }

  @Get('events/:slug')
  async getEvent(@Param('slug') slug: string) {
    const event = await getPublicEventBySlug(slug);

    if (!event) {
      throw new ApplicationError({
        code: 'NOT_FOUND',
        message: 'Public event not found',
        safeMessage: 'Event tidak ditemukan.',
        statusCode: 404,
      });
    }

    return {
      ...event,
      activeRegistrationCount: await countActiveEventRegistrations(
        event.event.id,
      ),
    };
  }

  @Post('events/:slug/register')
  async register(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result = await registerParticipantForEvent({
      slug,
      registration: publicRegistrationSchema.parse(body),
      requestContext: requestContext(request),
    });

    for (const cookie of participantSessionCookieHeaders(
      result.participantSession,
    )) {
      response.append('set-cookie', cookie);
    }

    response.status(201).json({ registrationId: result.registrationId });
  }

  @Post('events/:slug/participant/access')
  async accessParticipant(
    @Param('slug') eventSlug: string,
    @Body() body: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result = await createParticipantSessionForAccess({
      eventSlug,
      access: participantAccessSchema.parse(body),
      requestContext: requestContext(request),
    });

    for (const cookie of participantSessionCookieHeaders(
      result.participantSession,
    )) {
      response.append('set-cookie', cookie);
    }

    response.status(200).json({ registrationId: result.registrationId });
  }

  @Get('participant/session')
  async participantSession(@Req() request: Request) {
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
}
