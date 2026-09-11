export type AuditResult = 'success' | 'failure';

export type AuditLogInput = {
  event: string;
  action: string;
  result: AuditResult;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};
