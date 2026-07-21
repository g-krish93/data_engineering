import { Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findLesson, lessonNeighbors } from '../curriculum'
import { lessonComponents } from '../lessons'
import { TierSwitch } from '../components/TierSwitch'
import { useProgressStore } from '../app/stores'

export default function LessonPage() {
  const { id = '' } = useParams()
  const ref = findLesson(id)
  const done = useProgressStore((s) => s.done)
  const toggleDone = useProgressStore((s) => s.toggleDone)

  if (!ref) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted">No lesson with id “{id}”.</p>
        <Link to="/" className="mt-3 inline-block text-accent underline">
          Back to the map
        </Link>
      </main>
    )
  }

  const { lesson, module: mod, phase } = ref
  const Component = lessonComponents[lesson.id]
  const { prev, next } = lessonNeighbors(lesson.id)
  const isDone = !!done[lesson.id]

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <nav className="pt-6 text-xs text-muted">
        <Link to="/" className="hover:text-accent">
          Map
        </Link>{' '}
        /{' '}
        <Link to={`/phase/${phase.number}`} className="hover:text-accent">
          Phase {phase.number}
        </Link>{' '}
        / {mod.title}
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-bold" style={{ color: phase.color }}>
            {lesson.id}
          </span>
          <span className="chip">~{lesson.minutes} min</span>
          {isDone && <span className="chip border-good/50 text-good">done {done[lesson.id]}</span>}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-muted">Depth:</span>
          <TierSwitch />
        </div>
      </header>

      {lesson.authored && Component ? (
        <Suspense
          fallback={
            <div className="mt-16 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
            </div>
          }
        >
          <Component />
        </Suspense>
      ) : (
        <div className="card mt-10 p-8 text-center">
          <p className="font-semibold">This lesson is planned but not authored yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Open this repo in Claude Code and say <code className="font-mono">next lesson</code> — lessons are
            authored one at a time, in order, so the curriculum grows exactly as fast as you learn.
          </p>
        </div>
      )}

      {/* footer: done + nav */}
      <div className="mt-14 border-t border-line pt-6">
        {lesson.authored && (
          <button
            onClick={() => toggleDone(lesson.id)}
            className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition-all ${
              isDone
                ? 'border border-good/50 bg-good/10 text-good'
                : 'bg-accent text-bg shadow-[0_8px_30px_-8px_var(--accent)] hover:scale-[1.01]'
            }`}
          >
            {isDone ? `Done on ${done[lesson.id]} — tap to undo` : 'Mark lesson done ✓'}
          </button>
        )}
        <div className="mt-5 flex justify-between gap-4 text-sm">
          {prev ? (
            <Link to={`/lesson/${prev.lesson.id}`} className="min-w-0 text-muted hover:text-accent">
              ← {prev.lesson.id} {prev.lesson.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/lesson/${next.lesson.id}`}
              className={`min-w-0 text-right ${isDone && next.lesson.authored ? 'font-semibold text-accent' : 'text-muted hover:text-accent'}`}
            >
              {next.lesson.id} {next.lesson.title} →
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
