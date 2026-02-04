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
| 🛰️ Server Mode | Genkit Standalone (`startFlowsServer`) or Express Adapter |
| 🗄️ Database | Supabase JS Client (PostgreSQL) |
| 📦 Deployment | Docker / OCI Container |

---

## 2. 🗂️ Directory Structure

**Project organization:**  
The project follows a **modular architecture**, with `index.ts` serving as the main entry point and bootstrapper.

src/
├── flows/ # The API Logic (Genkit Flows)
│ ├── entertainment/
│ │ ├── recommendNextBook.ts
│ │ └── analyzeMovieSentiment.ts
│ └── user/
│
├── tools/ # External Capabilities
│ ├── tmdb/
│ └── tavily/
│
├── lib/ # Shared Infrastructure
│ ├── supabase.ts # Supabase Admin Client
│ ├── ai.ts       # Genkit Instance Configuration
│ └── auth.ts     # Middleware (Bearer Token validation)
│
├── prompts/ # Dotprompt Files
└── index.ts # Server Entry Point (starts startFlowsServer)

Dockerfile # Production Image Definition

---

## 3. 🧭 Architectural Patterns

### 3.1 🧩 Standalone Server Pattern

- **Entry Point:** `src/index.ts` must import all flows and call `startFlowsServer()`.  
- **Port Binding:** The server must bind to `process.env.PORT` (default `3000` or `4000`) to comply with PaaS requirements.  
- **CORS Policy:** Configure CORS to explicitly allow requests from the Flutter app’s **Bundle ID** or **authorized domains**.

---

### 3.2 🧠 Flow Pattern

- **Definition:** Logic units are instantiated via `ai.defineFlow`.  
- **Exposure:** All flows are auto-exposed by Genkit under `POST /api/<flowName>`.  
- **Auth Handling:** Flows must enforce authentication using the shared middleware from `lib/auth.ts`. Tokens are passed in `headers` or `context`.

---

### 3.3 🗄️ Data Access

- **Storage Engine:** **Supabase** provides persistence via PostgreSQL.  
- **Connection Details:**  
  - `SUPABASE_URL`  
  - `SUPABASE_SERVICE_ROLE_KEY`  
  Defined in the environment at runtime and injected securely through environment variables.

---

## 4. ⚙️ Environment & Config

**Supported Infrastructure:** Render, Railway, or any VPS instance running Docker.  

**Required Environment Variables:**

| Variable | Description |
|-----------|-------------|
| `PORT` | Server listening port |
| `GOOGLE_GENAI_API_KEY` | API key for Gemini models |
| `GENKIT_ENV` | Defines environment: `"dev"` or `"prod"` |

---

> 🧭 *"A disciplined architecture enables intelligent flow — Serapeum evolves through modular precision."*
