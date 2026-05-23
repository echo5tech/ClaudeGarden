-- Dev-only seed. Runs on `supabase db reset`. Keep small.
-- The real plant catalog is populated by the permapeople-sync Edge Function.

insert into plants (common_name, scientific_name, spacing_inches, days_to_harvest, zones)
values
  ('Tomato',   'Solanum lycopersicum',     24, 75, array['3a','4a','5a','6a','7a','8a','9a','10a']),
  ('Basil',    'Ocimum basilicum',         10, 60, array['4a','5a','6a','7a','8a','9a','10a']),
  ('Lettuce',  'Lactuca sativa',            8, 45, array['3a','4a','5a','6a','7a','8a','9a']),
  ('Pepper',   'Capsicum annuum',          18, 80, array['4a','5a','6a','7a','8a','9a','10a']),
  ('Carrot',   'Daucus carota',             3, 70, array['3a','4a','5a','6a','7a','8a','9a','10a']);
