import Link from "next/link";
import type { Metadata } from "next";
import {
  getAdminEmail,
  getDisplayUrl,
  getGithubUrl,
  getLinkedinUrl,
} from "@/lib/seo";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "İletişim",
  description: "İçerik, iş birliği ve proje görüşmeleri için iletişim sayfası.",
};

const FAQ_ITEMS = [
  {
    question: "Ne kadar sürede geri dönüş yapıyorsun?",
    answer: "Hafta içi gelen mesajlara genelde 24 saat içinde, yoğun dönemlerde en geç 48 saat içinde dönüş yapıyorum.",
  },
  {
    question: "Hangi konularda iletişime geçebilirim?",
    answer: "Yazılım, ürün geliştirme, içerik iş birlikleri, konuşma davetleri ve mentorluk talepleri için yazabilirsin.",
  },
  {
    question: "Projeyi hemen başlatmak mümkün mü?",
    answer: "Takvime göre değişiyor. Mesajında hedef tarihini paylaşırsan uygun bir başlangıç planı önerebilirim.",
  },
];

export default async function ContactPage() {
  const adminEmail = await getAdminEmail();
  const linkedinUrl = getLinkedinUrl();
  const githubUrl = getGithubUrl();

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>İletişim</p>
          <h1>Birlikte bir şey inşa edelim.</h1>
          <p>
            Kısa bir mesaj bırak, neye ihtiyacın olduğunu net konuşalım. Uygunsa
            birlikte bir yol haritası çıkarırız.
          </p>
        </header>

        <section className={styles.panel}>
          <div className={styles.info}>
            <h2 className={styles.infoTitle}>İyi bir başlangıç için birkaç not</h2>
            <p className={styles.infoText}>
              Ne istediğini ne kadar net yazarsan, o kadar hızlı ve doğru geri
              dönebilirim. Kapsam, zaman ve beklenti bilgisini eklemek çok iş
              kolaylaştırıyor.
            </p>

            <div className={styles.contactList}>
              <p>
                E-posta
                <a href={`mailto:${adminEmail}`}>{adminEmail}</a>
              </p>
              {linkedinUrl ? (
                <p>
                  LinkedIn
                  <a href={linkedinUrl} target="_blank" rel="noreferrer">
                    {getDisplayUrl(linkedinUrl)}
                  </a>
                </p>
              ) : null}
              {githubUrl ? (
                <p>
                  GitHub
                  <a href={githubUrl} target="_blank" rel="noreferrer">
                    {getDisplayUrl(githubUrl)}
                  </a>
                </p>
              ) : null}
            </div>

            <div className={styles.secondaryBox}>
              <h3>Henüz mesaj atmaya hazır değil misin?</h3>
              <p>
                Önce yazıları gezebilir, sonra daha net bir brief ile geri
                dönebilirsin.
              </p>
              <div className={styles.secondaryLinks}>
                <Link href="/blog">Blog&apos;a git</Link>
                <Link href="/about">Hakkımda</Link>
              </div>
            </div>
          </div>

          <div className={styles.formWrap}>
            <form
              className={styles.form}
              action={`mailto:${adminEmail}`}
              method="post"
              encType="text/plain"
            >
              <div className={styles.row}>
                <label>
                  Ad
                  <input name="firstName" required />
                </label>
                <label>
                  Soyad
                  <input name="lastName" required />
                </label>
              </div>

              <label>
                E-posta
                <input name="email" type="email" required />
              </label>

              <label>
                Konu
                <select name="topic" defaultValue="">
                  <option value="" disabled>Seçim yap</option>
                  <option value="isbirligi">İş birliği</option>
                  <option value="danismanlik">Danışmanlık</option>
                  <option value="mentorluk">Mentorluk</option>
                  <option value="diger">Diğer</option>
                </select>
              </label>

              <label>
                Mesaj
                <textarea
                  name="message"
                  rows={6}
                  placeholder="Proje veya ihtiyacın hakkında birkaç cümle..."
                  required
                />
              </label>

              <button type="submit">Gönder</button>
            </form>
            <p className={styles.formHint}>
              Form, varsayılan e-posta istemcini açar. İstersen doğrudan e-posta
              da atabilirsin.
            </p>
          </div>
        </section>

        <section className={styles.faqSection}>
          <h2>Sık sorulanlar</h2>
          <div className={styles.faqGrid}>
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.miniAbout}>
          <h2>Mini Hakkımda</h2>
          <p>
            Yazılım ve ürün geliştirme odaklı çalışıyorum. Karmaşık fikirleri
            sade bir dille anlatmayı ve uygulanabilir hale getirmeyi seviyorum.
          </p>
        </section>
      </div>
    </div>
  );
}
