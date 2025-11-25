-- Add capacity column with default 50
ALTER TABLE "Session" ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 50;
