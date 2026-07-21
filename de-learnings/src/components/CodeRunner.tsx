import { useState } from 'react'
import { CodeBlock } from './CodeBlock'

/**
 * Pluggable in-browser code execution panel.
 * Engines land with their phases: Pyodide (Python) in Phase 1 module 1.1,
 * DuckDB-WASM (SQL) in module 1.4. Until then this renders the snippet with
 * an honest "engine not wired yet" state so lessons can already be written
 * against the final component API.
 */
export function CodeRunner({ language, code }: { language: 'python' | 'sql'; code: string }) {
  const [poked, setPoked] = useState(false)
  const engine = language === 'python' ? 'Pyodide (Python in your browser)' : 'DuckDB-WASM (SQL in your browser)'
  const arrives = language === 'python' ? 'module 1.1' : 'module 1.4'

  return (
    <div className="my-3">
      <CodeBlock code={code} label={language} />
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPoked(true)}
          className="rounded-lg border border-line px-3 py-1 text-xs font-medium text-muted"
        >
          Run ▸
        </button>
        <span className="text-xs text-muted">
          {poked
            ? `${engine} gets wired in when ${arrives} is authored — for now, run this on your machine.`
            : 'in-browser execution'}
        </span>
      </div>
    </div>
  )
}
