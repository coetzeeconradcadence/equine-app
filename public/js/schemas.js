// Field definitions for every record type. The generic form (forms.js) renders these,
// so adding a field here is usually all that's needed.
import { addDays, addMonths, today } from './util.js';
import { AHS_ZONES } from './ahs.js';

export const HEALTH_TYPES = [
  { v: 'AHS vaccination', icon: '💉', next: { months: 12 } },
  { v: 'Equine flu vaccination', icon: '💉', next: { months: 6 } },
  { v: 'Tetanus vaccination', icon: '💉', next: { months: 12 } },
  { v: 'EHV vaccination', icon: '💉', next: { months: 6 } },
  { v: 'Rabies vaccination', icon: '💉', next: { months: 12 } },
  { v: 'Deworming', icon: '🪱', next: { months: 3 } },
  { v: 'Faecal egg count', icon: '🔬', next: { months: 3 } },
  { v: 'Farrier', icon: '🔨', next: { weeks: 6 } },
  { v: 'Dentist', icon: '🦷', next: { months: 12 } },
  { v: 'Vet visit', icon: '🩺' },
  { v: 'Treatment / medication', icon: '💊' },
  { v: 'Injury / illness', icon: '🩹' },
  { v: 'Physio / chiro', icon: '💆', next: { weeks: 8 } },
  { v: 'Saddle fit', icon: '🏇', next: { months: 6 } },
  { v: 'Weight / condition', icon: '⚖️' },
  { v: 'Other', icon: '📋' },
];
export const healthIcon = (t) => (HEALTH_TYPES.find((x) => x.v === t) || {}).icon || '📋';
export function suggestNext(type, date) {
  const t = HEALTH_TYPES.find((x) => x.v === type);
  if (!t || !t.next || !date) return '';
  if (t.next.weeks) return addDays(date, t.next.weeks * 7);
  return addMonths(date, t.next.months);
}
// health type -> expense category, for "also log as expense"
export const HEALTH_EXPENSE_CAT = {
  Farrier: 'Farrier', Dentist: 'Dental', 'Physio / chiro': 'Physio / chiro', 'Saddle fit': 'Tack & equipment',
};

export const EXPENSE_CATEGORIES = [
  'Livery / board', 'Feed', 'Supplements', 'Bedding', 'Vet', 'Farrier', 'Dental', 'Physio / chiro',
  'Tack & equipment', 'Lessons / training', 'Competition fees', 'Transport', 'Insurance', 'Other',
];
export const DISCIPLINES = ['Dressage', 'Show jumping', 'Eventing', 'Equitation', 'Endurance', 'Working riders', 'Western / reining', 'Vaulting', 'Showing', 'Polo / polocrosse', 'Other'];
export const TRAINING_TYPES = ['Flatwork', 'Dressage', 'Jumping', 'Pole work', 'Cross-country', 'Hack / outride', 'Lunging', 'Groundwork', 'Fitness / hill work', 'Lesson', 'Rest day', 'Other'];
export const PROVIDER_ROLES = ['Vet', 'Farrier', 'Dentist', 'Physio / chiro', 'Saddle fitter', 'Coach / trainer', 'Transport', 'Feed store', 'Yard / livery', 'Insurance', 'Other'];
export const DOC_CATEGORIES = ['Passport', 'Registration', 'Vaccination record', 'Vet certificate', 'Movement permit', 'Insurance', 'X-ray / scan', 'Invoice / receipt', 'Other'];
export const SEXES = ['Mare', 'Gelding', 'Stallion', 'Colt', 'Filly'];
export const FEED_KINDS = ['Hard feed', 'Roughage', 'Supplement', 'Medication', 'Other'];
export const FEED_TIMES = ['Morning', 'Midday', 'Evening', 'Night'];
// Manual entry for now – see README for why (no public API for Garmin Blaze or similar devices yet).
export const WEARABLE_DEVICES = ['Garmin Blaze', 'Polar Equine', 'Arioneo Equimetre', 'Hylete / other GPS tracker', 'Other'];

const isResult = (v) => v.status === 'Completed';
const disc = (...d) => (v) => isResult(v) && d.includes(v.discipline);

export const SCHEMAS = {
  horse: {
    store: 'horses', title: 'Horse',
    fields: [
      { k: 'photo', label: 'Photo', type: 'photo', full: true },
      { k: 'name', label: 'Stable name', type: 'text', req: true },
      { k: 'showName', label: 'Registered / show name', type: 'text' },
      { k: 'breed', label: 'Breed', type: 'text', list: ['SA Warmblood', 'Thoroughbred', 'Arabian', 'Boerperd', 'Nooitgedachter', 'Friesian', 'Appaloosa', 'Quarter Horse', 'Welsh pony', 'SA Riding pony', 'Basotho pony', 'Percheron', 'Cross'] },
      { k: 'colour', label: 'Colour', type: 'text', list: ['Bay', 'Dark bay', 'Chestnut', 'Grey', 'Black', 'Palomino', 'Dun', 'Roan', 'Skewbald', 'Piebald'] },
      { k: 'sex', label: 'Sex', type: 'select', options: SEXES },
      { k: 'dob', label: 'Date of birth', type: 'date' },
      { k: 'height', label: 'Height (hh)', type: 'text', placeholder: 'e.g. 16.2' },
      { k: 'discipline', label: 'Main discipline', type: 'select', options: DISCIPLINES },
      { k: 'ahsZone', label: 'AHS vaccination', type: 'select', options: AHS_ZONES, default: AHS_ZONES[0], full: true, hint: 'Horses in the Western Cape free / surveillance zone are not routinely vaccinated.' },
      { k: 'microchip', label: 'Microchip no.', type: 'text' },
      { k: 'passportNo', label: 'Passport no.', type: 'text' },
      { k: 'saefNo', label: 'SAEF / society reg. no.', type: 'text' },
      { k: 'yard', label: 'Yard / stable', type: 'text' },
      { k: 'owner', label: 'Owner', type: 'text' },
      { k: 'insurance', label: 'Insurer & policy', type: 'text' },
      { k: 'markings', label: 'Markings', type: 'textarea', full: true },
      { k: 'alerts', label: 'Important alerts (allergies, vices, handling)', type: 'textarea', full: true, hint: 'Shown at the top of the profile and on the printed passport.' },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },

  health: {
    store: 'health', title: 'Health record',
    fields: [
      { k: 'horseId', label: 'Horse', type: 'horse', req: true },
      { k: 'type', label: 'Type', type: 'select', options: HEALTH_TYPES.map((t) => t.v), req: true },
      { k: 'date', label: 'Date', type: 'date', req: true, default: () => today() },
      { k: 'title', label: 'Summary', type: 'text', placeholder: 'e.g. Annual AHS booster (OBP)', full: true },
      { k: 'product', label: 'Product / vaccine / drug', type: 'text', placeholder: 'e.g. Onderstepoort AHS bottle 2' },
      { k: 'batch', label: 'Batch no.', type: 'text', showIf: (v) => /vaccination/i.test(v.type || '') },
      { k: 'dose', label: 'Dose & frequency', type: 'text', showIf: (v) => ['Treatment / medication', 'Deworming', 'Injury / illness'].includes(v.type) },
      { k: 'endDate', label: 'Treatment end date', type: 'date', showIf: (v) => ['Treatment / medication', 'Injury / illness'].includes(v.type) },
      { k: 'providerId', label: 'Done by', type: 'provider' },
      { k: 'nextDue', label: 'Next due', type: 'date', suggest: (v) => suggestNext(v.type, v.date), hint: 'Suggested from typical intervals – change it to what your vet advises.' },
      { k: 'cost', label: 'Cost', type: 'money' },
      { k: 'logExpense', label: 'Also add this cost to expenses', type: 'checkbox', createOnly: true, default: true, showIf: (v) => Number(v.cost) > 0 },
      { k: 'photo', label: 'Photo (e.g. passport page, wound)', type: 'photo' },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },

  feed: {
    store: 'feed', title: 'Feed item',
    fields: [
      { k: 'horseId', label: 'Horse', type: 'horse', req: true },
      { k: 'name', label: 'Feed / supplement', type: 'text', req: true, placeholder: 'e.g. Epol Equine Cool Performance' },
      { k: 'kind', label: 'Kind', type: 'select', options: FEED_KINDS, default: 'Hard feed' },
      { k: 'amount', label: 'Amount per feed', type: 'text', placeholder: 'e.g. 1.5 kg / 2 scoops / 1 flake' },
      { k: 'times', label: 'Feeds', type: 'multi', options: FEED_TIMES, default: ['Morning', 'Evening'], full: true },
      { k: 'startDate', label: 'Started', type: 'date', default: () => today() },
      { k: 'active', label: 'Currently feeding', type: 'checkbox', default: true },
      { k: 'monthlyCost', label: 'Approx. cost per month', type: 'money' },
      { k: 'notes', label: 'Notes (soak, mix, instructions)', type: 'textarea', full: true },
    ],
  },

  training: {
    store: 'training', title: 'Training session',
    fields: [
      { k: 'horseId', label: 'Horse', type: 'horse', req: true },
      { k: 'date', label: 'Date', type: 'date', req: true, default: () => today() },
      { k: 'type', label: 'Type', type: 'select', options: TRAINING_TYPES, req: true },
      { k: 'status', label: 'Status', type: 'select', options: ['Done', 'Planned', 'Skipped'], default: 'Done' },
      { k: 'duration', label: 'Duration (min)', type: 'number', default: 45 },
      { k: 'intensity', label: 'Intensity', type: 'select', options: ['Easy', 'Moderate', 'Hard'], default: 'Moderate' },
      { k: 'rider', label: 'Rider', type: 'text' },
      { k: 'feel', label: 'How did it go?', type: 'select', options: ['😀 Great', '🙂 Good', '😐 OK', '😕 Tough'] },
      { k: 'hasWearable', label: 'Log heart rate / GPS data from a device (Garmin Blaze, Polar Equine, etc.)', type: 'checkbox', full: true },
      { k: 'device', label: 'Device', type: 'select', options: WEARABLE_DEVICES, showIf: (v) => v.hasWearable },
      { k: 'avgHr', label: 'Avg heart rate (bpm)', type: 'number', showIf: (v) => v.hasWearable },
      { k: 'maxHr', label: 'Max heart rate (bpm)', type: 'number', showIf: (v) => v.hasWearable },
      { k: 'recoveryHr', label: 'Recovery HR (bpm, ~1 min after stopping)', type: 'number', showIf: (v) => v.hasWearable },
      { k: 'distanceKm', label: 'Distance (km)', type: 'number', step: '0.1', showIf: (v) => v.hasWearable },
      { k: 'heatScore', label: 'Heat Score / heat stress reading', type: 'text', showIf: (v) => v.hasWearable, hint: 'As shown in the device app, e.g. "Low", "Moderate", or a number.' },
      { k: 'notes', label: 'Exercises & notes', type: 'textarea', full: true },
    ],
  },

  event: {
    store: 'events', title: 'Show / event',
    fields: [
      { k: 'horseId', label: 'Horse', type: 'horse', req: true },
      { k: 'name', label: 'Event name', type: 'text', req: true, placeholder: 'e.g. KZN Winter Show' },
      { k: 'date', label: 'Date', type: 'date', req: true, default: () => today() },
      { k: 'kind', label: 'Type', type: 'select', options: ['Show / competition', 'Clinic', 'Graded show', 'Training show', 'Other'], default: 'Show / competition' },
      { k: 'venue', label: 'Venue', type: 'text' },
      { k: 'discipline', label: 'Discipline', type: 'select', options: DISCIPLINES, req: true },
      { k: 'level', label: 'Class / level', type: 'text', placeholder: 'e.g. Novice, Grade 2, 1.10m' },
      { k: 'wcControlled', label: 'Venue is in the Western Cape AHS controlled area', type: 'checkbox', full: true, hint: 'Turns on the AHS travel check for this event.' },
      { k: 'status', label: 'Status', type: 'select', options: ['Entered', 'Completed', 'Withdrawn'], default: 'Entered' },
      { k: 'placing', label: 'Placing', type: 'number', showIf: isResult },
      { k: 'score', label: 'Score %', type: 'number', step: '0.01', showIf: disc('Dressage', 'Equitation', 'Eventing', 'Showing') },
      { k: 'faults', label: 'Faults / penalties', type: 'number', step: '0.1', showIf: disc('Show jumping', 'Eventing', 'Working riders') },
      { k: 'time', label: 'Time (sec)', type: 'number', step: '0.01', showIf: disc('Show jumping', 'Working riders', 'Endurance') },
      { k: 'height', label: 'Height (m)', type: 'number', step: '0.05', showIf: disc('Show jumping', 'Eventing', 'Working riders') },
      { k: 'clear', label: 'Clear round', type: 'checkbox', showIf: disc('Show jumping', 'Eventing') },
      { k: 'entryFee', label: 'Entry fee', type: 'money' },
      { k: 'logExpense', label: 'Add entry fee to expenses', type: 'checkbox', createOnly: true, default: true, showIf: (v) => Number(v.entryFee) > 0 },
      { k: 'photo', label: 'Photo', type: 'photo' },
      { k: 'videoUrl', label: 'Video link', type: 'url', placeholder: 'YouTube / Google Drive link' },
      { k: 'notes', label: 'Notes, judge comments, what to work on', type: 'textarea', full: true },
    ],
  },

  expense: {
    store: 'expenses', title: 'Expense',
    fields: [
      { k: 'horseId', label: 'Horse', type: 'horse', allowNone: 'Shared / all horses' },
      { k: 'date', label: 'Date', type: 'date', req: true, default: () => today() },
      { k: 'category', label: 'Category', type: 'select', options: EXPENSE_CATEGORIES, req: true },
      { k: 'amount', label: 'Amount', type: 'money', req: true },
      { k: 'description', label: 'Description', type: 'text', full: true },
      { k: 'providerId', label: 'Paid to', type: 'provider' },
      { k: 'recurring', label: 'Repeats', type: 'select', options: ['No', 'Monthly'], default: 'No', hint: 'Monthly items (e.g. livery) are counted in the monthly estimate.' },
      { k: 'receipt', label: 'Receipt photo', type: 'photo' },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },

  provider: {
    store: 'providers', title: 'Contact',
    fields: [
      { k: 'name', label: 'Name', type: 'text', req: true },
      { k: 'role', label: 'Role', type: 'select', options: PROVIDER_ROLES, req: true },
      { k: 'practice', label: 'Practice / business', type: 'text' },
      { k: 'phone', label: 'Phone', type: 'tel' },
      { k: 'email', label: 'Email', type: 'email' },
      { k: 'area', label: 'Area', type: 'text' },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },

  doc: {
    store: 'docs', title: 'Document',
    fields: [
      { k: 'horseId', label: 'Horse', type: 'horse', req: true },
      { k: 'title', label: 'Title', type: 'text', req: true },
      { k: 'category', label: 'Category', type: 'select', options: DOC_CATEGORIES, default: 'Passport' },
      { k: 'date', label: 'Date', type: 'date', default: () => today() },
      { k: 'expires', label: 'Expires', type: 'date', hint: 'We will remind you before it expires.' },
      { k: 'file', label: 'File (photo or PDF, max ~5 MB)', type: 'file', accept: 'image/*,application/pdf', full: true, req: true },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },

  reminder: {
    store: 'reminders', title: 'Reminder',
    fields: [
      { k: 'title', label: 'What', type: 'text', req: true, full: true, placeholder: 'e.g. Order shavings, Book physio' },
      { k: 'horseId', label: 'Horse', type: 'horse', allowNone: 'Not horse-specific' },
      { k: 'date', label: 'Date', type: 'date', req: true, default: () => addDays(today(), 7) },
      { k: 'repeat', label: 'Repeat', type: 'select', options: ['Never', 'Weekly', 'Every 6 weeks', 'Monthly', 'Every 3 months', 'Every 6 months', 'Yearly'], default: 'Never' },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
  },

  post: {
    store: 'posts', title: 'Blog post',
    fields: [
      { k: 'title', label: 'Title', type: 'text', req: true, full: true },
      { k: 'author', label: 'Author', type: 'text' },
      { k: 'date', label: 'Date', type: 'date', default: () => today() },
      { k: 'tags', label: 'Tags (comma separated)', type: 'text', placeholder: 'training, groundwork' },
      { k: 'cover', label: 'Cover image URL', type: 'url', full: true, hint: 'Or leave blank. Use a link to an image hosted online.' },
      { k: 'video', label: 'Video link (YouTube / Vimeo)', type: 'url', full: true, hint: 'Upload to YouTube (unlisted is fine) and paste the link – it embeds automatically.' },
      { k: 'excerpt', label: 'Short intro', type: 'textarea', full: true },
      { k: 'body', label: 'Post', type: 'textarea', full: true, rows: 12, hint: 'Formatting: # Heading, **bold**, *italic*, - list item, [link](https://…), ![image](https://…)' },
    ],
  },
};

export const REPEAT_STEP = {
  Weekly: (d) => addDays(d, 7), 'Every 6 weeks': (d) => addDays(d, 42), Monthly: (d) => addMonths(d, 1),
  'Every 3 months': (d) => addMonths(d, 3), 'Every 6 months': (d) => addMonths(d, 6), Yearly: (d) => addMonths(d, 12),
};
