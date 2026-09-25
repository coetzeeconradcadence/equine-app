// Blog: published posts come from /content/blog/posts.json (committed to git, so they are public
// and deploy with the site). Drafts written in the app are saved on this device until published.
import * as db from '../db.js';
import { html, raw, fmtDate, markdown, videoEmbed, sortBy, slugify } from '../util.js';
import { empty, addBtn, pill } from './components.js';
import { APP } from '../config.js';

let cache = null;
export async function publishedPosts() {
  if (cache) return cache;
  try {
    const r = await fetch(APP.blogFeed, { cache: 'no-cache' });
    const j = await r.json();
    cache = (Array.isArray(j) ? j : j.posts || []).map((p) => ({ ...p, slug: p.slug || slugify(p.title), published: true }));
  } catch (e) { console.warn('blog feed', e); cache = []; }
  return cache;
}
async function allPosts() {
  const drafts = (await db.all('posts')).map((p) => ({ ...p, slug: p.slug || slugify(p.title), published: false }));
  return { published: sortBy(await publishedPosts(), (p) => p.date || '', -1), drafts: sortBy(drafts, (p) => p.date || '', -1) };
}
const tags = (p) => String(p.tags || '').split(',').map((t) => t.trim()).filter(Boolean);

function card(p) {
  const href = p.published ? `#/blog/${p.slug}` : `#/blog/draft/${p.id}`;
  const yt = videoEmbed(p.video);
  const thumb = p.cover || (yt && yt.includes('youtube') ? `https://img.youtube.com/vi/${yt.split('/').pop()}/hqdefault.jpg` : '');
  return html`<a class="card post-card" href="${href}" style="text-decoration:none;color:inherit">
    ${thumb ? raw(`<img src="${thumb}" alt="" loading="lazy">`) : ''}
    <div class="body"><div class="row">${!p.published ? pill('Draft', 'warn') : ''}${p.video ? pill('▶ Video', 'info') : ''}${tags(p).slice(0, 3).map((t) => pill(t))}</div>
      <h3 style="margin-top:6px">${p.title}</h3>
      <div class="small muted">${[p.author, fmtDate(p.date)].filter(Boolean).join(' · ')}</div>
      ${p.excerpt ? html`<p class="small" style="margin:6px 0 0">${p.excerpt}</p>` : ''}</div></a>`;
}

export async function blogView() {
  const { published, drafts } = await allPosts();
  return html`
    <div class="page-head"><h1>Blog & videos</h1>${addBtn('post', 'Write a post', {}, 'primary sm')}</div>
    ${drafts.length ? html`<div class="section"><h2>Your drafts</h2><span class="small muted">only on this device</span></div><div class="grid two">${drafts.map(card)}</div>` : ''}
    <div class="section"><h2>Latest</h2></div>
    <div class="grid two">${published.length ? published.map(card) : empty('No posts published yet.')}</div>`;
}

export async function postView(slugOrId, isDraft = false) {
  const p = isDraft
    ? await db.get('posts', slugOrId)
    : (await publishedPosts()).find((x) => x.slug === slugOrId);
  if (!p) return html`<div class="empty">Post not found. <a href="#/blog">Back to the blog</a></div>`;
  const embed = videoEmbed(p.video);
  return html`
    <a href="#/blog" class="no-print">‹ Blog</a>
    <article style="max-width:720px;margin:12px auto 0">
      ${isDraft ? html`<div class="callout warn no-print" style="margin-bottom:12px">
        <strong>Draft preview.</strong> Only you can see this. To publish, tap “Copy for publishing” and paste it into
        <code>public/content/blog/posts.json</code> on GitHub (add a comma between posts). The site redeploys automatically.
        <div class="row" style="margin-top:8px"><button class="sm" data-action="edit" data-schema="post" data-id="${p.id}">✎ Edit</button>
        <button class="sm primary" data-action="copy-post" data-id="${p.id}">📋 Copy for publishing</button></div></div>` : ''}
      <div class="row">${tags(p).map((t) => pill(t))}</div>
      <h1 style="font-size:1.8rem;margin-top:8px">${p.title}</h1>
      <div class="muted small">${[p.author, fmtDate(p.date)].filter(Boolean).join(' · ')}</div>
      ${p.cover ? raw(`<img src="${p.cover}" alt="" style="border-radius:12px;margin-top:12px">`) : ''}
      ${embed ? raw(`<div class="video"><iframe src="${embed}" title="Video" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`) : p.video ? html`<p><a href="${p.video}" target="_blank" rel="noopener">▶ Watch the video</a></p>` : ''}
      ${p.excerpt ? html`<p style="font-size:1.1rem" class="muted">${p.excerpt}</p>` : ''}
      <div class="post-body">${raw(markdown(p.body))}</div>
    </article>`;
}

export async function postPublishJson(id) {
  const p = await db.get('posts', id);
  const { id: _i, createdAt, updatedAt, published, ...rest } = p;
  return JSON.stringify({ ...rest, slug: slugify(p.title) }, null, 2);
}
