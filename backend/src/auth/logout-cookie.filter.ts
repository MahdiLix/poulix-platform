import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { clearSessionCookies } from './session-cookie';

@Catch(UnauthorizedException)
export class LogoutCookieClearFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    clearSessionCookies(response);
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
