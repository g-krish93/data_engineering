import { useState } from 'react'
import type { ReactNode } from 'react'

export interface TradeoffOption {
  name: string
  strengths: string[]
  weaknesses: string[]
  chooseWhen: string
}

/**
 * The mandatory trade-offs block: never present a tool as "the answer".
 * Interactive: tap an option to focus it; "compare" shows all side by side.
 */
export function Tradeoffs({ options, note }: { options: TradeoffOption[]; note?: ReactNode }) {
  const [focus, setFocus] = useState<number | null>(null)

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o, i) => (
          <button
            key={o.name}
            onClick={() => setFocus(focus === i ? null : i)}
            className={`chip transition-colors ${
              focus === i ? 'border-accent/60 bg-accent/10 text-accent' : 'hover:text-ink'
            }`}
          >
            {o.name}
          </button>
        ))}
        {focus !== null && (
          <button onClick={() => setFocus(null)} className="chip hover:text-ink">
            show all
          </button>
        )}
      </div>

      <div className={`mt-3 grid gap-3 ${focus === null ? 'md:grid-cols-2' : ''}`}>
        {options.map((o, i) => {
          if (focus !== null && focus !== i) return null
          return (
            <div key={o.name} className="card p-4">
              <h4 className="font-semibold">{o.name}</h4>
              <div className="mt-2 grid gap-2 text-[0.9rem] leading-6">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-good">Strengths</div>
                  <ul className="mt-0.5 list-disc pl-5">
                    {o.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-bad">Weaknesses</div>
                  <ul className="mt-0.5 list-disc pl-5">
                    {o.weaknesses.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-accent/8 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                    Choose when{' '}
                  </span>
                  <span>{o.chooseWhen}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {note && <div className="prose-de mt-2 text-[0.9rem] text-muted">{note}</div>}
    </div>
  )
}
