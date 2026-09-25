// Single place to rename / rebrand the app.
export const APP = {
  name: 'Hoofnote',
  version: '0.1.0-dev',
  tagline: "Your horse's records, reminders, costs and results in one place.",
  defaultCurrency: 'ZAR',
  locale: 'en-ZA',
  // Cloudflare Pages Function that proxies the AI model (see /functions/api/ai.js)
  aiEndpoint: '/api/ai',
  aiDailyLimit: 20, // soft client-side cap until we have accounts + server-side limits
  blogFeed: 'content/blog/posts.json',
};
