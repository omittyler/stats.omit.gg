// Column order after player_name/team_name, exactly matching each bo7_stats CSV's
// row-2 header and supabase/schema.sql's player_event_stats columns.
// Full mapping/definitions: data/reference/player_event_stats_columns.md
export const STAT_FIELDS = [
  'matches_total', 'matches_w', 'matches_l',
  'maps_total', 'maps_w', 'maps_l',

  'overall_k', 'overall_d', 'overall_kd', 'overall_a', 'overall_kad', 'overall_plusminus',
  'overall_non_traded_kills', 'overall_non_traded_kills_pct', 'overall_hs', 'overall_dmg',
  'overall_dmg_per_k', 'overall_dmg_per_10', 'overall_round_kd', 'overall_k_per_10',
  'overall_slayer_rating', 'overall_damage_rating',

  'hp_maps', 'hp_w', 'hp_l', 'hp_pf', 'hp_pa', 'hp_k', 'hp_d', 'hp_kd', 'hp_a', 'hp_kad',
  'hp_plusminus', 'hp_non_traded_kills', 'hp_non_traded_kills_pct', 'hp_hs', 'hp_dmg',
  'hp_dmg_per_k', 'hp_hill_time', 'hp_hill_time_per_10', 'hp_objective_kills', 'hp_contest_time',
  'hp_k_per_10', 'hp_d_per_10', 'hp_a_per_10', 'hp_dmg_per_10', 'hp_engagements_per_10', 'hp_time',

  'snd_maps', 'snd_w', 'snd_l', 'snd_rf', 'snd_ra', 'snd_k', 'snd_d', 'snd_kd', 'snd_a', 'snd_kad',
  'snd_plusminus', 'snd_non_traded_kills', 'snd_non_traded_kills_pct', 'snd_hs', 'snd_dmg',
  'snd_dmg_per_k', 'snd_plants', 'snd_defuses', 'snd_first_bloods', 'snd_first_deaths', 'snd_fb_pct',
  'snd_opening_duel_win_pct', 'snd_k_per_r', 'snd_d_per_r', 'snd_a_per_r', 'snd_dmg_per_r',
  'snd_engagements_per_r', 'snd_rounds',

  'ovl_maps', 'ovl_w', 'ovl_l', 'ovl_rf', 'ovl_ra', 'ovl_k', 'ovl_d', 'ovl_kd', 'ovl_a', 'ovl_kad',
  'ovl_plusminus', 'ovl_non_traded_kills', 'ovl_non_traded_kills_pct', 'ovl_hs', 'ovl_dmg',
  'ovl_dmg_per_k', 'ovl_goals', 'ovl_goals_per_10', 'ovl_objective_kills', 'ovl_k_per_10',
  'ovl_d_per_10', 'ovl_a_per_10', 'ovl_dmg_per_10', 'ovl_engagements_per_10', 'ovl_time',
];
