'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{
        display: 'inline-block', width: size, height: size,
        border: `2px solid rgba(56,189,248,0.2)`,
        borderTop: `2px solid #38bdf8`,
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
        flexShrink: 0,
      }} />
    </>
  )
}

const API_BASE = 'http://localhost:8080'

interface PlanPhase {
  name: string
  minutes: number
  focus: string
}

interface InterviewPlan {
  level: string
  levelReason: string
  summary: string
  phases: PlanPhase[]
}

type Step = 'input' | 'plan'

const LEVEL_COLORS: Record<string, string> = {
  INTERN: '#34d399',
  JUNIOR: '#38bdf8',
  MID:    '#a78bfa',
  SENIOR: '#f59e0b',
}

export default function StartForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('input')
  const [userGoal, setUserGoal] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [resumeFileName, setResumeFileName] = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [plan, setPlan] = useState<InterviewPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setResumeError(null)
    setResumeLoading(true)
    setResumeFileName(file.name)
    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        setResumeText(await file.text())
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`${API_BASE}/api/resume/extract`, { method: 'POST', body: formData })
        if (!res.ok) throw new Error(`Server error (${res.status})`)
        const data = await res.json() as { text: string }
        setResumeText(data.text)
      } else {
        throw new Error('Only PDF and .txt files are supported.')
      }
    } catch (err) {
      setResumeError(err instanceof Error ? err.message : 'Failed to read file')
      setResumeFileName('')
      setResumeText('')
    } finally {
      setResumeLoading(false)
    }
  }

  function handleRemoveResume() {
    setResumeText(''); setResumeFileName(''); setResumeError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleGeneratePlan() {
    if (!userGoal.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/sessions/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userGoal, resumeText: resumeText || null }),
      })
      if (!res.ok) throw new Error(`Server error (${res.status})`)
      setPlan(await res.json() as InterviewPlan)
      setStep('plan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!plan) return
    setLoading(true); setError(null)
    try {
      // Store behavioral phase duration for the countdown timer
      const behavioral = plan.phases.find(p => p.name.toLowerCase().includes('behavioral'))
      if (behavioral) localStorage.setItem('behavioral_minutes', String(behavioral.minutes))

      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: plan.level, planSummary: plan.summary, resumeText: resumeText || null }),
      })
      if (!res.ok) throw new Error(`Server error (${res.status})`)
      const data = await res.json() as { sessionId: string }
      router.push(`/interview/${data.sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
      setLoading(false)
    }
  }

  const accentColor = plan ? (LEVEL_COLORS[plan.level] ?? '#38bdf8') : '#38bdf8'

  /* ── Input step ─────────────────────────────────────────────── */
  if (step === 'input') {
    return (
      <div style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d2050 0%, #060d1f 65%)' }}
        className="min-h-screen w-full flex items-center justify-center px-4">

        <div className="w-full max-w-lg space-y-7">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 mb-3">
              <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
                className="w-2 h-2 rounded-full inline-block" />
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-sky-400/70">
                InitAI
              </span>
            </div>
            <h1 className="text-3xl font-semibold text-white tracking-tight">
              Your Interview, Your Way
            </h1>
            <p className="text-sm text-slate-400">
              Tell me what you&apos;re preparing for and I&apos;ll build the right session.
            </p>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(13,27,56,0.7)', border: '1px solid rgba(56,189,248,0.12)' }}
            className="rounded-2xl p-6 space-y-5 backdrop-blur-sm">

            <textarea
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
              rows={5}
              placeholder="e.g. I'm a junior dev with 1 year of experience, interviewing at a startup next week for a backend role. First real interview — never done system design."
              style={{ background: 'rgba(6,13,31,0.8)', borderColor: 'rgba(56,189,248,0.15)' }}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/50 transition-colors"
            />

            {/* Resume upload */}
            <div>
              <p className="text-xs font-medium tracking-wider uppercase mb-2"
                style={{ color: 'rgba(148,163,184,0.5)' }}>
                Resume{' '}
                <span className="normal-case font-normal">— optional, PDF or .txt</span>
              </p>

              {resumeFileName ? (
                <div style={{ background: 'rgba(6,13,31,0.6)', borderColor: 'rgba(52,211,153,0.3)' }}
                  className="flex items-center justify-between rounded-xl border px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-emerald-400 text-xs">✓</span>
                    <span className="text-sm text-slate-300 truncate">{resumeFileName}</span>
                    <span className="text-xs text-slate-600 flex-shrink-0">
                      {(resumeText.length / 1000).toFixed(1)}k chars
                    </span>
                  </div>
                  <button onClick={handleRemoveResume}
                    className="text-slate-600 hover:text-slate-400 ml-3 text-xs transition-colors">
                    Remove
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} disabled={resumeLoading}
                  style={{ borderColor: 'rgba(56,189,248,0.15)' }}
                  className="w-full rounded-xl border border-dashed px-4 py-3 text-sm text-slate-600 hover:text-slate-400 hover:border-sky-500/30 transition-colors disabled:opacity-50">
                  {resumeLoading ? <span className="flex items-center justify-center gap-2"><Spinner size={14} /> Reading file…</span> : '+ Attach resume'}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,text/plain,application/pdf"
                onChange={handleFileChange} className="hidden" />
              {resumeError && <p className="mt-1 text-xs text-red-400">{resumeError}</p>}
            </div>

            {error && <p className="text-sm text-red-400">{error} — is the backend running?</p>}

            <button onClick={handleGeneratePlan} disabled={loading || !userGoal.trim()}
              style={{ background: loading || !userGoal.trim() ? 'rgba(14,165,233,0.25)' : 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:cursor-not-allowed transition-all hover:opacity-90 hover:shadow-lg"
              onMouseEnter={e => { if (!loading && userGoal.trim()) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(14,165,233,0.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Spinner size={15} /> Building your plan…</span> : 'Build My Plan →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Plan confirmation step ─────────────────────────────────── */
  return (
    <div style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d2050 0%, #060d1f 65%)' }}
      className="min-h-screen w-full flex items-center justify-center px-4 py-10">

      <div className="w-full max-w-lg space-y-6">

        {/* Level badge */}
        <div className="text-center space-y-3">
          <span
            style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}40` }}
            className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
            {plan?.level}
          </span>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            {plan?.levelReason}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(13,27,56,0.7)', border: '1px solid rgba(56,189,248,0.12)' }}
          className="rounded-2xl p-6 space-y-5 backdrop-blur-sm">

          <p className="text-sm text-slate-300 leading-relaxed">{plan?.summary}</p>

          {/* Phases */}
          <div className="space-y-2">
            {plan?.phases.map((phase, i) => (
              <div key={phase.name}
                style={{ background: 'rgba(6,13,31,0.6)', borderLeft: `3px solid ${accentColor}60` }}
                className="flex gap-4 rounded-xl px-4 py-3 text-sm">
                <div className="w-24 flex-shrink-0">
                  <p className="font-semibold text-slate-200">{phase.name}</p>
                  <p style={{ color: accentColor }} className="text-xs font-medium mt-0.5">
                    {phase.minutes} min
                  </p>
                </div>
                <p className="text-slate-400 leading-relaxed text-xs pt-0.5">{phase.focus}</p>
              </div>
            ))}
          </div>

          {resumeFileName && (
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Resume attached: {resumeFileName}
            </p>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={() => { setStep('input'); setPlan(null) }} disabled={loading}
              style={{ background: 'rgba(6,13,31,0.6)', border: '1px solid rgba(56,189,248,0.12)' }}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:border-sky-500/30 disabled:opacity-50 transition-colors">
              Change
            </button>
            <button onClick={handleConfirm} disabled={loading}
              style={{ background: loading ? 'rgba(14,165,233,0.25)' : 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90"
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 24px rgba(14,165,233,0.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none' }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Spinner size={15} /> Starting…</span> : "Let's Go →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
