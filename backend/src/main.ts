import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { BACKEND_LISTEN_PORT } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.use(helmet());

  const httpAdapter = app.getHttpAdapter().getInstance() as {
    set?: (setting: string, value: unknown) => void;
  };
  httpAdapter.set?.('trust proxy', 1);

  // Enable global validation for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(BACKEND_LISTEN_PORT);
  logger.log(`Backend listening on port ${BACKEND_LISTEN_PORT}`);
}
void bootstrap();
