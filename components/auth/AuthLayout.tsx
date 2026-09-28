import type { ReactNode } from "react";
import styles from "./auth.module.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <section className={styles.card}>{children}</section>
        <div className={styles.brand} aria-label="PT Andima Transportindo">
          <span>PT. ANDIMA</span>
          <span>TRANSPORTINDO</span>
        </div>
      </div>
    </main>
  );
}
