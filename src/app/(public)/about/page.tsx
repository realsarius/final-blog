import styles from "./page.module.css";

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          <h1>Hakkımda</h1>
          <p>
            Merhaba, ben Berkan. Ürün ve yazılım odaklı çalışan, öğrendiklerini
            düzenli olarak not alan bir geliştiriciyim.
          </p>
        </header>

        <section className={styles.section}>
          <h2>Odak Alanları</h2>
          <ul>
            <li>Ürün fikirlerini küçük ve hızlı denemelerle doğrulamak</li>
            <li>Bakımı kolay, sade ve güvenli sistemler kurmak</li>
            <li>Teknik bilgiyi net ve anlaşılır şekilde paylaşmak</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Bu Blog Neden Var?</h2>
          <p>
            Notlarımı tek bir yerde toparlamak, yazıları kolayca yeniden
            kullanmak ve ileride annem için de benzer bir blog kurabilmek için
            burada yazıyorum.
          </p>
        </section>
      </div>
    </div>
  );
}
