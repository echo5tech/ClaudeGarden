-- Add care and companion-planting columns to plants.
-- Companion UUIDs (companion_plant_ids, antagonist_plant_ids) already exist.
-- This migration adds the care-data columns populated by permapeople-sync.

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS sun_exposure                    text,
  ADD COLUMN IF NOT EXISTS water_needs                     text,
  ADD COLUMN IF NOT EXISTS soil_type                       text,
  ADD COLUMN IF NOT EXISTS fertilizer_notes                text,
  ADD COLUMN IF NOT EXISTS sow_weeks_before_frost          integer,
  ADD COLUMN IF NOT EXISTS direct_sow_weeks_after_frost    integer;
