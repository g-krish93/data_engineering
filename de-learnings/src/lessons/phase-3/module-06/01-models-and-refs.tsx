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
import { RevealSolution } from '../../../components/RevealSolution'
import { PipelineDAG } from '../../../viz/PipelineDAG'

const ID = '3.6.1'

// Raw inputs, as they would arrive from a source: messy casing, whitespace, string amounts.
const RAW = `CREATE OR REPLACE TABLE raw_orders AS SELECT * FROM (VALUES
  (1, '2026-01-05', 'ALICE', ' 120.00 ', 'completed'),
  (2, '2026-01-05', 'bob',   '80.50',    'completed'),
  (3, '2026-01-06', 'ALICE', '200.00',   'cancelled'),
  (4, '2026-01-06', 'Carol', '50.00',    'completed'),
  (5, '2026-01-07', 'bob',   '30.00',    'completed')
) AS t(order_id, order_date, customer, amount_str, status);`

// The already-cleaned staging tables — what {{ ref('stg_...') }} resolves to at run time.
const STG = `CREATE OR REPLACE TABLE stg_orders AS SELECT * FROM (VALUES
  (1, DATE '2026-01-05', 'alice', 120.00, 'completed'),
  (2, DATE '2026-01-05', 'bob',    80.50, 'completed'),
  (3, DATE '2026-01-06', 'alice', 200.00, 'cancelled'),
  (4, DATE '2026-01-06', 'carol',  50.00, 'completed'),
  (5, DATE '2026-01-07', 'bob',    30.00, 'completed')
) AS t(order_id, order_date, customer_id, amount, status);
CREATE OR REPLACE TABLE stg_customers AS SELECT * FROM (VALUES
  ('alice', 'India'), ('bob', 'USA'), ('carol', 'USA')
) AS t(customer_id, country);`

const DAG_NODES = [
  { id: 'raw_orders', label: 'raw_orders', col: 0, sub: 'seed / source', color: '#fbbf24' },
  { id: 'raw_customers', label: 'raw_customers', col: 0, sub: 'seed / source', color: '#fbbf24' },
  { id: 'stg_orders', label: 'stg_orders', col: 1, sub: 'staging', color: '#22d3ee' },
  { id: 'stg_customers', label: 'stg_customers', col: 1, sub: 'staging', color: '#22d3ee' },
  { id: 'fct_orders', label: 'fct_orders', col: 2, sub: 'mart', color: '#34d399' },
  { id: 'revenue_by_country', label: 'revenue_by_country', col: 3, sub: 'mart', color: '#a78bfa' },
]

const DAG_EDGES: [string, string][] = [
  ['raw_orders', 'stg_orders'],
  ['raw_customers', 'stg_customers'],
  ['stg_orders', 'fct_orders'],
  ['stg_customers', 'fct_orders'],
  ['fct_orders', 'revenue_by_country'],
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The pile of SQL scripts that nobody can safely change">
        <p>
          By now you can write serious SQL — CTEs, windows, star schemas. In a real project that SQL does not stay in
          one file. It sprawls into <code>clean_orders.sql</code>, <code>join_customers.sql</code>,{' '}
          <code>daily_revenue.sql</code>, each run by hand or by a lonely cron line, each depending on the last in an
          order that lives only in someone&apos;s head. Change one column name and you find out what broke by watching
          the next morning&apos;s dashboard go blank. <GlossaryTerm k="dbt">dbt</GlossaryTerm> is the framework that turns
          that pile into a version-controlled, tested, self-ordering graph of transformations — and it does it with the
          SQL you already know.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think of a recipe book where every recipe says &quot;use the sauce from page 12&quot; instead of copying the
                sauce steps again. If you improve the sauce once, every dish that references it gets the better sauce
                automatically, and the book knows you must make the sauce before the dish that needs it. dbt is that
                recipe book for data: each transformation names the ones it depends on, and dbt works out the cooking
                order for you.
              </p>
              <p>
                The alternative — the pile of loose recipe cards with no cross-references — works fine for one cook on
                one night. It falls apart the moment a second cook joins, or you need to redo everything from scratch and
                cannot remember which card comes first.
              </p>
            </>
          }
          student={
            <>
              <p>
                dbt is the <strong>T</strong> in <GlossaryTerm k="elt">ELT</GlossaryTerm>: raw data is already loaded into
                your warehouse (Phase 3.2/3.3 did the E and L), and dbt transforms it <em>in place</em> with SELECT
                statements. Each transformation is a <GlossaryTerm k="dbt-model">model</GlossaryTerm> — one{' '}
                <code>.sql</code> file containing a single SELECT. dbt compiles those files, works out their dependency
                order from the <code>ref()</code> calls inside them, and runs them so that upstream models are built
                before the models that read from them.
              </p>
              <p>
                Nothing here replaces your SQL skill — a model <em>is</em> a SELECT. What dbt adds is the scaffolding
                around it: dependency ordering, version control, tests, documentation, and lineage, all from plain files
                you keep in git. In this module dbt runs on DuckDB via the <code>dbt-duckdb</code> adapter, so everything
                is local and free.
              </p>
            </>
          }
          phd={
            <>
              <p>
                dbt is a compiler and a build tool, not a runtime. It reads your model files, resolves the <code>ref()</code>{' '}
                and <code>source()</code> Jinja macros into fully-qualified relation names, and emits plain SQL into a{' '}
                <code>target/</code> directory. It then submits that SQL to the warehouse in topological order derived from
                the reference graph — a DAG where each edge is a <code>ref()</code>. The database does the compute; dbt
                only orchestrates and templates.
              </p>
              <p>
                The deeper claim is <em>analytics-as-software-engineering</em>: because models are files, they get code
                review, CI, blame history, and a testable contract — properties a notebook or an ad-hoc SQL console
                structurally cannot offer. The lineage graph is a byproduct of the reference macro rather than a
                hand-maintained diagram, which is why it never drifts from reality. We&apos;ll formalize materializations,
                tests, snapshots, and project layout across this module; this lesson establishes the two load-bearing
                ideas: the model and the ref.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="A model is one SELECT in one file">
        <p>
          A dbt model is a file like <code>models/staging/stg_orders.sql</code> whose entire contents is a SELECT. There is
          no <code>CREATE TABLE</code>, no <code>INSERT</code>, no DDL — you describe <em>what the result should be</em>, and
          dbt wraps your SELECT in whatever DDL is needed to persist it (next lesson: exactly which DDL). Here is the SELECT
          inside a staging model that cleans the raw orders — run it against the messy source:
        </p>
        <CodeRunner
          language="sql"
          setup={RAW}
          code={`-- models/staging/stg_orders.sql  (this is the whole model — just a SELECT)
SELECT
  order_id,
  CAST(order_date AS DATE)                 AS order_date,
  LOWER(customer)                          AS customer_id,   -- conform the join key
  CAST(TRIM(amount_str) AS DECIMAL(10,2))  AS amount,        -- '  120.00 ' -> 120.00
  status
FROM raw_orders
ORDER BY order_id;`}
        />
        <Tiered
          layman={
            <>
              <p>
                Each model is a single instruction: &quot;here is the clean version of this thing.&quot; You never tell dbt
                <em> how</em> to store it or <em>when</em> to run it — you only describe the result you want. dbt handles the
                plumbing, the same way you order a dish by name and never explain to the kitchen how to turn on the stove.
              </p>
              <p>
                One file, one clear job. If you want a second cleaned thing, you write a second file. The discipline of
                &quot;one model, one purpose&quot; is what keeps a hundred-model project understandable.
              </p>
            </>
          }
          student={
            <>
              <p>
                The file name becomes the object&apos;s name: <code>stg_orders.sql</code> builds a relation called{' '}
                <code>stg_orders</code>. Because the body is only a SELECT, dbt is free to persist it as a view, a table, or
                an incremental table without you changing the SQL — that decision is the model&apos;s{' '}
                <em>materialization</em> (lesson 3.6.2). The SELECT above does classic staging work: cast types, trim
                whitespace, lower-case the key you&apos;ll join on. Nothing exotic — the point is that this is normal SQL,
                now living in a governed file.
              </p>
              <p>
                Compare it to the raw input: <code>amount</code> arrived as the string <code>&apos; 120.00 &apos;</code> and{' '}
                <code>customer</code> as <code>&apos;ALICE&apos;</code>. The staging model is the single place that mess gets
                fixed, so every downstream model inherits clean, typed data for free.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Constraining a model to a single SELECT is a deliberate design invariant, not a limitation. It makes every
                model a pure function of its inputs: given the same upstream relations, the model is fully determined, which
                is what lets dbt cache, re-run, and reason about the graph. Side-effecting DDL/DML inside a model would break
                that referential transparency and the idempotency guarantees the build system depends on.
              </p>
              <p>
                The SELECT is a Jinja-SQL template: before it reaches the database it is rendered, so <code>ref()</code>,{' '}
                <code>source()</code>, macros, and control flow expand into concrete SQL. The rendered artifact is what runs;
                the template is what you version. That two-phase model — compile then execute — is the entire mechanism, and
                everything else in dbt (tests, docs, snapshots) is another template that compiles to SQL.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="ref() does two jobs at once: name resolution and a DAG edge">
        <p>
          A mart model reads from staging models. You never hard-code the staging table&apos;s name — you write{' '}
          <code>{`{{ ref('stg_orders') }}`}</code>. That single call does two things: at compile time it is replaced by the
          real, fully-qualified name of that model&apos;s relation, and it simultaneously declares an <em>edge</em> in the
          dependency graph — &quot;this model must be built after <code>stg_orders</code>.&quot; Click a node below to see the
          graph that <code>ref()</code> builds:
        </p>
        <PipelineDAG
          nodes={DAG_NODES}
          edges={DAG_EDGES}
          caption={
            <>
              <b>Click a model.</b> Every arrow is one <code>ref()</code> call. dbt reads these edges to compute build order
              (upstream <span style={{ color: '#fbbf24' }}>first</span>) and lineage (what breaks{' '}
              <span style={{ color: '#22d3ee' }}>downstream</span> if a model fails). You draw no graph by hand — it falls out
              of the refs.
            </>
          }
        />
        <p>
          Here is the mart&apos;s SELECT. In the real file the two <code>FROM</code> tables are{' '}
          <code>{`{{ ref('stg_orders') }}`}</code> and <code>{`{{ ref('stg_customers') }}`}</code>; at run time those
          compile to the staging relation names, which is exactly the join you can run now:
        </p>
        <CodeRunner
          language="sql"
          setup={STG}
          code={`-- models/marts/fct_orders.sql
-- FROM {{ ref('stg_orders') }}  ->  compiles to the relation "stg_orders" AND adds a DAG edge
SELECT
  o.order_id,
  o.order_date,
  c.country,
  o.amount
FROM stg_orders   o
JOIN stg_customers c ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
ORDER BY o.order_id;`}
        />
        <Tiered
          layman={
            <>
              <p>
                <code>ref</code> is the &quot;use the sauce from page 12&quot; line. It points at another model by name, so if
                that model ever moves or is rebuilt, your reference still finds it — and the book automatically knows the
                sauce comes first. You get the correct order without ever writing &quot;do this, then this.&quot;
              </p>
              <p>
                That is the whole magic trick. You describe <em>what depends on what</em>, once, in the natural place, and the
                schedule builds itself.
              </p>
            </>
          }
          student={
            <>
              <p>
                Two payoffs from one function. First, <strong>portability</strong>: <code>ref()</code> resolves to the correct
                schema and name per environment (your <code>dev.duckdb</code> here, a prod warehouse later), so you never
                hard-code database.schema.table and the same code runs everywhere. Second, <strong>ordering</strong>: because
                every dependency is a <code>ref()</code>, dbt has a complete DAG and runs models in topological order,
                parallelizing independent branches.
              </p>
              <p>
                The rule that follows: <em>never</em> reference another model by its raw table name — always{' '}
                <code>ref()</code>. A hard-coded name compiles fine but is invisible to the graph, so dbt may build it in the
                wrong order or miss it in lineage. One broken ref is the classic &quot;why did my mart run before its staging
                model?&quot; bug.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>ref()</code> is a Jinja macro that returns a <code>Relation</code> object and, as a side effect during
                parsing, registers a node-to-node dependency in dbt&apos;s manifest. Parsing the whole project yields the full
                DAG before a single query executes; <code>dbt run</code> then does a topological sort and dispatches models,
                running independent subgraphs concurrently up to the thread count. Selection syntax (<code>dbt run -s
                stg_orders+</code>) operates directly on this graph — the <code>+</code> means &quot;and everything
                downstream.&quot;
              </p>
              <p>
                Because the edge is derived from the code rather than declared separately, the graph cannot lie about
                dependencies the way a hand-maintained DAG (an Airflow file, say) can. This is the structural advantage over
                the orchestrators of 3.4/3.5: there, you assert dependencies; here, they are <em>extracted</em> from the
                transformations themselves. dbt still needs an orchestrator to <em>schedule</em> <code>dbt build</code> — but
                the intra-project ordering is dbt&apos;s, and it is always correct by construction.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="ref() is not optional decoration">
          If model B reads model A, it must say <code>{`{{ ref('A') }}`}</code>, not <code>FROM A</code>. The raw name works
          in a one-off query but hides the edge from dbt: no ordering guarantee, no lineage, no downstream selection. Every
          model-to-model dependency goes through <code>ref()</code>; raw inputs go through <code>source()</code> (lesson
          3.6.3).
        </Callout>
      </Section>

      <Section kicker="core concepts" title="dbt-duckdb, compile, and the target/ directory">
        <Tiered
          layman={
            <>
              <p>
                dbt itself does not store data — it hands your SELECTs to a database and lets that database do the work. Here
                the database is DuckDB, a tiny engine that lives in a single file on your laptop. So &quot;run my
                project&quot; means &quot;dbt reads my files, fills in the cross-references, and asks DuckDB to build each
                result in order.&quot;
              </p>
              <p>
                Before it runs anything, dbt writes out the finished, cross-references-filled-in SQL to a folder so you can
                read exactly what it sent to the database. Nothing is hidden; you can always see the real query.
              </p>
            </>
          }
          student={
            <>
              <p>
                An <em>adapter</em> teaches dbt how to talk to a specific database; <code>dbt-duckdb</code> is the adapter for
                DuckDB. You configure it in <code>profiles.yml</code> (connection details — here just the path to a{' '}
                <code>.duckdb</code> file) and describe the project in <code>dbt_project.yml</code>. Running{' '}
                <code>dbt run</code> does two phases: <strong>compile</strong> (render Jinja, resolve refs, write plain SQL to{' '}
                <code>target/compiled/</code>) then <strong>execute</strong> (send that SQL to DuckDB, wrapping each model in
                the DDL its materialization needs).
              </p>
              <p>
                Reading <code>target/compiled/&lt;model&gt;.sql</code> is the single most useful debugging habit in dbt: it
                shows the exact query DuckDB received, with every <code>ref()</code> already expanded. When a model behaves
                oddly, you read its compiled SQL and run it directly — the same skill you have used all through Phase 1.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>dbt-duckdb</code> is unusual among adapters: DuckDB is an in-process OLAP engine, so dbt and the
                warehouse share a process and a file rather than talking over a network to a remote cluster. That collapses
                the usual dev-loop latency to near zero and makes DuckDB the standard local target for learning and CI, while
                the same project can retarget Snowflake/BigQuery/Postgres by swapping the adapter and <code>profiles.yml</code>
                — the models are (mostly) portable SQL.
              </p>
              <p>
                The <code>target/</code> directory is the compiler&apos;s output: <code>manifest.json</code> (the full parsed
                graph and metadata), <code>compiled/</code> (Jinja rendered, refs resolved, not yet wrapped in DDL), and{' '}
                <code>run/</code> (the exact DDL+SQL executed). The manifest is the artifact everything else consumes — docs,
                lineage, state-based selection (<code>--select state:modified+</code> for slim CI), and external catalogs all
                read it. Understanding that dbt&apos;s real output is metadata, not data, is the key to using it well.
              </p>
            </>
          }
        />
        <CodeBlock
          label="profiles.yml — the dbt-duckdb connection (lives in your project or ~/.dbt/)"
          code={`jaffle_duck:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: dev.duckdb      # DuckDB is just a file on disk
      threads: 4`}
        />
        <CodeBlock
          label="dbt_project.yml — project config; default every model to a view for now"
          code={`name: 'jaffle_duck'
profile: 'jaffle_duck'
version: '1.0.0'

models:
  jaffle_duck:
    +materialized: view`}
        />
      </Section>

      <Section kicker="trade-offs" title="dbt, hand-written SQL scripts, or a Python framework?">
        <p>
          dbt is not the only way to transform data in a warehouse, and it is genuine overhead for a truly small job. The
          real decision is how much structure your transformation layer needs:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'dbt (SQL models + ref DAG)',
              strengths: [
                'Dependency order, lineage, and docs fall out of ref() — no hand-maintained DAG',
                'Models are version-controlled files: code review, CI, tests, blame history',
                'Portable SQL across warehouses by swapping the adapter; huge community and packages',
              ],
              weaknesses: [
                'SQL-only for transformations (Python models exist but are limited and adapter-specific)',
                'A real tool to learn and set up — overkill for a handful of queries',
                'Still needs an external scheduler to run dbt on a cadence',
              ],
              chooseWhen: 'you have more than a few interdependent transformations that a team maintains over time — the default for warehouse transformation today.',
            },
            {
              name: 'Hand-written SQL scripts (run by cron / by hand)',
              strengths: [
                'Zero new tooling — just .sql files and a scheduler you already have',
                'Fine for one or two independent queries with no dependency web',
              ],
              weaknesses: [
                'Run order lives in your head or a fragile script; one rename breaks it silently',
                'No built-in tests, lineage, or docs; refactors are terrifying at scale',
              ],
              chooseWhen: 'a tiny, stable set of queries with little interdependence, maintained by one person.',
            },
            {
              name: 'A Python transformation framework (pandas / Spark / custom)',
              strengths: [
                'Full programming language: arbitrary logic, ML, non-SQL sources',
                'Necessary when the transformation genuinely is not expressible in SQL',
              ],
              weaknesses: [
                'You rebuild dependency management, testing, and lineage yourself, or bolt on an orchestrator',
                'Moves compute out of the warehouse (data egress, extra infra) unless using in-warehouse Python',
              ],
              chooseWhen: 'the logic is not SQL-shaped (heavy Python, ML features) or the data is not in a warehouse.',
            },
          ]}
          note={
            <>
              These combine in practice: dbt owns the SQL transformation layer, an orchestrator (Dagster/Airflow from 3.4/3.5)
              triggers <code>dbt build</code>, and a Python job handles the genuinely non-SQL steps upstream. &quot;Use
              dbt&quot; is not &quot;use only dbt&quot; — it is &quot;let dbt own the part it is best at: governed, tested,
              lineage-aware SQL transformation.&quot;
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: your first dbt-duckdb project, from init to a queryable table">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will scaffold a real dbt project on DuckDB, seed a little raw data, write a staging model and a mart that{' '}
              <code>ref()</code>s it, run the graph, and prove a queryable table exists. Work in{' '}
              <code>C:\de-lab\dbt-lab</code>. Everything is local — no cloud, no credentials.
            </p>
          }
          steps={[
            {
              title: 'Install the adapter and initialize a project',
              body: (
                <>
                  <p>
                    Create the folder, make a uv project, add <code>dbt-duckdb</code> (it pulls in dbt-core), then let dbt
                    scaffold the project. When <code>dbt init</code> asks for the adapter, choose <code>duckdb</code>.
                  </p>
                </>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\dbt-lab; cd C:\\de-lab\\dbt-lab\nuv init --bare\nuv add dbt-duckdb',
                  bash: 'mkdir -p ~/de-lab/dbt-lab && cd ~/de-lab/dbt-lab\nuv init --bare\nuv add dbt-duckdb',
                },
                { ps: 'uv run dbt init jaffle_duck', label: 'scaffold — pick the duckdb adapter when prompted' },
              ],
              checkpoint: (
                <>
                  A <code>jaffle_duck/</code> folder appears containing <code>dbt_project.yml</code> and a <code>models/</code>
                  directory. <code>uv run dbt --version</code> prints dbt-core and the <code>duckdb</code> plugin version.
                </>
              ),
            },
            {
              title: 'Point the profile at a DuckDB file',
              body: (
                <>
                  <p>
                    dbt init writes a profile into <code>~/.dbt/profiles.yml</code>. Make sure the <code>jaffle_duck</code>{' '}
                    profile targets a local DuckDB file (edit it to match this exactly):
                  </p>
                  <CodeBlock
                    label="~/.dbt/profiles.yml"
                    code={`jaffle_duck:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: dev.duckdb
      threads: 4`}
                  />
                  <p>
                    From inside <code>C:\de-lab\dbt-lab\jaffle_duck</code>, confirm dbt can reach DuckDB:
                  </p>
                </>
              ),
              commands: [{ ps: 'cd jaffle_duck\nuv run dbt debug' }],
              checkpoint: (
                <>
                  <code>dbt debug</code> ends with <code>All checks passed!</code> — the connection to DuckDB works.
                </>
              ),
            },
            {
              title: 'Seed a little raw data',
              body: (
                <>
                  <p>
                    A <em>seed</em> is a CSV that dbt loads as a table and that models can <code>ref()</code>. Delete dbt&apos;s
                    example models in <code>models/example/</code>, then create <code>seeds/raw_orders.csv</code>:
                  </p>
                  <CodeBlock
                    label="seeds/raw_orders.csv"
                    code={`order_id,order_date,customer,amount_str,status
1,2026-01-05,ALICE, 120.00 ,completed
2,2026-01-05,bob,80.50,completed
3,2026-01-06,ALICE,200.00,cancelled
4,2026-01-06,Carol,50.00,completed
5,2026-01-07,bob,30.00,completed`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run dbt seed' }],
              checkpoint: (
                <>
                  dbt reports <code>1 of 1 OK</code> for <code>raw_orders</code>. A table <code>raw_orders</code> now exists in{' '}
                  <code>dev.duckdb</code>.
                </>
              ),
            },
            {
              title: 'Write a staging model and a mart that refs it',
              body: (
                <>
                  <p>Create two files under <code>models/</code>. First the staging model:</p>
                  <CodeBlock
                    label="models/stg_orders.sql"
                    code={`SELECT
  order_id,
  CAST(order_date AS DATE)                AS order_date,
  LOWER(customer)                         AS customer_id,
  CAST(TRIM(amount_str) AS DECIMAL(10,2)) AS amount,
  status
FROM {{ ref('raw_orders') }}`}
                  />
                  <p>Then a mart that references the staging model — note the <code>ref()</code>, never the raw name:</p>
                  <CodeBlock
                    label="models/fct_completed_orders.sql"
                    code={`SELECT
  order_id,
  order_date,
  customer_id,
  amount
FROM {{ ref('stg_orders') }}
WHERE status = 'completed'`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run dbt run' }],
              checkpoint: (
                <>
                  Both models build <strong>green</strong>: dbt prints <code>2 of 2 OK</code> and — crucially — builds{' '}
                  <code>stg_orders</code> <em>before</em> <code>fct_completed_orders</code>, because the <code>ref()</code>{' '}
                  told it the order. You never specified that order yourself.
                </>
              ),
            },
            {
              title: 'Read the compiled SQL and query the built table',
              body: (
                <>
                  <p>
                    Open the compiled mart to see the <code>ref()</code> resolved to a real relation name, then query the built
                    table straight from DuckDB.
                  </p>
                  <RevealSolution label="What the compiled ref looks like">
                    <p>
                      In <code>target/compiled/jaffle_duck/models/fct_completed_orders.sql</code>, the line{' '}
                      <code>{`FROM {{ ref('stg_orders') }}`}</code> has become something like{' '}
                      <code>FROM &quot;dev&quot;.&quot;main&quot;.&quot;stg_orders&quot;</code> — the Jinja is gone, a concrete
                      relation is in its place. That resolved name is both the SQL DuckDB ran and the DAG edge dbt recorded.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                { ps: 'type target\\compiled\\jaffle_duck\\models\\fct_completed_orders.sql', bash: 'cat target/compiled/jaffle_duck/models/fct_completed_orders.sql', label: 'read the compiled SQL' },
                { ps: 'uv run duckdb dev.duckdb "SELECT count(*) AS n, sum(amount) AS revenue FROM fct_completed_orders;"', label: 'query the built table' },
              ],
              checkpoint: (
                <>
                  The compiled file shows a resolved relation name where the <code>ref()</code> was. The query returns{' '}
                  <code>n = 4</code> and <code>revenue = 280.50</code> — the four completed orders. You have a governed,
                  queryable table built by a self-ordering graph.
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
              q: 'What is a dbt model, physically?',
              options: [
                'A Python class that defines a table schema',
                'A .sql file containing a single SELECT statement',
                'A YAML file listing columns and tests',
                'A stored procedure inside the warehouse',
              ],
              answer: 1,
              explain: 'A model is one .sql file whose whole body is a SELECT. dbt wraps that SELECT in the DDL its materialization needs — you write no CREATE TABLE yourself.',
            },
            {
              q: 'You write FROM stg_orders (the raw table name) instead of FROM {{ ref(\'stg_orders\') }} in a mart. It compiles and runs today. What have you actually lost?',
              options: [
                'Nothing — the two are identical',
                'The DAG edge: dbt no longer knows the mart depends on stg_orders, so ordering and lineage are wrong',
                'The ability to use a WHERE clause',
                'Type safety on the join key',
              ],
              answer: 1,
              explain: 'ref() both resolves the name AND records the dependency. A raw name hides the edge, so dbt may build the mart before its upstream model and the lineage graph is missing that link.',
            },
            {
              q: 'Which two jobs does ref() perform in one call?',
              options: [
                'It runs the query and caches the result',
                'It resolves to the model’s real relation name AND declares a dependency edge in the DAG',
                'It creates the table and grants permissions',
                'It validates the SQL and formats it',
              ],
              answer: 1,
              explain: 'Compile-time name resolution (portable across environments) plus a graph edge (build order and lineage). One function, both effects — that is the core dbt idea.',
            },
            {
              q: 'Where does dbt actually run the compute for a model?',
              options: [
                'Inside dbt’s own process, then it uploads the result',
                'In the target database/warehouse — here DuckDB via the dbt-duckdb adapter',
                'In a separate Spark cluster it launches',
                'In the browser',
              ],
              answer: 1,
              explain: 'dbt is a compiler/orchestrator, not an engine. It compiles Jinja SQL and hands it to the warehouse (DuckDB here) which does the work. That is why the same models can retarget Snowflake or BigQuery.',
            },
            {
              q: 'You run dbt run and a model gives surprising results. What is the single most useful thing to inspect?',
              options: [
                'The dbt source code on GitHub',
                'The compiled SQL in target/compiled/ — the exact query, with refs resolved, that the database ran',
                'The raw CSV in seeds/',
                'The profiles.yml password',
              ],
              answer: 1,
              explain: 'target/compiled/<model>.sql is the rendered query with all Jinja/refs expanded. Reading it (and running it directly) turns a dbt mystery back into a plain SQL debugging problem.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is dbt, and where does it sit in an ELT pipeline?',
            a: (
              <p>
                dbt is a transformation framework: it manages the <strong>T</strong> in ELT. Raw data is already loaded into the
                warehouse; dbt transforms it in place with SELECT statements, one per <em>model</em> file. It compiles those
                models (resolving <code>ref()</code> and <code>source()</code>), builds a dependency DAG from the refs, and runs
                the models in order against the warehouse. It does not move or compute data itself — the warehouse does — and it
                does not schedule itself; an orchestrator triggers <code>dbt build</code>. Its value is analytics-as-software:
                version control, tests, docs, and lineage over your SQL.
              </p>
            ),
          },
          {
            q: 'Explain ref() and why hard-coding a table name instead is a bug.',
            a: (
              <p>
                <code>ref(&apos;model&apos;)</code> compiles to that model&apos;s real, environment-correct relation name and, as
                a side effect, records a dependency edge. So it gives you portability (no hard-coded database.schema.table) and
                correct build order plus lineage. Writing the raw table name compiles and may even run, but the edge is invisible
                to dbt: the graph is incomplete, so dbt can build things out of order, miss the model in downstream selection, and
                show wrong lineage. Every model-to-model reference must go through <code>ref()</code>.
              </p>
            ),
          },
          {
            q: 'How does dbt know what order to run models in?',
            a: (
              <p>
                It does not need to be told. Each <code>ref()</code> inside a model declares an edge, so parsing the project yields
                a complete DAG. dbt topologically sorts that DAG and runs upstream models before downstream ones, running
                independent branches in parallel up to the configured thread count. This is the structural advantage over writing
                an Airflow DAG by hand: dependencies are extracted from the transformation code, so they can&apos;t silently drift
                from what the SQL actually does.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A dbt model is one <code>.sql</code> file containing a single SELECT; dbt wraps it in the DDL its materialization needs, so you describe results, not storage.</>,
          <><code>ref(&apos;other_model&apos;)</code> does two jobs at once: it resolves to the real relation name at compile time <em>and</em> declares a DAG edge — always use it for model-to-model dependencies, never the raw name.</>,
          <>dbt builds a dependency DAG from the refs and runs models in topological order; you never hand-write the run order, and the lineage can&apos;t drift from the code.</>,
          <>dbt compiles (renders Jinja, resolves refs) then executes against the warehouse — here DuckDB via <code>dbt-duckdb</code>. Compute happens in the database; dbt orchestrates.</>,
          <>Read <code>target/compiled/&lt;model&gt;.sql</code> to see the exact query the database ran — the number-one debugging habit in dbt.</>,
          <>dbt earns its overhead when several interdependent transformations are maintained by a team; for one or two stable queries, plain scripts may be enough.</>,
        ]}
      />
    </>
  )
}
