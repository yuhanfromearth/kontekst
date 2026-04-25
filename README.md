# kontekst

Monorepo containing both the kontekst frontend and backend.

## Layout

- `apps/be` — NestJS backend (was `kontekst-be`)
- `apps/ui` — Vite + TanStack Start frontend (was `kontekst-ui`)

## Getting started

Install all dependencies once at the repo root (npm workspaces):

```sh
npm install
```

## Running

```sh
# Backend (dev mode with watch)
npm run start:dev --workspace=apps/be

# Frontend (Vite dev server on :3000)
npm run dev --workspace=apps/ui
```

## Building

```sh
npm run build --workspace=apps/be
npm run build --workspace=apps/ui
```
