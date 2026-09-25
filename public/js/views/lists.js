import * as db from '../db.js';
import { html, today, money, sum, sortBy, groupBy, monthKey, fmtMonth, parse, esc, waNumber } from '../util.js';
import { loadAll, computeDue } from '../due.js';
import { dueItem, empty, addBtn, expenseItem, eventItem, bars, pill } from './components.js';
import { EXPENSE_CATEGORIES } from '../schemas.js';
import { APP } from '../config.js';

const state = { dueHorizon: 60, expHorse: 'all', expYear: null, evTab: 'upcoming' };
export const setListState = (k, v) => { state[k] = v; };

// ---------- Reminders / Due ----------
export async function remindersView() {
  const data = await loadAll();
  const byId = Object.fromEntries(data.horses.map((h) => [h.id, h]));
  const items = computeDue(data, { horizon: state.dueHorizon });
  const overdue = items.filter((i) => i.date < today());
  const upcoming = items.filter((i) => i.date >= today());
  const manualDone = sortBy(data.reminders.filter((r) => r.done), (r) => r.lastDone || r.date, -1).slice(0, 10);
  return html`
    <div class="page-head"><h1>What's due</h1>
      <div class="row">${addBtn('reminder', 'Reminder', {}, 'primary sm')}
      <button class="sm" data-action="ics-all" ${items.length ? '' : 'disabled'}>📅 Add to calendar</button></div></div>
    <div class="tabs">${[30, 60, 90, 365].map((n) => html`<button class="tab ${state.dueHorizon === n ? 'active' : ''}" data-action="list-state" data-k="dueHorizon" data-v="${n}">Next ${n === 365 ? 'year' : n + ' days'}</button>`)}</div>
    ${overdue.length ? html`<div class="section"><h2>Overdue</h2>${pill(overdue.length, 'bad')}</div><div class="list">${overdue.map((i) => dueItem(i, byId))}</div>` : ''}
    <div class="section"><h2>Upcoming</h2></div>
    <div class="list">${upcoming.length ? upcoming.map((i) => dueItem(i, byId)) : empty('Nothing coming up. Add next-due dates to health records, or add a reminder.')}</div>
    <p class="small muted" style="margin-top:12px">Tip: “Add to calendar” downloads a calendar file your phone can import, so you get alerts even when ${APP.name} is closed. Push notifications come with the cloud version.</p>
    ${manualDone.length ? html`<div class="section"><h2>Recently completed</h2></div><div class="list">${manualDone.map((r) => html`
      <div class="item clickable" data-action="edit" data-schema="reminder" data-id="${r.id}"><div class="grow"><div class="title">✓ ${r.title}</div><div class="meta">${byId[r.horseId]?.name || ''}</div></div></div>`)}</div>` : ''}`;
}

// ---------- Expenses ----------
export async function expensesView() {
  const [expenses, horses, providers] = await Promise.all([db.all('expenses'), db.all('horses'), db.all('providers')]);
  const horsesById = Object.fromEntries(horses.map((h) => [h.id, h]));
  const providersById = Object.fromEntries(providers.map((p) => [p.id, p]));
  const years = [...new Set(expenses.map((x) => String(x.date).slice(0, 4)))].sort().reverse();
  const cy = String(parse(today()).getFullYear());
  if (!years.includes(cy)) years.unshift(cy);
  const year = state.expYear && years.includes(state.expYear) ? state.expYear : cy;
  const filtered = expenses.filter((x) => String(x.date).startsWith(year) && (state.expHorse === 'all' || (state.expHorse === 'shared' ? !x.horseId : x.horseId === state.expHorse)));
  const total = sum(filtered, (x) => x.amount);
  const monthsElapsed = year === cy ? parse(today()).getMonth() + 1 : 12;
  const byCat = Object.entries(groupBy(filtered, (x) => x.category)).map(([label, xs]) => ({ label, value: sum(xs, (x) => x.amount) })).sort((a, b) => b.value - a.value);
  const byHorse = Object.entries(groupBy(filtered, (x) => x.horseId || '')).map(([id, xs]) => ({ label: horsesById[id]?.name || 'Shared', value: sum(xs, (x) => x.amount) })).sort((a, b) => b.value - a.value);
  const recurring = expenses.filter((x) => x.recurring === 'Monthly');
  const months = groupBy(sortBy(filtered, (x) => x.date, -1), (x) => monthKey(x.date));
  return html`
    <div class="page-head"><h1>Costs</h1><div class="row">${addBtn('expense', 'Expense', {}, 'primary sm')}<button class="sm" data-action="export-csv">⬇︎ CSV</button></div></div>
    <div class="row">
      <select data-action-change="list-state" data-k="expYear" style="width:auto">${years.map((y) => html`<option ${y === year ? 'selected' : ''}>${y}</option>`)}</select>
      <select data-action-change="list-state" data-k="expHorse" style="width:auto">
        <option value="all">All horses</option>${sortBy(horses, (h) => h.name).map((h) => html`<option value="${h.id}" ${state.expHorse === h.id ? 'selected' : ''}>${h.name}</option>`)}
        <option value="shared" ${state.expHorse === 'shared' ? 'selected' : ''}>Shared only</option></select>
    </div>
    <div class="stats" style="margin-top:12px">
      <div class="stat"><div class="label">Total ${year}</div><div class="value">${money(total)}</div></div>
      <div class="stat"><div class="label">Average / month</div><div class="value">${money(total / monthsElapsed)}</div></div>
      <div class="stat"><div class="label">Fixed monthly costs</div><div class="value">${money(sum(recurring, (x) => x.amount))}</div></div>
      <div class="stat"><div class="label">Entries</div><div class="value">${filtered.length}</div></div>
    </div>
    ${byCat.length ? html`<div class="grid two" style="margin-top:12px">
      <div class="card flat"><h3>By category</h3>${bars(byCat)}</div>
      <div class="card flat"><h3>By horse</h3>${bars(byHorse)}</div></div>` : ''}
    ${Object.keys(months).length ? Object.entries(months).map(([m, xs]) => html`
      <div class="section"><h3 style="margin:0">${fmtMonth(m)}</h3><strong>${money(sum(xs, (x) => x.amount))}</strong></div>
      <div class="list">${xs.map((x) => expenseItem(x, horsesById, providersById))}</div>`) : html`<div style="margin-top:12px">${empty('No expenses for this selection.')}</div>`}`;
}

export async function expensesCsv() {
  const [expenses, horses, providers] = await Promise.all([db.all('expenses'), db.all('horses'), db.all('providers')]);
  const hn = Object.fromEntries(horses.map((h) => [h.id, h.name]));
  const pn = Object.fromEntries(providers.map((p) => [p.id, p.name]));
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [['Date', 'Horse', 'Category', 'Description', 'Paid to', 'Amount', 'Monthly', 'Notes']]
    .concat(sortBy(expenses, (x) => x.date).map((x) => [x.date, hn[x.horseId] || 'Shared', x.category, x.description, pn[x.providerId] || '', x.amount, x.recurring === 'Monthly' ? 'yes' : '', x.notes]));
  return rows.map((r) => r.map(q).join(',')).join('\n');
}

// ---------- Events (all horses) ----------
export async function eventsView() {
  const [events, horses] = await Promise.all([db.all('events'), db.all('horses')]);
  const byId = Object.fromEntries(horses.map((h) => [h.id, h]));
  const tab = state.evTab;
  const list = tab === 'upcoming'
    ? sortBy(events.filter((e) => e.status === 'Entered'), (e) => e.date)
    : sortBy(events.filter((e) => e.status !== 'Entered'), (e) => e.date, -1);
  return html`
    <div class="page-head"><h1>Shows & events</h1>${addBtn('event', 'Add show', {}, 'primary sm')}</div>
    <div class="tabs"><button class="tab ${tab === 'upcoming' ? 'active' : ''}" data-action="list-state" data-k="evTab" data-v="upcoming">Entered / upcoming</button>
      <button class="tab ${tab === 'results' ? 'active' : ''}" data-action="list-state" data-k="evTab" data-v="results">Results</button></div>
    <div class="list">${list.length ? list.map((e) => eventItem(e, byId, { showHorse: true })) : empty(tab === 'upcoming' ? 'No shows entered.' : 'No results yet.')}</div>`;
}

// ---------- Providers ----------
export async function providersView() {
  const providers = sortBy(await db.all('providers'), (p) => p.role + p.name);
  const groups = groupBy(providers, (p) => p.role);
  return html`
    <div class="page-head"><h1>Contacts</h1>${addBtn('provider', 'Add contact', {}, 'primary sm')}</div>
    <p class="small muted">Your vet, farrier, dentist, physio, coach, transporter and feed store – one tap to call or WhatsApp.</p>
    ${providers.length ? Object.entries(groups).map(([role, ps]) => html`
      <div class="section"><h2>${role}</h2></div>
      <div class="list">${ps.map((p) => html`
        <div class="item">
          <div class="grow clickable" data-action="edit" data-schema="provider" data-id="${p.id}" style="cursor:pointer">
            <div class="title">${p.name}</div><div class="meta">${[p.practice, p.area, p.phone].filter(Boolean).join(' · ')}</div>
            ${p.notes ? html`<div class="meta">${p.notes}</div>` : ''}</div>
          <div class="actions">
            ${p.phone ? html`<a class="btn sm" href="tel:${p.phone.replace(/\s/g, '')}" aria-label="Call">📞</a><a class="btn sm" href="https://wa.me/${waNumber(p.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>` : ''}
            ${p.email ? html`<a class="btn sm" href="mailto:${p.email}" aria-label="Email">✉️</a>` : ''}
          </div>
        </div>`)}</div>`) : empty('No contacts yet.', addBtn('provider', 'Add your vet', { role: 'Vet' }, 'primary'))}`;
}

// ---------- More ----------
export function moreView() {
  const link = (href, icon, title, sub) => html`<a class="item clickable" href="${href}" style="text-decoration:none;color:inherit"><div style="font-size:1.4rem">${icon}</div><div class="grow"><div class="title">${title}</div><div class="meta">${sub}</div></div><span class="muted">›</span></a>`;
  return html`
    <h1>More</h1>
    <div class="list">
      ${link('#/events', '🏆', 'Shows & events', 'Entries, results and AHS travel checks')}
      ${link('#/providers', '📇', 'Contacts', 'Vet, farrier, dentist, coach, transport')}
      ${link('#/feedboard', '🌾', 'Yard feed board', 'Printable feed chart for all horses')}
      ${link('#/ai', '✨', 'Ask AI', 'Questions answered using your horse’s records')}
      ${link('#/blog', '📰', 'Blog & videos', 'Tips, training videos and stories')}
      ${link('#/settings', '⚙️', 'Settings & backup', 'Export, import, currency, demo data')}
    </div>`;
}
