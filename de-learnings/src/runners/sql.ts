// In-browser SQL via DuckDB-WASM. Dynamically imported so nothing engine-related
// touches the page bundle until the first Run; bundles stream from jsDelivr
// (~10 MB, cached). One shared database per page session — lesson snippets
// seed their own tables with CREATE OR REPLACE so re-runs stay idempotent.
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm'

let dbPromise: Promise<AsyncDuckDB> | null = null

async function init(): Promise<AsyncDuckDB> {
  const duckdb = await import('@duckdb/duckdb-wasm')
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles())
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }),
  )
  const worker = new Worker(workerUrl)
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING), worker)
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  URL.revokeObjectURL(workerUrl)
  return db
}

export function getDuckDB(): Promise<AsyncDuckDB> {
  if (!dbPromise) dbPromise = init()
  return dbPromise
}

export interface SqlRunResult {
  columns: string[]
  rows: string[][]
  rowCount: number
  truncated: boolean
  ms: number
  error?: string
}

const MAX_ROWS = 50

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'bigint') return v.toString()
  if (v instanceof Date) return v.toISOString().replace('T', ' ').replace('.000Z', '')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export async function runSql(sql: string, setup?: string): Promise<SqlRunResult> {
  const db = await getDuckDB()
  const conn = await db.connect()
  const t0 = performance.now()
  try {
    if (setup) {
      for (const stmt of setup.split(/;\s*(?:\n|$)/)) {
        if (stmt.trim()) await conn.query(stmt)
      }
    }
    const res = await conn.query(sql)
    const columns = res.schema.fields.map((f) => f.name)
    const all = res.toArray()
    const rows = all
      .slice(0, MAX_ROWS)
      .map((r) => columns.map((c) => formatCell((r as Record<string, unknown>)[c])))
    return {
      columns,
      rows,
      rowCount: all.length,
      truncated: all.length > MAX_ROWS,
      ms: performance.now() - t0,
    }
  } catch (e) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      ms: performance.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    }
  } finally {
    await conn.close()
  }
}
