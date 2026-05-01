import { getToneGuidance, type ToneGuidanceOutput } from "@/lib/tone-playbook-mcp"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL_ID = "llama-3.1-8b-instant"
const MAX_INPUT_LENGTH = 700
const MAX_TOKENS = 800
const CODE_VERSION = "mcp-tone-playbook-v1"

// Type for the expected JSON response
interface SaylaResponse {
  toneInsight: string
  results: Array<{
    title: "Polite" | "Warm" | "Natural"
    message: string
    explanation: string
  }>
}

// Type for Groq API response
interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

// Validate the parsed JSON structure
function validateResponse(data: unknown): data is SaylaResponse {
  if (typeof data !== "object" || data === null) return false
  
  const obj = data as Record<string, unknown>
  
  if (typeof obj.toneInsight !== "string") return false
  if (!Array.isArray(obj.results)) return false
  if (obj.results.length !== 3) return false
  
  const validTitles = ["Polite", "Warm", "Natural"]
  for (const item of obj.results) {
    if (typeof item !== "object" || item === null) return false
    const result = item as Record<string, unknown>
    if (typeof result.title !== "string" || !validTitles.includes(result.title)) return false
    if (typeof result.message !== "string") return false
    if (typeof result.explanation !== "string") return false
  }
  
  return true
}

// Debug endpoint to check server configuration
export async function GET() {
  const groqApiKey = process.env.GROQ_API_KEY
  const hasApiKey = typeof groqApiKey === "string" && groqApiKey.length > 0
  const nodeEnv = process.env.NODE_ENV || "unknown"
  const vercelEnv = process.env.VERCEL_ENV || "local"
  
  return Response.json({
    codeVersion: CODE_VERSION,
    runtime: "nodejs",
    groqKeyConfigured: hasApiKey,
    groqKeyLength: hasApiKey ? groqApiKey.length : 0,
    environment: vercelEnv,
    nodeEnv: nodeEnv,
    message: hasApiKey 
      ? "GROQ_API_KEY is configured and ready." 
      : "GROQ_API_KEY is not available to this deployment. Please redeploy after adding the environment variable.",
  })
}

export async function POST(req: Request) {
  const groqApiKey = process.env.GROQ_API_KEY
  const hasApiKey = typeof groqApiKey === "string" && groqApiKey.length > 0
  const vercelEnv = process.env.VERCEL_ENV || "local"
  
  if (!hasApiKey) {
    return Response.json({
      codeVersion: CODE_VERSION,
      source: "error",
      error: "GROQ_API_KEY is not available to this deployment. Please redeploy after adding the environment variable.",
      hasApiKey: false,
      environment: vercelEnv,
    }, { status: 500 })
  }

  try {
    const body = await req.json()
    const {
      mode,
      originalMessage,
      receivedMessage,
      replyIntention,
      context,
      targetLanguage,
      tone,
    } = body

    // Validate required fields
    if (mode === "rewrite" && !originalMessage) {
      return Response.json({
        codeVersion: CODE_VERSION,
        source: "error",
        error: "Original message is required for rewrite mode",
        hasApiKey: true,
        environment: vercelEnv,
      }, { status: 400 })
    }

    if (mode === "reply" && (!receivedMessage || !replyIntention)) {
      return Response.json({
        codeVersion: CODE_VERSION,
        source: "error",
        error: "Received message and reply intention are required for reply mode",
        hasApiKey: true,
        environment: vercelEnv,
      }, { status: 400 })
    }

    // Truncate inputs to max length
    const truncatedOriginal = originalMessage?.slice(0, MAX_INPUT_LENGTH) || ""
    const truncatedReceived = receivedMessage?.slice(0, MAX_INPUT_LENGTH) || ""
    const truncatedIntention = replyIntention?.slice(0, MAX_INPUT_LENGTH) || ""

    // Call Tone Playbook MCP tool for guidance
    const toneGuidance: ToneGuidanceOutput = getToneGuidance({
      context: context || "General",
      targetLanguage: targetLanguage || "English",
      tone: tone || "Balanced",
      mode: mode as "rewrite" | "reply",
    })

    // Build the user prompt based on mode
    let userPrompt: string

    // Build tone playbook guidance section
    const tonePlaybookSection = `
--- Tone Playbook Guidance (from MCP tool) ---
Communication Risk: ${toneGuidance.communicationRisk}
Tone Guidelines: ${toneGuidance.toneGuidelines}
Cultural Notes: ${toneGuidance.culturalNotes}
Suggested Strategy: ${toneGuidance.suggestedStrategy}
---`

    if (mode === "rewrite") {
      userPrompt = `Rewrite this message into three improved versions.

Original message:
${truncatedOriginal}

Context: ${context || "General"}
Target language: ${targetLanguage || "English"}
Desired tone: ${tone || "Balanced"}
${tonePlaybookSection}`
    } else {
      userPrompt = `Help me reply to this message.

Received message:
${truncatedReceived}

User wants to say:
${truncatedIntention}

Context: ${context || "General"}
Target language: ${targetLanguage || "English"}
Desired tone: ${tone || "Balanced"}
${tonePlaybookSection}`
    }

    // System prompt with explicit JSON format instructions
    const systemPrompt = `You are Sayla, a communication assistant that helps people express themselves with the right tone.

Your task is to generate exactly three message versions:
1. "Polite" - Respectful, professional, and careful
2. "Warm" - Soft, emotionally considerate, and friendly  
3. "Natural" - Native-sounding, balanced, and conversational

Rules:
- ALL output (messages, explanations, toneInsight) MUST be in the target language specified
- If target language is German, write everything in German
- If target language is Korean, write everything in Korean
- If target language is English, write everything in English
- Preserve the user's original meaning and intention
- Do NOT over-apologize or make messages too long
- Make messages sound like something a real person would send
- Each message should be concise (1-3 sentences)
- Each explanation should be brief (1 sentence) explaining why this version works
- The toneInsight should be a single sentence observation about the original tone

Return only valid JSON.
Do not include markdown.
Do not include code fences.
Do not include any text outside JSON.

Expected JSON format:
{
  "toneInsight": "A brief observation about the original message's tone",
  "results": [
    { "title": "Polite", "message": "The rewritten message", "explanation": "Why this works" },
    { "title": "Warm", "message": "The rewritten message", "explanation": "Why this works" },
    { "title": "Natural", "message": "The rewritten message", "explanation": "Why this works" }
  ]
}`

    // Call Groq API directly with fetch
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
    })

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({})) as GroqChatResponse
      const errorMessage = errorData.error?.message || `Groq API error: ${groqResponse.status}`
      return Response.json({
        codeVersion: CODE_VERSION,
        source: "error",
        error: errorMessage,
        hasApiKey: true,
        environment: vercelEnv,
      }, { status: 500 })
    }

    const groqData = await groqResponse.json() as GroqChatResponse
    const content = groqData.choices?.[0]?.message?.content

    if (!content) {
      return Response.json({
        codeVersion: CODE_VERSION,
        source: "error",
        error: "Groq API returned empty response",
        hasApiKey: true,
        environment: vercelEnv,
      }, { status: 500 })
    }

    // Parse the JSON from the response
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return Response.json({
        codeVersion: CODE_VERSION,
        source: "error",
        error: "Failed to parse Groq response as JSON",
        hasApiKey: true,
        environment: vercelEnv,
      }, { status: 500 })
    }

    // Validate the structure
    if (!validateResponse(parsed)) {
      return Response.json({
        codeVersion: CODE_VERSION,
        source: "error",
        error: "Groq returned invalid response structure (expected toneInsight string and exactly 3 results with title/message/explanation)",
        hasApiKey: true,
        environment: vercelEnv,
      }, { status: 500 })
    }

    // Success - return AI results
    return Response.json({
      codeVersion: CODE_VERSION,
      source: "ai",
      results: parsed.results,
      toneInsight: parsed.toneInsight,
      mcpGuided: true,
      hasApiKey: true,
      environment: vercelEnv,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return Response.json({
      codeVersion: CODE_VERSION,
      source: "error",
      error: errorMessage,
      hasApiKey: true,
      environment: vercelEnv,
    }, { status: 500 })
  }
}
