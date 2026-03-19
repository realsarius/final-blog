-- AlterTable: User add avatar crop focus
ALTER TABLE "User"
  ADD COLUMN "avatarFocusX" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "avatarFocusY" INTEGER NOT NULL DEFAULT 50;
