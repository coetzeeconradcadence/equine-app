// Yard-wide feed ordering: a grid of horses × feeds (mirrors the paper/Excel order sheet many
// yards already keep), with totals, bags-per-period and cost worked out automatically from the
// feed catalog setup (scoop/bag sizes, measure type, price). The catalog itself (add/edit/delete)
// is the second tab.
import * as db from '../db.js';
import { html, esc, money, sum, sortBy } from '../util.js';
import { empty, addBtn, pill } from './components.js';
import { seedFeedCatalogIfEmpty } from '../feedseed.js';

const state = { tab: 'order' };
export const setFeedOrderTab = (t) => { state.tab = t; };
export const feedOrderTab = () => state.tab;

const qtyLabel = (c) => (c.measure === 'Weight (kg)' ? 'kg' : 'scoops');
const fmtQty = (n, c) => `${Number(n).toFixed(n % 1 ? 1 : 0)} ${qtyLabel(c)}`;

/** kg fed per day for one catalog feed, given the total daily quantity across all horses. */
function kgPerDay(totalQty, c) {
  return c.measure === 'Weight (kg)' ? totalQty : totalQty * Number(c.scoopSizeKg || 0);
}

function computeCatalogTotals(c, feedItems) {
  const items = feedItems.filter((f) => f.feedId === c.id && f.active !== false);
  const totalQty = sum(items, (f) => f.dailyQty);
  const kgDay = kgPerDay(totalQty, c);
  const bagSize = Number(c.bagSizeKg) || 0;
  const bagsPerWeek = bagSize ? (kgDay * 7) / bagSize : 0;
  const bagsPer2Weeks = bagsPerWeek * 2;
  const bagsPerMonth = bagSize ? (kgDay * 30) / bagSize : 0;
  const price = Number(c.pricePerBag) || 0;
  return {
    items, totalQty, kgDay, bagsPerWeek, bagsPer2Weeks, bagsPerMonth,
    costPerWeek: bagsPerWeek * price, costPer2Weeks: bagsPer2Weeks * price, costPerMonth: bagsPerMonth * price,
  };
}

export async function feedOrderView() {
  const seeded = await seedFeedCatalogIfEmpty();
  const [horses, feedItems, catalogAll] = await Promise.all([db.all('horses'), db.all('feed'), db.all('feedcatalog')]);
  const catalog = sortBy(catalogAll.filter((c) => c.active !== false), (c) => (c.name || '').toLowerCase());
  const tabs = html`<div class="tabs">
    <button class="tab ${state.tab === 'order' ? 'active' : ''}" data-action="fo-tab" data-v="order">Order</button>
    <button class="tab ${state.tab === 'catalog' ? 'active' : ''}" data-action="fo-tab" data-v="catalog">Feed catalog</button>
  </div>`;
  return html`
    <div class="page-head"><h1>🌾 Feed order</h1>
      ${state.tab === 'order' ? html`<button class="sm" data-action="fo-csv">⬇︎ CSV</button>` : addBtn('feedcatalog', 'Add feed', {}, 'primary sm')}
    </div>
    ${seeded ? html`<div class="callout small">Loaded a starter list of common South African horse feeds under the Feed catalog tab – edit sizes, prices and add your own.</div>` : ''}
    ${tabs}
    ${state.tab === 'order' ? await orderTab(horses, feedItems, catalog) : catalogTab(catalog)}`;
}

async function orderTab(horses, feedItems, catalog) {
  if (!horses.length) return empty('Add a horse first, then come back to set up feeding.');
  if (!catalog.length) return empty('No feeds in the catalog yet.', addBtn('feedcatalog', 'Add a feed', {}, 'primary'));
  const sortedHorses = sortBy(horses, (h) => h.name.toLowerCase());
  const totals = Object.fromEntries(catalog.map((c) => [c.id, computeCatalogTotals(c, feedItems)]));
  const grandCostMonth = sum(catalog, (c) => totals[c.id].costPerMonth);
  const grandCostWeek = sum(catalog, (c) => totals[c.id].costPerWeek);

  const cell = (h, c) => {
    const item = feedItems.find((f) => f.horseId === h.id && f.feedId === c.id && f.active !== false);
    if (item && item.dailyQty) {
      return html`<button class="linklike" data-action="edit" data-schema="feed" data-id="${item.id}">${fmtQty(item.dailyQty, c)}</button>`;
    }
    return addBtn('feed', '', { horseId: h.id, feedId: c.id, kind: 'Hard feed', name: c.name }, 'sm ghost');
  };

  return html`
    <p class="small muted" style="margin-top:8px">Tap a cell to edit that horse's daily amount, or ＋ to add it. Totals update automatically from the Feed catalog setup (scoop/bag size, measure, price).</p>
    <div class="table-wrap">
      <table class="feedorder">
        <thead><tr><th>Horse</th>${catalog.map((c) => html`<th>${c.name}${c.brand ? html`<div class="small muted">${c.brand}</div>` : ''}</th>`)}</tr></thead>
        <tbody>
          ${sortedHorses.map((h) => html`<tr><td><strong>${h.name}</strong></td>${catalog.map((c) => html`<td>${cell(h, c)}</td>`)}</tr>`)}
          <tr class="total-row"><th>Total ${qtyLabel(catalog[0])}/day</th>${catalog.map((c) => html`<td>${totals[c.id].totalQty ? fmtQty(totals[c.id].totalQty, c) : '–'}</td>`)}</tr>
          <tr class="total-row"><th>Total weight (kg/day)</th>${catalog.map((c) => html`<td>${totals[c.id].kgDay ? totals[c.id].kgDay.toFixed(2) : '–'}</td>`)}</tr>
          <tr><th>Bags / week</th>${catalog.map((c) => html`<td>${totals[c.id].bagsPerWeek ? totals[c.id].bagsPerWeek.toFixed(1) : '–'}</td>`)}</tr>
          <tr><th>Bags / 2 weeks</th>${catalog.map((c) => html`<td>${totals[c.id].bagsPer2Weeks ? totals[c.id].bagsPer2Weeks.toFixed(1) : '–'}</td>`)}</tr>
          <tr><th>Bags / month</th>${catalog.map((c) => html`<td>${totals[c.id].bagsPerMonth ? totals[c.id].bagsPerMonth.toFixed(1) : '–'}</td>`)}</tr>
          <tr><th>Bags to order now <span class="small muted">(rounds up)</span></th>${catalog.map((c) => html`<td><strong>${totals[c.id].bagsPer2Weeks ? Math.ceil(totals[c.id].bagsPer2Weeks) : '–'}</strong><span class="small muted"> /2wk</span></td>`)}</tr>
          <tr class="total-row"><th>Cost / week</th>${catalog.map((c) => html`<td>${totals[c.id].costPerWeek ? money(totals[c.id].costPerWeek) : '–'}</td>`)}</tr>
          <tr class="total-row"><th>Cost / month</th>${catalog.map((c) => html`<td>${totals[c.id].costPerMonth ? money(totals[c.id].costPerMonth) : '–'}</td>`)}</tr>
        </tbody>
      </table>
    </div>
    <div class="stats" style="margin-top:12px">
      <div class="stat"><div class="label">Total feed cost / week</div><div class="value">${money(grandCostWeek)}</div></div>
      <div class="stat"><div class="label">Total feed cost / month</div><div class="value">${money(grandCostMonth)}</div></div>
    </div>`;
}

function catalogTab(catalog) {
  if (!catalog.length) return empty('No feeds in the catalog yet.', addBtn('feedcatalog', 'Add a feed', {}, 'primary'));
  return html`
    <p class="small muted" style="margin-top:8px">This is your yard's list of feeds, sizes and prices – it drives the Order tab and the amount-per-day field on each horse's Feeding tab.</p>
    <div class="list">${catalog.map((c) => html`
      <div class="item clickable" data-action="edit" data-schema="feedcatalog" data-id="${c.id}">
        <div class="grow">
          <div class="title">${c.name}${c.brand ? html` <span class="small muted">– ${c.brand}</span>` : ''}</div>
          <div class="meta">${c.category || ''} · ${c.measure === 'Weight (kg)' ? 'weighed (kg)' : `scoop = ${c.scoopSizeKg ?? '?'} kg`} · bag = ${c.bagSizeKg ?? '?'} kg${c.pricePerBag ? ' · ' + money(c.pricePerBag) + '/bag' : ''}</div>
        </div>
        ${pill(c.measure === 'Weight (kg)' ? 'Weight' : 'Scoops', 'info')}
      </div>`)}</div>`;
}

export async function feedOrderCsv() {
  const [horses, feedItems, catalogAll] = await Promise.all([db.all('horses'), db.all('feed'), db.all('feedcatalog')]);
  const catalog = sortBy(catalogAll.filter((c) => c.active !== false), (c) => (c.name || '').toLowerCase());
  const sortedHorses = sortBy(horses, (h) => h.name.toLowerCase());
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = [['Horse', ...catalog.map((c) => c.name)]];
  for (const h of sortedHorses) {
    rows.push([h.name, ...catalog.map((c) => {
      const item = feedItems.find((f) => f.horseId === h.id && f.feedId === c.id && f.active !== false);
      return item?.dailyQty ?? '';
    })]);
  }
  const totals = Object.fromEntries(catalog.map((c) => [c.id, computeCatalogTotals(c, feedItems)]));
  rows.push([`Total ${qtyLabel(catalog[0] || {})}/day`, ...catalog.map((c) => totals[c.id].totalQty || '')]);
  rows.push(['Total weight (kg/day)', ...catalog.map((c) => totals[c.id].kgDay.toFixed(2))]);
  rows.push(['Bags / week', ...catalog.map((c) => totals[c.id].bagsPerWeek.toFixed(1))]);
  rows.push(['Bags / 2 weeks', ...catalog.map((c) => totals[c.id].bagsPer2Weeks.toFixed(1))]);
  rows.push(['Bags / month', ...catalog.map((c) => totals[c.id].bagsPerMonth.toFixed(1))]);
  rows.push(['Cost / week', ...catalog.map((c) => totals[c.id].costPerWeek.toFixed(2))]);
  rows.push(['Cost / month', ...catalog.map((c) => totals[c.id].costPerMonth.toFixed(2))]);
  return rows.map((r) => r.map(q).join(',')).join('\n');
}
