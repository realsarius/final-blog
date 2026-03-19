-- CreateTable: HeroConfig
CREATE TABLE "HeroConfig" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "autoplaySeconds" INTEGER NOT NULL DEFAULT 10,
  "transitionDirection" TEXT NOT NULL DEFAULT 'left',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HeroConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HeroConfig_transitionDirection_check" CHECK ("transitionDirection" IN ('left', 'right')),
  CONSTRAINT "HeroConfig_autoplaySeconds_check" CHECK ("autoplaySeconds" >= 2 AND "autoplaySeconds" <= 60)
);

-- Seed default singleton row
INSERT INTO "HeroConfig" ("id", "autoplaySeconds", "transitionDirection", "updatedAt")
VALUES ('default', 10, 'left', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
