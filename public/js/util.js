import { APP } from './config.js';

// ---------- HTML ----------
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Tagged template that escapes interpolations unless wrapped with raw(). Arrays are joined. */
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) out += toHtml(vals[i]);
  });
  return new Raw(out);
}
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ''));
function toHtml(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(toHtml).join('');
  return esc(v);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- IDs ----------
export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// ---------- Dates (ISO yyyy-mm-dd, local time) ----------
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const parse = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const addMonths = (s, n) => {
  const d = parse(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return iso(d);
};
/** whole days from a to b (b - a) */
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
export const fmtDate = (s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  s ? parse(s).toLocaleDateString(APP.locale, opts) : '';
export const fmtShort = (s) => fmtDate(s, { day: 'numeric', month: 'short' });
export const monthKey = (s) => String(s).slice(0, 7);
export const fmtMonth = (key) => parse(key + '-01').toLocaleDateString(APP.locale, { month: 'long', year: 'numeric' });
export function relDays(s) {
  const n = diffDays(today(), s);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n > 0) return n < 60 ? `in ${n} days` : `in ${Math.round(n / 30)} months`;
  return -n < 60 ? `${-n} days ago` : `${Math.round(-n / 30)} months ago`;
}
export function ageFrom(dob) {
  if (!dob) return '';
  const t = parse(today()), d = parse(dob);
  let y = t.getFullYear() - d.getFullYear();
  if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) y--;
  return y < 1 ? `${Math.max(0, diffDays(dob, today()) / 30 | 0)} months` : `${y} yrs`;
}

// ---------- Money ----------
let currency = APP.defaultCurrency;
export const setCurrency = (c) => { currency = c || APP.defaultCurrency; };
export const getCurrency = () => currency;
export const money = (n) =>
  new Intl.NumberFormat(APP.locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n) || 0);

// ---------- Misc ----------
export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
export const groupBy = (arr, f) => arr.reduce((m, x) => ((m[f(x)] ||= []).push(x), m), {});
export const sortBy = (arr, f, dir = 1) => [...arr].sort((a, b) => (f(a) > f(b) ? dir : f(a) < f(b) ? -dir : 0));

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

/** Resize an image File to a JPEG data URL (keeps storage small). */
export function imageToDataUrl(file, max = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
export const fileToDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});
export function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
export function download(filename, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** SA numbers: 082 123 4567 -> 27821234567 for wa.me links */
export function waNumber(phone) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  else if (p.startsWith('0')) p = '27' + p.slice(1);
  return p;
}

/** Minimal, safe markdown: headings, bold, italic, links, lists, paragraphs, images. */
export function markdown(src) {
  const inline = (t) => esc(t)
    .replace(/!\[([^\]]*)\]\((https?:[^)\s]+)\)/g, '<img alt="$1" src="$2" loading="lazy">')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  const out = []; let list = null;
  for (const line of String(src || '').split(/\r?\n/)) {
    const li = line.match(/^\s*[-*]\s+(.*)/);
    if (li) { if (!list) { list = []; } list.push(`<li>${inline(li[1])}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) { out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`); continue; }
    if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push(`<ul>${list.join('')}</ul>`);
  return out.join('\n');
}

/** YouTube / Vimeo URL -> embeddable URL, else null */
export function videoEmbed(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').slice(0, 60);
}
