import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeRunner } from '../../../components/CodeRunner'
import { CodeBlock } from '../../../components/CodeBlock'
import { RevealSolution } from '../../../components/RevealSolution'

const ID = '2.3.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Storage was half the story. Execution is the other half.">
        <Tiered
          layman={
            <>
              <p>
                Imagine washing dishes by picking up one plate, walking to the sink, washing it, walking back, picking up the next plate. Every
                plate pays the walk. Now load a whole rack and wash the batch at the sink: the walk happens once per <em>rack</em>, and your hands
                settle into a fast rhythm because every plate needs the same motion. Same plates, same soap — several times faster, purely from
                batching.
              </p>
              <p>
                Databases had this exact realization. The classic design processed one row at a time, paying the "walk" — bookkeeping overhead — per
                row. Modern analytical engines process a thousand or so values per trip. That is what the word <em>vectorized</em> means on DuckDB's
                homepage, and this lesson makes you feel the difference with your own timings, in Python and in SQL, before explaining precisely
                where the saved time comes from.
              </p>
            </>
          }
          student={
            <>
              <p>
                Lessons 2.3.2 and 2.3.3 explained why DuckDB <em>reads</em> so little: projection and compression. But reading less only explains
                part of a 100x gap — Postgres and DuckDB both scanning the same cached data still perform wildly differently on aggregates. The rest
                lives in <em>how the engine executes</em>. The classic model (the <strong>Volcano</strong> iterator model) has every operator call{' '}
                <code>next()</code> on its child to receive <em>one row</em>, process it, and pass it up. Per row, per operator: a function call,
                type dispatch ("is this column an int or a string?"), and branchy interpretation. At 100M rows that overhead dwarfs the actual
                arithmetic.
              </p>
              <p>
                <strong>Vectorized execution</strong> keeps the same operator tree but changes the currency: operators exchange <em>batches of
                ~1000-2048 values per column</em> (DuckDB calls them DataChunks). Type dispatch happens once per batch, then a tight loop runs over
                a plain array. The function-call tax is amortized a thousand-fold, the loop stays in CPU cache, and — because{' '}
                <GlossaryTerm k="columnar-storage">columnar storage</GlossaryTerm> already stores values as contiguous arrays — the data arrives in
                exactly the shape the loop wants. Storage and execution are two halves of one design.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The lineage runs through one paper: Boncz, Zukowski, Nes — "MonetDB/X100: Hyper-Pipelining Query Execution" (CIDR 2005), the paper
                that measured <em>why</em> tuple-at-a-time engines ran at a fraction of a modern CPU's potential: interpretation overhead,
                virtual-call costs, branch mispredictions, and cache-hostile memory traffic left instructions-per-cycle on the floor. MonetDB had
                earlier gone full-column-at-a-time (materializing entire intermediate columns); X100's insight was the middle point — vectors sized
                to fit L1/L2 cache, small enough to stay hot, large enough to amortize interpretation. That design became VectorWise and is the
                direct ancestor of DuckDB's executor. It is the first entry on the Phase 8 reading list.
              </p>
              <p>
                Two refinements complete the picture. <strong>Selection vectors:</strong> filters do not compact the batch; they attach an index
                list of surviving positions, and downstream operators iterate that — late materialization's execution-time twin (lesson 2.3.2).{' '}
                <strong>SIMD:</strong> a single instruction applying one operation to multiple data lanes (8 x 64-bit values per 512-bit register);
                tight loops over typed contiguous arrays are precisely what compilers auto-vectorize, so the batch model unlocks SIMD without
                hand-written intrinsics. And for multi-core: <strong>morsel-driven parallelism</strong> (Leis et al., SIGMOD 2014) — split the input
                into cache-friendly "morsels", let worker threads pull the next morsel when free, giving near-linear scaling with automatic load
                balance. DuckDB does this out of the box; your lab timings will show all cores lit.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Feel the gap in pure Python first">
        <p>
          You can reproduce the Volcano-vs-vectorized gap without a database, because Python contains the same dichotomy: the interpreter executes
          your <code>for</code> loop one bytecode at a time (per-item overhead, like a row-at-a-time engine), while <code>sum()</code> runs a tight
          compiled C loop over the same data (the vectorized spirit). Run it:
        </p>
        <CodeRunner
          language="python"
          code={`import time

N = 1_000_000
nums = list(range(N))

def timed(label, fn):
    t0 = time.perf_counter()
    result = fn()
    ms = (time.perf_counter() - t0) * 1000
    print(label.ljust(30), str(round(ms, 1)).rjust(8), "ms   result:", result)
    return ms

def hand_loop():
    total = 0
    for x in nums:
        total += x          # interpreted bytecode, executed N times
    return total

loop_ms = timed("hand-written for loop", hand_loop)
sum_ms = timed("built-in sum()", lambda: sum(nums))
gen_ms = timed("sum() over a generator", lambda: sum(x for x in nums))

print()
print("loop / sum() ratio:", round(loop_ms / sum_ms, 1), "x")
# The generator version is interesting: sum() is compiled, but the
# generator feeds it one interpreted item at a time -- overhead returns.`}
        />
        <Tiered
          layman={
            <>
              <p>
                Same million numbers, same addition, several times slower — the only difference is who runs the loop. The slow version walks to the
                sink per plate: for every single number, Python's interpreter re-reads the instructions, checks what kind of thing <code>x</code>{' '}
                is, and does a little paperwork. The fast version hands the whole rack to a machine built for racks.
              </p>
              <p>
                Notice the third timing: it uses the fast <code>sum()</code>, but feeds it through a gadget that hands over one item at a time — and
                much of the slowness comes back. The lesson is not "Python is slow"; it is <em>per-item overhead is expensive, however you smuggle
                it in</em>. Keep that sentence; it returns in Phase 4 wearing a Spark costume.
              </p>
            </>
          }
          student={
            <>
              <p>
                The mapping to databases is nearly literal. The hand loop is Volcano: per item, the interpreter does dispatch ("what is{' '}
                <code>x</code>? what is <code>+</code> for that type?") and loop bookkeeping — that is the per-row <code>next()</code> call with its
                type checks. The built-in <code>sum()</code> is the vectorized operator: types resolved once, then a compiled loop over a contiguous
                sequence. The generator version is the trap case: a vectorized operator fed by a per-item producer inherits the producer's overhead
                — precisely what happens when you put a Python UDF inside an otherwise-vectorized SQL engine, or a per-row lambda inside a Spark job
                (Phase 4 will measure that one).
              </p>
              <p>
                One honest caveat: this analogy demonstrates <em>interpretation overhead</em>, which is one of the vectorized model's two wins. The
                other — cache-resident batches flowing between operators — has no clean pure-Python demo, but you already hold the mental picture
                from lesson 2.3.2: contiguous column arrays are what make the tight loop possible at all.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The microarchitectural accounting, for the curious: CPython's loop executes several bytecodes per iteration (load, load, binary-op,
                store, jump), each a trip through the evaluation loop's dispatch — dozens-to-hundreds of instructions of overhead per 1-instruction
                addition, plus pointer-chasing to heap-boxed ints (every <code>x</code> is a PyObject, not a machine word — a cache miss waiting to
                happen). <code>sum()</code> over a list still chases PyObject pointers but eliminates dispatch; NumPy (in the lab, under pandas)
                eliminates boxing too — contiguous machine-width arrays — and gets within sight of memory bandwidth. Those three rungs —
                interpreted+boxed, compiled+boxed, compiled+contiguous — are the exact rungs a database climbs going from Volcano to vectorized over
                columnar storage.
              </p>
              <p>
                Vector size is a real tuning parameter, not folklore: too small re-imposes interpretation overhead, too large spills L1/L2 and every
                operator boundary becomes a memory-bandwidth event (MonetDB's whole-column extreme). X100's experiments put the sweet spot around a
                thousand values; DuckDB ships 2048. The same cache-fitting logic reappears at every scale of this curriculum — morsel sizes, Parquet
                row-group sizes, Spark partition sizes — one idea wearing four hats.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Now watch a vectorized engine do it for real">
        <p>
          The SQL runner below is DuckDB — a vectorized columnar engine — running in your browser tab, on one thread, inside WebAssembly. It will
          generate and aggregate <strong>ten million rows</strong>. Before you press Run, guess the milliseconds. Then press Run twice (the first
          includes the engine download) and compare the second timing to your Python loop over one-tenth as many values:
        </p>
        <CodeRunner
          language="sql"
          code={`SELECT count(*)            AS row_count,
       avg(i)              AS avg_i,
       max(i % 97)         AS max_mod,
       sum(i % 7)          AS sum_mod
FROM range(10000000) t(i);`}
        />
        <Callout kind="info" title="Let that number land">
          Tens of milliseconds for 10M rows with four aggregates — roughly a hundred times faster per value than your interpreted loop, in a browser
          tab, with no index and no precomputation. That is what "DuckDB is a vectorized engine" means concretely: values move through the plan 2048
          at a time as typed arrays; each operator resolves types once per batch and then runs loops the compiler can auto-vectorize into SIMD. On
          your machine (lab), DuckDB additionally splits the input into morsels and feeds every core. None of this required you to do anything —
          which is exactly the point of buying a good engine.
        </Callout>
        <p>
          One more habit worth keeping from module 2.2: ask the engine what it plans to do. <code>EXPLAIN</code> works here too — run it and meet
          the vectorized operators by name:
        </p>
        <CodeRunner
          language="sql"
          code={`EXPLAIN SELECT city, avg(amount)
FROM (SELECT 'city_' || (i % 5) AS city, i * 1.0 AS amount
      FROM range(100000) t(i))
GROUP BY city;`}
        />
        <p>
          You will see a small tree — a scan feeding a projection feeding <code>HASH_GROUP_BY</code>. Same shape Postgres showed you in 2.2; what
          changed is the currency flowing between the boxes: batches of column vectors instead of single rows.
        </p>
      </Section>

      <Section kicker="trade-offs" title="Vectorized, JIT-compiled, or interpreted">
        <Tradeoffs
          options={[
            {
              name: 'Vectorized interpretation (DuckDB, VectorWise, ClickHouse)',
              strengths: [
                'Amortizes interpretation to near-zero without generating machine code',
                'No compilation latency — great for short interactive queries',
                'Simpler engineering: operators are plain loops, portable (even to WASM, as you just saw)',
              ],
              weaknesses: [
                'Batch boundaries cost something: materializing vectors between operators',
                'Complex per-row expressions still walk an expression tree per batch element',
              ],
              chooseWhen: 'analytical scans and aggregates dominate — the OLAP mainstream, and this module’s world.',
            },
            {
              name: 'JIT compilation (HyPer, Umbra, Spark codegen)',
              strengths: [
                'Fuses whole pipelines into bespoke machine code — no batch materialization at all',
                'Wins on complex expressions and tight join pipelines',
              ],
              weaknesses: [
                'Compilation latency taxes short queries (engines mitigate with adaptive/tiered compilation)',
                'A compiler inside a database is a serious complexity and debuggability budget',
              ],
              chooseWhen: 'long-running queries with complex logic amortize compile time — large batch ETL.',
            },
            {
              name: 'Tuple-at-a-time interpretation (classic Postgres executor)',
              strengths: [
                'Dead simple, memory-frugal, battle-tested for 40 years',
                'Perfectly adequate when row counts are small — which OLTP queries are',
              ],
              weaknesses: [
                'Per-row overhead dominates on analytical scans — the X100 finding',
                'Leaves SIMD and cache locality unexploited',
              ],
              chooseWhen: 'the workload is OLTP: an index finds 5 rows and overhead-per-row times five rows is nothing.',
            },
          ]}
          note={
            <>
              Perspective before engine-shopping: execution model explains maybe one order of magnitude, and only when the query is already
              reasonable. A missing filter, a join exploding rows, or a <code>SELECT *</code> over a wide table loses more than vectorization gains.
              The module 2.2 habit — read the <GlossaryTerm k="olap">OLAP</GlossaryTerm> query's EXPLAIN before blaming the engine — outranks every
              trade-off in this table.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: the three-rung showdown">
        <Lab
          lessonId={ID}
          intro={
            <p>
              The finale ties the module together: the same 2M-row aggregation executed by plain Python (interpreted, per-item), pandas (compiled
              loops over columnar arrays — rung two, from lesson 1.3.5), and DuckDB (vectorized, parallel, columnar — everything from 2.3.2 through
              this lesson). You will also read DuckDB's EXPLAIN on your own table.
            </p>
          }
          steps={[
            {
              title: 'Add pandas to warehouse-lab',
              commands: [{ ps: 'cd ~\\warehouse-lab\nuv add pandas' }],
              checkpoint: <>uv reports pandas added.</>,
            },
            {
              title: 'Read the plan for your aggregation',
              body: (
                <>
                  <p>Create <code>explain_agg.py</code>:</p>
                  <CodeBlock
                    label="python — explain_agg.py"
                    code={`import duckdb

con = duckdb.connect("warehouse.duckdb")
plan = con.execute(
    "EXPLAIN SELECT city, avg(amount) FROM orders GROUP BY city"
).fetchall()
for row in plan:
    print(row[1])`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python explain_agg.py' }],
              checkpoint: (
                <>
                  An operator tree prints with <code>HASH_GROUP_BY</code> above a table scan, and the scan lists only <code>city</code> and{' '}
                  <code>amount</code> — projection (2.3.2) visible in the plan.
                </>
              ),
            },
            {
              title: 'Run the showdown',
              body: (
                <>
                  <p>
                    Create <code>showdown.py</code>. To keep the contest fair, the pandas and Python contestants get their data handed to them in
                    memory first — we time only the aggregation:
                  </p>
                  <CodeBlock
                    label="python — showdown.py"
                    code={`import time

import duckdb
import pandas as pd

con = duckdb.connect("warehouse.duckdb")

def timed(label, fn):
    fn()  # warm-up
    t0 = time.perf_counter()
    fn()
    ms = (time.perf_counter() - t0) * 1000
    print(label.ljust(34), str(round(ms, 1)).rjust(9), "ms")
    return ms

# Contestant 1: DuckDB -- vectorized + parallel, straight off storage
def duck_way():
    con.execute("SELECT city, avg(amount) FROM orders GROUP BY city").fetchall()

# Hand the others their data in RAM first (fetch time NOT counted)
df = con.execute("SELECT city, amount FROM orders").df()
rows = list(df.itertuples(index=False, name=None))
assert isinstance(df, pd.DataFrame) and len(rows) == 2_000_000

# Contestant 2: pandas -- compiled loops over columnar arrays, single thread
def pandas_way():
    df.groupby("city")["amount"].mean()

# Contestant 3: plain Python -- interpreted, one row at a time
def python_way():
    sums, counts = {}, {}
    for city, amount in rows:
        sums[city] = sums.get(city, 0.0) + amount
        counts[city] = counts.get(city, 0) + 1
    return {c: sums[c] / counts[c] for c in sums}

duck_ms = timed("DuckDB (vectorized, parallel)", duck_way)
pandas_ms = timed("pandas (columnar, 1 thread)", pandas_way)
python_ms = timed("plain Python (per row)", python_way)

print()
print("python/pandas:", round(python_ms / pandas_ms, 1), "x    ",
      "python/duckdb:", round(python_ms / duck_ms, 1), "x")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python showdown.py' }],
              checkpoint: (
                <>
                  Three timings print, typically DuckDB fastest, pandas within an order of magnitude, plain Python 10-100x behind. Watch Task
                  Manager during a few repeat runs: DuckDB lights up multiple cores; the others hold one.
                </>
              ),
            },
            {
              title: 'Write the why, one sentence per contestant',
              body: (
                <>
                  <p>In your notes, rank the three and give each a one-sentence reason grounded in this module's vocabulary. Then compare:</p>
                  <RevealSolution label="Compare with the model answer">
                    <p>
                      <strong>Plain Python is slowest</strong> because the interpreter pays dispatch and boxing overhead per row — the Volcano
                      problem in its purest form. <strong>pandas is far faster</strong> because the group-by runs in compiled loops over contiguous
                      columnar arrays — interpretation amortized away — but it is single-threaded and materializes intermediates.{' '}
                      <strong>DuckDB wins</strong> because it stacks every lesson in this module: columnar storage (reads only <code>city</code> and{' '}
                      <code>amount</code>), vectorized operators (2048-value typed batches, SIMD-friendly loops), and morsel-driven parallelism
                      across all cores. If your ranking or reasons differ from your measurements — trust the measurements and figure out why; that
                      reflex is the actual skill.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  Your notes hold the three timings, the two ratios, and three one-sentence explanations using the terms interpreted/per-row,
                  compiled/columnar, and vectorized/parallel.
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'In the Volcano model, where does the time actually go on a 100M-row aggregation?',
              options: [
                'Disk seeks — execution models don’t matter',
                'Per-row overhead: a next() call, type dispatch, and branchy interpretation for every row through every operator, dwarfing the arithmetic itself',
                'Query planning',
                'Network round trips between operators',
              ],
              answer: 1,
              explain:
                'The addition takes one instruction; the per-row machinery around it takes dozens to hundreds. Amortizing that machinery over ~2000-value batches is the entire vectorization thesis (MonetDB/X100).',
            },
            {
              q: 'Why do vectorized engines pick batch sizes around 1000-2048 values instead of whole columns?',
              options: [
                'SQL limits result sets to 2048 rows',
                'Batches must fit in CPU cache: big enough to amortize dispatch, small enough that data flowing between operators stays in L1/L2 instead of round-tripping through RAM',
                'Larger batches would overflow 32-bit integers',
                'It matches the default page size of most disks',
              ],
              answer: 1,
              explain:
                'Too small re-imposes interpretation overhead; whole-column (early MonetDB) turns every operator boundary into a memory-bandwidth event. The sweet spot is cache-resident batches.',
            },
            {
              q: 'Your fast vectorized SQL query becomes slow after you add a per-row Python UDF. Why?',
              options: [
                'The UDF invalidates the indexes',
                'Every row must detour through the interpreter — boxing values and paying per-item dispatch — re-imposing exactly the per-row cost vectorization removed',
                'Python UDFs force the query onto one core, which is the whole slowdown',
                'UDFs disable compression',
              ],
              answer: 1,
              explain:
                'It is the generator-fed sum() from this lesson: a vectorized pipeline throttled by a per-item producer. Parallelism loss can hurt too, but the per-row interpretation tax is the structural cost — and it returns in Phase 4 as the Spark UDF problem.',
            },
            {
              q: 'When does the tuple-at-a-time model remain a perfectly good choice?',
              options: [
                'Never — it is obsolete',
                'OLTP-style queries: when an index narrows work to a handful of rows, per-row overhead times five rows is negligible, and simplicity wins',
                'Only for databases smaller than 1 GB',
                'When data is uncompressed',
              ],
              answer: 1,
              explain:
                'Execution overhead matters in proportion to rows processed. Postgres’s executor is not a mistake; it is matched to workloads where row counts are tiny — the module 2.3.1 workload split again.',
            },
            {
              q: 'A colleague wants to migrate a slow dashboard query from Postgres to DuckDB. The EXPLAIN shows a join producing 500M intermediate rows from two 1M-row tables. What do you advise first?',
              options: [
                'Migrate — vectorization will absorb it',
                'Fix the query: a join exploding 500x is a logic problem no execution model rescues; engine choice is the lever you pull after the plan is sane',
                'Add more RAM to Postgres',
                'Rewrite the dashboard in Python',
              ],
              answer: 1,
              explain:
                'Vectorization makes each row cheaper by a constant factor; a broken join multiplies rows by orders of magnitude. Read the plan first (module 2.2), choose engines second — the note under this lesson’s trade-offs.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What does it mean that DuckDB (or ClickHouse) is a "vectorized" engine?',
            a: (
              <p>
                Operators exchange cache-sized batches of column values (~2048 in DuckDB) instead of single rows. Type dispatch and function-call
                overhead are paid once per batch rather than per row, inner loops run over contiguous typed arrays that compilers auto-vectorize
                into SIMD, and filters pass selection vectors instead of copying survivors. Combined with columnar storage feeding data in exactly
                that shape, it converts an interpretation-bound workload into a memory-bandwidth-bound one — the MonetDB/X100 result.
              </p>
            ),
          },
          {
            q: 'Why is a hand-written Python loop so much slower than sum(), and what does that have to do with databases?',
            a: (
              <p>
                The loop pays interpreter dispatch and object boxing per element; sum() resolves types once and runs a compiled loop. That is
                precisely the tuple-at-a-time vs vectorized gap in query engines — same arithmetic, different per-item overhead. The corollary
                interviewers fish for: putting a per-row UDF inside a vectorized engine (or Spark) reintroduces the slow path, so keep logic in the
                engine's native operators when you can.
              </p>
            ),
          },
          {
            q: 'Vectorization vs JIT compilation — how would you compare them?',
            a: (
              <p>
                Both attack interpretation overhead: vectorization amortizes it over batches; JIT (HyPer, Umbra, Spark codegen) eliminates it by
                compiling the pipeline to machine code, fusing operators so no intermediate batches materialize. JIT wins on long complex queries
                but pays compile latency and engineering complexity; vectorization is instant-on and simpler, which suits interactive analytics.
                Production systems increasingly blend them — and neither fixes a query whose plan is wrong.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            Tuple-at-a-time (Volcano) execution pays function-call, dispatch, and branch costs per row — overhead that dwarfs the actual arithmetic
            on analytical scans.
          </>,
          <>
            Vectorized execution moves ~2048-value column batches between operators: dispatch once per batch, tight cache-resident loops, SIMD for
            free from the compiler.
          </>,
          <>
            Columnar storage and vectorized execution are co-designed halves: contiguous column arrays are exactly what the batch loops consume.
            DuckDB's speed is the two multiplied.
          </>,
          <>
            You felt the gap three ways: Python loop vs sum(), 10M rows aggregated in-browser in tens of ms, and the 2M-row showdown where Python,
            pandas, and DuckDB ranked by exactly this theory.
          </>,
          <>
            Per-row escapes — Python UDFs, generator feeds, per-row lambdas — quietly reimpose the slow path; Phase 4 meets this again in Spark.
          </>,
          <>Engine choice buys a constant factor; a sane query plan buys orders of magnitude. EXPLAIN first, benchmark second, migrate third.</>,
        ]}
      />
    </>
  )
}
