// Builds the "what's due" list from every source: health next-due dates, manual reminders,
// upcoming events, expiring documents and the AHS season.
import * as db from './db.js';
import { healthIcon, REPEAT_STEP } from './schemas.js';
import { ahsSeason, ahsTravel } from './ahs.js';
import { today, addDays, diffDays, groupBy } from './util.js';
import { APP } from './config.js';

export async function loadAll() {
  const [horses, health, reminders, events, docs] = await Promise.all(
    ['horses', 'health', 'reminders', 'events', 'docs'].map((s) => db.all(s)));
  return { horses, health, reminders, events, docs };
}

export function computeDue({ horses, health, reminders, events, docs }, { horizon = 60 } = {}) {
  const t = today();
  const limit = addDays(t, horizon);
  const horseIds = new Set(horses.map((h) => h.id));
  const items = [];

  // Health: only the latest record of each type per horse counts
  const groups = groupBy(health.filter((r) => horseIds.has(r.horseId)), (r) => r.horseId + '|' + r.type);
  for (const recs of Object.values(groups)) {
    const latest = recs.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (latest.nextDue) items.push({ kind: 'health', key: 'h' + latest.id, date: latest.nextDue, horseId: latest.horseId, icon: healthIcon(latest.type), title: latest.type, sub: latest.title || '', ref: latest });
  }
  for (const r of reminders) {
    if (r.done) continue;
    items.push({ kind: 'reminder', key: 'r' + r.id, date: r.date, horseId: r.horseId, icon: '🔔', title: r.title, sub: r.repeat && r.repeat !== 'Never' ? `Repeats ${r.repeat.toLowerCase()}` : '', ref: r });
  }
  for (const e of events) {
    if (e.status !== 'Entered' || e.date < t) continue;
    const travel = e.wcControlled ? ahsTravel(health.filter((h) => h.horseId === e.horseId), e.date) : null;
    items.push({ kind: 'event', key: 'e' + e.id, date: e.date, horseId: e.horseId, icon: '🏆', title: e.name, sub: [e.discipline, e.level, e.venue].filter(Boolean).join(' · '), ref: e, travel });
  }
  // events in the past still marked "Entered" -> prompt for a result
  for (const e of events) {
    if (e.status === 'Entered' && e.date < t && diffDays(e.date, t) <= 30) {
      items.push({ kind: 'result', key: 'x' + e.id, date: e.date, horseId: e.horseId, icon: '📝', title: `Add result: ${e.name}`, sub: e.discipline, ref: e });
    }
  }
  for (const d of docs) {
    if (!d.expires) continue;
    items.push({ kind: 'doc', key: 'd' + d.id, date: d.expires, horseId: d.horseId, icon: '📄', title: `${d.title} expires`, sub: d.category, ref: d });
  }
  for (const h of horses) {
    const s = ahsSeason(h, health.filter((r) => r.horseId === h.id));
    if (s.state === 'due' || s.state === 'missed') {
      items.push({ kind: 'ahs', key: 'a' + h.id, date: s.date, horseId: h.id, icon: '🦟', title: 'Annual AHS vaccination', sub: s.label, tone: s.tone, ref: h });
    }
  }
  return items
    .filter((i) => i.date && i.date <= limit)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export const dueTone = (date) => {
  const n = diffDays(today(), date);
  return n < 0 ? 'bad' : n <= 7 ? 'warn' : 'info';
};

/** Complete a manual reminder: roll forward if repeating, else mark done. */
export async function completeReminder(r) {
  const step = REPEAT_STEP[r.repeat];
  if (step) {
    let next = step(r.date);
    while (next < today()) next = step(next);
    await db.put('reminders', { ...r, date: next, lastDone: today() });
  } else {
    await db.put('reminders', { ...r, done: true, lastDone: today() });
  }
}

// ---------- Calendar (.ics) export ----------
const icsEsc = (s) => String(s || '').replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
const icsDate = (d) => d.replace(/-/g, '');
export function toIcs(items, horseName = () => '') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${APP.name}//EN`, 'CALSCALE:GREGORIAN'];
  for (const i of items) {
    const name = horseName(i.horseId);
    lines.push('BEGIN:VEVENT', `UID:${i.key}@${APP.name.toLowerCase()}`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(i.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(i.date, 1))}`,
      `SUMMARY:${icsEsc((name ? name + ': ' : '') + i.title)}`, `DESCRIPTION:${icsEsc(i.sub)}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(i.title)}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
