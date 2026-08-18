# Poulix

Poulix is a personal digital wallet. Users can create an account, view their IRR balance, top up the wallet, withdraw to an account number or Shaba number, and review transaction history.

Deposits connect to **ZarinPal (زرین‌پال)** sandbox, not a live bank account. The wallet is credited only after ZarinPal verifies the payment. The default merchant and base URL target the ZarinPal sandbox environment.

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4
- Backend: NestJS 11, Prisma 7, PostgreSQL
- Auth: JWT
- Payments: ZarinPal sandbox (request, StartPay, callback, verify)
- UI: English and Persian (RTL), light and dark themes
- Deploy: Docker and Docker Compose

## Features

- Register, login, and JWT-protected wallet APIs
- Wallet balance, deposit, withdraw, and transaction history
- ZarinPal sandbox top-up: pending payment first, then credit on successful verify
- Duplicate callback protection so a payment is not credited twice
- Statistics overview with income and expense charts
- Bilingual UI (English / Persian) with RTL support
- Light and dark mode
- Responsive layout with a desktop sidebar

## Services and ports

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

## Setup with Docker Compose (full stack)

Use this when PostgreSQL, backend, and frontend should all run in containers.

1. Copy the Compose env file and set real values (password, JWT secret, matching `DATABASE_URL`):

```bash
cp .env.docker.example .env.docker
```

2. In `.env.docker`, keep these Compose hostnames:

- Database host: `postgres` (service name)
- Backend URL for the frontend: `http://backend:3001`
- ZarinPal callback (browser): `http://localhost:3000/deposit/callback`

3. Start the stack:

```bash
docker compose --env-file .env.docker up --build
```

4. Open http://localhost:3000

Stop with `Ctrl+C`, or run `docker compose --env-file .env.docker down`. Postgres data is stored in the `postgres_data` volume.

Run backend tests in Docker:

```bash
docker compose --env-file .env.docker --profile test run --rm --build backend-test
```

## Setup with Docker Postgres and host Node.js

Use this when only the database runs in Docker, and backend/frontend run on the host with Node.js.

1. Start PostgreSQL:

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up postgres
```

2. Backend env (use `localhost`, not `postgres`). Credentials must match `.env.docker`:

```bash
cp backend/.env.example backend/.env
```

Example:

```text
DATABASE_URL="postgresql://poulix:YOUR_PASSWORD@localhost:5432/poulix_db?schema=public"
```

3. Install and start the backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

4. Optional frontend env (defaults to `http://localhost:3001`):

```bash
cp frontend/.env.example frontend/.env.local
```

5. Install and start the frontend:

```bash
cd frontend
npm install
npm run dev
```

6. Open http://localhost:3000

Host backend tests:

```bash
cd backend
npm test
```

`DATABASE_URL` and `JWT_SECRET` must be set in `backend/.env`.

## Project layout

```text
backend/     NestJS API, Prisma, ZarinPal integration, tests
frontend/    Next.js wallet UI
docker-compose.yml
.env.docker.example
```

## Notes

- Do not commit `.env`, `.env.docker`, or other secret files.
- ZarinPal sandbox is for development and testing only.
- Replace `ZARINPAL_MERCHANT_ID` and related values before any real payment usage.
