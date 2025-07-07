import styles from '../styles/ProgressTracker.module.css'

const writingStages = [
  'Argument Construction',
  'Claim Development', 
  'Evidence Integration',
  'Argument Review'
]

export default function ProgressTracker({ currentStage }) {

  return (
    <div className={styles.progressContainer}>
      <h2 className={styles.progressTitle}>Writing Progress</h2>
      <div className={styles.progressBar}>
        {writingStages.map((stage, index) => {
          let stageClass = styles.progressStage;
          if (index < currentStage) {
            stageClass += ` ${styles.completed}`;
          } else if (index === currentStage) {
            stageClass += ` ${styles.current}`;
          }
          
          return (
            <div 
              key={index}
              className={stageClass}
            >
              <div className={styles.stageName}>{stage}</div>
            </div>
          );
        })}
      </div>
    </div>
  )
}