import * as db from './db.js';
import { APP } from './config.js';
import { $, $$, toast, download, dataUrlToBlob, setCurrency, today, fmtDate } from './util.js';
import { openForm, openSheet, closeSheet } from './forms.js';
import { SCHEMAS } from './schemas.js';
import { loadAll, computeDue, completeReminder, toIcs } from './due.js';
import { loadDemo } from './demo.js';
import { homeView } from './views/home.js';
import { horsesView, horseView, setFilter } from './views/horses.js';
import { remindersView, expensesView, eventsView, providersView, moreView, setListState, expensesCsv } from './views/lists.js';
import { printView, feedboardView, togglePrint } from './views/print.js';
import { feedOrderView, feedOrderCsv, setFeedOrderTab, addFeedOrderColumn, removeFeedOrderColumn } from './views/feedorder.js';
import { calendarView, setCalMonth, calendarDayBody } from './views/calendar.js';
import { seedFeedCatalogIfEmpty } from './feedseed.js';
import { blogView, postView, postPublishJson } from './views/blog.js';
import { aiView, sendQuestion, setAiHorse, clearAi, buildContext, aiSelected } from './views/ai.js';
import { settingsView } from './views/settings.js';

const view = $('#view');
document.title = APP.name;
$('#app-name').textContent = APP.name;

// ---------------- Welcome / splash screen ----------------
// Versioned so a redesign (like this one) shows again even for browsers that dismissed an
// earlier version – bump the suffix whenever the welcome screen changes meaningfully.
const WELCOME_KEY = 'hoofnote-welcome-seen-v2';
(function initWelcome() {
  const el = document.getElementById('welcome');
  if (!el) return;
  let seen = false;
  try { seen = localStorage.getItem(WELCOME_KEY) === '1'; } catch {}
  if (seen) { el.remove(); return; }
  const dismiss = () => {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch {}
    el.classList.add('hide');
    setTimeout(() => el.remove(), 550);
  };
  $('#welcome-go', el)?.addEventListener('click', dismiss);
  el.addEventListener('click', (e) => { if (e.target === el) dismiss(); });
})();

// ---------------- Routing ----------------
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(qs || '') };
}

async function route() {
  const { parts, params } = parseHash();
  const [a, b, c] = parts;
  switch (a) {
    case undefined: return ['home', await homeView()];
    case 'horses': return ['horses', await horsesView()];
    case 'horse': return ['horses', await horseView(b, c)];
    case 'reminders': return ['reminders', await remindersView()];
    case 'expenses': return ['expenses', await expensesView()];
    case 'events': return ['more', await eventsView()];
    case 'providers': return ['more', await providersView()];
    case 'more': return ['more', moreView()];
    case 'print': return ['horses', await printView(b)];
    case 'feedboard': return ['more', await feedboardView()];
    case 'feedorder': return ['more', await feedOrderView()];
    case 'calendar': return ['more', await calendarView()];
    case 'blog': return ['more', b === 'draft' ? await postView(c, true) : b ? await postView(b) : await blogView()];
    case 'ai': return ['more', await aiView(params)];
    case 'settings': return ['more', await settingsView()];
    default: return ['home', '<div class="empty">Page not found. <a href="#/">Go home</a></div>'];
  }
}

let rendering = null, pending = false, lastHash = null;
async function render() {
  if (rendering) { pending = true; return; }
  rendering = (async () => {
    const sameRoute = lastHash === location.hash;
    const y = window.scrollY;
    try {
      const [nav, content] = await route();
      view.innerHTML = String(content);
      $$('.bottomnav a').forEach((el) => el.classList.toggle('active', el.dataset.nav === nav));
      renderFab(nav);
      window.scrollTo(0, sameRoute ? y : 0);
      bindView();
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="callout bad">Something went wrong: ${String(e.message || e).replace(/</g, '&lt;')}</div>`;
    }
    lastHash = location.hash;
  })();
  await rendering; rendering = null;
  if (pending) { pending = false; render(); }
}
window.addEventListener('hashchange', render);
let t;
db.onChange(() => { clearTimeout(t); t = setTimeout(render, 30); });

// ---------------- Quick-add FAB ----------------
function renderFab(nav) {
  let fab = $('#fab');
  const { parts } = parseHash();
  const hide = ['print', 'ai', 'blog', 'settings', 'feedboard'].includes(parts[0]);
  if (hide) { fab && fab.remove(); return; }
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'fab'; fab.className = 'fab'; fab.setAttribute('aria-label', 'Quick add'); fab.textContent = '＋';
    document.body.appendChild(fab);
    fab.onclick = quickAdd;
  }
}
function quickAdd() {
  const { parts } = parseHash();
  const horseId = parts[0] === 'horse' ? parts[1] : undefined;
  const opts = [
    ['health', '🩺', 'Health record'], ['training', '🏇', 'Ride / training'], ['expense', '💰', 'Expense'],
    ['feed', '🌾', 'Feed item'], ['event', '🏆', 'Show / result'], ['reminder', '🔔', 'Reminder'],
    ['doc', '📄', 'Document'], ['horse', '🐴', 'New horse'], ['provider', '📇', 'Contact'],
  ];
  openSheet('Add…', `<div class="grid two">${opts.map(([k, i, l]) => `<button class="btn block" data-q="${k}" style="justify-content:flex-start">${i} ${l}</button>`).join('')}</div>`, (d) => {
    $$('[data-q]', d).forEach((b) => (b.onclick = () => {
      const k = b.dataset.q;
      const preset = horseId && SCHEMAS[k].fields.some((f) => f.k === 'horseId') ? { horseId } : {};
      openForm(k, null, preset);
    }));
  });
}

// ---------------- Actions (event delegation) ----------------
async function dueByKey(key) {
  const items = computeDue(await loadAll(), { horizon: 3650 });
  return items.find((i) => i.key === key);
}
const actions = {
  add: (el) => openForm(el.dataset.schema, null, JSON.parse(el.dataset.preset || '{}')),
  edit: async (el) => {
    const s = SCHEMAS[el.dataset.schema];
    const rec = await db.get(s.store, el.dataset.id);
    if (rec) openForm(el.dataset.schema, rec);
  },
  filter: (el) => { setFilter(el.dataset.filter, el.dataset.value); render(); },
  'list-state': (el) => { setListState(el.dataset.k, isNaN(el.dataset.v) ? el.dataset.v : Number(el.dataset.v)); render(); },
  'due-done': async (el) => { const i = await dueByKey(el.dataset.key); if (i) { await completeReminder(i.ref); toast('Nice – done ✓'); } },
  'due-log': async (el) => {
    const i = await dueByKey(el.dataset.key); if (!i) return;
    const r = i.ref;
    openForm('health', null, { horseId: r.horseId, type: r.type, providerId: r.providerId || '', product: /vaccination|Deworming/.test(r.type) ? r.product || '' : '' });
  },
  'due-result': async (el) => {
    const i = await dueByKey(el.dataset.key); if (!i) return;
    openForm('event', { ...i.ref, status: 'Completed' });
  },
  'open-doc': async (el) => {
    const doc = await db.get('docs', el.dataset.id);
    if (!doc || !doc.file) { toast('No file attached – tap edit to add one'); return; }
    const url = URL.createObjectURL(dataUrlToBlob(doc.file.data));
    const w = window.open(url, '_blank');
    if (!w) download(doc.file.name || 'document', dataUrlToBlob(doc.file.data));
  },
  'ics-all': async () => {
    const data = await loadAll();
    const names = Object.fromEntries(data.horses.map((h) => [h.id, h.name]));
    const items = computeDue(data, { horizon: 365 }).filter((i) => i.date >= today());
    download(`${APP.name.toLowerCase()}-reminders.ics`, toIcs(items, (id) => names[id]), 'text/calendar');
  },
  'export-csv': async () => download(`${APP.name.toLowerCase()}-expenses-${today()}.csv`, await expensesCsv(), 'text/csv'),
  'fo-tab': (el) => { setFeedOrderTab(el.dataset.v); render(); },
  'fo-csv': async () => download(`${APP.name.toLowerCase()}-feed-order-${today()}.csv`, await feedOrderCsv(), 'text/csv'),
  'fo-remove-col': async (el) => { await removeFeedOrderColumn(el.dataset.id); render(); },
  'cal-nav': (el) => { setCalMonth(Number(el.dataset.v)); render(); },
  'cal-day': async (el) => {
    const date = el.dataset.date;
    const body = await calendarDayBody(date);
    openSheet(fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), body, (d) => {
      $$('[data-cal-item]', d).forEach((b) => (b.onclick = async () => {
        const schemaByKind = { health: 'health', due: 'health', event: 'event', reminder: 'reminder', doc: 'doc' };
        const schema = schemaByKind[b.dataset.kind];
        d.close();
        if (!schema) return;
        const rec = await db.get(SCHEMAS[schema].store, b.dataset.id);
        if (rec) openForm(schema, rec);
      }));
    });
  },
  print: () => window.print(),
  'toggle-print': (el) => { togglePrint(el.dataset.k); render(); },
  'share-horse': async (el) => {
    const h = await db.get('horses', el.dataset.id);
    const text = (await buildContext(el.dataset.id)).split('\n').slice(1, 14).join('\n');
    const payload = { title: `${h.name} – horse record`, text };
    if (navigator.share) { try { await navigator.share(payload); } catch {} }
    else { await navigator.clipboard.writeText(text); toast('Summary copied to clipboard'); }
  },
  'copy-post': async (el) => {
    const json = await postPublishJson(el.dataset.id);
    try { await navigator.clipboard.writeText(json); toast('Copied – paste into posts.json'); }
    catch { openSheet('Copy this', `<textarea style="min-height:300px">${json.replace(/</g, '&lt;')}</textarea>`); }
  },
  'ai-quick': (el) => sendQuestion(el.dataset.q, render),
  'ai-clear': () => { clearAi(); render(); },
  'ai-context': async () => {
    const id = aiSelected(); if (!id) return;
    const ctx = await buildContext(id);
    openSheet('What the AI sees', `<p class="small muted">This summary is sent with your question.</p><pre style="white-space:pre-wrap;font-size:.8rem">${ctx.replace(/</g, '&lt;')}</pre>`);
  },
  'load-demo': async () => { await loadDemo(); toast('Demo horses loaded'); location.hash = '#/'; },
  'clear-all': async () => {
    if (!confirm('Delete ALL horses and records on this device? Download a backup first if unsure.')) return;
    if (!confirm('Really delete everything?')) return;
    await db.clearAll(); toast('All data deleted');
  },
  backup: async () => download(`${APP.name.toLowerCase()}-backup-${today()}.json`, JSON.stringify(await db.exportAll())),
  'replay-welcome': () => { try { localStorage.removeItem(WELCOME_KEY); } catch {} location.reload(); },
};
const changeActions = {
  'list-state': (el) => { setListState(el.dataset.k, el.value); render(); },
  'ai-horse': (el) => { setAiHorse(el.value); render(); },
  'fo-add-col': async (el) => { await addFeedOrderColumn(el.value); render(); },
  'set-currency': async (el) => { await db.setSetting('currency', el.value); setCurrency(el.value); toast('Currency updated'); },
  'set-theme': async (el) => { await db.setSetting('theme', el.value); applyTheme(el.value); },
  restore: async (el) => {
    const file = el.files[0]; if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const replace = confirm('Replace everything on this device with the backup?\n\nOK = replace, Cancel = merge.');
      await db.importAll(json, { replace }); toast('Backup restored');
    } catch (e) { alert('Could not restore: ' + e.message); }
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.closest('#sheet') && !el.closest('#view')) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  if (el.tagName === 'INPUT' && el.type === 'checkbox') { fn(el); return; }
  e.preventDefault(); e.stopPropagation();
  fn(el);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action-change]');
  if (el && changeActions[el.dataset.actionChange]) changeActions[el.dataset.actionChange](el);
});

function bindView() {
  const form = $('#ai-form');
  if (form) {
    const ta = form.elements.q;
    form.onsubmit = (e) => { e.preventDefault(); const q = ta.value; ta.value = ''; sendQuestion(q, render); };
    ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } };
    const chat = $('#chat'); if (chat && chat.children.length > 1) form.scrollIntoView({ block: 'end' });
  }
}

function applyTheme(v) {
  if (v === 'light' || v === 'dark') document.documentElement.dataset.theme = v;
  else delete document.documentElement.dataset.theme;
}

// ---------------- Boot ----------------
(async function boot() {
  await db.ready;
  if (!db.persistent) $('#storage-banner').hidden = false;
  await seedFeedCatalogIfEmpty();
  setCurrency(await db.getSetting('currency', APP.defaultCurrency));
  applyTheme(await db.getSetting('theme', 'auto'));
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  await render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  }
})();
