import assert from 'node:assert/strict';
import test from 'node:test';
import { clientCompatMethods, handleClientCompatRpc } from '../server/client-compat-api.mjs';

test('client-compat-api handles new Desktop 1.2.3 / iOS 1.26.0 RPCs cleanly', async () => {
  const calls = [];
  const fakeHost = async (method, args) => {
    calls.push({ method, args });
    if (method === 'getAgentTranscriptWindow') {
      if (args.beforeSeq === 100) {
        return {
          hasMore: false,
          entries: [
            { id: 'e0', role: 'user', timestampMs: 500, text: 'Older ProkBot history hit' },
          ],
        };
      }
      return {
        hasMore: true,
        nextBeforeSeq: 100,
        entries: [
          { id: 'e1', role: 'user', timestampMs: 1000, text: 'hello world' },
          { id: 'e2', role: 'assistant', timestampMs: 2000, parts: [{ text: 'ProkBot status check complete' }] },
          { id: 'e3', kind: 'send-message', timestampMs: 3000, message: { type: 'text', content: 'ProkBot nested reply ok' } },
        ],
      };
    }
    if (method === 'searchAgents') return [{ id: 'a1', title: args.query }];
    if (method === 'searchMedia') return [{ id: 'm1', name: args.query }];
    if (method === 'runAgentAutomationNow') return { ok: true };
    throw new Error(`unexpected host call: ${method}`);
  };

  assert.equal(await handleClientCompatRpc('dismissAgentSuggestions', { agentId: 'a1', suggestionIds: ['s1'] }, fakeHost), null);
  assert.deepEqual(await handleClientCompatRpc('takeTeachLearningPrompts', {}, fakeHost), []);
  assert.equal(await handleClientCompatRpc('confirmTeachLearningPrompt', { agentId: 'a1', clientNonce: 'n1' }, fakeHost), null);
  assert.deepEqual(await handleClientCompatRpc('resolveSkillPublishTargets', {}, fakeHost), { targets: [] });
  assert.deepEqual(await handleClientCompatRpc('getServerAgentRoster', {}, fakeHost), { status: 'disabled' });
  assert.deepEqual(await handleClientCompatRpc('getMainAgent', {}, fakeHost), { agentId: null });
  assert.deepEqual(await handleClientCompatRpc('ensureDefaultMainAgent', {}, fakeHost), { agentId: null });
  assert.deepEqual(await handleClientCompatRpc('setMainAgent', { agentId: 'a1' }, fakeHost), { agentId: 'a1' });
  assert.deepEqual(await handleClientCompatRpc('resolveAgentCreation', {}, fakeHost), { kind: 'box' });
  assert.equal(await handleClientCompatRpc('restoreTemporalAgentRouting', {}, fakeHost), null);
  assert.equal(await handleClientCompatRpc('noteMountedAgent', { agentId: 'a1' }, fakeHost), null);
  assert.equal(await handleClientCompatRpc('noteTranscriptOpened', { agentId: 'a1' }, fakeHost), null);

  assert.deepEqual(
    await handleClientCompatRpc('searchMessages', { query: 'hello' }, fakeHost),
    { matches: [{ id: 'a1', title: 'hello' }], coverage: { kind: 'complete' } },
  );
  assert.deepEqual(
    await handleClientCompatRpc('searchFiles', { query: 'report.pdf' }, fakeHost),
    { matches: [{ id: 'm1', name: 'report.pdf' }], coverage: { kind: 'complete' } },
  );

  const rerun = await handleClientCompatRpc('rerunAutomationFromCard', { id: 'a1', automationId: 'auto-1', entryId: 'e9' }, fakeHost);
  assert.deepEqual(rerun, { ok: true, result: 'started', id: 'a1', automationId: 'auto-1' });
  assert.deepEqual(calls.at(-1), { method: 'runAgentAutomationNow', args: { id: 'a1', automationId: 'auto-1' } });

  const webhook = await handleClientCompatRpc('runAutomationWebhook', { id: 'a1', automationId: 'auto-2', context: 'ctx' }, fakeHost);
  assert.equal(webhook.ok, true);
  assert.equal(webhook.id, 'a1');
  assert.equal(webhook.automationId, 'auto-2');
  assert.match(webhook.runId, /^[0-9a-f-]{36}$/);

  const found = await handleClientCompatRpc('searchConversation', { agentId: 'a1', query: 'prokbot', limit: 10 }, fakeHost);
  assert.equal(found.isComplete, true);
  assert.equal(found.matches.length, 3);
  assert.equal(found.matches[0].entryId, 'e3');
  assert.match(found.matches[0].snippet, /ProkBot nested reply ok/);
  assert.equal(found.matches[1].entryId, 'e2');
  assert.equal(found.matches[1].role, 'assistant');
  assert.match(found.matches[1].snippet, /ProkBot status check/);
  assert.equal(found.matches[2].entryId, 'e0');
  assert.match(found.matches[2].snippet, /Older ProkBot history hit/);

  const limited = await handleClientCompatRpc('searchConversation', { agentId: 'a1', query: 'prokbot', limit: 1 }, fakeHost);
  assert.equal(limited.matches.length, 1);
  assert.equal(limited.isComplete, false);

  assert.ok(clientCompatMethods.has('searchConversation'));
  assert.ok(clientCompatMethods.has('searchMessages'));
  assert.ok(clientCompatMethods.has('searchFiles'));
  assert.ok(clientCompatMethods.has('rerunAutomationFromCard'));
  assert.ok(clientCompatMethods.has('runAutomationWebhook'));
  assert.ok(clientCompatMethods.has('setMainAgent'));
});
