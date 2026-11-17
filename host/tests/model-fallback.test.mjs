import assert from 'node:assert/strict';
import test from 'node:test';
import { createModelSession } from '../runtime/model-session.mjs';
import { ModelRequestError } from '../runtime/model-common.mjs';
import { createHarnessModelErrorMapper } from '../runtime/model-errors.mjs';

const done = text => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`);
const exhausted = () => new Response(JSON.stringify({ error: { message: 'API key quota exhausted', code: 'API_KEY_QUOTA_EXHAUSTED' } }), { status: 429 });

function session(fetchImpl, selectRequest, onFallback = async () => {}) {
  return createModelSession({ baseUrl: 'https://primary.example/v1', apiKey: 'primary-key', model: 'primary',
    fetchImpl, selectRequest, onFallback, idleTimeoutMs: 1_000 });
}

test('an exhausted primary switches only to a fallback with independent credentials', async () => {
  const requests = [], fallbacks = [];
  const model = session(async (url, options) => {
    requests.push([url, JSON.parse(options.body).model, options.headers.get('authorization')]);
    return requests.length === 1 ? exhausted() : done('recovered');
  }, () => ({ model: 'primary', fallbacks: [{ baseUrl: 'https://backup.example/v1', apiKey: 'backup-key',
    apiFormat: 'openai', model: 'backup', providerId: 'backup' }] }), event => fallbacks.push(event));
  const result = model.getExecutor([{ role: 'user', content: 'hello' }]).stream({}, 'test', []);
  const parts = await Array.fromAsync(result.fullStream);
  assert.deepEqual(parts.filter(part => part.type === 'text-delta').map(part => part.textDelta), ['recovered']);
  assert.deepEqual(requests, [
    ['https://primary.example/v1/chat/completions', 'primary', 'Bearer primary-key'],
    ['https://backup.example/v1/chat/completions', 'backup', 'Bearer backup-key'],
  ]);
  assert.equal(fallbacks.length, 1);
  assert.equal(fallbacks[0].reason, 'HTTP 429');
});

test('an exhausted primary does not retry a fallback sharing its API key', async () => {
  let requests = 0;
  const model = session(async () => { requests++; return exhausted(); }, () => ({ model: 'primary', fallbacks: [
    { baseUrl: 'https://another-gateway.example/v1', apiKey: 'primary-key', apiFormat: 'openai', model: 'other' },
  ] }));
  const result = model.getExecutor([{ role: 'user', content: 'hello' }]).stream({}, 'test', []);
  await assert.rejects(Array.fromAsync(result.fullStream), error => {
    assert.equal(error.status, 429);
    assert.equal(error.code, 'API_KEY_QUOTA_EXHAUSTED');
    return true;
  });
  assert.equal(requests, 1);
});

test('quota exhaustion maps to a non-retryable Harness error after all routes fail', () => {
  class ConnectError extends Error {}
  class ActionRequiredError extends Error {}
  class NonRetriableError extends Error {
    constructor(message, options) { super(message, options); this.displayInfo = options.displayInfo; }
  }
  const map = createHarnessModelErrorMapper({ ConnectError, ActionRequiredError, NonRetriableError,
    Code: { ResourceExhausted: 8, Unavailable: 14, Internal: 13 } });
  const mapped = map(new ModelRequestError('API key quota exhausted', { status: 429, code: 'API_KEY_QUOTA_EXHAUSTED' }));
  assert.ok(mapped instanceof NonRetriableError);
  assert.equal(mapped.displayInfo.isRetryable, false);
});
