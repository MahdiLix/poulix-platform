# Poulix

Poulix is a personal digital wallet. Users can register, view an IRR balance, top up through ZarinPal, withdraw to an account or Sheba number, and review history. An admin dashboard covers users, payments, withdrawals, security events, and audit logs.

The application runs in Docker only. Do not run the frontend or backend with `npm`, `node`, or `pm2` on the host.

## Architecture

Two isolated Docker environments share application code, Prisma schema, and Nginx routing. They do not share env files, Compose project names, or Postgres volumes.

```text
Browser
   ↓
Nginx          ← only public ports
   ├── frontend:3000
   └── backend:3001
             ├── postgres:5432
             └── redis:6379   ← rate-limit counters / lockout only
```

| | Local | Production |
| --- | --- | --- |
| Compose | `docker-compose.yml` + `docker-compose.dev.yml` | `docker-compose.yml` + `docker-compose.prod.yml` |
| Env file | `.env.docker` | `.env.production` |
| Project name | `poulix-dev` | `poulix-prod` |
| Postgres volume | `poulix_dev_postgres` | `poulix-platform_postgres_data` |
| Public origin | `http://localhost` | `https://poulix.ir` |
| Public ports | 80 | 80 and 443 |
| Payments | ZarinPal sandbox | ZarinPal live API |

`www.poulix.ir` is not a second origin. Production Nginx redirects it to `https://poulix.ir`.

Do not start the shared Compose file alone. Do not use `.env.docker` on the VPS or `.env.production` on a developer machine.

## Requirements

- Docker and Docker Compose v2

## Environment files

| File | Purpose |
| --- | --- |
| `.env.docker.example` → `.env.docker` | Local Docker. Origin `http://localhost`. Sandbox ZarinPal. |
| `.env.production.example` → `.env.production` | Production Docker on the VPS. Origin `https://poulix.ir`. Live ZarinPal. |

Do not commit filled env files. `POSTGRES_PASSWORD` must match the password inside `DATABASE_URL`. `DATABASE_URL` must use hostname `postgres` (the Compose service), never `localhost`.

## Local commands

```bash
cp .env.docker.example .env.docker
```

Set local secrets. Keep `FRONTEND_URL=http://localhost`, `ZARINPAL_CALLBACK_URL=http://localhost/deposit/callback`, and `ZARINPAL_BASE_URL=https://sandbox.zarinpal.com`.

```bash
# start (Rate Limiting OFF)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker up --build

# start with Rate Limit test mode (burst 5/10s, login 3/60s in the overlay, lockout 3/60s, …)
docker compose -f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.rate-limit.yml --env-file .env.docker up --build -d

# stop
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker down

# rebuild
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker up --build

# restart (no rebuild)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker up -d

# logs
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker logs -f

# status
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker ps
```

Open http://localhost

Local Nginx serves HTTP only. Production certificate files are not used.

## Production commands

On the VPS:

```bash
cp .env.production.example .env.production
```

Set unique production secrets. Keep `FRONTEND_URL=https://poulix.ir`, `ZARINPAL_CALLBACK_URL=https://poulix.ir/deposit/callback`, and `ZARINPAL_BASE_URL=https://api.zarinpal.com`.

Host certificates stay at `/etc/nginx/certs` (`origin.crt`, `origin.key`, and the existing origin-pull client certificate). Do not change those paths.

```bash
# start / rebuild
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build

# restart (no rebuild)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d

# logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production logs -f

# status
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production ps

# stop (does not delete the Postgres volume)
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production down
```

Rebuild after backend, frontend, Dockerfile, or Compose build-arg changes. Recreate containers (`up -d`) after runtime env changes. Bind-mounted Nginx conf can be reloaded with `docker compose ... exec nginx nginx -s reload`.

## Tests

Run tests through Docker. Unit and integration tests live in the existing backend and frontend test suites.

```bash
# backend (unit + integration)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker --profile test run --rm --build backend-test

# backend rate-limit / login security suite (separate from the normal suite)
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker --profile test run --rm --build backend-test-rate-limit

# frontend
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker --profile test run --rm --build frontend-test
```

There is no separate e2e suite.

The optional `docker-compose.rate-limit.yml` overlay only affects the running local **backend** service. It does not change `backend-test` (Rate Limiting stays OFF) or `backend-test-rate-limit` (already ON with `TEST_RATE_LIMITS`, including login 3/10s). The overlay uses the same small burst/payment windows, with login/register/lockout stretched to 60s so they can be tried by hand.

Do not run the test profile with the production Compose files.

## Database

Both environments use the same Prisma schema and migrations. Only `DATABASE_URL` / credentials / volume differ. The backend container runs `npx prisma migrate deploy` on start.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker exec backend npx prisma migrate status
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker exec backend npx prisma migrate deploy
```

Do not run destructive Prisma commands against production.

## Logging

### Request logs

Request logs are **not stored in the database**. They are JSON lines on the backend container stdout. Inspect them with Docker logs.

```bash
# local
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker logs -f backend

# production
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production logs -f backend
```

Look for `"msg":"request completed"` (method, path, status, request id). Bodies, cookies, tokens, and payment secrets are not logged.

### Audit logs

There are two audit stores:

| Store | What it records | How to view it |
| --- | --- | --- |
| `AdminAuditLog` | Admin actions (admin login, disable/lock user) | Admin UI: http://localhost/admin/audit (admin account required). Production: https://poulix.ir/admin/audit |
| `AuditLog` | App events (login, register, deposits, transfers, withdrawals) | Postgres only; no app page |

Confirm Postgres user and database names from the running container, then query `AuditLog`:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker exec postgres env | grep -E 'POSTGRES_(USER|DB|DATABASE)'

docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker exec postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT \"createdAt\", event, action, result, \"userId\", \"requestId\" FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 20;"'
```

Production (on the VPS):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production exec postgres env | grep -E 'POSTGRES_(USER|DB|DATABASE)'

docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production exec postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT \"createdAt\", event, action, result, \"userId\", \"requestId\" FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 20;"'
```

The example env files use `POSTGRES_USER=poulix` and `POSTGRES_DB=poulix_db`. Use the values from the `env | grep` output if you changed them.

## Important URLs

| | Local | Production |
| --- | --- | --- |
| Application | http://localhost | https://poulix.ir |
| API | http://localhost/api | https://poulix.ir/api |
| ZarinPal callback | http://localhost/deposit/callback | https://poulix.ir/deposit/callback |

## Troubleshooting

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker ps
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker logs --tail=100 backend frontend nginx postgres
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker up -d --build --force-recreate
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost/
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost/api/auth/login
```

If ZarinPal sandbox calls fail with DNS errors, the backend service already uses `8.8.8.8` and `1.1.1.1`. Confirm `ZARINPAL_BASE_URL` is the sandbox URL locally and `https://api.zarinpal.com` in production.
