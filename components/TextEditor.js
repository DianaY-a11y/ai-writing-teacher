import { useState } from 'react'
import styles from '../styles/TextEditor.module.css'

const stages = [
  'Argument Construction',
  'Claim Development', 
  'Evidence Integration',
  'Argument Review'
]

export default function TextEditor({ currentStage, setCurrentStage, writingData, setWritingData }) {
  const [wordCount, setWordCount] = useState(0)

  const handleThesisChange = (e) => {
    const text = e.target.value
    setWritingData(prev => ({ ...prev, thesis: text }))
    
    const words = text.trim().split(/\s+/).filter(word => word.length > 0)
    setWordCount(words.length)
  }

  const addClaim = () => {
    setWritingData(prev => ({
      ...prev,
      claims: [...prev.claims, { text: '', subclaims: [] }]
    }))
  }

  const updateClaim = (index, text) => {
    setWritingData(prev => ({
      ...prev,
      claims: prev.claims.map((claim, i) => 
        i === index ? { ...claim, text } : claim
      )
    }))
  }

  const addSubclaim = (claimIndex) => {
    setWritingData(prev => ({
      ...prev,
      claims: prev.claims.map((claim, i) => 
        i === claimIndex 
          ? { ...claim, subclaims: [...claim.subclaims, ''] }
          : claim
      )
    }))
  }

  const updateSubclaim = (claimIndex, subclaimIndex, text) => {
    setWritingData(prev => ({
      ...prev,
      claims: prev.claims.map((claim, i) => 
        i === claimIndex 
          ? { 
              ...claim, 
              subclaims: claim.subclaims.map((sub, j) => 
                j === subclaimIndex ? text : sub
              )
            }
          : claim
      )
    }))
  }

  const addEvidence = (claimIndex, subclaimIndex = null) => {
    const key = subclaimIndex !== null ? `${claimIndex}-${subclaimIndex}` : `${claimIndex}`
    setWritingData(prev => ({
      ...prev,
      evidence: {
        ...prev.evidence,
        [key]: [...(prev.evidence[key] || []), '']
      }
    }))
  }

  const updateEvidence = (claimIndex, evidenceIndex, text, subclaimIndex = null) => {
    const key = subclaimIndex !== null ? `${claimIndex}-${subclaimIndex}` : `${claimIndex}`
    setWritingData(prev => ({
      ...prev,
      evidence: {
        ...prev.evidence,
        [key]: prev.evidence[key].map((ev, i) => 
          i === evidenceIndex ? text : ev
        )
      }
    }))
  }

  const deleteClaim = (claimIndex) => {
    setWritingData(prev => ({
      ...prev,
      claims: prev.claims.filter((_, i) => i !== claimIndex)
    }))
  }

  const deleteSubclaim = (claimIndex, subclaimIndex) => {
    setWritingData(prev => ({
      ...prev,
      claims: prev.claims.map((claim, i) => 
        i === claimIndex 
          ? { 
              ...claim, 
              subclaims: claim.subclaims.filter((_, j) => j !== subclaimIndex)
            }
          : claim
      )
    }))
  }

  const deleteEvidence = (claimIndex, evidenceIndex, subclaimIndex = null) => {
    const key = subclaimIndex !== null ? `${claimIndex}-${subclaimIndex}` : `${claimIndex}`
    setWritingData(prev => ({
      ...prev,
      evidence: {
        ...prev.evidence,
        [key]: prev.evidence[key].filter((_, i) => i !== evidenceIndex)
      }
    }))
  }

  const nextStage = () => {
    if (currentStage < stages.length - 1) {
      setCurrentStage(currentStage + 1)
    } else if (currentStage === 3) {
      // Handle "Generate Paper" action from Argument Review stage
      console.log('Generate Paper clicked - ready to generate essay')
      // This is where you could integrate with Claude API to generate the full paper
    }
  }

  const renderArgumentConstruction = () => (
    <div className={styles.stageContent}>
      <textarea
        value={writingData.thesis}
        onChange={handleThesisChange}
        placeholder="Draft your thesis here"
        className={styles.textArea}
      />
      <div className={styles.stageFooterWithCount}>
        <div className={styles.wordCount}>Words: {wordCount}</div>
        <button 
          onClick={nextStage} 
          disabled={!writingData.thesis.trim()}
          className={styles.nextButton}
        >
          Next Stage
        </button>
      </div>
    </div>
  )

  const renderClaimDevelopment = () => (
    <div className={styles.stageContent}>
      <div className={styles.thesisDisplay}>
        <strong>Thesis:</strong> {writingData.thesis}
      </div>
      
      <div className={styles.claimsSection}>
        {writingData.claims.map((claim, index) => (
          <div key={index} className={styles.claimItem}>
            <div className={styles.inputWithDelete}>
              <input
                type="text"
                value={claim.text}
                onChange={(e) => updateClaim(index, e.target.value)}
                placeholder={`Claim ${index + 1}`}
                className={styles.claimInput}
              />
              <button 
                onClick={() => deleteClaim(index)}
                className={styles.deleteButton}
              >
                Delete
              </button>
            </div>
            
            {claim.subclaims.map((subclaim, subIndex) => (
              <div key={subIndex} className={styles.inputWithDelete}>
                <input
                  type="text"
                  value={subclaim}
                  onChange={(e) => updateSubclaim(index, subIndex, e.target.value)}
                  placeholder={`Subclaim ${subIndex + 1}`}
                  className={styles.subclaimInput}
                />
                <button 
                  onClick={() => deleteSubclaim(index, subIndex)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => addSubclaim(index)} 
              className={styles.addButton}
            >
              + Subclaim
            </button>
          </div>
        ))}
        
        <button onClick={addClaim} className={styles.addButton}>
          + Claim
        </button>
      </div>

      <div className={styles.stageFooter}>
        <button 
          onClick={nextStage} 
          disabled={!(writingData.claims.length > 0 && writingData.claims.some(c => c.text.trim()))}
          className={styles.nextButton}
        >
          Next Stage
        </button>
      </div>
    </div>
  )

  const renderEvidenceIntegration = () => (
    <div className={styles.stageContent}>
      <div className={styles.thesisDisplay}>
        <strong>Thesis:</strong> {writingData.thesis}
      </div>
      
      <div className={styles.claimsSection}>
        {writingData.claims.map((claim, claimIndex) => (
          <div key={claimIndex} className={styles.claimWithEvidence}>
            <div className={styles.claimText}><strong>Claim {claimIndex + 1}:</strong> {claim.text}</div>
            
            {(writingData.evidence[claimIndex] || []).map((evidence, evidenceIndex) => (
              <div key={evidenceIndex} className={styles.inputWithDelete}>
                <input
                  type="text"
                  value={evidence}
                  onChange={(e) => updateEvidence(claimIndex, evidenceIndex, e.target.value)}
                  placeholder={`Evidence ${evidenceIndex + 1}`}
                  className={styles.evidenceInput}
                />
                <button 
                  onClick={() => deleteEvidence(claimIndex, evidenceIndex)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => addEvidence(claimIndex)} 
              className={styles.addButton}
            >
              + Evidence
            </button>

            {claim.subclaims.map((subclaim, subIndex) => (
              <div key={subIndex} className={styles.subclaimWithEvidence}>
                <div className={styles.subclaimText}><strong>Subclaim:</strong> {subclaim}</div>
                
                {(writingData.evidence[`${claimIndex}-${subIndex}`] || []).map((evidence, evidenceIndex) => (
                  <div key={evidenceIndex} className={styles.inputWithDelete}>
                    <input
                      type="text"
                      value={evidence}
                      onChange={(e) => updateEvidence(claimIndex, evidenceIndex, e.target.value, subIndex)}
                      placeholder={`Evidence ${evidenceIndex + 1}`}
                      className={styles.evidenceInput}
                    />
                    <button 
                      onClick={() => deleteEvidence(claimIndex, evidenceIndex, subIndex)}
                      className={styles.deleteButton}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => addEvidence(claimIndex, subIndex)} 
                  className={styles.addButton}
                >
                  + Evidence
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.stageFooter}>
        <button onClick={nextStage} className={styles.nextButton}>
          Next Stage
        </button>
      </div>
    </div>
  )

  const renderArgumentReview = () => {
    const generateOutline = () => {
      return `THESIS: ${writingData.thesis}

${writingData.claims.map((claim, claimIndex) => `
CLAIM ${claimIndex + 1}: ${claim.text}
${(writingData.evidence[claimIndex] || []).map((ev, i) => `  Evidence ${i + 1}: ${ev}`).join('\n')}

${claim.subclaims.map((subclaim, subIndex) => `
  SUBCLAIM: ${subclaim}
  ${(writingData.evidence[`${claimIndex}-${subIndex}`] || []).map((ev, i) => `    Evidence ${i + 1}: ${ev}`).join('\n')}
`).join('')}
`).join('')}`.trim()
    }

    const handleOutlineChange = (e) => {
      setWritingData(prev => ({ ...prev, outline: e.target.value }))
    }

    // Initialize outline only if it's undefined (not if it's empty string)
    if (writingData.outline === undefined) {
      setWritingData(prev => ({ ...prev, outline: generateOutline() }))
    }

    return (
      <div className={styles.stageContent}>
        <div className={styles.outlineEditor}>
          <h3 className={styles.outlineTitle}>Your Argument Outline</h3>
          <textarea
            value={writingData.outline === undefined ? generateOutline() : writingData.outline}
            onChange={handleOutlineChange}
            className={styles.outlineTextArea}
            placeholder="Edit your argument outline..."
          />
        </div>

        <div className={styles.stageFooter}>
          <button onClick={nextStage} className={styles.nextButton}>
            Generate Paper
          </button>
        </div>
      </div>
    )
  }


  const renderStage = () => {
    switch (currentStage) {
      case 0: return renderArgumentConstruction()
      case 1: return renderClaimDevelopment()
      case 2: return renderEvidenceIntegration()
      case 3: return renderArgumentReview()
      default: return renderArgumentConstruction()
    }
  }

  return (
    <div className={styles.textEditorContainer}>
      {renderStage()}
    </div>
  )
}