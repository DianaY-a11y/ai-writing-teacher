import { useState } from 'react'
import AICoach from './AICoach'
import TextEditor from './TextEditor'
import styles from '../styles/MainLayout.module.css'

export default function MainLayout({ currentStage, setCurrentStage, writingData, setWritingData }) {
  const [hasFeedback, setHasFeedback] = useState(false)

  // Reset feedback state when stage changes
  const handleStageChange = (newStage) => {
    setCurrentStage(newStage)
    setHasFeedback(false)
  }

  return (
    <div className={styles.mainLayout}>
      <div className={styles.leftPanel}>
        <AICoach 
          currentStage={currentStage}
          writingData={writingData}
          onFeedbackGenerated={() => setHasFeedback(true)}
        />
      </div>
      <div className={styles.rightPanel}>
        <TextEditor 
          currentStage={currentStage}
          setCurrentStage={handleStageChange}
          writingData={writingData}
          setWritingData={setWritingData}
          hasFeedback={hasFeedback}
        />
      </div>
    </div>
  )
}