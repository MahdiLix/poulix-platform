export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return secret;
}

export function getJwtExpirationSeconds(): number {
  const expiration = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? '900');

  if (!Number.isSafeInteger(expiration) || expiration <= 0) {
    throw new Error(
      'JWT_EXPIRES_IN_SECONDS must be a positive integer number of seconds',
    );
  }

  return expiration;
}
