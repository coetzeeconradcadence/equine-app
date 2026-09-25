import * as db from '../db.js';
import { html } from '../util.js';
import { APP } from '../config.js';

export async function settingsView() {
  const currency = await db.getSetting('currency', APP.defaultCurrency);
  const theme = await db.getSetting('theme', 'auto');
  const counts = {};
  for (const s of ['horses', 'health', 'feed', 'training', 'events', 'expenses', 'providers', 'docs', 'reminders', 'posts']) counts[s] = (await db.all(s)).length;
  let estimate = '';
  try { if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); estimate = `${(e.usage / 1048576).toFixed(1)} MB used`; } } catch {}
  return html`
    <h1>Settings</h1>
    <div class="stack">
      <div class="card">
        <h2>Preferences</h2>
        <div class="form-grid">
          <div class="field"><label>Currency</label>
            <select data-action-change="set-currency">${['ZAR', 'USD', 'EUR', 'GBP', 'AUD', 'NZD', 'NAD', 'BWP'].map((c) => html`<option ${c === currency ? 'selected' : ''}>${c}</option>`)}</select></div>
          <div class="field"><label>Theme</label>
            <select data-action-change="set-theme">${[['auto', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => html`<option value="${v}" ${v === theme ? 'selected' : ''}>${l}</option>`)}</select></div>
        </div>
      </div>

      <div class="card">
        <h2>Your data</h2>
        <p class="small muted">Everything is stored on this device ${db.persistent ? '' : html`<strong style="color:var(--bad)">(storage blocked – not saved!)</strong>`} ${estimate ? '· ' + estimate : ''}.
          Back up regularly until the cloud sync version arrives.</p>
        <table class="small"><tbody>${Object.entries(counts).map(([k, v]) => html`<tr><th>${k}</th><td class="num">${v}</td></tr>`)}</tbody></table>
        <div class="row" style="margin-top:12px">
          <button data-action="backup">⬇︎ Download backup</button>
          <label class="btn">⬆︎ Restore backup<input type="file" accept="application/json,.json" data-action-change="restore" hidden></label>
        </div>
      </div>

      <div class="card">
        <h2>Demo & reset</h2>
        <div class="row">
          <button data-action="load-demo">Load demo horses</button>
          <button class="danger" data-action="clear-all">Delete all data</button>
        </div>
      </div>

      <div class="card flat small muted">
        <strong>${APP.name}</strong> ${APP.version} · Built for South African horse owners.<br>
        Health reminders and AHS guidance are informational only and do not replace advice from your vet or the State Vet.
      </div>
    </div>`;
}
