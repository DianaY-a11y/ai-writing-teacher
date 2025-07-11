import { useState, useEffect, useRef } from 'react'
import { claudeAPI } from '../utils/claudeAPI'
import FeedbackCard from './FeedbackCard'
import styles from '../styles/AICoach.module.css'

export default function AICoach({ currentStage, writingData, onFeedbackGenerated }) {
  const [feedbackIssues, setFeedbackIssues] = useState([])
  const [qualityFeedback, setQualityFeedback] = useState(null)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [conversation, setConversation] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef(null)

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Scroll when conversation updates
  useEffect(() => {
    scrollToBottom()
  }, [conversation])

  // Generate feedback button handler
  const generateFeedback = async () => {
    setIsLoading(true)
    setError(null)
    setSelectedIssue(null)
    setConversation([])
    setQualityFeedback(null)

    try {
      // Get current content based on stage
      const content = getCurrentContent()
      if (!content) {
        setError('Please add some content before requesting feedback')
        return
      }

      const response = await claudeAPI.generateFeedback(currentStage, content, writingData)
      
      if (response.type === 'quality') {
        setQualityFeedback(response.qualityFeedback)
        setFeedbackIssues([])
      } else {
        // Transform string issues to enhanced objects
        const enhancedIssues = (response.issues || []).map((issue, index) => ({
          id: `issue-${Date.now()}-${index}`,
          title: issue,
          status: 'active', // 'active' | 'checking' | 'resolved' | 'dismissed'
          originalContent: content,
          detectedAt: Date.now(),
          resolvedAt: null,
          resolutionNote: null
        }))
        setFeedbackIssues(enhancedIssues)
        setQualityFeedback(null)
      }

      // Notify parent that feedback has been generated
      if (onFeedbackGenerated) {
        onFeedbackGenerated()
      }
    } catch (err) {
      setError('Failed to generate feedback. Please try again.')
      console.error('Feedback generation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get current content based on stage
  const getCurrentContent = () => {
    switch (currentStage) {
      case 0: return writingData.thesis?.trim()
      case 1: return writingData.claims?.some(c => c.text?.trim()) ? 'claims' : null
      case 2: return Object.keys(writingData.evidence || {}).length > 0 ? 'evidence' : null
      case 3: return writingData.outline?.trim()
      default: return null
    }
  }

  // Get current content for specific stage (for resolution checks)
  const getCurrentContentForStage = (stage, data) => {
    switch (stage) {
      case 0: return data.thesis?.trim()
      case 1: return data.claims?.map(c => c.text).join(', ')
      case 2: return JSON.stringify(data.evidence || {})
      case 3: return data.outline?.trim()
      default: return null
    }
  }

  // Handle individual issue resolution
  const handleIssueResolved = (issueId, resolutionNote, feedback) => {
    setFeedbackIssues(prev => prev.map(issue =>
      issue.id === issueId
        ? {
            ...issue,
            status: resolutionNote ? 'resolved' : 'active',
            resolvedAt: resolutionNote ? Date.now() : null,
            resolutionNote: resolutionNote,
            feedback: feedback
          }
        : issue
    ))

    // Show feedback to user
    if (resolutionNote) {
      console.log('Issue resolved:', issueId, resolutionNote)
    } else if (feedback) {
      console.log('Resolution feedback:', issueId, feedback)
    }
  }

  // Handle issue card click
  const handleIssueClick = async (issue) => {
    if (selectedIssue?.id === issue.id) return // Already selected

    setSelectedIssue(issue)
    setConversation([]) // Clear conversation when switching issues
    setIsLoading(true)
    setError(null)

    try {
      const content = getCurrentContent()
      const response = await claudeAPI.generateSocraticResponse(
        issue.title, 
        JSON.stringify(writingData),
        []
      )
      
      setConversation([{
        type: 'teacher',
        text: response.response,
        timestamp: new Date()
      }])
    } catch (err) {
      setError('Failed to generate response. Please try again.')
      console.error('Socratic response error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle student response
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const newConversation = [
      ...conversation,
      {
        type: 'student',
        text: inputMessage,
        timestamp: new Date()
      }
    ]
    setConversation(newConversation)
    setInputMessage('')
    setIsLoading(true)

    try {
      if (selectedIssue) {
        // Issue-specific conversation
        const claudeHistory = newConversation.map(msg => ({
          role: msg.type === 'student' ? 'user' : 'assistant',
          content: msg.text
        }))

        const response = await claudeAPI.continueSocraticDialogue(
          claudeHistory,
          inputMessage
        )

        setConversation(prev => [...prev, {
          type: 'teacher',
          text: response.response,
          timestamp: new Date()
        }])
      } else {
        // General conversation
        const response = await claudeAPI.generalQuestion({
          question: inputMessage,
          writingData,
          currentStage,
          hasQualityFeedback: !!qualityFeedback,
          conversationHistory: conversation
        })

        setConversation(prev => [...prev, {
          type: 'teacher',
          text: response.response,
          timestamp: new Date()
        }])
      }
    } catch (err) {
      setError('Failed to continue conversation. Please try again.')
      console.error('Conversation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset when stage changes
  useEffect(() => {
    setFeedbackIssues([])
    setQualityFeedback(null)
    setSelectedIssue(null)
    setConversation([])
    setError(null)
  }, [currentStage])

  const getStageInstructions = () => {
    const instructions = {
      0: "Draft your thesis and click 'Get Feedback' to receive guidance on improving it.",
      1: "Add your claims and click 'Get Feedback' to explore how they support your thesis.",
      2: "Add evidence for your claims and click 'Get Feedback' to review their effectiveness.",
      3: "Review your outline and click 'Get Feedback' for overall argument analysis."
    }
    return instructions[currentStage] || "Continue working on your argument."
  }

  return (
    <div className={styles.aiCoachContainer}>
      <div className={styles.aiCoachHeader}>
        <h3 className={styles.aiCoachTitle}>Writing Teacher</h3>
        <button 
          onClick={generateFeedback}
          disabled={isLoading || !getCurrentContent()}
          className={styles.feedbackButton}
        >
          {isLoading ? 'Analyzing...' : 'Get Feedback'}
        </button>
      </div>
      
      <div className={styles.coachContent}>
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {feedbackIssues.length === 0 && !qualityFeedback && !error && (
          <div className={styles.instructionsArea}>
            <p className={styles.instructions}>{getStageInstructions()}</p>
          </div>
        )}

        {qualityFeedback && (
          <div className={styles.qualityFeedbackArea}>
            <h4 className={styles.sectionTitle}>Excellent Work!</h4>
            <div className={styles.qualityMessage}>
              {qualityFeedback}
            </div>
          </div>
        )}

        {feedbackIssues.length > 0 && (
          <div className={styles.feedbackSection}>
            <h4 className={styles.sectionTitle}>Key Issues to Explore:</h4>
            <div className={styles.cardsContainer}>
              {feedbackIssues.map((issue, index) => (
                <FeedbackCard
                  key={issue.id}
                  issue={issue}
                  onClick={handleIssueClick}
                  isActive={selectedIssue?.id === issue.id}
                  writingData={writingData}
                  currentStage={currentStage}
                  onIssueResolved={handleIssueResolved}
                />
              ))}
            </div>
          </div>
        )}

        <div className={styles.conversationSection}>          
          <div className={styles.messagesArea}>
            {conversation.map((message, index) => (
              <div 
                key={index}
                className={`${styles.message} ${message.type === 'student' ? styles.studentMessage : styles.teacherMessage}`}
              >
                {message.text}
              </div>
            ))}
            {isLoading && (
              <div className={styles.loadingMessage}>
                Reviewing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={
                selectedIssue 
                  ? "Respond to your teacher..."
                  : qualityFeedback
                    ? "Feel free to ask any questions..."
                    : "Ask me a question if you're feeling stuck..."
              }
              className={styles.messageInput}
              disabled={isLoading}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}