import type { Response } from 'express';
import { isProductionEnv } from '../config/app.config';
import { getJwtExpirationSeconds } from './jwt.config';

export const SESSION_COOKIE = 'poulix_session';

export function clearSessionCookie(res: Response, path: string) {
  res.clearCookie(SESSION_COOKIE, {
    path,
    httpOnly: true,
    secure: isProductionEnv(),
    sameSite: 'lax',
  });
}

export function clearSessionCookies(res: Response) {
  clearSessionCookie(res, '/');
  clearSessionCookie(res, '/api');
}

export function setSessionCookie(res: Response, accessToken: string) {
  // Remove the previous API-scoped cookie created before route protection
  // used the session cookie on page requests.
  clearSessionCookie(res, '/api');
  res.cookie(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    // Local Docker images run NODE_ENV=production over HTTP. Secure must
    // follow APP_ENV so the browser can store the session cookie.
    secure: isProductionEnv(),
    sameSite: 'lax',
    // The Next.js route guard must receive this HttpOnly cookie on page
    // requests as well as API requests.
    path: '/',
    maxAge: getJwtExpirationSeconds() * 1000,
    // Encode so Cookie header parsers never split on JWT characters.
    encode: (value) => encodeURIComponent(value),
  });
}
