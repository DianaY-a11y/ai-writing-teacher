import { useState } from 'react'
import Header from '../components/Header'
import ProgressTracker from '../components/ProgressTracker'
import MainLayout from '../components/MainLayout'

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true)
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

  if (showWelcome) {
    return (
      <div className="welcome-container">
        <div className="welcome-content">
          <h1>AI Writing Tutor</h1>
          <h2>Here are the 4 steps to writing</h2>
          
          <div className="steps-list">
            <div className="step">
              <span className="step-title">Argument Construction</span>
              <span className="step-description">Draft a clear thesis statement that takes a specific position on your topic.</span>
            </div>
            <div className="step">
              <span className="step-title">Claim Development</span>
              <span className="step-description">Break down your thesis into 2-3 main claims that directly support your position.</span>
            </div>
            <div className="step">
              <span className="step-title">Evidence Integration</span>
              <span className="step-description">Support each claim with credible evidence such as statistics, expert quotes, or research studies.</span>
            </div>
            <div className="step">
              <span className="step-title">Argument Review</span>
              <span className="step-description">Review your complete argument structure for logical flow and persuasive strength.</span>
            </div>
          </div>
          
          <span 
            onClick={() => setShowWelcome(false)}
            className="start-writing-link"
          >
            Start Writing
          </span>
        </div>
      </div>
    )
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