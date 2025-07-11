const API_URL = '/api/claude'

export const claudeAPI = {
  // Generate initial feedback issues for student's work
  async generateFeedback(stage, content, writingData) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateFeedback',
          stage,
          content,
          writingData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate feedback')
      }

      return await response.json()
    } catch (error) {
      console.error('Claude API error:', error)
      throw error
    }
  },

  // Generate detailed Socratic response for specific issue
  async generateSocraticResponse(issue, studentText, conversationHistory = []) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'socraticResponse',
          issue,
          studentText,
          conversationHistory
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate response')
      }

      return await response.json()
    } catch (error) {
      console.error('Claude API error:', error)
      throw error
    }
  },

  // Continue conversation with follow-up questions
  async continueSocraticDialogue(conversationHistory, studentResponse) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'continueSocratic',
          conversationHistory,
          studentResponse
        })
      })

      if (!response.ok) {
        throw new Error('Failed to continue dialogue')
      }

      return await response.json()
    } catch (error) {
      console.error('Claude API error:', error)
      throw error
    }
  },

  // Check if a specific issue has been resolved
  async checkIssueResolution({ issue, currentContent, writingData }) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'checkIssueResolution',
          issue,
          currentContent,
          writingData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to check issue resolution')
      }

      return await response.json()
    } catch (error) {
      console.error('Claude API error:', error)
      throw error
    }
  },

  // Handle general questions when no specific issue is selected
  async generalQuestion({ question, writingData, currentStage, hasQualityFeedback, conversationHistory }) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generalQuestion',
          question,
          writingData,
          currentStage,
          hasQualityFeedback,
          conversationHistory
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process general question')
      }

      return await response.json()
    } catch (error) {
      console.error('Claude API error:', error)
      throw error
    }
  }
}