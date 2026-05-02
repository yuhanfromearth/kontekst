# kontekst

OpenRouter wrapper with minimal UI and local Context Management with utility keyboard shortcuts. Chat with any LLM, at API cost, without the noise.

## Getting started

Requires Node 20+.

```sh
npx kontekst
```

That's it. The app fetches itself, starts a local server on `http://localhost:8080`, and opens it in your browser. Data is stored in `~/.kontekst` (override with the `KONTEKST_FOLDER` env var).

To pick a different port:

```sh
PORT=9000 npx kontekst
```

## Storage

The backend persists all state as JSON files inside `KONTEKST_FOLDER` (default `~/.kontekst`).

- `keys.json` — OpenRouter API keys. Written with mode `0600` (owner read/write only). Manage them from the wallet menu in the UI; chat is disabled until at least one key is added.
- `konteksts.json` — named LLM contexts (system prompts).
- `conversations.json` — full chat history per conversation, including the resolved kontekst, model, messages.

## Development

Clone the repo and run the dev servers (Vite + Nest watch + dtos watch):

```sh
npm install
npm run start
```

Layout:

- `apps/be` — NestJS backend
- `apps/ui` — Vite + TanStack Start frontend (SPA mode in production)
- `dtos` — shared Zod schemas

To test the production build locally:

```sh
npm run start:prod
```
