import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isMainThread, threadId } from 'node:worker_threads';
import { constructRecoveredModules } from './recovered-modules.mjs';
import inputs from '../recipes/host/manifest.json' with { type: 'json' };

const sourceSha256 = inputs.sourceSha256['agent-isolation/agent-store-worker.cjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const DEFAULT_BLOB_QUICK_CHECK_MAX_BYTES = 32 * 1024 * 1024;

export function blobQuickCheckMaxBytes(env = process.env) {
  const raw = env?.GROKBOT_BLOB_DB_QUICK_CHECK_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_BLOB_QUICK_CHECK_MAX_BYTES;
  if (raw.toLowerCase() === 'infinity') return Number.POSITIVE_INFINITY;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BLOB_QUICK_CHECK_MAX_BYTES;
}

/** Avoid blocking worker init for 60s+ on PRAGMA quick_check for multi-hundred-MB blob DBs. */
export function wrapOpenConversationBlobDb(
  originalOpen,
  bindings,
  { maxQuickCheckBytes = blobQuickCheckMaxBytes(), stat = statSync } = {},
) {
  return function openConversationBlobDbWithLargeDbFastPath(options) {
    if (!options?.dbPath || maxQuickCheckBytes === Number.POSITIVE_INFINITY) {
      return originalOpen(options);
    }
    let size = 0;
    try {
      size = stat(options.dbPath).size;
    } catch {
      return originalOpen(options);
    }
    if (size < maxQuickCheckBytes) return originalOpen(options);
    let db;
    try {
      const recovery = options.recovery ?? bindings.DISK_RECOVERY;
      if (bindings.findPendingRecovery(options.dbPath, recovery) != null) {
        return originalOpen(options);
      }
      db = bindings.openConfiguredConversationBlobDb(options.dbPath, options.busyTimeoutMs);
      db.prepare('PRAGMA schema_version').get();
      db.prepare('SELECT id FROM blobs LIMIT 1').get();
      return db;
    } catch {
      try { db?.close(); } catch {}
      return originalOpen(options);
    }
  };
}

export async function describeRecoveredBlobWorker(state) {
  const provenance = JSON.parse(await readFile(join(state, 'blob-worker-library-provenance.json'), 'utf8'));
  const prepared = await readFile(join(state, 'blob-worker-library.cjs'));
  const entryPath = join(state, 'recovered-worker/agent-isolation/agent-store-worker.cjs');
  if (provenance.sourceSha256 !== sourceSha256 || hash(prepared) !== provenance.sha256 ||
      hash(await readFile(entryPath)) !== provenance.entrySha256) throw new Error('Prepared blob worker provenance mismatch');
  const directory = join(state, 'recovered-core/stable');
  const manifest = JSON.parse(await readFile(join(directory, 'blob-worker-provenance.json'), 'utf8'));
  if (manifest.sourceSha256 !== sourceSha256) throw new Error('Worker modules source mismatch');
  const modules = [];
  for (const module of manifest.modules) {
    if (!/^blob-worker-[\w-]+\.mjs$/.test(module.name)) throw new Error('Invalid worker module name');
    const sha256 = hash(await readFile(join(directory, module.name)));
    modules.push({ file: module.name, sha256, generatedSha256: module.sha256, modified: sha256 !== module.sha256 });
  }
  return { configured: true, sourceSha256, preparedSha256: provenance.sha256, entryPath,
    entrySha256: provenance.entrySha256, moduleBytesSha256: hash(JSON.stringify(modules)),
    bindings: provenance.bindings, sharedBindings: provenance.sharedBindings, modules };
}

export async function loadRecoveredBlobWorker(state) {
  const status = await describeRecoveredBlobWorker(state);
  const library = createRequire(import.meta.url)(join(state, 'blob-worker-library.cjs'));
  const constructed = await constructRecoveredModules(
    library.blobWorkerRecoveryPlan,
    library.getBlobWorkerRecoveryBindings(),
    join(state, 'recovered-core/stable'),
    'Blob worker',
    {
      overrides: {
        openConversationBlobDb: (originalOpen, bindings) => wrapOpenConversationBlobDb(originalOpen, bindings),
      },
    },
  );
  library.installRecoveredBlobWorker(constructed.bindings);
  return { library, status: { ...status, installed: true } };
}

export async function startRecoveredBlobWorker(state) {
  if (isMainThread) throw new Error('Recovered blob worker must run in a worker thread');
  const { library, status } = await loadRecoveredBlobWorker(state);
  console.error('[recovered-blob-worker] installed ' + JSON.stringify({ pid: process.pid, threadId,
    preparedSha256: status.preparedSha256, moduleBytesSha256: status.moduleBytesSha256,
    moduleCount: status.modules.length, callableCount: status.bindings.length,
    modifiedModules: status.modules.filter(module => module.modified).map(module => module.file) }));
  library.getBlobWorkerRecoveryBindings().main();
}
