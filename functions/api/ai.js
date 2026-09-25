// Cloudflare Pages Function: POST /api/ai
// Set ANTHROPIC_API_KEY as an encrypted environment variable in the Pages project.
// Optional: AI_MODEL (defaults to Claude Haiku 4.5 – cheapest, fast), bind a KV namespace as AI_LIMITS
// to enforce a per-IP daily cap (AI_DAILY_LIMIT, default 30).

const SYSTEM = `You are the friendly horse-care assistant inside Hoofnote, a horse management app for South African owners.
You are given a summary of ONE horse's records (health, feeding, training, shows, costs) plus the owner's question.
- Use the records: cite dates and facts from them. If the records don't contain something, say so briefly.
- Be practical and concise (short paragraphs or bullets). Use South African context (ZAR, AHS, local seasons, SAEF) where relevant.
- You are NOT a vet. Never diagnose or prescribe drug doses. For anything that could be serious, tell them to call their vet.
- Emergencies (signs of colic, heavy bleeding, not bearing weight, choke, high fever, AHS symptoms such as swelling above the eyes or laboured breathing): tell them to call their vet immediately, before anything else.
- AHS movement rules change: when discussing travel, remind them to confirm with their vet / State Vet.
- Do not invent records.`;

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'AI not configured (missing ANTHROPIC_API_KEY)' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad JSON' }, 400); }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'No question' }, 400);
  // the API requires the first message to be from the user
  while (messages.length && messages[0].role !== 'user') messages.shift();

  // optional per-IP daily limit
  if (env.AI_LIMITS) {
    const ip = request.headers.get('cf-connecting-ip') || 'anon';
    const key = `ai:${new Date().toISOString().slice(0, 10)}:${ip}`;
    const n = Number((await env.AI_LIMITS.get(key)) || 0);
    if (n >= Number(env.AI_DAILY_LIMIT || 30)) return json({ error: 'Daily AI limit reached – try again tomorrow.' }, 429);
    await env.AI_LIMITS.put(key, String(n + 1), { expirationTtl: 90000 });
  }

  const context = String(body.context || '').slice(0, 12000);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.AI_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: SYSTEM + (context ? `\n\n<horse_records>\n${context}\n</horse_records>` : '\n\n(No horse selected – answer generally.)'),
      messages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: data?.error?.message || `AI error ${res.status}` }, 502);
  const reply = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  return json({ reply });
}

export const onRequestGet = () => json({ error: 'Use POST' }, 405);

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}
