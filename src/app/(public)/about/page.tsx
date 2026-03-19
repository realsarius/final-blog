import Link from "next/link";
import styles from "./page.module.css";

const BLOG_FEATURES = [
  "Doğa yürüyüşü yazıları ve rota deneyimleri",
  "Mevsime göre kısa gözlemler ve fotoğraf notları",
  "Yeni başlayanlar için sade ve uygulanabilir öneriler",
];

const NATURE_VALUES = [
  "Rota paylaşırken güvenlik ve hazırlık notlarını öncelemek",
  "Doğaya zarar vermeden yürümek ve iz bırakmamak",
  "Mükemmel performans yerine keyifli ve sürdürülebilir tempo",
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>Hakkımda</h1>
          <p>
            Merhaba, ben bir doğa yürüyüşü severim. Bu blogda yürüyüş
            notlarımı, küçük rota deneyimlerimi ve doğada geçirdiğim anlardan
            öğrendiklerimi paylaşıyorum.
          </p>
          <p>
            Amacım kusursuz rotalar göstermek değil; doğayla daha yakın bir bağ
            kurmak isteyenlere sade, samimi ve gerçek deneyimler sunmak.
          </p>
        </header>

        <section className={styles.section}>
          <h2>Bu Blogda Neler Bulacaksınız?</h2>
          <ul>
            {BLOG_FEATURES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Bu Blog Kimler İçin?</h2>
          <p>
            Doğada yürümeyi seven, ama nereden başlayacağını bilemeyen ya da
            daha düzenli yürüyüş alışkanlığı kurmak isteyen herkes için.
            Anlatımlarım özellikle sakin tempo sevenlere göre.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Doğada Yaklaşımım</h2>
          <ul>
            {NATURE_VALUES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Buradan Başlayabilirsiniz</h2>
          <div className={styles.quickLinks}>
            <Link href="/blog">Son yazılara göz at</Link>
            <Link href="/blog?sort=popular">En çok okunan yazılar</Link>
            <Link href="/contact">İletişime geç</Link>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Kısa Bir Not</h2>
          <p>
            Bu sayfa zamanla güncellenecek. Yeni rotalar ve deneyimler
            eklendikçe “Hakkımda” bölümü de birlikte büyüyecek.
          </p>
        </section>
      </div>
    </div>
  );
}
