import Link from "next/link";
import type { Metadata } from "next";
import {
  getAdminEmail,
  getDisplayUrl,
  getGithubUrl,
  getLinkedinUrl,
} from "@/lib/seo";
import { getServerLocale } from "@/lib/i18n";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return locale === "en"
    ? { title: "Contact", description: "Contact page for content, collaboration, and project discussions." }
    : { title: "İletişim", description: "İçerik, iş birliği ve proje görüşmeleri için iletişim sayfası." };
}

export default async function ContactPage() {
  const locale = await getServerLocale();
  const t = locale === "en"
    ? {
      eyebrow: "Contact",
      title: "Let's build something together.",
      lead: "Leave a short message and let us clearly discuss what you need. If it fits, we can shape a roadmap together.",
      quickNotesTitle: "A few notes for a better start",
      quickNotesText: "The clearer your message is, the faster and more accurately I can respond. Sharing scope, timeline, and expectations helps a lot.",
      email: "Email",
      linkedin: "LinkedIn",
      github: "GitHub",
      notReadyTitle: "Not ready to send a message yet?",
      notReadyText: "You can browse articles first, then come back with a clearer brief.",
      goBlog: "Go to Blog",
      about: "About",
      firstName: "First name",
      lastName: "Last name",
      topic: "Topic",
      topicSelect: "Make a selection",
      topicCollab: "Collaboration",
      topicConsult: "Consulting",
      topicMentor: "Mentorship",
      topicOther: "Other",
      message: "Message",
      messagePlaceholder: "A few sentences about your project or need...",
      send: "Send",
      formHint: "The form opens your default email client. You can also send a direct email.",
      faqTitle: "FAQ",
      faq: [
        {
          question: "How fast do you respond?",
          answer: "I usually reply within 24 hours on weekdays, and within 48 hours during busy periods.",
        },
        {
          question: "What topics can I contact you for?",
          answer: "You can write about software, product development, content partnerships, speaking invitations, and mentorship.",
        },
        {
          question: "Can we start the project immediately?",
          answer: "It depends on schedule. If you share your target date, I can suggest a suitable kickoff plan.",
        },
      ],
      miniAboutTitle: "Mini About",
      miniAboutText: "I focus on software and product development. I enjoy explaining complex ideas in a simple way and turning them into practical action.",
    }
    : {
      eyebrow: "İletişim",
      title: "Birlikte bir şey inşa edelim.",
      lead: "Kısa bir mesaj bırak, neye ihtiyacın olduğunu net konuşalım. Uygunsa birlikte bir yol haritası çıkarırız.",
      quickNotesTitle: "İyi bir başlangıç için birkaç not",
      quickNotesText: "Ne istediğini ne kadar net yazarsan, o kadar hızlı ve doğru geri dönebilirim. Kapsam, zaman ve beklenti bilgisini eklemek çok iş kolaylaştırıyor.",
      email: "E-posta",
      linkedin: "LinkedIn",
      github: "GitHub",
      notReadyTitle: "Henüz mesaj atmaya hazır değil misin?",
      notReadyText: "Önce yazıları gezebilir, sonra daha net bir brief ile geri dönebilirsin.",
      goBlog: "Blog'a git",
      about: "Hakkımda",
      firstName: "Ad",
      lastName: "Soyad",
      topic: "Konu",
      topicSelect: "Seçim yap",
      topicCollab: "İş birliği",
      topicConsult: "Danışmanlık",
      topicMentor: "Mentorluk",
      topicOther: "Diğer",
      message: "Mesaj",
      messagePlaceholder: "Proje veya ihtiyacın hakkında birkaç cümle...",
      send: "Gönder",
      formHint: "Form, varsayılan e-posta istemcini açar. İstersen doğrudan e-posta da atabilirsin.",
      faqTitle: "Sık sorulanlar",
      faq: [
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
      ],
      miniAboutTitle: "Mini Hakkımda",
      miniAboutText: "Yazılım ve ürün geliştirme odaklı çalışıyorum. Karmaşık fikirleri sade bir dille anlatmayı ve uygulanabilir hale getirmeyi seviyorum.",
    };

  const adminEmail = await getAdminEmail();
  const linkedinUrl = getLinkedinUrl();
  const githubUrl = getGithubUrl();

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
        </header>

        <section className={styles.panel}>
          <div className={styles.info}>
            <h2 className={styles.infoTitle}>{t.quickNotesTitle}</h2>
            <p className={styles.infoText}>{t.quickNotesText}</p>

            <div className={styles.contactList}>
              <p>
                {t.email}
                <a href={`mailto:${adminEmail}`}>{adminEmail}</a>
              </p>
              {linkedinUrl ? (
                <p>
                  {t.linkedin}
                  <a href={linkedinUrl} target="_blank" rel="noreferrer">
                    {getDisplayUrl(linkedinUrl)}
                  </a>
                </p>
              ) : null}
              {githubUrl ? (
                <p>
                  {t.github}
                  <a href={githubUrl} target="_blank" rel="noreferrer">
                    {getDisplayUrl(githubUrl)}
                  </a>
                </p>
              ) : null}
            </div>

            <div className={styles.secondaryBox}>
              <h3>{t.notReadyTitle}</h3>
              <p>{t.notReadyText}</p>
              <div className={styles.secondaryLinks}>
                <Link href="/blog">{t.goBlog}</Link>
                <Link href="/about">{t.about}</Link>
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
                  {t.firstName}
                  <input name="firstName" required />
                </label>
                <label>
                  {t.lastName}
                  <input name="lastName" required />
                </label>
              </div>

              <label>
                {t.email}
                <input name="email" type="email" required />
              </label>

              <label>
                {t.topic}
                <select name="topic" defaultValue="">
                  <option value="" disabled>{t.topicSelect}</option>
                  <option value="isbirligi">{t.topicCollab}</option>
                  <option value="danismanlik">{t.topicConsult}</option>
                  <option value="mentorluk">{t.topicMentor}</option>
                  <option value="diger">{t.topicOther}</option>
                </select>
              </label>

              <label>
                {t.message}
                <textarea
                  name="message"
                  rows={6}
                  placeholder={t.messagePlaceholder}
                  required
                />
              </label>

              <button type="submit">{t.send}</button>
            </form>
            <p className={styles.formHint}>{t.formHint}</p>
          </div>
        </section>

        <section className={styles.faqSection}>
          <h2>{t.faqTitle}</h2>
          <div className={styles.faqGrid}>
            {t.faq.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.miniAbout}>
          <h2>{t.miniAboutTitle}</h2>
          <p>{t.miniAboutText}</p>
        </section>
      </div>
    </div>
  );
}
