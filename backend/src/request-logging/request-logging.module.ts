import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { loggerParams } from './logger.config';
import { RequestContextMiddleware } from './request-context.middleware';

@Module({
  imports: [LoggerModule.forRoot(loggerParams)],
  exports: [LoggerModule],
})
export class RequestLoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
