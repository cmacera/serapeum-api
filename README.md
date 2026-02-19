# Serapeum API

AI orchestration service powered by Genkit - A portable, container-ready API that connects Serapeum App with external knowledge sources.

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- npm or yarn
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
   # Required: fill in GOOGLE_GENAI_API_KEY and SUPABASE_JWT_SECRET
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

   The Genkit Developer UI will be available at `http://localhost:3000`

## 📦 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run genkit:start` - Start Genkit Developer UI and server flow
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking
- `npm run generate:openapi` - Regenerate `docs/openapi.yaml` from Zod schemas

## 📄 OpenAPI Spec

The API contract is defined in [`docs/openapi.yaml`](./docs/openapi.yaml) and is generated from the Zod schemas defined inline in [`scripts/generate-openapi.ts`](./scripts/generate-openapi.ts), which mirror the schemas in `src/flows/*.ts`.

> **Note:** When you change a flow's output schema in `src/flows/`, you must also update the corresponding mirrored schema in `scripts/generate-openapi.ts` and re-run `npm run generate:openapi`.

**Regenerate after any schema change:**

```bash
npm run generate:openapi
```

The spec covers all 5 endpoints:

| Endpoint | Description |
|---|---|
| `POST /searchBooks` | Search Google Books API |
| `POST /searchMedia` | Search TMDB (movies & TV) |
| `POST /searchGames` | Search IGDB (video games) |
| `POST /searchAll` | Search all sources in parallel |
| `POST /orchestratorFlow` | AI natural language orchestrator |

> **Note:** The schemas in `scripts/generate-openapi.ts` mirror the Zod schemas in the flow files. Keep them in sync when modifying flow output schemas.

## 🏗️ Project Structure

```
src/
├── flows/          # Genkit Flows (API Logic)
│   ├── catalog/    # searchMedia, searchBooks, searchGames, searchAll, searchWeb
│   └── agent/      # mediaAgent, orchestratorFlow
├── tools/          # External API integrations (TMDB, Books, IGDB, Tavily)
├── lib/            # Shared infrastructure (ai.ts, auth.ts)
├── middleware/     # verifyJwt.ts — Supabase JWT contextProvider
├── prompts/        # Dotprompt files
└── index.ts        # Server entry point
```

## 🔧 Tech Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript 5.x (Strict Mode)
- **Framework**: Genkit Core + Google AI Plugin
- **Validation**: Zod
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Docker / OCI Container

## 🐳 Docker Deployment

### Build the image

```bash
docker build -t serapeum-api .
```

### Run the container

```bash
docker run -p 3000:3000 \
  -e GOOGLE_GENAI_API_KEY=your_key_here \
  -e PORT=3000 \
  serapeum-api
```

## 🔐 Authentication

All endpoints require a valid **Supabase JWT** in the `Authorization` header:

```http
Authorization: Bearer <supabase_access_token>
```

Tokens are verified **locally** using `SUPABASE_JWT_SECRET` — no round-trip to Supabase. Requests without a token, or with an invalid/expired one, receive a `401 Unauthorized` response.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full auth flow diagram.

## 🧪 Testing Without a Flutter App

You can generate a valid JWT locally with Node.js and use it with `curl`:

**1. Start the server:**
```bash
npm run dev
```

**2. Generate a test token** (run once in a Node.js REPL or script):
```js
import { SignJWT } from 'jose';
const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
const token = await new SignJWT({ sub: 'test-user', email: 'dev@test.com' })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('24h')
  .sign(secret);
console.log(token);
```

Or run it directly:
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
  -H "Authorization: Bearer <token_from_step_2>" \
  -d '{"data":{"query":"Inception"}}'
```

**4. Verify auth rejects unauthenticated requests:**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/searchMedia \
  -H "Content-Type: application/json" -d '{"data":{"query":"Inception"}}'
# Expected: 401
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server listening port | No (default: 3000) |
| `GOOGLE_GENAI_API_KEY` | Google AI API key | Yes |
| `GENKIT_ENV` | Environment: `dev` or `prod` | No (default: dev) |
| `CORS_ORIGINS` | Comma-separated allowed origins | No |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret for auth | **Yes** |
| `SUPABASE_URL` | Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No |
| `TMDB_API_KEY` | TMDB API key | Yes (for searchMedia) |
| `GOOGLE_BOOKS_API_KEY` | Google Books API key | Yes (for searchBooks) |
| `IGDB_CLIENT_ID` | IGDB client ID | Yes (for searchGames) |
| `IGDB_CLIENT_SECRET` | IGDB client secret | Yes (for searchGames) |
| `TAVILY_API_KEY` | Tavily API key | Yes (for searchWeb) |

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical blueprint
- [RULES.md](./RULES.md) - Coding standards and conventions
- [AGENTS.md](./AGENTS.md) - AI agent operational manifest

## 🤝 Contributing

This project follows strict coding standards:

- **Language**: All code, comments, and documentation in English
- **TypeScript**: Strict mode enabled
- **Commits**: Conventional Commits format enforced
- **Branching**: All branches must start with Linear issue key (e.g., `SER-123/feature-name`)
- **Quality**: Pre-commit hooks run linting, formatting, and type-checking
