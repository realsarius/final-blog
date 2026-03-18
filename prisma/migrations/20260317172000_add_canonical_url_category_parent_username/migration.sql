-- AlterTable: User add username (nullable, unique)
ALTER TABLE "User" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AlterTable: Post add canonicalUrl
ALTER TABLE "Post" ADD COLUMN "canonicalUrl" TEXT;

-- AlterTable: Category add parentId (self-relation)
ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
