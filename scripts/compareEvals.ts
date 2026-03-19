/**
 * Eval Comparison Tool
 *
 * Compares two or more Genkit evaluation runs side by side.
 * Reads the metricSummaries already computed by Genkit and prints a table.
 *
 * Run with:
 *   npm run compare:evals -- .genkit/evals/<id1>.json .genkit/evals/<id2>.json
 *
 * Or compare all evals for a specific dataset:
 *   npm run compare:evals -- --dataset router-cases
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

const EVALS_DIR = resolve('.genkit/evals');
const TRACES_DIR = resolve('.genkit/traces');
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

type MetricSummary = {
  evaluator: string;
  testCaseCount: number;
  errorCount: number;
  scoreUndefinedCount: number;
  averageScore: number;
};

type EvalKey = {
  evalRunId: string;
  createdAt: string;
  metricSummaries: MetricSummary[];
  datasetId: string;
  datasetVersion: number;
  actionRef: string;
};

type EvalResult = {
  traceIds?: string[];
  metrics?: { evaluator: string; score: number; traceId?: string }[];
};

type EvalFile = {
  key: EvalKey;
  results: EvalResult[];
};

type TraceSpan = {
  attributes?: Record<string, string>;
};

type TraceFile = {
  spans?: Record<string, TraceSpan>;
};

function extractModelFromTrace(traceId: string): string {
  try {
    const tracePath = join(TRACES_DIR, traceId);
    if (!existsSync(tracePath)) return 'unknown';
    const trace = JSON.parse(readFileSync(tracePath, 'utf-8')) as TraceFile;
    for (const span of Object.values(trace.spans ?? {})) {
      const output = span.attributes?.['genkit:output'];
      if (output && output.includes('"model"')) {
        const match = output.match(/"model":"([^"]+)"/);
        if (match) return match[1];
      }
    }
  } catch {
    // ignore
  }
  return 'unknown';
}

function getModelForEval(evalFile: EvalFile): string {
  // Try the prompt trace (first result's traceId)
  for (const result of evalFile.results) {
    if (result.traceIds?.[0]) {
      const model = extractModelFromTrace(result.traceIds[0]);
      if (model !== 'unknown') return model;
    }
  }
  return 'unknown';
}

function loadEval(filePath: string): EvalFile {
  const raw = readFileSync(resolve(filePath), 'utf-8');
  return JSON.parse(raw) as EvalFile;
}

function scoreColor(score: number): string {
  if (score >= 0.8) return GREEN;
  if (score >= 0.5) return YELLOW;
  return RED;
}

function formatScore(
  score: number | undefined,
  errorCount: number,
  undefinedCount: number
): string {
  if (score === undefined) return `${DIM}  N/A  ${RESET}`;
  const pct = (score * 100).toFixed(1).padStart(5);
  const color = scoreColor(score);
  const flags =
    errorCount > 0
      ? ` ${RED}(${errorCount} err)${RESET}`
      : undefinedCount > 0
        ? ` ${DIM}(${undefinedCount} undef)${RESET}`
        : '';
  return `${color}${pct}%${RESET}${flags}`;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function findEvalsByDataset(datasetId: string): string[] {
  const files = readdirSync(EVALS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(EVALS_DIR, f));

  return files.filter((f) => {
    try {
      const d = JSON.parse(readFileSync(f, 'utf-8')) as EvalFile;
      return d.key?.datasetId === datasetId;
    } catch {
      return false;
    }
  });
}

function main() {
  const args = process.argv.slice(2);

  let filePaths: string[] = [];

  const datasetFlagIdx = args.indexOf('--dataset');
  if (datasetFlagIdx !== -1) {
    const datasetId = args[datasetFlagIdx + 1];
    if (!datasetId) {
      console.error('--dataset requires a dataset name (e.g. router-cases)');
      process.exit(1);
    }
    filePaths = findEvalsByDataset(datasetId);
    if (filePaths.length === 0) {
      console.error(`No eval files found for dataset "${datasetId}" in ${EVALS_DIR}`);
      process.exit(1);
    }
  } else {
    filePaths = args;
  }

  if (filePaths.length < 2) {
    console.error(
      'Usage:\n' +
        '  npm run compare:evals -- <file1.json> <file2.json> [...]\n' +
        '  npm run compare:evals -- --dataset router-cases'
    );
    process.exit(1);
  }

  const evals = filePaths.map(loadEval);

  // Sort by createdAt ascending
  evals.sort((a, b) => new Date(a.key.createdAt).getTime() - new Date(b.key.createdAt).getTime());

  // Collect all metric names across all evals
  const allMetrics = [
    ...new Set(
      evals.flatMap((e) => e.key.metricSummaries.map((m) => m.evaluator.replace('/evaluator/', '')))
    ),
  ];

  // Header
  console.log('\n' + BOLD + '=== Eval Comparison ===' + RESET);

  // Column widths
  const metricWidth = Math.max(30, ...allMetrics.map((m) => m.length));
  const colWidth = 22;

  // Extract model for each eval (read from traces)
  const models = evals.map((e) => getModelForEval(e));

  // Print run headers
  const headerLine =
    ' '.repeat(metricWidth + 2) +
    evals
      .map((e) => {
        const label = `${shortId(e.key.evalRunId)} | ${e.key.actionRef.replace('/flow/', '').replace('/executable-prompt/', '').slice(0, 12)}`;
        return label.padEnd(colWidth);
      })
      .join('  ');
  console.log(BOLD + headerLine + RESET);

  const modelLine =
    ' '.repeat(metricWidth + 2) +
    models
      .map((m) => {
        return BOLD + m.slice(0, colWidth).padEnd(colWidth) + RESET;
      })
      .join('  ');
  console.log(modelLine);

  const subHeaderLine =
    ' '.repeat(metricWidth + 2) +
    evals
      .map((e) => {
        const date = new Date(e.key.createdAt).toLocaleString('es-ES', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        return DIM + date.padEnd(colWidth) + RESET;
      })
      .join('  ');
  console.log(subHeaderLine);

  const datasetLine =
    ' '.repeat(metricWidth + 2) +
    evals
      .map((e) => {
        return DIM + `dataset: ${e.key.datasetId}`.padEnd(colWidth) + RESET;
      })
      .join('  ');
  console.log(datasetLine);

  console.log(DIM + '-'.repeat(metricWidth + 2 + evals.length * (colWidth + 2)) + RESET);

  // Print scores per metric
  for (const metric of allMetrics) {
    const row =
      metric.padEnd(metricWidth) +
      '  ' +
      evals
        .map((e) => {
          const summary = e.key.metricSummaries.find(
            (m) => m.evaluator.replace('/evaluator/', '') === metric
          );
          if (!summary) return DIM + '  -'.padEnd(colWidth) + RESET;
          return formatScore(
            summary.averageScore,
            summary.errorCount,
            summary.scoreUndefinedCount
          ).padEnd(colWidth + 15); // +15 for ANSI codes
        })
        .join('  ');
    console.log(row);
  }

  // Total cases
  console.log(DIM + '-'.repeat(metricWidth + 2 + evals.length * (colWidth + 2)) + RESET);
  const casesRow =
    'Total cases'.padEnd(metricWidth) +
    '  ' +
    evals
      .map((e) => {
        const count = e.key.metricSummaries[0]?.testCaseCount ?? e.results.length;
        return String(count).padEnd(colWidth);
      })
      .join('  ');
  console.log(DIM + casesRow + RESET);

  console.log();
}

main();
