-- Remove description column from crate_types (crate data is independent; names come from code)
ALTER TABLE "crate_types" DROP COLUMN IF EXISTS "description";
