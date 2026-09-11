describe('logger environment', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  function loadPinoHttp() {
    const mod = require('../../src/request-logging/logger.config') as {
      loggerParams: {
        pinoHttp: {
          autoLogging?: boolean;
          transport?: unknown;
        };
      };
    };
    return mod.loggerParams.pinoHttp;
  }

  it('disables request autoLogging in test', () => {
    process.env.APP_ENV = 'test';
    process.env.NODE_ENV = 'test';
    jest.resetModules();

    const pinoHttp = loadPinoHttp();
    expect(pinoHttp.autoLogging).toBe(false);
    expect(pinoHttp.transport).toBeUndefined();
  });

  it('keeps JSON stdout and request autoLogging in production', () => {
    process.env.APP_ENV = 'production';
    process.env.NODE_ENV = 'production';
    jest.resetModules();

    const pinoHttp = loadPinoHttp();
    expect(pinoHttp.autoLogging).not.toBe(false);
    expect(pinoHttp.transport).toBeUndefined();
  });

  it('keeps JSON stdout in local Docker (APP_ENV=development, NODE_ENV=production)', () => {
    process.env.APP_ENV = 'development';
    process.env.NODE_ENV = 'production';
    jest.resetModules();

    const pinoHttp = loadPinoHttp();
    expect(pinoHttp.autoLogging).not.toBe(false);
    expect(pinoHttp.transport).toBeUndefined();
  });
});
