import { useState } from 'react'
import { runPython } from '../runners/python'
import { runSql } from '../runners/sql'
import type { PyRunResult } from '../runners/python'
import type { SqlRunResult } from '../runners/sql'
import { useEngineStatus } from '../runners/status'

interface CodeRunnerProps {
  language: 'python' | 'sql'
  code: string
  /** Hidden statements executed before the visible code each run.
   *  SQL setup must be idempotent: use CREATE OR REPLACE TABLE. */
  setup?: string
  label?: string
}

type AnyResult = { kind: 'py'; r: PyRunResult } | { kind: 'sql'; r: SqlRunResult }

const ENGINE_INFO = {
  python: { name: 'Python (Pyodide)', size: '~15 MB' },
  sql: { name: 'SQL (DuckDB-WASM)', size: '~10 MB' },
} as const

/**
 * Editable, runnable code — Python and real DuckDB SQL execute entirely in the
 * browser. The engine streams from a CDN on the first Run and is cached after.
 */
export function CodeRunner({ language, code, setup, label }: CodeRunnerProps) {
  const [current, setCurrent] = useState(code)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AnyResult | null>(null)
  const engineState = useEngineStatus((s) => s[language])
  const setStatus = useEngineStatus((s) => s.setStatus)
  const info = ENGINE_INFO[language]

  const run = () => {
    void (async () => {
      setRunning(true)
      if (engineState === 'idle') setStatus(language, 'loading')
      try {
        if (language === 'python') {
          const r = await runPython(current)
          setResult({ kind: 'py', r })
        } else {
          const r = await runSql(current, setup)
          setResult({ kind: 'sql', r })
        }
        setStatus(language, 'ready')
      } catch (e) {
        setStatus(language, 'error')
        setResult({
          kind: 'py',
          r: { stdout: '', error: e instanceof Error ? e.message : String(e), ms: 0 },
        })
      } finally {
        setRunning(false)
      }
    })()
  }

  const lines = current.split('\n').length

  return (
    <div className="card my-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted">{label ?? language}</span>
        <div className="flex items-center gap-2">
          {current !== code && (
            <button
              onClick={() => {
                setCurrent(code)
                setResult(null)
              }}
              className="rounded-md px-2 py-0.5 text-[11px] text-muted hover:text-ink"
            >
              Reset
            </button>
          )}
          <button
            onClick={run}
            disabled={running}
            className="rounded-md bg-accent/15 px-3 py-0.5 text-[11px] font-bold text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
          >
            {running ? (engineState === 'loading' ? 'Loading engine…' : 'Running…') : 'Run ▸'}
          </button>
        </div>
      </div>

      <textarea
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        rows={Math.min(Math.max(lines, 2), 24)}
        spellCheck={false}
        className="block w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-ink outline-none"
      />

      <div className="border-t border-line px-3 py-1 text-[10.5px] text-muted">
        {engineState === 'ready'
          ? `${info.name} — live in your browser. Edit the code and re-run.`
          : engineState === 'loading'
            ? `Downloading ${info.name} (${info.size}, one time — cached after)…`
            : engineState === 'error'
              ? `${info.name} failed to load — check your internet connection and retry.`
              : `Runs in your browser via ${info.name} — first Run downloads ${info.size} (once).`}
      </div>

      {result?.kind === 'py' && (
        <div className="border-t border-line px-4 py-2.5 font-mono text-[12.5px] leading-6">
          {result.r.stdout && <pre className="overflow-x-auto whitespace-pre-wrap">{result.r.stdout}</pre>}
          {result.r.value !== undefined && (
            <pre className="overflow-x-auto whitespace-pre-wrap text-accent">{result.r.value}</pre>
          )}
          {result.r.error && (
            <pre className="overflow-x-auto whitespace-pre-wrap text-bad">{result.r.error}</pre>
          )}
          {!result.r.stdout && result.r.value === undefined && !result.r.error && (
            <span className="text-muted">(no output)</span>
          )}
          <div className="mt-1 text-[10px] text-muted">{result.r.ms.toFixed(0)} ms</div>
        </div>
      )}

      {result?.kind === 'sql' && (
        <div className="border-t border-line px-4 py-2.5">
          {result.r.error ? (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12.5px] leading-6 text-bad">
              {result.r.error}
            </pre>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-[12px]">
                <thead>
                  <tr>
                    {result.r.columns.map((c) => (
                      <th key={c} className="border-b border-line px-2 py-1 text-left font-bold text-accent">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.r.rows.map((row, i) => (
                    <tr key={i} className="odd:bg-panel">
                      {row.map((cell, j) => (
                        <td key={j} className="border-b border-line/50 px-2 py-1 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-1 text-[10px] text-muted">
            {result.r.error
              ? ''
              : `${result.r.rowCount} row${result.r.rowCount === 1 ? '' : 's'}${result.r.truncated ? ` (showing first ${result.r.rows.length})` : ''} · `}
            {result.r.ms.toFixed(0)} ms
          </div>
        </div>
      )}
    </div>
  )
}
