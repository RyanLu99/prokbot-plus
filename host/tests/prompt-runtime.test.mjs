import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { installLocalPromptPolicy } from '../runtime/prompt-runtime.mjs';

test('parent prompts require a live memory access check after Host upgrades', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'prompt-runtime-'));
  const previous = globalThis.__grokbotPromptPolicy;
  const runtime = await installLocalPromptPolicy(directory, {}, {
    pollMs: 60_000, memoryRoot: '/data/runtime/host-data/',
  });
  t.after(async () => {
    await runtime.close();
    if (previous === undefined) delete globalThis.__grokbotPromptPolicy;
    else globalThis.__grokbotPromptPolicy = previous;
    await rm(directory, { recursive: true, force: true });
  });

  const render = globalThis.__grokbotPromptPolicy.snapshot();
  const parent = render('parent', 'Original parent prompt');
  assert.match(parent, /^Original parent prompt\n\nHost memory access is live for this turn:/);
  assert.match(parent, /agent memory is mounted at \/data\/runtime\/host-data\/agents/);
  assert.match(parent, /shared user memory at \/data\/runtime\/host-data\/user-memory/);
  assert.match(parent, /Never repeat an earlier turn's "not mounted" or "not readable" conclusion/);
  assert.match(parent, /A missing monthly log means that log has no file yet/);
  assert.equal(render('automation', 'Original automation prompt'), 'Original automation prompt');
});
