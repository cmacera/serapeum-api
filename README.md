# Serapeum API

AI orchestration service powered by Genkit — a portable, container-ready API that connects Serapeum App with external knowledge sources.

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- npm
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cmacera/serapeum-api.git
   cd serapeum-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Required: fill in SUPABASE_JWT_SECRET and at least one AI provider
   # Minimum for Google AI: GOOGLE_GENAI_API_KEY + GEMINI_MODEL
   ```

4. **Run development server**
   ```bash
   npm run genkit:start    # Genkit DevTools UI at http://localhost:4000
   # or
   npm run dev             # API only, no DevTools UI
   ```

---

## 📦 Available Scripts

| Script | Description |
|---|---|
| `genkit:start` | Genkit DevTools UI (localhost:4000) + API server |
| `genkit:start:ts` | Same with timestamps on each log line (macOS) |
| `dev` | tsx watch — API server only, no DevTools |
| `build` | Compile TypeScript → `dist/` |
| `typecheck` | `tsc --noEmit` (src/ only) |
| `lint` | ESLint on `src/` |
| `format` | Prettier write |
| `format:check` | Prettier check (used by CI) |
| `test:run` | Vitest single run (CI mode, excludes e2e) |
| `test` | Vitest watch mode |
| `test:coverage` | Coverage report |
| `test:e2e` | E2E tests (requires `RUN_E2E=true`, hits real APIs) |
| `generate:openapi` | Regenerate `docs/openapi.yaml` from Zod schemas |
| `sync:flutter` | Sync OpenAPI spec to Flutter app repo |

---

## 📄 OpenAPI Spec

The API contract is defined in [`docs/openapi.yaml`](./docs/openapi.yaml). Generated from the Zod schemas in [`packages/shared-schemas/`](./packages/shared-schemas/), which are the **single source of truth** for all output types.

**Regenerate after any schema change:**

```bash
npm run generate:openapi
```

### Endpoints

| Endpoint | Description |
|---|---|
| `POST /searchBooks` | Search Google Books API |
| `POST /searchMedia` | Search TMDB (movies & TV) |
| `POST /searchGames` | Search IGDB (video games) |
| `POST /searchWeb` | Search the web using Tavily |
| `POST /searchAll` | Search all sources in parallel |
| `POST /getMovieDetail` | Full movie details (cast, trailers, providers) |
| `POST /getTvDetail` | Full TV show details (seasons, cast, providers) |
| `POST /orchestratorFlow` | AI natural language orchestrator |

---

## 🏗️ Project Structure

```text
packages/
└── shared-schemas/      # @serapeum/shared-schemas — canonical Zod schemas + TypeScript types

prompts/                 # Dotprompt files (router, extractor, synthesizer)
                         # *.v2.prompt = variants under A/B eval

src/
├── flows/               # Genkit Flows (API Logic)
│   ├── catalog/         # searchMedia, searchBooks, searchGames, searchAll, searchWeb, getMovieDetail, getTvDetail
│   └── agent/           # orchestratorFlow, findBestMatch
├── schemas/             # Thin re-exports from @serapeum/shared-schemas
├── tools/               # External API integrations (TMDB, Books, IGDB, Tavily)
├── evals/               # Genkit eval metrics and runners
├── lib/                 # Shared infrastructure (ai.ts, aiConfig.ts, auth.ts)
├── middleware/           # verifyJwt.ts — Supabase JWT contextProvider
├── locales/             # i18n JSON files
├── app.ts               # Express app factory (createApp) — shared by local dev and Vercel
└── index.ts             # Local dev entry point (calls createApp + app.listen)

.genkit/
└── datasets/            # Eval datasets (JSON) — managed via Genkit UI or directly
```

---

## 🤖 AI Providers

The API supports four AI providers, selectable via `AI_PROVIDER`:

| Provider | `AI_PROVIDER` | Required vars |
|---|---|---|
| Google AI (default) | `google` | `GOOGLE_GENAI_API_KEY`, `GEMINI_MODEL` |
| Ollama (local) | `ollama` | `OLLAMA_SERVER_URL`, `OLLAMA_MODEL` |
| Ollama Cloud (production) | `ollama-cloud` | `OLLAMA_CLOUD_API_KEY`, `OLLAMA_CLOUD_MODEL` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |

---

## 🔐 Authentication

All endpoints require a valid **Supabase JWT** in the `Authorization` header:

```http
Authorization: Bearer <supabase_access_token>
```

Tokens are verified **locally** using `SUPABASE_JWT_SECRET` — no round-trip to Supabase. Requests without a token, or with an invalid/expired one, receive a `401 Unauthorized` response.

### Testing Without a Flutter App

**1. Start the server:**
```bash
npm run dev
```

**2. Generate a test token:**
```bash
node --input-type=module --env-file=.env <<'EOF'
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
const token = await new SignJWT({ sub: 'test-user' })
  .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('24h').sign(secret);
console.log(token);
EOF
```

**3. Call an endpoint:**
```bash
curl -X POST http://localhost:3000/searchMedia \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"data":{"query":"Inception"}}'
```

---

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server listening port | No (default: 3000) |
| `GENKIT_ENV` | Environment: `dev` or `prod` | No |
| `AI_PROVIDER` | `google` \| `ollama` \| `ollama-cloud` \| `openrouter` | No (default: google) |
| `GOOGLE_GENAI_API_KEY` | Google AI API key | If using Google |
| `GEMINI_MODEL` | Gemini model (e.g. `gemini-2.0-flash`) | If using Google |
| `OLLAMA_MODEL` | Ollama model (e.g. `qwen3:14b`) | If using Ollama |
| `OLLAMA_SERVER_URL` | Ollama server URL | If using Ollama |
| `OLLAMA_CLOUD_API_KEY` | Ollama Cloud API key | If using Ollama Cloud |
| `OLLAMA_CLOUD_MODEL` | Ollama Cloud model ID | If using Ollama Cloud |
| `OPENROUTER_API_KEY` | OpenRouter API key | If using OpenRouter |
| `OPENROUTER_MODEL` | OpenRouter model ID | If using OpenRouter |
| `CORS_ORIGINS` | Comma-separated allowed origins | No |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for auth | **Yes** |
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No |
| `TMDB_API_KEY` | TMDB API key | Yes (for searchMedia) |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key | Yes (for searchBooks) |
| `IGDB_CLIENT_ID` | IGDB client ID | Yes (for searchGames) |
| `IGDB_CLIENT_SECRET` | IGDB client secret | Yes (for searchGames) |
| `TAVILY_API_KEY` | Tavily API key | Yes (for orchestratorFlow) |
| `DEBUG` | Verbose AI setup logging | No |

---

## 🐳 Docker Deployment

```bash
# Build
docker build -t serapeum-api .

# Run
docker run -p 3000:3000 \
  -e GOOGLE_GENAI_API_KEY=your_key \
  -e GEMINI_MODEL=gemini-2.0-flash \
  -e SUPABASE_JWT_SECRET=your_secret \
  -e PORT=3000 \
  serapeum-api
```

---

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Technical blueprint and architectural patterns
- [RULES.md](./RULES.md) — Coding standards, CI rules, and Git workflow
- [AGENTS.md](./AGENTS.md) — AI agent operational manifest
- [CLAUDE.md](./CLAUDE.md) — Claude Code project instructions

## 🤝 Contributing

- **Language**: All code, comments, and documentation in English
- **TypeScript**: Strict mode enabled
- **Commits**: Conventional Commits (`type(scope): description`) — no `[SER-XX]` prefix in local commits
- **PRs**: Title must start with `[SER-XX]` or `SER-XX` (enforced by CI)
- **Branching**: All branches must start with Linear issue key (e.g., `SER-123/feature-name`)
- **Quality**: Pre-commit hooks run linting, formatting, and type-checking automatically
