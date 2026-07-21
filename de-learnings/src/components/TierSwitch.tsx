import { TIERS, useTierStore } from '../app/stores'

const activeClasses: Record<string, string> = {
  layman: 'bg-good/15 text-good border-good/40',
  student: 'bg-accent/15 text-accent border-accent/40',
  phd: 'bg-accent-2/15 text-accent-2 border-accent-2/40',
}

export function TierSwitch({ compact = false }: { compact?: boolean }) {
  const tier = useTierStore((s) => s.tier)
  const setTier = useTierStore((s) => s.setTier)
  return (
    <div
      role="tablist"
      aria-label="Explanation depth"
      className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5"
    >
      {TIERS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tier === t.id}
          title={t.blurb}
          onClick={() => setTier(t.id)}
          className={`rounded-full border font-medium transition-colors ${
            compact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3.5 py-1 text-xs'
          } ${tier === t.id ? activeClasses[t.id] : 'border-transparent text-muted hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
