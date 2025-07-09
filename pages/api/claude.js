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
    system: "You are an expert writing instructor specializing in argument analysis and critical thinking. Your role is to evaluate complete argument structures with the rigor of a college-level composition course, focusing on logical coherence, evidence integration, and argumentative sophistication.",
    user: (writingData) => `Conduct a comprehensive analysis of this argument outline, examining it through multiple critical lenses:

    **ARGUMENT OUTLINE:**
    ${writingData.outline || 'No outline provided'}

    **EVALUATION CRITERIA:**
    Assess the argument's structural integrity by examining:

    - **Logical Flow & Coherence**: Do claims build logically toward the thesis? Are there gaps in reasoning?
    - **Evidence Integration**: How effectively does evidence support each claim? Are sources credible and relevant?
    - **Counter-Argument Engagement**: Does the outline acknowledge and address opposing viewpoints?
    - **Claim-Evidence Alignment**: Do the supporting details actually prove what the claims assert?
    - **Argumentative Sophistication**: Does the structure demonstrate nuanced thinking or oversimplification?
    - **Reader Accessibility**: Would the argument's progression be clear and persuasive to the intended audience?

    **RESPONSE FORMAT:**
    If the argument demonstrates strong structural integrity (scoring 8+ out of 10):
    STRONG ARGUMENT: [2-3 sentences explaining why the logical structure, evidence use, and overall coherence make this an effective argument]

    If the argument has significant structural weaknesses (scoring below 8):
    STRUCTURAL WEAKNESSES:
    1. [Primary weakness in logical structure/flow]
    2. [Evidence or counter-argument issue]  
    3. [Gap in reasoning or claim development]

    For each weakness, briefly explain why it undermines the argument's effectiveness and suggest the type of revision needed.

    Focus your analysis on the argument's architecture—how well the pieces fit together to create a convincing, logically sound case.`
  }
}

const SOCRATIC_SYSTEM_PROMPT = `You are an expert writing teacher who uses a balanced approach of Socratic questioning and cognitive apprenticeship. Your goal is to help students improve their writing through guided discovery AND practical assistance.

Teaching progression:
1. Start with 1-2 thoughtful questions to understand the student's thinking
2. If they engage but struggle, ask 1-2 more guiding questions with hints
3. After questions, provide concrete examples, models, or direct guidance
4. Always end with actionable next steps they can take

Key principles:
- Begin with questions to activate prior knowledge and critical thinking
- Transition to modeling expert thinking and providing examples
- Give specific, actionable advice after the questioning phase
- Be encouraging and show them what good writing looks like
- Keep responses helpful and substantive (3-5 sentences)
- Balance discovery with direct instruction

Remember: Great teachers ask questions AND provide answers. Don't leave students stuck with only questions.`

const RESOLUTION_CHECK_SYSTEM_PROMPT = `You are an expert writing teacher checking if a specific writing issue has been resolved. Be precise and encouraging when issues are fixed, constructive when they're not.`

const GENERAL_HELP_SYSTEM_PROMPT = `You are a supportive writing teacher helping students with their argumentative writing. You provide guidance that's appropriate for high school and college level writing.

Key principles:
- Be encouraging and supportive
- If they're stuck, help them brainstorm or think through their ideas
- Keep responses concise (2-3 sentences max)
- Relate your advice to their current writing stage and content
- Use Socratic questioning when appropriate to guide discovery`

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
        // Count previous exchanges to determine teaching approach
        const exchangeCount = conversationHistory.filter(msg => msg.role === 'user').length
        
        let teachingPrompt = ''
        if (exchangeCount === 0) {
          teachingPrompt = `Issue to explore: "${issue}"

Student's text: "${studentText}"

This is the beginning of our conversation. Start with 1-2 thoughtful questions to understand the student's thinking about this problem.`
        } else if (exchangeCount <= 2) {
          teachingPrompt = `Issue to explore: "${issue}"

Student's text: "${studentText}"

The student has engaged with your questions. Continue with 1-2 more guiding questions, but include helpful hints or examples to guide them toward a solution.`
        } else {
          teachingPrompt = `Issue to explore: "${issue}"

Student's text: "${studentText}"

You've asked several questions. Now provide concrete examples, models, or direct guidance to help them solve this issue. Give them specific, actionable steps they can take.`
        }

        const socraticResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 300,
          system: SOCRATIC_SYSTEM_PROMPT,
          messages: [
            ...conversationHistory,
            {
              role: 'user',
              content: teachingPrompt
            }
          ]
        })

        return res.status(200).json({ 
          response: socraticResponse.content[0].text 
        })

      case 'continueSocratic':
        // Count exchanges to determine if we should provide direct help
        const continueExchangeCount = conversationHistory.filter(msg => msg.role === 'user').length
        
        let updatedSystemPrompt = SOCRATIC_SYSTEM_PROMPT
        if (continueExchangeCount >= 3) {
          updatedSystemPrompt += `

The student has engaged with several questions. Focus now on providing concrete examples, models, and direct guidance rather than more questions.`
        }

        const continueResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 300,
          system: updatedSystemPrompt,
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

      case 'checkIssueResolution':
        const { issue, currentContent, writingData } = req.body

        const resolutionPrompt = createResolutionCheckPrompt(issue, currentContent, writingData)

        const resolutionResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          system: RESOLUTION_CHECK_SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: resolutionPrompt
          }]
        })

        const resolutionResult = parseResolutionResponse(resolutionResponse.content[0].text)

        return res.status(200).json(resolutionResult)

      case 'generalQuestion':
        const { question, writingData: wData, currentStage: stage, hasQualityFeedback, conversationHistory: history } = req.body

        const generalPrompt = createGeneralQuestionPrompt(question, wData, stage, hasQualityFeedback)

        const generalResponse = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          system: GENERAL_HELP_SYSTEM_PROMPT,
          messages: [
            ...(history || []).map(msg => ({
              role: msg.type === 'student' ? 'user' : 'assistant',
              content: msg.text
            })),
            {
              role: 'user',
              content: generalPrompt
            }
          ]
        })

        return res.status(200).json({
          response: generalResponse.content[0].text
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

// Helper function to create resolution check prompts
function createResolutionCheckPrompt(issue, currentContent, writingData) {
  const stageContent = {
    0: `Original issue: "${issue.title}"
         Current thesis: "${writingData.thesis}"`,
    1: `Original issue: "${issue.title}"
         Current thesis: "${writingData.thesis}"
         Current claims: ${writingData.claims.map(c => c.text).join(', ')}`,
    2: `Original issue: "${issue.title}"
         Current evidence structure: [evidence summary]`,
    3: `Original issue: "${issue.title}"
         Current outline: "${writingData.outline}"`
  }

  // Determine stage based on content type
  let currentStage = 0
  if (writingData.claims && writingData.claims.length > 0) currentStage = 1
  if (writingData.evidence && Object.keys(writingData.evidence).length > 0) currentStage = 2
  if (writingData.outline) currentStage = 3

  return `${stageContent[currentStage]}

Has the student resolved this specific issue: "${issue.title}"?

If YES, respond with:
RESOLVED: [Brief explanation of how they fixed it - be encouraging!]

If NO, respond with:
NOT_RESOLVED: [Specific guidance on what still needs work]

If PARTIALLY, respond with:
PARTIALLY: [What improved and what still needs work]

Focus only on this specific issue, not other aspects of their writing.`
}

// Helper function to parse resolution response
function parseResolutionResponse(text) {
  if (text.includes('RESOLVED:')) {
    const explanation = text.match(/RESOLVED:\s*(.+)/s)?.[1]?.trim()
    return {
      isResolved: true,
      status: 'resolved',
      explanation: explanation || 'Great work fixing this issue!'
    }
  }

  if (text.includes('PARTIALLY:')) {
    const feedback = text.match(/PARTIALLY:\s*(.+)/s)?.[1]?.trim()
    return {
      isResolved: false,
      status: 'partially',
      feedback: feedback || 'Keep working on this issue.'
    }
  }

  const feedback = text.match(/NOT_RESOLVED:\s*(.+)/s)?.[1]?.trim()
  return {
    isResolved: false,
    status: 'not_resolved',
    feedback: feedback || 'This issue still needs attention.'
  }
}

// Helper function to create general question prompts
function createGeneralQuestionPrompt(question, writingData, currentStage, hasQualityFeedback) {
  const stageNames = ['Argument Construction', 'Claim Development', 'Evidence Integration', 'Argument Review']
  const stageName = stageNames[currentStage] || 'Unknown Stage'

  let context = `Student is in the ${stageName} stage.\n\n`

  // Add relevant context based on stage
  switch (currentStage) {
    case 0:
      context += writingData.thesis 
        ? `Current thesis: "${writingData.thesis}"`
        : 'No thesis written yet.'
      break
    case 1:
      context += `Thesis: "${writingData.thesis}"\n`
      context += writingData.claims.length > 0
        ? `Claims: ${writingData.claims.map(c => c.text).filter(t => t).join(', ')}`
        : 'No claims added yet.'
      break
    case 2:
      context += `Working on adding evidence for their claims.`
      break
    case 3:
      context += `Reviewing their complete argument outline.`
      break
  }

  if (hasQualityFeedback) {
    context += '\n\nThe student received positive feedback on their work.'
  }

  return `${context}

Student's question: "${question}"

Provide helpful guidance while encouraging them to think critically about their argument.`
}