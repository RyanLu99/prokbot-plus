import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MainAgentStore,
  clientCompatMethods,
  handleClientCompatRpc,
} from '../server/client-compat-api.mjs';
import { HttpError } from '../server/security.mjs';

test('client-compat-api handles official d0a4baa shapes, pagination, errors, automations, and MainAgentStore', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'grokbot-compat-'));
  try {
    const mainAgentStore = await new MainAgentStore(dir).load();
    const calls = [];
    const fakeHost = async (method, args) => {
      calls.push({ method, args });
      if (method === 'getAgentTranscriptWindow') {
        // Official d0a4baa returns { entries, nextBeforeSeq, threadCounts } — NO hasMore field.
        if (args.beforeSeq === 100) {
          return {
            entries: [
              { id: 'e0', seq: 50, role: 'user', timestampMs: 500, text: 'Older ProkBot history hit' },
            ],
            threadCounts: {},
          };
        }
        return {
          nextBeforeSeq: 100,
          entries: [
            { id: 'e1', seq: 101, role: 'user', timestampMs: 1000, text: 'hello world' },
            { id: 'e2', seq: 102, role: 'assistant', timestampMs: 2000, parts: [{ text: 'ProkBot status check complete' }] },
            { id: 'e3', seq: 103, kind: 'send-message', timestampMs: 3000, message: { type: 'text', content: 'ProkBot nested reply ok' } },
          ],
          threadCounts: {},
        };
      }
      if (method === 'listAgents') {
        return [{ id: 'a1b2c3', name: 'Main Bot', isHiddenFromSidebar: false }];
      }
      if (method === 'searchAgents') {
        return [
          { id: 'a1', title: args.query },
          { id: 'a2', title: args.query },
          { id: 'a3', title: args.query },
        ];
      }
      if (method === 'searchMedia') {
        return [
          { id: 'm1', name: args.query },
          { id: 'm2', name: args.query },
        ];
      }
      if (method === 'getAgentAutomations') {
        return [{ id: 'auto-1', name: 'Daily digest' }];
      }
      if (method === 'runAgentAutomationNow') return { ok: true };
      throw new Error(`unexpected host call: ${method}`);
    };

    assert.equal(await handleClientCompatRpc('dismissAgentSuggestions', { agentId: 'a1', suggestionIds: ['s1'] }, fakeHost), null);
    assert.deepEqual(await handleClientCompatRpc('takeTeachLearningPrompts', {}, fakeHost), []);
    assert.equal(await handleClientCompatRpc('confirmTeachLearningPrompt', { agentId: 'a1', clientNonce: 'n1' }, fakeHost), null);
    assert.deepEqual(await handleClientCompatRpc('resolveSkillPublishTargets', {}, fakeHost), { targets: [] });
    assert.deepEqual(await handleClientCompatRpc('getServerAgentRoster', {}, fakeHost), { status: 'disabled' });
    assert.deepEqual(await handleClientCompatRpc('resolveAgentCreation', {}, fakeHost), { kind: 'box' });
    assert.equal(await handleClientCompatRpc('restoreTemporalAgentRouting', {}, fakeHost), null);
    assert.equal(await handleClientCompatRpc('noteMountedAgent', { agentId: 'a1' }, fakeHost), null);
    assert.equal(await handleClientCompatRpc('noteTranscriptOpened', { agentId: 'a1' }, fakeHost), null);

    // MainAgentStore persistence + compliant ensureDefaultMainAgent outcome
    assert.deepEqual(await handleClientCompatRpc('getMainAgent', {}, fakeHost, { mainAgentStore }), { agentId: null });
    assert.deepEqual(
      await handleClientCompatRpc('ensureDefaultMainAgent', {}, fakeHost, { mainAgentStore }),
      { outcome: 'present', agentId: 'a1b2c3' },
    );
    assert.deepEqual(
      await handleClientCompatRpc('setMainAgent', { agentId: 'a1b2c3' }, fakeHost, { mainAgentStore }),
      { agentId: 'a1b2c3' },
    );
    assert.deepEqual(await handleClientCompatRpc('getMainAgent', {}, fakeHost, { mainAgentStore }), { agentId: 'a1b2c3' });
    assert.deepEqual(
      await handleClientCompatRpc('ensureDefaultMainAgent', {}, fakeHost, { mainAgentStore }),
      { outcome: 'hasMainAgent', agentId: 'a1b2c3' },
    );
    const reloaded = await new MainAgentStore(dir).load();
    assert.equal(reloaded.get(), 'a1b2c3');

    // Invalid agentId rejected cleanly
    await assert.rejects(
      () => handleClientCompatRpc('searchConversation', { agentId: '../etc/passwd', query: 'x' }, fakeHost),
      err => err instanceof HttpError && err.status === 400,
    );
    await assert.rejects(
      () => handleClientCompatRpc('setMainAgent', { agentId: 'not valid!' }, fakeHost, { mainAgentStore }),
      err => err instanceof HttpError && err.status === 400,
    );

    // searchMessages / searchFiles honor limit and continuation
    const msgPage1 = await handleClientCompatRpc('searchMessages', { query: 'hello', limit: 2 }, fakeHost);
    assert.deepEqual(msgPage1, {
      matches: [{ id: 'a1', title: 'hello' }, { id: 'a2', title: 'hello' }],
      coverage: { kind: 'partial' },
      continuation: '2',
    });
    const msgPage2 = await handleClientCompatRpc(
      'searchMessages',
      { query: 'hello', limit: 2, continuation: msgPage1.continuation },
      fakeHost,
    );
    assert.deepEqual(msgPage2, {
      matches: [{ id: 'a3', title: 'hello' }],
      coverage: { kind: 'complete' },
    });
    assert.deepEqual(
      await handleClientCompatRpc('searchFiles', { query: 'report.pdf', limit: 1 }, fakeHost),
      { matches: [{ id: 'm1', name: 'report.pdf' }], coverage: { kind: 'partial' }, continuation: '1' },
    );

    // Automations verify existence via getAgentAutomations; webhook returns not_offered without fake runId
    const rerun = await handleClientCompatRpc('rerunAutomationFromCard', { id: 'a1', automationId: 'auto-1', entryId: 'e9' }, fakeHost);
    assert.deepEqual(rerun, { ok: true, result: 'started', id: 'a1', automationId: 'auto-1' });
    assert.deepEqual(calls.at(-1), { method: 'runAgentAutomationNow', args: { id: 'a1', automationId: 'auto-1' } });

    const missingRerun = await handleClientCompatRpc('rerunAutomationFromCard', { id: 'a1', automationId: 'missing-auto' }, fakeHost);
    assert.deepEqual(missingRerun, { ok: false, result: 'not_offered', id: 'a1', automationId: 'missing-auto' });

    const webhook = await handleClientCompatRpc('runAutomationWebhook', { id: 'a1', automationId: 'auto-1', context: 'ctx' }, fakeHost);
    assert.deepEqual(webhook, { ok: false, result: 'not_offered', id: 'a1', automationId: 'auto-1' });
    assert.equal('runId' in webhook, false);

    // Multi-page searchConversation using official nextBeforeSeq (no hasMore)
    const found = await handleClientCompatRpc('searchConversation', { agentId: 'a1', query: 'prokbot', limit: 10 }, fakeHost);
    assert.equal(found.isComplete, true);
    assert.equal('nextBeforeSeq' in found, false);
    assert.equal(found.matches.length, 3);
    assert.equal(found.matches[0].entryId, 'e3');
    assert.equal(found.matches[1].entryId, 'e2');
    assert.equal(found.matches[2].entryId, 'e0');

    // Limited search returns cursor for continuation
    const limited = await handleClientCompatRpc('searchConversation', { agentId: 'a1', query: 'prokbot', limit: 1 }, fakeHost);
    assert.equal(limited.matches.length, 1);
    assert.equal(limited.matches[0].entryId, 'e3');
    assert.equal(limited.isComplete, false);
    assert.equal(limited.nextBeforeSeq, 103);

    assert.ok(clientCompatMethods.has('searchConversation'));
    assert.ok(clientCompatMethods.has('setMainAgent'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('searchConversation traverses 1000 official-shape entries to find match at #11 and propagates Host errors', async () => {
  const allEntries = Array.from({ length: 1000 }, (_, idx) => ({
    id: `entry-${idx + 1}`,
    seq: idx + 1,
    role: idx % 2 === 0 ? 'user' : 'assistant',
    timestampMs: 1_700_000_000_000 + idx * 1000,
    text: idx === 10 ? 'needle-at-entry-11 found deep in history' : `ordinary message ${idx + 1}`,
  }));

  const fakeHost = async (method, args) => {
    assert.equal(method, 'getAgentTranscriptWindow');
    const upper = typeof args.beforeSeq === 'number' ? args.beforeSeq : allEntries.length + 1;
    const eligible = allEntries.filter(entry => entry.seq < upper);
    const slice = eligible.slice(-args.limit);
    const oldestSeq = slice[0]?.seq;
    const hasEarlier = oldestSeq !== undefined && oldestSeq > 1;
    return {
      entries: slice,
      ...(hasEarlier ? { nextBeforeSeq: oldestSeq } : {}),
      threadCounts: {},
    };
  };

  const result = await handleClientCompatRpc(
    'searchConversation',
    { agentId: 'a1b2', query: 'needle-at-entry-11', limit: 10 },
    fakeHost,
  );
  assert.equal(result.isComplete, true);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].entryId, 'entry-11');

  // Host 503/404 errors must propagate instead of returning an empty complete result.
  await assert.rejects(
    () => handleClientCompatRpc(
      'searchConversation',
      { agentId: 'a1b2', query: 'anything' },
      async () => { throw new HttpError(503, 'Host unavailable'); },
    ),
    err => err instanceof HttpError && err.status === 503,
  );
});
