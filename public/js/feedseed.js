// Pre-populated South African horse feed catalog, researched from brand product ranges
// (Spurwing Horse Feeds, Epol Equine, Meadow Feeds, Voermol, Equi-Feeds, Kynoch) and cross-checked
// against real tack-shop / co-op listings for bag sizes. Scoop sizes are typical estimates for a
// standard ~2L stable scoop and can be edited per yard under Setup once weighed on a scale –
// scoop weight varies with feed density, which is exactly why it's configurable rather than fixed.
import * as db from './db.js';

export const FEED_SEED = [
  // Spurwing Horse Feeds
  { name: 'Paddock Plus', brand: 'Spurwing Horse Feeds', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 245 },
  { name: 'Perfect Balance', brand: 'Spurwing Horse Feeds', category: 'Balancer / pellet', measure: 'Scoops', scoopSizeKg: 0.5, bagSizeKg: 20, pricePerBag: 320 },
  { name: 'Spurwing Lucerne (pellet)', brand: 'Spurwing Horse Feeds', category: 'Roughage (hay / lucerne / chaff)', measure: 'Scoops', scoopSizeKg: 1, bagSizeKg: 20, pricePerBag: 130 },
  { name: 'Energy Plus', brand: 'Spurwing Horse Feeds', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 260 },
  { name: 'Breeder Plus', brand: 'Spurwing Horse Feeds', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 270 },

  // Epol Equine
  { name: 'Equine Cool Performance', brand: 'Epol Equine', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 285 },
  { name: 'Equine Energy Cubes', brand: 'Epol Equine', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 270 },
  { name: 'Equine Balancer Pellet', brand: 'Epol Equine', category: 'Balancer / pellet', measure: 'Scoops', scoopSizeKg: 0.5, bagSizeKg: 20, pricePerBag: 300 },
  { name: 'Equine Growth Cubes', brand: 'Epol Equine', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 275 },

  // Meadow Feeds
  { name: 'Race & Performance', brand: 'Meadow Feeds', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 290 },
  { name: 'Meadow Horse Cubes', brand: 'Meadow Feeds', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 255 },
  { name: 'Meadow Mineral Lick', brand: 'Meadow Feeds', category: 'Supplement', measure: 'Weight (kg)', bagSizeKg: 25, pricePerBag: 240 },

  // Voermol
  { name: 'Voermol Horse Cubes', brand: 'Voermol', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 240 },
  { name: 'Voermol Molatek Equimix', brand: 'Voermol', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 250 },

  // Equi-Feeds
  { name: 'EquiFeeds Competition Mix', brand: 'Equi-Feeds', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 295 },
  { name: 'EquiFeeds Fibre Cubes', brand: 'Equi-Feeds', category: 'Roughage (hay / lucerne / chaff)', measure: 'Scoops', scoopSizeKg: 1, bagSizeKg: 20, pricePerBag: 150 },

  // Kynoch Feeds
  { name: 'Kynoch Horse Cubes', brand: 'Kynoch Feeds', category: 'Hard feed / concentrate', measure: 'Scoops', scoopSizeKg: 1.5, bagSizeKg: 40, pricePerBag: 250 },

  // Common roughage / chaff sold loose or baled, kept for completeness
  { name: 'Teff hay (bale)', brand: 'Own mix / other', category: 'Roughage (hay / lucerne / chaff)', measure: 'Weight (kg)', bagSizeKg: 20, pricePerBag: 90 },
  { name: 'Lucerne hay (bale)', brand: 'Own mix / other', category: 'Roughage (hay / lucerne / chaff)', measure: 'Weight (kg)', bagSizeKg: 20, pricePerBag: 110 },
  { name: 'Chopped chaff / bran', brand: 'Own mix / other', category: 'Bran / chop', measure: 'Scoops', scoopSizeKg: 0.3, bagSizeKg: 25, pricePerBag: 95 },

  // Common joint / supplement brands, small scoop or gram-based
  { name: 'Cavalor Vita Mineral', brand: 'Cavalor', category: 'Supplement', measure: 'Scoops', scoopSizeKg: 0.1, bagSizeKg: 3, pricePerBag: 480 },
  { name: 'TRM Joint Care', brand: 'TRM', category: 'Supplement', measure: 'Weight (kg)', bagSizeKg: 1.5, pricePerBag: 620 },
];

export async function seedFeedCatalogIfEmpty() {
  const existing = await db.all('feedcatalog');
  if (existing.length) return false;
  for (const f of FEED_SEED) await db.put('feedcatalog', { active: true, ...f });
  return true;
}
