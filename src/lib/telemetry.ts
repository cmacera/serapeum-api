import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { enableTelemetry } from 'genkit/tracing';

/**
 * Initializes Langfuse telemetry via OpenTelemetry if env vars are present.
 * Fails open — errors here must never break the server startup.
 */
export async function initLangfuseTelemetry(): Promise<void> {
  const publicKey = process.env['LANGFUSE_PUBLIC_KEY'];
  const secretKey = process.env['LANGFUSE_SECRET_KEY'];

  if (!publicKey || !secretKey) return;

  const host = process.env['LANGFUSE_HOST'] ?? 'https://cloud.langfuse.com';
  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');

  try {
    await enableTelemetry({
      spanProcessors: [
        new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: `${host}/api/public/otel/v1/traces`,
            headers: {
              Authorization: `Basic ${credentials}`,
            },
          })
        ),
      ],
    });

    if (process.env['DEBUG']) {
      console.log(`[Telemetry] Langfuse tracing enabled → ${host}`);
    }
  } catch (err) {
    console.warn('[Telemetry] Failed to initialize Langfuse telemetry:', err);
  }
}
