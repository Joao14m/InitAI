'use client'

import Editor from '@monaco-editor/react'
import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = 'http://localhost:8080'

interface Problem {
  id: string
  title: string
  description: string
  constraints: string[]
  difficulty: string
  starterCode: string
}

type SubmitState = 'idle' | 'submitting' | 'done' | 'error'

interface Props {
  paramsPromise: Promise<{ sessionId: string }>
}

/* ── Language config ───────────────────────────────────────────── */
const LANGUAGES = [
  { id: 'python',     label: 'Python',     monaco: 'python' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { id: 'java',       label: 'Java',       monaco: 'java' },
  { id: 'cpp',        label: 'C++',        monaco: 'cpp' },
] as const

type LangId = typeof LANGUAGES[number]['id']

const STARTER: Record<LangId, string> = {
  python:     `# Your solution here\n`,
  javascript: `// Your solution here\n`,
  java:       `class Solution {\n    // Your solution here\n}\n`,
  cpp:        `#include <bits/stdc++.h>\nusing namespace std;\n\n// Your solution here\n`,
}

/* ── Component ─────────────────────────────────────────────────── */
export default function SessionCodeEditor({ paramsPromise }: Props) {
  const { sessionId } = use(paramsPromise)
  const router = useRouter()

  const [problem, setProblem] = useState<Problem | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [language, setLanguage] = useState<LangId>('python')
  const [code, setCode] = useState(STARTER.python)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')

  const [askListening, setAskListening] = useState(false)
  const [talkListening, setTalkListening] = useState(false)
  const [askTranscript, setAskTranscript] = useState('')
  const [alexReply, setAlexReply] = useState<string | null>(null)
  const [alexReplyType, setAlexReplyType] = useState<'hint' | 'talk'>('hint')
  const [alexSpeaking, setAlexSpeaking] = useState(false)
  const askRecognitionRef = useRef<any>(null)
  const talkRecognitionRef = useRef<any>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/sessions/${sessionId}/problem`)
      .then((res) => {
        if (res.status === 204) throw new Error('Problem not assigned yet — is the behavioral phase complete?')
        if (!res.ok) throw new Error(`Problem not found (${res.status})`)
        return res.json() as Promise<Problem>
      })
      .then((data) => setProblem(data))
      .catch((err: Error) => setLoadError(err.message))
  }, [sessionId])

  function handleLanguageChange(lang: LangId) {
    setLanguage(lang)
    setCode(STARTER[lang])
  }

  async function handleSubmit() {
    if (!problem || submitState !== 'idle') return
    setSubmitState('submitting')
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      })
      if (!res.ok) throw new Error(`Server error (${res.status})`)
      setSubmitState('done')
      setTimeout(() => router.push(`/interview/${sessionId}/debrief`), 1000)
    } catch {
      setSubmitState('error')
    }
  }

  async function sendToAlex(question: string, type: 'hint' | 'talk') {
    if (!question.trim()) return
    setAskTranscript('')
    setAlexReplyType(type)
    try {
      const res = await fetch(`${API_BASE}/api/sessions/${sessionId}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, question }),
      })
      if (!res.ok) throw new Error(`Server error (${res.status})`)
      const data = await res.json() as { reply: string }
      setAlexReply(data.reply)
      setAlexSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(data.reply)
      utterance.rate = 0.92
      utterance.onend = () => setAlexSpeaking(false)
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    } catch {
      setAlexReply('Could not reach Alex. Is the backend running?')
    }
  }

  function startAskListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition requires Chrome or Edge.'); return }
    if (askListening) { askRecognitionRef.current?.stop(); return }

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const interim = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript).join('')
      setAskTranscript(interim)
      if (event.results[event.results.length - 1].isFinal) {
        recognition.stop()
        sendToAlex(interim, 'hint')
      }
    }
    recognition.onend = () => { setAskListening(false); askRecognitionRef.current = null }
    recognition.onerror = () => { setAskListening(false); askRecognitionRef.current = null }

    askRecognitionRef.current = recognition
    recognition.start()
    setAskListening(true)
  }

  function startTalkListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition requires Chrome or Edge.'); return }
    if (talkListening) { talkRecognitionRef.current?.stop(); return }

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
      setAskTranscript(accumulated.join(' ') + (interim ? ' ' + interim : ''))
    }

    recognition.onend = () => {
      setTalkListening(false)
      talkRecognitionRef.current = null
      const final = accumulated.join(' ').trim()
      if (final) sendToAlex(final, 'talk')
    }

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') return
      setTalkListening(false)
      talkRecognitionRef.current = null
    }

    talkRecognitionRef.current = recognition
    recognition.start()
    setTalkListening(true)
  }

  const monacoLang = LANGUAGES.find(l => l.id === language)?.monaco ?? 'python'

  if (loadError) return (
    <div className="flex h-screen items-center justify-center text-red-400 text-sm"
      style={{ background: '#080f20' }}>
      Failed to load problem: {loadError}
    </div>
  )

  if (!problem) return (
    <div className="flex h-screen items-center justify-center text-slate-500 text-sm"
      style={{ background: '#080f20' }}>
      Loading problem…
    </div>
  )

  return (
    <div className="flex h-screen text-slate-200" style={{ background: '#080f20' }}>

      {/* ── Left panel ─────────────────────────────────────────── */}
      <aside className="w-96 flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ borderRight: '1px solid rgba(56,189,248,0.08)', background: 'rgba(8,15,32,0.95)' }}>

        {/* Problem header */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(56,189,248,0.08)' }}>
          <span className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: difficultyColor(problem.difficulty) }}>
            {problem.difficulty}
          </span>
          <h1 className="mt-1 text-base font-semibold text-slate-100">{problem.title}</h1>
        </div>

        {/* Problem body */}
        <div className="px-5 py-4 text-sm text-slate-400 leading-relaxed flex-1">
          <p>{problem.description}</p>
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Constraints
            </p>
            <ul className="space-y-1.5">
              {problem.constraints.map((c, i) => (
                <li key={i} className="font-mono text-xs text-slate-500 flex gap-2">
                  <span style={{ color: 'rgba(56,189,248,0.4)' }}>›</span> {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Ask Alex panel */}
        <div className="px-5 py-4 space-y-3"
          style={{ borderTop: '1px solid rgba(56,189,248,0.08)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Ask Alex</p>

          {alexReply && (
            <div className="rounded-xl px-3 py-2.5 text-sm text-slate-300 leading-relaxed"
              style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)' }}>
              <span className="block text-xs mb-1" style={{ color: alexReplyType === 'talk' ? '#a78bfa' : '#38bdf8' }}>
                Alex {alexReplyType === 'talk' ? '· responding' : '· hint'}{alexSpeaking ? ' · speaking…' : ''}
              </span>
              {alexReply}
            </div>
          )}

          {askTranscript && (
            <p className="text-xs text-slate-600 italic leading-relaxed">{askTranscript}</p>
          )}

          {/* Talk button — continuous voice, like behavioral */}
          <button onClick={startTalkListening} disabled={alexSpeaking || askListening}
            style={talkListening ? {
              background: 'rgba(167,139,250,0.15)',
              border: '1px solid rgba(167,139,250,0.4)',
              color: '#c4b5fd',
            } : {
              background: 'rgba(167,139,250,0.06)',
              border: '1px solid rgba(167,139,250,0.15)',
              color: '#94a3b8',
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80">
            <MicIcon size={14} />
            {talkListening ? 'Listening… tap to send' : 'Talk to Alex'}
          </button>

          {/* Hint button — quick single shot */}
          <button onClick={startAskListening} disabled={alexSpeaking || talkListening}
            style={askListening ? {
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5',
            } : {
              background: 'rgba(56,189,248,0.06)',
              border: '1px solid rgba(56,189,248,0.15)',
              color: '#94a3b8',
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-80">
            <MicIcon size={14} />
            {askListening ? 'Listening… tap to stop' : 'Ask for a hint'}
          </button>
        </div>
      </aside>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Toolbar */}
        <header className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(56,189,248,0.08)', background: 'rgba(8,15,32,0.95)' }}>

          {/* Language selector */}
          <div className="flex items-center gap-1 rounded-lg p-0.5"
            style={{ background: 'rgba(13,27,56,0.8)', border: '1px solid rgba(56,189,248,0.1)' }}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id)}
                style={language === lang.id ? {
                  background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                  color: '#fff',
                } : {
                  color: '#64748b',
                }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all hover:text-slate-300"
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={submitState !== 'idle'}
            style={submitState === 'idle' ? {
              background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            } : {
              background: 'rgba(14,165,233,0.2)',
              color: '#94a3b8',
            }}
            className="px-5 py-1.5 rounded-lg text-sm font-semibold text-white disabled:cursor-not-allowed transition-all hover:opacity-90">
            {submitState === 'submitting' ? 'Evaluating…'
              : submitState === 'done' ? 'Done — loading debrief…'
              : 'Submit'}
          </button>
        </header>

        {/* Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            language={monacoLang}
            value={code}
            onChange={(value) => setCode(value ?? '')}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              padding: { top: 16, bottom: 16 },
              fontFamily: 'var(--font-geist-mono), "Fira Code", monospace',
              fontLigatures: true,
            }}
          />
        </div>

        {submitState === 'error' && (
          <div className="px-5 py-3 text-sm text-red-400"
            style={{ borderTop: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
            Submission failed — is the backend running?
          </div>
        )}
      </div>
    </div>
  )
}

function MicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-1 15.93V21h2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
    </svg>
  )
}

function difficultyColor(d: string) {
  if (d === 'easy') return '#34d399'
  if (d === 'medium') return '#f59e0b'
  return '#f87171'
}
