import styles from '../styles/Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      Your AI Writing Teacher
      <p className={styles.subtitle}>Build your argument step by step with AI feedback.</p>
    </header>
  )
}