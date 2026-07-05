-- Drop the dormant hardiness_zones reference table. It was seeded with
-- 2027-anchored frost dates and never gained a consumer — every client
-- computes frost dates via nextLastFrostDate() in @garden/shared/zone,
-- and profiles carry the per-user zone + last_frost_date.
drop table hardiness_zones;
