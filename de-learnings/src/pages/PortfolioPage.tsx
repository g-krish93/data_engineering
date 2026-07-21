import { phases } from '../curriculum'

const P1_STATUS = 'spec ready — open de-portfolio/p1-pipeline-zero/'

export default function PortfolioPage() {
  const projects = phases.filter((p) => p.project)
  return (
    <main className="mx-auto max-w-4xl px-4 pb-20">
      <header className="pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio projects</h1>
        <p className="mt-2 max-w-2xl leading-7 text-muted">
          One real project per phase, built by <em>you</em> on your machine — Claude coaches through each
          project’s <code className="font-mono">SPEC.md</code> and <code className="font-mono">BUILD-GUIDE.md</code> in
          the repo’s <code className="font-mono">de-portfolio/</code> folder. The browser is for learning;
          the terminal is where the portfolio gets built.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {projects.map((phase) => {
          const proj = phase.project!
          const ready = proj.code === 'P1'
          return (
            <div key={proj.code} className="card p-5" style={{ borderTop: `3px solid ${phase.color}` }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold" style={{ color: phase.color }}>
                  {proj.code}
                </span>
                <span className={`chip ${ready ? 'border-good/50 text-good' : ''}`}>
                  {ready ? P1_STATUS : `unlocks with Phase ${phase.number}`}
                </span>
              </div>
              <h2 className="mt-2 font-semibold">{proj.name}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{proj.pitch}</p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted">
                Phase {phase.number} · {phase.title}
              </p>
            </div>
          )
        })}
      </div>
    </main>
  )
}
