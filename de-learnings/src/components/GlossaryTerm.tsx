import type { ReactNode } from 'react'
import { glossary } from '../content/glossary'

/**
 * Wraps a term's first use; hover/focus shows its glossary definition.
 * `k` is the key in src/content/glossary.ts.
 */
export function GlossaryTerm({ k, children }: { k: string; children?: ReactNode }) {
  const entry = glossary[k]
  if (!entry) return <>{children ?? k}</>
  return (
    <span className="group relative inline-block">
      <span
        tabIndex={0}
        className="cursor-help border-b border-dashed border-accent/60 text-ink outline-none focus:border-accent"
      >
        {children ?? entry.term}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] leading-6 opacity-0 shadow-xl transition-all duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <span className="font-semibold text-accent">{entry.term}. </span>
        <span className="text-ink">{entry.definition}</span>
      </span>
    </span>
  )
}
