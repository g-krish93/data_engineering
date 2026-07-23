import { CodeRunner } from '../components/CodeRunner'
import { CollectionsViz } from '../viz/CollectionsViz'
import { RowVsColumn3D } from '../viz/RowVsColumn3D'
import { BTreeViz } from '../viz/BTreeViz'
import { StarSchema3D } from '../viz/StarSchema3D'
import { ParquetFileViz } from '../viz/ParquetFileViz'
import { RetryBackoffViz } from '../viz/RetryBackoffViz'
import { BenchBars } from '../viz/BenchBars'
import { ContainerLayers } from '../viz/ContainerLayers'
import { PipelineDAG } from '../viz/PipelineDAG'
import { MedallionFlow } from '../viz/MedallionFlow'
import { WatermarkTimeline } from '../viz/WatermarkTimeline'

/** Unlisted sandbox: run Python and SQL in the browser, poke every viz primitive. */
export default function PlaygroundPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24">
      <header className="pt-10">
        <h1 className="text-3xl font-bold tracking-tight">Playground</h1>
        <p className="mt-2 text-muted">
          The engines and visual primitives that power the lessons, in one sandbox. Nothing here is graded —
          break things freely.
        </p>
      </header>

      <h2 className="mt-8 text-lg font-semibold">Python — Pyodide</h2>
      <CodeRunner
        language="python"
        code={`rows = [{"city": "london", "temp": 21.5}, {"city": "oslo", "temp": 14.0}]
hot = [r["city"] for r in rows if r["temp"] > 15]
print(f"warm cities: {hot}")
sum(r["temp"] for r in rows) / len(rows)`}
      />

      <h2 className="mt-8 text-lg font-semibold">SQL — DuckDB</h2>
      <CodeRunner
        language="sql"
        setup={`CREATE OR REPLACE TABLE trips AS
SELECT * FROM (VALUES
  ('london', 12.5, DATE '2026-07-01'),
  ('london', 31.0, DATE '2026-07-02'),
  ('oslo',    8.2, DATE '2026-07-01'),
  ('oslo',   19.9, DATE '2026-07-03'),
  ('madrid', 44.1, DATE '2026-07-02')
) AS t(city, amount, day)`}
        code={`SELECT city, count(*) AS trips, round(avg(amount), 1) AS avg_amount
FROM trips
GROUP BY city
ORDER BY avg_amount DESC`}
      />

      <h2 className="mt-8 text-lg font-semibold">Viz primitives</h2>
      <CollectionsViz />
      <RowVsColumn3D />
      <BTreeViz />
      <StarSchema3D />
      <ParquetFileViz />
      <RetryBackoffViz />
      <BenchBars
        title="Same 10M rows, size on disk"
        items={[
          { label: 'CSV', value: 1024, unit: 'MB' },
          { label: 'CSV gzip', value: 310, unit: 'MB' },
          { label: 'Parquet (snappy)', value: 118, unit: 'MB', note: 'columnar + dictionary + RLE' },
        ]}
        betterIs="lower"
      />
      <h2 className="mt-8 text-lg font-semibold">Phase 3 primitives</h2>
      <ContainerLayers />
      <PipelineDAG />
      <MedallionFlow />
      <WatermarkTimeline />
    </main>
  )
}
