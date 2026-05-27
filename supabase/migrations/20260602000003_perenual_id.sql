-- Add Perenual source identifier so the perenual-sync Edge Function can
-- upsert independently of Trefle and Permapeople records.

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS perenual_id integer UNIQUE;
