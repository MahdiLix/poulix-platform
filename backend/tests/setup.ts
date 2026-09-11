import 'dotenv/config';

function requireEnv(name: string) {
  if (!process.env[name]?.trim()) {
    throw new Error(
      `${name} is required to run backend tests. ` +
        `Run tests in Docker: docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker --profile test run --rm --build backend-test`,
    );
  }
}

requireEnv('DATABASE_URL');
requireEnv('JWT_SECRET');
