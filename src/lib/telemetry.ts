import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { enableTelemetry } from 'genkit/tracing';

let initPromise: Promise<void> | null = null;
let processor: BatchSpanProcessor | null = null;

/**
 * Initializes Langfuse telemetry via OpenTelemetry if env vars are present.
 * Idempotent and race-safe — concurrent calls share the same promise.
 * Fails open — errors here must never break the server startup.
 */
export function initLangfuseTelemetry(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const publicKey = process.env['LANGFUSE_PUBLIC_KEY'];
    const secretKey = process.env['LANGFUSE_SECRET_KEY'];

    if (!publicKey || !secretKey) return;

    const host = process.env['LANGFUSE_HOST'] ?? 'https://cloud.langfuse.com';
    const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

    try {
      processor = new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${host}/api/public/otel/v1/traces`,
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        })
      );

      await enableTelemetry({ spanProcessors: [processor] });

      if (process.env['DEBUG']) {
        console.log(`[Telemetry] Langfuse tracing enabled → ${host}`);
      }
    } catch (err) {
      initPromise = null; // allow retry on failure
      console.warn(
        '[Telemetry] Failed to initialize Langfuse telemetry:',
        err instanceof Error ? err.message : 'Unknown error'
      );
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
  if (processor) {
    await processor.shutdown();
    processor = null;
    initPromise = null;
  }
}
