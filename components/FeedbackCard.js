import { useState } from 'react'
import styles from '../styles/FeedbackCard.module.css'

export default function FeedbackCard({ issue, onClick, isActive }) {
  return (
    <div 
      className={`${styles.feedbackCard} ${isActive ? styles.active : ''}`}
      onClick={() => onClick(issue)}
    >
      <div className={styles.cardContent}>
        <span className={styles.issueText}>{issue}</span>
        <span className={styles.clickHint}>Click to explore</span>
      </div>
    </div>
  )
}