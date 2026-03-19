-- Expand Role enum for future editorial permissions
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EDITOR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AUTHOR';

-- Introduce typed transition direction values for HeroConfig
DO $$
BEGIN
  CREATE TYPE "TransitionDirection" AS ENUM ('LEFT', 'RIGHT', 'UP', 'DOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "HeroConfig"
  DROP CONSTRAINT IF EXISTS "HeroConfig_transitionDirection_check";

UPDATE "HeroConfig"
SET "transitionDirection" = CASE
  WHEN "transitionDirection" ILIKE 'right' THEN 'RIGHT'
  WHEN "transitionDirection" ILIKE 'up' THEN 'UP'
  WHEN "transitionDirection" ILIKE 'down' THEN 'DOWN'
  ELSE 'LEFT'
END;

ALTER TABLE "HeroConfig"
  ALTER COLUMN "transitionDirection" DROP DEFAULT,
  ALTER COLUMN "transitionDirection" TYPE "TransitionDirection"
  USING (
    CASE
      WHEN "transitionDirection" = 'RIGHT' THEN 'RIGHT'::"TransitionDirection"
      WHEN "transitionDirection" = 'UP' THEN 'UP'::"TransitionDirection"
      WHEN "transitionDirection" = 'DOWN' THEN 'DOWN'::"TransitionDirection"
      ELSE 'LEFT'::"TransitionDirection"
    END
  ),
  ALTER COLUMN "transitionDirection" SET DEFAULT 'LEFT';

-- Query-path indexes for public listing and admin filtering
CREATE INDEX IF NOT EXISTS "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_featured_publishedAt_idx" ON "Post"("featured", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_authorId_idx" ON "Post"("authorId");

-- Guard against duplicate taxonomy names in admin panel
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
