import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { feedbackFlow } from '@/flows/feedback/feedbackFlow.js';

vi.mock('@/lib/ai.js', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai.js')>('@/lib/ai.js');
  return {
    ...actual,
    ai: {
      ...actual.ai,
      defineFlow: (_config: unknown, fn: (...args: unknown[]) => unknown) => fn,
    },
  };
});

const validInput = { traceId: 'abc123', score: 1 as const };

describe('feedbackFlow', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env['LANGFUSE_PUBLIC_KEY'] = 'pk-test';
    process.env['LANGFUSE_SECRET_KEY'] = 'sk-test';
    process.env['LANGFUSE_HOST'] = 'https://cloud.langfuse.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns {} on successful score submission', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));

    const result = await feedbackFlow(validInput);
    expect(result).toEqual({});
  });

  it('sends correct payload to Langfuse', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await feedbackFlow({ traceId: 'trace-1', score: 0, comment: 'not helpful' });

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://cloud.langfuse.com/api/public/scores');
    expect(JSON.parse(options.body as string)).toMatchObject({
      traceId: 'trace-1',
      name: 'user-feedback',
      value: 0,
      dataType: 'NUMERIC',
      comment: 'not helpful',
    });
  });

  it('omits comment from payload when not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await feedbackFlow(validInput);

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body).not.toHaveProperty('comment');
  });

  it('throws UNAVAILABLE when Langfuse is not configured', async () => {
    delete process.env['LANGFUSE_PUBLIC_KEY'];

    await expect(feedbackFlow(validInput)).rejects.toMatchObject({
      status: 'UNAVAILABLE',
    });
  });

  it('throws INTERNAL when Langfuse returns a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad traceId'),
      } as unknown as Response)
    );

    await expect(feedbackFlow(validInput)).rejects.toMatchObject({
      status: 'INTERNAL',
    });
  });

  it('strips trailing slash from LANGFUSE_HOST', async () => {
    process.env['LANGFUSE_HOST'] = 'https://eu.cloud.langfuse.com/';
    const mockFetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await feedbackFlow(validInput);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://eu.cloud.langfuse.com/api/public/scores');
  });
});
