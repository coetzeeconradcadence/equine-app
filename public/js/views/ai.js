// "Ask AI" – sends the question plus a compact summary of the selected horse's records
// to our Cloudflare Pages Function (/api/ai), which calls the model with the API key server-side.
import * as db from '../db.js';
import { html, esc, fmtDate, today, addDays, sum, sortBy, money, ageFrom, $ } from '../util.js';
import { ahsTravel, ahsSeason } from '../ahs.js';
import { resultLine } from './components.js';
import { APP } from '../config.js';

const chats = {}; // horseId -> [{role, content}]
let selected = null;

export async function buildContext(horseId) {
  const horse = await db.get('horses', horseId);
  if (!horse) return '';
  const [health, feed, training, events, expenses] = await Promise.all(
    ['health', 'feed', 'training', 'events', 'expenses'].map((s) => db.byHorse(s, horseId)));
  const allProviders = await db.all('providers');
  const pn = Object.fromEntries(allProviders.map((p) => [p.id, `${p.name} (${p.role})`]));
  const L = [];
  L.push(`Today: ${today()}. Currency: ${APP.defaultCurrency}. Country: South Africa.`);
  L.push(`HORSE: ${horse.name}${horse.showName ? ` ("${horse.showName}")` : ''}; ${[horse.breed, horse.colour, horse.sex, horse.dob ? ageFrom(horse.dob) + ' old' : '', horse.height ? horse.height + 'hh' : '', horse.discipline].filter(Boolean).join(', ')}.`);
  if (horse.alerts) L.push(`ALERTS: ${horse.alerts}`);
  if (horse.notes) L.push(`NOTES: ${horse.notes}`);
  const t = ahsTravel(health); const s = ahsSeason(horse, health);
  L.push(`AHS: ${t.short}. ${t.detail} Season: ${s.label}.`);
  L.push('HEALTH RECORDS (newest first):');
  for (const r of sortBy(health, (r) => r.date, -1).slice(0, 30)) {
    L.push(`- ${r.date} ${r.type}${r.title ? ': ' + r.title : ''}${r.product ? ' [' + r.product + ']' : ''}${r.dose ? ' dose ' + r.dose : ''}${r.endDate ? ' until ' + r.endDate : ''}${r.providerId && pn[r.providerId] ? ' by ' + pn[r.providerId] : ''}${r.nextDue ? ' (next due ' + r.nextDue + ')' : ''}${r.notes ? ' – ' + r.notes : ''}`);
  }
  const activeFeed = feed.filter((f) => f.active !== false);
  if (activeFeed.length) {
    L.push('CURRENT FEEDING:');
    for (const f of activeFeed) L.push(`- ${f.name} (${f.kind}) ${f.amount || ''} at ${(f.times || []).join('/')}${f.startDate ? ', since ' + f.startDate : ''}${f.notes ? ' – ' + f.notes : ''}`);
  }
  const recentTraining = sortBy(training.filter((x) => x.date >= addDays(today(), -42)), (x) => x.date, -1);
  if (recentTraining.length) {
    L.push('TRAINING LAST 6 WEEKS:');
    for (const x of recentTraining.slice(0, 30)) L.push(`- ${x.date} ${x.status} ${x.type} ${x.duration || ''}min ${x.intensity || ''} ${x.feel || ''}${x.notes ? ' – ' + x.notes : ''}`);
  }
  if (events.length) {
    L.push('SHOWS & RESULTS:');
    for (const e of sortBy(events, (e) => e.date, -1).slice(0, 15)) L.push(`- ${e.date} ${e.name} (${[e.discipline, e.level, e.venue].filter(Boolean).join(', ')}) ${e.status}${e.status === 'Completed' ? ': ' + resultLine(e) : ''}${e.wcControlled ? ' [WC AHS controlled area]' : ''}${e.notes ? ' – ' + e.notes : ''}`);
  }
  const yr = expenses.filter((x) => x.date >= addDays(today(), -365));
  if (yr.length) {
    const byCat = {}; yr.forEach((x) => (byCat[x.category] = (byCat[x.category] || 0) + Number(x.amount || 0)));
    L.push(`COSTS LAST 12 MONTHS: total ${money(sum(yr, (x) => x.amount))}; ` + Object.entries(byCat).map(([k, v]) => `${k} ${money(v)}`).join(', '));
  }
  return L.join('\n');
}

const QUICK = [
  'Summarise this horse’s health history for the vet',
  'What is due in the next month?',
  'How have our last few results gone and what should we work on?',
  'Is this horse ready to travel to a show in the Western Cape?',
  'Where is most of the money going?',
];

function usage() {
  try {
    const k = 'ai-usage-' + today();
    return { k, n: Number(localStorage.getItem(k) || 0) };
  } catch { return { k: null, n: 0 }; }
}

export async function aiView(params) {
  const horses = sortBy(await db.all('horses'), (h) => h.name.toLowerCase());
  if (params.get('horse')) selected = params.get('horse');
  if (!horses.find((h) => h.id === selected)) selected = horses[0]?.id || null;
  const chat = chats[selected] ||= [];
  const u = usage();
  return html`
    <div class="page-head"><h1>✨ Ask AI</h1>
      ${horses.length ? html`<select data-action-change="ai-horse" style="width:auto">${horses.map((h) => html`<option value="${h.id}" ${h.id === selected ? 'selected' : ''}>${h.name}</option>`)}</select>` : ''}</div>
    <div class="callout small">Answers use ${horses.length ? 'this horse’s records' : 'general knowledge'} and are a guide only – <strong>not a substitute for your vet</strong>. For emergencies (colic, heavy bleeding, can’t bear weight) call your vet immediately. Your question and a summary of this horse’s records are sent to the AI service to answer.</div>
    <div class="chat" id="chat" style="margin-top:12px">
      ${chat.length ? chat.map((m) => html`<div class="msg ${m.role}">${m.content}</div>`) : html`
        <div class="muted small">Try one of these:</div>
        <div class="row">${QUICK.map((q) => html`<button class="sm" data-action="ai-quick" data-q="${q}">${q}</button>`)}</div>`}
    </div>
    <form class="chat-input" id="ai-form">
      <textarea name="q" placeholder="Ask about ${esc(horses.find((h) => h.id === selected)?.name || 'your horse')}…" rows="2"></textarea>
      <button class="primary" type="submit">Send</button>
    </form>
    <div class="row between small muted" style="margin-top:6px"><span>${u.n}/${APP.aiDailyLimit} questions today</span>
      ${chat.length ? html`<button class="sm" data-action="ai-clear">Clear chat</button>` : ''}
      <button class="sm" data-action="ai-context">See what the AI sees</button></div>`;
}

export async function sendQuestion(q, rerender) {
  q = q.trim(); if (!q) return;
  const u = usage();
  if (u.n >= APP.aiDailyLimit) { alert(`Daily limit of ${APP.aiDailyLimit} questions reached in this beta.`); return; }
  const chat = chats[selected] ||= [];
  chat.push({ role: 'user', content: q });
  chat.push({ role: 'assistant', content: '…thinking' });
  rerender();
  try {
    const context = selected ? await buildContext(selected) : '';
    const res = await fetch(APP.aiEndpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context, messages: chat.slice(0, -1).slice(-10) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    chat[chat.length - 1] = { role: 'assistant', content: data.reply || '(no answer)' };
    try { if (u.k) localStorage.setItem(u.k, String(u.n + 1)); } catch {}
  } catch (e) {
    const offline = /Failed to fetch|HTTP 404|HTTP 405|Unexpected/.test(String(e.message));
    chat[chat.length - 1] = { role: 'assistant', content: offline
      ? 'The AI service isn’t switched on for this copy of the app yet. On Cloudflare Pages, add an ANTHROPIC_API_KEY environment variable (see README) and redeploy.'
      : 'Sorry – something went wrong: ' + e.message };
  }
  rerender();
}

export const setAiHorse = (id) => { selected = id; };
export const clearAi = () => { if (selected) chats[selected] = []; };
export const aiSelected = () => selected;
