-- Create student table for identity mapping
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "studentId" TEXT,
    "walletAddress" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure walletAddress is unique
CREATE UNIQUE INDEX "Student_walletAddress_key" ON "Student"("walletAddress");
