-- AlterTable
ALTER TABLE "analyses" ADD COLUMN "summaryAmharic" TEXT,
ADD COLUMN "keyFindingsAmharic" JSONB,
ADD COLUMN "recommendationsAmharic" JSONB,
ADD COLUMN "errorCode" TEXT;

-- AlterTable
ALTER TABLE "clause_analyses" ADD COLUMN "explanationAmharic" TEXT,
ADD COLUMN "suggestionAmharic" TEXT;
