import { Link, useParams } from 'react-router-dom'
import { findPhase, phaseProgress, phases } from '../curriculum'
import { useProgressStore } from '../app/stores'

export default function PhasePage() {
  const { num } = useParams()
  const phase = findPhase(Number(num))
  const done = useProgressStore((s) => s.done)

  if (!phase) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted">No such phase.</p>
        <Link to="/" className="mt-3 inline-block text-accent underline">
          Back to the map
        </Link>
      </main>
    )
  }

  const prog = phaseProgress(phase, done)
  const prev = phases.find((p) => p.number === phase.number - 1)
  const next = phases.find((p) => p.number === phase.number + 1)

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20">
      <nav className="pt-6 text-xs text-muted">
        <Link to="/" className="hover:text-accent">
          Map
        </Link>{' '}
        / Phase {phase.number}
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-lg px-2.5 py-1 font-mono text-sm font-bold"
            style={{ color: phase.color, background: `color-mix(in srgb, ${phase.color} 14%, transparent)` }}
          >
            PHASE {phase.number}
          </span>
          <span className="chip">~{phase.weeks} weeks at 20 hrs/wk</span>
          <span className="chip">
            {prog.done}/{prog.total} lessons done · {prog.authored} authored
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{phase.title}</h1>
        <p className="mt-2 max-w-2xl leading-7 text-muted">{phase.tagline}</p>
      </header>

      {phase.project && (
        <div className="card mt-6 border-l-4 p-4" style={{ borderLeftColor: phase.color }}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Phase project — built in <code className="font-mono">de-portfolio/</code>, not in the browser
          </div>
          <div className="mt-1 font-semibold">
            {phase.project.code}: {phase.project.name}
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{phase.project.pitch}</p>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {phase.modules.map((mod) => (
          <section key={mod.id} className="card overflow-hidden">
            <div className="border-b border-line px-5 py-3.5">
              <h2 className="font-semibold">
                <span className="font-mono text-sm text-muted">{mod.id}</span> · {mod.title}
              </h2>
              <p className="mt-0.5 text-xs leading-5 text-muted">{mod.summary}</p>
            </div>
            <ul>
              {mod.lessons.map((les) => {
                const isDone = !!done[les.id]
                return (
                  <li key={les.id} className="border-b border-line last:border-0">
                    {les.authored ? (
                      <Link
                        to={`/lesson/${les.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/5"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                            isDone ? 'border-good bg-good/15 text-good' : 'border-line text-muted'
                          }`}
                        >
                          {isDone ? '✓' : ''}
                        </span>
                        <span className="font-mono text-xs text-muted">{les.id}</span>
                        <span className={`flex-1 text-sm ${isDone ? 'text-muted' : ''}`}>{les.title}</span>
                        <span className="text-[11px] text-muted">~{les.minutes} min</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-5 py-3 opacity-50">
                        <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-line" />
                        <span className="font-mono text-xs text-muted">{les.id}</span>
                        <span className="flex-1 text-sm">{les.title}</span>
                        <span className="chip">planned</span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 flex justify-between text-sm">
        {prev ? (
          <Link to={`/phase/${prev.number}`} className="text-muted hover:text-accent">
            ← Phase {prev.number}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/phase/${next.number}`} className="text-muted hover:text-accent">
            Phase {next.number}: {next.title} →
          </Link>
        )}
      </div>
    </main>
  )
}
