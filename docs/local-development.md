# Local Development

## Required Services

The platform needs these local services for a real auth/admin loop:

| Service | Port | Purpose |
|---|---:|---|
| PostgreSQL | 5432 | Prisma data store |
| Redis | 6379 | BullMQ queues and future rate limit state |
| API | 4000 | NestJS backend |
| Web | 3000 | Next.js trading frontend |
| Admin | 3001 | Art Design Pro admin frontend |

## Environment

Create a local environment file from the example:

```bash
cp .env.example .env
```

Default local admin account:

| Field | Value |
|---|---|
| Email | `admin@pmx.local` |
| Password | `change-me-123` |

## Database Setup

After PostgreSQL and Redis are running:

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

## Run Apps

```bash
npm run dev
```

Individual apps:

```bash
npm run dev --workspace @pmx/web
npm run dev:admin
npm run start:dev --workspace @pmx/api
```

## Docker Network Note

If Docker Hub is slow or times out on this machine, route Docker through the same local proxy used by the browser, or configure a reachable registry mirror. Git CLI already works when using the local proxy:

```bash
git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 push
```

Docker daemon proxy changes usually require restarting Docker Desktop, which will temporarily stop running containers.
