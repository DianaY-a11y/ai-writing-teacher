import { useState } from 'react'
import { claudeAPI } from '../utils/claudeAPI'
import styles from '../styles/FeedbackCard.module.css'

export default function FeedbackCard({ 
  issue, 
  onClick, 
  isActive, 
  writingData, 
  currentStage,
  onIssueResolved 
}) {
  const [isCheckingResolution, setIsCheckingResolution] = useState(false)

  const getCurrentContentForStage = (stage, data) => {
    switch (stage) {
      case 0: return data.thesis?.trim()
      case 1: return data.claims?.map(c => c.text).join(', ')
      case 2: return JSON.stringify(data.evidence || {})
      case 3: return data.outline?.trim()
      default: return null
    }
  }

  const handleReviewIssue = async (e) => {
    e.stopPropagation() // Prevent card click

    setIsCheckingResolution(true)

    try {
      const response = await claudeAPI.checkIssueResolution({
        issue,
        currentContent: getCurrentContentForStage(currentStage, writingData),
        writingData
      })

      if (response.isResolved) {
        // Update issue status to resolved
        onIssueResolved(issue.id, response.explanation)
      } else {
        // Show why it's not resolved yet
        onIssueResolved(issue.id, null, response.feedback)
      }

    } catch (error) {
      console.error('Error checking resolution:', error)
    } finally {
      setIsCheckingResolution(false)
    }
  }

  return (
    <div 
      className={`${styles.feedbackCard} 
        ${isActive ? styles.active : ''} 
        ${issue.status === 'resolved' ? styles.resolved : ''}`}
      onClick={() => onClick(issue)}
    >
      <div className={styles.cardContent}>
        <span className={styles.issueText}>
          {issue.status === 'resolved' && '✅ '}
          {issue.title}
        </span>

        {issue.status === 'resolved' ? (
          <span className={styles.resolvedNote}>
            Issue resolved! {issue.resolutionNote}
          </span>
        ) : (
          <div className={styles.cardActions}>
            <span className={styles.clickHint}>Explore</span>
            <button 
              className={styles.clickHint}
              onClick={handleReviewIssue}
              disabled={isCheckingResolution}
            >
              <span>{isCheckingResolution ? 'Checking...' : 'Re-review'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}