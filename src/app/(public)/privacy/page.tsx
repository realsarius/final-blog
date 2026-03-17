import styles from "./page.module.css";

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>Gizlilik</h1>
          <p>
            Bu sayfa kişisel verilerin nasıl işlendiğini kısa ve net şekilde
            açıklar.
          </p>
        </header>

        <section className={styles.section}>
          <h2>Toplanan Veriler</h2>
          <p>
            Yalnızca yönetim girişi için gerekli temel bilgiler tutulur. IP veya
            cihaz geçmişi gibi ek veriler toplanmaz.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Çerezler</h2>
          <p>
            Oturum yönetimi için gerekli teknik çerezler kullanılır. Bu çerezler
            reklam veya izleme amacı taşımaz.
          </p>
        </section>

        <section className={styles.section}>
          <h2>İletişim</h2>
          <p>
            Herhangi bir sorunuz için hello@berkansozer.com adresinden
            ulaşabilirsiniz.
          </p>
        </section>
      </div>
    </div>
  );
}
