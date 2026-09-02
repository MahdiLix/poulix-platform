import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from '../../src/admin/admin.service';
import type { DatabaseService } from '../../src/database/database.service';

function createService(overrides?: {
  findUnique?: jest.Mock;
  count?: jest.Mock;
}) {
  const db = {
    user: {
      findUnique: overrides?.findUnique ?? jest.fn(),
      count: overrides?.count ?? jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as DatabaseService;

  return { service: new AdminService(db), db };
}

describe('AdminService account status', () => {
  it('prevents an admin from changing their own status', async () => {
    const { service } = createService();

    await expect(
      service.setAccountStatus('admin-1', 'admin-1', 'DISABLED'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing users', async () => {
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.setAccountStatus('admin-1', 'missing', 'DISABLED'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to disable the last active admin', async () => {
    const { service } = createService({
      findUnique: jest.fn().mockResolvedValue({
        id: 'admin-2',
        role: 'ADMIN',
        status: 'ACTIVE',
      }),
      count: jest.fn().mockResolvedValue(0),
    });

    await expect(
      service.setAccountStatus('admin-1', 'admin-2', 'DISABLED'),
    ).rejects.toThrow('Cannot disable the last admin');
  });
});
