import * as db from '../db.js';
import { html, raw, esc, fmtDate, ageFrom, today, money, sum, sortBy, groupBy, addDays, parse, iso, monthKey, fmtMonth } from '../util.js';
import { avatar, pill, empty, addBtn, dueItem, healthItem, eventItem, expenseItem, trainingItem, resultLine, sparkline, bars } from './components.js';
import { ahsTravel, ahsSeason, eventTravelCheck, AHS_DISCLAIMER } from '../ahs.js';
import { loadAll, computeDue, dueTone } from '../due.js';
import { healthIcon, FEED_TIMES, DISCIPLINES } from '../schemas.js';

export async function horsesView() {
  const [horses, health] = await Promise.all([db.all('horses'), db.all('health')]);
  const list = sortBy(horses, (h) => h.name.toLowerCase());
  return html`
    <div class="page-head"><h1>Horses</h1>${addBtn('horse', 'Add horse', {}, 'primary')}</div>
    <div class="grid two">
      ${list.length ? list.map((h) => {
        const st = ahsTravel(health.filter((r) => r.horseId === h.id));
        return html`<a class="card horse-card" href="#/horse/${h.id}">${avatar(h)}
          <div class="grow"><h3>${h.name}</h3>
          <div class="small muted">${[h.breed, h.sex, h.dob ? ageFrom(h.dob) : '', h.height ? h.height + 'hh' : ''].filter(Boolean).join(' · ')}</div>
          <div class="row" style="margin-top:6px">${pill('AHS: ' + st.short, st.tone)}${h.discipline ? pill(h.discipline) : ''}</div></div></a>`;
      }) : empty('No horses yet.', addBtn('horse', 'Add your first horse', {}, 'primary'))}
    </div>`;
}

const TABS = [
  ['overview', 'Overview'], ['health', 'Health'], ['farrier', 'Farrier'], ['feeding', 'Feeding'], ['training', 'Training'],
  ['shows', 'Shows & results'], ['costs', 'Costs'], ['docs', 'Documents'], ['timeline', 'Timeline'],
];
const filters = { health: 'All', shows: 'All' };

export async function horseView(id, tab = 'overview') {
  const horse = await db.get('horses', id);
  if (!horse) return html`<div class="empty">Horse not found. <a href="#/horses">Back to horses</a></div>`;
  const [health, feed, training, events, expenses, docs, providers, reminders] = await Promise.all(
    ['health', 'feed', 'training', 'events', 'expenses', 'docs', 'providers', 'reminders'].map((s) => db.all(s)));
  const mine = (arr) => arr.filter((r) => r.horseId === id);
  const d = {
    horse, health: mine(health), feed: mine(feed), training: mine(training), events: mine(events),
    expenses: mine(expenses), docs: mine(docs), reminders: mine(reminders),
    providersById: Object.fromEntries(providers.map((p) => [p.id, p])),
  };
  const body = await ({ overview, health: healthTab, farrier: farrierTab, feeding, training: trainingTab, shows, costs, docs: docsTab, timeline }[tab] || overview)(d);
  return html`
    <div class="row" style="gap:12px;align-items:center">
      ${avatar(horse, 'lg')}
      <div class="grow" style="min-width:0">
        <h1 style="margin:0">${horse.name}</h1>
        ${horse.showName ? html`<div class="muted small">${horse.showName}</div>` : ''}
        <div class="small muted">${[horse.breed, horse.colour, horse.sex, horse.dob ? ageFrom(horse.dob) : '', horse.height ? horse.height + 'hh' : ''].filter(Boolean).join(' · ')}</div>
      </div>
      <button class="sm" data-action="edit" data-schema="horse" data-id="${id}">Edit</button>
    </div>
    ${horse.alerts ? html`<div class="callout bad" style="margin-top:12px">⚠️ <strong>Alerts:</strong> ${horse.alerts}</div>` : ''}
    <nav class="tabs">${TABS.map(([k, label]) => html`<a class="tab ${k === tab ? 'active' : ''}" href="#/horse/${id}/${k}">${label}</a>`)}</nav>
    ${body}`;
}

// ---------------- Overview ----------------
async function overview(d) {
  const { horse, health } = d;
  const travel = ahsTravel(health);
  const season = ahsSeason(horse, health);
  const all = await loadAll();
  const byId = { [horse.id]: horse };
  const due = computeDue(all, { horizon: 60 }).filter((i) => i.horseId === horse.id);
  const lastOf = (type) => sortBy(health.filter((r) => r.type === type), (r) => r.date, -1)[0];
  const lastFarrier = lastOf('Farrier'), lastDentist = lastOf('Dentist'), lastWorm = lastOf('Deworming');
  const yearSpend = sum(d.expenses.filter((x) => String(x.date).startsWith(String(parse(today()).getFullYear()))), (x) => x.amount);
  const results = sortBy(d.events.filter((e) => e.status === 'Completed'), (e) => e.date, -1);
  const details = [
    ['Discipline', horse.discipline], ['Microchip', horse.microchip], ['Passport no.', horse.passportNo],
    ['SAEF / society no.', horse.saefNo], ['Yard', horse.yard], ['Owner', horse.owner], ['Insurance', horse.insurance],
    ['Date of birth', horse.dob ? fmtDate(horse.dob) : ''], ['Markings', horse.markings],
  ].filter(([, v]) => v);

  return html`
    <div class="grid two">
      <div class="card">
        <div class="row between"><h2 style="margin:0">🦟 AHS status</h2>${pill(travel.short, travel.tone)}</div>
        <p class="small" style="margin-top:8px">${travel.detail}</p>
        ${season.state !== 'na' ? html`<div class="callout ${season.tone}">${season.label}</div>` : html`<div class="callout">${season.label}</div>`}
        <p class="small muted" style="margin-top:8px">${AHS_DISCLAIMER}</p>
        ${addBtn('health', 'Log AHS vaccination', { horseId: horse.id, type: 'AHS vaccination' })}
      </div>
      <div class="card">
        <h2>At a glance</h2>
        <table><tbody>
          <tr><th>Farrier</th><td>${lastFarrier ? fmtDate(lastFarrier.date) : '—'}</td><td class="num">${lastFarrier?.nextDue ? 'next ' + fmtDate(lastFarrier.nextDue) : ''}</td></tr>
          <tr><th>Dentist</th><td>${lastDentist ? fmtDate(lastDentist.date) : '—'}</td><td class="num">${lastDentist?.nextDue ? 'next ' + fmtDate(lastDentist.nextDue) : ''}</td></tr>
          <tr><th>Deworming</th><td>${lastWorm ? fmtDate(lastWorm.date) : '—'}</td><td class="num">${lastWorm?.nextDue ? 'next ' + fmtDate(lastWorm.nextDue) : ''}</td></tr>
          <tr><th>Spent this year</th><td colspan="2">${money(yearSpend)}</td></tr>
          <tr><th>Last result</th><td colspan="2">${results[0] ? html`${results[0].name} – ${resultLine(results[0])}` : '—'}</td></tr>
        </tbody></table>
      </div>
    </div>

    <div class="section"><h2>Due for ${horse.name}</h2>${addBtn('reminder', 'Reminder', { horseId: horse.id })}</div>
    <div class="list">${due.length ? due.map((i) => dueItem(i, byId, { showHorse: false })) : empty('Nothing due in the next 60 days.')}</div>

    <div class="section"><h2>Details</h2></div>
    <div class="card flat">${details.length ? html`<table><tbody>${details.map(([k, v]) => html`<tr><th>${k}</th><td>${v}</td></tr>`)}</tbody></table>` : html`<p class="muted">Add microchip, passport and registration numbers via Edit.</p>`}
      ${horse.notes ? html`<p style="margin-top:8px">${horse.notes}</p>` : ''}
    </div>

    <div class="section"><h2>Share & tools</h2></div>
    <div class="row">
      <a class="btn" href="#/print/${horse.id}">🖨️ Horse passport / PDF</a>
      <button data-action="share-horse" data-id="${horse.id}">📤 Share summary</button>
      <a class="btn" href="#/ai?horse=${horse.id}">✨ Ask AI about ${horse.name}</a>
    </div>`;
}

// ---------------- Health ----------------
const HEALTH_FILTERS = {
  All: () => true,
  Vaccinations: (r) => /vaccination/i.test(r.type),
  Hooves: (r) => r.type === 'Farrier',
  Teeth: (r) => r.type === 'Dentist',
  Worming: (r) => ['Deworming', 'Faecal egg count'].includes(r.type),
  'Vet & treatment': (r) => ['Vet visit', 'Treatment / medication', 'Injury / illness'].includes(r.type),
  Other: (r) => ['Physio / chiro', 'Saddle fit', 'Weight / condition', 'Other'].includes(r.type),
};
function healthTab(d) {
  const f = HEALTH_FILTERS[filters.health] ? filters.health : 'All';
  const list = sortBy(d.health.filter(HEALTH_FILTERS[f]), (r) => r.date, -1);
  const active = d.health.filter((r) => r.endDate && r.endDate >= today());
  return html`
    <div class="row between"><h2 style="margin:0">Health & medical</h2>${addBtn('health', 'Add record', { horseId: d.horse.id }, 'primary sm')}</div>
    ${active.length ? html`<div class="callout warn" style="margin-top:12px">💊 On treatment: ${active.map((r) => `${r.product || r.title || r.type} until ${fmtDate(r.endDate)}`).join('; ')}</div>` : ''}
    <div class="tabs">${Object.keys(HEALTH_FILTERS).map((k) => html`<button class="tab ${k === f ? 'active' : ''}" data-action="filter" data-filter="health" data-value="${k}">${k}</button>`)}</div>
    <div class="list">${list.length ? list.map((r) => healthItem(r, d.providersById)) : empty('No records here yet.')}</div>`;
}

// ---------------- Farrier ----------------
// Fields researched against general farriery record-keeping (TheHorse.com's hoof care record,
// Mad Barn's farrier-care guide, EquineGo's shoeing/hoof chart): trim/shoeing type, shoe material,
// hoof type & size, condition issues (cracks, thrush, flares, etc.) and the farrier's own feedback,
// alongside who did it, cost and the next-due date already tracked on every health record.
function farrierTab(d) {
  const list = sortBy(d.health.filter((r) => r.type === 'Farrier'), (r) => r.date, -1);
  const last = list[0];
  return html`
    <div class="row between"><h2 style="margin:0">🔨 Farrier & hoof care</h2>${addBtn('health', 'Log farrier visit', { horseId: d.horse.id, type: 'Farrier' }, 'primary sm')}</div>
    ${last ? html`
      <div class="card" style="margin-top:12px">
        <div class="row between"><h3 style="margin:0">Latest visit</h3>${last.nextDue ? pill('Next due ' + fmtDate(last.nextDue), dueTone(last.nextDue)) : ''}</div>
        <table style="margin-top:6px"><tbody>
          <tr><th style="width:35%">Date</th><td>${fmtDate(last.date)}</td></tr>
          <tr><th>Farrier</th><td>${d.providersById[last.providerId]?.name || '—'}</td></tr>
          <tr><th>Trim / shoeing</th><td>${last.trimType || '—'}${last.shoeMaterial ? ' · ' + last.shoeMaterial : ''}</td></tr>
          <tr><th>Hoof type</th><td>${last.hoofType || '—'}</td></tr>
          <tr><th>Size – front</th><td>${last.hoofSizeFront || '—'}</td></tr>
          <tr><th>Size – hind</th><td>${last.hoofSizeHind || '—'}</td></tr>
          ${last.cost ? html`<tr><th>Cost</th><td>${money(last.cost)}</td></tr>` : ''}
        </tbody></table>
        ${last.hoofIssues?.length ? html`<div class="row" style="margin-top:8px">${last.hoofIssues.map((i) => pill(i, i === 'None noted' ? 'good' : 'warn'))}</div>` : ''}
        ${last.farrierFeedback ? html`<div class="callout" style="margin-top:8px"><strong>Farrier's feedback:</strong> ${last.farrierFeedback}</div>` : ''}
        ${last.notes ? html`<p class="small muted" style="margin-top:8px">${last.notes}</p>` : ''}
      </div>` : ''}
    <div class="section"><h2>Visit history</h2></div>
    <div class="list">${list.length ? list.map((r) => html`
      <div class="item clickable" data-action="edit" data-schema="health" data-id="${r.id}">
        <div style="font-size:1.4rem">🔨</div>
        <div class="grow">
          <div class="title">${r.trimType || 'Farrier visit'}${r.shoeMaterial ? ' · ' + r.shoeMaterial : ''}</div>
          <div class="meta">${fmtDate(r.date)}${d.providersById[r.providerId] ? ' · ' + d.providersById[r.providerId].name : ''}${r.cost ? ' · ' + money(r.cost) : ''}</div>
          ${r.hoofIssues?.length && !r.hoofIssues.includes('None noted') ? html`<div class="meta">⚠ ${r.hoofIssues.join(', ')}</div>` : ''}
          ${r.nextDue ? html`<div class="meta">Next due ${fmtDate(r.nextDue)}</div>` : ''}
        </div>
      </div>`) : empty('No farrier visits logged yet.', addBtn('health', 'Log the first visit', { horseId: d.horse.id, type: 'Farrier' }, 'primary'))}</div>`;
}

// ---------------- Feeding ----------------
function feeding(d) {
  const active = d.feed.filter((f) => f.active !== false);
  const past = d.feed.filter((f) => f.active === false);
  const monthly = sum(active, (f) => f.monthlyCost);
  return html`
    <div class="row between"><h2 style="margin:0">Feeding plan</h2>
      <div class="row">${addBtn('feed', 'Add feed', { horseId: d.horse.id }, 'primary sm')}<a class="btn sm" href="#/feedboard">🖨️ Feed board</a><a class="btn sm" href="#/feedorder">🧮 Feed order</a></div></div>
    ${active.length ? html`
      <div class="table-wrap card flat" style="margin-top:12px"><table>
        <thead><tr><th>Feed</th>${FEED_TIMES.map((t) => html`<th>${t}</th>`)}</tr></thead>
        <tbody>${active.map((f) => html`<tr class="clickable" data-action="edit" data-schema="feed" data-id="${f.id}" style="cursor:pointer">
          <td><strong>${f.name}</strong><div class="small muted">${f.kind}${f.dailyQty ? ' · ' + f.dailyQty + ' /day' : ''}${f.notes ? ' · ' + f.notes : ''}</div></td>
          ${FEED_TIMES.map((t) => html`<td>${(f.times || []).includes(t) ? f.amount || '✓' : ''}</td>`)}</tr>`)}</tbody>
      </table></div>
      ${monthly ? html`<p class="small muted" style="margin-top:8px">Approx. feed cost: <strong>${money(monthly)}</strong> / month</p>` : ''}`
    : html`<div style="margin-top:12px">${empty('No feeds yet. Add hard feed, hay and supplements.')}</div>`}
    ${past.length ? html`<div class="section"><h2>Previous feeds</h2></div>
      <div class="list">${past.map((f) => html`<div class="item clickable" data-action="edit" data-schema="feed" data-id="${f.id}"><div class="grow"><div class="title">${f.name}</div><div class="meta">${f.kind} · ${f.amount || ''} · started ${fmtDate(f.startDate)}</div></div>${pill('Stopped')}</div>`)}</div>` : ''}`;
}

// ---------------- Training ----------------
const weekStart = (s) => { const dt = parse(s); const day = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - day); return iso(dt); };
function trainingTab(d) {
  const thisWeek = weekStart(today());
  const done = d.training.filter((t) => t.status === 'Done');
  const wk = done.filter((t) => weekStart(t.date) === thisWeek);
  const last28 = done.filter((t) => t.date >= addDays(today(), -28));
  const planned = sortBy(d.training.filter((t) => t.status === 'Planned' && t.date >= today()), (t) => t.date);
  const history = sortBy(d.training.filter((t) => !(t.status === 'Planned' && t.date >= today())), (t) => t.date, -1).slice(0, 60);
  const weeks = groupBy(history, (t) => weekStart(t.date));
  const types = groupBy(last28, (t) => t.type);
  const withHr = sortBy(done.filter((t) => t.hasWearable && t.avgHr), (t) => t.date).slice(-10);
  return html`
    <div class="row between"><h2 style="margin:0">Training</h2>
      <div class="row">${addBtn('training', 'Log ride', { horseId: d.horse.id }, 'primary sm')}${addBtn('training', 'Plan', { horseId: d.horse.id, status: 'Planned', date: addDays(today(), 1) })}</div></div>
    <div class="stats" style="margin-top:12px">
      <div class="stat"><div class="label">This week</div><div class="value">${wk.length} <span class="small muted">sessions</span></div></div>
      <div class="stat"><div class="label">Minutes this week</div><div class="value">${sum(wk, (t) => t.duration)}</div></div>
      <div class="stat"><div class="label">Last 4 weeks</div><div class="value">${last28.length}</div></div>
      <div class="stat"><div class="label">Mix (4 wks)</div><div class="small">${Object.entries(types).map(([k, v]) => `${k} ${v.length}`).join(', ') || '—'}</div></div>
    </div>
    ${withHr.length >= 2 ? html`<div class="card flat" style="margin-top:12px">
      <div class="row between"><strong>❤️ Avg heart rate (last ${withHr.length} logged rides)</strong><span class="small muted">${withHr[0].device || ''}</span></div>
      ${sparkline(withHr.map((t) => t.avgHr))}
      <p class="small muted" style="margin-top:4px">A downward trend at similar effort over weeks can be a sign of improving fitness – not medical advice, just a nudge to compare with your vet or trainer.</p>
    </div>` : ''}
    ${planned.length ? html`<div class="section"><h2>Planned</h2></div><div class="list">${planned.map(trainingItem)}</div>` : ''}
    <div class="section"><h2>History</h2></div>
    ${history.length ? Object.entries(weeks).map(([w, items]) => html`
      <h3 class="muted small" style="margin:12px 0 6px">Week of ${fmtDate(w)}</h3><div class="list">${items.map(trainingItem)}</div>`) : empty('No sessions logged yet.')}`;
}

// ---------------- Shows & results ----------------
function shows(d) {
  const discs = ['All', ...DISCIPLINES.filter((x) => d.events.some((e) => e.discipline === x))];
  const f = discs.includes(filters.shows) ? filters.shows : 'All';
  const evs = d.events.filter((e) => f === 'All' || e.discipline === f);
  const upcoming = sortBy(evs.filter((e) => e.status === 'Entered' && e.date >= today()), (e) => e.date);
  const results = sortBy(evs.filter((e) => e.status === 'Completed'), (e) => e.date, -1);
  const dressage = sortBy(results.filter((e) => e.score != null && e.score !== ''), (e) => e.date).slice(-10);
  const jumping = results.filter((e) => ['Show jumping', 'Eventing'].includes(e.discipline));
  const clearRate = jumping.length ? Math.round((jumping.filter((e) => e.clear).length / jumping.length) * 100) : null;
  const wins = results.filter((e) => Number(e.placing) === 1).length;
  const podiums = results.filter((e) => Number(e.placing) >= 1 && Number(e.placing) <= 3).length;
  return html`
    <div class="row between"><h2 style="margin:0">Shows & results</h2>${addBtn('event', 'Add show / result', { horseId: d.horse.id, discipline: d.horse.discipline || '' }, 'primary sm')}</div>
    ${discs.length > 2 ? html`<div class="tabs">${discs.map((k) => html`<button class="tab ${k === f ? 'active' : ''}" data-action="filter" data-filter="shows" data-value="${k}">${k}</button>`)}</div>` : html`<div style="height:12px"></div>`}
    <div class="stats">
      <div class="stat"><div class="label">Results logged</div><div class="value">${results.length}</div></div>
      <div class="stat"><div class="label">Wins / podiums</div><div class="value">${wins} / ${podiums}</div></div>
      <div class="stat"><div class="label">Clear-round rate</div><div class="value">${clearRate == null ? '—' : clearRate + '%'}</div></div>
      <div class="stat"><div class="label">Avg score (last 5)</div><div class="value">${dressage.length ? (sum(dressage.slice(-5), (e) => e.score) / Math.min(5, dressage.length)).toFixed(1) + '%' : '—'}</div></div>
    </div>
    ${dressage.length >= 2 ? html`<div class="card flat" style="margin-top:12px"><div class="small muted">Score trend (last ${dressage.length})</div>${sparkline(dressage.map((e) => e.score))}</div>` : ''}

    ${upcoming.length ? html`<div class="section"><h2>Upcoming</h2></div><div class="list">${upcoming.map((e) => {
      const check = eventTravelCheck(e, d.health);
      return html`${eventItem(e, {})}${check ? html`<div class="card flat" style="margin:-4px 0 4px 16px">
        <div class="row between"><strong>AHS travel checklist</strong>${pill(check.status.travel ? 'Eligible on show date' : 'Not eligible yet', check.status.tone)}</div>
        <ul class="small" style="margin:6px 0 0;padding-left:18px">${check.steps.map((s) => html`<li>${s.ok === true ? '✅' : s.ok === false ? '❌' : '⬜'} ${s.label}${s.detail ? html`<div class="muted">${s.detail}</div>` : ''}</li>`)}</ul>
        <p class="small muted" style="margin:6px 0 0">${AHS_DISCLAIMER}</p></div>` : ''}`;
    })}</div>` : ''}

    <div class="section"><h2>Results</h2></div>
    <div class="list">${results.length ? results.map((e) => eventItem(e, {})) : empty('No results yet. After a show, open it and set status to Completed.')}</div>`;
}

// ---------------- Costs ----------------
function costs(d) {
  const year = String(parse(today()).getFullYear());
  const yr = d.expenses.filter((x) => String(x.date).startsWith(year));
  const byCat = Object.entries(groupBy(yr, (x) => x.category)).map(([label, xs]) => ({ label, value: sum(xs, (x) => x.amount) })).sort((a, b) => b.value - a.value);
  const months = groupBy(sortBy(d.expenses, (x) => x.date, -1), (x) => monthKey(x.date));
  return html`
    <div class="row between"><h2 style="margin:0">Costs</h2>${addBtn('expense', 'Add expense', { horseId: d.horse.id }, 'primary sm')}</div>
    <div class="stats" style="margin-top:12px">
      <div class="stat"><div class="label">This month</div><div class="value">${money(sum(d.expenses.filter((x) => monthKey(x.date) === monthKey(today())), (x) => x.amount))}</div></div>
      <div class="stat"><div class="label">${year} so far</div><div class="value">${money(sum(yr, (x) => x.amount))}</div></div>
    </div>
    ${byCat.length ? html`<div class="card flat" style="margin-top:12px"><h3>${year} by category</h3>${bars(byCat)}</div>` : ''}
    ${Object.keys(months).length ? Object.entries(months).map(([m, xs]) => html`
      <div class="section"><h3 style="margin:0">${fmtMonth(m)}</h3><strong>${money(sum(xs, (x) => x.amount))}</strong></div>
      <div class="list">${xs.map((x) => expenseItem(x, { [d.horse.id]: d.horse }, d.providersById))}</div>`) : html`<div style="margin-top:12px">${empty('No costs logged yet.')}</div>`}`;
}

// ---------------- Documents ----------------
function docsTab(d) {
  const list = sortBy(d.docs, (x) => x.date || '', -1);
  return html`
    <div class="row between"><h2 style="margin:0">Documents</h2>${addBtn('doc', 'Add document', { horseId: d.horse.id }, 'primary sm')}</div>
    <p class="small muted" style="margin-top:6px">Passport pages, registration papers, certificates, insurance, x-rays. Stored on this device.</p>
    <div class="list">${list.length ? list.map((x) => html`
      <div class="item">
        <div style="font-size:1.4rem">${x.file?.type === 'application/pdf' ? '📕' : x.file ? raw(`<img src="${x.file.data}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px">`) : '📄'}</div>
        <div class="grow"><div class="title">${x.title}</div>
          <div class="meta">${x.category}${x.date ? ' · ' + fmtDate(x.date) : ''}${x.expires ? ' · expires ' + fmtDate(x.expires) : ''}</div></div>
        <div class="actions"><button class="sm" data-action="open-doc" data-id="${x.id}">View</button><button class="sm icon" data-action="edit" data-schema="doc" data-id="${x.id}" aria-label="Edit">✎</button></div>
      </div>`) : empty('No documents yet. Tip: photograph the passport ID and vaccination pages.')}</div>`;
}

// ---------------- Timeline ----------------
function timeline(d) {
  const items = [
    ...d.health.map((r) => ({ date: r.date, icon: healthIcon(r.type), text: `${r.type}${r.title ? ' – ' + r.title : ''}`, schema: 'health', id: r.id })),
    ...d.training.filter((t) => t.status === 'Done').map((t) => ({ date: t.date, icon: '🏇', text: `${t.type}${t.duration ? ' · ' + t.duration + ' min' : ''}`, schema: 'training', id: t.id })),
    ...d.events.map((e) => ({ date: e.date, icon: '🏆', text: `${e.name}${e.status === 'Completed' ? ' – ' + resultLine(e) : ' (' + e.status.toLowerCase() + ')'}`, schema: 'event', id: e.id })),
    ...d.expenses.map((x) => ({ date: x.date, icon: '💰', text: `${x.description || x.category} · ${money(x.amount)}`, schema: 'expense', id: x.id })),
    ...d.feed.map((f) => ({ date: f.startDate, icon: '🌾', text: `Started ${f.name}`, schema: 'feed', id: f.id })),
    ...d.docs.map((x) => ({ date: x.date, icon: '📄', text: `Document: ${x.title}`, schema: 'doc', id: x.id })),
  ].filter((i) => i.date && i.date <= today());
  const list = sortBy(items, (i) => i.date, -1).slice(0, 150);
  const byMonth = groupBy(list, (i) => monthKey(i.date));
  return html`
    <h2>Timeline</h2>
    ${list.length ? Object.entries(byMonth).map(([m, xs]) => html`
      <h3 class="muted small" style="margin:14px 0 8px">${fmtMonth(m)}</h3>
      <div class="timeline">${xs.map((i) => html`<div class="tl-item clickable" data-action="edit" data-schema="${i.schema}" data-id="${i.id}" style="cursor:pointer">
        <div class="tl-date">${fmtDate(i.date)}</div><div>${i.icon} ${i.text}</div></div>`)}</div>`) : empty('Nothing logged yet.')}`;
}

export function setFilter(name, value) { filters[name] = value; }
