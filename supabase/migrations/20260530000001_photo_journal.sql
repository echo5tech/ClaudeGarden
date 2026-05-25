-- Photo journal: stores plant progress photos uploaded by users.

CREATE TABLE plant_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  bed_plant_id uuid NOT NULL REFERENCES bed_plants(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption      text,
  taken_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_photos_own" ON plant_photos
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
