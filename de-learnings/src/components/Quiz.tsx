import { useState } from 'react'
import { useProgressStore } from '../app/stores'

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  explain: string
}

export function Quiz({ lessonId, questions }: { lessonId: string; questions: QuizQuestion[] }) {
  const [choices, setChoices] = useState<(number | null)[]>(() => questions.map(() => null))
  const [submitted, setSubmitted] = useState(false)
  const setQuiz = useProgressStore((s) => s.setQuiz)
  const prior = useProgressStore((s) => s.quiz[lessonId])

  const score = questions.filter((question, i) => choices[i] === question.answer).length
  const allAnswered = choices.every((c) => c !== null)

  const submit = () => {
    setSubmitted(true)
    setQuiz(lessonId, { score, total: questions.length })
  }

  const retake = () => {
    setChoices(questions.map(() => null))
    setSubmitted(false)
  }

  return (
    <div className="card mt-4 p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Check yourself</h3>
        {prior && !submitted && (
          <span className="text-xs text-muted">
            last attempt: {prior.score}/{prior.total}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-5">
        {questions.map((question, qi) => (
          <div key={qi}>
            <p className="text-sm font-medium">
              {qi + 1}. {question.q}
            </p>
            <div className="mt-2 grid gap-1.5">
              {question.options.map((opt, oi) => {
                const chosen = choices[qi] === oi
                const isAnswer = question.answer === oi
                let cls = 'border-line hover:border-accent/50'
                if (!submitted && chosen) cls = 'border-accent bg-accent/10'
                if (submitted && isAnswer) cls = 'border-good bg-good/10'
                if (submitted && chosen && !isAnswer) cls = 'border-bad bg-bad/10'
                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() =>
                      setChoices((prev) => prev.map((c, i) => (i === qi ? oi : c)))
                    }
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${cls}`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {submitted && (
              <p className="mt-2 text-[13px] leading-6 text-muted">
                {choices[qi] === question.answer ? 'Correct. ' : 'Not quite. '}
                {question.explain}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        {!submitted ? (
          <button
            onClick={submit}
            disabled={!allAnswered}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-bg transition-opacity disabled:opacity-40"
          >
            Check answers
          </button>
        ) : (
          <>
            <span className="text-sm font-semibold">
              {score}/{questions.length}
              {score === questions.length ? ' — perfect.' : ''}
            </span>
            <button
              onClick={retake}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
            >
              Retake
            </button>
          </>
        )}
      </div>
    </div>
  )
}
