import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Stage-specific prompts for feedback generation
const FEEDBACK_PROMPTS = {
  0: { // Argument Construction
    system: "You are an expert writing teacher analyzing student thesis statements. Your goal is to provide constructive feedback appropriate for high school and college level writing.",
    user: (content) => `Analyze this thesis statement:

Thesis: "${content}"

If the thesis is strong and doesn't need major revisions, respond with:
QUALITY: [Explanation of why the thesis is effective - 2-3 sentences about its strengths]

If the thesis needs improvement, identify 1-3 key issues and respond with:
ISSUES:
1. [First issue title]
2. [Second issue title]  
3. [Third issue title]

Only use one format - either QUALITY or ISSUES, not both.`
  },
  1: { // Claim Development  
    system: "You are an expert writing teacher analyzing how well student claims support their thesis. Provide constructive feedback appropriate for high school and college level writing.",
    user: (writingData) => `Analyze these claims in relation to the thesis:

Thesis: "${writingData.thesis}"

Claims:
${writingData.claims.map((claim, i) => `${i + 1}. ${claim.text}`).join('\n')}

If the claims effectively support the thesis and are well-developed, respond with:
QUALITY: [Explanation of why the claims are strong - 2-3 sentences about their effectiveness]

If the claims need improvement, identify 1-3 key issues and respond with:
ISSUES:
1. [First issue title]
2. [Second issue title]  
3. [Third issue title]

Only use one format - either QUALITY or ISSUES, not both.`
  },
  2: { // Evidence Integration
    system: "You are an expert writing teacher analyzing how effectively students integrate evidence to support their claims. Provide constructive feedback appropriate for high school and college level writing.",
    user: (writingData) => `Analyze this evidence structure:

Thesis: "${writingData.thesis}"

${writingData.claims.map((claim, claimIndex) => `
Claim ${claimIndex + 1}: ${claim.text}
Evidence: ${(writingData.evidence[claimIndex] || []).join(', ') || 'None provided'}
${claim.subclaims.map((sub, subIndex) => `
  Subclaim: ${sub}
  Evidence: ${(writingData.evidence[`${claimIndex}-${subIndex}`] || []).join(', ') || 'None provided'}`).join('')}
`).join('')}

If the evidence effectively supports the claims and is well-integrated, respond with:
QUALITY: [Explanation of why the evidence is strong - 2-3 sentences about its effectiveness]

If the evidence needs improvement, identify 1-3 key issues and respond with:
ISSUES:
1. [First issue title]
2. [Second issue title]  
3. [Third issue title]

Only use one format - either QUALITY or ISSUES, not both.`
  },
  3: { // Argument Review
    system: "You are an expert writing teacher analyzing complete argument structures. Provide constructive feedback appropriate for high school and college level writing.",
    user: (writingData) => `Analyze this complete argument outline:

${writingData.outline || 'No outline provided'}

If the argument structure is coherent and well-developed, respond with:
QUALITY: [Explanation of why the argument is strong - 2-3 sentences about its logical flow and effectiveness]

If the argument needs improvement, identify 1-3 key issues and respond with:
ISSUES:
1. [First issue title]
2. [Second issue title]  
3. [Third issue title]

Only use one format - either QUALITY or ISSUES, not both.`
  }
}

const SOCRATIC_SYSTEM_PROMPT = `You are a Socratic writing teacher. Your role is to guide students to discover insights about their writing through thoughtful questioning rather than giving direct answers.

Key principles:
- Ask probing questions that lead students to self-discovery
- Avoid giving direct corrections or solutions
- Challenge assumptions and encourage deeper thinking
- Be encouraging but intellectually rigorous
- Keep responses concise (2-3 sentences max)
- Focus on the specific issue being discussed`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action, stage, content, writingData, issue, studentText, conversationHistory, studentResponse } = req.body

    switch (action) {
      case 'generateFeedback':
        const feedbackPrompt = FEEDBACK_PROMPTS[stage]
        if (!feedbackPrompt) {
          return res.status(400).json({ error: 'Invalid stage' })
        }

        const feedbackResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 300,
          system: feedbackPrompt.system,
          messages: [{
            role: 'user',
            content: feedbackPrompt.user(stage === 0 ? content : writingData)
          }]
        })

        // Parse the response to extract issues or quality feedback
        const feedbackText = feedbackResponse.content[0].text
        const result = parseFeedbackResponse(feedbackText)

        return res.status(200).json(result)

      case 'socraticResponse':
        const socraticResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          system: SOCRATIC_SYSTEM_PROMPT,
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: `Issue to explore: "${issue}"

Student's text: "${studentText}"

Please ask a thoughtful question to help the student examine this issue more deeply.`
            }
          ]
        })

        return res.status(200).json({ 
          response: socraticResponse.content[0].text 
        })

      case 'continueSocratic':
        const continueResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          system: SOCRATIC_SYSTEM_PROMPT,
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: studentResponse
            }
          ]
        })

        return res.status(200).json({
          response: continueResponse.content[0].text
        })

      default:
        return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Claude API error:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      type: error.type
    })
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Helper function to parse Claude response for either quality feedback or issues
function parseFeedbackResponse(text) {
  console.log('Raw Claude response:', text) // Debug logging
  
  // Check if response contains quality feedback
  const qualityMatch = text.match(/QUALITY:\s*(.+?)(?:\n|$)/s)
  if (qualityMatch) {
    console.log('Quality feedback detected')
    return {
      type: 'quality',
      qualityFeedback: qualityMatch[1].trim(),
      issues: []
    }
  }
  
  // Check if response contains issues
  const issuesMatch = text.match(/ISSUES:\s*([\s\S]*)/i)
  if (issuesMatch) {
    console.log('Issues detected')
    const issuesText = issuesMatch[1]
    const issues = extractIssuesFromText(issuesText)
    return {
      type: 'issues',
      qualityFeedback: null,
      issues: issues
    }
  }
  
  // Fallback: treat as issues format for backward compatibility
  console.log('Using fallback issue extraction')
  const issues = extractIssuesFromText(text)
  return {
    type: issues.length > 0 ? 'issues' : 'quality',
    qualityFeedback: issues.length === 0 ? 'Content appears to be well-developed.' : null,
    issues: issues
  }
}

// Helper function to extract issues from text
function extractIssuesFromText(text) {
  const lines = text.split('\n').filter(line => line.trim())
  const issues = []
  
  for (const line of lines) {
    // Match numbered format: "1. Issue title" or "1) Issue title"
    const numberedMatch = line.match(/^\s*(\d+)[\.\)]\s*(.+)$/)
    if (numberedMatch && issues.length < 3) {
      issues.push(numberedMatch[2].trim())
      continue
    }
    
    // Match bullet format: "- Issue title" or "• Issue title"
    const bulletMatch = line.match(/^\s*[\-\*\•]\s*(.+)$/)
    if (bulletMatch && issues.length < 3) {
      issues.push(bulletMatch[1].trim())
      continue
    }
  }
  
  console.log('Extracted issues:', issues)
  return issues.slice(0, 3) // Ensure max 3 issues
}