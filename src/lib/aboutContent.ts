import "server-only";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n";

type AboutContentRecord = {
  aboutContentTr: string | null;
  aboutContentEn: string | null;
};

function normalizeStoredContent(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : fallback;
}

function buildDefaultContent(locale: Locale) {
  if (locale === "en") {
    return JSON.stringify({
      time: 1,
      version: "2.0.0",
      blocks: [
        { type: "header", data: { text: "About", level: 1 } },
        {
          type: "paragraph",
          data: {
            text: "Hi, I am a hiking enthusiast. In this blog, I share my hike notes, small route experiences, and what I learned from time in nature.",
          },
        },
        {
          type: "paragraph",
          data: {
            text: "My goal is not to showcase perfect routes, but to offer simple, sincere, and realistic experiences for people who want a closer connection with nature.",
          },
        },
        { type: "header", data: { text: "What You Will Find in This Blog", level: 2 } },
        {
          type: "list",
          data: {
            style: "unordered",
            items: [
              "Hiking articles and route experiences",
              "Seasonal observations and short photo notes",
              "Simple and actionable suggestions for beginners",
            ],
          },
        },
        { type: "header", data: { text: "Who Is This Blog For", level: 2 } },
        {
          type: "paragraph",
          data: {
            text: "For everyone who enjoys walking in nature, but does not know where to start or wants to build a more consistent hiking habit. My writing is especially for those who enjoy a calm pace.",
          },
        },
        { type: "header", data: { text: "My Approach in Nature", level: 2 } },
        {
          type: "list",
          data: {
            style: "unordered",
            items: [
              "Prioritizing safety and preparation notes while sharing routes",
              "Walking without harming nature and leaving no trace",
              "Choosing a joyful and sustainable pace over perfect performance",
            ],
          },
        },
        { type: "header", data: { text: "A Short Note", level: 2 } },
        {
          type: "paragraph",
          data: {
            text: "This page will be updated over time. As new routes and experiences are added, the About section will grow together.",
          },
        },
      ],
    });
  }

  return JSON.stringify({
    time: 1,
    version: "2.0.0",
    blocks: [
      { type: "header", data: { text: "Hakkımda", level: 1 } },
      {
        type: "paragraph",
        data: {
          text: "Merhaba, ben bir doğa yürüyüşü severim. Bu blogda yürüyüş notlarımı, küçük rota deneyimlerimi ve doğada geçirdiğim anlardan öğrendiklerimi paylaşıyorum.",
        },
      },
      {
        type: "paragraph",
        data: {
          text: "Amacım kusursuz rotalar göstermek değil; doğayla daha yakın bir bağ kurmak isteyenlere sade, samimi ve gerçek deneyimler sunmak.",
        },
      },
      { type: "header", data: { text: "Bu Blogda Neler Bulacaksınız?", level: 2 } },
      {
        type: "list",
        data: {
          style: "unordered",
          items: [
            "Doğa yürüyüşü yazıları ve rota deneyimleri",
            "Mevsime göre kısa gözlemler ve fotoğraf notları",
            "Yeni başlayanlar için sade ve uygulanabilir öneriler",
          ],
        },
      },
      { type: "header", data: { text: "Bu Blog Kimler İçin?", level: 2 } },
      {
        type: "paragraph",
        data: {
          text: "Doğada yürümeyi seven, ama nereden başlayacağını bilemeyen ya da daha düzenli yürüyüş alışkanlığı kurmak isteyen herkes için. Anlatımlarım özellikle sakin tempo sevenlere göre.",
        },
      },
      { type: "header", data: { text: "Doğada Yaklaşımım", level: 2 } },
      {
        type: "list",
        data: {
          style: "unordered",
          items: [
            "Rota paylaşırken güvenlik ve hazırlık notlarını öncelemek",
            "Doğaya zarar vermeden yürümek ve iz bırakmamak",
            "Mükemmel performans yerine keyifli ve sürdürülebilir tempo",
          ],
        },
      },
      { type: "header", data: { text: "Kısa Bir Not", level: 2 } },
      {
        type: "paragraph",
        data: {
          text: "Bu sayfa zamanla güncellenecek. Yeni rotalar ve deneyimler eklendikçe “Hakkımda” bölümü de birlikte büyüyecek.",
        },
      },
    ],
  });
}

async function getAboutContentRecord(): Promise<AboutContentRecord | null> {
  try {
    const record = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        aboutContentTr: true,
        aboutContentEn: true,
      },
    });
    return record;
  } catch {
    return null;
  }
}

export async function getAboutContent(locale: Locale): Promise<string> {
  const record = await getAboutContentRecord();
  const fallback = buildDefaultContent(locale);
  if (!record) {
    return fallback;
  }

  const content = locale === "en" ? record.aboutContentEn : record.aboutContentTr;
  return normalizeStoredContent(content, fallback);
}

export async function upsertAboutContent(locale: Locale, content: string): Promise<void> {
  const key = locale === "en" ? "aboutContentEn" : "aboutContentTr";

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      [key]: content,
    },
    update: {
      [key]: content,
    },
  });
}
