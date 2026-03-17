import styles from "./page.module.css";

export default function ContactPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>İletişim</h1>
          <p>
            Soru, öneri veya geri bildirim için aşağıdaki kanallardan bana
            ulaşabilirsin.
          </p>
        </header>

        <section className={styles.section}>
          <h2>E-posta</h2>
          <p>hello@berkansozer.com</p>
        </section>

        <section className={styles.section}>
          <h2>Sosyal</h2>
          <ul>
            <li>LinkedIn: linkedin.com/in/berkansozer</li>
            <li>GitHub: github.com/berkansozer</li>
            <li>Twitter/X: x.com/berkansozer</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
