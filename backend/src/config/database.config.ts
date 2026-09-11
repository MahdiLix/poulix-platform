export function getDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return connectionString;
}
