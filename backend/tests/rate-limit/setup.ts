import '../setup';

process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.RATE_LIMIT_ENABLED = 'true';

jest.setTimeout(60_000);
