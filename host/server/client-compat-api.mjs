// Compatibility handlers for newer Desktop (1.2.3+) and iOS (1.26.0+/1.27.0+)
// gateway RPCs that are not present in the pinned stable sand-host bundle (d0a4baa).
import { join } from 'node:path';
import { check } from './security.mjs';
import { validateAgentId } from './library.mjs';
import { JsonStore } from './storage.mjs';

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

export class MainAgentStore {
  constructor(dataDir) {
    this.store = dataDir ? new JsonStore(join(dataDir, 'main-agent.json'), { version: 1, agentId: null }) : null;
    this.data = { version: 1, agentId: null };
  }
  async load() {
    if (this.store) {
      await this.store.load();
      const agentId = this.store.value?.agentId;
      this.data = {
        version: 1,
        agentId: typeof agentId === 'string' && agentId ? agentId : null,
      };
    }
    return this;
  }
  get() {
    return this.data.agentId;
  }
  async set(agentId) {
    const normalized = agentId === null || agentId === undefined || agentId === ''
      ? null
      : validateAgentId(agentId);
    if (this.store) {
      await this.store.mutate(state => {
        state.agentId = normalized;
      });
    }
    this.data = { version: 1, agentId: normalized };
    return normalized;
  }
}

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

function parseOptionalLimit(raw) {
  if (raw === undefined || raw === null) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(Math.trunc(parsed), 200);
}

function parseContinuationOffset(raw) {
  if (typeof raw !== 'string') return 0;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return 0;
  const offset = Number(trimmed);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

function automationListFrom(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.automations)) return result.automations;
  return [];
}

export async function handleClientCompatRpc(method, input, callHost, options = {}) {
  const mainAgentStore = options.mainAgentStore ?? null;

  if (method === 'dismissAgentSuggestions') {
    if (input?.agentId !== undefined) validateAgentId(input.agentId);
    return null;
  }
  if (method === 'takeTeachLearningPrompts') return [];
  if (method === 'confirmTeachLearningPrompt') {
    if (input?.agentId !== undefined) validateAgentId(input.agentId);
    return null;
  }
  if (method === 'resolveSkillPublishTargets') return { targets: [] };
  if (method === 'getServerAgentRoster') return { status: 'disabled' };
  if (method === 'getMainAgent') {
    return { agentId: mainAgentStore ? mainAgentStore.get() : null };
  }
  if (method === 'setMainAgent') {
    const nextId = input?.agentId === null || input?.agentId === undefined || input?.agentId === ''
      ? null
      : validateAgentId(input.agentId);
    if (mainAgentStore) {
      return { agentId: await mainAgentStore.set(nextId) };
    }
    return { agentId: nextId };
  }
  if (method === 'ensureDefaultMainAgent') {
    const saved = mainAgentStore ? mainAgentStore.get() : null;
    if (saved) return { outcome: 'hasMainAgent', agentId: saved };
    let firstAgentId = null;
    try {
      const agents = await callHost('listAgents', {});
      if (Array.isArray(agents)) {
        const visible = agents.find(item => item && !item.isHiddenFromSidebar && typeof item.id === 'string');
        firstAgentId = visible?.id ?? null;
      }
    } catch {}
    return { outcome: 'present', agentId: firstAgentId };
  }
  if (method === 'resolveAgentCreation') return { kind: 'box' };
  if (method === 'restoreTemporalAgentRouting') return null;
  if (method === 'noteMountedAgent' || method === 'noteTranscriptOpened') {
    if (input?.agentId !== undefined) validateAgentId(input.agentId);
    return null;
  }

  if (method === 'searchMessages' || method === 'searchFiles') {
    const query = typeof input?.query === 'string' ? input.query : '';
    const target = method === 'searchMessages' ? 'searchAgents' : 'searchMedia';
    const raw = await callHost(target, { query });
    const all = Array.isArray(raw) ? raw : [];
    const offset = parseContinuationOffset(input?.continuation);
    const limit = parseOptionalLimit(input?.limit);
    const sliced = limit === null ? all.slice(offset) : all.slice(offset, offset + limit);
    const nextOffset = offset + sliced.length;
    const hasMore = nextOffset < all.length;
    return {
      matches: sliced,
      coverage: { kind: hasMore ? 'partial' : 'complete' },
      ...(hasMore ? { continuation: String(nextOffset) } : {}),
    };
  }

  if (method === 'rerunAutomationFromCard') {
    const id = validateAgentId(input?.id);
    check(typeof input?.automationId === 'string' && input.automationId.trim().length > 0, 400, '缺少自动化 ID');
    const automationId = input.automationId.trim();
    const list = automationListFrom(await callHost('getAgentAutomations', { id }));
    const exists = list.some(item => item && (item.id === automationId || item.automationId === automationId));
    if (!exists) {
      return { ok: false, result: 'not_offered', id, automationId };
    }
    await callHost('runAgentAutomationNow', { id, automationId });
    return { ok: true, result: 'started', id, automationId };
  }

  if (method === 'runAutomationWebhook') {
    const id = validateAgentId(input?.id);
    check(typeof input?.automationId === 'string' && input.automationId.trim().length > 0, 400, '缺少自动化 ID');
    const automationId = input.automationId.trim();
    // Pinned sand-host (d0a4baa) only exposes runAgentAutomationNow without
    // webhook context/page forwarding or a real runId; report not_offered
    // instead of silently dropping payload data and fabricating a runId.
    return { ok: false, result: 'not_offered', id, automationId };
  }

  if (method === 'searchConversation') {
    const agentId = validateAgentId(input?.agentId);
    const query = typeof input?.query === 'string' ? input.query.trim() : '';
    const limit = Math.min(Math.max(Number(input?.limit) || 50, 1), 200);
    if (!query) return { matches: [], isComplete: true };
    const maxPages = 20;
    const pageLimit = 200;
    const matches = [];
    const seen = new Set();
    let beforeSeq = typeof input?.beforeSeq === 'number' && Number.isFinite(input.beforeSeq)
      ? input.beforeSeq
      : undefined;
    let reachedEnd = false;
    let nextCursor = undefined;

    for (let pageIndex = 0; pageIndex < maxPages && matches.length < limit; pageIndex++) {
      const args = {
        id: agentId,
        limit: pageLimit,
        ...(typeof beforeSeq === 'number' ? { beforeSeq } : {}),
      };
      // Propagate Host errors (404/503/etc.) rather than reporting an empty complete search.
      const page = await callHost('getAgentTranscriptWindow', args);
      const entries = Array.isArray(page?.entries) ? page.entries : [];
      const pageNextBeforeSeq =
        typeof page?.nextBeforeSeq === 'number' && Number.isFinite(page.nextBeforeSeq)
          ? page.nextBeforeSeq
          : undefined;
      const hasMore =
        pageNextBeforeSeq !== undefined &&
        pageNextBeforeSeq !== beforeSeq &&
        entries.length > 0;

      let stoppedEarly = false;
      let stoppedCursor = undefined;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (matches.length >= limit) {
          stoppedEarly = true;
          const prevChecked = entries[i + 1];
          const remaining = entries[i];
          stoppedCursor =
            typeof prevChecked?.seq === 'number' && Number.isFinite(prevChecked.seq)
              ? prevChecked.seq
              : typeof remaining?.seq === 'number' && Number.isFinite(remaining.seq)
                ? remaining.seq + 1
                : pageNextBeforeSeq;
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

      if (stoppedEarly) {
        nextCursor = stoppedCursor;
        break;
      }
      if (!hasMore) {
        reachedEnd = true;
        nextCursor = undefined;
        break;
      }
      beforeSeq = pageNextBeforeSeq;
      nextCursor = pageNextBeforeSeq;
    }

    return {
      matches,
      isComplete: reachedEnd,
      ...(!reachedEnd && nextCursor !== undefined ? { nextBeforeSeq: nextCursor } : {}),
    };
  }

  check(false, 404, '兼容接口不存在');
}
