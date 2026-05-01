# kontekst

OpenRouter wrapper with minimal UI and local Context Management with utility keyboard shortcuts. Chat with any LLM, at API cost, without the noise.

## Layout

- `apps/be` — NestJS backend
- `apps/ui` — Vite + TanStack Start frontend

## Getting started

Install all dependencies once at the repo root (npm workspaces) and start the front- and backend services on localhost:

```sh
npm install
npm run start
```

## Storage

The backend persists all state as JSON files inside the directory pointed to by the `KONTEKST_FOLDER` environment variable. The folder must exist; the files are created on first read.

- `keys.json` — OpenRouter API keys. Written with mode `0600` (owner read/write only). Manage them from the wallet menu in the UI; chat is disabled until at least one key is added.
- `konteksts.json` — named LLM contexts (system prompts).
- `conversations.json` — full chat history per conversation, including the resolved kontekst, model, messages.
