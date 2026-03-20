import Link from "next/link";
import type { Metadata } from "next";
import { getServerLocale } from "@/lib/i18n";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return locale === "en"
    ? { title: "About", description: "My hiking notes, route experiences, and blogging approach." }
    : { title: "Hakkımda", description: "Doğa yürüyüşü notları, rota deneyimleri ve blog yaklaşımım." };
}

export default async function AboutPage() {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? {
      title: "About",
      intro1: "Hi, I am a hiking enthusiast. In this blog, I share my hike notes, small route experiences, and what I learned from time in nature.",
      intro2: "My goal is not to showcase perfect routes, but to offer simple, sincere, and realistic experiences for people who want a closer connection with nature.",
      sectionFeatures: "What You Will Find in This Blog",
      features: [
        "Hiking articles and route experiences",
        "Seasonal observations and short photo notes",
        "Simple and actionable suggestions for beginners",
      ],
      sectionAudience: "Who Is This Blog For",
      audience: "For everyone who enjoys walking in nature, but does not know where to start or wants to build a more consistent hiking habit. My writing is especially for those who enjoy a calm pace.",
      sectionValues: "My Approach in Nature",
      values: [
        "Prioritizing safety and preparation notes while sharing routes",
        "Walking without harming nature and leaving no trace",
        "Choosing a joyful and sustainable pace over perfect performance",
      ],
      sectionStart: "You Can Start Here",
      latest: "Browse latest posts",
      popular: "Most read posts",
      contact: "Get in touch",
      sectionNote: "A Short Note",
      note: "This page will be updated over time. As new routes and experiences are added, the About section will grow together.",
    }
    : {
      title: "Hakkımda",
      intro1: "Merhaba, ben bir doğa yürüyüşü severim. Bu blogda yürüyüş notlarımı, küçük rota deneyimlerimi ve doğada geçirdiğim anlardan öğrendiklerimi paylaşıyorum.",
      intro2: "Amacım kusursuz rotalar göstermek değil; doğayla daha yakın bir bağ kurmak isteyenlere sade, samimi ve gerçek deneyimler sunmak.",
      sectionFeatures: "Bu Blogda Neler Bulacaksınız?",
      features: [
        "Doğa yürüyüşü yazıları ve rota deneyimleri",
        "Mevsime göre kısa gözlemler ve fotoğraf notları",
        "Yeni başlayanlar için sade ve uygulanabilir öneriler",
      ],
      sectionAudience: "Bu Blog Kimler İçin?",
      audience: "Doğada yürümeyi seven, ama nereden başlayacağını bilemeyen ya da daha düzenli yürüyüş alışkanlığı kurmak isteyen herkes için. Anlatımlarım özellikle sakin tempo sevenlere göre.",
      sectionValues: "Doğada Yaklaşımım",
      values: [
        "Rota paylaşırken güvenlik ve hazırlık notlarını öncelemek",
        "Doğaya zarar vermeden yürümek ve iz bırakmamak",
        "Mükemmel performans yerine keyifli ve sürdürülebilir tempo",
      ],
      sectionStart: "Buradan Başlayabilirsiniz",
      latest: "Son yazılara göz at",
      popular: "En çok okunan yazılar",
      contact: "İletişime geç",
      sectionNote: "Kısa Bir Not",
      note: "Bu sayfa zamanla güncellenecek. Yeni rotalar ve deneyimler eklendikçe “Hakkımda” bölümü de birlikte büyüyecek.",
    };

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>{t.title}</h1>
          <p>{t.intro1}</p>
          <p>{t.intro2}</p>
        </header>

        <section className={styles.section}>
          <h2>{t.sectionFeatures}</h2>
          <ul>
            {t.features.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>{t.sectionAudience}</h2>
          <p>{t.audience}</p>
        </section>

        <section className={styles.section}>
          <h2>{t.sectionValues}</h2>
          <ul>
            {t.values.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>{t.sectionStart}</h2>
          <div className={styles.quickLinks}>
            <Link href="/blog">{t.latest}</Link>
            <Link href="/blog?sort=popular">{t.popular}</Link>
            <Link href="/contact">{t.contact}</Link>
          </div>
        </section>

        <section className={styles.section}>
          <h2>{t.sectionNote}</h2>
          <p>{t.note}</p>
        </section>
      </div>
    </div>
  );
}
