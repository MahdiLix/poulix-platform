import { AuditLogService } from '../../src/audit-logging/audit-log.service';
import type { DatabaseService } from '../../src/database/database.service';

function createService() {
  const create = jest.fn().mockResolvedValue({ id: 'audit-1' });
  const db = {
    auditLog: { create },
  } as unknown as DatabaseService;

  return { service: new AuditLogService(db), create };
}

describe('AuditLogService', () => {
  it('writes a compact append-only audit record', () => {
    const { service, create } = createService();

    service.log({
      event: 'auth.login',
      action: 'login',
      result: 'success',
      userId: 'user-1',
      resourceType: 'session',
      resourceId: 'session-1',
      requestId: 'req-12345678',
      metadata: { amount: 1000 },
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event: 'auth.login',
        action: 'login',
        result: 'success',
        userId: 'user-1',
        resourceType: 'session',
        resourceId: 'session-1',
        requestId: 'req-12345678',
        metadata: { amount: 1000 },
      }),
    });
  });

  it('drops sensitive metadata and nested objects', () => {
    const { service, create } = createService();

    service.log({
      event: 'auth.login',
      action: 'login',
      result: 'failure',
      metadata: {
        password: 'secret',
        accessToken: 'token',
        cardNumber: '6037991234567890',
        shabaNumber: 'IR123',
        reason: 'invalid_credentials',
        nested: { password: 'nope' },
      },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: { reason: 'invalid_credentials' },
      }),
    });
  });
});
