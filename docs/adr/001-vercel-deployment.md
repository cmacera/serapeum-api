# ADR-001: Deploy to Vercel (Hobby free tier)

**Date:** 2026-03-25
**Status:** Accepted
**Ticket:** SER-106 (evaluation) · SER-107 (implementation)

---

## Context

The Serapeum API needs a cloud deployment target. It is a **Genkit Express HTTP server** (`startFlowServer`) running on Node ≥ 22 ESM. Key constraints:

- LLM inference requests take **10–30 seconds**
- Servers must be in **Europe** (latency + GDPR)
- **Free tier preferred** at early stage
- No vendor lock-in; all config via env vars

Five platforms were evaluated: Google Cloud Run, Railway, Render, Fly.io, AWS Lambda, and Vercel. Full comparison in [`docs/SERVERLESS-EVALUATION.md`](../SERVERLESS-EVALUATION.md).

---

## Decision

**Deploy to Vercel Hobby (free tier, Frankfurt `fra1`).**

---

## Rationale

| Factor | Verdict |
|---|---|
| Cost | Free permanently (Hobby plan) |
| EU region | Frankfurt `fra1` available on Hobby |
| LLM timeout | 300s with Fluid Compute (enable in Project Settings → Functions) |
| CI/CD | Push-to-deploy from GitHub; PR preview deployments automatic |
| Code changes | 3 small + 1 trivial (see Consequences) |

### Why not the alternatives

| Platform | Rejection reason |
|---|---|
| **Cloud Run** | No free tier in EU; highest setup complexity for early stage |
| **Railway** | No permanent free tier ($5/month minimum) |
| **Render** | Free tier spins down after 15 min → 30–60s cold start unacceptable on top of LLM latency |
| **Fly.io** | No free tier for new projects; similar cost to Railway with more complex DX |
| **AWS Lambda** | API Gateway hard **29s timeout** kills slow LLM calls; requires major refactoring of `startFlowServer` |

### Why Vercel over Railway despite needing code changes

Railway requires zero code changes but costs $5/month permanently. Vercel requires a **one-time 2–3h setup** and is then free forever with better CI/CD DX (PR previews, automatic deploys). The code changes are small and isolated.

---

## Consequences

### Code changes required

**1. `src/app.ts` (new) — shared Express app factory**

Extract the Express setup into a `createApp(corsOrigins)` function shared by both entry points. This eliminates duplication between local dev and Vercel without coupling them.

**2. `src/index.ts` (modify) — local dev entry point**

Replace `startFlowServer(...)` with `createApp(corsOrigins)` + `app.listen(PORT)`. Genkit DevTools (`npm run genkit:start`) continue to work — the reflection API is managed by the `genkit` CLI, not by `startFlowServer`.

**3. `api/index.ts` (new) — Vercel entry point**

Vercel serves functions from the `api/` directory. Exports `default createApp(corsOrigins)` without `.listen()`. Vercel intercepts requests before they reach Express's TCP listener.

**4. `vercel.json` (new)**

```json
{
  "regions": ["fra1"],
  "functions": {
    "api/index.ts": { "maxDuration": 300 }
  },
  "includeFiles": ["prompts/**", "src/locales/**"]
}
```

`includeFiles` is required because Genkit loads `./prompts/*.prompt` files via `fs.readdir` at startup — Vercel's static analysis does not detect dynamically read directories.

**5. `src/lib/queryCache.ts` (modify) — fire-and-forget cache writes**

`cacheAsync` currently uses `void setCachedResponse(...)`. Vercel freezes the function container after the HTTP response is sent, killing any pending async work. Fix: replace with `waitUntil(setCachedResponse(...))` from `@vercel/functions`, which extends the function lifetime until the promise resolves.

### Ongoing considerations

- When adding a new flow, register it in `src/app.ts` (single source — used by both entry points).
- Fluid Compute must be **manually enabled** in the Vercel dashboard (Project Settings → Functions → Fluid Compute). Without it, the Hobby timeout is 60s instead of 300s.
- `CORS_ORIGINS` env var is required in production. Set it in the Vercel dashboard under Environment Variables.
- The Dockerfile remains valid for potential future migration to Cloud Run or Railway.

### Not affected

- Genkit DevTools (`npm run genkit:start`) — unchanged, still uses `src/index.ts`
- All flows, tools, prompts, schemas — no changes
- JWT middleware — no changes
- Tests — no changes
- CI pipeline — no changes
