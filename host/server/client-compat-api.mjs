// Compatibility handlers for newer Desktop (1.2.3+) and iOS (1.26.0+) gateway RPCs
// that are not present in the pinned stable sand-host bundle (d0a4baa).
import { randomUUID } from 'node:crypto';
import { check } from './security.mjs';

export const clientCompatMethods = new Set([
  'searchConversation',
  'searchMessages',
  'searchFiles',
  'rerunAutomationFromCard',
  'runAutomationWebhook',
  'dismissAgentSuggestions',
  'takeTeachLearningPrompts',
  'confirmTeachLearningPrompt',
  'resolveSkillPublishTargets',
  'getServerAgentRoster',
  'getMainAgent',
  'setMainAgent',
  'ensureDefaultMainAgent',
  'resolveAgentCreation',
  'restoreTemporalAgentRouting',
  'noteMountedAgent',
  'noteTranscriptOpened',
]);

function extractEntryText(entry) {
  if (!entry || typeof entry !== 'object') return '';
  const parts = [];
  const push = value => {
    if (typeof value === 'string' && value.trim()) parts.push(value);
  };
  push(entry.text);
  push(entry.prompt);
  push(entry.content);
  if (entry.message && typeof entry.message === 'object') {
    push(entry.message.content);
    push(entry.message.text);
  }
  if (Array.isArray(entry.parts)) {
    for (const part of entry.parts) {
      if (typeof part === 'string') push(part);
      else if (part && typeof part === 'object') {
        push(part.text);
        push(part.content);
      }
    }
  }
  if (Array.isArray(entry.blocks)) {
    for (const block of entry.blocks) {
      if (block && typeof block === 'object') {
        push(block.text);
        push(block.content);
      }
    }
  }
  return parts.join('\n');
}

function buildSnippet(text, query) {
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const at = lower.indexOf(needle);
  if (at < 0) return null;
  const start = Math.max(0, at - 60);
  const end = Math.min(text.length, at + needle.length + 100);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

function entryRole(entry) {
  if (typeof entry?.role === 'string') return entry.role;
  if (entry?.kind === 'user' || entry?.type === 'user') return 'user';
  return 'assistant';
}

export async function handleClientCompatRpc(method, input, callHost) {
  if (method === 'dismissAgentSuggestions') return null;
  if (method === 'takeTeachLearningPrompts') return [];
  if (method === 'confirmTeachLearningPrompt') return null;
  if (method === 'resolveSkillPublishTargets') return { targets: [] };
  if (method === 'getServerAgentRoster') return { status: 'disabled' };
  if (method === 'getMainAgent' || method === 'ensureDefaultMainAgent') return { agentId: null };
  if (method === 'setMainAgent') {
    return { agentId: typeof input?.agentId === 'string' ? input.agentId : null };
  }
  if (method === 'resolveAgentCreation') return { kind: 'box' };
  if (method === 'restoreTemporalAgentRouting' || method === 'noteMountedAgent' || method === 'noteTranscriptOpened') {
    return null;
  }

  if (method === 'searchMessages' || method === 'searchFiles') {
    const query = typeof input?.query === 'string' ? input.query : '';
    const target = method === 'searchMessages' ? 'searchAgents' : 'searchMedia';
    const matches = await callHost(target, { query });
    return { matches: Array.isArray(matches) ? matches : [], coverage: { kind: 'complete' } };
  }

  if (method === 'rerunAutomationFromCard' || method === 'runAutomationWebhook') {
    check(typeof input?.id === 'string' && input.id.length > 0, 400, '缺少 Bot ID');
    check(typeof input?.automationId === 'string' && input.automationId.length > 0, 400, '缺少自动化 ID');
    await callHost('runAgentAutomationNow', {
      id: input.id,
      automationId: input.automationId,
    });
    if (method === 'rerunAutomationFromCard') {
      return { ok: true, result: 'started', id: input.id, automationId: input.automationId };
    }
    return { ok: true, runId: randomUUID(), id: input.id, automationId: input.automationId };
  }

  if (method === 'searchConversation') {
    check(typeof input?.agentId === 'string' && input.agentId.length > 0, 400, '缺少会话 ID');
    const query = typeof input?.query === 'string' ? input.query.trim() : '';
    const limit = Math.min(Math.max(Number(input?.limit) || 50, 1), 200);
    if (!query) return { matches: [], isComplete: true };
    const maxPages = 20;
    const pageLimit = 200;
    const matches = [];
    const seen = new Set();
    let beforeSeq = typeof input?.beforeSeq === 'number' ? input.beforeSeq : undefined;
    let reachedEnd = false;
    for (let pageIndex = 0; pageIndex < maxPages && matches.length < limit; pageIndex++) {
      const args = {
        id: input.agentId,
        limit: pageLimit,
        ...(typeof beforeSeq === 'number' ? { beforeSeq } : {}),
      };
      let page = null;
      try {
        page = await callHost('getAgentTranscriptWindow', args);
      } catch {
        if (pageIndex === 0) {
          try {
            page = await callHost('getAgentTranscriptTail', args);
          } catch {
            return { matches: [], isComplete: true };
          }
        } else {
          break;
        }
      }
      const entries = Array.isArray(page?.entries) ? page.entries : [];
      let stoppedEarly = false;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (matches.length >= limit) {
          stoppedEarly = true;
          break;
        }
        const entry = entries[i];
        const entryId = String(entry?.id ?? '');
        if (entryId && seen.has(entryId)) continue;
        const text = extractEntryText(entry);
        if (!text) continue;
        const snippet = buildSnippet(text, query);
        if (snippet === null) continue;
        if (entryId) seen.add(entryId);
        matches.push({
          entryId,
          role: entryRole(entry),
          timestampMs: Number(entry.timestampMs ?? entry.createdAtMs ?? 0) || 0,
          snippet,
        });
      }
      const hasMore = Boolean(page?.hasMore);
      const nextBeforeSeq = typeof page?.nextBeforeSeq === 'number' ? page.nextBeforeSeq : undefined;
      if (!stoppedEarly && (!hasMore || nextBeforeSeq === undefined || nextBeforeSeq === beforeSeq || !entries.length)) {
        reachedEnd = true;
        break;
      }
      if (stoppedEarly || !hasMore || nextBeforeSeq === undefined || nextBeforeSeq === beforeSeq || !entries.length) {
        break;
      }
      beforeSeq = nextBeforeSeq;
    }
    return { matches, isComplete: reachedEnd };
  }

  check(false, 404, '兼容接口不存在');
}
