import type { ReactNode } from 'react'

export function KeyTakeaways({ points }: { points: ReactNode[] }) {
  return (
    <div className="card mt-4 border-good/30 p-5">
      <h3 className="text-base font-semibold text-good">Key takeaways</h3>
      <ul className="mt-2 space-y-1.5">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2.5 text-[0.93rem] leading-6">
            <span aria-hidden className="mt-0.5 select-none font-bold text-good">
              ✓
            </span>
            <span className="prose-de">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
