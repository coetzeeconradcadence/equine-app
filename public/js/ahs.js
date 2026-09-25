// African Horse Sickness helpers.
// Rules encoded here (confirm with your vet / state vet – they change and vary by zone):
//  * Annual vaccination window: 1 June – 31 October (NHRA directive / general practice).
//  * Movement INTO the Western Cape AHS controlled area: vaccinated by a vet at least 40 days
//    and not more than 24 months before moving, recorded in the passport, plus a State Vet
//    movement permit. Permit applications are usually submitted ~2 weeks ahead.
import { today, addDays, addMonths, diffDays, fmtDate, fmtShort, parse } from './util.js';

export const AHS_ZONES = [
  'Vaccinate annually (most of SA)',
  'AHS free / surveillance zone (no routine vaccination)',
  'Not applicable / outside SA',
];
export const AHS_DISCLAIMER =
  'Guide only – AHS rules differ by zone and can change during outbreaks. Always confirm with your vet or the State Vet before moving a horse.';

const vaccinations = (health, onDate) =>
  health
    .filter((r) => r.type === 'AHS vaccination' && r.date && r.date <= onDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

/** Is the horse eligible to move into the WC controlled area on `onDate`? */
export function ahsTravel(health, onDate = today()) {
  const vacs = vaccinations(health, onDate);
  if (!vacs.length) {
    return { tone: 'bad', code: 'none', short: 'No AHS record', detail: 'No AHS vaccination recorded. Add one from the Health tab (a photo of the passport page helps).', travel: false };
  }
  const last = vacs[0].date;
  const days = diffDays(last, onDate);
  const eligibleFrom = addDays(last, 40);
  const expires = addMonths(last, 24);
  if (days < 40) {
    return { tone: 'warn', code: 'waiting', short: `Travel-ready ${fmtShort(eligibleFrom)}`, last, eligibleFrom, expires,
      detail: `Last AHS vaccination ${fmtDate(last)} – only ${days} days before. Horses can move into the controlled area from ${fmtDate(eligibleFrom)} (40 days).`, travel: false };
  }
  if (onDate > expires) {
    return { tone: 'bad', code: 'expired', short: 'AHS lapsed for travel', last, expires,
      detail: `Last AHS vaccination ${fmtDate(last)} is more than 24 months old.`, travel: false };
  }
  return { tone: 'good', code: 'ok', short: 'Travel-ready', last, eligibleFrom, expires,
    detail: `Last AHS vaccination ${fmtDate(last)}. Valid for movement until ${fmtDate(expires)}.`, travel: true };
}

/** Where are we in the annual vaccination season for this horse? */
export function ahsSeason(horse, health, onDate = today()) {
  const zone = horse.ahsZone || AHS_ZONES[0];
  if (zone !== AHS_ZONES[0]) return { state: 'na', tone: '', label: zone };
  const y = parse(onDate).getFullYear();
  const start = `${y}-06-01`, end = `${y}-10-31`;
  const vacs = vaccinations(health, onDate);
  const doneThisSeason = vacs.some((r) => r.date >= start && r.date <= end);
  if (onDate < start) return { state: 'upcoming', tone: '', label: `Next AHS window opens ${fmtDate(start)}`, date: start };
  if (doneThisSeason) return { state: 'done', tone: 'good', label: `AHS done for ${y}` };
  if (onDate <= end) return { state: 'due', tone: 'warn', label: `Annual AHS vaccination due – window closes ${fmtDate(end)}`, date: onDate };
  return { state: 'missed', tone: 'bad', label: `No AHS vaccination recorded in the ${y} window (1 Jun – 31 Oct)`, date: onDate };
}

/** Checklist for an event in the controlled area. */
export function eventTravelCheck(event, health) {
  if (!event.wcControlled) return null;
  const st = ahsTravel(health, event.date);
  const permitBy = addDays(event.date, -14);
  const checkBy = addDays(event.date, -3);
  return {
    status: st,
    steps: [
      { ok: st.travel, label: 'AHS vaccination 40 days – 24 months before travel', detail: st.detail },
      { ok: null, label: 'Vaccination entered in the passport by a vet' },
      { ok: null, label: `Apply for State Vet movement permit – aim for ${fmtDate(permitBy)}`, detail: 'Usually needs copies of the passport ID page and AHS vaccination page.' },
      { ok: null, label: `Vet health check within 72 hours of moving (from ${fmtDate(checkBy)})` },
    ],
  };
}
