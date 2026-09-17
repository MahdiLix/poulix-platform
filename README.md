# Poulix

Poulix is a financial digital wallet focused on IRR (Iranian rial). Users can register, sign in, manage a wallet balance, top up through ZarinPal, withdraw to a card/account or Sheba number, and review transactions and statistics. An admin dashboard provides user, payment, withdrawal, security-event, and audit visibility.

Live application: **[https://poulix.ir](https://poulix.ir)**

Repository: **[https://github.com/MahdiLix/Poulix-Platform](https://github.com/MahdiLix/Poulix-Platform)**

## Main Technology Stack

### Backend

- **NestJS 11**
- **TypeScript**
- **Prisma 7**
- **PostgreSQL**
- **Redis**
- **JWT**
- **Passport**
- **Helmet**
- **Pino**
- **NestJS Throttler**
- **Jest / Supertest**



### Frontend

- **Next.js 16** 
- **React**
- **TypeScript**
- **Tailwind CSS 4**
- **English / Persian (RTL)**
- **Cookie-based Authentication**
- **Vitest / Playwright**



### Payments

- **ZarinPal**
- **IRR (Iranian Rial)**
- **Wallet & Transaction System**



### DevOps

- **Docker**
- **Docker Compose**
- **Nginx**
- **Redis**
- **Cloudflare**
- **Linux VPS**
- **GitHub**
- **GitHub Actions CI/CD**



### Security

- **JWT Authentication**
- **HTTP-only Cookies**
- **Password Hashing**
- **Protected Routes**
- **Account Lockout**
- **Rate Limiting**
- **Helmet**
- **Audit Logging**
- **HTTPS**



### Architecture

- **REST API**
- **Modular NestJS Architecture**
- **Containerized Services**
- **Nginx Reverse Proxy**



### Core Features

- User registration and authentication
- IRR digital wallet
- ZarinPal wallet top-up
- Withdrawals to card / account / Sheba
- Transaction history
- Balance and financial statistics
- Notifications
- Admin dashboard
- User and payment management
- Security and audit events



## Main Features



### Implemented

- User registration and authentication
- JWT-based authenticated sessions using cookies
- IRR wallet balance and transaction history
- ZarinPal wallet top-up flow
- Withdrawals to card/account or Sheba destinations
- Inflow/outflow statistics
- Notifications
- Admin dashboard for users, payments, withdrawals, security events, and audit logs
- Request logging without sensitive request data
- Application audit logging
- Docker-based local development, testing, and production deployment



### Planned / Product Direction

- Payment reasons such as lunch/dinner
- Family transfers such as father/brother
- Scheduled weekly/monthly payments
- Saving goals such as a MacBook
- Virtual envelopes for food, gym, games, etc.
- Saved Shaba/account destinations
- Security-limit management
- Smart payment/history features
- Improved animated notifications
- Real bill, internet, mobile, and credit-card payments when implemented



## Architecture

The application runs in Docker with separate local and production Compose configurations.

```text
Browser
   |
   v
Nginx                    <- only public ports
   |
   +--> frontend:3000
   |
   +--> backend:3001
            |
            +--> postgres:5432
            |
            +--> redis:6379
```


|                 | Local                                           | Production                                       |
| --------------- | ----------------------------------------------- | ------------------------------------------------ |
| Compose         | `docker-compose.yml` + `docker-compose.dev.yml` | `docker-compose.yml` + `docker-compose.prod.yml` |
| Project name    | `poulix-dev`                                    | `poulix-prod`                                    |
| Postgres volume | `poulix_dev_postgres`                           | `poulix-platform_postgres_data`                  |
| Public origin   | `http://localhost`                              | `https://poulix.ir`                              |
| Public ports    | 80                                              | 80 and 443                                       |
| Payments        | ZarinPal sandbox                                | ZarinPal live API                                |


`www.poulix.ir` is not a second application origin. Production Nginx redirects it to `https://poulix.ir`.

Do not start the shared Compose file alone.

## Payment Flow

The wallet top-up flow is designed to prevent duplicate credits:

```text
Create Payment
      |
    PENDING
      |
Request Authority from ZarinPal
      |
Save Authority on Payment
      |
Redirect to ZarinPal
      |
Callback Authority + Status
      |
Status OK -> Verify
      |
Code 100 / 101
      |
Atomic settlement
      |
Payment -> PAID
      |
Wallet increment
      |
Transaction -> DEPOSIT
```

The callback `Authority` must match the stored `Payment.authority`. Wallet credit must happen atomically and only once.

## Requirements

- Docker
- Docker Compose v2
- Git



## Local Setup

Start the local Docker environment with the development Compose configuration.

### Start

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  up --build
```



### Stop

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  down
```



### Rebuild

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  up --build
```



### Restart without rebuild

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  up -d
```



### Logs

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  logs -f
```



### Status

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  ps
```

Open **[http://localhost](http://localhost)**.

Local Nginx is HTTP-only. Production certificate files are not used locally.

## Production Deployment

The production application runs on the VPS at `/opt/poulix-platform` behind Cloudflare and Nginx.

```text
Cloudflare
   |
   v
Nginx :80/:443
   |
   +--> frontend
   +--> backend
          |
          +--> postgres
          +--> redis
```

Only Nginx exposes public ports. Frontend, backend, PostgreSQL, and Redis remain internal to Docker.

Host certificate paths remain:

```text
/etc/nginx/certs/origin.crt
/etc/nginx/certs/origin.key
```

The existing origin-pull client certificate setup is preserved. Do not change these certificate paths unless there is a critical reason.

### Start / rebuild

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d --build
```



### Restart without rebuild

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  up -d
```



### Logs

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  logs -f
```



### Status

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  ps
```



### Stop

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  --env-file .env.production \
  down
```

`down` does not delete the PostgreSQL volume.

Rebuild after backend, frontend, Dockerfile, or Compose build-argument changes. Recreate containers after runtime environment changes. Reload a bind-mounted Nginx configuration with:

```bash
docker compose ... exec nginx nginx -s reload
```



## Tests

Run tests through Docker only.

### Backend

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  --profile test \
  run --rm --build backend-test
```



### Frontend

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  --profile test \
  run --rm --build frontend-test
```

There is no separate e2e suite.

## Database

Both environments use the same Prisma schema and migration history. Credentials, `DATABASE_URL`, and PostgreSQL volumes are environment-specific.

The backend container runs:

```bash
npx prisma migrate deploy
```

Useful commands:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  exec backend npx prisma migrate status

docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  exec backend npx prisma migrate deploy
```

Never run destructive Prisma commands against production.

## Logging



### Request logs

Request logs are **not stored in PostgreSQL**. They are JSON lines written to backend container stdout.

```bash
# Local
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker logs -f backend

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production logs -f backend
```

Look for:

```text
"msg":"request completed"
```

Request logs contain only essential fields such as method, path, status, and request ID. Bodies, cookies, tokens, and payment secrets are not logged.

### Audit logs

There are two audit stores:


| Store           | What it records                                                              | Where to view   |
| --------------- | ---------------------------------------------------------------------------- | --------------- |
| `AdminAuditLog` | Admin actions such as admin login and user disable/lock                      | Admin UI        |
| `AuditLog`      | Application events such as login, register, deposits, transfers, withdrawals | PostgreSQL only |


Admin audit page:

```text
Local:      http://localhost/admin/audit
Production: https://poulix.ir/admin/audit
```

Check PostgreSQL credentials:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.docker exec postgres env | grep -E 'POSTGRES_(USER|DB|DATABASE)'
```

Example query:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  exec postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT \"createdAt\", event, action, result, \"userId\", \"requestId\" FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 20;"'
```

Production uses the same pattern with `docker-compose.prod.yml` and `.env.production`.

## Important URLs


|                   | Local                                                                  | Production                                                               |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Application       | [http://localhost](http://localhost)                                   | [https://poulix.ir](https://poulix.ir)                                   |
| API               | [http://localhost/api](http://localhost/api)                           | [https://poulix.ir/api](https://poulix.ir/api)                           |
| ZarinPal callback | [http://localhost/deposit/callback](http://localhost/deposit/callback) | [https://poulix.ir/deposit/callback](https://poulix.ir/deposit/callback) |
| Admin audit       | [http://localhost/admin/audit](http://localhost/admin/audit)           | [https://poulix.ir/admin/audit](https://poulix.ir/admin/audit)           |




## Troubleshooting



### Check containers

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  ps
```



### Check recent logs

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  logs --tail=100 backend frontend nginx postgres
```



### Force recreate

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.dev.yml \
  --env-file .env.docker \
  up -d --build --force-recreate
```



### Basic HTTP checks

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost/
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost/api/auth/login
```



### ZarinPal DNS / connection errors

The backend service is configured with `8.8.8.8` and `1.1.1.1` DNS servers. Confirm the correct base URL:

- Local: `https://sandbox.zarinpal.com`
- Production: `https://api.zarinpal.com`



### Nginx / TLS notes

- Cloudflare sits in front of the VPS.
- Nginx is the only public Docker-facing service.
- `www.poulix.ir` redirects to `poulix.ir`.
- Keep the existing certificate paths under `/etc/nginx/certs`.
- Do not add or enable client-certificate requirements unless there is a specific critical requirement.



### Docker cleanup after deployments

Old stopped containers and unused images can consume disk space. Remove unused containers/networks when appropriate, but preserve the PostgreSQL volume unless intentionally deleting data. Do not delete images that are still needed for rollback without checking first.

## Development Rules

- Prefer Docker for development, testing, and production.
- Keep database I/O and logging minimal.
- Do not log request bodies, secrets, tokens, or payment credentials.
- Avoid unnecessary architecture, URL, environment, or UI changes.
- Prefer simple, readable, maintainable code.
- Make targeted fixes instead of broad refactors unless required.



## License

Poulix Platform is licensed under the **GNU General Public License v3.0**.

See the [LICENSE](LICENSE) file for the full license text.