import { styles } from "../styles/ui";

export default function HomePage() {
  return (
    <>
      <h1 style={{ marginTop: 0, marginBottom: 10 }}>Bienvenue sur Collector.shop</h1>
      <p style={styles.muted}>
        “Collectionner, c’est raconter une histoire — une pièce à la fois.”
      </p>
      <p style={styles.muted}>
        Découvre, achète et vends des objets de collection. (Le contenu arrive bientôt.)
      </p>
    </>
  );
}
