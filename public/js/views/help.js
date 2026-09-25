// A plain-language guide to every area of the app, grouped the way the nav is organised.
// Uses native <details> disclosure widgets – no JS needed to expand/collapse.
import { html } from '../util.js';

const SECTIONS = [
  {
    heading: 'Your horses',
    items: [
      { icon: '🏠', title: 'Home', body: 'Your dashboard when you open the app – what\'s due soon across every horse, quick stats, and shortcuts to add a record.' },
      { icon: '🐴', title: 'Horses', body: 'Every horse you\'ve added. Tap one to open its profile, which has its own set of tabs:' },
      { icon: '📋', title: '— Overview', body: 'Key facts, the AHS travel-ready badge, at-a-glance farrier/dentist/deworming dates, the latest result, and quick links to the printable passport, a shareable summary and Ask AI.', indent: true },
      { icon: '🩺', title: '— Health', body: 'Every vaccination, vet visit, deworming, treatment and more – each one can carry a "next due" date that automatically shows up under What\'s due and on the Calendar.', indent: true },
      { icon: '🔨', title: '— Farrier', body: 'Hoof care history: trim or shoeing type, shoe material, hoof type and size (front/hind), condition issues like cracks or thrush, and the farrier\'s own feedback – plus when the next visit is due.', indent: true },
      { icon: '🌾', title: '— Feeding', body: 'What and how much this horse eats. Link a feed to your yard\'s Feed catalog (under More) to get automatic cost tracking and to include it on the yard-wide Feed order sheet.', indent: true },
      { icon: '🏇', title: '— Training', body: 'Rides and sessions logged – type, duration, intensity, how it felt, and optionally heart-rate/GPS data from a device like a Garmin Blaze or Polar Equine.', indent: true },
      { icon: '🏆', title: '— Shows & results', body: 'Entries and results by discipline (placing, score, faults, time), plus an AHS travel checklist when a show is in the Western Cape controlled area.', indent: true },
      { icon: '💰', title: '— Costs', body: 'This horse\'s own share of your expenses – vet, farrier, feed, lessons, everything.', indent: true },
      { icon: '📄', title: '— Documents', body: 'Passport pages, vaccination certificates, insurance and more – photos or PDFs, with reminders before anything expires.', indent: true },
      { icon: '🕓', title: '— Timeline', body: 'Everything that\'s ever happened to this horse, in one chronological feed.', indent: true },
    ],
  },
  {
    heading: 'Staying on top of things',
    items: [
      { icon: '🔔', title: 'What\'s due', body: 'Everything coming up across every horse in one list – next vaccinations, farrier and dentist visits, reminders you\'ve set, upcoming shows, and documents about to expire. Add it all to your phone\'s calendar with one tap.' },
      { icon: '📅', title: 'Calendar', body: 'A month-by-month planner. Every show, reminder and health/farrier due date appears here automatically the moment you add it elsewhere – nothing to enter twice. Tap a day to see what\'s on it, tap an item to open it.' },
      { icon: '🦟', title: 'AHS travel-ready check', body: 'A South Africa–specific feature: each horse gets a green/amber/red badge based on the 40-day-to-24-month rule for moving into the Western Cape controlled area, plus a reminder for the annual (1 June–31 Oct) vaccination window. Guidance only – always confirm with your vet or the State Vet.' },
    ],
  },
  {
    heading: 'Money & the yard',
    items: [
      { icon: '💰', title: 'Costs', body: 'All your expenses in one place, by horse or shared across the yard. See the total for the year, a monthly average, and a breakdown by category. Export to CSV for your own records or your accountant.' },
      { icon: '🌾', title: 'Yard feed board', body: 'A printable chart of what every horse eats and at which feed time – pin it up in the feed room.' },
      { icon: '🧮', title: 'Feed order & catalog', body: 'Set up your yard\'s feed brands, bag sizes, scoop sizes and prices once (the Feed catalog tab – pre-populated with common South African brands), then the Order tab works out scoops, total weight, bags to order and cost automatically for every horse. Choose which feeds appear as columns – some yards feed one thing, others a dozen.' },
    ],
  },
  {
    heading: 'Extras',
    items: [
      { icon: '🏆', title: 'Shows & events', body: 'All entries and results across every horse in one list, with the same AHS travel checklist as the horse profile.' },
      { icon: '📇', title: 'Contacts', body: 'Your vet, farrier, dentist, physio, coach, transporter and feed store, grouped by role, with one-tap call and WhatsApp.' },
      { icon: '✨', title: 'Ask AI', body: 'Ask a question in plain English about a horse and get an answer based on that horse\'s own records – health history, feeding, recent training and results. A guide only, never a substitute for your vet.' },
      { icon: '📰', title: 'Blog & videos', body: 'Articles and training videos, with YouTube embeds.' },
      { icon: '🐴', title: 'Welcome screen', body: 'Replay the app\'s intro screen any time.' },
      { icon: '⚙️', title: 'Settings & backup', body: 'Currency and light/dark theme, download or restore a full backup of your data, load demo horses to try things out, or delete everything and start fresh.' },
    ],
  },
];

export function helpView() {
  return html`
    <h1>❓ Help</h1>
    <p class="small muted" style="margin-top:-4px">What each part of the app does. Everything here is stored only on this device – see Settings for backups.</p>
    ${SECTIONS.map((s) => html`
      <div class="section"><h2>${s.heading}</h2></div>
      <div class="list">${s.items.map((it) => html`
        <details class="help-item ${it.indent ? 'indent' : ''}">
          <summary><span style="font-size:1.2rem">${it.icon}</span> ${it.title}</summary>
          <p>${it.body}</p>
        </details>`)}</div>`)}
    <div class="card flat small muted" style="margin-top:8px">
      Still stuck, or something looks wrong? Use Settings → Download backup before trying anything drastic like Delete all data.
    </div>`;
}
