'use client'

import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'

const API_BASE = 'http://localhost:8080'
const PROBLEM_ID = '1'

interface Problem {
  id: string
  title: string
  description: string
  constraints: string[]
  difficulty: string
  starterCode: string
}

type SubmitState = 'idle' | 'submitting' | 'done' | 'error'

export default function CodeEditor() {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')

  useEffect(() => {
    fetch(`${API_BASE}/api/problems/${PROBLEM_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Problem not found (${res.status})`)
        return res.json() as Promise<Problem>
      })
      .then((data) => {
        setProblem(data)
        setCode(data.starterCode)
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [])

  async function handleSubmit() {
    if (!problem || submitState !== 'idle') return
    setSubmitState('submitting')
    try {
      const res = await fetch(`${API_BASE}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language: 'javascript',
        }),
      })
      if (!res.ok) throw new Error(`Server error (${res.status})`)
      setSubmitState('done')
    } catch {
      setSubmitState('error')
    }
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-red-400 text-sm">
        Failed to load problem: {loadError}
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500 text-sm">
        Loading problem…
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Left panel — problem statement */}
      <aside className="w-96 flex-shrink-0 flex flex-col border-r border-zinc-800 overflow-y-auto">
        <div className="px-5 py-4 border-b border-zinc-800">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {problem.difficulty}
          </span>
          <h1 className="mt-1 text-base font-semibold">{problem.title}</h1>
        </div>
        <div className="px-5 py-4 text-sm text-zinc-300 leading-relaxed flex-1">
          <p>{problem.description}</p>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
              Constraints
            </p>
            <ul className="space-y-1">
              {problem.constraints.map((c, i) => (
                <li key={i} className="font-mono text-xs text-zinc-400">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Right panel — editor */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 flex-shrink-0">
          <span className="text-sm text-zinc-400">Solution</span>
          <button
            onClick={handleSubmit}
            disabled={submitState !== 'idle'}
            className="px-4 py-1.5 rounded bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitState === 'submitting' ? 'Submitting…' : submitState === 'done' ? 'Submitted' : 'Submit'}
          </button>
        </header>

        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="javascript"
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
            }}
          />
        </div>

        {submitState === 'done' && (
          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900 text-sm text-zinc-400">
            Submission received. AI evaluation coming in step 3.
          </div>
        )}
        {submitState === 'error' && (
          <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900 text-sm text-red-400">
            Submission failed. Is the backend running?
          </div>
        )}
      </div>
    </div>
  )
}
