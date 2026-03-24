import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { enableTelemetry } from 'genkit/tracing';

let initPromise: Promise<void> | null = null;
let processor: BatchSpanProcessor | null = null;

/**
 * Initializes Langfuse telemetry via OpenTelemetry if env vars are present.
 * Race-safe — concurrent calls share the same promise.
 * Only memoizes when credentials are available — retries if keys were absent.
 * Fails open — errors here must never break the server startup.
 */
export function initLangfuseTelemetry(): Promise<void> {
  if (initPromise) return initPromise;

  const publicKey = process.env['LANGFUSE_PUBLIC_KEY'];
  const secretKey = process.env['LANGFUSE_SECRET_KEY'];

  // Do not memoize when credentials are absent — allow retry once keys are set.
  if (!publicKey || !secretKey) return Promise.resolve();

  const host = process.env['LANGFUSE_HOST'] ?? 'https://cloud.langfuse.com';
  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

  initPromise = (async () => {
    let localProcessor: BatchSpanProcessor | null = null;
    try {
      localProcessor = new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${host}/api/public/otel/v1/traces`,
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        })
      );

      await enableTelemetry({ spanProcessors: [localProcessor] });
      processor = localProcessor; // publish only after successful init

      if (process.env['DEBUG']) {
        console.log(`[Telemetry] Langfuse tracing enabled → ${host}`);
      }
    } catch (err) {
      if (localProcessor) {
        try {
          await localProcessor.shutdown();
        } catch {
          // ignore shutdown errors during cleanup
        }
      }
      console.warn(
        '[Telemetry] Failed to initialize Langfuse telemetry:',
        err instanceof Error ? err.message : 'Unknown error'
      );
    } finally {
      if (!processor) initPromise = null; // allow retry only if init did not succeed
    }
  })();

  return initPromise;
}

/**
 * Flushes buffered spans and shuts down the telemetry processor.
 * Called automatically on SIGTERM via Genkit's own shutdown hook.
 * Exposed for explicit teardown in tests or custom shutdown sequences.
 */
export async function shutdownTelemetry(): Promise<void> {
  const current = processor;
  if (!current) return;

  try {
    await current.shutdown();
  } finally {
    processor = null;
    initPromise = null;
  }
}
