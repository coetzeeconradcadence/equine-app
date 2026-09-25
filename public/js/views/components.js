import { html, raw, fmtDate, fmtShort, relDays, money, esc } from '../util.js';
import { healthIcon } from '../schemas.js';
import { dueTone } from '../due.js';

export const avatar = (h, cls = '') =>
  html`<div class="avatar ${cls}">${h && h.photo ? raw(`<img src="${h.photo}" alt="">`) : '🐴'}</div>`;

export const pill = (text, tone = '') => html`<span class="pill ${tone}">${text}</span>`;

export const empty = (msg, btn = '') => html`<div class="empty"><p>${msg}</p>${raw(btn)}</div>`;

export const addBtn = (schema, label, preset = {}, cls = 'sm') =>
  html`<button class="${cls}" data-action="add" data-schema="${schema}" data-preset='${raw(esc(JSON.stringify(preset)))}'>＋ ${label}</button>`;

export function dueItem(i, horsesById, { showHorse = true } = {}) {
  const h = horsesById[i.horseId];
  const tone = i.tone || dueTone(i.date);
  const btn = {
    health: html`<button class="sm" data-action="due-log" data-key="${i.key}">Log done</button>`,
    reminder: html`<button class="sm" data-action="due-done" data-key="${i.key}">Done</button>`,
    event: html`<button class="sm" data-action="edit" data-schema="event" data-id="${i.ref.id}">Open</button>`,
    result: html`<button class="sm primary" data-action="due-result" data-key="${i.key}">Add result</button>`,
    doc: html`<button class="sm" data-action="open-doc" data-id="${i.ref.id}">View</button>`,
    ahs: html`<button class="sm" data-action="add" data-schema="health" data-preset='${raw(esc(JSON.stringify({ horseId: i.horseId, type: 'AHS vaccination' })))}'>Log</button>`,
  }[i.kind];
  return html`
    <div class="item">
      <div style="font-size:1.4rem">${i.icon}</div>
      <div class="grow">
        <div class="title">${showHorse && h ? h.name + ' · ' : ''}${i.title}</div>
        <div class="meta">${i.sub}</div>
        <div class="row" style="margin-top:4px">
          ${pill(i.kind === 'ahs' ? 'Now' : relDays(i.date), tone)}
          <span class="small muted">${fmtDate(i.date)}</span>
          ${i.travel ? pill(i.travel.travel ? '✓ AHS travel-ready' : '⚠ AHS: ' + i.travel.short, i.travel.tone) : ''}
        </div>
      </div>
      <div class="actions">${btn}</div>
    </div>`;
}

export function healthItem(r, providersById) {
  const p = providersById[r.providerId];
  return html`
    <div class="item clickable" data-action="edit" data-schema="health" data-id="${r.id}">
      <div style="font-size:1.4rem">${healthIcon(r.type)}</div>
      <div class="grow">
        <div class="title">${r.type}${r.title ? ' – ' + r.title : ''}</div>
        <div class="meta">${fmtDate(r.date)}${p ? ' · ' + p.name : ''}${r.product ? ' · ' + r.product : ''}${r.cost ? ' · ' + money(r.cost) : ''}</div>
        ${r.nextDue ? html`<div class="meta">Next due ${fmtDate(r.nextDue)}</div>` : ''}
        ${r.notes ? html`<div class="meta">${r.notes}</div>` : ''}
      </div>
      ${r.photo ? raw(`<img src="${r.photo}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px">`) : ''}
    </div>`;
}

export function resultLine(e) {
  const bits = [];
  if (e.placing) bits.push(ordinal(e.placing));
  if (e.score != null && e.score !== '') bits.push(`${e.score}%`);
  if (e.faults != null && e.faults !== '') bits.push(`${e.faults} faults`);
  if (e.clear) bits.push('clear');
  if (e.time) bits.push(`${e.time}s`);
  if (e.height) bits.push(`${e.height}m`);
  return bits.join(' · ');
}
export function ordinal(n) {
  n = Number(n); const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function eventItem(e, horsesById, { showHorse = false } = {}) {
  const h = horsesById[e.horseId];
  const tone = e.status === 'Completed' ? 'good' : e.status === 'Withdrawn' ? '' : 'info';
  return html`
    <div class="item clickable" data-action="edit" data-schema="event" data-id="${e.id}">
      <div style="font-size:1.4rem">${e.status === 'Completed' ? (Number(e.placing) === 1 ? '🥇' : Number(e.placing) === 2 ? '🥈' : Number(e.placing) === 3 ? '🥉' : '🏅') : '🏆'}</div>
      <div class="grow">
        <div class="title">${showHorse && h ? h.name + ' · ' : ''}${e.name}</div>
        <div class="meta">${fmtDate(e.date)} · ${[e.discipline, e.level, e.venue].filter(Boolean).join(' · ')}</div>
        <div class="row" style="margin-top:4px">${pill(e.status, tone)} ${e.status === 'Completed' ? html`<strong class="small">${resultLine(e)}</strong>` : ''}
          ${e.wcControlled ? pill('WC AHS zone', 'warn') : ''}</div>
        ${e.notes ? html`<div class="meta" style="margin-top:4px">${e.notes}</div>` : ''}
      </div>
    </div>`;
}

export function expenseItem(x, horsesById, providersById) {
  const h = horsesById[x.horseId]; const p = providersById[x.providerId];
  return html`
    <div class="item clickable" data-action="edit" data-schema="expense" data-id="${x.id}">
      <div class="grow">
        <div class="title">${x.description || x.category}</div>
        <div class="meta">${fmtShort(x.date)} · ${x.category}${h ? ' · ' + h.name : ' · Shared'}${p ? ' · ' + p.name : ''}${x.recurring === 'Monthly' ? ' · monthly' : ''}</div>
      </div>
      <strong class="nowrap">${money(x.amount)}</strong>
    </div>`;
}

export function trainingItem(t) {
  const tone = t.status === 'Done' ? 'good' : t.status === 'Skipped' ? 'bad' : 'info';
  return html`
    <div class="item clickable" data-action="edit" data-schema="training" data-id="${t.id}">
      <div class="grow">
        <div class="title">${t.type} ${t.feel ? html`<span class="small">${t.feel}</span>` : ''}</div>
        <div class="meta">${fmtDate(t.date, { weekday: 'short', day: 'numeric', month: 'short' })}${t.duration ? ' · ' + t.duration + ' min' : ''}${t.intensity ? ' · ' + t.intensity : ''}${t.rider ? ' · ' + t.rider : ''}</div>
        ${t.notes ? html`<div class="meta">${t.notes}</div>` : ''}
      </div>
      ${pill(t.status, tone)}
    </div>`;
}

/** Tiny SVG sparkline for a list of numbers (oldest -> newest). */
export function sparkline(values) {
  const v = values.filter((x) => x != null && !isNaN(x)).map(Number);
  if (v.length < 2) return '';
  const w = 300, h = 48, pad = 4;
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  const pts = v.map((y, i) => [pad + (i * (w - 2 * pad)) / (v.length - 1), h - pad - ((y - min) / span) * (h - 2 * pad)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return raw(`<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Trend"><path d="${d}"/>${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3"/>`).join('')}</svg>`);
}

export function bars(rows) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return html`${rows.map((r) => html`<div class="bar-row"><span>${r.label}</span><div class="bar"><i style="width:${(r.value / max) * 100}%"></i></div><strong class="nowrap">${money(r.value)}</strong></div>`)}`;
}
