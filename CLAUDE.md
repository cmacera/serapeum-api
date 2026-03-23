# CLAUDE.md — Serapeum API

## Project overview

Node.js AI orchestration service built with **Genkit (Standalone)**. Connects a Flutter frontend with external knowledge sources (TMDB, IGDB, Google Books, Tavily) through a router → extractor → synthesizer agent pipeline.

- **Runtime:** Node ≥ 22, ESM (`"type": "module"`)
- **Language:** TypeScript strict, `ES2022` target, `NodeNext` modules
- **Framework:** Genkit with dotprompt (prompts live in `prompts/`)

---

## Key commands

```bash
npm run genkit:start       # Genkit DevTools UI at localhost:4000
npm run genkit:start:ts    # Same with timestamps (macOS)
npm run dev                # tsx watch (no DevTools)
npm run typecheck          # tsc --noEmit (src/ only)
npm run lint               # eslint src/
npm run test:run           # vitest single run (CI mode, excludes e2e)
npm run build              # tsc + copy locales → dist/
```

---

## Directory structure

```text
src/
  flows/
    agent/          # orchestratorFlow.ts, findBestMatch.ts
    catalog/        # searchAll, searchMedia, searchGames, searchBooks, searchWeb
  tools/            # TMDB, IGDB, Google Books, Tavily wrappers
  schemas/          # Thin re-exports from @serapeum/shared-schemas
  middleware/       # JWT verification (Supabase)
  lib/              # ai.ts, aiConfig.ts, auth.ts, retry, types
  locales/          # i18n JSON files
  evals/            # Genkit eval metrics and runners
prompts/            # *.prompt dotprompt files (router, extractor, synthesizer)
packages/
  shared-schemas/   # npm workspace — canonical Zod schemas (built before main)
tests/
  unit/             # Unit tests
  integration/      # Integration tests
  e2e/              # E2E tests (excluded from normal runs, require RUN_E2E=true)
.genkit/
  datasets/         # Eval datasets (JSON) and index
```

---

## Architecture

### Agent pipeline (`orchestratorFlow`)

```text
User query → routerPrompt → extractorPrompt → [catalog tools] → synthesizerPrompt
```

1. **Router** — classifies intent (`SPECIFIC_ENTITY` / `GENERAL_DISCOVERY` / `OUT_OF_SCOPE` / `FACTUAL_QUERY`) and category (`MOVIE_TV` / `GAME` / `BOOK` / `ALL`)
2. **Extractor** — extracts title(s) from Tavily web context
3. **Catalog tools** — TMDB / IGDB / Google Books based on category
4. **findBestMatch** — fuzzy match + popularity tiebreaker for featured result
5. **Synthesizer** — formats final natural language response

### Schemas

`packages/shared-schemas/` is the canonical source. `src/schemas/` re-exports from there. Never duplicate schemas.

### AI providers

Configured via env vars in `src/lib/aiConfig.ts`. Four supported providers:

| Provider | Env vars required |
|---|---|
| Google (default) | `GOOGLE_GENAI_API_KEY`, `GEMINI_MODEL` |
| Ollama | `OLLAMA_SERVER_URL`, `OLLAMA_MODEL` |
| Ollama Cloud | `OLLAMA_CLOUD_API_KEY`, `OLLAMA_CLOUD_MODEL` |
| OpenRouter | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |

Set `AI_PROVIDER=google|ollama|ollama-cloud|openrouter` to select.

### Prompts

- Dotprompt files in `prompts/` — YAML frontmatter (2-space indent) + Handlebars body
- Variants: `*.v2.prompt` for iterative improvements before promoting to default
- `model:` in frontmatter sets the default picker in the eval UI

---

## CI pipeline

All checks run against `src/` only. Must pass before merge:

| Check | Command |
|---|---|
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint src --ext .ts` |
| `test:run` | `vitest run` (excludes e2e) |
| `build` | `tsc && cp -r src/locales dist/` |
| `format:check` | `prettier --check "src/**/*.ts"` |
| `check-pr-title` | PR title must start with `[SER-XX]` or `SER-XX` |

---

## Commit conventions

- Format: `type(scope): description` (conventional commits)
- **No** `[SER-XX]` prefix in local commits — commitlint rejects it
- The `[SER-XX]` prefix appears only in the squash merge commit title (PR title)

---

## Architecture constraints

- **No vendor lock-in:** avoid Firebase-specific features (Functions, Triggers)
- **Portability:** assume Docker container behind a reverse proxy
- **Config via env:** all external credentials and model selection through `process.env`
- **Schemas first:** define Zod schemas before implementing flows or tools
- **Error handling:** explicit error handling on all HTTP calls (check `res.ok` before `res.json()`)

---

## Path aliases

```json
"@/*"                    → "src/*"
"@serapeum/shared-schemas" → "packages/shared-schemas/src/index.ts"
```

Both tsconfig and vitest resolve these aliases.

---

## Genkit eval workflow

Datasets live in `.genkit/datasets/`. Add cases via the Genkit UI (localhost:4000) or by editing JSON directly. `index.json` tracks metadata.

Datasets:
- `router-cases` — 49 cases covering all 4 intents and multilingual inputs. Use with `npm run eval:compare -- --dataset router-cases --actions routerPrompt`.
- `extractor-cases` — 22 cases. Use with `npm run eval:compare -- --dataset extractor-cases --actions extractorPrompt`.
- `synthesizer-cases` — 13 cases (factual queries, franchise questions, multilingual). Evaluate via Genkit UI (no CLI scorer — free-form text).

---

## Linear + GitHub workflow

**Linear team:** Serapeum · **Project:** Serapeum API · **Identifier prefix:** `SER`

### Starting a new feature

1. Create a ticket in Linear (MCP or UI): assign to self, set state to `In Progress` when starting, project = Serapeum API.
2. Create a branch: `git checkout -b feat/<short-description>` (branch name does NOT need the SER-XX prefix).
3. Implement, commit with conventional commits (no `[SER-XX]` prefix — commitlint rejects it).
4. Create the PR: title **must** start with `[SER-XX]` (required by `check-pr-title` CI check). Body should include `Closes SER-XX`.
5. Move ticket to `In Review` when the PR is open.

### PR title format (enforced by CI)

```
[SER-XX] type(scope): description
```

### Available Linear states

| State | Type | Use when |
|---|---|---|
| Backlog | backlog | Not yet started |
| Todo | unstarted | Ready to pick up |
| In Progress | started | Actively working |
| In Review | started | PR open, awaiting review |
| Done | completed | PR merged |
| Canceled / Duplicate | canceled | — |

### Closing a feature

After merging:
```bash
# From main repo root (not inside a worktree)
git checkout main && git pull
git worktree remove .claude/worktrees/<branch>   # if a worktree was used
git branch -D <branch>
```
