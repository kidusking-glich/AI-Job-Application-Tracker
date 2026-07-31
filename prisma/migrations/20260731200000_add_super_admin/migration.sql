-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;


-- Backfill: the first user of existing deployments becomes the super admin
UPDATE "users" SET "isSuperAdmin" = true WHERE "id" = (SELECT "id" FROM "users" ORDER BY "createdAt" ASC LIMIT 1);
