# 🧱 ARCHITECTURE.md
## **Technical Blueprint for Serapeum API**

---

## 1. 🌐 System Overview

**Description:**
**Serapeum API** is a standalone **Node.js** service powered by **Genkit**.
It is designed for **containerized deployment** on **Render**, **Railway**, or any **VPS environment**.

**Core Tech Stack:**

| Component | Specification |
|------------|----------------|
| 🧩 Runtime | Node.js 22+ (LTS) |
| 📝 Language | TypeScript 5.x (Strict Mode) |
| ⚙️ Framework | Genkit Core (Express adapter) |
| 🛰️ Server Mode | Express app factory (`createApp`) — local dev via `src/index.ts`, Vercel via `api/index.ts` |
| 🗄️ Database | Supabase JS Client (PostgreSQL) |
| 📦 Deployment | Docker / OCI Container |

---

## 2. 🗂️ Directory Structure

```text
packages/
└── shared-schemas/      # @serapeum/shared-schemas — npm workspace package
    └── src/             # Zod schemas + inferred TypeScript types (canonical source)

prompts/                 # Dotprompt files (routerPrompt, extractorPrompt, synthesizerPrompt)
                         # *.v2.prompt variants used for A/B eval before promotion

src/
├── flows/               # Genkit Flows (API logic)
│   ├── catalog/         # searchMedia, searchBooks, searchGames, searchAll, searchWeb,
│   │                    # getMovieDetail, getTvDetail
│   └── agent/           # orchestratorFlow, findBestMatch
│
├── schemas/             # Thin re-exports from @serapeum/shared-schemas
│
├── tools/               # External API wrappers (TMDB, Books, IGDB, Tavily)
│
├── evals/               # Genkit eval metrics and runners
│
├── lib/                 # Shared infrastructure
│   ├── ai.ts            # Genkit instance + plugin initialization
│   ├── aiConfig.ts      # Provider-specific AI setup (Google, Ollama, Ollama Cloud, OpenRouter)
│   └── auth.ts          # JWT verification (verifySupabaseJwt via jose)
│
├── middleware/
│   └── verifyJwt.ts     # Genkit contextProvider — validates Bearer token on every request
│
├── locales/             # i18n JSON files
└── index.ts             # Server entry point

.genkit/
└── datasets/            # Eval datasets (JSON) + index.json metadata

Dockerfile               # Production image definition
```

---

## 3. 🧭 Architectural Patterns

### 3.1 📦 Shared Schemas Package

All Zod schemas and their inferred TypeScript types live in `packages/shared-schemas/` (`@serapeum/shared-schemas`), an npm workspace package local to this repo.

```text
packages/shared-schemas/src/
├── book-schemas.ts          # BookSearchResultSchema
├── game-schemas.ts          # GameSearchResultSchema
├── media-schemas.ts         # MediaSearchResultSchema
├── media-detail-schemas.ts  # MovieDetailSchema, TvDetailSchema, sub-schemas
├── search-all-schemas.ts    # SearchErrorSchema, SearchAllOutputSchema
├── agent-schemas.ts         # AgentResponseSchema
└── index.ts                 # Barrel export (schemas + TypeScript types)
```

- **`src/schemas/*.ts`** are thin re-exports — never define schemas in both places.
- **`scripts/generate-openapi.ts`** imports directly from `@serapeum/shared-schemas`.
- The package is built automatically via the `prebuild` script before every `npm run build`.
- A TypeScript path alias (`@serapeum/shared-schemas → packages/shared-schemas/src/index.ts`) enables type resolution without a prior build.

---

### 3.2 🤖 Multi-Provider AI

Provider selection is controlled by the `AI_PROVIDER` environment variable. All providers register their models as Genkit actions at startup so the eval UI model switcher works correctly.

| Provider | `AI_PROVIDER` value | Required env vars |
|---|---|---|
| Google (default) | `google` | `GOOGLE_GENAI_API_KEY`, `GEMINI_MODEL` |
| Ollama (local) | `ollama` | `OLLAMA_SERVER_URL`, `OLLAMA_MODEL` |
| Ollama Cloud (production) | `ollama-cloud` | `OLLAMA_CLOUD_API_KEY`, `OLLAMA_CLOUD_MODEL` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |

`src/lib/aiConfig.ts` configures each plugin. `src/lib/ai.ts` initializes the global Genkit instance and exports the `activeModel` string and `ai` instance used by all flows.

Ollama (local) pre-registers all available models from `/api/tags` at startup so any model can be selected in the eval UI without restarting. Ollama Cloud uses Bearer token auth against `https://ollama.com` and does not perform model discovery at startup.

---

### 3.3 🧩 Standalone Server Pattern

- **Entry Point:** `src/app.ts` registers all flows and exports the Express app factory (`createApp`). `src/index.ts` calls it and starts the server for local dev; `api/index.ts` exports the app for Vercel.
- **Port Binding:** The server binds to `process.env.PORT` (default `3000`) to comply with PaaS requirements.
- **CORS Policy:** Configure `CORS_ORIGINS` to explicitly allow requests from authorized clients.
- **Genkit DevTools UI:** Available at `http://localhost:4000` when running `npm run genkit:start`.

---

### 3.4 🔐 Authentication Pattern

All endpoints are protected by a **Supabase JWT contextProvider** (`src/middleware/verifyJwt.ts`).

```
Request
  └─▶ jwtContextProvider          (src/middleware/verifyJwt.ts)
        ├── No Authorization header?   → 401
        ├── Not a Bearer token?        → 401
        ├── Invalid / tampered?        → 401
        ├── Expired?                   → 401
        └── Valid ✓
              └─▶ Genkit Flow executes → 200
```

- Tokens are **verified locally** using the `SUPABASE_JWT_SECRET` — zero Supabase network latency.
- Each flow is registered with `{ contextProvider: jwtContextProvider }` in `src/app.ts`.

---

### 3.5 🧠 Agent Pipeline (`orchestratorFlow`)

```
User query → routerPrompt → extractorPrompt → [catalog tools] → synthesizerPrompt
```

1. **Router** — classifies intent (`SPECIFIC_ENTITY` / `GENERAL_DISCOVERY` / `OUT_OF_SCOPE`) and category (`MOVIE_TV` / `GAME` / `BOOK` / `ALL`)
2. **Extractor** — extracts title(s) from Tavily web context
3. **Catalog tools** — TMDB / IGDB / Google Books based on category
4. **findBestMatch** — fuzzy match + popularity tiebreaker for featured result
5. **Synthesizer** — formats final natural language response

---

### 3.6 📝 Dotprompt Pattern

- Prompt files live in `prompts/` (top-level, not `src/`).
- YAML frontmatter: `model`, `config`, `input.schema`, `output.schema` — all with 2-space indentation.
- Prompt variants use `*.v2.prompt` naming for A/B evaluation. Once a variant wins evals, it replaces the original.

---

### 3.7 🗄️ Data Access

- **Storage Engine:** **Supabase** provides persistence via PostgreSQL.
- **Connection Variables:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, injected at runtime.

---

## 4. ⚙️ Environment & Config

**Supported Infrastructure:** Render, Railway, or any VPS instance running Docker.

**Required Environment Variables:**

| Variable | Description | Required |
|-----------|-------------|----------|
| `PORT` | Server listening port | No (default: 3000) |
| `GENKIT_ENV` | Environment: `dev` or `prod` | No (default: dev) |
| `AI_PROVIDER` | AI provider: `google`, `ollama`, `ollama-cloud`, `openrouter` | No (default: google) |
| `GOOGLE_GENAI_API_KEY` | Google AI API key | If using Google |
| `GEMINI_MODEL` | Gemini model ID (e.g. `gemini-2.0-flash`) | If using Google |
| `OLLAMA_MODEL` | Ollama model name (e.g. `qwen3:14b`) | If using Ollama |
| `OLLAMA_SERVER_URL` | Ollama server URL | If using Ollama |
| `OLLAMA_CLOUD_API_KEY` | Ollama Cloud API key | If using Ollama Cloud |
| `OLLAMA_CLOUD_MODEL` | Ollama Cloud model ID | If using Ollama Cloud |
| `OPENROUTER_API_KEY` | OpenRouter API key | If using OpenRouter |
| `OPENROUTER_MODEL` | OpenRouter model ID | If using OpenRouter |
| `CORS_ORIGINS` | Comma-separated allowed origins | No |
| `SUPABASE_JWT_SECRET` | Shared secret for local JWT verification | **Yes** |
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No |
| `TMDB_API_KEY` | TMDB movie/TV search | Yes (for searchMedia) |
| `GOOGLE_BOOKS_API_KEY` | Google Books search | Yes (for searchBooks) |
| `IGDB_CLIENT_ID` | IGDB game search (client ID) | Yes (for searchGames) |
| `IGDB_CLIENT_SECRET` | IGDB game search (client secret) | Yes (for searchGames) |
| `TAVILY_API_KEY` | Tavily web search | Yes (for orchestratorFlow) |
| `DEBUG` | Verbose AI setup logging | No |

---

> 🧭 *"A disciplined architecture enables intelligent flow — Serapeum evolves through modular precision."*
