import * as db from '../db.js';
import { html, raw, fmtDate, ageFrom, sortBy, today } from '../util.js';
import { ahsTravel, AHS_DISCLAIMER } from '../ahs.js';
import { resultLine, avatar } from './components.js';
import { FEED_TIMES } from '../schemas.js';
import { APP } from '../config.js';

const SECTIONS = { id: 'Identification', vacc: 'Vaccinations', health: 'Recent health (12 months)', feed: 'Feeding', results: 'Results', contacts: 'Care team' };
const printState = { id: true, vacc: true, health: true, feed: true, results: true, contacts: true };
export const togglePrint = (k) => { printState[k] = !printState[k]; };

export async function printView(id) {
  const horse = await db.get('horses', id);
  if (!horse) return html`<div class="empty">Horse not found.</div>`;
  const [health, feed, events, providers] = await Promise.all(['health', 'feed', 'events', 'providers'].map((s) => db.all(s)));
  const hh = health.filter((r) => r.horseId === id);
  const travel = ahsTravel(hh);
  const vaccs = sortBy(hh.filter((r) => /vaccination/i.test(r.type)), (r) => r.date, -1).slice(0, 20);
  const yearAgo = String(Number(today().slice(0, 4)) - 1) + today().slice(4);
  const recent = sortBy(hh.filter((r) => !/vaccination/i.test(r.type) && r.date >= yearAgo), (r) => r.date, -1);
  const feeds = feed.filter((f) => f.horseId === id && f.active !== false);
  const results = sortBy(events.filter((e) => e.horseId === id && e.status === 'Completed'), (e) => e.date, -1).slice(0, 10);
  const pById = Object.fromEntries(providers.map((p) => [p.id, p]));
  const usedProviders = [...new Set(hh.map((r) => r.providerId).filter(Boolean))].map((pid) => pById[pid]).filter(Boolean);
  const on = (k) => printState[k];

  return html`
    <div class="no-print card flat" style="margin-bottom:12px">
      <div class="row between"><a href="#/horse/${id}">‹ Back to ${horse.name}</a>
        <button class="primary" data-action="print">🖨️ Print / Save as PDF</button></div>
      <p class="small muted" style="margin:8px 0">Choose what to include, then print or “Save as PDF” to send to a vet, buyer, show organiser or insurer.</p>
      <div class="checks">${Object.entries(SECTIONS).map(([k, label]) => html`<label><input type="checkbox" data-action="toggle-print" data-k="${k}" ${on(k) ? 'checked' : ''}> ${label}</label>`)}</div>
    </div>

    <article class="card" style="max-width:800px;margin:0 auto">
      <div class="row between" style="align-items:flex-start">
        <div class="row" style="gap:14px">${avatar(horse, 'lg')}
          <div><h1 style="margin:0">${horse.name}</h1>${horse.showName ? html`<div>${horse.showName}</div>` : ''}
          <div class="muted">${[horse.breed, horse.colour, horse.sex, horse.dob ? ageFrom(horse.dob) : '', horse.height ? horse.height + 'hh' : ''].filter(Boolean).join(' · ')}</div></div></div>
        <div class="small muted" style="text-align:right">Horse record<br>printed ${fmtDate(today())}<br>${APP.name}</div>
      </div>
      ${horse.alerts ? html`<div class="callout bad" style="margin-top:12px">⚠️ ${horse.alerts}</div>` : ''}

      ${on('id') ? html`<h2 style="margin-top:16px">Identification</h2><table><tbody>
        ${[['Microchip', horse.microchip], ['Passport no.', horse.passportNo], ['SAEF / society no.', horse.saefNo], ['Date of birth', fmtDate(horse.dob)], ['Markings', horse.markings], ['Owner', horse.owner], ['Yard', horse.yard]]
          .filter(([, v]) => v).map(([k, v]) => html`<tr><th style="width:35%">${k}</th><td>${v}</td></tr>`)}
        <tr><th>AHS travel status</th><td><strong>${travel.short}</strong> – ${travel.detail}</td></tr></tbody></table>` : ''}

      ${on('vacc') ? html`<h2 style="margin-top:16px">Vaccinations</h2>${vaccs.length ? html`<table><thead><tr><th>Date</th><th>Vaccine</th><th>Product / batch</th><th>By</th><th>Next due</th></tr></thead><tbody>
        ${vaccs.map((r) => html`<tr><td class="nowrap">${fmtDate(r.date)}</td><td>${r.type.replace(' vaccination', '')}</td><td>${[r.product, r.batch].filter(Boolean).join(' / ')}</td><td>${pById[r.providerId]?.name || ''}</td><td class="nowrap">${fmtDate(r.nextDue)}</td></tr>`)}</tbody></table>` : html`<p class="muted">None recorded.</p>`}` : ''}

      ${on('health') ? html`<h2 style="margin-top:16px">Recent health</h2>${recent.length ? html`<table><thead><tr><th>Date</th><th>Type</th><th>Details</th></tr></thead><tbody>
        ${recent.map((r) => html`<tr><td class="nowrap">${fmtDate(r.date)}</td><td>${r.type}</td><td>${[r.title, r.product, r.dose, r.notes].filter(Boolean).join(' · ')}</td></tr>`)}</tbody></table>` : html`<p class="muted">Nothing in the last 12 months.</p>`}` : ''}

      ${on('feed') ? html`<h2 style="margin-top:16px">Feeding</h2>${feeds.length ? html`<table><thead><tr><th>Feed</th>${FEED_TIMES.map((t) => html`<th>${t}</th>`)}<th>Notes</th></tr></thead><tbody>
        ${feeds.map((f) => html`<tr><td>${f.name}</td>${FEED_TIMES.map((t) => html`<td>${(f.times || []).includes(t) ? f.amount || '✓' : ''}</td>`)}<td>${f.notes}</td></tr>`)}</tbody></table>` : html`<p class="muted">No feeding plan.</p>`}` : ''}

      ${on('results') ? html`<h2 style="margin-top:16px">Recent results</h2>${results.length ? html`<table><thead><tr><th>Date</th><th>Event</th><th>Class</th><th>Result</th></tr></thead><tbody>
        ${results.map((e) => html`<tr><td class="nowrap">${fmtDate(e.date)}</td><td>${e.name}</td><td>${[e.discipline, e.level].filter(Boolean).join(' ')}</td><td>${resultLine(e)}</td></tr>`)}</tbody></table>` : html`<p class="muted">No results recorded.</p>`}` : ''}

      ${on('contacts') && usedProviders.length ? html`<h2 style="margin-top:16px">Care team</h2><table><tbody>
        ${usedProviders.map((p) => html`<tr><th style="width:35%">${p.role}</th><td>${p.name}${p.practice ? ', ' + p.practice : ''}${p.phone ? ' · ' + p.phone : ''}</td></tr>`)}</tbody></table>` : ''}

      <p class="small muted" style="margin-top:16px">Owner-maintained record. ${AHS_DISCLAIMER}</p>
    </article>`;
}

export async function feedboardView() {
  const [horses, feed] = await Promise.all([db.all('horses'), db.all('feed')]);
  const list = sortBy(horses, (h) => h.name.toLowerCase());
  return html`
    <div class="no-print row between" style="margin-bottom:12px"><h1 style="margin:0">Yard feed board</h1><button class="primary" data-action="print">🖨️ Print</button></div>
    <p class="no-print small muted">Print this and pin it up in the feed room. It updates whenever you change a feeding plan.</p>
    <h1 class="print-only">Feed board – ${fmtDate(today())}</h1>
    ${list.length ? html`<div class="table-wrap"><table class="feedboard">
      <thead><tr><th>Horse</th>${FEED_TIMES.map((t) => html`<th>${t}</th>`)}<th>Notes</th></tr></thead>
      <tbody>${list.map((h) => {
        const fs = feed.filter((f) => f.horseId === h.id && f.active !== false);
        return html`<tr><td><strong>${h.name}</strong>${h.alerts ? html`<div class="small" style="color:var(--bad)">⚠ ${h.alerts}</div>` : ''}</td>
          ${FEED_TIMES.map((t) => html`<td>${fs.filter((f) => (f.times || []).includes(t)).map((f) => html`<div>${f.name}${f.amount ? html` – <strong>${f.amount}</strong>` : ''}</div>`)}</td>`)}
          <td class="small">${fs.map((f) => f.notes).filter(Boolean).join('; ')}</td></tr>`;
      })}</tbody></table></div>` : html`<div class="empty">No horses yet.</div>`}`;
}
