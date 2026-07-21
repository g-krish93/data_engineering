import type { ReactNode } from 'react'

interface SectionProps {
  id?: string
  kicker?: string
  title: string
  children: ReactNode
}

export function Section({ id, kicker, title, children }: SectionProps) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      {kicker && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">{kicker}</div>
      )}
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
      <div className="prose-de mt-2">{children}</div>
    </section>
  )
}
