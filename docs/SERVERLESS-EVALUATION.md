# Serverless Deployment Evaluation — Serapeum API

> **SER-106** · March 2026

## Context

The API is a **Genkit Express HTTP server** (`startFlowServer`) running on Node ≥ 22. It handles AI orchestration flows with LLM inference — requests routinely take **10–30 seconds**. A `Dockerfile` already exists (multi-stage, Node 22 Alpine, non-root user, health check). Key constraints:

- Container must start as-is from the existing Dockerfile (no handler refactoring)
- Must support Node ≥ 22 and ESM modules
- All config via env vars (no filesystem state)
- **Server must be hosted in Europe** (latency + GDPR)
- Free tier preferred for early-stage usage
- No vendor lock-in (no Firebase-specific features)

---

## EU Region Availability

| Platform | EU Regions | Notes |
|---|---|---|
| **Cloud Run** | 13 regions (Belgium, Frankfurt, Netherlands, Paris, London, Madrid, Zurich…) | Most comprehensive EU coverage |
| **Railway** | 1 region — Netherlands | Single EU option |
| **Render** | 1 region — Frankfurt (Germany) | Single EU option |
| **Fly.io** | Amsterdam, Frankfurt | 2 EU options |
| **Vercel** | Frankfurt, Paris, Dublin, London, Stockholm | Full EU coverage, Hobby can select one |

> ⚠️ **Critical:** Cloud Run's free tier applies **US regions only**. EU deployments are billed from the first request.

---

## Platforms Evaluated

### 1. Google Cloud Run

| Attribute | Detail |
|---|---|
| **Free tier (EU)** | None — free quota applies to US regions only |
| **Cost in EU (scale-to-zero)** | Pay only for active compute. At low traffic: cents/month |
| **Cost in EU (min-instances=1)** | ~$5–10/month to keep one instance warm |
| **Max request timeout** | 60 minutes (configurable) |
| **Docker support** | Native |
| **Node 22** | Yes |
| **Cold starts** | Yes when scale-to-zero (2–10s); eliminated with `--min-instances=1` |
| **Setup complexity** | High — gcloud CLI, Artifact Registry or Cloud Build, IAM, billing |

**Fit analysis:** Technically the best fit — the Dockerfile deploys as-is, `PORT` injection is native, and the 60-min timeout is ideal for LLM calls. The 13 EU regions offer the most flexibility. However, **no free tier in EU**, and setup complexity is the highest of all evaluated options (billing account, project setup, CLI config, container registry). At scale-to-zero with low traffic, actual EU costs would be minimal (fractions of a dollar), but the setup investment is real.

**Best suited for:** Production with active users where long-term operational control matters. Overkill for early-stage.

---

### 2. Railway ✅ Recommended for Early Stage

| Attribute | Detail |
|---|---|
| **Free tier** | None permanent — 30-day / $5 trial |
| **Hobby plan** | $5/month flat (includes $5 usage credit) |
| **EU region** | Netherlands (1 region) |
| **Max timeout** | None — always-on persistent process |
| **Docker support** | Full — auto-detects Dockerfile |
| **Node 22** | Yes |
| **Cold starts** | None |
| **Setup complexity** | Very low — GitHub OAuth → select repo → done |

**Fit analysis:** `startFlowServer` runs as-is — Railway deploys the Dockerfile and runs it like a real server. No timeout, no cold starts, no code changes. GitHub integration means push-to-deploy is automatic. The $5/month Hobby plan is the only cost, and usage for low-traffic AI apps typically stays within the included credit. EU (Netherlands) region available from day one.

**Limitation:** Single EU region (Netherlands). No permanent free tier — but $5/month is a very low bar for a working deployment.

---

### 3. Render

| Attribute | Detail |
|---|---|
| **Free tier** | Yes — 512 MB RAM, 750 hours/month |
| **EU region** | Frankfurt, Germany |
| **Max timeout** | None |
| **Docker support** | Full |
| **Node 22** | Yes |
| **Spin-down (free)** | Spins down after 15 min of inactivity → **30–60s cold start** |
| **Always-on (paid)** | Starter plan at $7/month |

**Fit analysis:** The free tier spin-down is a hard blocker for production — a 30–60s restart on top of a 10–30s LLM call creates an unacceptable user experience. Acceptable for CI or staging. At $7/month (Starter, no spin-down) it becomes competitive with Railway, but with fewer features and only one EU region.

---

### 4. Vercel

| Attribute | Detail |
|---|---|
| **Free tier (Hobby)** | Yes — free permanently |
| **EU regions (Hobby)** | Frankfurt, Paris, Dublin, London, Stockholm (select one) |
| **Max timeout (Hobby, standard)** | 60s with `maxDuration` config |
| **Max timeout (Hobby, Fluid Compute)** | 300s — enable in Project Settings → Functions |
| **Persistent Express server** | No — requires code changes (see below) |
| **Setup complexity (CI/CD)** | Lowest of all options — GitHub connect → auto-deploy, PR previews |

**What needs to change to run on Vercel (analyzed against actual source):**

| # | Change | Effort | Details |
|---|---|---|---|
| 1 | Replace `startFlowServer` with manual Express app | Small | `FlowServer.start()` is ~25 lines: create `express()`, add middleware, register `expressHandler` routes. No `.listen()`. Export `app` as default. |
| 2 | Bundle `prompts/` directory | Trivial | Genkit reads `./prompts` via `fs.readdir` (dynamic — not caught by static analysis). Add `"includeFiles": ["prompts/**"]` to `vercel.json`. |
| 3 | Fix fire-and-forget cache writes | Small | `cacheAsync` in `queryCache.ts:55` uses `void setCachedResponse(...)`. Vercel freezes the container after the response → async writes are killed silently. Fix: wrap with `waitUntil()` from `@vercel/functions`. |
| 4 | Add `vercel.json` config | Trivial | Set `maxDuration: 300`, region, `includeFiles`. ~10 lines. |

**What does NOT need to change:** top-level `await` in `ai.ts` (supported in Node 22 ESM), Supabase JWT middleware, all flows and tools, Zod schemas.

**Total effort:** ~2–3 hours. The CI/CD DX after this is the best of all options (automatic PR preview deployments, zero infra management, no billing surprises).

**Hobby plan viability:** Yes. With Fluid Compute enabled (300s timeout), all LLM calls fit comfortably. Free tier is permanent. EU region available (Frankfurt recommended).

**Suited for:** Early stage where $0/month matters and you're willing to do a one-time 2–3h setup.

---

### 5. Fly.io

| Attribute | Detail |
|---|---|
| **Free tier** | Effectively gone for new signups (2-hour trial only) |
| **Smallest paid machine** | 256 MB shared CPU ≈ $1.94/month; 1 GB ≈ $5.70/month |
| **EU regions** | Amsterdam, Frankfurt |
| **Max timeout** | None — real VMs |
| **Docker support** | Full |
| **Cold starts** | None (always-on VMs) |
| **Setup complexity** | Medium — `flyctl` CLI, custom `fly.toml` config |

**Fit analysis:** Good technical fit (real VMs, no cold starts, Docker native, EU regions), but no free tier for new projects and the CLI/config overhead is higher than Railway without offering significantly more value at this stage.

---

### 6. AWS Lambda ❌

| Attribute | Detail |
|---|---|
| **Free tier** | Yes — 1M req/month, 400K GB-seconds |
| **EU regions** | Yes (Frankfurt, Ireland, London…) |
| **Max timeout** | 15 minutes |
| **Persistent HTTP server** | No — requires Express adapter (`@vendia/serverless-express`) |
| **API Gateway timeout** | Hard 29s limit — would cut LLM calls over 29s |

**Fit analysis:** Cannot run `startFlowServer` without refactoring. More critically, API Gateway imposes a **hard 29-second timeout** — any LLM inference that exceeds this fails silently from the client. Requires the most significant code changes of all evaluated options. Not recommended.

---

## Comparison Matrix

| Platform | EU Available | Free in EU | Code Changes | Cold Starts | Max Timeout | CI/CD DX | Monthly Cost |
|---|---|---|---|---|---|---|---|
| **Cloud Run** | ✅ (13 regions) | ❌ | None | Yes (scale-to-zero) | 60 min | Low | ~$0–10 |
| **Railway** | ✅ (Netherlands) | ❌ | None | None | None | High | $5 flat |
| **Render** | ✅ (Frankfurt) | ✅ (spins down) | None | Yes (30–60s free) | None | High | $0 / $7 |
| **Vercel** | ✅ (5 options) | ✅ | 3 small changes | Minimal (Fluid) | 300s (Fluid) | Best | $0 |
| **Fly.io** | ✅ (AMS, FRA) | ❌ | None | None | None | Medium | $2–6 |
| **AWS Lambda** | ✅ | ✅ | Major refactor | — | 15 min* | Low | $0 |

*API Gateway hard limit: 29s — kills LLM calls over that limit.

---

## Recommendation

### Option A — Free, best CI/CD: Vercel Hobby

Zero monthly cost, EU (Frankfurt), PR preview deployments, automatic TLS, best push-to-deploy DX. Requires a **one-time 2–3h setup** (3 small code changes + `vercel.json`). After that, deployments are fully automatic. Enable Fluid Compute for 300s timeout.

**Best if:** cost=0 is a priority and you're willing to do the initial work.

### Option B — Simplest deploy, no code changes: Railway ($5/month)

Zero code changes, Dockerfile deploys as-is, EU (Netherlands), no cold starts, no timeouts. $5/month is the minimum cost for any always-on EU deployment.

**Best if:** you want to be running in production today without touching code.

### Option C — Best long-term: Google Cloud Run (EU)

Most EU region coverage (13 regions), 60-min timeout, full container control. No free tier in EU, but scale-to-zero means near-zero cost at low traffic. Highest setup overhead. Worth migrating to at scale.

**Best if:** you anticipate growth and want infrastructure that scales without rearchitecting.

### Avoid

- **Render free tier** — 30–60s cold starts are unacceptable on top of LLM latency
- **AWS Lambda** — API Gateway 29s timeout kills slow LLM calls; requires significant refactoring

---

## Railway: Quick Start

```bash
# Install CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Link to GitHub repo and deploy
railway up

# Set environment variables
railway variables set NODE_ENV=production GOOGLE_GENAI_API_KEY=... CORS_ORIGINS=https://yourapp.com

# Set EU region (in Railway dashboard: Settings → Region → europe-west4)
```

Railway automatically detects and uses the existing `Dockerfile`.

## Cloud Run (EU): Deployment Reference

```bash
# One-time setup
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# Build and deploy (Europe)
gcloud run deploy serapeum-api \
  --source . \
  --region europe-west4 \        # Netherlands
  --port 3000 \
  --timeout 300 \
  --memory 512Mi \
  --min-instances 0 \            # scale-to-zero (cheapest)
  --set-env-vars "NODE_ENV=production,CORS_ORIGINS=https://yourapp.com,..."
```

Note: `--source .` triggers Cloud Build automatically, no separate Artifact Registry push needed.

## Vercel: Required Code Changes

### 1. `vercel.json` (new file, root of project)

```json
{
  "regions": ["fra1"],
  "functions": {
    "api/index.ts": {
      "maxDuration": 300
    }
  },
  "includeFiles": ["prompts/**", "src/locales/**"]
}
```

### 2. `api/index.ts` (new file — Vercel entry point)

Vercel serves functions from the `api/` directory. Replace `startFlowServer` with a manual Express app exported as default:

```ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { expressHandler, withFlowOptions } from '@genkit-ai/express';
import { waitUntil } from '@vercel/functions';

import { jwtContextProvider } from '../src/middleware/verifyJwt.js';
import { orchestratorFlow } from '../src/flows/agent/orchestratorFlow.js';
// ... other flow imports
import '../src/prompts/index.js';

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: process.env['CORS_ORIGINS'] ?? '*' }));

app.post('/orchestratorFlow', expressHandler(orchestratorFlow, { contextProvider: jwtContextProvider }));
// ... other routes

export default app;
```

### 3. Fix fire-and-forget cache write in `src/lib/queryCache.ts`

```ts
// Before:
if (response.kind !== 'error') void setCachedResponse(key, response);

// After (import waitUntil from '@vercel/functions' at top of file):
if (response.kind !== 'error') waitUntil(setCachedResponse(key, response));
```

> `waitUntil` tells Vercel to keep the function alive until the promise resolves, even after the HTTP response has been sent.

### 4. Enable Fluid Compute

In the Vercel dashboard: Project Settings → Functions → Enable Fluid Compute. This raises the Hobby timeout from 60s to 300s.
