import 'dotenv/config';

function requireEnv(name: string) {
  if (!process.env[name]?.trim()) {
    throw new Error(
      `${name} is required to run backend tests. ` +
        `On the host, set it in backend/.env (use localhost and the same credentials as Docker Postgres). ` +
        `In Docker, run: docker compose --env-file .env.docker run --rm backend-test`,
    );
  }
}

requireEnv('DATABASE_URL');
requireEnv('JWT_SECRET');
