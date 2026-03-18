import styles from "./AuthorCard.module.css";

interface AuthorCardProps {
  author: {
    firstName: string;
    lastName: string;
    bio?: string | null;
    avatarUrl?: string | null;
  } | null | undefined;
}

export default function AuthorCard({ author }: AuthorCardProps) {
  if (!author) return null;

  return (
    <div className={styles.card}>
      <div className={styles.avatarWrap}>
        {author.avatarUrl ? (
          <img
            src={author.avatarUrl}
            alt={`${author.firstName} ${author.lastName}`}
            className={styles.avatar}
          />
        ) : (
          <div className={styles.avatarPlaceholder} />
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.label}>Yazar</p>
        <h3 className={styles.name}>
          {author.firstName} {author.lastName}
        </h3>
        {author.bio && <p className={styles.bio}>{author.bio}</p>}
      </div>
    </div>
  );
}
