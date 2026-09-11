import { BACKEND_LISTEN_PORT, getAppEnv, getFrontendUrl } from '../../src/config';
import { getDatabaseUrl } from '../../src/config/database.config';

describe('app config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads APP_ENV when set', () => {
    process.env.APP_ENV = 'production';
    process.env.NODE_ENV = 'development';
    expect(getAppEnv()).toBe('production');
  });

  it('falls back to NODE_ENV and then development', () => {
    delete process.env.APP_ENV;
    process.env.NODE_ENV = 'test';
    expect(getAppEnv()).toBe('test');

    delete process.env.NODE_ENV;
    expect(getAppEnv()).toBe('development');
  });

  it('strips a trailing slash from FRONTEND_URL', () => {
    process.env.FRONTEND_URL = 'https://poulix.ir/';
    expect(getFrontendUrl()).toBe('https://poulix.ir');
  });

  it('keeps the internal backend listen port off the public host', () => {
    expect(BACKEND_LISTEN_PORT).toBe(3001);
  });
});

describe('database config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('requires DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(() => getDatabaseUrl()).toThrow('DATABASE_URL');
  });
});
