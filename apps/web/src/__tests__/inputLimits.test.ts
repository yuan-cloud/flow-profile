import { describe, expect, it } from 'vitest';
import { parseJsonSafe } from '../utils/errorHandling';
import { buildResultFromInput } from '../workers/buildResult';

describe('worker input resource contract', () => {
  it('uses resource preflight on the uploader/worker JSON path', () => {
    const refused = parseJsonSafe('['.repeat(65));
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.message).toContain('resource limits');
    expect(parseJsonSafe('[{"id":"n","type":"debug","name":"Safe label"}]')).toEqual({
      ok: true,
      value: [{ id: 'n', type: 'debug', name: 'Safe label' }],
    });
  });
  it('rejects over-deep metadata before redaction or progress processing', () => {
    let payload: unknown = null;
    for (let i = 0; i < 65; i++) payload = { child: payload };
    const progress: string[] = [];
    expect(() =>
      buildResultFromInput([{ id: 'n', type: 'debug', payload }], {}, (phase) =>
        progress.push(phase),
      ),
    ).toThrow('resource limits');
    expect(progress).toEqual([]);
  });

  it('rejects oversized custom arrays without reading their contents', () => {
    const payload = new Array(50_001);
    Object.defineProperty(payload, 0, {
      get() {
        throw new Error('custom array contents were evaluated');
      },
    });
    expect(() => buildResultFromInput([{ id: 'n', type: 'debug', payload }])).toThrow(
      'resource limits',
    );
  });
});
