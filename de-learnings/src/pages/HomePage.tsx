import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CurriculumMap3D } from '../viz/CurriculumMap3D'
import { TIERS, exportProgress, useProgressStore, useTierStore } from '../app/stores'
import { allLessons, authoredLessonCount, phaseProgress, phases, totalLessonCount } from '../curriculum'

function nextUp(done: Record<string, string>) {
  return allLessons().find((r) => r.lesson.authored && !done[r.lesson.id])
}

export default function HomePage() {
  const done = useProgressStore((s) => s.done)
  const importState = useProgressStore((s) => s.importState)
  const resetAll = useProgressStore((s) => s.resetAll)
  const tier = useTierStore((s) => s.tier)
  const setTier = useTierStore((s) => s.setTier)
  const fileRef = useRef<HTMLInputElement>(null)
  const [ioMsg, setIoMsg] = useState('')

  const next = nextUp(done)
  const doneCount = Object.keys(done).length

  const download = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'de-academy-progress.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const upload = (file: File) => {
    void file.text().then((text) => {
      setIoMsg(importState(text) ? 'Progress imported.' : 'That file did not look like exported progress.')
    })
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20">
      {/* hero */}
      <section className="pt-12 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
          an interactive curriculum
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Data engineering, <span className="grad-text">from zero to internals</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-muted">
          Nine phases, {totalLessonCount()} lessons, eight portfolio projects. Every concept explained at
          three depths — pick yours, switch any time.
        </p>

        {/* tier picker */}
        <div className="mx-auto mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTier(t.id)}
              className={`card p-4 text-left transition-all ${
                tier === t.id ? 'border-accent/60 shadow-[0_0_24px_-8px_var(--accent)]' : 'hover:border-line/80 opacity-80'
              }`}
            >
              <div className={`text-sm font-bold ${tier === t.id ? 'text-accent' : ''}`}>{t.label}</div>
              <div className="mt-1 text-xs leading-5 text-muted">{t.blurb}</div>
            </button>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {next && (
            <Link
              to={`/lesson/${next.lesson.id}`}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-bg shadow-[0_8px_30px_-8px_var(--accent)] transition-transform hover:scale-[1.02]"
            >
              {doneCount === 0 ? 'Start lesson 0.1.1 →' : `Continue: ${next.lesson.id} ${next.lesson.title} →`}
            </Link>
          )}
          <span className="chip">
            {doneCount}/{totalLessonCount()} lessons done · {authoredLessonCount()} authored so far
          </span>
        </div>
      </section>

      {/* the 3D map */}
      <section className="mt-10">
        <CurriculumMap3D />
        <p className="mt-1 text-center text-xs text-muted">
          The journey: each node is a phase — hover for details, click to enter. Solid nodes are authored;
          wireframes are still ahead of you (say <code className="font-mono">next lesson</code> in Claude Code to author the next one).
        </p>
      </section>

      {/* phase grid (the map, walkable without 3D) */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold">All phases</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((p) => {
            const prog = phaseProgress(p, done)
            return (
              <Link key={p.number} to={`/phase/${p.number}`} className="card group p-4 transition-colors hover:border-accent/50">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold" style={{ color: p.color }}>
                    PHASE {p.number}
                  </span>
                  <span className="text-[11px] text-muted">~{p.weeks} wk</span>
                </div>
                <h3 className="mt-1.5 font-semibold leading-snug group-hover:text-accent">{p.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">{p.tagline}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${prog.total ? (prog.done / prog.total) * 100 : 0}%`,
                      background: `linear-gradient(90deg, ${p.color}, var(--accent-2))`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                  <span>
                    {prog.done}/{prog.total} done
                  </span>
                  {p.project && <span>{p.project.code}: {p.project.name}</span>}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* progress io */}
      <section className="mt-12">
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-muted">
            Progress data (stored in this browser)
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <button onClick={download} className="rounded-lg border border-line px-3 py-1.5 hover:border-accent/60">
              Export JSON
            </button>
            <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-line px-3 py-1.5 hover:border-accent/60">
              Import JSON
            </button>
            <button
              onClick={() => {
                if (window.confirm('Wipe all lesson/quiz/lab progress in this browser?')) resetAll()
              }}
              className="rounded-lg border border-bad/40 px-3 py-1.5 text-bad hover:bg-bad/10"
            >
              Reset all
            </button>
            {ioMsg && <span className="text-xs text-muted">{ioMsg}</span>}
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
                e.target.value = ''
              }}
            />
          </div>
        </details>
      </section>
    </main>
  )
}
