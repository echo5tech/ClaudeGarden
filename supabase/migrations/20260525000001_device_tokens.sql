-- device_tokens: stores one Expo push token per platform per user.
-- Mobile registers/refreshes its token on app launch via an upsert.
-- The send-push Edge Function reads this table (service-role bypass).

CREATE TABLE device_tokens (
  user_id     uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  platform    text NOT NULL CHECK (platform IN ('ios','android','web')),
  token       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, platform)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can insert or update their own token rows.
CREATE POLICY "device_tokens: own upsert"
  ON device_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can read their own token rows.
CREATE POLICY "device_tokens: own select"
  ON device_tokens
  FOR SELECT
  USING (user_id = auth.uid());
