import * as db from '../db.js';
import { html, today, money, sum, monthKey, sortBy, parse } from '../util.js';
import { loadAll, computeDue } from '../due.js';
import { ahsTravel } from '../ahs.js';
import { avatar, pill, dueItem, empty, addBtn } from './components.js';
import { APP } from '../config.js';

export async function homeView() {
  const data = await loadAll();
  const [expenses, providers] = await Promise.all([db.all('expenses'), db.all('providers')]);
  const horses = sortBy(data.horses, (h) => h.name.toLowerCase());
  const byId = Object.fromEntries(horses.map((h) => [h.id, h]));
  const due = computeDue(data, { horizon: 21 });
  const overdue = due.filter((i) => i.date < today()).length;
  const thisMonth = sum(expenses.filter((x) => monthKey(x.date) === monthKey(today())), (x) => x.amount);
  const year = String(parse(today()).getFullYear());
  const thisYear = sum(expenses.filter((x) => String(x.date).startsWith(year)), (x) => x.amount);
  const upcomingEvents = data.events.filter((e) => e.status === 'Entered' && e.date >= today()).length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (!horses.length) {
    return html`
      <div class="stack">
        <div class="card">
          <h1>Welcome to ${APP.name} 🐴</h1>
          <p class="muted">${APP.tagline}</p>
          <p>Start by adding your first horse. You can also load demo horses to explore.</p>
          <div class="row">
            ${addBtn('horse', 'Add your first horse', {}, 'primary')}
            <button data-action="load-demo">Load demo data</button>
          </div>
        </div>
        <div class="card flat">
          <h2>What you can do</h2>
          <ul>
            <li>Health records with smart due-date reminders (vaccines, farrier, dentist, deworming)</li>
            <li><strong>AHS travel-ready check</strong> – know if your horse can travel to a Western Cape show</li>
            <li>Feeding plans & a printable yard feed board</li>
            <li>Training log, shows & results, costs per horse</li>
            <li>Documents, contacts, printable horse passport, and an AI helper that reads your records</li>
          </ul>
        </div>
      </div>`;
  }

  return html`
    <div class="page-head"><h1>${greet} 👋</h1></div>
    <div class="stats">
      <a class="stat" href="#/reminders" style="text-decoration:none;color:inherit"><div class="label">Due in 3 weeks</div><div class="value">${due.length}${overdue ? html` <span class="pill bad">${overdue} overdue</span>` : ''}</div></a>
      <a class="stat" href="#/expenses" style="text-decoration:none;color:inherit"><div class="label">Spent this month</div><div class="value">${money(thisMonth)}</div></a>
      <a class="stat" href="#/expenses" style="text-decoration:none;color:inherit"><div class="label">Spent in ${year}</div><div class="value">${money(thisYear)}</div></a>
      <a class="stat" href="#/events" style="text-decoration:none;color:inherit"><div class="label">Upcoming shows</div><div class="value">${upcomingEvents}</div></a>
    </div>

    <div class="section"><h2>Your horses</h2>${addBtn('horse', 'Horse')}</div>
    <div class="grid two">
      ${horses.map((h) => {
        const st = ahsTravel(data.health.filter((r) => r.horseId === h.id));
        const n = due.filter((i) => i.horseId === h.id).length;
        return html`
          <a class="card horse-card" href="#/horse/${h.id}">
            ${avatar(h)}
            <div class="grow">
              <h3>${h.name}</h3>
              <div class="small muted">${[h.breed, h.discipline].filter(Boolean).join(' · ')}</div>
              <div class="row" style="margin-top:6px">${pill('AHS: ' + st.short, st.tone)} ${n ? pill(`${n} due`, 'warn') : pill('All up to date', 'good')}</div>
            </div>
          </a>`;
      })}
    </div>

    <div class="section"><h2>Coming up</h2><a href="#/reminders" class="small">See all</a></div>
    <div class="list">
      ${due.length ? due.slice(0, 8).map((i) => dueItem(i, byId)) : empty('Nothing due in the next 3 weeks. 🎉')}
    </div>

    <div class="section"><h2>Quick add</h2></div>
    <div class="row">
      ${addBtn('health', 'Health')} ${addBtn('training', 'Ride / training')} ${addBtn('expense', 'Expense')}
      ${addBtn('event', 'Show')} ${addBtn('reminder', 'Reminder')}
    </div>`;
}
