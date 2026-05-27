-- Seed the plants table with 30 common garden vegetables, herbs, and fruits
-- using USDA PLANTS Database symbols and NRCS agronomic data as the source.
--
-- These records provide immediate real data before Trefle / Permapeople syncs
-- run. The usda_symbol column allows the USDA import script to upsert without
-- touching plants already imported by other sources.
--
-- Timing conventions:
--   sow_weeks_before_frost      → weeks before LAST SPRING frost to start indoors
--   direct_sow_weeks_after_frost → positive = weeks after last frost to direct sow
--                                  negative = weeks BEFORE last frost (cool-season crops)
--
-- Measurements: spacing_inches uses in-row spacing (square foot gardening standard).
-- Zones: USDA hardiness zones where the plant is commonly grown.

INSERT INTO plants (
  usda_symbol,
  common_name,
  scientific_name,
  spacing_inches,
  days_to_harvest,
  zones,
  sun_exposure,
  water_needs,
  soil_type,
  sow_weeks_before_frost,
  direct_sow_weeks_after_frost,
  companion_plant_ids,
  antagonist_plant_ids
) VALUES

-- ── Warm-season crops (transplants) ──────────────────────────────────────────

('SOLY3',  'Tomato',       'Solanum lycopersicum',    24, 70,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'Medium – water regularly, 1–2 inches per week',
  'Loamy, well-draining, rich in organic matter', 6, NULL, '{}', '{}'),

('CAAN2',  'Sweet Pepper', 'Capsicum annuum',         18, 75,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'Medium – consistent moisture, avoid waterlogging',
  'Loamy, well-draining, fertile', 8, NULL, '{}', '{}'),

('SOME',   'Eggplant',     'Solanum melongena',       18, 75,
  ARRAY['4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'Medium – keep evenly moist',
  'Loamy, well-draining, warm', 8, NULL, '{}', '{}'),

('BRRA2',  'Broccoli',     'Brassica oleracea var. italica',   18, 80,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a'],
  'Full sun (6+ hours)', 'Medium – consistent moisture',
  'Fertile, well-draining, slightly alkaline', 6, NULL, '{}', '{}'),

('BROL',   'Cabbage',      'Brassica oleracea var. capitata',  18, 80,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a'],
  'Full sun (6+ hours)', 'Medium – consistent moisture',
  'Fertile, well-draining, slightly alkaline', 6, NULL, '{}', '{}'),

('BROLBO', 'Cauliflower',  'Brassica oleracea var. botrytis',  18, 80,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a'],
  'Full sun (6+ hours)', 'Medium – consistent, even moisture',
  'Fertile, well-draining, pH 6.0–7.5', 6, NULL, '{}', '{}'),

('ALCE',   'Onion',        'Allium cepa',             4, 110,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'Medium – keep moist, especially while bulbing',
  'Loose, well-draining, fertile', 10, NULL, '{}', '{}'),

('PESA2',  'Parsley',      'Petroselinum crispum',    8, 78,
  ARRAY['4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun to partial shade', 'Medium – keep soil moist',
  'Rich, moist, well-draining', 10, NULL, '{}', '{}'),

-- ── Warm-season crops (direct sow after last frost) ───────────────────────────

('CUPE',   'Zucchini',     'Cucurbita pepo',          36, 55,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'High – keep consistently moist',
  'Rich, well-draining, high organic matter', NULL, 1, '{}', '{}'),

('CUSA',   'Cucumber',     'Cucumis sativus',         12, 55,
  ARRAY['4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'High – 1 inch per week, consistent moisture',
  'Well-draining, fertile, pH 6.0–7.0', NULL, 2, '{}', '{}'),

('CUMA',   'Winter Squash','Cucurbita maxima',        48, 90,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'Medium – deep watering 1–2 times per week',
  'Fertile, well-draining, rich in organic matter', NULL, 2, '{}', '{}'),

('PHVU',   'Green Bean',   'Phaseolus vulgaris',      6, 55,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'Medium – 1 inch per week',
  'Well-draining, loamy, pH 6.0–7.0', NULL, 1, '{}', '{}'),

('ZEMA',   'Sweet Corn',   'Zea mays',                12, 80,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'High – 1 inch per week, more when tasseling',
  'Deep, fertile, well-draining, pH 5.8–6.8', NULL, 1, '{}', '{}'),

('SOTU',   'Potato',       'Solanum tuberosum',       12, 80,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'Medium – 1–2 inches per week, especially after flowering',
  'Loose, well-draining, slightly acidic pH 5.0–6.0', NULL, -2, '{}', '{}'),

('IPBA',   'Sweet Potato', 'Ipomoea batatas',         12, 100,
  ARRAY['8a','8b','9a','9b','10a','10b','11a','11b'],
  'Full sun (6+ hours)', 'Low to medium – drought tolerant once established',
  'Sandy, well-draining, low fertility', NULL, 4, '{}', '{}'),

('OCBA',   'Basil',        'Ocimum basilicum',        12, 25,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'Medium – keep soil moist but not waterlogged',
  'Rich, moist, well-draining', NULL, 2, '{}', '{}'),

('ANGR2',  'Dill',         'Anethum graveolens',      12, 70,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'Low to medium – water when top inch is dry',
  'Well-draining, slightly acidic pH 5.5–6.5', NULL, 1, '{}', '{}'),

-- ── Cool-season crops (direct sow before or at last frost) ───────────────────

('DACAS',  'Carrot',       'Daucus carota subsp. sativus', 3, 70,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a'],
  'Full sun to partial shade', 'Medium – keep soil evenly moist until germination',
  'Loose, deep, sandy loam – no rocks or heavy clay', NULL, -4, '{}', '{}'),

('RASA',   'Radish',       'Raphanus sativus',        2, 25,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun to partial shade', 'Medium – keep evenly moist',
  'Loose, well-draining, fertile', NULL, -4, '{}', '{}'),

('BEVI',   'Beet',         'Beta vulgaris',           4, 60,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun to partial shade', 'Medium – 1 inch per week',
  'Well-draining, fertile, pH 6.0–7.5', NULL, -4, '{}', '{}'),

('BRRAT',  'Turnip',       'Brassica rapa subsp. rapa', 4, 50,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'Medium – consistent moisture',
  'Fertile, well-draining, pH 6.0–7.5', NULL, -4, '{}', '{}'),

('SPOL',   'Spinach',      'Spinacia oleracea',       6, 45,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a'],
  'Full sun to partial shade (bolts in heat)', 'Medium – keep soil moist',
  'Rich, moist, well-draining, pH 6.0–7.5', NULL, -6, '{}', '{}'),

('LASA2',  'Lettuce',      'Lactuca sativa',          8, 45,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a'],
  'Partial shade preferred (full sun in cool weather)', 'Medium – keep consistently moist',
  'Rich, moist, well-draining, pH 6.0–7.0', NULL, -4, '{}', '{}'),

('PISA2',  'Garden Pea',   'Pisum sativum',           4, 70,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a'],
  'Full sun to partial shade', 'Medium – 1 inch per week',
  'Well-draining, fertile, pH 6.0–7.5', NULL, -6, '{}', '{}'),

('BROLA2', 'Kale',         'Brassica oleracea var. acephala', 18, 55,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun to partial shade', 'Medium – 1–1.5 inches per week',
  'Rich, well-draining, pH 6.0–7.5', NULL, -4, '{}', '{}'),

('COSA',   'Cilantro',     'Coriandrum sativum',      6, 50,
  ARRAY['2a','2b','3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a'],
  'Full sun to partial shade', 'Low to medium – water when top inch is dry',
  'Well-draining, pH 6.0–6.7', NULL, -2, '{}', '{}'),

-- ── Perennial herbs and alliums ───────────────────────────────────────────────

('ALSA2',  'Garlic',       'Allium sativum',          6, 240,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'Low to medium – water regularly until scapes form, then reduce',
  'Well-draining, fertile, pH 6.0–7.5', NULL, NULL, '{}', '{}'),

('SARO6',  'Rosemary',     'Salvia rosmarinus',       24, 80,
  ARRAY['7a','7b','8a','8b','9a','9b','10a','10b','11a','11b'],
  'Full sun (6+ hours)', 'Low – drought tolerant once established',
  'Well-draining, sandy or rocky, pH 6.0–8.0', 10, NULL, '{}', '{}'),

('FRVI',   'Strawberry',   'Fragaria ×ananassa',      12, 60,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b'],
  'Full sun (6+ hours)', 'Medium – 1–1.5 inches per week',
  'Well-draining, sandy loam, pH 5.5–6.5', NULL, NULL, '{}', '{}'),

('OCBA2',  'Thai Basil',   'Ocimum basilicum var. thyrsiflora', 12, 30,
  ARRAY['3a','3b','4a','4b','5a','5b','6a','6b','7a','7b','8a','8b','9a','9b','10a','10b'],
  'Full sun (6+ hours)', 'Medium – keep soil moist but not waterlogged',
  'Rich, moist, well-draining', NULL, 2, '{}', '{}')

ON CONFLICT (usda_symbol) DO UPDATE SET
  common_name                  = EXCLUDED.common_name,
  scientific_name              = EXCLUDED.scientific_name,
  spacing_inches               = EXCLUDED.spacing_inches,
  days_to_harvest              = EXCLUDED.days_to_harvest,
  zones                        = EXCLUDED.zones,
  sun_exposure                 = EXCLUDED.sun_exposure,
  water_needs                  = EXCLUDED.water_needs,
  soil_type                    = EXCLUDED.soil_type,
  sow_weeks_before_frost       = EXCLUDED.sow_weeks_before_frost,
  direct_sow_weeks_after_frost = EXCLUDED.direct_sow_weeks_after_frost;
