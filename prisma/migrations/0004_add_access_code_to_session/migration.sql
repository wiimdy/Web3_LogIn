-- Add accessCode to Session with default UUID for existing rows
ALTER TABLE "Session" ADD COLUMN "accessCode" TEXT NOT NULL DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(4))));
CREATE UNIQUE INDEX "Session_accessCode_key" ON "Session"("accessCode");
