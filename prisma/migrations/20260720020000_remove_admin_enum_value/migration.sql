-- Remove leftover ADMIN value from UserRole enum
BEGIN;

CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'WORKER', 'VIEWER');

ALTER TABLE "users"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new"),
  ALTER COLUMN "role" SET DEFAULT 'VIEWER';

DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

COMMIT;
