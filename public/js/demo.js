// Demo data with dates relative to today, so reminders and AHS status look realistic.
import * as db from './db.js';
import { today, addDays, addMonths, uid } from './util.js';

export async function loadDemo() {
  const t = today();
  const d = (n) => addDays(t, n);
  const vet = { id: uid(), name: 'Dr Sam Naidoo', role: 'Vet', practice: 'Hillside Equine Clinic (demo)', phone: '082 000 0001', area: 'Midlands' };
  const farrier = { id: uid(), name: 'Pieter van Wyk', role: 'Farrier', phone: '083 000 0002', area: 'Howick' };
  const dentist = { id: uid(), name: 'Lindiwe Mokoena', role: 'Dentist', phone: '084 000 0003' };
  const coach = { id: uid(), name: 'Jess Carter', role: 'Coach / trainer', phone: '072 000 0004', notes: 'Lessons Tue & Thu' };
  const feedstore = { id: uid(), name: 'Country Feeds (demo)', role: 'Feed store', phone: '033 000 0005' };
  for (const p of [vet, farrier, dentist, coach, feedstore]) await db.put('providers', p);

  const biscuit = await db.put('horses', {
    name: 'Biscuit', showName: 'Golden Biscuit II', breed: 'SA Warmblood', colour: 'Chestnut', sex: 'Gelding',
    dob: addMonths(t, -12 * 11 - 3), height: '16.2', discipline: 'Show jumping', microchip: '977200000000001',
    passportNo: 'SA-DEMO-0001', yard: 'Oakridge Stables', ahsZone: 'Vaccinate annually (most of SA)',
    alerts: 'Allergic to penicillin. Bites when girthing – tie up first.', markings: 'Wide blaze, two white socks behind',
  });
  const luna = await db.put('horses', {
    name: 'Luna', showName: 'Moonlight Sonata', breed: 'Thoroughbred', colour: 'Grey', sex: 'Mare',
    dob: addMonths(t, -12 * 8 - 7), height: '16.0', discipline: 'Dressage', passportNo: 'SA-DEMO-0002',
    yard: 'Oakridge Stables', ahsZone: 'Vaccinate annually (most of SA)',
  });

  const H = (o) => db.put('health', o);
  // Biscuit – vaccinated recently (inside the 40-day window) to show the "travel-ready from" state
  await H({ horseId: biscuit.id, type: 'AHS vaccination', date: d(-25), title: 'Annual AHS booster', product: 'OBP AHS bottle 2', providerId: vet.id, nextDue: addMonths(d(-25), 12), cost: 650 });
  await H({ horseId: biscuit.id, type: 'AHS vaccination', date: d(-390), title: 'AHS bottle 1', providerId: vet.id });
  await H({ horseId: biscuit.id, type: 'Equine flu vaccination', date: d(-170), providerId: vet.id, nextDue: d(10), product: 'Equilis Prequenza Te' });
  await H({ horseId: biscuit.id, type: 'Farrier', date: d(-39), title: 'Full set, fronts with pads', providerId: farrier.id, nextDue: d(3), cost: 1100 });
  await H({ horseId: biscuit.id, type: 'Deworming', date: d(-95), product: 'Ivermectin paste', nextDue: d(-5) });
  await H({ horseId: biscuit.id, type: 'Dentist', date: d(-300), providerId: dentist.id, nextDue: d(65), cost: 950 });
  await H({ horseId: biscuit.id, type: 'Injury / illness', date: d(-60), title: 'Small cut left hind', notes: 'Cleaned, Betadine, healed in a week', endDate: d(-53) });
  // Luna – AHS fine for travel but annual window still open
  await H({ horseId: luna.id, type: 'AHS vaccination', date: d(-300), title: 'AHS bottle 2', providerId: vet.id, product: 'OBP AHS bottle 2' });
  await H({ horseId: luna.id, type: 'Farrier', date: d(-20), title: 'Trim + fronts', providerId: farrier.id, nextDue: d(22), cost: 750 });
  await H({ horseId: luna.id, type: 'Physio / chiro', date: d(-45), title: 'Tight through the back', nextDue: d(11), cost: 700 });
  await H({ horseId: luna.id, type: 'Treatment / medication', date: d(-3), title: 'Bute for sore foot', product: 'Phenylbutazone', dose: '1 sachet twice daily', endDate: d(4), providerId: vet.id });

  const F = (o) => db.put('feed', o);
  await F({ horseId: biscuit.id, name: 'Performance cubes', kind: 'Hard feed', amount: '2 kg', times: ['Morning', 'Evening'], active: true, startDate: d(-200), monthlyCost: 900 });
  await F({ horseId: biscuit.id, name: 'Teff hay', kind: 'Roughage', amount: '1 bale/day', times: ['Morning', 'Evening', 'Night'], active: true, startDate: d(-400), monthlyCost: 1400 });
  await F({ horseId: biscuit.id, name: 'Joint supplement', kind: 'Supplement', amount: '1 scoop', times: ['Morning'], active: true, startDate: d(-60), monthlyCost: 450 });
  await F({ horseId: luna.id, name: 'Low-starch mix', kind: 'Hard feed', amount: '1.5 kg', times: ['Morning', 'Evening'], active: true, startDate: d(-120), notes: 'Soak beet pulp 4 hrs', monthlyCost: 800 });
  await F({ horseId: luna.id, name: 'Lucerne', kind: 'Roughage', amount: '2 flakes', times: ['Midday'], active: true, startDate: d(-300), monthlyCost: 600 });

  const types = ['Flatwork', 'Jumping', 'Pole work', 'Hack / outride', 'Lesson', 'Rest day'];
  for (let i = 1; i <= 24; i++) {
    const ty = types[i % types.length];
    const wearable = ty !== 'Rest day' && i % 3 === 0; // roughly every 3rd real ride has device data
    await db.put('training', {
      horseId: biscuit.id, date: d(-i * 1.5 | 0), type: ty, status: 'Done', duration: ty === 'Rest day' ? 0 : 40 + (i % 3) * 10,
      intensity: ['Easy', 'Moderate', 'Hard'][i % 3], feel: ['😀 Great', '🙂 Good', '😐 OK'][i % 3], rider: 'Me',
      ...(wearable ? { hasWearable: true, device: 'Garmin Blaze', avgHr: 118 - Math.floor(i / 4), maxHr: 162 - Math.floor(i / 6), recoveryHr: 88 - Math.floor(i / 5), distanceKm: 4 + (i % 4), heatScore: ['Low', 'Low', 'Moderate'][i % 3] } : {}),
    });
  }
  for (let i = 1; i <= 14; i++) await db.put('training', { horseId: luna.id, date: d(-i * 2), type: ['Dressage', 'Flatwork', 'Lunging', 'Lesson'][i % 4], status: 'Done', duration: 45, intensity: 'Moderate' });
  await db.put('training', { horseId: biscuit.id, date: d(2), type: 'Lesson', status: 'Planned', duration: 45, notes: 'Grid work with Jess' });

  const E = (o) => db.put('events', o);
  const sj = [[-120, 3, 4, false, 1.0], [-90, 2, 0, true, 1.0], [-62, 1, 0, true, 1.05], [-34, 5, 8, false, 1.1], [-12, 2, 0, true, 1.1]];
  for (const [n, pl, f, clear, ht] of sj) await E({ horseId: biscuit.id, name: `Oakridge Graded Show`, date: d(n), discipline: 'Show jumping', level: `${ht.toFixed(2)}m`, venue: 'Oakridge', status: 'Completed', placing: pl, faults: f, clear, height: ht, time: 62 + (n % 7) });
  await E({ horseId: biscuit.id, name: 'Cape Summer Classic', date: d(30), discipline: 'Show jumping', level: '1.10m', venue: 'Cape Town', status: 'Entered', wcControlled: true, entryFee: 850 });
  const dr = [[-150, 62.4, 4], [-110, 64.1, 3], [-80, 63.2, 5], [-45, 66.8, 2], [-15, 68.3, 1]];
  for (const [n, sc, pl] of dr) await E({ horseId: luna.id, name: 'Midlands Dressage League', date: d(n), discipline: 'Dressage', level: 'Elementary', status: 'Completed', score: sc, placing: pl, notes: sc > 66 ? 'Lovely rhythm, more bend in corners' : 'Tense in the walk' });
  await E({ horseId: luna.id, name: 'KZN Dressage Champs', date: d(18), discipline: 'Dressage', level: 'Elementary', venue: 'Shongweni', status: 'Entered', entryFee: 600 });

  const X = (o) => db.put('expenses', { recurring: 'No', ...o });
  for (let m = 0; m < 6; m++) {
    const date = addMonths(t.slice(0, 8) + '01', -m);
    await X({ horseId: biscuit.id, date, category: 'Livery / board', amount: 4500, description: 'Full livery', recurring: m === 0 ? 'Monthly' : 'No' });
    await X({ horseId: luna.id, date, category: 'Livery / board', amount: 4500, description: 'Full livery', recurring: m === 0 ? 'Monthly' : 'No' });
    await X({ horseId: '', date: addDays(date, 5), category: 'Bedding', amount: 600, description: 'Shavings x10' });
    await X({ horseId: biscuit.id, date: addDays(date, 9), category: 'Lessons / training', amount: 1400, description: '4 lessons', providerId: coach.id });
  }
  await X({ horseId: biscuit.id, date: d(-39), category: 'Farrier', amount: 1100, description: 'Full set', providerId: farrier.id });
  await X({ horseId: luna.id, date: d(-20), category: 'Farrier', amount: 750, description: 'Trim + fronts', providerId: farrier.id });
  await X({ horseId: biscuit.id, date: d(-25), category: 'Vet', amount: 650, description: 'AHS vaccination', providerId: vet.id });
  await X({ horseId: luna.id, date: d(-45), category: 'Physio / chiro', amount: 700, description: 'Physio session' });
  await X({ horseId: biscuit.id, date: d(-70), category: 'Tack & equipment', amount: 3200, description: 'New jumping boots' });
  await X({ horseId: '', date: d(-15), category: 'Insurance', amount: 890, description: 'Monthly premium (both horses)', recurring: 'Monthly' });

  await db.put('reminders', { title: 'Order shavings', date: d(6), repeat: 'Monthly' });
  await db.put('reminders', { title: 'Book saddle fitter', horseId: luna.id, date: d(-2), repeat: 'Never' });
  await db.put('docs', { horseId: biscuit.id, title: 'Passport ID page (add yours)', category: 'Passport', date: t, notes: 'Replace with a photo of the real page' });
}
