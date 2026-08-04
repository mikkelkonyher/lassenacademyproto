alter table public.courses
  drop column mux_playback_id,
  drop column mux_asset_id,
  drop column mux_playback_policy,
  drop column duration_seconds,
  drop column aspect_ratio;
