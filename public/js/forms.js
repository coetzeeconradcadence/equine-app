// Generic schema-driven form in a bottom sheet.
import * as db from './db.js';
import { SCHEMAS, HEALTH_EXPENSE_CAT } from './schemas.js';
import { html, raw, esc, $, $$, imageToDataUrl, fileToDataUrl, toast, sortBy, getCurrency } from './util.js';

const sheet = () => document.getElementById('sheet');

/** Open arbitrary content in the sheet. bind(root) wires events. */
export function openSheet(title, body, bind) {
  const d = sheet();
  d.innerHTML = String(html`
    <div class="sheet-head"><h2>${title}</h2><button class="icon" data-close aria-label="Close">✕</button></div>
    <div class="sheet-body">${raw(body)}</div>`);
  d.querySelector('[data-close]').onclick = () => d.close();
  if (!d.open) d.showModal();
  bind && bind(d);
  return d;
}
export const closeSheet = () => sheet().open && sheet().close();

// close when tapping the backdrop
document.addEventListener('click', (e) => {
  const d = sheet();
  if (e.target === d) d.close();
});

function fieldHtml(f, v, ctx) {
  const id = 'f_' + f.k;
  const val = v[f.k];
  const common = `id="${id}" name="${f.k}" ${f.req ? 'required' : ''}`;
  let input = '';
  switch (f.type) {
    case 'textarea':
      input = `<textarea ${common} rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea>`; break;
    case 'select':
      input = `<select ${common}><option value="">— choose —</option>${f.options.map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`; break;
    case 'horse': {
      const opts = ctx.horses.map((h) => `<option value="${h.id}" ${h.id === val ? 'selected' : ''}>${esc(h.name)}</option>`).join('');
      input = `<select ${common}>${f.allowNone ? `<option value="">${esc(f.allowNone)}</option>` : (val ? '' : '<option value="">— choose horse —</option>')}${opts}</select>`;
      if (!ctx.horses.length && !f.allowNone) input += '<span class="hint">Add a horse first.</span>';
      break;
    }
    case 'provider': {
      const opts = ctx.providers.map((p) => `<option value="${p.id}" ${p.id === val ? 'selected' : ''}>${esc(p.name)} (${esc(p.role)})</option>`).join('');
      input = `<select ${common}><option value="">— none —</option>${opts}</select>`;
      if (!ctx.providers.length) input += '<span class="hint">Add your vet, farrier etc. under More → Contacts.</span>';
      break;
    }
    case 'feedcatalog': {
      const opts = ctx.feedCatalog.map((c) => `<option value="${c.id}" ${c.id === val ? 'selected' : ''}>${esc(c.name)}${c.brand ? ' – ' + esc(c.brand) : ''}</option>`).join('');
      input = `<select ${common}><option value="">${esc(f.allowNone || '— none —')}</option>${opts}</select>`;
      if (!ctx.feedCatalog.length) input += '<span class="hint">Add feeds under More → Feed catalog.</span>';
      break;
    }
    case 'multi':
      input = `<div class="checks">${f.options.map((o) => `<label><input type="checkbox" name="${f.k}" value="${esc(o)}" ${(val || []).includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>`; break;
    case 'checkbox': {
      const hintVal = typeof f.hint === 'function' ? f.hint(v, ctx) : f.hint;
      return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.k}"><div class="checks"><label><input type="checkbox" ${common} ${val ? 'checked' : ''}> ${esc(f.label)}</label></div>${f.hint ? `<span class="hint" data-hint="${f.k}">${esc(hintVal)}</span>` : ''}</div>`;
    }
    case 'photo':
      input = `<div class="row"><img class="photo-preview" data-preview="${f.k}" ${val ? `src="${val}"` : 'hidden'} alt="">
        <label class="btn sm">📷 ${val ? 'Change' : 'Add photo'}<input type="file" accept="image/*" data-photo="${f.k}" hidden></label>
        <button type="button" class="sm danger" data-clear="${f.k}" ${val ? '' : 'hidden'}>Remove</button></div>`; break;
    case 'file':
      input = `<div class="row"><span class="small muted" data-filename="${f.k}">${val ? esc(val.name) : 'No file chosen'}</span>
        <label class="btn sm">📎 Choose file<input type="file" accept="${f.accept || '*/*'}" data-file="${f.k}" hidden></label></div>`; break;
    case 'money':
      input = `<input ${common} type="number" inputmode="decimal" step="0.01" min="0" value="${esc(val)}" placeholder="${getCurrency()}" ${f.list ? `list="dl_${f.k}"` : ''}>`;
      if (f.list) input += `<datalist id="dl_${f.k}">${f.list.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`;
      break;
    case 'number':
      input = `<input ${common} type="number" inputmode="decimal" step="${f.step || 'any'}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" ${f.list ? `list="dl_${f.k}"` : ''}>`;
      if (f.list) input += `<datalist id="dl_${f.k}">${f.list.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`;
      break;
    default: {
      const type = ['date', 'url', 'tel', 'email'].includes(f.type) ? f.type : 'text';
      const list = f.list ? `list="dl_${f.k}"` : '';
      input = `<input ${common} type="${type}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" ${list}>`;
      if (f.list) input += `<datalist id="dl_${f.k}">${f.list.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`;
    }
  }
  const hintVal = typeof f.hint === 'function' ? f.hint(v, ctx) : f.hint;
  return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.k}">
    <label for="${id}">${esc(f.label)}${f.req ? ' *' : ''}</label>${input}
    ${f.hint && f.type !== 'checkbox' ? `<span class="hint" data-hint="${f.k}">${esc(hintVal)}</span>` : ''}</div>`;
}

function readValues(form, schema, blobs) {
  const v = {};
  for (const f of schema.fields) {
    if (f.type === 'photo' || f.type === 'file') { v[f.k] = blobs[f.k] ?? null; continue; }
    if (f.type === 'multi') { v[f.k] = $$(`input[name="${f.k}"]:checked`, form).map((i) => i.value); continue; }
    const el = form.elements[f.k];
    if (!el) continue;
    if (f.type === 'checkbox') v[f.k] = el.checked;
    else if (f.type === 'money' || f.type === 'number') v[f.k] = el.value === '' ? null : Number(el.value);
    else v[f.k] = el.value.trim();
  }
  return v;
}

/**
 * Open a form for a schema. Returns a Promise resolving to the saved record, {deleted:true} or null.
 */
export async function openForm(key, record = null, preset = {}) {
  const schema = SCHEMAS[key];
  const isNew = !record || !record.id;
  const [horses, providers, feedCatalog] = await Promise.all([db.all('horses'), db.all('providers'), db.all('feedcatalog')]);
  const ctx = {
    horses: sortBy(horses, (h) => h.name.toLowerCase()),
    providers: sortBy(providers, (p) => p.name.toLowerCase()),
    feedCatalog: sortBy(feedCatalog, (c) => (c.name || '').toLowerCase()),
  };

  const v = {};
  for (const f of schema.fields) {
    if (isNew && f.default !== undefined) v[f.k] = typeof f.default === 'function' ? f.default() : f.default;
  }
  Object.assign(v, record || {}, preset);
  if (isNew && ctx.horses.length === 1 && schema.fields.some((f) => f.k === 'horseId' && !f.allowNone) && !v.horseId) v.horseId = ctx.horses[0].id;
  // pre-compute suggestions for new records
  for (const f of schema.fields) if (f.suggest && !v[f.k]) v[f.k] = f.suggest(v) || '';

  const blobs = {};
  for (const f of schema.fields) if (f.type === 'photo' || f.type === 'file') blobs[f.k] = v[f.k] || null;

  const fields = schema.fields.filter((f) => !(f.createOnly && !isNew));
  const d = sheet();
  d.innerHTML = `
    <div class="sheet-head"><h2>${isNew ? 'Add' : 'Edit'} ${esc(schema.title.toLowerCase())}</h2><button type="button" class="icon" data-close aria-label="Close">✕</button></div>
    <form novalidate>
      <div class="form-grid">${fields.map((f) => fieldHtml(f, v, ctx)).join('')}</div>
    </form>
    <div class="sheet-foot">
      ${!isNew ? '<button type="button" class="danger" data-delete style="margin-right:auto">Delete</button>' : ''}
      <button type="button" data-close>Cancel</button>
      <button type="button" class="primary" data-save>Save</button>
    </div>`;
  const form = d.querySelector('form');
  const touched = new Set(isNew ? [] : fields.filter((f) => f.suggest && record[f.k]).map((f) => f.k));

  const refresh = (changedKey) => {
    const cur = readValues(form, schema, blobs);
    for (const f of fields) {
      const wrap = form.querySelector(`[data-field="${f.k}"]`);
      if (f.showIf && wrap) wrap.hidden = !f.showIf(cur);
      if (f.suggest && !touched.has(f.k) && changedKey !== f.k) {
        const s = f.suggest(cur);
        if (form.elements[f.k]) form.elements[f.k].value = s || '';
      }
      if (typeof f.hint === 'function') {
        const hintEl = form.querySelector(`[data-hint="${f.k}"]`);
        if (hintEl) hintEl.textContent = f.hint(cur, ctx) || '';
      }
    }
  };
  form.addEventListener('input', (e) => {
    const k = e.target.name;
    if (fields.some((f) => f.k === k && f.suggest)) touched.add(k);
    refresh(k);
  });
  form.addEventListener('change', (e) => refresh(e.target.name));
  refresh();

  // photos
  $$('[data-photo]', d).forEach((inp) => inp.addEventListener('change', async () => {
    const k = inp.dataset.photo; const file = inp.files[0]; if (!file) return;
    try {
      blobs[k] = await imageToDataUrl(file);
      const img = d.querySelector(`[data-preview="${k}"]`); img.src = blobs[k]; img.hidden = false;
      d.querySelector(`[data-clear="${k}"]`).hidden = false;
    } catch { toast('Could not read that image'); }
  }));
  $$('[data-clear]', d).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.clear; blobs[k] = null;
    d.querySelector(`[data-preview="${k}"]`).hidden = true; b.hidden = true;
  }));
  // files
  $$('[data-file]', d).forEach((inp) => inp.addEventListener('change', async () => {
    const k = inp.dataset.file; const file = inp.files[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024 && !file.type.startsWith('image/')) { toast('File is larger than 5 MB'); return; }
    const data = file.type.startsWith('image/') ? await imageToDataUrl(file, 1800, 0.85) : await fileToDataUrl(file);
    blobs[k] = { name: file.name, type: file.type.startsWith('image/') ? 'image/jpeg' : file.type, data };
    d.querySelector(`[data-filename="${k}"]`).textContent = file.name;
  }));

  return new Promise((resolve) => {
    let result = null;
    d.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => d.close()));
    d.addEventListener('close', () => resolve(result), { once: true });

    const del = d.querySelector('[data-delete]');
    if (del) del.onclick = async () => {
      const what = key === 'horse' ? `${record.name} and ALL of their records` : 'this ' + schema.title.toLowerCase();
      if (!confirm(`Delete ${what}? This cannot be undone.`)) return;
      if (key === 'horse') await db.deleteHorse(record.id); else await db.del(schema.store, record.id);
      result = { deleted: true }; toast('Deleted'); d.close();
    };

    d.querySelector('[data-save]').onclick = async () => {
      const vals = readValues(form, schema, blobs);
      const missing = fields.filter((f) => f.req && !(f.showIf && !f.showIf(vals)) && (vals[f.k] == null || vals[f.k] === ''));
      if (missing.length) {
        toast(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
        form.elements[missing[0].k]?.focus?.();
        return;
      }
      // drop hidden conditional fields so stale values don't linger
      for (const f of fields) if (f.showIf && !f.showIf(vals)) delete vals[f.k];
      const { logExpense, ...clean } = vals;
      const saved = await db.put(schema.store, { ...(record || {}), ...clean });
      await afterSave(key, saved, { isNew, logExpense });
      result = saved; toast('Saved'); d.close();
    };
    if (!d.open) d.showModal();
    setTimeout(() => form.querySelector('input:not([type=file]):not([type=checkbox]),select,textarea')?.focus(), 50);
  });
}

async function afterSave(key, rec, { isNew, logExpense }) {
  if (!isNew || !logExpense) return;
  if (key === 'health' && rec.cost > 0) {
    await db.put('expenses', {
      horseId: rec.horseId, date: rec.date, amount: rec.cost, providerId: rec.providerId || '',
      category: HEALTH_EXPENSE_CAT[rec.type] || 'Vet', description: rec.title || rec.type, sourceId: rec.id, recurring: 'No',
    });
  }
  if (key === 'event' && rec.entryFee > 0) {
    await db.put('expenses', {
      horseId: rec.horseId, date: rec.date, amount: rec.entryFee, category: 'Competition fees',
      description: `Entry: ${rec.name}${rec.level ? ' – ' + rec.level : ''}`, sourceId: rec.id, recurring: 'No',
    });
  }
}
