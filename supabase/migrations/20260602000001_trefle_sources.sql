-- Add source-system identifiers to plants so Trefle and USDA syncs can
-- upsert without clobbering each other or Permapeople records.

ALTER TABLE plants
  ADD COLUMN IF NOT EXISTS trefle_id    integer UNIQUE,
  ADD COLUMN IF NOT EXISTS usda_symbol  text    UNIQUE;
