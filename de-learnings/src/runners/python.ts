// In-browser Python via Pyodide. Dynamically imported so nothing engine-related
// touches the page bundle until the first Run; the ~15 MB runtime (wasm +
// stdlib) streams from the jsDelivr CDN and is cached by the browser after.
import type { PyodideInterface } from 'pyodide'

let instance: Promise<PyodideInterface> | null = null

export function getPython(): Promise<PyodideInterface> {
  if (!instance) {
    instance = (async () => {
      const { loadPyodide, version } = await import('pyodide')
      return loadPyodide({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/` })
    })()
  }
  return instance
}

export interface PyRunResult {
  stdout: string
  value?: string
  error?: string
  ms: number
}

export async function runPython(code: string): Promise<PyRunResult> {
  const py = await getPython()
  const out: string[] = []
  py.setStdout({ batched: (s: string) => out.push(s) })
  py.setStderr({ batched: (s: string) => out.push(s) })
  const t0 = performance.now()
  try {
    // Auto-fetch imported packages (numpy, pandas, ...) from the Pyodide distribution.
    await py.loadPackagesFromImports(code)
    const result: unknown = await py.runPythonAsync(code)
    let value: string | undefined
    if (result !== undefined) {
      value = String(result)
      const proxy = result as { destroy?: () => void }
      if (proxy && typeof proxy.destroy === 'function') proxy.destroy()
    }
    return { stdout: out.join('\n'), value, ms: performance.now() - t0 }
  } catch (e) {
    return {
      stdout: out.join('\n'),
      error: e instanceof Error ? e.message : String(e),
      ms: performance.now() - t0,
    }
  }
}
