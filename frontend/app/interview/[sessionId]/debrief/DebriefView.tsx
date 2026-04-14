'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'

const API_BASE = 'http://localhost:8080'

interface DebriefReport {
  scores: Record<string, number>
  feedback: Record<string, string>
  priority_improvement: string
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'problem_solving',      label: 'Problem Solving' },
  { key: 'code_quality',         label: 'Code Quality' },
  { key: 'communication',        label: 'Communication' },
  { key: 'complexity_awareness', label: 'Complexity Awareness' },
]

interface Props {
  paramsPromise: Promise<{ sessionId: string }>
}

export default function DebriefView({ paramsPromise }: Props) {
  const { sessionId } = use(paramsPromise)
  const [report, setReport] = useState<DebriefReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/sessions/${sessionId}/debrief`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error (${res.status})`)
        return res.json() as Promise<DebriefReport>
      })
      .then(setReport)
      .catch((err: Error) => setError(err.message))
  }, [sessionId])

  if (error) return (
    <PageShell>
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400 text-sm">Failed to load debrief: {error}</p>
      </div>
    </PageShell>
  )

  if (!report) return (
    <PageShell>
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <LoadingRing />
        <p className="text-slate-500 text-sm">Generating your debrief…</p>
      </div>
    </PageShell>
  )

  const scores = Object.values(report.scores ?? {})
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto w-full py-14 px-5 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
              className="w-1.5 h-1.5 rounded-full inline-block" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase"
              style={{ color: 'rgba(56,189,248,0.6)' }}>
              InitAI
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-100">Interview Debrief</h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s a breakdown of your performance.</p>
        </div>

        {/* Overall score card */}
        <div style={{
          background: 'rgba(13,27,56,0.7)',
          border: '1px solid rgba(56,189,248,0.12)',
        }} className="rounded-2xl p-5 flex items-center gap-5">
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${scoreColor(avgScore)} ${avgScore * 20}%, rgba(56,189,248,0.07) 0)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: '#080f20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="text-lg font-bold text-slate-100">{avgScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-200">Overall Score</p>
            <p className="text-xs text-slate-500 mt-0.5">Average across all categories · out of 5</p>
          </div>
          <span style={{
            background: `${scoreColor(avgScore)}18`,
            color: scoreColor(avgScore),
            border: `1px solid ${scoreColor(avgScore)}40`,
          }} className="px-3 py-1 rounded-full text-xs font-bold flex-shrink-0">
            {scoreLabel(avgScore)}
          </span>
        </div>

        {/* Category cards */}
        <div className="space-y-3">
          {CATEGORIES.map(({ key, label }) => {
            const score = report.scores?.[key] ?? 0
            return (
              <div key={key} style={{
                background: 'rgba(13,27,56,0.5)',
                border: '1px solid rgba(56,189,248,0.07)',
                borderLeft: `3px solid ${scoreColor(score)}55`,
              }} className="rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {label}
                  </p>
                  <span className="text-sm font-bold tabular-nums"
                    style={{ color: scoreColor(score) }}>
                    {score}/5
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(56,189,248,0.07)' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(score / 5) * 100}%`, background: scoreColor(score) }} />
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {report.feedback?.[key] ?? ''}
                </p>
              </div>
            )
          })}
        </div>

        {/* Priority improvement */}
        <div style={{
          background: 'rgba(167,139,250,0.05)',
          border: '1px solid rgba(167,139,250,0.15)',
        }} className="rounded-2xl p-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(167,139,250,0.7)' }}>
            Focus Before Your Next Interview
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">
            {report.priority_improvement}
          </p>
        </div>

        <Link href="/"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
          className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
          Start a New Interview →
        </Link>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d2050 0%, #060d1f 60%)', color: '#e2e8f0' }}
      className="min-h-screen">
      {children}
    </div>
  )
}

function LoadingRing() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: 44, height: 44,
        border: '3px solid rgba(56,189,248,0.1)',
        borderTop: '3px solid #38bdf8',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
      }} />
    </>
  )
}

function scoreColor(score: number) {
  if (score >= 4) return '#34d399'
  if (score >= 3) return '#f59e0b'
  return '#f87171'
}

function scoreLabel(score: number) {
  if (score >= 4) return 'Strong'
  if (score >= 3) return 'Average'
  return 'Needs Work'
}
