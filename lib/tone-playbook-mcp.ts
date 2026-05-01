/**
 * Tone Playbook MCP - A minimal Model Context Protocol tool server
 * 
 * This is a lightweight, deterministic MCP tool that provides communication
 * tone guidance without requiring external APIs, OAuth, or payment.
 * 
 * Exposes one tool: get_tone_guidance
 */

export interface ToneGuidanceInput {
  context: string
  targetLanguage: string
  tone: string
  mode: "rewrite" | "reply"
}

export interface ToneGuidanceOutput {
  communicationRisk: string
  toneGuidelines: string
  culturalNotes: string
  suggestedStrategy: string
}

// Context-specific guidance
const contextGuidance: Record<string, { risk: string; guidelines: string; strategy: string }> = {
  work: {
    risk: "Professional relationships require careful balance of directness and diplomacy.",
    guidelines: "Use clear language, avoid ambiguity, be solution-oriented, acknowledge others' time.",
    strategy: "Frame requests as collaborative opportunities rather than demands.",
  },
  manager: {
    risk: "Power dynamics can make messages seem more demanding or critical than intended.",
    guidelines: "Be concise, show respect for hierarchy, offer context without over-explaining, provide options.",
    strategy: "Lead with appreciation, present clear asks, offer to discuss alternatives.",
  },
  client: {
    risk: "Client relationships are sensitive to perceived service quality and responsiveness.",
    guidelines: "Maintain professionalism, be proactive about solutions, acknowledge their concerns, avoid jargon.",
    strategy: "Focus on value delivery, set clear expectations, and always offer next steps.",
  },
  friend: {
    risk: "Casual tone might not convey seriousness when needed.",
    guidelines: "Be authentic, match their energy, use shared language, balance honesty with kindness.",
    strategy: "Be direct but caring, use humor appropriately, show you value the relationship.",
  },
  formal: {
    risk: "Overly formal language can create distance or seem impersonal.",
    guidelines: "Use proper titles, complete sentences, avoid contractions, maintain respectful distance.",
    strategy: "Be courteous and precise, show respect through careful word choice.",
  },
  dating: {
    risk: "Mixed signals can lead to misunderstanding or unintended coldness.",
    guidelines: "Be genuine, show interest clearly, balance vulnerability with confidence, avoid game-playing.",
    strategy: "Express feelings honestly while respecting boundaries, be clear about intentions.",
  },
  family: {
    risk: "Family history can add emotional weight to simple messages.",
    guidelines: "Be patient, acknowledge relationships, avoid triggering past conflicts, show care.",
    strategy: "Lead with love, address issues without blame, focus on moving forward together.",
  },
  general: {
    risk: "Without context, messages may be misinterpreted.",
    guidelines: "Be clear and kind, assume positive intent, provide necessary context.",
    strategy: "Focus on clarity and warmth, ensure your meaning comes through.",
  },
}

// Language-specific cultural notes
const languageCulture: Record<string, string> = {
  english: "English communication values directness balanced with politeness markers. Use 'please', 'would you mind', and 'I appreciate' to soften requests.",
  german: "German workplace communication values clarity and directness. However, requests should still use the Konjunktiv II (würde, könnte) for politeness. Avoid being overly effusive.",
  korean: "Korean communication relies heavily on honorifics and social hierarchy. Use appropriate speech levels (존댓말/반말), acknowledge the relationship, and consider indirect expressions for sensitive topics.",
}

// Tone-specific adjustments
const toneAdjustments: Record<string, string> = {
  polite: "Prioritize courtesy markers, soften language, acknowledge the other person's perspective.",
  softer: "Reduce directness, add emotional cushioning, frame negatives as positives where possible.",
  friendly: "Warm up the tone, add personal touches, use inclusive language like 'we' and 'together'.",
  "direct but respectful": "Be clear and concise while maintaining courtesy. State your point early, then explain.",
  warm: "Lead with emotional connection, show empathy, express genuine care for the relationship.",
  professional: "Maintain business-appropriate language, focus on facts and outcomes, be efficient.",
  balanced: "Find the middle ground between formal and casual, be clear but approachable.",
}

// Mode-specific considerations
const modeConsiderations: Record<string, string> = {
  rewrite: "Transform the user's words while preserving their core meaning. Focus on how they want to come across.",
  reply: "Craft a response that addresses what was received while expressing what the user wants to convey.",
}

/**
 * Main MCP tool function: get_tone_guidance
 * 
 * Provides deterministic, context-aware guidance for communication tone.
 * No external API calls, no auth, no payment required.
 */
export function getToneGuidance(input: ToneGuidanceInput): ToneGuidanceOutput {
  const contextKey = input.context.toLowerCase().replace(/\s+/g, '')
  const languageKey = input.targetLanguage.toLowerCase()
  const toneKey = input.tone.toLowerCase()
  
  // Get context-specific guidance (default to 'general' if not found)
  const contextInfo = contextGuidance[contextKey] || contextGuidance.general
  
  // Get language-specific cultural notes
  const culturalNotes = languageCulture[languageKey] || languageCulture.english
  
  // Get tone adjustments
  const toneInfo = toneAdjustments[toneKey] || toneAdjustments.balanced
  
  // Get mode considerations
  const modeInfo = modeConsiderations[input.mode] || modeConsiderations.rewrite
  
  // Build communication risk based on context and mode
  let communicationRisk = contextInfo.risk
  if (input.mode === "reply") {
    communicationRisk += " When replying, be especially mindful of matching or appropriately adjusting the tone of the original message."
  }
  
  // Build tone guidelines combining context and tone preferences
  const toneGuidelines = `${contextInfo.guidelines} ${toneInfo}`
  
  // Build suggested strategy
  const suggestedStrategy = `${contextInfo.strategy} ${modeInfo}`
  
  return {
    communicationRisk,
    toneGuidelines,
    culturalNotes,
    suggestedStrategy,
  }
}

/**
 * MCP Server Info (for documentation/compatibility)
 */
export const mcpServerInfo = {
  name: "tone-playbook-mcp",
  version: "1.0.0",
  description: "A lightweight MCP tool that provides communication tone guidance",
  tools: [
    {
      name: "get_tone_guidance",
      description: "Get contextual tone guidance for message writing",
      inputSchema: {
        type: "object",
        properties: {
          context: { type: "string", description: "Communication context (Work, Manager, Client, Friend, etc.)" },
          targetLanguage: { type: "string", description: "Target language for the message" },
          tone: { type: "string", description: "Desired tone (Polite, Warm, Professional, etc.)" },
          mode: { type: "string", enum: ["rewrite", "reply"], description: "Whether rewriting or replying" },
        },
        required: ["context", "targetLanguage", "tone", "mode"],
      },
    },
  ],
}
