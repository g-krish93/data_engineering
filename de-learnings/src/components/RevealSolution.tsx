import { useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/** Solutions are never visible by default — attempt honestly first. */
export function RevealSolution({ label = 'Reveal answer', children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2">
      <button
        onClick={() => setOpen(!open)}
        className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
          open ? 'border-line text-muted' : 'border-accent/50 text-accent hover:bg-accent/10'
        }`}
      >
        {open ? 'Hide' : label}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="prose-de mt-2 rounded-lg border border-line bg-panel px-4 py-3 text-[0.93rem]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
