import { useState } from 'react'
import Header from '../components/Header'
import ProgressTracker from '../components/ProgressTracker'
import MainLayout from '../components/MainLayout'

export default function Home() {
  const [currentStage, setCurrentStage] = useState(0)
  const [writingData, setWritingData] = useState({
    thesis: '',
    claims: [],
    evidence: {},
    outline: undefined
  })

  const backtrack = () => {
    if (currentStage > 0) {
      setCurrentStage(currentStage - 1)
    }
  }

  const startOver = () => {
    setCurrentStage(0)
    setWritingData({
      thesis: '',
      claims: [],
      evidence: {},
      outline: undefined
    })
  }

  return (
    <div className="app">
      <Header />
      <ProgressTracker currentStage={currentStage} />
      <MainLayout 
        currentStage={currentStage} 
        setCurrentStage={setCurrentStage}
        writingData={writingData}
        setWritingData={setWritingData}
      />
      <footer className="app-footer">
        <div className="footer-left">
          <button 
            onClick={startOver}
            className="footer-button"
          >
            Start Over
          </button>
          <button 
            onClick={backtrack} 
            disabled={currentStage === 0}
            className="footer-button"
          >
            ← Back
          </button>
        </div>
      </footer>
    </div>
  )
}