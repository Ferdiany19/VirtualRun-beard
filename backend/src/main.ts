import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ApplicationErrorFilter } from '@/http/application-error.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  app.useGlobalFilters(new ApplicationErrorFilter());
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
