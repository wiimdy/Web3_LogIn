-- Add NFT-related columns to Attendance
ALTER TABLE "Attendance" ADD COLUMN "tokenUri" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "txHash" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "contractAddress" TEXT;
ALTER TABLE "Attendance" ADD COLUMN "chainId" TEXT;
