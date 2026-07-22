import { motion } from 'framer-motion'

export interface BenchItem {
  label: string
  value: number
  /** printed after the value, e.g. "ms", "MB" */
  unit?: string
  note?: string
}

interface BenchBarsProps {
  title?: string
  items: BenchItem[]
  /** which direction wins — best bar is tinted green */
  betterIs?: 'lower' | 'higher'
  caption?: React.ReactNode
}

/** Animated comparison bars for benchmarks (sizes, runtimes, row counts). */
export function BenchBars({ title, items, betterIs = 'lower', caption }: BenchBarsProps) {
  const max = Math.max(...items.map((i) => i.value))
  const bestValue =
    betterIs === 'lower' ? Math.min(...items.map((i) => i.value)) : max

  return (
    <div className="card my-4 p-4">
      {title && <div className="text-sm font-semibold">{title}</div>}
      <div className="mt-3 space-y-2.5">
        {items.map((item) => {
          const isBest = item.value === bestValue
          return (
            <div key={item.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className={isBest ? 'font-semibold text-good' : 'text-ink'}>{item.label}</span>
                <span className="font-mono text-muted">
                  {item.value.toLocaleString()}
                  {item.unit ? ` ${item.unit}` : ''}
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-line/60">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(item.value / max) * 100}%` }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    isBest
                      ? 'bg-good'
                      : 'bg-gradient-to-r from-accent to-accent-2'
                  }`}
                />
              </div>
              {item.note && <div className="mt-0.5 text-[11px] text-muted">{item.note}</div>}
            </div>
          )
        })}
      </div>
      {caption && <div className="mt-3 text-xs leading-5 text-muted">{caption}</div>}
    </div>
  )
}
