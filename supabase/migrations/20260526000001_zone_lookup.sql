CREATE TABLE hardiness_zones (
  zone             text PRIMARY KEY,
  last_frost_date  date,   -- NULL for frost-free zones (10a+)
  first_frost_date date    -- NULL for frost-free zones
);

INSERT INTO hardiness_zones (zone, last_frost_date, first_frost_date) VALUES
  ('1a',  '2027-06-15', '2027-07-15'),
  ('1b',  '2027-06-01', '2027-08-01'),
  ('2a',  '2027-05-15', '2027-08-15'),
  ('2b',  '2027-05-01', '2027-09-01'),
  ('3a',  '2027-05-01', '2027-09-15'),
  ('3b',  '2027-04-15', '2027-10-01'),
  ('4a',  '2027-04-15', '2027-10-01'),
  ('4b',  '2027-04-01', '2027-10-15'),
  ('5a',  '2027-04-01', '2027-10-15'),
  ('5b',  '2027-03-30', '2027-10-30'),
  ('6a',  '2027-03-15', '2027-11-01'),
  ('6b',  '2027-03-15', '2027-11-15'),
  ('7a',  '2027-03-01', '2027-11-15'),
  ('7b',  '2027-03-01', '2027-12-01'),
  ('8a',  '2027-02-15', '2027-12-01'),
  ('8b',  '2027-02-01', '2027-12-15'),
  ('9a',  '2027-02-01', '2027-12-15'),
  ('9b',  '2027-01-15', '2027-12-31'),
  ('10a', NULL, NULL),
  ('10b', NULL, NULL),
  ('11a', NULL, NULL),
  ('11b', NULL, NULL),
  ('12a', NULL, NULL),
  ('12b', NULL, NULL),
  ('13a', NULL, NULL),
  ('13b', NULL, NULL);

-- Public read (reference data, like plants)
ALTER TABLE hardiness_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hardiness_zones_select_all" ON hardiness_zones
  FOR SELECT TO anon, authenticated USING (true);
