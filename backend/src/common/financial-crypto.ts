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
  return hashIdentifier(userAgent.trim() || 'unknown');
}

export function deviceLabelFromUserAgent(userAgent: string): string {
  const ua = userAgent.trim();
  if (!ua) {
    return 'Unknown device';
  }
  if (/Mobile|Android|iPhone/i.test(ua)) {
    return 'Mobile device';
  }
  if (/Windows/i.test(ua)) {
    return 'Windows device';
  }
  if (/Macintosh|Mac OS/i.test(ua)) {
    return 'Mac device';
  }
  if (/Linux/i.test(ua)) {
    return 'Linux device';
  }
  return 'Web browser';
}
