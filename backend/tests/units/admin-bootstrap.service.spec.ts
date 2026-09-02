import { AdminBootstrapService } from '../../src/admin/admin-bootstrap.service';
import type { DatabaseService } from '../../src/database/database.service';

function createService() {
  const userStore = {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };
  const walletStore = {
    create: jest.fn(),
  };
  const db = {
    user: userStore,
    wallet: walletStore,
    $transaction: jest.fn(async (fn: (tx: typeof db) => Promise<unknown>) =>
      fn(db),
    ),
  } as unknown as DatabaseService & {
    user: typeof userStore;
    $transaction: jest.Mock;
  };

  return { service: new AdminBootstrapService(db), db, userStore };
}

describe('AdminBootstrapService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_RESET_PASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing when admin env vars are missing', async () => {
    const { service, userStore } = createService();
    await service.ensureAdminFromEnv();
    expect(userStore.findUnique).not.toHaveBeenCalled();
  });

  it('creates an ADMIN user and wallet from env', async () => {
    process.env.ADMIN_EMAIL = 'admin@poulix.local';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'Admin_Password_12345678';

    const { service, userStore, db } = createService();
    userStore.findUnique.mockResolvedValue(null);
    userStore.create.mockResolvedValue({ id: 'admin-1' });

    await service.ensureAdminFromEnv();

    expect(db.$transaction).toHaveBeenCalled();
    expect(userStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'admin@poulix.local',
          username: 'admin',
          role: 'ADMIN',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('promotes an existing user without changing the password by default', async () => {
    process.env.ADMIN_EMAIL = 'admin@poulix.local';
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'Admin_Password_12345678';

    const { service, userStore } = createService();
    userStore.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      role: 'USER',
    });

    await service.ensureAdminFromEnv();

    expect(userStore.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
  });
});
