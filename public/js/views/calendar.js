// Month planner. Reads the same data every other view writes to (health, reminders, events,
// docs, AHS season) via due.js's calendarEntries() – add a show or a farrier visit anywhere in
// the app and it just appears here next time this renders, no extra wiring needed.
import { html, raw, esc, today, parse, iso, addMonths, fmtDate, fmtMonth, monthKey, groupBy, sortBy } from '../util.js';
import { loadAll, calendarEntries, CALENDAR_KINDS } from '../due.js';

const state = { month: monthKey(today()) };
export const setCalMonth = (delta) => {
  state.month = delta === 0 ? monthKey(today()) : monthKey(addMonths(state.month + '-01', delta));
};
export const calMonth = () => state.month;

function buildGrid(mk) {
  const first = parse(mk + '-01');
  const startDow = (first.getDay() + 6) % 7; // Monday = 0, so SA-style weeks start Monday
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(iso(new Date(first.getFullYear(), first.getMonth(), d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export async function calendarView() {
  const data = await loadAll();
  const horsesById = Object.fromEntries(data.horses.map((h) => [h.id, h]));
  const items = calendarEntries(data);
  const byDate = groupBy(items, (i) => i.date);
  const cells = buildGrid(state.month);
  const todayStr = today();
  const monthItems = items.filter((i) => i.date.startsWith(state.month));

  return html`
    <div class="page-head"><h1>📅 Calendar</h1>
      <div class="row">
        <button class="sm" data-action="cal-nav" data-v="-1" aria-label="Previous month">‹</button>
        <button class="sm" data-action="cal-nav" data-v="0">Today</button>
        <button class="sm" data-action="cal-nav" data-v="1" aria-label="Next month">›</button>
      </div></div>
    <h2 style="margin:4px 0 10px">${fmtMonth(state.month)}</h2>
    <div class="cal-grid">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => html`<div class="cal-dow">${d}</div>`)}
      ${cells.map((date) => {
        if (!date) return html`<div class="cal-cell empty"></div>`;
        const dayItems = sortBy(byDate[date] || [], (i) => i.kind);
        // Hover tooltip lists every item on this day, one line each, so you don't have to open it to see what's on.
        const tooltip = dayItems.map((i) => `${i.icon} ${horsesById[i.horseId] ? horsesById[i.horseId].name + ': ' : ''}${i.title}${i.sub ? ' – ' + i.sub : ''}`).join('\n');
        const attrs = dayItems.length ? `data-action="cal-day" data-date="${esc(date)}" title="${esc(tooltip)}"` : '';
        const icons = dayItems.slice(0, 3);
        const label = dayItems[0] ? (horsesById[dayItems[0].horseId] ? horsesById[dayItems[0].horseId].name + ': ' : '') + dayItems[0].title : '';
        return html`<div class="cal-cell ${date === todayStr ? 'today' : ''} ${dayItems.length ? 'clickable' : ''}" ${raw(attrs)}>
          <div class="cal-daynum">${Number(date.slice(8))}</div>
          ${dayItems.length ? html`
            <div class="cal-icons">${icons.map((i) => html`<span>${i.icon}</span>`)}${dayItems.length > 3 ? html`<span class="cal-more">+${dayItems.length - 3}</span>` : ''}</div>
            <div class="cal-label">${label}</div>` : ''}
        </div>`;
      })}
    </div>
    <div class="row small muted" style="margin-top:14px;flex-wrap:wrap;gap:10px">
      ${Object.entries(CALENDAR_KINDS).map(([, v]) => html`<span class="row" style="gap:5px"><span>${v.icon}</span>${v.label}</span>`)}
    </div>
    <p class="small muted" style="margin-top:6px">Tip: on a computer, hover over a day to see everything on it. On a phone, tap the day to open the same list.</p>
    ${!monthItems.length ? html`<p class="muted small" style="margin-top:16px">Nothing planned this month yet – shows, reminders, health next-due dates (including the farrier) and the AHS season all show up here automatically.</p>` : ''}`;
}

/** Body HTML for the "what's on this day" sheet. Buttons use data-cal-item (not data-action) –
 * see app.js's 'cal-day' handler, which binds them manually because dialog content is excluded
 * from the app-wide data-action click delegation (matches the pattern openSheet() elsewhere uses). */
export async function calendarDayBody(date) {
  const data = await loadAll();
  const horsesById = Object.fromEntries(data.horses.map((h) => [h.id, h]));
  const items = sortBy(calendarEntries(data).filter((i) => i.date === date), (i) => i.kind);
  if (!items.length) return String(html`<p class="muted">Nothing on this day.</p>`);
  const editable = { health: 'health', due: 'health', event: 'event', reminder: 'reminder', doc: 'doc' };
  return String(html`<div class="list">${items.map((i) => html`
    <div class="item ${editable[i.kind] ? 'clickable' : ''}" ${raw(editable[i.kind] ? `data-cal-item data-kind="${esc(i.kind)}" data-id="${esc(i.ref.id)}"` : '')}>
      <div style="font-size:1.3rem">${i.icon}</div>
      <div class="grow">
        <div class="title">${horsesById[i.horseId] ? horsesById[i.horseId].name + ' · ' : ''}${i.title}</div>
        <div class="meta">${i.sub}</div>
      </div>
    </div>`)}</div>`);
}
