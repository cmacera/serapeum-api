import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { enableTelemetry } from 'genkit/tracing';

let initialized = false;
let processor: BatchSpanProcessor | null = null;

/**
 * Initializes Langfuse telemetry via OpenTelemetry if env vars are present.
 * Idempotent — subsequent calls are no-ops.
 * Fails open — errors here must never break the server startup.
 */
export async function initLangfuseTelemetry(): Promise<void> {
  if (initialized) return;

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
    initialized = true;

    if (process.env['DEBUG']) {
      console.log(`[Telemetry] Langfuse tracing enabled → ${host}`);
    }
  } catch (err) {
    console.warn('[Telemetry] Failed to initialize Langfuse telemetry:', err);
  }
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
    initialized = false;
  }
}
