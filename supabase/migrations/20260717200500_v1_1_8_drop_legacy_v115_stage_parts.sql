-- DraBornGarage v1.1.8
-- v115_stage_parts was a temporary text-chunk staging table left from the v1.1.5 delivery.
-- It has no application references or external dependencies and must not remain exposed through PostgREST.

drop table if exists public.v115_stage_parts;
