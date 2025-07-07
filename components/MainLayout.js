import AICoach from './AICoach'
import TextEditor from './TextEditor'
import styles from '../styles/MainLayout.module.css'

export default function MainLayout({ currentStage, setCurrentStage, writingData, setWritingData }) {
  return (
    <div className={styles.mainLayout}>
      <div className={styles.leftPanel}>
        <AICoach 
          currentStage={currentStage}
          writingData={writingData}
        />
      </div>
      <div className={styles.rightPanel}>
        <TextEditor 
          currentStage={currentStage}
          setCurrentStage={setCurrentStage}
          writingData={writingData}
          setWritingData={setWritingData}
        />
      </div>
    </div>
  )
}