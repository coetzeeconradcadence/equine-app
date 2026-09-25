// Local-first storage. IndexedDB when available, in-memory fallback otherwise.
// Kept behind a tiny async API so we can swap in a cloud backend (Supabase / D1) later
// without touching the views.
import { uid } from './util.js';

const DB_NAME = 'hoofnote';
const VERSION = 1;
export const STORES = [
  'horses', 'health', 'feed', 'training', 'events', 'expenses',
  'providers', 'docs', 'reminders', 'posts', 'meta',
];

let idb = null;
let mem = null;
export let persistent = true;

function openIdb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      for (const s of STORES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('blocked'));
  });
}

export const ready = (async () => {
  try {
    idb = await openIdb();
    // probe a write – some private modes open but refuse writes
    await run('meta', 'readwrite', (s) => s.put({ id: '_probe', at: Date.now() }));
  } catch (e) {
    console.warn('[db] IndexedDB unavailable, using memory', e);
    idb = null; persistent = false;
    mem = Object.fromEntries(STORES.map((s) => [s, new Map()]));
  }
})();

function run(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const clone = (o) => (o == null ? o : structuredClone(o));
const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (store) => listeners.forEach((fn) => fn(store));

export async function all(store) {
  await ready;
  if (!idb) return [...mem[store].values()].map(clone);
  return run(store, 'readonly', (s) => s.getAll());
}
export async function get(store, id) {
  await ready;
  if (!id) return null;
  if (!idb) return clone(mem[store].get(id)) || null;
  return (await run(store, 'readonly', (s) => s.get(id))) || null;
}
export async function put(store, obj) {
  await ready;
  const now = new Date().toISOString();
  const rec = { ...obj, id: obj.id || uid(), createdAt: obj.createdAt || now, updatedAt: now };
  if (!idb) mem[store].set(rec.id, clone(rec));
  else await run(store, 'readwrite', (s) => s.put(rec));
  emit(store);
  return rec;
}
export async function del(store, id) {
  await ready;
  if (!idb) mem[store].delete(id);
  else await run(store, 'readwrite', (s) => s.delete(id));
  emit(store);
}
export async function where(store, pred) {
  return (await all(store)).filter(pred);
}
export const byHorse = (store, horseId) => where(store, (r) => r.horseId === horseId);

export async function clearAll() {
  await ready;
  for (const s of STORES) {
    if (!idb) mem[s].clear();
    else await run(s, 'readwrite', (st) => st.clear());
  }
  emit('*');
}

export async function exportAll() {
  const out = { app: 'hoofnote', schema: VERSION, exportedAt: new Date().toISOString(), data: {} };
  for (const s of STORES) out.data[s] = (await all(s)).filter((r) => r.id !== '_probe');
  return out;
}
export async function importAll(json, { replace = false } = {}) {
  if (!json || !json.data) throw new Error('Not a Hoofnote backup file');
  if (replace) await clearAll();
  for (const s of STORES) {
    for (const rec of json.data[s] || []) {
      if (!idb) mem[s].set(rec.id, rec);
      else await run(s, 'readwrite', (st) => st.put(rec));
    }
  }
  emit('*');
}

// Delete a horse and everything linked to it
export async function deleteHorse(id) {
  for (const s of ['health', 'feed', 'training', 'events', 'expenses', 'docs', 'reminders']) {
    for (const r of await byHorse(s, id)) await del(s, r.id);
  }
  await del('horses', id);
}

export async function getSetting(key, fallback = null) {
  const r = await get('meta', 'setting:' + key);
  return r ? r.value : fallback;
}
export async function setSetting(key, value) {
  return put('meta', { id: 'setting:' + key, value });
}
