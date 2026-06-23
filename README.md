# Polymarket Trading Platform

Non-custodial third-party base trading platform for Polymarket.

## Stack

- Next.js frontend in `apps/web`
- NestJS backend in `apps/api`
- PostgreSQL + Prisma
- Redis + BullMQ
- Playwright plus unit and integration test entry points

## Local Start

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run dev
```

Frontend: http://localhost:3000

Backend health: http://localhost:4000/health

## Current Scope

This repository is at stage 1: project structure and technical skeleton only. Real Polymarket order submission, relayer configuration, CLOB permissions, risk copy, and geoblock policy require manual confirmation before implementation.
