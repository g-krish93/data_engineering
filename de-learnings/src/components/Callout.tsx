import type { ReactNode } from 'react'

type Kind = 'info' | 'tip' | 'warn'

const styles: Record<Kind, { border: string; badge: string; label: string }> = {
  info: { border: 'border-accent/40', badge: 'text-accent', label: 'Note' },
  tip: { border: 'border-good/40', badge: 'text-good', label: 'Tip' },
  warn: { border: 'border-warn/50', badge: 'text-warn', label: 'Watch out' },
}

export function Callout({ kind = 'info', title, children }: { kind?: Kind; title?: string; children: ReactNode }) {
  const s = styles[kind]
  return (
    <div className={`card my-4 border ${s.border} px-4 py-3`}>
      <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${s.badge}`}>
        {title ?? s.label}
      </div>
      <div className="prose-de mt-1 text-[0.93rem]">{children}</div>
    </div>
  )
}
