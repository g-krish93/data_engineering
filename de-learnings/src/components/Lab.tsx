import { useState } from 'react'
import type { ReactNode } from 'react'
import { useProgressStore } from '../app/stores'
import { CodeBlock } from './CodeBlock'

export interface LabCommand {
  ps: string
  bash?: string
  label?: string
}

export interface LabStep {
  title: string
  body?: ReactNode
  commands?: LabCommand[]
  /** Observable proof this step worked. Rendering it adds a persistent checkbox. */
  checkpoint?: ReactNode
}

export function Lab({ lessonId, intro, steps }: { lessonId: string; intro?: ReactNode; steps: LabStep[] }) {
  const labChecks = useProgressStore((s) => s.labChecks)
  const toggleLabCheck = useProgressStore((s) => s.toggleLabCheck)
  const [shell, setShell] = useState<'ps' | 'bash'>('ps')

  const checkpointSteps = steps.filter((s) => s.checkpoint).length
  const checkedCount = steps.filter((s, i) => s.checkpoint && labChecks[`${lessonId}:${i}`]).length
  const hasBash = steps.some((s) => s.commands?.some((c) => c.bash))

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="chip border-accent/40 text-accent">
          Hands-on lab — real commands on your machine
        </span>
        <div className="flex items-center gap-2">
          {hasBash && (
            <div className="flex rounded-full border border-line p-0.5 text-[11px]">
              {(['ps', 'bash'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setShell(s)}
                  className={`rounded-full px-2.5 py-0.5 font-medium ${shell === s ? 'bg-accent/15 text-accent' : 'text-muted'}`}
                >
                  {s === 'ps' ? 'PowerShell' : 'bash'}
                </button>
              ))}
            </div>
          )}
          <span className="text-xs text-muted">
            checkpoints: {checkedCount}/{checkpointSteps}
          </span>
        </div>
      </div>

      {intro && <div className="prose-de mt-2">{intro}</div>}

      <ol className="mt-4 space-y-4">
        {steps.map((step, i) => {
          const key = `${lessonId}:${i}`
          return (
            <li key={i} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-bold text-accent">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold">{step.title}</h4>
                  {step.body && <div className="prose-de mt-1 text-[0.93rem]">{step.body}</div>}
                  {step.commands?.map((cmd, ci) => (
                    <CodeBlock
                      key={ci}
                      code={shell === 'bash' && cmd.bash ? cmd.bash : cmd.ps}
                      label={cmd.label ?? (shell === 'bash' && cmd.bash ? 'bash' : 'PowerShell')}
                    />
                  ))}
                  {step.checkpoint && (
                    <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-good/40 bg-good/5 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={!!labChecks[key]}
                        onChange={() => toggleLabCheck(key)}
                        className="mt-1 accent-(--good)"
                      />
                      <span className="text-[0.9rem] leading-6">
                        <span className="font-semibold text-good">Checkpoint: </span>
                        {step.checkpoint}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
