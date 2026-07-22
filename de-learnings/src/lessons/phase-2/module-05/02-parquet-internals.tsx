import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeBlock } from '../../../components/CodeBlock'
import { CodeRunner } from '../../../components/CodeRunner'
import { ParquetFileViz } from '../../../viz/ParquetFileViz'

const ID = '2.5.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Parquet is the bedrock file of the modern data world">
        <Tiered
          layman={
            <>
              <p>
                Picture a port full of shipping containers. Taped to each container's door is a manifest: what's inside, how much, the heaviest and lightest item. A customs officer looking for "anything over 90kg" doesn't open containers — she reads manifests and walks past most of them. Opening a container is expensive; reading a sheet of paper is free.
              </p>
              <p>
                A Parquet file is a port that ships with its own manifests. The file ends with a small "footer" describing everything inside — what columns exist, where each block of data starts, and the minimum and maximum value in each block. Query engines read that manifest first and then open only the blocks that could possibly matter. That one trick is why a question over a billion rows can finish after reading a few percent of the file.
              </p>
            </>
          }
          student={
            <>
              <p>
                Nearly everything in the modern <GlossaryTerm k="data-lake">lake</GlossaryTerm> and lakehouse world bottoms out in Parquet files sitting in <GlossaryTerm k="object-storage">object storage</GlossaryTerm>. Spark, DuckDB, Trino, Snowflake, pandas — all read and write it. Phase 4's Iceberg is a table format layered on top: it manages which Parquet files make up a table and adds transactions; the bytes are still Parquet. Learn the file once and you understand the storage layer of every one of those systems.
              </p>
              <p>
                This lesson dissects the file: row groups, column chunks, pages, and the footer whose statistics make engines fast. The interactive file below is your map — every section that follows points back to it. By the lab you will be reading real footers with <code>parquet_metadata()</code> and proving the skipping behavior with your own measurements.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Parquet (2013) descends from the column-store lineage you met in 2.3 — but it is PAX-style hybrid layout rather than pure columnar: the file is horizontally partitioned into row groups, and only within a row group is data stored column-contiguously. That hybrid is deliberate: pure columnar files would make row reconstruction across billions of rows a scattered-read nightmare; PAX bounds reconstruction to a row group while preserving columnar scan behavior inside it.
              </p>
              <p>
                The design question worth holding is "what belongs in immutable file metadata?". Parquet's answer — schema, offsets, per-chunk min/max, null counts — lets a stateless reader plan all I/O from one footer read. What it cannot answer (which files form a table, how to atomically swap them) is exactly the gap table formats fill; keep that seam in mind for Phase 4.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Anatomy: row groups, column chunks, pages, footer">
        <ParquetFileViz />
        <Tiered
          layman={
            <>
              <p>
                Read the picture top to bottom. The file is cut into three horizontal bands — the <strong>row groups</strong> — each holding a million complete rows, like three crates each packed with a million order slips. Inside each band, the slips are torn into columns: all the timestamps together, all the cities together, all the amounts together. Those are the <strong>column chunks</strong> — the colored blocks.
              </p>
              <p>
                At the bottom sits the <strong>footer</strong> — the manifest. It lists the columns, where every block sits in the file, and each block's smallest and biggest value (the "stats" chips on the right). A reader always starts there: one small read at the end tells it everything about what it can skip. Click the two toggles and watch the I/O counter — that counter is this whole lesson.
              </p>
            </>
          }
          student={
            <>
              <p>The hierarchy, from outside in:</p>
              <ul>
                <li><strong>Row group</strong> — a horizontal slice of the table (all columns, a contiguous batch of rows). The unit of parallelism and of skipping. Typically sized so one group is tens to hundreds of MB.</li>
                <li><strong>Column chunk</strong> — one column's values within one row group, stored contiguously. The unit of projection: read the <code>amount</code> chunks and never touch <code>ts</code> or <code>city</code>.</li>
                <li><strong>Page</strong> — each chunk is cut into pages (~1MB default), the unit of encoding and compression. This is where 2.3.3's dictionary and RLE encodings live.</li>
                <li><strong>Footer</strong> — written last, read first: the full <GlossaryTerm k="schema">schema</GlossaryTerm>, the byte offset of every chunk, and per-chunk statistics (min, max, null count). A reader seeks to the end of the file, reads a few KB, and only then decides which bytes of the body to fetch.</li>
              </ul>
              <p>
                Why the footer is at the end: the writer streams row groups out as it goes and only knows offsets and stats when finished. One sequential write pass, no going back to patch a header — which also makes Parquet append-hostile: you never modify a Parquet file, you write a new one.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The footer is a Thrift-serialized <code>FileMetaData</code> structure, length-prefixed and terminated by the 4-byte magic <code>PAR1</code> (also present at byte 0). A reader fetches the last 8 bytes, learns the footer length, fetches the footer — two ranged GETs against object storage before any data I/O. Modern Parquet adds page-level pruning structures: the ColumnIndex and OffsetIndex (per-page min/max enabling page skips within a chunk) and optional split-block bloom filters, which give probabilistic skipping for point predicates on high-cardinality columns where min/max ranges are useless.
              </p>
              <p>
                Nested data is handled by Dremel-style record shredding: every leaf field becomes its own column stream, and two small integers per value — the definition level (how much of the optional path is present) and repetition level (where in the nesting a repeated value restarts) — allow lossless reconstruction of arbitrarily nested, optional, repeated structures from flat columns. It is one of the great tricks in systems design; the Dremel paper (Melnik et al., 2010) is on the Phase 8 reading list and worth the effort.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="How a query actually uses the file">
        <Tiered
          layman={
            <>
              <p>
                Say the question is "average amount, where amount is over 90". The reader's steps: read the manifest (footer); ignore every column except <code>amount</code> (that's the <strong>column pruning</strong> toggle); then check each crate's stats chip — if a crate's biggest amount is 87, nothing inside can be over 90, so the whole crate stays shut (the <strong>predicate pushdown</strong> toggle). In the picture, both toggles together drop I/O from nine blocks to one.
              </p>
              <p>
                Inside the blocks it does open, the file is even cleverer: a column with only six city names stores each name once in a mini dictionary and then just tiny numbers — like writing "see item 3" instead of "london" a million times. Small file, fast reads.
              </p>
            </>
          }
          student={
            <>
              <p>For <code>SELECT avg(amount) FROM rides WHERE amount &gt; 90</code>:</p>
              <ul>
                <li><strong>Projection</strong> — the footer maps columns to chunk offsets; the reader fetches only <code>amount</code> chunks. A 3-of-40-columns query reads ~7% of the file before any other optimization.</li>
                <li><strong>Predicate pushdown via stats</strong> — per row group, compare the predicate against the chunk's min/max: if max is at or below 90, the group provably contains no match and is never fetched. Note the asymmetry: stats can prove absence, never presence — surviving groups still get the filter re-applied row by row.</li>
                <li><strong>Decoding</strong> — inside fetched pages, dictionary encoding plus RLE (2.3.3) mean less decompression work and sometimes direct evaluation on dictionary codes.</li>
              </ul>
              <p>
                How much skipping you get depends on layout. Row groups around the classic ~100MB scale give stats something to amortize; make row groups tiny and the footer balloons while each min/max describes so few rows that ranges stay wide. And if the file is unsorted on the filter column, every group's range spans nearly the full domain — stats exist but exclude nothing. Sorting before writing tightens each group's range, which is why the lab's sorted file will crush the unsorted one.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Min/max pruning is zone maps (small materialized aggregates per block), and its selectivity is a function of the clustering of the filter column. Sorted data gives disjoint per-group ranges (ideal); uniformly shuffled data gives every group min ~ global min and max ~ global max (useless). This is why "sort order" appears in every serious lake table spec — Iceberg sort orders (Phase 4) are precisely a contract that files are written clustered so zone maps bite. Bloom filters complement zone maps for equality predicates on unclustered high-cardinality columns.
              </p>
              <p>
                Engines vary in how far pushdown reaches: row-group level (all engines), page level via ColumnIndex (many), and late materialization — evaluating the predicate on the filter column first and fetching other columns only for qualifying row ranges (DuckDB, Arrow's dataset scanner). Each level trades planner complexity for I/O; the footer's job is to make all of them possible from one small read.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          label="the reader's decision, as a query over footer stats"
          setup={`CREATE OR REPLACE TABLE footer_stats AS
SELECT * FROM (VALUES
  (0, 1000000, 3.00, 87.00),
  (1, 1000000, 12.00, 140.00),
  (2, 1000000, 5.00, 66.00)
) t(row_group, num_rows, amount_min, amount_max);`}
          code={`-- Same numbers as the visualization above. The query is:
--   SELECT avg(amount) FROM weather.parquet WHERE amount > 90
-- This is the ENTIRE skip decision, made without opening any data:
SELECT
  row_group, num_rows, amount_min, amount_max,
  CASE WHEN amount_max > 90 THEN 'READ' ELSE 'SKIP - cannot match' END AS verdict
FROM footer_stats;
-- Try changing 90 to 60 in both places: how many groups survive now?`}
        />
        <CodeRunner
          language="sql"
          label="why sorting sharpens the stats"
          setup={`CREATE OR REPLACE TABLE footer_unsorted AS
SELECT * FROM (VALUES
  (0, 0.01, 99.98), (1, 0.03, 99.95), (2, 0.02, 99.99), (3, 0.05, 99.97)
) t(row_group, amount_min, amount_max);
CREATE OR REPLACE TABLE footer_sorted AS
SELECT * FROM (VALUES
  (0, 0.01, 24.99), (1, 25.00, 49.99), (2, 50.00, 74.99), (3, 75.00, 99.99)
) t(row_group, amount_min, amount_max);`}
          code={`-- Two files, SAME 4M rows, different write order. Query: WHERE amount > 99.
-- Unsorted: every group's range spans the whole domain. Sorted: ranges are
-- tight and disjoint. Count how many groups each layout must open:
SELECT 'unsorted' AS layout,
       count(*) FILTER (WHERE amount_max > 99) AS groups_opened,
       count(*) AS groups_total
FROM footer_unsorted
UNION ALL
SELECT 'sorted',
       count(*) FILTER (WHERE amount_max > 99),
       count(*)
FROM footer_sorted;`}
        />
        <Callout kind="info" title="Why these are simulations">
          DuckDB's real introspection functions — <code>parquet_metadata()</code>, <code>parquet_schema()</code>, <code>parquet_file_metadata()</code> — take a file path, and the in-browser engine has no access to files on your disk. The tables above are honest stand-ins for what those functions return. In the lab you run the real ones against real files and will recognize every column.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Write-time layout: you choose the physics">
        <p>A Parquet writer makes two decisions that fix the read-side physics forever: how big to make row groups, and whether to sort before writing. Neither has a free answer.</p>
        <Tradeoffs
          options={[
            {
              name: 'Bigger row groups (roughly 100MB-1GB)',
              strengths: ['Fewer groups: small footer, less per-group overhead, long sequential reads', 'Stats and dictionaries amortize over more rows; better compression'],
              weaknesses: ['Writer must buffer a whole group in memory before flushing', 'Coarser skipping — one matching row drags a huge group into the scan; fewer parallel units'],
              chooseWhen: 'large batch analytics files in the lake — the default for curated zones.',
            },
            {
              name: 'Smaller row groups (a few MB to tens of MB)',
              strengths: ['Finer-grained skipping and more parallelizable units', 'Modest writer memory; friendlier to memory-constrained jobs'],
              weaknesses: ['Metadata bloat: footers grow, and per-group fixed costs multiply', 'Each min/max describes few rows, and tiny column chunks compress worse'],
              chooseWhen: 'memory-tight writers, or point-lookup-ish workloads over selective keys.',
            },
            {
              name: 'Sort on the hot filter column before writing',
              strengths: ['Tight, disjoint min/max ranges — predicate pushdown skips most groups', 'Runs of similar values encode and compress better (smaller files, free)'],
              weaknesses: ['Sorting 100M rows at write time costs real memory and minutes', 'Only one sort order per file — helps queries filtering that column, not others'],
              chooseWhen: 'you know the dominant filter column (usually time) — almost always worth it.',
            },
          ]}
          note={
            <>These are per-file decisions today; Phase 4 shows Iceberg promoting them to table-level policy (target file size, sort orders) enforced by maintenance jobs — same physics, managed centrally.</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: read a footer, prove the skipping">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will write the same 5M rows twice — unsorted and sorted on <code>amount</code> — then read both footers with <code>parquet_metadata()</code> and prove with <code>EXPLAIN ANALYZE</code> that sorting turns statistics into skipped I/O. Requires the <code>rides</code> table from the 2.5.1 lab (rerun <code>gen_data.py</code> if needed).
            </p>
          }
          steps={[
            {
              title: 'Write the two layouts',
              body: (
                <>
                  <p>Save as <code>write_layouts.py</code> in <code>warehouse-lab</code> and run. A fixed row group size of 500k rows gives exactly 10 groups per file — easy to reason about:</p>
                  <CodeBlock
                    label="write_layouts.py"
                    code={`import duckdb

con = duckdb.connect("data/formats.duckdb")
con.sql("""
    COPY (SELECT * FROM rides)
    TO 'data/rides_unsorted.parquet'
    (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 500000)
""")
con.sql("""
    COPY (SELECT * FROM rides ORDER BY amount)
    TO 'data/rides_sorted.parquet'
    (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 500000)
""")
print("wrote both layouts")`}
                  />
                </>
              ),
              commands: [
                { ps: 'uv run python write_layouts.py' },
                {
                  ps: "Get-ChildItem data\\rides_*.parquet | Format-Table Name, @{n='SizeMB'; e={[math]::Round($_.Length/1MB,1)}}",
                  bash: 'ls -lh data/rides_*.parquet',
                },
              ],
              checkpoint: (
                <>Both files exist. Compare sizes: the sorted file is noticeably <em>smaller</em> — sorted runs encode and compress better. Skipping isn't even its only payoff.</>
              ),
            },
            {
              title: 'Read the real footers',
              body: (
                <>
                  <p>Save as <code>inspect_footer.py</code> and run — <code>parquet_metadata()</code> showing per-row-group stats for <code>amount</code>, exactly like the browser simulation:</p>
                  <CodeBlock
                    label="inspect_footer.py"
                    code={`import duckdb

con = duckdb.connect()
con.sql("SELECT * FROM parquet_schema('data/rides_sorted.parquet')").show()
for f in ("data/rides_unsorted.parquet", "data/rides_sorted.parquet"):
    print("---", f)
    con.sql(f"""
        SELECT row_group_id,
               stats_min_value AS amount_min,
               stats_max_value AS amount_max
        FROM parquet_metadata('{f}')
        WHERE path_in_schema = 'amount'
        ORDER BY row_group_id
    """).show()`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python inspect_footer.py' }],
              checkpoint: (
                <>The schema prints (4 columns with types), then 10 row groups per file. Unsorted: every group's range is roughly 0.0-99.99. Sorted: tight, non-overlapping ranges climbing from ~0 to ~99.99. Write down group 9's range in the sorted file.</>
              ),
            },
            {
              title: 'Run the selective query on both — with the profiler on',
              body: (
                <>
                  <p>Save as <code>bench_selective.py</code>. The predicate <code>amount &gt; 99.0</code> matches ~1% of rows. Watch the scan operator's row counts in the two profiles:</p>
                  <CodeBlock
                    label="bench_selective.py"
                    code={`import duckdb, time

con = duckdb.connect()
q = "SELECT count(*) AS matches, avg(riders) FROM read_parquet('{path}') WHERE amount > 99.0"
for path in ("data/rides_unsorted.parquet", "data/rides_sorted.parquet"):
    sql = q.format(path=path)
    t0 = time.perf_counter()
    con.sql(sql).fetchall()
    dt = time.perf_counter() - t0
    print("---", path, f"{dt*1000:.0f} ms")
    con.sql("EXPLAIN ANALYZE " + sql).show()`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python bench_selective.py' }],
              checkpoint: (
                <>In the profiled plans, find the Parquet scan operator. Unsorted: it emits rows from all 10 row groups (millions scanned). Sorted: only the group(s) whose max exceeds 99.0 are read — on this data, one group of 500k. Record both row counts and both timings; the delta is row-group skipping, measured.</>
              ),
            },
            {
              title: 'Record the evidence',
              body: (
                <p>In your lab notes: sorted vs unsorted file size, group-9 stats range, rows scanned, and milliseconds for each layout. One sentence in your own words: <em>why</em> did the sorted file scan less? If your sentence mentions min/max, you have this lesson.</p>
              ),
              checkpoint: <>All four numbers plus the one-sentence explanation written down.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why does a Parquet reader start at the END of the file?',
              options: [
                'Files are stored reversed on disk for wear-leveling',
                'The footer there holds the schema, every chunk offset, and per-chunk stats — one small read that plans all remaining I/O',
                'The newest rows live at the end and are usually queried first',
                'Checksums must be verified before any read',
              ],
              answer: 1,
              explain:
                'The writer streams row groups first and only knows offsets and statistics at the end, so metadata goes last; readers seek to it first. On object storage this is two ranged GETs before any data is fetched.',
            },
            {
              q: 'A table has 40 columns; your query touches 3. What structure lets Parquet read ~3/40ths of the data?',
              options: [
                'Pages',
                'The gzip dictionary',
                'Column chunks — each column stored contiguously within a row group, addressable via footer offsets',
                'Bloom filters',
              ],
              answer: 2,
              explain:
                'Projection is the column-chunk story: the footer maps each column to its byte ranges, so unused columns are simply never fetched. Row groups give skipping across rows; chunks give skipping across columns.',
            },
            {
              q: "A row group's amount stats read min=3, max=87. The query filters amount > 90. What can the reader safely do?",
              options: [
                'Return the whole group as matching',
                'Skip the group entirely — max 87 proves no row can satisfy amount > 90',
                'Read just the first page to double-check',
                'Nothing; stats are advisory hints only',
              ],
              answer: 1,
              explain:
                'Min/max stats prove absence, never presence: max at or below the threshold means zero possible matches, so the group is skipped unread. Groups that survive still get the filter applied row-by-row — stats never falsely include or exclude rows.',
            },
            {
              q: 'Why do thousands of tiny row groups make a Parquet file slower, not faster?',
              options: [
                'Small groups cannot be compressed at all',
                'Readers must process groups in reverse order',
                'Footer metadata balloons, per-group fixed costs multiply, and each min/max covers so few rows that encodings and stats lose their amortization',
                'Tiny groups disable predicate pushdown by specification',
              ],
              answer: 2,
              explain:
                'Skipping granularity does improve — but the fixed cost per group (metadata, dictionary setup, seek) multiplies, and compression ratios collapse on tiny chunks. The ~100MB convention balances amortization against skip granularity.',
            },
            {
              q: 'Sorting on the filter column before writing made the lab query faster because…',
              options: [
                'sorted data lets binary search replace scanning inside pages',
                "each row group's min/max range became tight and disjoint, so most groups were provably skippable — and runs of similar values compressed better too",
                'DuckDB caches sorted files more aggressively',
                'sorting removes duplicate rows',
              ],
              answer: 1,
              explain:
                'Unsorted, every group spans roughly the whole value domain, so stats exclude nothing. Sorted, ranges partition the domain and the predicate eliminates most groups from the footer alone. Clustering is what makes zone-map-style stats bite — the same idea returns as Iceberg sort orders.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Walk me through what happens when an engine runs SELECT avg(x) FROM file.parquet WHERE y > k.',
            a: (
              <p>
                Read the footer (schema, chunk offsets, per-chunk min/max); prune columns to x and y; for each row group compare k against y's min/max and skip groups that provably cannot match; fetch surviving x/y chunks; decode pages (dictionary/RLE); re-apply the filter row-wise and aggregate. Strong answers name the two distinct prunings — columns via chunks, rows via stats — and note that stats only prove absence.
              </p>
            ),
          },
          {
            q: 'Why does the lakehouse stack (Iceberg, Delta) still need a table format if Parquet already has rich metadata?',
            a: (
              <p>
                Parquet's metadata describes one immutable file. It cannot say which files constitute a table, coordinate concurrent writers, or evolve schema across millions of files. Table formats add that layer — a transactional manifest of Parquet files with snapshots and schema/sort-order evolution — while delegating byte layout, encodings, and stats to Parquet. File format = physics; table format = bookkeeping.
              </p>
            ),
          },
          {
            q: 'When would you deliberately re-sort data before writing Parquet, and what does it cost?',
            a: (
              <p>
                When a dominant filter column exists — almost always event time, sometimes tenant or region. Sorting clusters values so per-group min/max ranges become tight and disjoint, turning stats into real skipping, and it usually shrinks the file via better run-length behavior. The cost is write-time memory and CPU for the sort, and you only get one order per file — pick the column your queries actually filter on.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Parquet = row groups (horizontal slices) x column chunks (one column per group) cut into encoded pages, plus a footer read first that holds schema, offsets, and min/max stats.</>,
          <>Two independent prunings: projection reads only needed columns' chunks; predicate pushdown uses per-group stats to skip whole row groups — stats prove absence, never presence.</>,
          <>Layout is destiny: unsorted data makes every group's min/max span the domain (no skipping); sorting on the hot filter column makes ranges tight and disjoint — and shrinks the file.</>,
          <>Row group sizing is a real trade-off: bigger amortizes metadata and compresses better; smaller skips finer and parallelizes more. The ~100MB convention is the compromise.</>,
          <><code>parquet_metadata()</code> and <code>EXPLAIN ANALYZE</code> turn all of this from theory into numbers you measured — keep that habit for every format claim you ever hear.</>,
          <>Iceberg (Phase 4) is bookkeeping over Parquet files — table-level manifests, snapshots, and sort orders. The bytes stay Parquet; this lesson is its foundation.</>,
        ]}
      />
    </>
  )
}
