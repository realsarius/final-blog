import type { Metadata } from "next";
import { getAdminEmail } from "@/lib/seo";
import { getServerLocale } from "@/lib/i18n";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return locale === "en"
    ? { title: "Privacy", description: "A short summary of how personal data is handled on this site." }
    : { title: "Gizlilik", description: "Kişisel verilerin bu sitede nasıl ele alındığına dair özet bilgi." };
}

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? {
      title: "Privacy",
      intro: "This page briefly explains how personal data is processed.",
      collectedTitle: "Collected Data",
      collectedText: "Only basic information required for admin sign-in is stored. Extra data such as IP or device history is not collected.",
      cookiesTitle: "Cookies",
      cookiesText: "Technical cookies required for session management are used. These cookies are not used for ads or tracking.",
      contactTitle: "Contact",
      contactText: "For any questions, you can reach us at {email}.",
    }
    : {
      title: "Gizlilik",
      intro: "Bu sayfa kişisel verilerin nasıl işlendiğini kısa ve net şekilde açıklar.",
      collectedTitle: "Toplanan Veriler",
      collectedText: "Yalnızca yönetim girişi için gerekli temel bilgiler tutulur. IP veya cihaz geçmişi gibi ek veriler toplanmaz.",
      cookiesTitle: "Çerezler",
      cookiesText: "Oturum yönetimi için gerekli teknik çerezler kullanılır. Bu çerezler reklam veya izleme amacı taşımaz.",
      contactTitle: "İletişim",
      contactText: "Herhangi bir sorunuz için {email} adresinden ulaşabilirsiniz.",
    };
  const adminEmail = await getAdminEmail();
  const contactText = t.contactText.replace("{email}", adminEmail);

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
        </header>

        <section className={styles.section}>
          <h2>{t.collectedTitle}</h2>
          <p>{t.collectedText}</p>
        </section>

        <section className={styles.section}>
          <h2>{t.cookiesTitle}</h2>
          <p>{t.cookiesText}</p>
        </section>

        <section className={styles.section}>
          <h2>{t.contactTitle}</h2>
          <p>{contactText}</p>
        </section>
      </div>
    </div>
  );
}
