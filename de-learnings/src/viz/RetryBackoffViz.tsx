import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Animated retry timeline: attempts fail, waits double (exponential backoff),
 * jitter desynchronizes two clients so they stop colliding.
 */
export function RetryBackoffViz() {
  const [jitter, setJitter] = useState(false)
  const [runId, setRunId] = useState(0)

  // attempt widths in "time units": wait then attempt (fixed width 26)
  const waits = [0, 20, 40, 80]
  const jitterA = [0, 3, 9, 5]
  const jitterB = [0, 11, 2, 14]
  const scale = 2.2

  const lane = (offsets: number[], colorFail: string, y: number, label: string) => {
    let x = 6
    const blocks: { x: number; ok: boolean }[] = []
    waits.forEach((w, i) => {
      x += (w + (jitter ? offsets[i] : 0)) * scale
      blocks.push({ x, ok: i === waits.length - 1 })
      x += 26
    })
    return (
      <g key={`${label}-${runId}-${jitter}`}>
        <text x={6} y={y - 10} fontSize={10} fill="var(--muted)" fontFamily="monospace">
          {label}
        </text>
        <line x1={4} y1={y + 9} x2={470} y2={y + 9} stroke="var(--line)" strokeWidth={1} />
        {blocks.map((b, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 * i + 0.2 }}
          >
            <rect
              x={b.x}
              y={y}
              width={26}
              height={18}
              rx={4}
              fill={b.ok ? 'var(--good)' : colorFail}
              opacity={b.ok ? 0.9 : 0.55}
            />
            <text
              x={b.x + 13}
              y={y + 13}
              fontSize={10}
              textAnchor="middle"
              fill="#0b1020"
              fontWeight={700}
              fontFamily="monospace"
            >
              {b.ok ? 'OK' : `#${i + 1}`}
            </text>
          </motion.g>
        ))}
      </g>
    )
  }

  const collide =
    !jitter &&
    waits.every(() => true) // without jitter both lanes align exactly

  return (
    <div className="card my-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Exponential backoff, two clients retrying</span>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input type="checkbox" checked={jitter} onChange={(e) => setJitter(e.target.checked)} />
            add jitter
          </label>
          <button
            onClick={() => setRunId((r) => r + 1)}
            className="rounded-md border border-line px-2.5 py-1 font-medium text-muted hover:text-ink"
          >
            replay
          </button>
        </div>
      </div>
      <svg viewBox="0 0 480 110" className="mt-3 w-full">
        {lane(jitterA, 'var(--bad)', 24, 'client A')}
        {lane(jitterB, 'var(--warn)', 74, 'client B')}
      </svg>
      <p className="mt-1 text-xs leading-5 text-muted">
        Waits double after each failure: 1s → 2s → 4s… {collide ? (
          <b className="text-bad">Without jitter both clients hammer the server at the same instants — a thundering herd.</b>
        ) : (
          <b className="text-good">Jitter spreads the retries out, so recovering servers aren’t hit in sync.</b>
        )}
      </p>
    </div>
  )
}
