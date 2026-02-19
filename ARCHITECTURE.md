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
| ⚙️ Framework | Genkit Core + Google AI Plugin |
| 🛰️ Server Mode | Genkit Standalone (`startFlowServer`) or Express Adapter |
| 🗄️ Database | Supabase JS Client (PostgreSQL) |
| 📦 Deployment | Docker / OCI Container |

---

## 2. 🗂️ Directory Structure

**Project organization:**  
The project follows a **modular architecture**, with `index.ts` serving as the main entry point and bootstrapper.

```
src/
├── flows/              # Genkit Flows (API logic)
│   ├── catalog/        # searchMedia, searchBooks, searchGames, searchAll, searchWeb
│   └── agent/          # mediaAgent, orchestratorFlow
│
├── tools/              # External API wrappers (TMDB, Books, IGDB, Tavily)
│
├── lib/                # Shared infrastructure
│   ├── ai.ts           # Genkit instance + model configuration
│   ├── aiConfig.ts     # Provider-specific AI setup
│   └── auth.ts         # JWT verification (verifySupabaseJwt via jose)
│
├── middleware/
│   └── verifyJwt.ts    # Genkit contextProvider — validates Bearer token on every request
│
├── prompts/            # Dotprompt files (routerPrompt, extractorPrompt, synthesizerPrompt)
└── index.ts            # Server entry point
```

Dockerfile  # Production image definition

---

## 3. 🧭 Architectural Patterns

### 3.1 🧩 Standalone Server Pattern

- **Entry Point:** `src/index.ts` imports all flows and calls `startFlowServer()`.
- **Port Binding:** The server binds to `process.env.PORT` (default `3000`) to comply with PaaS requirements.
- **CORS Policy:** Configure `CORS_ORIGINS` to explicitly allow requests from authorized clients.

---

### 3.2 🔐 Authentication Pattern

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
- Each flow is registered via `withFlowOptions(flow, { contextProvider: jwtContextProvider })` in `index.ts`.
- The verified JWT payload is available to flows via `getFlowContext()` if needed.

---

### 3.3 🧠 Flow Pattern

- **Definition:** Logic units are declared with `ai.defineFlow`.
- **Exposure:** All flows are auto-exposed under `POST /<flowName>` by Genkit.

---

### 3.4 🗄️ Data Access

- **Storage Engine:** **Supabase** provides persistence via PostgreSQL.
- **Connection Variables:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, injected at runtime.

---

## 4. ⚙️ Environment & Config

**Supported Infrastructure:** Render, Railway, or any VPS instance running Docker.  

**Required Environment Variables:**

| Variable | Description |
|-----------|-------------|
| `PORT` | Server listening port (default: `3000`) |
| `GOOGLE_GENAI_API_KEY` | API key for Gemini models |
| `GENKIT_ENV` | Environment: `"dev"` or `"prod"` |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `SUPABASE_JWT_SECRET` | **Required** — shared secret for local JWT verification |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin DB access) |
| `TMDB_API_KEY` | TMDB movie/TV search |
| `GOOGLE_BOOKS_API_KEY` | Google Books search |
| `IGDB_CLIENT_ID` | IGDB game search (client ID) |
| `IGDB_CLIENT_SECRET` | IGDB game search (client secret) |
| `TAVILY_API_KEY` | Tavily web search |

---

> 🧭 *"A disciplined architecture enables intelligent flow — Serapeum evolves through modular precision."*
