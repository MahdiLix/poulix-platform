import crypto from 'node:crypto';
import { getJwtSecret } from '../auth/jwt.config';

function encryptionKey(): Buffer {
  const secret = process.env.FINANCIAL_ENCRYPTION_KEY?.trim() || getJwtSecret();
  return crypto.createHash('sha256').update(secret).digest();
}

export function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function encryptValue(plain: string): string {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptValue(payload: string): string {
  const key = encryptionKey();
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    'utf8',
  );
}

export function maskAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '****';
  }
  return `****${digits.slice(-4)}`;
}

export function maskShaba(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.length <= 8) {
    return 'IR****';
  }
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

export function maskCard(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '****';
  }
  return `**** **** **** ${digits.slice(-4)}`;
}

export function normalizeShaba(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function deviceKeyFromUserAgent(userAgent: string): string {
  const environment = deviceEnvironmentFromUserAgent(userAgent);
  return hashIdentifier(
    `${environment.browser}|${environment.os}|${environment.device}`,
  );
}

export function deviceLabelFromUserAgent(userAgent: string): string {
  const environment = deviceEnvironmentFromUserAgent(userAgent);
  if (
    environment.browser === 'Unknown browser' &&
    environment.os === 'Unknown OS'
  ) {
    return 'Unknown device';
  }

  return `${environment.browser} on ${environment.os} (${environment.device})`;
}

export function deviceEnvironmentFromUserAgent(userAgent: string) {
  const ua = userAgent.trim();
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/i.test(ua)
      ? 'Opera'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Chrome\/|CriOS\//i.test(ua)
          ? 'Chrome'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Unknown browser';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Macintosh|Mac OS/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  const device = /iPad|Tablet/i.test(ua)
    ? 'tablet'
    : /Mobile|Android|iPhone|iPod/i.test(ua)
      ? 'mobile'
      : 'desktop';

  return { browser, os, device };
}
