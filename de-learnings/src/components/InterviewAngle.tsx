import type { ReactNode } from 'react'
import { RevealSolution } from './RevealSolution'

export interface InterviewItem {
  q: string
  a: ReactNode
}

/** Questions an interviewer would actually ask about this topic. */
export function InterviewAngle({ items }: { items: InterviewItem[] }) {
  return (
    <div className="card mt-4 border-accent-2/30 p-5">
      <h3 className="text-base font-semibold">
        <span className="text-accent-2">Interview angle</span> — could you answer these out loud?
      </h3>
      <div className="mt-3 space-y-4">
        {items.map((item, i) => (
          <div key={i}>
            <p className="text-sm font-medium">{item.q}</p>
            <RevealSolution label="Reveal a strong answer">{item.a}</RevealSolution>
          </div>
        ))}
      </div>
    </div>
  )
}
