"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Copy, Check, Sparkles, Heart, MessageCircle, PenLine, Reply, Mail, Calendar, MessageSquare } from "lucide-react"

type Mode = "rewrite" | "reply"

const rewriteExamples = [
  "Can I take vacation next week?",
  "Why haven't you done this yet?",
  "I don't agree with this.",
  "Please send it today.",
]

const replyExamples = [
  { received: "Can you work this weekend?", intent: "I want to say no politely" },
  { received: "Why isn't this done yet?", intent: "Ask for more time" },
]

const contextOptions = [
  "Work",
  "Manager",
  "Client",
  "Friend",
  "Formal",
  "Dating",
  "Family",
]

const languageOptions = ["English", "German", "Korean"]

const toneOptions = [
  "Polite",
  "Softer",
  "Friendly",
  "Direct but respectful",
  "Warm",
  "Professional",
]

interface ResultCard {
  type: "Polite" | "Warm" | "Natural"
  message: string
  explanation: string
  icon: typeof Heart
}

interface ApiResponse {
  source: "ai" | "error"
  results?: Array<{
    title: "Polite" | "Warm" | "Natural"
    message: string
    explanation: string
  }>
  toneInsight?: string
  mcpGuided?: boolean
  error?: string
  hasApiKey?: boolean
  environment?: string
}

interface DebugInfo {
  requestBody: Record<string, unknown>
  responseSource: "ai" | "error" | "fallback" | null
  hasApiKey: boolean | null
  environment: string | null
  errorMessage: string | null
}

// Demo content organized by language, then by scenario keywords
const demoContent: Record<string, Record<string, { polite: { message: string; explanation: string }; warm: { message: string; explanation: string }; natural: { message: string; explanation: string } }>> = {
  english: {
    vacation: {
      polite: {
        message: "I would like to request time off next week, if that works with the team's schedule. Please let me know if this timing works for everyone.",
        explanation: "Why this works: Uses 'I would like to request' instead of 'Can I' to sound more professional, and shows consideration for the team."
      },
      warm: {
        message: "Hi! I was hoping to take some time off next week to recharge. Would that be okay with you? I'm happy to make sure everything is covered before I go.",
        explanation: "Why this works: Opens with warmth, explains the reason gently, and offers reassurance about responsibilities."
      },
      natural: {
        message: "Hey, I'm thinking of taking next week off. Just wanted to check in with you first - does that work on your end?",
        explanation: "Why this works: Conversational and direct while still being respectful. Sounds like a natural colleague-to-colleague ask."
      }
    },
    disagree: {
      polite: {
        message: "I appreciate the perspective, though I see this a bit differently. Would it be helpful if I shared my thoughts on this?",
        explanation: "Why this works: Acknowledges the other view first, uses soft language ('a bit differently'), and asks permission to share."
      },
      warm: {
        message: "I hear you, and I really value your input. I have a slightly different take on this - would you be open to hearing my thoughts? I think together we might find something even better.",
        explanation: "Why this works: Validates the other person, expresses care for collaboration, and frames disagreement as an opportunity."
      },
      natural: {
        message: "Interesting point. I actually see it a little differently - mind if I share where I'm coming from?",
        explanation: "Why this works: Acknowledges their input naturally, then pivots to your view without being dismissive."
      }
    },
    urgent: {
      polite: {
        message: "Would it be possible to have this completed by end of day? I understand it may be a tight timeline, but it would be very helpful for our workflow.",
        explanation: "Why this works: Frames as a question, acknowledges the challenge, and explains the importance."
      },
      warm: {
        message: "I know this is short notice, but would you be able to send this over today? It would really help me out, and I'd so appreciate it!",
        explanation: "Why this works: Shows awareness of the ask's weight, expresses genuine gratitude, and feels personal."
      },
      natural: {
        message: "Hey, any chance you could get this to me today? Would be a big help if possible.",
        explanation: "Why this works: Casual but clear, acknowledges it's a favor without being overly formal."
      }
    },
    delay: {
      polite: {
        message: "I wanted to follow up on the status of this task. Is there anything blocking progress that I can help with?",
        explanation: "Why this works: Focuses on being helpful rather than accusatory, opens the door for collaboration."
      },
      warm: {
        message: "Hey, just checking in on this! No pressure - I know things get busy. Let me know if you need any support or if there's anything holding things up.",
        explanation: "Why this works: Acknowledges their situation with empathy, offers support, and removes blame."
      },
      natural: {
        message: "Hey, wanted to check in on this - where are we at? Let me know if anything's come up.",
        explanation: "Why this works: Direct but not aggressive, leaves room for explanation without demanding one."
      }
    },
    weekend: {
      polite: {
        message: "Thank you for thinking of me for this. Unfortunately, I have prior commitments this weekend and won't be available. I'm happy to help find an alternative solution if needed.",
        explanation: "Why this works: Expresses gratitude, provides a clear but kind decline, and offers to help problem-solve."
      },
      warm: {
        message: "I really appreciate you reaching out! This weekend is a bit tricky for me - I already have some plans I can't move. Is there anything I can do ahead of time to help?",
        explanation: "Why this works: Warm opening, honest about limitations, and shows willingness to contribute another way."
      },
      natural: {
        message: "Thanks for asking, but I've got plans this weekend. Let me know if there's something I can help with before Friday though.",
        explanation: "Why this works: Simple and honest, offers a reasonable alternative without overexplaining."
      }
    },
    default: {
      polite: {
        message: "Thank you for your message. I'd like to share my thoughts on this in a way that hopefully moves us forward together.",
        explanation: "Why this works: Opens with appreciation, signals collaboration, and maintains a professional tone."
      },
      warm: {
        message: "Thanks for reaching out! I really appreciate the chance to connect on this. Here's what I'm thinking...",
        explanation: "Why this works: Warm and inviting, shows genuine interest in the conversation."
      },
      natural: {
        message: "Thanks for the note. Here's my take on things - let me know what you think.",
        explanation: "Why this works: Casual but engaged, invites dialogue without being overly formal."
      }
    }
  },
  german: {
    vacation: {
      polite: {
        message: "Ich möchte gerne anfragen, ob ich nächste Woche Urlaub nehmen könnte. Bitte lassen Sie mich wissen, ob das mit dem Teamplan vereinbar ist.",
        explanation: "Warum das funktioniert: Höfliche Konjunktivform, zeigt Rücksicht auf das Team."
      },
      warm: {
        message: "Hallo! Ich würde nächste Woche gerne ein paar Tage freinehmen, um neue Energie zu tanken. Wäre das in Ordnung? Ich stelle sicher, dass alles abgedeckt ist, bevor ich gehe.",
        explanation: "Warum das funktioniert: Freundlicher Ton, erklärt den Grund sanft und bietet Zuverlässigkeit."
      },
      natural: {
        message: "Hey, ich überlege, nächste Woche freizunehmen. Wollte kurz bei dir nachfragen - passt das von deiner Seite?",
        explanation: "Warum das funktioniert: Natürlich und direkt, aber respektvoll. Klingt wie eine normale Kollegenanfrage."
      }
    },
    disagree: {
      polite: {
        message: "Ich schätze Ihre Perspektive, sehe das allerdings etwas anders. Wäre es hilfreich, wenn ich meine Gedanken dazu teile?",
        explanation: "Warum das funktioniert: Anerkennt die andere Sicht, verwendet sanfte Sprache und fragt um Erlaubnis."
      },
      warm: {
        message: "Ich verstehe deinen Punkt und schätze deinen Input sehr. Ich habe eine etwas andere Sicht - wärst du offen, meine Gedanken zu hören?",
        explanation: "Warum das funktioniert: Validiert die andere Person, drückt Wertschätzung aus und rahmt Meinungsverschiedenheit positiv."
      },
      natural: {
        message: "Interessanter Punkt. Ich sehe das tatsächlich etwas anders - darf ich kurz erklären, woher ich komme?",
        explanation: "Warum das funktioniert: Anerkennt den Input natürlich, leitet dann zur eigenen Sicht über."
      }
    },
    default: {
      polite: {
        message: "Vielen Dank für Ihre Nachricht. Ich möchte meine Gedanken dazu teilen, in der Hoffnung, dass wir gemeinsam vorankommen.",
        explanation: "Warum das funktioniert: Beginnt mit Dankbarkeit, signalisiert Zusammenarbeit und bleibt professionell."
      },
      warm: {
        message: "Danke für deine Nachricht! Ich freue mich über die Gelegenheit, darüber zu sprechen. Hier ist, was ich denke...",
        explanation: "Warum das funktioniert: Warm und einladend, zeigt echtes Interesse am Gespräch."
      },
      natural: {
        message: "Danke für die Nachricht. Hier ist meine Sicht dazu - sag mir, was du denkst.",
        explanation: "Warum das funktioniert: Locker aber engagiert, lädt zum Dialog ein ohne zu formell zu sein."
      }
    }
  },
  korean: {
    vacation: {
      polite: {
        message: "다음 주에 휴가를 신청해도 될까요? 팀 일정에 맞는지 확인해 주시면 감사하겠습니다.",
        explanation: "이렇게 쓰면 좋은 이유: 공손한 요청 형식을 사용하고 팀에 대한 배려를 보여줍니다."
      },
      warm: {
        message: "안녕하세요! 다음 주에 재충전을 위해 쉬고 싶은데, 괜���을까요? 가기 전에 모든 일이 잘 처리되도록 할게요.",
        explanation: "이렇게 쓰면 좋은 이유: 따뜻한 시작, 이유를 부드럽게 설명하고 책임감을 보여줍니다."
      },
      natural: {
        message: "다음 주에 쉬려고 하는데, 괜찮을까요? 혹시 문제 있으면 말씀해 주세요.",
        explanation: "이렇게 쓰면 좋은 이유: 자연스럽고 직접적이면서도 예의 바릅니다."
      }
    },
    disagree: {
      polite: {
        message: "말씀하신 의견 감사합니다. 저는 조금 다르게 생각하는데, 제 생각을 공유해도 될까요?",
        explanation: "이렇게 쓰면 좋은 이유: 상대방의 의견을 먼저 인정하고, 부드럽게 다른 의견을 제시합니다."
      },
      warm: {
        message: "네 의견 정말 고마워. 나는 조금 다르게 보는데, 내 생각 들어볼래? 함께 더 좋은 방법을 찾을 수 있을 것 같아.",
        explanation: "이렇게 쓰면 좋은 이유: 상대방을 존중하고, 협력적인 태도를 보여줍니다."
      },
      natural: {
        message: "그 점은 이해해. 근데 나는 좀 다르게 생각하는데, 내 입장 말해도 될까?",
        explanation: "이렇게 쓰면 좋은 이유: 자연스럽게 상대방의 말을 인정하고 자신의 의견으로 넘어갑니다."
      }
    },
    default: {
      polite: {
        message: "메시지 감사합니다. 함께 앞으로 나아갈 수 있도록 제 생각을 공유하고 싶습니다.",
        explanation: "이렇게 쓰면 좋은 이유: 감사로 시작하고, 협력을 강조하며 전문적인 톤을 유지합니다."
      },
      warm: {
        message: "연락 주셔서 감사해요! 이야기 나눌 수 있어서 기뻐요. 제 생각은 이래요...",
        explanation: "이렇게 쓰면 좋은 이유: 따뜻하고 친근하며, 대화에 진심으로 관심을 보여줍니다."
      },
      natural: {
        message: "메시지 고마워요. 제 생각은 이래요 - 어떻게 생각하세요?",
        explanation: "이렇게 쓰면 좋은 이유: 캐주얼하지만 참여적이고, 대화를 자연스럽게 이어갑니다."
      }
    }
  }
}

function detectScenario(message: string, receivedMessage: string, mode: Mode): string {
  const text = (message + " " + receivedMessage).toLowerCase()
  
  if (text.includes("vacation") || text.includes("time off") || text.includes("day off") || text.includes("urlaub") || text.includes("휴가") || text.includes("쉬")) {
    return "vacation"
  }
  if (text.includes("disagree") || text.includes("don't agree") || text.includes("different") || text.includes("anders") || text.includes("다르")) {
    return "disagree"
  }
  if (text.includes("today") || text.includes("urgent") || text.includes("asap") || text.includes("heute") || text.includes("오늘") || text.includes("급")) {
    return "urgent"
  }
  if (text.includes("haven't") || text.includes("yet") || text.includes("done") || text.includes("status") || text.includes("noch nicht") || text.includes("아직")) {
    return "delay"
  }
  if (text.includes("weekend") || text.includes("saturday") || text.includes("sunday") || text.includes("wochenende") || text.includes("주말")) {
    return "weekend"
  }
  
  return "default"
}

function generateDemoResults(
  mode: Mode,
  message: string,
  receivedMessage: string,
  language: string
): ResultCard[] {
  const langKey = language.toLowerCase() || "english"
  const langContent = demoContent[langKey] || demoContent.english
  const scenario = detectScenario(message, receivedMessage, mode)
  const content = langContent[scenario] || langContent.default
  
  return [
    {
      type: "Polite",
      message: content.polite.message,
      explanation: content.polite.explanation,
      icon: Heart,
    },
    {
      type: "Warm",
      message: content.warm.message,
      explanation: content.warm.explanation,
      icon: MessageCircle,
    },
    {
      type: "Natural",
      message: content.natural.message,
      explanation: content.natural.explanation,
      icon: Sparkles,
    },
  ]
}

// Helper function to format message for Slack
function formatForSlack(message: string): string {
  // Clean up the message for Slack - keep it simple and paste-friendly
  return message.trim()
}

// Helper function to generate mailto link
function generateMailtoLink(message: string): string {
  const subject = encodeURIComponent("Follow-up")
  const body = encodeURIComponent(message)
  return `mailto:?subject=${subject}&body=${body}`
}

// Helper function to generate ICS file content
function generateIcsContent(message: string, context: string): string {
  // Get tomorrow at 9:00 AM
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)
  
  // End time: 9:30 AM
  const endTime = new Date(tomorrow)
  endTime.setMinutes(30)
  
  // Format dates for ICS (YYYYMMDDTHHMMSS)
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  
  // Generate a simple title based on context
  const title = context && context !== "General" 
    ? `Follow up: ${context} message`
    : "Follow up on message"
  
  // Truncate message for description
  const description = message.length > 200 
    ? message.substring(0, 200) + "..."
    : message
  
  const uid = `sayla-${Date.now()}@sayla.app`
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sayla//Follow-up Reminder//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(tomorrow)}
DTEND:${formatDate(endTime)}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`
}

// Helper function to download ICS file
function downloadIcsFile(message: string, context: string) {
  const icsContent = generateIcsContent(message, context)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'sayla-reminder.ics'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function SaylaApp() {
  const [mode, setMode] = useState<Mode>("rewrite")
  const [message, setMessage] = useState("")
  const [receivedMessage, setReceivedMessage] = useState("")
  const [replyIntent, setReplyIntent] = useState("")
  const [context, setContext] = useState("")
  const [language, setLanguage] = useState("")
  const [tone, setTone] = useState("")
  const [results, setResults] = useState<ResultCard[] | null>(null)
  const [toneInsight, setToneInsight] = useState<string | null>(null)
  const [mcpGuided, setMcpGuided] = useState(false)
  const [responseSource, setResponseSource] = useState<"ai" | "error" | "fallback" | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [copiedSlackIndex, setCopiedSlackIndex] = useState<number | null>(null)  
  const [isLoading, setIsLoading] = useState(false)
  const [submittedSettings, setSubmittedSettings] = useState<{
    context: string
    language: string
    tone: string
  } | null>(null)

  const handleSubmit = async () => {
    if (mode === "rewrite" && !message.trim()) return
    if (mode === "reply" && (!receivedMessage.trim() || !replyIntent.trim())) return
    
    setIsLoading(true)
    setToneInsight(null)
    setMcpGuided(false)
    setResponseSource(null)
    setResults(null)
    setDebugInfo(null)
    
    // Save the settings at time of submission
    setSubmittedSettings({
      context: context || "General",
      language: language || "English",
      tone: tone || "Balanced",
    })

    // Build request payload based on mode
    const requestPayload = mode === "rewrite" 
      ? {
          mode: "rewrite",
          originalMessage: message.slice(0, 700),
          context: context || "General",
          targetLanguage: language || "English",
          tone: tone || "Balanced",
        }
      : {
          mode: "reply",
          receivedMessage: receivedMessage.slice(0, 700),
          replyIntention: replyIntent.slice(0, 700),
          context: context || "General",
          targetLanguage: language || "English",
          tone: tone || "Balanced",
        }
    
    try {
      const response = await fetch("/api/sayla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        cache: "no-store",
      })

      const data: ApiResponse = await response.json()
      
      // Update debug info
      setDebugInfo({
        requestBody: requestPayload,
        responseSource: data.source,
        hasApiKey: data.hasApiKey ?? null,
        environment: data.environment ?? null,
        errorMessage: data.error ?? null,
      })

      if (data.source === "ai" && data.results) {
        // Success - use AI results
        const iconMap = {
          Polite: Heart,
          Warm: MessageCircle,
          Natural: Sparkles,
        }
        
        const aiResults: ResultCard[] = data.results.map((r) => ({
          type: r.title,
          message: r.message,
          explanation: r.explanation,
          icon: iconMap[r.title] || Heart,
        }))
        
        setResults(aiResults)
        setToneInsight(data.toneInsight || null)
        setMcpGuided(data.mcpGuided || false)
        setResponseSource("ai")
      } else {
        // AI failed - fall back to demo results
        const demoResults = generateDemoResults(
          mode,
          message,
          receivedMessage,
          language || "english"
        )
        setResults(demoResults)
        setToneInsight(null)
        setMcpGuided(false)
        setResponseSource("fallback")
      }
    } catch (err) {
      // Network error - fall back to demo results
      setDebugInfo({
        requestBody: requestPayload,
        responseSource: "fallback",
        hasApiKey: null,
        environment: null,
        errorMessage: err instanceof Error ? err.message : "Network error",
      })
      const demoResults = generateDemoResults(
        mode,
        message,
        receivedMessage,
        language || "english"
      )
      setResults(demoResults)
      setToneInsight(null)
      setMcpGuided(false)
      setResponseSource("fallback")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleCopyForSlack = async (text: string, index: number) => {
    const slackText = formatForSlack(text)
    await navigator.clipboard.writeText(slackText)
    setCopiedSlackIndex(index)
    setTimeout(() => setCopiedSlackIndex(null), 2000)
  }

  const handleOpenAsEmail = (text: string) => {
    const mailtoLink = generateMailtoLink(text)
    window.open(mailtoLink, '_blank')
  }

  const handleCreateReminder = (text: string) => {
    downloadIcsFile(text, submittedSettings?.context || "General")
  }

  const handleRewriteChipClick = (chip: string) => {
    setMessage(chip)
    setResults(null)
  }

  const handleReplyExampleClick = (example: { received: string; intent: string }) => {
    setReceivedMessage(example.received)
    setReplyIntent(example.intent)
    setResults(null)
  }

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    setResults(null)
    setToneInsight(null)
    setMcpGuided(false)
    setResponseSource(null)
    setDebugInfo(null)
  }

  const isSubmitDisabled = mode === "rewrite" 
    ? !message.trim() || isLoading
    : !receivedMessage.trim() || !replyIntent.trim() || isLoading

  const getContextDisplayName = (value: string) => {
    return contextOptions.find(opt => opt.toLowerCase() === value.toLowerCase()) || value || "General"
  }

  const getLanguageDisplayName = (value: string) => {
    return languageOptions.find(opt => opt.toLowerCase() === value.toLowerCase()) || value || "English"
  }

  const getToneDisplayName = (value: string) => {
    return toneOptions.find(opt => opt.toLowerCase() === value.toLowerCase()) || value || "Balanced"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
            Sayla
          </h1>
          <p className="mt-3 font-serif text-xl text-muted-foreground italic">
            Your meaning, gently delivered.
          </p>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Write and reply with the right tone across work, friends, and languages.
          </p>
        </header>

        {/* Main Input Card */}
        <Card className="border-0 shadow-lg shadow-primary/5 mb-8">
          <CardContent className="p-6 sm:p-8">
            {/* Mode Tabs */}
            <div className="flex flex-col sm:flex-row gap-2 p-1 bg-muted/50 rounded-xl mb-6">
              <button
                onClick={() => handleModeChange("rewrite")}
                className={`flex-1 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  mode === "rewrite"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <PenLine className="h-4 w-4" />
                  Rewrite my message
                </span>
                <span className="text-xs font-normal text-muted-foreground hidden sm:block">
                  Turn your message into something more natural
                </span>
              </button>
              <button
                onClick={() => handleModeChange("reply")}
                className={`flex-1 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  mode === "reply"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  Help me reply
                </span>
                <span className="text-xs font-normal text-muted-foreground hidden sm:block">
                  Paste a message and say what you want to reply
                </span>
              </button>
            </div>

            {/* Rewrite Mode */}
            {mode === "rewrite" && (
              <div className="space-y-6">
                <Textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    setResults(null)
                  }}
                  placeholder="Write your message here, even if it sounds too direct..."
                  className="min-h-[140px] resize-none border-0 bg-muted/50 text-base placeholder:text-muted-foreground/60 focus-visible:ring-primary/20 rounded-xl p-4"
                />

                {/* Example Chips */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {rewriteExamples.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleRewriteChipClick(chip)}
                        className="rounded-full bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground transition-all hover:bg-secondary hover:shadow-sm active:scale-[0.98]"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reply Mode */}
            {mode === "reply" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Message you received</label>
                  <Textarea
                    value={receivedMessage}
                    onChange={(e) => {
                      setReceivedMessage(e.target.value)
                      setResults(null)
                    }}
                    placeholder="Paste the message you received..."
                    className="min-h-[100px] resize-none border-0 bg-muted/50 text-base placeholder:text-muted-foreground/60 focus-visible:ring-primary/20 rounded-xl p-4"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">What do you want to say back?</label>
                  <Textarea
                    value={replyIntent}
                    onChange={(e) => {
                      setReplyIntent(e.target.value)
                      setResults(null)
                    }}
                    placeholder="For example: I want to say no, ask for more time, sound friendly, or keep it short."
                    className="min-h-[80px] resize-none border-0 bg-muted/50 text-base placeholder:text-muted-foreground/60 focus-visible:ring-primary/20 rounded-xl p-4"
                  />
                </div>

                {/* Example Chips */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {replyExamples.map((example) => (
                      <button
                        key={example.received}
                        onClick={() => handleReplyExampleClick(example)}
                        className="rounded-full bg-secondary/80 px-4 py-2 text-sm text-secondary-foreground transition-all hover:bg-secondary hover:shadow-sm active:scale-[0.98]"
                      >
                        {example.intent}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Context</label>
                <Select value={context} onValueChange={setContext}>
                  <SelectTrigger className="w-full bg-muted/30 border-border/50">
                    <SelectValue placeholder="Select context" />
                  </SelectTrigger>
                  <SelectContent>
                    {contextOptions.map((option) => (
                      <SelectItem key={option} value={option.toLowerCase()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Target language</label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full bg-muted/30 border-border/50">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option} value={option.toLowerCase()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  Write in any language. Sayla will answer in the selected target language.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="w-full bg-muted/30 border-border/50">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {toneOptions.map((option) => (
                      <SelectItem key={option} value={option.toLowerCase()}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-medium rounded-xl shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Finding the right tone...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {mode === "rewrite" ? "Rewrite with care" : "Help me reply"}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        

        {/* Results Section */}
        {results && submittedSettings && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Tone Insight */}
            {toneInsight && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-2.5 text-sm text-foreground">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="font-medium">Tone insight:</span>
                  <span className="text-muted-foreground">{toneInsight}</span>
                </div>
              </div>
            )}

            {/* Results Header */}
            <div className="text-center">
              <h2 className="font-serif text-2xl font-medium text-foreground mb-3">
                Choose your version
              </h2>
              {/* Settings Labels */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <span className="text-muted-foreground">Context:</span>
                  {getContextDisplayName(submittedSettings.context)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <span className="text-muted-foreground">Language:</span>
                  {getLanguageDisplayName(submittedSettings.language)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <span className="text-muted-foreground">Tone:</span>
                  {getToneDisplayName(submittedSettings.tone)}
                </span>
              </div>
            </div>

            {/* Result Cards */}
            <div className="grid gap-4">
              {results.map((result, index) => (
                <Card
                  key={result.type}
                  className="border-0 shadow-md shadow-primary/5 transition-all hover:shadow-lg hover:shadow-primary/10 overflow-hidden"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <CardContent className="p-0">
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                          <result.icon className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{result.type}</span>
<p className="text-xs text-muted-foreground">
                            {result.type === "Polite" && "Best for formal or work situations"}
                            {result.type === "Warm" && "Best for sensitive conversations"}
                            {result.type === "Natural" && "Best for everyday messages"}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Body */}
                    <div className="p-6">
                      <p className="text-foreground leading-relaxed text-base">
                        {result.message}
                      </p>
                      <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                        {result.explanation}
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(result.message, index)}
                          className="text-xs h-8 px-3 bg-card hover:bg-muted/50 border-border/50"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {copiedIndex === index ? "Copied!" : "Copy"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyForSlack(result.message, index)}
                          className="text-xs h-8 px-3 bg-card hover:bg-muted/50 border-border/50"
                        >
                          {copiedSlackIndex === index ? (
                            <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          {copiedSlackIndex === index ? "Copied!" : "Copy for Slack"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAsEmail(result.message)}
                          className="text-xs h-8 px-3 bg-card hover:bg-muted/50 border-border/50"
                        >
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Open as Email
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateReminder(result.message)}
                          className="text-xs h-8 px-3 bg-card hover:bg-muted/50 border-border/50"
                        >
                          <Calendar className="h-3.5 w-3.5 mr-1.5" />
                          Create reminder
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Source Label */}
            <div className="text-center pt-2 space-y-1">
              {responseSource === "ai" && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                    <Sparkles className="h-3 w-3" />
                    Powered by Groq AI
                  </span>
                  {mcpGuided && (
                    <p className="text-xs text-muted-foreground/70">
                      Guided by Tone Playbook MCP
                    </p>
                  )}
                </>
              )}
              {responseSource === "fallback" && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  Demo preview
                </span>
              )}
            </div>
          </div>
        )}

        {/* Debug Panel - Hidden by default */}
        {debugInfo && (
          <Card className="border-border/50 bg-muted/20 mt-8">
            <CardContent className="p-4">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground w-full"
              >
                <span>{showDebug ? "▼" : "▶"}</span>
                Developer debug
              </button>
              {showDebug && (
                <div className="mt-4 space-y-3 text-xs font-mono">
                  <div>
                    <p className="font-semibold text-foreground">Request body:</p>
                    <pre className="mt-1 p-2 bg-background rounded overflow-x-auto text-muted-foreground">
                      {JSON.stringify(debugInfo.requestBody, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Response source:</p>
                    <p className="text-muted-foreground">{debugInfo.responseSource || "N/A"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Runtime:</p>
                    <p className="text-muted-foreground">nodejs (server-side)</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Environment:</p>
                    <p className="text-muted-foreground">{debugInfo.environment || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">GROQ_API_KEY detected on server:</p>
                    <p className={debugInfo.hasApiKey ? "text-green-600" : "text-red-600"}>
                      {debugInfo.hasApiKey === null ? "Unknown" : debugInfo.hasApiKey ? "Yes" : "No"}
                    </p>
                    {debugInfo.hasApiKey === false && (
                      <p className="text-xs text-red-500 mt-1">
                        GROQ_API_KEY is not available to this deployment. Please redeploy after adding the environment variable.
                      </p>
                    )}
                  </div>
                  {debugInfo.errorMessage && (
                    <div>
                      <p className="font-semibold text-foreground">Error message:</p>
                      <p className="text-red-600">{debugInfo.errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Works with your daily communication flow */}
        <section className="mt-16">
          <h3 className="text-center font-serif text-xl font-medium text-foreground mb-6">
            Works with your daily communication flow
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-0 shadow-sm shadow-primary/5 bg-card/80">
              <CardContent className="p-5 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <MessageSquare className="h-5 w-5 text-accent" />
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">Slack</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Copy a polished reply for team chat
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm shadow-primary/5 bg-card/80">
              <CardContent className="p-5 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <Mail className="h-5 w-5 text-accent" />
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">Email</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Open your message as an email draft
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm shadow-primary/5 bg-card/80">
              <CardContent className="p-5 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <h4 className="font-medium text-foreground text-sm mb-1">Calendar</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Create a follow-up reminder
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-xs text-muted-foreground/60">
            Built for Zero to Agent with v0, Vercel, and Groq.
          </p>
        </footer>
      </div>
    </div>
  )
}
