import { useState } from 'react'

const COLS = [
  { name: 'ts', color: '#a78bfa' },
  { name: 'city', color: '#fbbf24' },
  { name: 'amount', color: '#34d399' },
]

// hardcoded per-row-group stats for `amount`
const ROW_GROUPS = [
  { rows: '1M rows', min: 3, max: 87 },
  { rows: '1M rows', min: 12, max: 140 },
  { rows: '1M rows', min: 5, max: 66 },
]

const THRESHOLD = 90

/**
 * Anatomy of a Parquet file — row groups × column chunks with footer stats.
 * Toggle projection (read one column) and predicate pushdown (skip row groups
 * whose stats prove they can't match) and watch the I/O counter drop.
 */
export function ParquetFileViz() {
  const [project, setProject] = useState(false)
  const [predicate, setPredicate] = useState(false)

  const rgRead = ROW_GROUPS.map((rg) => !predicate || rg.max > THRESHOLD)
  const chunkRead = (rgi: number, col: string) =>
    rgRead[rgi] && (!project || col === 'amount')
  const totalChunks = ROW_GROUPS.length * COLS.length
  const readChunks = ROW_GROUPS.flatMap((_, rgi) => COLS.filter((c) => chunkRead(rgi, c.name))).length

  const query = `SELECT ${project ? 'avg(amount)' : '*'}${predicate ? ` WHERE amount > ${THRESHOLD}` : ''}`

  const btn = (active: boolean) =>
    `rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
      active ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink'
    }`

  return (
    <div className="card my-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-ink">{query}</span>
        <span className="ml-auto flex gap-2">
          <button className={btn(project)} onClick={() => setProject(!project)}>
            column pruning
          </button>
          <button className={btn(predicate)} onClick={() => setPredicate(!predicate)}>
            predicate pushdown
          </button>
        </span>
      </div>

      <svg viewBox="0 0 520 258" className="mt-3 w-full">
        {/* file outline */}
        <rect x={4} y={4} width={512} height={250} rx={10} fill="none" stroke="var(--line)" strokeWidth={1.5} />
        <text x={16} y={22} fontSize={10} fontFamily="Consolas, monospace" fill="var(--muted)">
          weather.parquet
        </text>
        <rect x={468} y={10} width={42} height={16} rx={4} fill="var(--panel)" stroke="var(--line)" />
        <text x={489} y={21} fontSize={9} textAnchor="middle" fontFamily="Consolas, monospace" fill="var(--muted)">
          PAR1
        </text>

        {ROW_GROUPS.map((rg, rgi) => {
          const y = 34 + rgi * 58
          const read = rgRead[rgi]
          return (
            <g key={rgi} opacity={read ? 1 : 0.32}>
              <rect x={14} y={y} width={420} height={50} rx={7} fill="none" stroke={read ? 'var(--line)' : 'var(--bad)'} strokeDasharray={read ? undefined : '4 3'} />
              <text x={22} y={y + 13} fontSize={9} fontFamily="Consolas, monospace" fill="var(--muted)">
                row group {rgi} · {rg.rows}
              </text>
              {COLS.map((c, ci) => {
                const cRead = chunkRead(rgi, c.name)
                return (
                  <g key={c.name} opacity={cRead ? 1 : 0.3}>
                    <rect
                      x={24 + ci * 134}
                      y={y + 19}
                      width={124}
                      height={24}
                      rx={5}
                      fill={c.color}
                      opacity={cRead ? 0.75 : 0.35}
                    />
                    <text x={24 + ci * 134 + 62} y={y + 34} fontSize={10} textAnchor="middle" fontFamily="Consolas, monospace" fontWeight={700} fill="#0b1020">
                      {c.name} chunk
                    </text>
                  </g>
                )
              })}
              {/* stats chip */}
              <rect x={440} y={y + 12} width={68} height={26} rx={5} fill="var(--panel)" stroke="var(--line)" />
              <text x={474} y={y + 23} fontSize={8.5} textAnchor="middle" fontFamily="Consolas, monospace" fill="var(--muted)">
                amount stats
              </text>
              <text x={474} y={y + 33} fontSize={9} textAnchor="middle" fontFamily="Consolas, monospace" fill={read ? 'var(--ink)' : 'var(--bad)'}>
                {rg.min}–{rg.max}
              </text>
              {!read && (
                <text x={224} y={y + 34} fontSize={10} textAnchor="middle" fontFamily="Consolas, monospace" fontWeight={700} fill="var(--bad)">
                  skipped: max {rg.max} ≤ {THRESHOLD}
                </text>
              )}
            </g>
          )
        })}

        {/* footer */}
        <rect x={14} y={214} width={494} height={32} rx={7} fill="var(--panel)" stroke="var(--accent)" strokeOpacity={0.5} />
        <text x={261} y={228} fontSize={9.5} textAnchor="middle" fontFamily="Consolas, monospace" fill="var(--accent)">
          footer: schema · row-group offsets · per-chunk min/max stats
        </text>
        <text x={261} y={240} fontSize={8.5} textAnchor="middle" fontFamily="Consolas, monospace" fill="var(--muted)">
          readers start HERE — one small read tells them what to skip
        </text>
      </svg>

      <p className="mt-2 text-xs leading-5">
        <span className="font-mono font-bold text-ink">
          I/O: {readChunks}/{totalChunks} column chunks
        </span>{' '}
        <span className="text-muted">
          — projection skips columns; the footer’s min/max stats let the reader skip whole row groups
          without opening them. Together they’re why Parquet + a smart engine can be 100x cheaper than CSV.
        </span>
      </p>
    </div>
  )
}
