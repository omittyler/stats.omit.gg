import { supabase } from './lib/supabaseClient.js';

// Source of truth: data/reference/cdc_points_and_prizing.md — do not edit values here
// without updating that file too. prize_usd is the NA/EU (or only) prize; prize_usd_ap_la
// is only populated for Cup, where AP/LA prize differs from NA/EU even though points don't.
const ROWS = [
  // Elite
  { event_type: 'Elite', placement_min: 1, placement_max: 1, cdc_points: 15000, prize_usd: 20000, prize_usd_ap_la: null },
  { event_type: 'Elite', placement_min: 2, placement_max: 2, cdc_points: 10000, prize_usd: 10000, prize_usd_ap_la: null },
  { event_type: 'Elite', placement_min: 3, placement_max: 3, cdc_points: 7500, prize_usd: 6000, prize_usd_ap_la: null },
  { event_type: 'Elite', placement_min: 4, placement_max: 4, cdc_points: 5000, prize_usd: 5000, prize_usd_ap_la: null },
  { event_type: 'Elite', placement_min: 5, placement_max: 6, cdc_points: 4000, prize_usd: 4000, prize_usd_ap_la: null },
  { event_type: 'Elite', placement_min: 7, placement_max: 8, cdc_points: 3000, prize_usd: 2000, prize_usd_ap_la: null },
  { event_type: 'Elite', placement_min: 9, placement_max: 10, cdc_points: 2500, prize_usd: 1000, prize_usd_ap_la: null },
  { event_type: 'Elite', placement_min: 11, placement_max: 12, cdc_points: 2500, prize_usd: 1000, prize_usd_ap_la: null },

  // Cup — capped at top 32 per PROJECT.md §4.4, but the scale still records the real 33rd-64th tier
  { event_type: 'Cup', placement_min: 1, placement_max: 1, cdc_points: 2000, prize_usd: 2000, prize_usd_ap_la: 1000 },
  { event_type: 'Cup', placement_min: 2, placement_max: 2, cdc_points: 1500, prize_usd: 500, prize_usd_ap_la: 500 },
  { event_type: 'Cup', placement_min: 3, placement_max: 3, cdc_points: 1250, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Cup', placement_min: 4, placement_max: 4, cdc_points: 1200, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Cup', placement_min: 5, placement_max: 6, cdc_points: 1000, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Cup', placement_min: 7, placement_max: 8, cdc_points: 800, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Cup', placement_min: 9, placement_max: 16, cdc_points: 600, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Cup', placement_min: 17, placement_max: 32, cdc_points: 200, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Cup', placement_min: 33, placement_max: 64, cdc_points: 100, prize_usd: null, prize_usd_ap_la: null },

  // Major/Open
  { event_type: 'Major', placement_min: 1, placement_max: 1, cdc_points: 25000, prize_usd: 30000, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 2, placement_max: 2, cdc_points: 20000, prize_usd: 18000, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 3, placement_max: 3, cdc_points: 17500, prize_usd: 12000, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 4, placement_max: 4, cdc_points: 15000, prize_usd: 6000, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 5, placement_max: 6, cdc_points: 12500, prize_usd: 3000, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 7, placement_max: 8, cdc_points: 10000, prize_usd: 1500, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 9, placement_max: 12, cdc_points: 7500, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 13, placement_max: 16, cdc_points: 5000, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 17, placement_max: 24, cdc_points: 3000, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 25, placement_max: 32, cdc_points: 2000, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 33, placement_max: 48, cdc_points: 1000, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Major', placement_min: 49, placement_max: 64, cdc_points: 500, prize_usd: null, prize_usd_ap_la: null },

  // Finals/Champs — zero CDC points confirmed (PROJECT.md §3), prize only
  { event_type: 'Champs', placement_min: 1, placement_max: 1, cdc_points: 0, prize_usd: 60000, prize_usd_ap_la: null },
  { event_type: 'Champs', placement_min: 2, placement_max: 2, cdc_points: 0, prize_usd: 36000, prize_usd_ap_la: null },
  { event_type: 'Champs', placement_min: 3, placement_max: 3, cdc_points: 0, prize_usd: 24000, prize_usd_ap_la: null },
  { event_type: 'Champs', placement_min: 4, placement_max: 4, cdc_points: 0, prize_usd: 12000, prize_usd_ap_la: null },
  { event_type: 'Champs', placement_min: 5, placement_max: 6, cdc_points: 0, prize_usd: 6000, prize_usd_ap_la: null },
  { event_type: 'Champs', placement_min: 7, placement_max: 8, cdc_points: 0, prize_usd: 3000, prize_usd_ap_la: null },
  { event_type: 'Champs', placement_min: 9, placement_max: 12, cdc_points: 0, prize_usd: null, prize_usd_ap_la: null },
  { event_type: 'Champs', placement_min: 13, placement_max: 16, cdc_points: 0, prize_usd: null, prize_usd_ap_la: null },
];

export async function seedPointsScale() {
  const { error } = await supabase
    .from('points_scale')
    .upsert(ROWS, { onConflict: 'event_type,placement_min,placement_max' });
  if (error) throw error;

  console.log(`points_scale: upserted ${ROWS.length} rows`);
}
