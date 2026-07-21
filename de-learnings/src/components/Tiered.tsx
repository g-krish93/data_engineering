import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import type { Tier } from '../app/stores'
import { useTierStore } from '../app/stores'

interface TieredProps {
  layman?: ReactNode
  student?: ReactNode
  phd?: ReactNode
}

const tierStyle: Record<Tier, { label: string; border: string; text: string }> = {
  layman: { label: 'Layman view', border: 'border-good/50', text: 'text-good' },
  student: { label: 'Student view', border: 'border-accent/50', text: 'text-accent' },
  phd: { label: 'PhD view', border: 'border-accent-2/50', text: 'text-accent-2' },
}

/**
 * Renders the content matching the globally selected tier. If a tier has no
 * content, falls back student -> layman -> phd and says so.
 */
export function Tiered({ layman, student, phd }: TieredProps) {
  const tier = useTierStore((s) => s.tier)
  const content: Record<Tier, ReactNode | undefined> = { layman, student, phd }
  const shown: Tier =
    content[tier] != null ? tier : student != null ? 'student' : layman != null ? 'layman' : 'phd'
  const style = tierStyle[shown]

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={shown}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.16 }}
        className={`my-3 border-l-2 pl-4 ${style.border}`}
      >
        <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${style.text}`}>
          {style.label}
          {shown !== tier && <span className="ml-2 font-normal normal-case tracking-normal text-muted">(no {tier} version of this bit — showing {style.label.toLowerCase()})</span>}
        </div>
        <div className="prose-de">{content[shown]}</div>
      </motion.div>
    </AnimatePresence>
  )
}
