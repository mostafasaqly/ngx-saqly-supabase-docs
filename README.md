# ngx-saqly-supabase · Documentation

Interactive documentation site for **[ngx-saqly-supabase](https://www.npmjs.com/package/ngx-saqly-supabase)** — the Angular library for building full-stack apps with Supabase, no backend required.

Built with Angular 21, standalone components, signals, and lazy-loaded routes.

## Features

- **14 documentation routes** — installation → schema → migrations → CRUD → joins → relations → RLS → auth → 3 working examples → API reference
- **LMS / Feedzony SaaS example** — a complete recipe with Lemon Squeezy billing, RLS policies, Edge Function webhook, and route guards
- **Dark Supabase-style theme** with custom syntax highlighting (TS / SQL / Bash / HTML) and copy buttons on every code block
- **AI Assistant tab** — describe any app idea and get a complete `schema.ts` back, using free models on OpenRouter (Qwen3 Coder, GPT-OSS 120B, Llama 3.3 70B, etc.) with automatic fallback on rate limits or hallucinated output
- **One-click copy / download `schema.ts`** straight from the AI response

## Quick start

```bash
git clone https://github.com/mostafasaqly/ngx-saqly-supabase-docs.git
cd ngx-saqly-supabase-docs
npm install

# Set up your local environment
cp src/environments/environment.example.ts src/environments/environment.ts
# Then edit environment.ts and paste your free OpenRouter key from https://openrouter.ai/keys

npm start
```

Open http://localhost:4200 — the AI Assistant lives at `/ai-assistant`.

## Project structure

```
src/app/
├── app.ts                  · Layout shell with sidebar nav + search
├── app.routes.ts           · 15 lazy-loaded routes
├── pages/
│   ├── intro.page.ts
│   ├── installation.page.ts
│   ├── quick-setup.page.ts
│   ├── schema.page.ts
│   ├── migrations.page.ts
│   ├── crud.page.ts
│   ├── joins.page.ts
│   ├── relations.page.ts
│   ├── rls.page.ts
│   ├── auth.page.ts
│   ├── example-products.page.ts
│   ├── example-real.page.ts
│   ├── example-lms.page.ts     · Feedzony SaaS recipe (7 internal tabs)
│   ├── api.page.ts
│   └── ai-assistant.page.ts    · LLM-powered schema generator
└── shared/
    ├── code-block.ts       · Syntax-highlighted code with copy button
    ├── doc-page.ts         · Hero/eyebrow wrapper
    ├── highlight.ts        · Dependency-free highlighter (ts/sql/bash/html)
    └── openrouter.service.ts   · Streaming chat with hallucination detection
```

## Build

```bash
npm run build         # production build → dist/
npm start             # dev server with HMR
```

## AI Assistant — how it works

The `/ai-assistant` tab calls the OpenRouter API directly from the browser using one of several free models. The assistant returns a single `schema.ts` file ready to drop into your project.

Reliability features:
- **Hallucination detector** aborts the stream if the model returns multilingual gibberish or never opens a code fence — then automatically retries with the next model
- **Rate-limit fallback** — when one model hits 429, the next one in the list is tried transparently
- **Few-shot prompted** with a complete blog schema so the output format is consistent every time
- **Copy / Download** buttons surface as soon as a valid block is detected in the response

## Security note

The OpenRouter API key sits in `src/environments/environment.ts` (git-ignored). For production deployments, proxy the call through a small backend (a Supabase Edge Function works) so the key isn't shipped to the browser.

## License

MIT
