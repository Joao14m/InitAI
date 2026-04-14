'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useRef, useState } from 'react'

const API_BASE = 'http://localhost:8080'
const DEFAULT_MINUTES = 15

interface BehavioralChatProps {
  paramsPromise: Promise<{ sessionId: string }>
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function BehavioralChat({ paramsPromise }: BehavioralChatProps) {
  const { sessionId } = use(paramsPromise)
  const router = useRouter()

  const [alexMessage, setAlexMessage] = useState('')
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [sending, setSending] = useState(false)
  const [started, setStarted] = useState(false)
  const [alexSpeaking, setAlexSpeaking] = useState(false)

  // Countdown timer — read stored minutes from localStorage set by StartForm
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_MINUTES * 60)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('behavioral_minutes')
    if (stored) setTimeLeft(parseInt(stored) * 60)
  }, [])

  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [started])

  const recognitionRef = useRef<any>(null)

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return
    setSending(true)
    setTranscript('')

    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/behavioral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) throw new Error(`Server error (${res.status})`)
      const data = await res.json() as { reply: string; phase: string }

      setAlexMessage(data.reply)
      setAlexSpeaking(true)

      const utterance = new SpeechSynthesisUtterance(data.reply)
      utterance.rate = 0.92
      utterance.onend = () => {
        setAlexSpeaking(false)
        if (data.phase === 'CODING') setTimeout(() => router.push(`/interview/${sessionId}/code`), 600)
      }
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } catch {
      setAlexMessage('Connection error — is the backend running?')
    } finally {
      setSending(false)
    }
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition requires Chrome or Edge.'); return }

    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    const accumulated: string[] = []

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) accumulated.push(result[0].transcript)
        else interim = result[0].transcript
      }
      setTranscript(accumulated.join(' ') + (interim ? ' ' + interim : ''))
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
      const final = accumulated.join(' ').trim()
      if (final) sendMessage(final)
    }

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') return
      setListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function handleStart() {
    setStarted(true)
    sendMessage("I'm ready to begin.")
  }

  const isUrgent = timeLeft <= 120 && timeLeft > 0  // last 2 min
  const isExpired = timeLeft === 0

  /* ── Ready screen ────────────────────────────────────────────── */
  if (!started) {
    return (
      <>
        <style>{interviewStyles}</style>
        <div style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d1e40 0%, #080f20 70%)' }}
          className="h-screen flex items-center justify-center">
          <div className="text-center space-y-6 max-w-sm px-6">
            <AlexAvatar speaking={false} />
            <div className="space-y-1.5">
              <p className="text-slate-300 text-sm leading-relaxed">
                Alex will ask you one behavioral question and one follow-up.
              </p>
              <p className="text-slate-600 text-xs">Speak your answers — Chrome or Edge required.</p>
            </div>
            <button onClick={handleStart}
              style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
              className="px-10 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 28px rgba(14,165,233,0.4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}>
              I&apos;m Ready
            </button>
          </div>
        </div>
      </>
    )
  }

  const statusText = alexSpeaking ? 'Alex is speaking…'
    : sending ? 'Thinking…'
    : listening ? 'Listening — tap mic to send'
    : 'Tap to speak'

  /* ── Interview screen ────────────────────────────────────────── */
  return (
    <>
      <style>{interviewStyles}</style>

      <div style={{ background: 'radial-gradient(ellipse at 50% 30%, #0d1e40 0%, #080f20 70%)' }}
        className="flex flex-col h-screen text-slate-200">

        {/* Header */}
        <header style={{ borderBottom: '1px solid rgba(56,189,248,0.08)', background: 'rgba(8,15,32,0.6)' }}
          className="flex items-center justify-between px-6 py-4 flex-shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
              className="w-1.5 h-1.5 rounded-full inline-block" />
            <span className="text-sm font-medium text-slate-400">Behavioral — Alex</span>
          </div>

          {/* Countdown timer */}
          <div style={{
            background: isExpired ? 'rgba(239,68,68,0.12)' : isUrgent ? 'rgba(245,158,11,0.12)' : 'rgba(56,189,248,0.08)',
            border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : isUrgent ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.15)'}`,
            color: isExpired ? '#ef4444' : isUrgent ? '#f59e0b' : '#94a3b8',
          }} className="px-3 py-1 rounded-lg font-mono text-sm tabular-nums transition-colors">
            {formatTime(timeLeft)}
          </div>
        </header>

        {/* Center */}
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
          <AlexAvatar speaking={alexSpeaking} />

          {/* Alex message */}
          <div className="max-w-md text-center min-h-[80px] flex items-center justify-center">
            {sending && !alexMessage
              ? <p className="text-slate-600 text-sm animate-pulse">Thinking…</p>
              : <p className="text-slate-300 text-sm leading-relaxed">{alexMessage}</p>
            }
          </div>

          {/* Live transcript */}
          {transcript && (
            <p className="text-xs text-slate-600 italic max-w-sm text-center">
              &ldquo;{transcript}&rdquo;
            </p>
          )}
        </div>

        {/* Mic */}
        <div style={{ borderTop: '1px solid rgba(56,189,248,0.08)', background: 'rgba(8,15,32,0.6)' }}
          className="flex flex-col items-center gap-3 py-8 flex-shrink-0 backdrop-blur-sm">
          <button onClick={startListening} disabled={sending || alexSpeaking}
            style={listening ? {
              background: 'radial-gradient(circle, #dc2626, #b91c1c)',
              boxShadow: '0 0 0 0 rgba(220,38,38,0.4)',
              animation: 'mic-ring 1.4s ease-out infinite, bob 0s none',
            } : {
              background: 'rgba(13,27,56,0.8)',
              border: '1px solid rgba(56,189,248,0.2)',
            }}
            className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed">
            <MicIcon />
          </button>
          <p className="text-xs text-slate-600">{statusText}</p>
        </div>
      </div>
    </>
  )
}

/* ─── Avatar ────────────────────────────────────────────────── */
function AlexAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>

      {/* Ripple rings when speaking */}
      {speaking && (
        <>
          <span className="absolute rounded-full" style={{
            width: 196, height: 196,
            border: '1.5px solid rgba(56,189,248,0.45)',
            animation: 'ring-expand 1.3s ease-out infinite',
          }} />
          <span className="absolute rounded-full" style={{
            width: 196, height: 196,
            border: '1.5px solid rgba(56,189,248,0.25)',
            animation: 'ring-expand 1.3s ease-out 0.45s infinite',
          }} />
          <span className="absolute rounded-full" style={{
            width: 196, height: 196,
            border: '1px solid rgba(56,189,248,0.12)',
            animation: 'ring-expand 1.3s ease-out 0.9s infinite',
          }} />
        </>
      )}

      {/* Avatar disk */}
      <div style={{
        width: 176, height: 176,
        borderRadius: '50%',
        background: speaking
          ? 'radial-gradient(circle at 40% 35%, #0e2044, #060d1f)'
          : 'radial-gradient(circle at 40% 35%, #0a1628, #060d1f)',
        border: speaking ? '2px solid rgba(56,189,248,0.35)' : '2px solid rgba(56,189,248,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: speaking ? 'glow-pulse 1.15s ease-in-out infinite, bob 1.15s ease-in-out infinite' : 'none',
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>
        <svg width="88" height="88" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="32" r="17"
            stroke={speaking ? '#7dd3fc' : '#334155'}
            strokeWidth="2" fill="none" />
          <path d="M14 88 C14 65 30 58 50 58 C70 58 86 65 86 88"
            stroke={speaking ? '#7dd3fc' : '#334155'}
            strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    </div>
  )
}

/* ─── Mic icon ──────────────────────────────────────────────── */
function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-1 15.93V21h2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
    </svg>
  )
}

/* ─── Keyframes ─────────────────────────────────────────────── */
const interviewStyles = `
  @keyframes glow-pulse {
    0%, 100% {
      box-shadow: 0 0 0 3px rgba(56,189,248,0.15), 0 0 22px 5px rgba(56,189,248,0.1);
    }
    50% {
      box-shadow: 0 0 0 7px rgba(56,189,248,0.35), 0 0 55px 18px rgba(56,189,248,0.22);
    }
  }
  @keyframes bob {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-7px); }
  }
  @keyframes ring-expand {
    0%   { transform: scale(1);    opacity: 1; }
    100% { transform: scale(1.55); opacity: 0; }
  }
  @keyframes mic-ring {
    0%   { box-shadow: 0 0 0 0   rgba(220,38,38,0.5); }
    70%  { box-shadow: 0 0 0 14px rgba(220,38,38,0);  }
    100% { box-shadow: 0 0 0 0   rgba(220,38,38,0);   }
  }
`
