import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AdminBibController } from '@/api/admin-bib.controller';
import { AdminEventsController } from '@/api/admin-events.controller';
import { AdminValidationController } from '@/api/admin-validation.controller';
import { AuthController } from '@/api/auth.controller';
import { FilesController } from '@/api/files.controller';
import { HealthController } from '@/api/health.controller';
import { ParticipantController } from '@/api/participant.controller';
import { PublicController } from '@/api/public.controller';
import { correlationMiddleware } from '@/http/correlation.middleware';

@Module({
  controllers: [
    AdminBibController,
    AdminEventsController,
    AdminValidationController,
    AuthController,
    FilesController,
    HealthController,
    ParticipantController,
    PublicController,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(correlationMiddleware).forRoutes('*');
  }
}
