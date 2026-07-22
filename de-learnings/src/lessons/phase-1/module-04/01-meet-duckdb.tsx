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
import { RowVsColumn3D } from '../../../viz/RowVsColumn3D'

const ID = '1.4.1'

const W = `CREATE OR REPLACE TABLE weather AS SELECT * FROM (VALUES
  ('Chennai', DATE '2026-06-01', 36, 28, 0.0), ('Chennai', DATE '2026-06-02', 37, 29, 0.0), ('Chennai', DATE '2026-06-03', 38, 29, 4.2), ('Chennai', DATE '2026-06-04', 39, 30, 0.0), ('Chennai', DATE '2026-06-05', 35, 28, 12.5),
  ('Berlin', DATE '2026-06-01', 22, 13, 1.2), ('Berlin', DATE '2026-06-02', 24, 14, 0.0), ('Berlin', DATE '2026-06-03', 19, 12, 8.4), ('Berlin', DATE '2026-06-04', 21, 11, 0.6), ('Berlin', DATE '2026-06-05', 25, 15, 0.0),
  ('Seattle', DATE '2026-06-01', 18, 11, 2.5), ('Seattle', DATE '2026-06-02', 17, 10, 6.1), ('Seattle', DATE '2026-06-03', 21, 12, 0.0), ('Seattle', DATE '2026-06-04', 19, 11, 0.3), ('Seattle', DATE '2026-06-05', 16, 9, 9.8),
  ('Reykjavik', DATE '2026-06-01', 12, 6, 3.1), ('Reykjavik', DATE '2026-06-02', 11, 5, 5.6), ('Reykjavik', DATE '2026-06-03', 14, 7, 0.0), ('Reykjavik', DATE '2026-06-04', 10, 4, 7.4), ('Reykjavik', DATE '2026-06-05', 13, 6, 1.0)
) AS t(city, day, temp_max, temp_min, precip_mm);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Half your job will be conducted in SQL">
        <p>
          This is your first SQL query, and it is real: Run starts an actual DuckDB database inside your browser tab and executes it
          against a small weather table. Press Run, then change the <code>5</code> to a <code>3</code> and run again.</p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`SELECT city, day, temp_max
FROM weather
ORDER BY temp_max DESC
LIMIT 5;`}
        />
        <Tiered
          layman={
            <>
              <p>
                Imagine a library with millions of books and a superhumanly fast librarian. You could wander the shelves opening every book
                yourself — or hand the librarian a precise request: &quot;the five hottest days, hottest first&quot;. SQL is the language of
                those precise requests. You describe the answer you want; the librarian does the walking.
              </p>
              <p>
                The librarian here is DuckDB: a tiny, free database engine that needs no server, no account, no setup — which is why it can
                run inside a web page. What you just ran is exactly what professionals send to billion-row systems; only the librarian gets
                bigger, never the language.
              </p>
            </>
          }
          student={
            <>
              <p>
                SQL talks to relational databases: data lives in <strong>tables</strong>, a table is a set of <strong>rows</strong>, every
                row has the same <strong>columns</strong>, each column has a type (text, integer, date, decimal). The query above names a
                table (<code>FROM</code>), picks columns (<code>SELECT</code>), sorts (<code>ORDER BY ... DESC</code>), and caps output
                (<code>LIMIT</code>). That four-clause skeleton answers a shocking fraction of real questions.
              </p>
              <p>
                SQL is <em>declarative</em>: you state <em>what</em> you want, never the loop that scans rows — the engine chooses the
                algorithm. Data engineers live in SQL because pipelines, warehouse models, quality checks, and debugging are conducted in
                it. Python (modules 1.1–1.3) moves data <em>between</em> systems; SQL asks questions <em>inside</em> them.
              </p>
            </>
          }
          phd={
            <>
              <p>
                SQL is a practical skin over relational algebra: selection, projection, join, aggregation as composable operators over
                relations. A query denotes a <em>logical plan</em> (an operator tree describing the result); the optimizer searches for an
                equivalent <em>physical plan</em> (concrete algorithms and orderings) with minimal estimated cost. The same query can become
                a full scan today and an index lookup tomorrow with zero change to your code — that is the point.
              </p>
              <p>
                You can peek at the machinery already: prefix any query with <code>EXPLAIN</code> and DuckDB prints the physical plan it
                chose. Plans get read seriously in lesson 2.2; today it is enough to know the plan exists and you did not write it.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Shaping output: columns, expressions, ORDER BY, LIMIT">
        <Tiered
          layman={
            <>
              <p>
                A table is a spreadsheet with rules: every row has the same columns, and every column holds one kind of thing — a date
                column never contains a temperature. Reading one starts with two words: <em>SELECT</em> (which columns?) and <em>FROM</em>{' '}
                (which table?). You can rename columns on the way out and ask for per-row math, like the gap between the day's high and low.
              </p>
              <p>
                Two more words finish the toolkit: <em>ORDER BY</em> (sort the answer) and <em>LIMIT</em> (only show me so many). Unsorted
                results come back in whatever order was convenient for the engine — if order matters, you must ask for it.
              </p>
            </>
          }
          student={
            <>
              <p>
                Habits from day one: <code>SELECT *</code> is for exploring — production queries name columns so a{' '}
                <GlossaryTerm k="schema">schema</GlossaryTerm> change cannot silently reshape output. <code>AS</code> gives readable
                aliases. The SELECT list takes <em>expressions</em> — arithmetic, function calls — computed per row. Comments are{' '}
                <code>-- line</code> and <code>/* block */</code>; convention is UPPERCASE keywords, lowercase identifiers.
              </p>
              <p>
                Row order without ORDER BY is <em>undefined</em>. Direction is <code>ASC</code> (default) or <code>DESC</code>. And LIMIT is
                career-long etiquette: against a billion-row table, <code>SELECT *</code> with no LIMIT is a stalled screen and a bill.
                Look at a few rows first, always.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Naming columns is <em>projection</em>; computing expressions is extended projection. SQL is written SELECT-first but
                evaluated FROM-first — bind the relation, then project — which explains later confusions such as why a SELECT alias is not
                visible in WHERE. LIMIT plus ORDER BY becomes a top-k operator: a k-row heap instead of a full sort, a first taste of how
                declarative intent unlocks better algorithms.
              </p>
              <p>
                Columns are typed and expressions type-check before execution. <code>temp_max * 9 / 5 + 32</code> works because DuckDB's{' '}
                <code>/</code> yields a double on integer inputs; Postgres integer division truncates. Treat cross-engine numeric
                expressions as portability hazards until proven otherwise.
              </p>
            </>
          }
        />
        <p>The Fahrenheit column does not exist in the table — it is computed per row. Add your own column for the swing in Fahrenheit:</p>
        <CodeRunner
          language="sql"
          setup={W}
          code={`-- expressions and aliases in the SELECT list
SELECT city AS location, day,
       temp_max AS high_c,
       temp_max * 9 / 5 + 32 AS high_f,
       temp_max - temp_min   AS swing_c
FROM weather
LIMIT 8;`}
        />
        <Callout kind="tip" title="Edit everything">
          Every SQL box in this module is editable and re-runnable, and each re-seeds its own table first, so you cannot break anything.
          Misspell a column, delete the LIMIT, flip DESC to ASC, sort by <code>precip_mm</code> instead — error messages and surprises
          are part of the lesson. Curious about the optimizer already? Put <code>EXPLAIN</code> in front of the query above and run it:
          that tree is the physical plan (dissected in lesson 2.2).
        </Callout>
      </Section>

      <Section kicker="core concepts" title="What DuckDB is — and where it sits">
        <Tiered
          layman={
            <>
              <p>
                Most databases are separate programs on a server — you connect over a network, like phoning a restaurant kitchen. DuckDB
                instead lives <em>inside</em> whatever program you are using — this browser tab, a Python script — like a chef in your own
                kitchen. Nothing to install on a server, nothing to administer, nothing to be down.
              </p>
              <p>
                Its specialty is <em>analysis</em>: scanning lots of history for summary answers (&quot;average rainfall per city this
                decade&quot;). Other databases specialize in running apps — thousands of tiny lookups and updates per second. Same language,
                different athletes.
              </p>
            </>
          }
          student={
            <>
              <p>
                DuckDB is an <strong>in-process analytical database</strong>: a library you embed, not a server you run. Place it against
                two databases you will meet constantly: SQLite is in-process too but row-oriented, built for{' '}
                <GlossaryTerm k="oltp">OLTP</GlossaryTerm>-style app storage; Postgres is a client–server row store, the application
                workhorse (Phase 2). DuckDB is in-process <em>and</em> column-oriented, built for <GlossaryTerm k="olap">OLAP</GlossaryTerm>{' '}
                — scans and aggregations over many rows, few columns. Shorthand: &quot;SQLite for analytics&quot;.
              </p>
              <p>
                It reads CSV and Parquet directly, queries pandas DataFrames in place, and stores tables in a single <code>.duckdb</code>{' '}
                file — which is why it powers project P1 (Open-Meteo API to DuckDB) and is your SQL classroom all phase. The
                row-versus-column deep dive is Phase 2; the visual below is the trailer.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Internally DuckDB is a vectorized push-based engine: operators process batches (~2048 values) of columnar data, amortizing
                interpretation overhead and keeping hot loops in cache — a lineage from MonetDB/X100 (Boncz et al., CIDR 2005).{' '}
                <GlossaryTerm k="columnar-storage">Columnar storage</GlossaryTerm> means touching 2 of 12 columns reads roughly a sixth of
                the bytes, and compression works far better within a column of like values.
              </p>
              <p>
                In-process erases the client–server boundary: no network round trips, no result-set serialization — the engine can hand
                your program Arrow buffers directly. The costs: co-tenancy (query and app share one process's memory and faults) and
                single-node scale. Phases 4–5 pick up where one node ends.
              </p>
            </>
          }
        />
        <RowVsColumn3D />
      </Section>

      <Section kicker="trade-offs" title="SQL or pandas? You now own both">
        <p>In lesson 1.3.5 you filtered and aggregated with pandas. DuckDB does the same jobs. This is a real fork you will face weekly:</p>
        <Tradeoffs
          options={[
            {
              name: 'SQL in DuckDB',
              strengths: [
                'Handles larger-than-memory data; the optimizer picks the algorithm',
                'Declarative and portable — the skill transfers to every warehouse',
                'Pushes work to the data instead of dragging data to the work',
              ],
              weaknesses: [
                'Clumsy for iterative step-by-step wrangling and quick plots',
                'Procedural logic (loops, custom functions) fights the language',
              ],
              chooseWhen: 'the operation is filter/join/aggregate-shaped, or the data is big.',
            },
            {
              name: 'pandas',
              strengths: [
                'Interactive: inspect after every step, plot instantly',
                'Whole Python ecosystem in reach (regex, ML, viz)',
              ],
              weaknesses: [
                'Everything must fit in (and be copied around) RAM',
                'You hand-pick the how — no optimizer saves you from a slow approach',
              ],
              chooseWhen: 'data fits comfortably in memory and you are exploring or plotting.',
            },
          ]}
          note={
            <>
              The professional default: heavy filtering and aggregation in the database; application code for what databases are bad at.
              It is not either/or — <code>duckdb.sql()</code> queries a pandas DataFrame in place, so one script can use SQL for the
              heavy lifting and pandas for the last mile. This &quot;push computation to the data&quot; instinct returns all module.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: DuckDB on your machine">
        <Lab
          lessonId={ID}
          intro={
            <p>
              The browser runner is for learning; real pipelines run DuckDB from Python. You will create the <code>sql-lab</code> project
              used by every lab in this module, generate a 120-row weather CSV, load it into a persistent <code>.duckdb</code> file, and
              query it — all in PowerShell.
            </p>
          }
          steps={[
            {
              title: 'Create the sql-lab project',
              body: <p>A fresh uv project outside OneDrive (heavy-data etiquette from lesson 0.1.1):</p>,
              commands: [{ ps: 'mkdir C:\\de-lab -Force; cd C:\\de-lab\nuv init sql-lab; cd sql-lab\nuv add duckdb' }],
              checkpoint: (
                <>
                  <code>uv run python -c "import duckdb; print(duckdb.__version__)"</code> prints a version number.
                </>
              ),
            },
            {
              title: 'Generate the weather CSV',
              body: (
                <>
                  <p>
                    Create <code>make_weather.py</code> with exactly this content — deterministic on purpose, because every later
                    checkpoint in this module depends on these numbers:
                  </p>
                  <CodeBlock
                    label="make_weather.py"
                    code={`import csv
from datetime import date, timedelta
from pathlib import Path

CITIES = [("Chennai", 36, 8, 9, 12.0), ("Berlin", 24, 9, 4, 6.0),
          ("Seattle", 21, 8, 3, 4.5), ("Reykjavik", 13, 6, 2, 3.0)]

rows = []
for name, base, spread, rain_every, rain_mm in CITIES:
    for d in range(30):
        day = date(2026, 6, 1) + timedelta(days=d)
        temp_max = base + (d % 7) - 3
        rainy = d % rain_every == rain_every - 1
        precip = round(rain_mm + (d % 3), 1) if rainy else 0.0
        rows.append([name, day.isoformat(), temp_max, temp_max - spread, precip])

Path("data").mkdir(exist_ok=True)
with open("data/weather.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["city", "day", "temp_max", "temp_min", "precip_mm"])
    w.writerows(rows)

print(f"wrote {len(rows)} rows")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python make_weather.py' }],
              checkpoint: (
                <>
                  Prints <code>wrote 120 rows</code>; <code>data\weather.csv</code> exists (121 lines with the header).
                </>
              ),
            },
            {
              title: 'Load the CSV into a persistent database — twice',
              body: (
                <>
                  <p>
                    Create <code>load_weather.py</code>. <code>duckdb.connect('weather.duckdb')</code> opens (or creates) a database{' '}
                    <em>file</em>; CREATE OR REPLACE makes reloading <GlossaryTerm k="idempotency">idempotent</GlossaryTerm>:
                  </p>
                  <CodeBlock
                    label="load_weather.py"
                    code={`import duckdb

con = duckdb.connect("weather.duckdb")
con.sql("""
    CREATE OR REPLACE TABLE weather AS
    SELECT * FROM read_csv_auto('data/weather.csv')
""")
con.sql("SELECT COUNT(*) AS row_count FROM weather").show()`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python load_weather.py; uv run python load_weather.py' }],
              checkpoint: (
                <>
                  Both runs print <code>row_count</code> = <strong>120</strong> — matching the generator, and proving the reload is
                  idempotent (not 240). An INSERT-based loader would have doubled the data: the classic non-idempotent pipeline bug.
                </>
              ),
            },
            {
              title: 'Query it from Python — and from the DuckDB CLI',
              body: <p>Same file, three clients: browser, Python, CLI. The CLI (project P1 uses it for spot checks) installs via winget:</p>,
              commands: [
                {
                  ps: 'uv run python -c "import duckdb; duckdb.connect(\'weather.duckdb\').sql(\'SELECT city, day, temp_max FROM weather ORDER BY temp_max DESC, day LIMIT 3\').show()"',
                },
                { ps: 'winget install -e --id DuckDB.cli' },
                { ps: 'duckdb weather.duckdb -c "SELECT COUNT(*) AS row_count FROM weather;"', label: 'new terminal' },
              ],
              checkpoint: (
                <>
                  Python prints three rows, all <code>Chennai</code>, all <code>temp_max</code> = <strong>39</strong> (June 7, 14, 21) —
                  the same ORDER BY / LIMIT you ran in the browser. The CLI prints <code>row_count</code> = <strong>120</strong>.
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
              q: 'SQL is called declarative because...',
              options: [
                'you must declare every variable before using it',
                'you state the result you want and the engine chooses the algorithm',
                'queries always run in the order they are written',
                'it cannot contain expressions or computation',
              ],
              answer: 1,
              explain:
                'You never wrote the loop that scanned weather rows — the optimizer picked a physical plan for your logical request. That separation lets the same query run on 20 rows or 20 billion.',
            },
            {
              q: 'Without an ORDER BY clause, the order of returned rows is...',
              options: [
                'insertion order, always',
                'alphabetical by the first column',
                'undefined — whatever execution happened to produce',
                'random, reshuffled on every query by design',
              ],
              answer: 2,
              explain:
                'Engines return rows in whatever order the chosen plan produced them, and plans change. If order matters, say so with ORDER BY — never rely on luck that held during testing.',
            },
            {
              q: 'What makes DuckDB different from Postgres?',
              options: [
                'DuckDB uses a different query language',
                'DuckDB runs in-process inside your program; Postgres is a server you connect to',
                'DuckDB cannot store data in files',
                'Postgres cannot run aggregations',
              ],
              answer: 1,
              explain:
                'Both speak SQL. DuckDB is an embedded library optimized for analytics (OLAP, columnar); Postgres is a client-server row store optimized for applications (OLTP). Phase 2 deepens the comparison.',
            },
            {
              q: 'Re-running load_weather.py left the count at 120 instead of 240 because...',
              options: [
                'DuckDB refuses to insert duplicate rows',
                'CREATE OR REPLACE TABLE rebuilds the table from scratch each run',
                'read_csv_auto skips files it has already seen',
                'the database file was locked by the first run',
              ],
              answer: 1,
              explain:
                'CREATE OR REPLACE drops and rebuilds, so the step is idempotent: run once or ten times, same end state. An INSERT-based loader would double the data every run.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is DuckDB, and when would you reach for it over Postgres?',
            a: (
              <p>
                An in-process analytical (OLAP, columnar, vectorized) database — a library, not a server. Reach for it for local
                analytics, pipeline transform steps, and querying CSV/Parquet directly: zero infrastructure, larger-than-memory capable.
                Postgres wins when many users and apps need concurrent transactional access to shared always-on data. Strong answers name
                both axes: in-process vs client-server, OLAP vs OLTP.
              </p>
            ),
          },
          {
            q: 'When would you aggregate in pandas instead of the database?',
            a: (
              <p>
                When data already sits in memory, is small, and I am iterating — exploring, plotting, reshaping messy columns. The moment
                the operation is a clean filter-join-aggregate over substantial data it belongs in SQL: optimizer, columnar execution, and
                out-of-core processing come free, and less data ships to the application. Bonus: DuckDB queries a DataFrame in place, so
                one script can mix both.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>SQL is declarative: SELECT + FROM + ORDER BY + LIMIT states what you want; the optimizer decides how (EXPLAIN shows its choice).</>,
          <>Row order without ORDER BY is undefined, and LIMIT-first is permanent exploration etiquette.</>,
          <>DuckDB is in-process, columnar, analytical (OLAP) — same SQL as later warehouses, zero setup today; Postgres (client-server, OLTP) arrives in Phase 2.</>,
          <>SQL vs pandas is a weekly decision: push filter/join/aggregate work to the database; keep Python for exploration and glue.</>,
          <>One dataset, three clients in the lab: browser, Python, CLI — and the load stayed idempotent thanks to CREATE OR REPLACE.</>,
        ]}
      />
    </>
  )
}
