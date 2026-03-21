/**
 * Automated Eval Runner & Comparison Tool
 *
 * Runs a dataset against multiple prompt variants and models, saves results to
 * .genkit/evals/ (visible in the Genkit UI), and prints a side-by-side table.
 *
 * Usage:
 *   npm run eval:compare -- --dataset router-cases --actions routerPrompt,routerPrompt.v2 --models ollama/qwen3:14b,ollama/gpt-oss:20b
 *   npm run eval:compare -- --dataset extractor-cases --actions extractorPrompt,extractorPrompt.v2
 *
 * Defaults (when flags are omitted):
 *   --dataset   router-cases
 *   --actions   routerPrompt,routerPrompt.v2
 *   --models    value of OLLAMA_MODEL env var  (falls back to qwen3:14b)
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, basename } from 'path';
import { randomUUID } from 'crypto';

// Import ai AFTER dotenv so env vars are available for plugin init
import { ai } from '../src/lib/ai.js';
// Register dotprompt schemas for all prompts in the prompts/ directory
import '../src/prompts/routerPrompt.js';
import '../src/prompts/extractorPrompt.js';
import '../src/prompts/synthesizerPrompt.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type TestCase = {
  testCaseId: string;
  input: Record<string, unknown>;
  reference: Record<string, unknown>;
};

type CaseResult = {
  testCaseId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  reference: Record<string, unknown>;
  score: number;
  rationale: string;
};

type RunSummary = {
  action: string;
  model: string;
  scores: number[];
  results: CaseResult[];
  evalRunId: string;
  createdAt: string;
  datasetId: string;
  datasetVersion: number;
  evaluatorName: string;
};

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

function colored(score: number): string {
  const pct = (score * 100).toFixed(1).padStart(5);
  const c = score >= 0.9 ? GREEN : score >= 0.6 ? YELLOW : RED;
  return `${c}${pct}%${RESET}`;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreRouter(output: Record<string, unknown>, reference: Record<string, unknown>) {
  const intentOk = output['intent'] === reference['intent'];
  const isOOS = reference['intent'] === 'OUT_OF_SCOPE';
  const catOk = !isOOS && output['category'] === reference['category'];
  const score = intentOk ? (isOOS || catOk ? 1.0 : 0.5) : 0.0;
  const catNote = isOOS
    ? 'category N/A'
    : `category: ${output['category']} vs ${reference['category']} (${catOk ? '✓' : '✗'})`;
  return {
    score,
    rationale: `intent: ${output['intent']} vs ${reference['intent']} (${intentOk ? '✓' : '✗'}) | ${catNote}`,
  };
}

function computeF1(predicted: string[], reference: string[]): number {
  if (predicted.length === 0 && reference.length === 0) return 1;
  if (predicted.length === 0 || reference.length === 0) return 0;
  const normPred = [...new Set(predicted.map((t) => t.toLowerCase().trim()))];
  const normRef = [...new Set(reference.map((t) => t.toLowerCase().trim()))];
  const tp = normPred.filter((t) => normRef.includes(t)).length;
  const prec = tp / normPred.length;
  const rec = tp / normRef.length;
  if (prec + rec === 0) return 0;
  return (2 * prec * rec) / (prec + rec);
}

function scoreExtractor(output: Record<string, unknown>, reference: Record<string, unknown>) {
  const predicted = (output['titles'] as string[] | undefined) ?? [];
  const expected = (reference['titles'] as string[] | undefined) ?? [];
  const score = computeF1(predicted, expected);
  return {
    score,
    rationale: `predicted: [${predicted.join(', ') || '(none)'}] | expected: [${expected.join(', ') || '(none)'}] | F1: ${score.toFixed(2)}`,
  };
}

function getScorer(datasetId: string) {
  if (datasetId.startsWith('router'))
    return { fn: scoreRouter, evaluator: 'router/classification' };
  if (datasetId.startsWith('extractor'))
    return { fn: scoreExtractor, evaluator: 'extractor/precision' };
  return null;
}

// ─── Prompt runner ────────────────────────────────────────────────────────────

function parseAction(action: string): { name: string; variant?: string } {
  const parts = action.split('.');
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 1]) {
    // e.g. "routerPrompt.v2" → name=routerPrompt, variant=v2
    const variant = parts.slice(1).join('.');
    return { name: parts[0], variant };
  }
  return { name: action };
}

async function runPrompt(
  action: string,
  model: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { name, variant } = parseAction(action);
  const promptFn = ai.prompt(name, variant ? { variant } : undefined);
  const result = await promptFn(input, { model });
  // Prefer structured output (Genkit parses output schema, strips thinking tokens)
  if (
    result?.output !== null &&
    result?.output !== undefined &&
    typeof result.output === 'object'
  ) {
    return result.output as Record<string, unknown>;
  }
  // Fallback: extract JSON from raw text (models without thinking tokens)
  const text = result?.message?.content?.[0]?.text ?? result?.text ?? '';
  if (typeof text === 'string' && text.trim().startsWith('{')) {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  return {};
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const EVALS_DIR = resolve('.genkit/evals');
const DATASETS_DIR = resolve('.genkit/datasets');

function saveEvalRun(summary: RunSummary): void {
  if (!existsSync(EVALS_DIR)) mkdirSync(EVALS_DIR, { recursive: true });

  const modelRef = `/model/${summary.model}`;
  const actionRef = `/executable-prompt/${summary.action}`;
  const avg = summary.scores.reduce((a, b) => a + b, 0) / (summary.scores.length || 1);

  const key = {
    evalRunId: summary.evalRunId,
    createdAt: summary.createdAt,
    metricSummaries: [
      {
        evaluator: `/evaluator/${summary.evaluatorName}`,
        testCaseCount: summary.scores.length,
        errorCount: 0,
        scoreUndefinedCount: 0,
        statusDistribution: { undefined: summary.scores.length },
        averageScore: avg,
      },
    ],
    metricsMetadata: {
      [summary.evaluatorName]: {
        displayName:
          summary.evaluatorName === 'router/classification'
            ? 'Router Classification Accuracy'
            : 'Extractor Title Precision',
        definition:
          summary.evaluatorName === 'router/classification'
            ? 'Measures accuracy of intent and category classification. Score: 1 = both correct, 0.5 = intent correct only, 0 = intent wrong.'
            : 'Measures title extraction quality using F1 score (0–1). Normalises titles to lowercase before comparison.',
      },
    },
    datasetId: summary.datasetId,
    datasetVersion: summary.datasetVersion,
    actionRef,
    actionConfig: { model: modelRef },
  };

  const evalFile = {
    key,
    results: summary.results.map((r) => ({
      testCaseId: r.testCaseId,
      input: r.input,
      output: {
        message: { role: 'model', content: [{ text: JSON.stringify(r.output) }] },
        finishReason: 'stop',
      },
      context: [],
      reference: r.reference,
      evalMetrics: [
        {
          evaluator: `/evaluator/${summary.evaluatorName}`,
          score: r.score,
          rationale: r.rationale,
        },
      ],
    })),
  };

  // Write individual eval file
  writeFileSync(join(EVALS_DIR, `${summary.evalRunId}.json`), JSON.stringify(evalFile, null, 2));

  // Update index.json
  const indexPath = join(EVALS_DIR, 'index.json');
  const index = existsSync(indexPath)
    ? (JSON.parse(readFileSync(indexPath, 'utf-8')) as Record<string, unknown>)
    : {};
  index[summary.evalRunId] = key;
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

// ─── Comparison table ─────────────────────────────────────────────────────────

function printTable(runs: RunSummary[]): void {
  const COL = 18;
  const LABEL = 42;

  console.log('\n' + BOLD + '=== Eval Results ===' + RESET);

  // Header row: action + model
  const header =
    ' '.repeat(LABEL + 2) +
    runs
      .map((r) => {
        const { name, variant } = parseAction(r.action);
        const label = variant ? `${name}.${CYAN}${variant}${RESET}` : name;
        return (label + RESET).padEnd(COL + 20);
      })
      .join('  ');
  console.log(BOLD + header + RESET);

  const modelRow =
    ' '.repeat(LABEL + 2) +
    runs.map((r) => DIM + r.model.slice(0, COL).padEnd(COL) + RESET).join('  ');
  console.log(modelRow);

  console.log(DIM + '-'.repeat(LABEL + 2 + runs.length * (COL + 2)) + RESET);

  // Per-case rows
  const caseIds = runs[0]?.results.map((r) => r.testCaseId) ?? [];
  for (const caseId of caseIds) {
    const first = runs[0]?.results.find((r) => r.testCaseId === caseId);
    const queryLabel = (first?.input?.query as string | undefined) ?? caseId;
    const row =
      queryLabel.slice(0, LABEL).padEnd(LABEL) +
      '  ' +
      runs
        .map((run) => {
          const res = run.results.find((r) => r.testCaseId === caseId);
          if (!res) return DIM + '  -'.padEnd(COL) + RESET;
          return colored(res.score).padEnd(COL + 15);
        })
        .join('  ');
    console.log(row);
  }

  console.log(DIM + '-'.repeat(LABEL + 2 + runs.length * (COL + 2)) + RESET);

  // Summary row
  const summaryRow =
    BOLD +
    'Average'.padEnd(LABEL) +
    RESET +
    '  ' +
    runs
      .map((r) => {
        const avg = r.scores.reduce((a, b) => a + b, 0) / (r.scores.length || 1);
        return colored(avg).padEnd(COL + 15);
      })
      .join('  ');
  console.log(summaryRow);

  const perfectRow =
    'Perfect (1.0)'.padEnd(LABEL) +
    '  ' +
    runs
      .map((r) => {
        const perfect = r.scores.filter((s) => s === 1).length;
        return `${perfect}/${r.scores.length}`.padEnd(COL);
      })
      .join('  ');
  console.log(DIM + perfectRow + RESET);

  console.log();
}

// ─── CLI arg parsing ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, def: string): string => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : def;
  };

  const defaultModel = process.env['OLLAMA_MODEL'] ?? 'qwen3:14b';
  const dataset = get('--dataset', 'router-cases');
  const defaultActions = dataset.startsWith('extractor')
    ? 'extractorPrompt,extractorPrompt.v2'
    : 'routerPrompt,routerPrompt.v2';
  const actions = get('--actions', defaultActions)
    .split(',')
    .map((s) => s.trim());
  const models = get('--models', `ollama/${defaultModel}`)
    .split(',')
    .map((s) => s.trim());
  const concurrency = parseInt(get('--concurrency', '1'), 10);

  return { dataset, actions, models, concurrency };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { dataset, actions, models, concurrency } = parseArgs();

  // Load dataset
  const datasetPath = join(DATASETS_DIR, `${dataset}.json`);
  if (!existsSync(datasetPath)) {
    console.error(`Dataset not found: ${datasetPath}`);
    process.exit(1);
  }
  const cases = JSON.parse(readFileSync(datasetPath, 'utf-8')) as TestCase[];

  // Get dataset version from index
  const indexPath = join(DATASETS_DIR, 'index.json');
  const datasetIndex = existsSync(indexPath)
    ? (JSON.parse(readFileSync(indexPath, 'utf-8')) as Record<string, { version: number }>)
    : {};
  const datasetVersion = datasetIndex[dataset]?.version ?? 1;

  const scorer = getScorer(dataset);
  if (!scorer) {
    console.warn(`No evaluator defined for dataset "${dataset}". Scores will be 0.`);
  }

  // Build all (action, model) combinations
  const combos = actions.flatMap((action) => models.map((model) => ({ action, model })));

  console.log(
    `\n${BOLD}Running ${combos.length} eval combination(s) on ${cases.length} cases each...${RESET}`
  );
  console.log(`  dataset: ${CYAN}${dataset}${RESET}`);
  console.log(`  actions: ${actions.join(', ')}`);
  console.log(`  models:  ${models.join(', ')}\n`);

  // Execute — sequentially or with limited concurrency
  const allRuns: RunSummary[] = [];

  const execute = async (combo: { action: string; model: string }): Promise<RunSummary> => {
    const tag = `${combo.action} / ${combo.model.replace('ollama/', '')}`;
    const total = cases.length;
    const startMs = Date.now();
    process.stdout.write(`  Running ${tag}... [0/${total}]`);

    const caseResults: CaseResult[] = [];
    let errors = 0;

    for (const tc of cases) {
      try {
        const output = await runPrompt(combo.action, combo.model, tc.input);
        const { score, rationale } = scorer
          ? scorer.fn(output, tc.reference)
          : { score: 0, rationale: 'no scorer' };
        caseResults.push({
          testCaseId: tc.testCaseId,
          input: tc.input,
          output,
          reference: tc.reference,
          score,
          rationale,
        });
      } catch (err) {
        errors++;
        caseResults.push({
          testCaseId: tc.testCaseId,
          input: tc.input,
          output: {},
          reference: tc.reference,
          score: 0,
          rationale: `Error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      process.stdout.write(`\r  Running ${tag}... [${caseResults.length}/${total}] ${elapsed}s`);
    }

    const scores = caseResults.map((r) => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const perfect = scores.filter((s) => s === 1).length;
    const totalSec = ((Date.now() - startMs) / 1000).toFixed(1);

    process.stdout.write(
      `\r  Running ${tag}... ${colored(avg)} (${perfect}/${scores.length} perfect${errors ? `, ${errors} errors` : ''}) ${DIM}${totalSec}s${RESET}\n`
    );

    const summary: RunSummary = {
      action: combo.action,
      model: combo.model,
      scores,
      results: caseResults,
      evalRunId: randomUUID(),
      createdAt: new Date().toISOString(),
      datasetId: dataset,
      datasetVersion,
      evaluatorName: scorer?.evaluator ?? 'unknown',
    };

    saveEvalRun(summary);
    return summary;
  };

  // Run with concurrency limit
  for (let i = 0; i < combos.length; i += concurrency) {
    const batch = combos.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(execute));
    allRuns.push(...results);
  }

  printTable(allRuns);

  console.log(DIM + `Results saved to .genkit/evals/ (${allRuns.length} runs)\n` + RESET);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
