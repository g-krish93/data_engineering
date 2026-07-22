import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeRunner } from '../../../components/CodeRunner'
import { CodeBlock } from '../../../components/CodeBlock'
import { BenchBars } from '../../../viz/BenchBars'

const ID = '1.3.5'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The wrong tool at the wrong size wastes your time or all your RAM">
        <Tiered
          layman={
            <>
              <p>To drill four holes you grab a hand drill: it is in the drawer, it starts instantly, and you are done before a fancier tool warms up. To drill four thousand holes you walk to the workshop and set up the drill press: slower to start, incomparably faster per hole. And for four <em>million</em> holes you do not drill at all — you send the job to a factory built for it.</p>
              <p>Tabular data has the same ladder. Plain Python is the hand drill: always there, fine for small jobs. pandas and polars are workshop machines: they chew through millions of rows at once, but the whole workpiece must fit on the bench (your memory). Databases are the factory — that story starts next module. The engineering skill is not loyalty to one tool; it is knowing the job's size before choosing.</p>
            </>
          }
          student={
            <>
              <p>The DataFrame is a mental-model shift. Lessons 1.3.1-1.3.2 processed data as a <em>stream of row dicts</em> — one record at a time, constant memory. A DataFrame instead holds <strong>named columns over all rows at once</strong>: a table as a first-class object, where operations ("filter rows", "group by city", "average per group") apply to whole columns in one call instead of per-row loops. That buys enormous speed and expressiveness — and costs the streaming property, because the table lives in RAM.</p>
              <p>So the choice is genuinely three-way, and each corner wins somewhere: <strong>stdlib Python</strong> (zero deps, constant memory, per-row control), <strong>pandas</strong> (the lingua franca of data analysis, huge ecosystem), <strong>polars</strong> (a modern multi-threaded engine, often 5-10x faster with a stricter, cleaner API). Your lab benchmarks all three on the same million-row aggregation so the trade-offs stop being folklore and become numbers you measured.</p>
            </>
          }
          phd={
            <>
              <p>Why DataFrames are fast: <strong>vectorization</strong>. A Python loop pays interpreter dispatch and boxing per element; a columnar operation dispatches <em>once</em> into compiled code that sweeps a contiguous typed buffer — cache-friendly, SIMD-amenable, and in polars's case parallelized across cores by a Rust engine. The memory layout is the point: a column of a million float64s is one 8 MB buffer, not a million heap-allocated PyObjects behind pointers. This is the row-to-column pivot from 1.3.2's parallel arrays, industrialized — and it is why a stray string in a numeric column (an "object" dtype) quietly demotes the whole column back to pointer-chasing, with order-of-magnitude consequences.</p>
              <p>Two design axes distinguish the engines. <strong>Eager vs lazy:</strong> pandas executes each statement immediately, materializing intermediates; polars's lazy mode builds a query plan and optimizes it before execution — predicate pushdown, projection pruning — a database optimizer's mindset in a library, and the conceptual bridge to module 1.4. <strong>Memory model:</strong> polars is built on Apache Arrow's <GlossaryTerm k="columnar-storage">columnar</GlossaryTerm> format, the interchange substrate that lets engines (polars, DuckDB, Spark) share tables without copies — Phase 2.3 covers it properly. pandas, born 2008 on NumPy, has been converging: copy-on-write became the default in pandas 3.0, retiring the notorious SettingWithCopyWarning by giving operations value semantics.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="pandas in ten minutes: read, filter, group, aggregate">
        <Tiered
          layman={
            <>
              <p>Using pandas feels like moving from hand-sorting index cards to a spreadsheet with formulas. Load the whole stack into a grid, then talk about columns as a whole: "show me only the rainy days", "for each city, average the temperatures". Each sentence is one line of code, applied to every row at once.</p>
              <p>Two habits matter: check what type each column holds after loading (numbers that secretly loaded as text are the classic trap), and remember the grid must fit in memory — the spreadsheet has no "load just a bit" mode unless you ask for it explicitly.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong><code>pd.read_csv(...)</code></strong> parses straight to typed columns — 1.3.1's manual work in one call, with <code>dtype=</code>, <code>na_values=</code>, <code>parse_dates=</code> to override its guesses. Always inspect <code>df.dtypes</code> after loading: inference is convenient and silently fallible.</li>
                <li><strong>Filter:</strong> <code>df[df['temp_c'] &gt; 20]</code> — the inner expression is a boolean <em>column</em>, used as a row mask. No loop.</li>
                <li><strong>Group and aggregate:</strong> <code>df.groupby('city').agg(avg=('temp_c', 'mean'))</code> — split-apply-combine, 80 percent of analytical work, and exactly what SQL's GROUP BY does (module 1.4 makes the connection explicit).</li>
                <li><strong>Memory reality:</strong> a DataFrame typically needs 2-5x the CSV's on-disk size in RAM (more if strings become object columns). <code>df.info(memory_usage='deep')</code> tells the truth; <code>chunksize=</code> restores streaming when you must.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p><code>groupby</code> mechanically: pandas factorizes the key column to integer codes, then aggregates via hash-based bucketing — the same hash-aggregation physical operator a database would pick. The performance cliff is <code>.apply(python_function)</code>: named aggregations run as compiled kernels over contiguous buffers, while apply drops to a per-group Python call — often 100x slower on the same data. The discipline is staying inside the vectorized vocabulary and treating per-row Python as a last resort; that skill transfers directly to SQL and Spark.</p>
              <p>Dtype economics decide whether "fits in RAM" is true: float64 costs 8 bytes per value, but an object-dtype string column costs a pointer <em>plus</em> a full PyObject per value — routinely 10x the information content. Categorical dtype (dictionary-encoding repeated strings to small integers) shrinks real tables 5-10x, and it is the same trick Parquet and every warehouse use under the name dictionary encoding. When you meet it in Phase 2, you will have already used it here.</p>
            </>
          }
        />
        <p>pandas runs right here in the browser. Fair warning: the first Run downloads the pandas package into the sandbox (roughly 10 MB) — a one-time cost, cached after:</p>
        <CodeRunner
          language="python"
          code={`import io
import pandas as pd

csv_data = '''city,date,temp_c,rain_mm
Berlin,2026-07-01,22.1,0.0
Berlin,2026-07-02,24.3,1.2
Berlin,2026-07-03,19.8,6.4
Chennai,2026-07-01,31.2,2.0
Chennai,2026-07-02,30.7,8.5
Denver,2026-07-01,28.4,0.0
Denver,2026-07-02,26.0,0.3
'''

df = pd.read_csv(io.StringIO(csv_data), parse_dates=['date'])
print(df.dtypes)
print()
print('--- rainy days ---')
print(df[df['rain_mm'] > 0])
print()
print('--- per-city summary ---')
print(df.groupby('city').agg(
    days=('date', 'count'),
    avg_temp=('temp_c', 'mean'),
    total_rain=('rain_mm', 'sum'),
).round(2))`}
        />
        <p>And the dtype trap every data engineer eventually debugs — one stray value poisoning a column:</p>
        <CodeRunner
          language="python"
          code={`import io
import pandas as pd

csv_data = '''id,amount
1,10.5
2,unknown
3,12.0
'''

df = pd.read_csv(io.StringIO(csv_data))
print(df.dtypes)                                  # amount is object/str - not numeric!
print('sum "works":', repr(df['amount'].sum()))   # string concatenation, no error

# The fix: declare the sentinel at parse time
df2 = pd.read_csv(io.StringIO(csv_data), na_values=['unknown'])
print(df2.dtypes)                                 # float64, with a proper NaN
print('real sum  :', df2['amount'].sum())`}
        />
      </Section>

      <Section kicker="core concepts" title="polars, and when plain Python still wins">
        <Tiered
          layman={
            <>
              <p>polars is the newer workshop machine: same idea as pandas — whole-table operations — but built recently, with modern materials, and it uses every core your CPU has instead of one. On big tables it routinely finishes several times sooner. Its instructions read slightly differently (you name the columns you operate on, like reading a recipe aloud), and fewer colleagues have used it, which matters when you ask for help.</p>
              <p>Meanwhile the hand drill keeps its place: when the file is small, when the job is "read a stream, transform each record, write it out", or when installing machinery is not worth it, plain Python from 1.3.1-1.3.2 is simplest and uses almost no memory. Reaching for the big machine to make three holes is its own kind of waste.</p>
            </>
          }
          student={
            <>
              <p>The polars API is expression-based: instead of indexing (<code>df[df['x'] &gt; 0]</code>) you compose named expressions (<code>df.filter(pl.col('x') &gt; 0)</code>), and method chains read as a query plan top to bottom. It is stricter than pandas — no implicit index, no silent type coercion — which mostly means it refuses quietly-wrong operations pandas would perform.</p>
              <p><strong>When plain Python + generators wins instead:</strong></p>
              <ul>
                <li>Streaming transforms of unbounded or larger-than-RAM data — constant memory beats any DataFrame.</li>
                <li>Small data: under a few tens of thousands of rows the import alone can outweigh the compute.</li>
                <li>Zero-dependency contexts: tooling scripts, restricted environments, cold-start-sensitive CLIs.</li>
                <li>Per-record logic with side effects (an API call per row, routing) where vectorization has no leverage.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>polars's lazy mode is the interesting part: <code>pl.scan_csv(...)</code> returns a LazyFrame — an unexecuted logical plan. Chained operations extend the plan; <code>.collect()</code> triggers optimization (predicate pushdown into the scan, projection pruning so unread columns are never parsed, common-subplan elimination) and then parallel, optionally streaming, execution. That is a database optimizer pipeline wearing a library API — and the reason the "just use DuckDB" column below is less a rival than a sibling: next module you express the same plans in SQL and let a full optimizer own them.</p>
              <p>Eager pandas materializes every intermediate: <code>df[mask].groupby(...)</code> allocates the filtered copy before grouping. Copy-on-write (default since pandas 3.0) removes an aliasing bug class — views silently mutating parents — by deferring physical copies until write, but it does not change the architecture: single-threaded eager NumPy kernels versus multi-threaded lazy Arrow compute. On the interchange side, Arrow is what lets polars hand a table to DuckDB — or pandas (via <code>dtype_backend='pyarrow'</code>) — without serialization, dissolving the old "which library owns my data" lock-in.</p>
            </>
          }
        />
        <p>polars is not available in the browser sandbox, so read this against the pandas version above — same analysis, expression style, plus the lazy variant you will benchmark in the lab:</p>
        <CodeBlock
          label="python (runs in the lab)"
          code={`import polars as pl

df = pl.read_csv('weather.csv')                 # eager: reads now

summary = (
    df.filter(pl.col('rain_mm') > 0)
      .group_by('city')
      .agg(
          pl.len().alias('days'),
          pl.col('temp_c').mean().round(2).alias('avg_temp'),
          pl.col('rain_mm').sum().alias('total_rain'),
      )
      .sort('city')
)
print(summary)

# Lazy: build a plan, let the optimizer prune and push down, then execute
lazy_summary = (
    pl.scan_csv('weather.csv')                  # nothing read yet
      .filter(pl.col('temp_c') > 20)
      .group_by('city')
      .agg(pl.col('temp_c').mean())
      .collect()                                # optimize + run happens here
)`}
        />
        <p>And the hand drill, for honest comparison — the 1.3.1 pattern doing the same aggregation in constant memory:</p>
        <CodeRunner
          language="python"
          code={`import csv
import io
from collections import defaultdict

csv_data = '''city,temp_c
Berlin,22.1
Berlin,24.3
Berlin,19.8
Chennai,31.2
Chennai,30.7
Denver,28.4
Denver,26.0
'''

acc = defaultdict(lambda: [0, 0.0])           # city -> [count, total]
for row in csv.DictReader(io.StringIO(csv_data)):
    a = acc[row['city']]
    a[0] += 1
    a[1] += float(row['temp_c'])

for city, (n, total) in sorted(acc.items()):
    print(f'{city:8} n={n}  avg={total / n:.2f}')`}
        />
        <BenchBars
          title="Group-by aggregation over 10M rows — illustrative magnitudes, not benchmarks"
          items={[
            { label: 'plain Python (streaming)', value: 14.2, unit: 's', note: 'single core, row at a time, ~60 MB RAM' },
            { label: 'pandas (eager)', value: 2.1, unit: 's', note: 'vectorized, single-threaded, ~2.4 GB RAM' },
            { label: 'polars (lazy)', value: 0.6, unit: 's', note: 'vectorized, all cores, ~1.1 GB RAM' },
          ]}
          betterIs="lower"
          caption="Illustrative numbers for a typical laptop, to show the shape of the gap — your lab produces your own real ones. Note what the bars hide: plain Python used a fiftieth of the memory. Speed and footprint are separate axes; choose per job."
        />
      </Section>

      <Section kicker="trade-offs" title="The table: pandas vs polars vs stdlib vs just-use-SQL">
        <Tradeoffs
          options={[
            {
              name: 'stdlib Python',
              strengths: [
                'Zero dependencies; constant-memory streaming of any size',
                'Total per-record control; trivially debuggable',
              ],
              weaknesses: [
                'Slowest per row by 10-100x on bulk numeric work',
                'Split-apply-combine and joins are manual, verbose, error-prone',
              ],
              chooseWhen: 'streaming transforms, small data, zero-dep tools, per-record side effects.',
            },
            {
              name: 'pandas',
              strengths: [
                'The ecosystem: every tutorial, plotting library, and ML tool speaks it',
                'Fast enough for most in-RAM work; unmatched breadth of I/O and methods',
              ],
              weaknesses: [
                'Single-threaded, eager, memory-hungry (2-5x data size, more with object columns)',
                'API accreted over 18 years: many ways to do everything',
              ],
              chooseWhen: 'interactive analysis, and anywhere ecosystem compatibility beats raw speed.',
            },
            {
              name: 'polars',
              strengths: [
                'Multi-threaded Rust engine, lazy optimization: typically 5-10x pandas on aggregations',
                'Strict, consistent expression API; Arrow-native interchange',
              ],
              weaknesses: [
                'Smaller ecosystem and community; some libraries still want pandas objects',
                'Lazy evaluation adds a concept to learn and a step to debug',
              ],
              chooseWhen: 'performance-sensitive pipeline transforms in Python on data that fits one machine.',
            },
            {
              name: 'DuckDB SQL',
              strengths: [
                'Full query optimizer; SQL is the portable language of every warehouse',
                'Queries CSV/Parquet in place, including larger-than-RAM, out of the box',
              ],
              weaknesses: [
                'Leaves Python: less natural for per-record logic and imperative steps',
                'You have not learned it yet — that is literally the next module',
              ],
              chooseWhen: 'the transform is relational (filter/join/aggregate) — increasingly the default answer.',
            },
          ]}
          note={<>Watch the convergence: polars-lazy thinks like a database, DuckDB queries DataFrames, and Arrow lets all of them share memory without copies. The boundaries are dissolving — which is exactly why module 1.4 teaches SQL next: the one language all these engines speak. P1 will use stdlib for ingestion (streaming, explicit) and DuckDB for analysis, with DataFrames as the exploratory middle.</>}
        />
      </Section>

      <Section kicker="hands-on" title="Lab: one aggregation, three engines, your numbers">
        <Lab
          lessonId={ID}
          intro={<p>Generate a million-row CSV, run the identical group-by-average three ways — stdlib accumulator, pandas, polars — timed with <code>time.perf_counter</code>, and record the numbers. From now on, when someone claims a tool is faster, your reflex should be: at what size, and says whose benchmark?</p>}
          steps={[
            {
              title: 'Project setup',
              commands: [{ ps: `mkdir C:\\de-lab\\m13-frames; cd C:\\de-lab\\m13-frames
uv init
uv add pandas polars
uv run python -c "import pandas, polars; print('pandas', pandas.__version__, '| polars', polars.__version__)"` }],
              checkpoint: <>Both versions print on one line. Note the install took noticeably longer than <code>requests</code> did — compiled DataFrame engines are heavyweight dependencies, which is itself a data point for the trade-offs table.</>,
            },
            {
              title: 'Generate a million rows',
              commands: [{ ps: `@'
import csv
import random

rng = random.Random(13)
cities = ['austin', 'berlin', 'chennai', 'denver', 'espoo']
with open('data.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(['city', 'day', 'temp_c'])
    for i in range(1_000_000):
        w.writerow([rng.choice(cities), i % 365, round(rng.gauss(15, 8), 2)])
print('wrote data.csv')
'@ | Set-Content -Encoding utf8 gen_data.py
uv run python gen_data.py
"{0:N1} MB" -f ((Get-Item data.csv).Length / 1MB)` }],
              checkpoint: <><code>wrote data.csv</code> prints and the file size is roughly 18-20 MB. The seeded RNG means everyone doing this lab generates identical data — reproducibility, as always.</>,
            },
            {
              title: 'The three-way benchmark',
              body: <p>One script, three implementations of "average temperature per city", each timed. Read it before running — the three functions are this whole lesson in twenty lines:</p>,
              commands: [{ ps: `@'
import csv
import time
from collections import defaultdict

import pandas as pd
import polars as pl

PATH = 'data.csv'

def with_stdlib():
    acc = defaultdict(lambda: [0, 0.0])
    with open(PATH, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            a = acc[row['city']]
            a[0] += 1
            a[1] += float(row['temp_c'])
    return {c: round(t / n, 3) for c, (n, t) in sorted(acc.items())}

def with_pandas():
    df = pd.read_csv(PATH)
    return df.groupby('city')['temp_c'].mean().round(3).to_dict()

def with_polars():
    out = (pl.scan_csv(PATH)
             .group_by('city')
             .agg(pl.col('temp_c').mean().round(3))
             .sort('city')
             .collect())
    return dict(zip(out['city'].to_list(), out['temp_c'].to_list()))

for label, fn in [('stdlib', with_stdlib), ('pandas', with_pandas), ('polars', with_polars)]:
    t0 = time.perf_counter()
    result = fn()
    elapsed = time.perf_counter() - t0
    print(f'{label:8} {elapsed:7.3f}s  {result}')
'@ | Set-Content -Encoding utf8 bench.py
uv run python bench.py` }],
              checkpoint: <>Three lines print, and all three result dicts are <em>identical</em> (same five cities, same means to three decimals) — same computation, so any disagreement means a bug. Typical shape: stdlib slowest by 5-20x, polars fastest. Record the three timings in your notes as a table: engine, seconds, ratio vs fastest.</>,
            },
            {
              title: 'Push the size and watch the ratios move',
              body: <p>Edit <code>gen_data.py</code> to 5,000,000 rows, regenerate, rerun the benchmark. Then restore 1,000,000 (or delete <code>data.csv</code>) so 90 MB is not sitting around:</p>,
              commands: [{ ps: 'uv run python gen_data.py\nuv run python bench.py' }],
              checkpoint: <>The gap <em>widens</em> at 5M rows: fixed costs (imports, parse setup) amortize away and per-row costs dominate, so vectorized engines pull further ahead — while stdlib's memory stays flat and the DataFrames' grows 5x. Add the second row to your notes table. That size-dependent crossover is the actual lesson.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'What is the fundamental structural difference between a DataFrame and the row-dict streaming of earlier lessons?',
              options: [
                'DataFrames are sorted; row streams are not',
                'A DataFrame holds named, typed columns for all rows in memory, enabling whole-column operations; a row stream holds one record at a time',
                'DataFrames can only hold numbers',
                'Row streams cannot compute aggregates',
              ],
              answer: 1,
              explain:
                'Columns-in-RAM is both the superpower (vectorized whole-column operations, no Python loop) and the constraint (the table must fit in memory). Row streams invert the trade: constant memory, per-row interpreted work. Neither is better — they win at different sizes and shapes.',
            },
            {
              q: 'pd.read_csv loads an amount column and df.dtypes shows object. What happened and why does it matter?',
              options: [
                'The column is fine — object means generic number',
                'Some value (like "unknown") was not parseable as a number, so every value became a string; aggregations now concatenate or crash, at pointer-chasing speed',
                'The CSV had a BOM',
                'pandas always loads decimals as object',
              ],
              answer: 1,
              explain:
                "One unparseable value demotes the whole column from a packed float64 buffer to per-element PyObjects. sum() then does string concatenation without erroring — silent wrongness, the worst kind. Fix at parse time: na_values, or dtype= to make the file's sins loud.",
            },
            {
              q: 'What does polars lazy mode (scan_csv ... collect) do that eager execution cannot?',
              options: [
                'It reads files over the network',
                'It sees the whole query before running it, so it can push filters into the scan, skip unused columns, and parallelize an optimized plan',
                'It caches results between runs automatically',
                'It compresses the CSV first',
              ],
              answer: 1,
              explain:
                'Eager code executes line by line, materializing every intermediate — the engine never learns what you will do next. A lazy plan is optimized whole: predicate pushdown, projection pruning, streaming execution. A database optimizer inside a library, and the bridge to SQL in module 1.4.',
            },
            {
              q: 'A nightly job must transform a 40 GB JSONL feed on a 16 GB box. Which approach fits?',
              options: [
                'pandas with a bigger swap file',
                'polars read_csv, since it is faster',
                'Streaming with stdlib generators (or lazy/streaming engines) — constant memory beats in-RAM tables that cannot fit',
                'Load it as 40 one-GB DataFrames simultaneously',
              ],
              answer: 2,
              explain:
                'No eager DataFrame fits 40 GB in 16 GB. The 1.1.4/1.3.2 generator pipeline processes it in constant memory; polars streaming or DuckDB can too. The reflex to build: check data size against RAM before choosing the tool, not after the OOM kill.',
            },
            {
              q: 'Your benchmark shows polars beating stdlib by 8x on 1M rows, but stdlib winning on 5,000 rows. Why?',
              options: [
                'polars has a bug with small data',
                'Fixed costs — imports, engine startup, parse setup — dominate small jobs; per-row throughput only wins once row counts amortize the overhead',
                'Small CSVs cannot be vectorized',
                'The OS caches small files differently',
              ],
              answer: 1,
              explain:
                'Every tool has a floor cost and a slope. Vectorized engines buy a shallow slope with a higher floor; plain Python is the reverse. The crossover is why "which is faster" has no answer without a size — and why your lab recorded numbers at two sizes.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'pandas or polars for a new pipeline — how do you decide?',
            a: <p>Decide on constraints, not fashion: data size vs RAM (either fits? neither? then streaming or DuckDB), performance sensitivity (polars's multi-threaded lazy engine wins big aggregations), and ecosystem coupling (plotting/ML libraries and most teammates speak pandas). A strong answer adds the escape hatch — Arrow interchange means the choice is no longer lock-in: polars for the heavy transform, zero-copy handoff to pandas at the edge that needs it — and names the honest default: for relational transforms, SQL on DuckDB is increasingly the right tool.</p>,
          },
          {
            q: 'Why is a vectorized operation 10-100x faster than the equivalent Python loop?',
            a: <p>The loop pays per element: interpreter dispatch, boxing each value as a PyObject, pointer chasing through the heap. The vectorized call pays once, then runs compiled code over a contiguous typed buffer — sequential access the CPU prefetches, SIMD applying one instruction to multiple values, no interpreter in the hot path. Bonus points for the corollary: an object-dtype column forfeits all of this, which is why one stray string in a numeric column is a performance bug, not just a type wart.</p>,
          },
          {
            q: 'When would you refuse a DataFrame library entirely?',
            a: <p>When the job is streaming-shaped: unbounded or larger-than-RAM input, transform-and-forward logic, per-record side effects — a generator pipeline does it in constant memory with zero dependencies. Also in cold-start-sensitive or restricted environments where a hundred-megabyte compiled dependency is unjustifiable. The interview point is sizing the tool to the job — including small jobs, where stdlib's floor cost beats the engines' — rather than defaulting to the biggest machine you know.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A DataFrame is named, typed columns in RAM: whole-column operations replace loops — at the price of the streaming property.</>,
          <>The pandas core is read_csv, boolean-mask filtering, and groupby-agg — split-apply-combine, the same shape as SQL's GROUP BY.</>,
          <>Watch <code>df.dtypes</code> like a hawk: one unparseable value makes an object column, which is silently slow and silently wrong.</>,
          <>polars trades ecosystem for speed: multi-threaded, Arrow-native, lazy — an optimizer inside a library, previewing how databases think.</>,
          <>Plain Python still wins streaming, small-data, and zero-dependency jobs; you benchmarked the crossover yourself, at two sizes.</>,
          <>The engines are converging on Arrow columnar memory, and SQL is the language they all speak — which is where module 1.4 picks up.</>,
        ]}
      />
    </>
  )
}
