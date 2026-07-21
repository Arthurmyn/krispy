-- AlterEnum
-- Old stage order: TOPIC, STYLE, SCRIPT, SCRIPT_REVIEW
-- New stage order: NICHE, STYLE, IDEA, SCRIPT, SCRIPT_REVIEW
-- Existing rows sitting in TOPIC (idea not locked yet) map to the new IDEA
-- stage, which is the same conceptual position in the flow.
BEGIN;
CREATE TYPE "ChatStage_new" AS ENUM ('NICHE', 'STYLE', 'IDEA', 'SCRIPT', 'SCRIPT_REVIEW');
ALTER TABLE "public"."Project" ALTER COLUMN "chatStage" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "chatStage" TYPE "ChatStage_new" USING (
  CASE "chatStage"::text
    WHEN 'TOPIC' THEN 'IDEA'
    ELSE "chatStage"::text
  END
)::"ChatStage_new";
ALTER TYPE "ChatStage" RENAME TO "ChatStage_old";
ALTER TYPE "ChatStage_new" RENAME TO "ChatStage";
DROP TYPE "public"."ChatStage_old";
ALTER TABLE "Project" ALTER COLUMN "chatStage" SET DEFAULT 'NICHE';
COMMIT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "language" TEXT;
