import "dotenv/config";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pgPkg from "pg";
import { hash } from "bcryptjs";

const { PrismaClient } = prismaPkg;
const { Pool } = pgPkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const requiredEnv = [
  "ADMIN_FIRST_NAME",
  "ADMIN_LAST_NAME",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

function assertEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}. Update .env before seeding.`
    );
  }
}

async function main() {
  assertEnv();

  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  let admin = existing;

  if (!admin) {
    const passwordHash = await hash(process.env.ADMIN_PASSWORD, 12);
    admin = await prisma.user.create({
      data: {
        firstName: process.env.ADMIN_FIRST_NAME,
        lastName: process.env.ADMIN_LAST_NAME,
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });
    console.log("Admin user seeded successfully.");
  } else {
    const nextFirstName = process.env.ADMIN_FIRST_NAME;
    const nextLastName = process.env.ADMIN_LAST_NAME;
    const shouldUpdateProfile =
      admin.firstName !== nextFirstName
      || admin.lastName !== nextLastName
      || admin.role !== "ADMIN"
      || admin.isActive !== true;

    if (shouldUpdateProfile) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: {
          firstName: nextFirstName,
          lastName: nextLastName,
          role: "ADMIN",
          isActive: true,
        },
      });
      console.log("Admin user exists. Profile synced from env.");
    } else {
      console.log("Admin user already exists and is up to date.");
    }
  }

  const existingPost = await prisma.post.findFirst();
  if (!existingPost) {
    const category = await prisma.category.create({
      data: {
        name: "Kişisel Notlar",
        slug: "kisisel-notlar",
      },
    });

    const tag = await prisma.tag.create({
      data: {
        name: "başlangıç",
        slug: "baslangic",
      },
    });

    const post = await prisma.post.create({
      data: {
        title: "İlk yazı: Blog nasıl şekillenecek?",
        slug: "ilk-yazi-blog-nasil-sekillenecek",
        excerpt:
          "Bu yazıda blogun hedeflerini, içerik akışını ve ileride neleri paylaşmayı planladığımı özetliyorum.",
        content:
          "Merhaba! Bu blogu teknik notlarımı derlemek, öğrendiklerimi paylaşmak ve üretim hızımı korumak için kurdum.\\n\\nYakın dönemde burada proje notları, öğrenme özetleri ve küçük deneyler yer alacak.\\n\\nGeri bildirimlerin için iletişim sayfasından bana ulaşabilirsin.",
        status: "PUBLISHED",
        publishedAt: new Date(),
        authorId: admin.id,
        categories: {
          create: [
            {
              category: {
                connect: { id: category.id },
              },
            },
          ],
        },
        tags: {
          create: [
            {
              tag: {
                connect: { id: tag.id },
              },
            },
          ],
        },
      },
    });

    console.log(`Demo içerik oluşturuldu: ${post.title}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
