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

const ID = '3.6.3'

// A staging table that violates two constraints on purpose: one NULL email,
// one duplicated customer_id.
const DIRTY = `CREATE OR REPLACE TABLE stg_customers AS SELECT * FROM (VALUES
  ('c1', 'alice@example.com',  'India'),
  ('c2', 'bob@example.com',    'USA'),
  ('c3', NULL,                 'USA'),
  ('c2', 'robert@example.com', 'USA')
) AS t(customer_id, email, country);`

const DAG_NODES = [
  { id: 'src_orders', label: 'jaffle.orders', col: 0, sub: 'source', color: '#fbbf24' },
  { id: 'src_customers', label: 'jaffle.customers', col: 0, sub: 'source', color: '#fbbf24' },
  { id: 'stg_orders', label: 'stg_orders', col: 1, sub: 'staging', color: '#22d3ee' },
  { id: 'stg_customers', label: 'stg_customers', col: 1, sub: 'staging', color: '#22d3ee' },
  { id: 'fct_orders', label: 'fct_orders', col: 2, sub: 'mart', color: '#34d399' },
]

const DAG_EDGES: [string, string][] = [
  ['src_orders', 'stg_orders'],
  ['src_customers', 'stg_customers'],
  ['stg_orders', 'fct_orders'],
  ['stg_customers', 'fct_orders'],
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="A green run does not mean the data is right">
        <p>
          <code>dbt run</code> going green tells you every SELECT <em>executed</em> — not that the data flowing through it is
          trustworthy. A source can start sending NULL keys, a join can silently double rows, an upstream team can add a status
          value your CASE never expected. Nothing errors; the numbers are just quietly wrong. dbt&apos;s answer is to make
          data-quality expectations <em>executable</em>: you declare rules in YAML, and <code>dbt test</code> checks them as a
          gate. Plus, because dbt already knows your whole graph, it can generate documentation and a lineage diagram for free.
        </p>
        <Tiered
          layman={
            <>
              <p>
                A recipe can run to completion and still produce something inedible — you followed every step but the milk was
                sour. &quot;It ran&quot; is not &quot;it&apos;s good.&quot; What you want is a taste-test at each stage: is this
                salty enough, is anything spoiled, before it goes into the next dish. dbt tests are those taste-tests, written
                down once so they run automatically every time.
              </p>
              <p>
                And since the recipe book already knows which dish uses which sauce, it can print a map of the whole kitchen and
                a description of every dish without you drawing it — that is dbt docs.
              </p>
            </>
          }
          student={
            <>
              <p>
                dbt gives you three co-located data-quality and governance features, all declared in YAML next to your models.{' '}
                <strong>Tests</strong> assert conditions on columns or models (unique, not_null, accepted_values, relationships,
                or any custom SQL). <strong>Sources</strong> formally declare your raw inputs so you can <code>ref</code>-style
                reference them, test them, and monitor their freshness. <strong>Docs</strong> compile your descriptions plus the
                ref graph into a browsable site with an interactive lineage diagram.
              </p>
              <p>
                The mental shift: tests turn tribal knowledge (&quot;order_id should be unique, everyone knows that&quot;) into
                an executable contract that fails loudly the day it stops being true. Run them in CI or before publishing marts,
                and bad data stops at the gate instead of reaching a dashboard.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The unifying idea is that a dbt test <em>is a SELECT that returns the violating rows</em>: the test passes iff the
                query returns zero rows. Generic tests (unique, not_null, ...) are parameterized macros that compile to such a
                query per column; singular tests are hand-written <code>.sql</code> files in <code>tests/</code> that are
                expected to return nothing. This collapses &quot;assertion&quot; and &quot;query&quot; into one primitive, so any
                invariant you can express as &quot;rows that should not exist&quot; is testable, and failures are inspectable rows,
                not opaque booleans.
              </p>
              <p>
                Sources add a typed boundary at the edge of the graph: <code>source()</code> nodes are testable and carry
                freshness metadata (<code>loaded_at_field</code> + warn/error thresholds), turning &quot;is the pipeline getting
                fed?&quot; into a checkable SLA. Docs and the manifest close the loop — lineage, column-level descriptions, and{' '}
                <em>exposures</em> (declaring downstream dashboards/ML that depend on models) are all derived from the same parsed
                graph, so documentation is a projection of the code rather than a parallel artifact that rots.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="A test is a SELECT that returns the bad rows">
        <p>
          This is the one idea that makes dbt tests click: <strong>a test passes if and only if its query returns zero rows.</strong>{' '}
          A generic test like <code>not_null</code> compiles to &quot;select the rows where the column IS NULL&quot; — if that
          comes back empty, there are no violations, so the test passes. Run the exact query dbt&apos;s <code>not_null</code>{' '}
          test generates against a table with a planted NULL:
        </p>
        <CodeRunner
          language="sql"
          setup={DIRTY}
          code={`-- dbt's  not_null  test on email compiles to essentially this.
-- PASSES only if it returns 0 rows. Here it returns the offending row -> FAIL.
SELECT *
FROM stg_customers
WHERE email IS NULL;`}
        />
        <p>
          The <code>unique</code> test works the same way — it selects the keys that appear more than once. Again, zero rows
          means pass; any rows are the violations, ready to inspect:
        </p>
        <CodeRunner
          language="sql"
          setup={DIRTY}
          code={`-- dbt's  unique  test on customer_id compiles to essentially this.
-- Returns any key that appears more than once -> those are the violations.
SELECT customer_id, count(*) AS n_rows
FROM stg_customers
GROUP BY customer_id
HAVING count(*) > 1;`}
        />
        <Tiered
          layman={
            <>
              <p>
                Every test is really the question &quot;show me the things that are wrong.&quot; If the answer is &quot;nothing,
                the list is empty,&quot; you pass. If the list has anything on it, those <em>are</em> your problems, named and
                itemized. There is no vague red light — you get the actual bad rows to go look at.
              </p>
              <p>
                That is why dbt tests are so easy to trust: a failing test hands you the exact records that broke the rule.
              </p>
            </>
          }
          student={
            <>
              <p>
                Two flavors. <GlossaryTerm k="schema-test">Generic tests</GlossaryTerm> are reusable, parameterized checks you
                attach to a column in YAML — the built-ins are <code>unique</code>, <code>not_null</code>,{' '}
                <code>accepted_values</code> (the column&apos;s values are within an allowed set), and{' '}
                <code>relationships</code> (every value exists in a parent table — a foreign-key check). One line of YAML each.{' '}
                <GlossaryTerm k="singular-test">Singular tests</GlossaryTerm> are one-off <code>.sql</code> files in{' '}
                <code>tests/</code> that hand-write the &quot;bad rows&quot; query for logic no generic test covers — e.g.
                &quot;no order has a negative amount&quot; or &quot;daily revenue never drops more than 90% day-over-day.&quot;
              </p>
              <p>
                <code>dbt test</code> runs them all and reports pass/fail per test, storing the failing rows so you can query
                them. Because the check is co-located with the model, the contract travels with the code — a reviewer sees the
                model and its guarantees together.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A generic test is a macro returning a query; dbt wraps it as{' '}
                <code>select count(*) from ( &lt;test query&gt; )</code> and fails when the count exceeds a configurable{' '}
                threshold (default 0, but <code>warn_if</code>/<code>error_if</code> and <code>limit</code> let you tune
                severity). The failing-rows set is materialized (with <code>--store-failures</code>) into a table you can
                inspect, which makes tests a debugging aid, not just a gate. Custom generic tests are user-defined macros in{' '}
                <code>tests/generic/</code>, so the vocabulary of assertions is fully extensible.
              </p>
              <p>
                This design has a real limit worth stating: dbt tests run <em>after</em> a model is built, against the warehouse,
                as full-table scans of &quot;bad rows.&quot; They are cheap to write and co-located, but they are not
                distribution checks, not row-level streaming validation, and not schema-contract enforcement at ingest. That
                boundary is precisely where dedicated data-quality frameworks (next section, and module 3.7) pick up — dbt tests
                are the 80% that lives with the transformation, not the whole of data quality.
              </p>
            </>
          }
        />
        <CodeBlock
          label="models/staging/_stg.yml — generic tests declared next to the models"
          code={`version: 2

models:
  - name: stg_customers
    description: "One row per customer, keys conformed."
    columns:
      - name: customer_id
        description: "Surrogate customer key."
        tests:
          - unique
          - not_null
      - name: country
        tests:
          - accepted_values:
              values: ['India', 'USA', 'Germany']

  - name: stg_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: customer_id
        tests:
          - relationships:
              to: ref('stg_customers')
              field: customer_id`}
        />
        <CodeBlock
          label="tests/assert_no_negative_amounts.sql — a singular test (just a bad-rows query)"
          code={`-- Passes if it returns 0 rows. Any row here is a violation.
SELECT order_id, amount
FROM {{ ref('stg_orders') }}
WHERE amount < 0`}
        />
      </Section>

      <Section kicker="core concepts" title="Sources: name the raw inputs, then test and monitor them">
        <p>
          Raw tables loaded by your ingestion layer are not models — dbt did not build them — but you still want to reference
          them safely, test them, and know if they stop being refreshed. That is what a{' '}
          <GlossaryTerm k="dbt-source">source</GlossaryTerm> is: a YAML declaration of a raw table you then reference with{' '}
          <code>{`{{ source('jaffle', 'orders') }}`}</code> instead of a hard-coded name. Sources are the leftmost nodes in the
          lineage graph — click through to see how a data-quality gate at the source protects everything downstream:
        </p>
        <PipelineDAG
          nodes={DAG_NODES}
          edges={DAG_EDGES}
          height={380}
          caption={
            <>
              <b>Click a node.</b> The two <span style={{ color: '#fbbf24' }}>amber</span> nodes are declared <em>sources</em> —
              the raw inputs. Tests on a source catch bad data at the boundary; the <span style={{ color: '#22d3ee' }}>downstream</span>{' '}
              lineage shows exactly what a source failure would poison. This is the graph <code>dbt docs</code> renders for you.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                Sources are the doorway where ingredients arrive from outside your kitchen. You label each crate — &quot;this is
                the orders delivery&quot; — so recipes can say &quot;from the orders delivery&quot; instead of pointing at an
                unlabeled box. And you can put a checker at the door: reject spoiled crates, and raise an alarm if today&apos;s
                delivery never showed up.
              </p>
              <p>
                Catching a bad crate at the door is far cheaper than discovering it after it has been cooked into ten dishes.
              </p>
            </>
          }
          student={
            <>
              <p>
                Declaring sources buys three things. <strong>Referencing</strong>: <code>source()</code> resolves the real
                table name and adds a lineage edge, just like <code>ref()</code> but for raw inputs — so no hard-coded raw table
                names anywhere. <strong>Testing</strong>: you can attach the same generic tests to source columns, catching bad
                data at the boundary before it enters your models. <strong>Freshness</strong>: with a{' '}
                <code>loaded_at_field</code> and thresholds, <code>dbt source freshness</code> checks whether the raw table is
                being updated on schedule and warns or errors if it is stale.
              </p>
              <p>
                Freshness turns &quot;is the pipeline even getting fed?&quot; into a monitored SLA. If the orders source hasn&apos;t
                loaded in 12 hours when it should every hour, freshness fails — you learn the feed broke before your marts serve
                stale numbers.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A source is a graph node with no build step but full participation in lineage, testing, and selection
                (<code>dbt build -s source:jaffle+</code> builds everything downstream of a source). Freshness is computed as{' '}
                <code>now() - max(loaded_at_field)</code> compared against <code>warn_after</code>/<code>error_after</code>{' '}
                intervals, optionally filtered to bound the scan. It is a lightweight, pull-based staleness SLA — distinct from
                true event-time lag, since <code>loaded_at</code> is ingestion time, not event time (the watermark distinction
                from 3.2 again).
              </p>
              <p>
                Sources formalize the contract boundary between the ingestion layer (E/L) and the transformation layer (T). By
                testing at the source you shift data-quality failures left — catching a schema drift or a NULL flood at the edge,
                where the blast radius is one node, rather than deep in the marts where it has already fanned out across the DAG.
                Combined with exposures at the far end, the graph becomes end-to-end auditable: raw feed SLA → tested
                transformations → declared consumers.
              </p>
            </>
          }
        />
        <CodeBlock
          label="models/staging/_sources.yml — declare raw inputs + a freshness SLA"
          code={`version: 2

sources:
  - name: jaffle
    schema: main            # where the raw/seeded tables live
    tables:
      - name: orders
        loaded_at_field: order_date
        freshness:
          warn_after:  { count: 24, period: hour }
          error_after: { count: 48, period: hour }
        columns:
          - name: order_id
            tests: [unique, not_null]
      - name: customers`}
        />
      </Section>

      <Section kicker="core concepts" title="Docs and the lineage graph, for free">
        <Tiered
          layman={
            <>
              <p>
                Because dbt already knows every dish, every sauce, and who uses what, it can print you a full illustrated cookbook
                — descriptions of each item and a map showing how they connect — without anyone drawing it by hand. And because
                it is generated from the real recipes, the map is never out of date.
              </p>
              <p>
                The best documentation is the kind you do not have to remember to update. This is that: it regenerates itself
                from the code every time.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>dbt docs generate</code> compiles your model/column descriptions plus the parsed graph into a static site;{' '}
                <code>dbt docs serve</code> opens it. You get searchable documentation, the compiled SQL of every model, the list
                of tests on each column, and — the headline feature — an interactive <strong>lineage graph</strong> you can click
                through from source to mart. Descriptions live in the same YAML as your tests, so writing a test and documenting a
                column happen in one place.
              </p>
              <p>
                Two extras worth knowing: <em>exposures</em> let you declare downstream consumers (a dashboard, an ML model) as
                nodes so lineage extends past dbt into what actually uses the data; and doc <em>blocks</em> let you write longer
                Markdown once and reference it from many columns.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Docs are a rendering of <code>manifest.json</code> and <code>catalog.json</code> (the latter adds
                warehouse-introspected column types/stats). Nothing is authored twice: descriptions, tests, lineage, and compiled
                SQL are all projections of the parsed graph, which is why dbt docs is the canonical example of documentation that
                cannot silently diverge from the system it describes. Exposures extend the DAG&apos;s reach so impact analysis
                (&quot;what breaks if I change this column?&quot;) spans past the warehouse boundary.
              </p>
              <p>
                The governance payoff is column-level, code-derived lineage usable for impact analysis, onboarding, and audit.
                The limitation is that it is a snapshot generated at build time, not a live catalog with query-usage stats or
                access history — for those you graduate to a dedicated data catalog. dbt docs is the free, always-accurate 80%.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="The gate, not just the report">
          Tests are only worth writing if something fails the build when they fail. Run <code>dbt build</code> (which
          interleaves <code>run</code> and <code>test</code>) in CI, and configure critical tests to <code>error</code>: bad
          data then blocks the merge or the publish, instead of quietly landing in a mart. A test nobody gates on is just a
          comment.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="dbt tests, a dedicated DQ tool, or no tests at all">
        <p>
          dbt&apos;s tests are convenient and co-located, but they are not a full data-quality platform. Knowing where they stop
          is the point:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'dbt built-in tests',
              strengths: [
                'Co-located with the model in YAML — the contract travels with the code, reviewed together',
                'Zero extra infrastructure; a test is just a bad-rows SELECT against the warehouse',
                'Covers the common 80%: unique, not_null, accepted_values, relationships, plus custom SQL',
              ],
              weaknesses: [
                'Run after the model builds — a full-table scan, not row-level or streaming validation',
                'No distribution/anomaly checks, profiling, or rich alerting out of the box',
                'Limited expressiveness for statistical or cross-dataset assertions',
              ],
              chooseWhen: 'you want dependable structural and referential checks living next to your transformations — the default for a dbt project.',
            },
            {
              name: 'A dedicated DQ framework (Great Expectations / Soda)',
              strengths: [
                'Rich checks: distributions, anomalies, profiling, freshness, schema contracts',
                'Works across the stack, not only inside dbt; better alerting and reporting',
              ],
              weaknesses: [
                'Separate tool to run, host, and learn — more moving parts and config',
                'Checks live apart from the models unless you wire them together',
              ],
              chooseWhen: 'you need validation beyond structural rules — statistical checks, ingest-time contracts, org-wide DQ reporting (module 3.7 goes deep here).',
            },
            {
              name: 'No tests',
              strengths: [
                'Nothing to write or maintain; fastest to a first result',
                'Defensible for a genuine throwaway or a one-person exploration',
              ],
              weaknesses: [
                'Every data-quality regression is discovered in production, by a stakeholder, in a dashboard',
                'Refactors are terrifying — nothing tells you if you broke a downstream number',
              ],
              chooseWhen: 'a one-off analysis you will delete tomorrow — essentially never for anything shipped.',
            },
          ]}
          note={
            <>
              These layer rather than compete: dbt tests guard structure and referential integrity right where the SQL lives, and
              a dedicated tool adds statistical and contract checks on top when the stakes justify it. Start with a handful of dbt
              tests on your keys — <code>unique</code> + <code>not_null</code> on every primary key is the cheapest data-quality
              win there is — and reach for a DQ framework (3.7) when &quot;are these rows well-formed?&quot; becomes &quot;is this
              distribution normal?&quot;
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: add sources and tests, then make one fail on purpose">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Still in <code>jaffle_duck</code>. You will declare the seeded tables as sources, add generic tests to your staging
              models, run them all green, then plant a bad row and watch a test fail with the exact violating count. Run from{' '}
              <code>C:\de-lab\dbt-lab\jaffle_duck</code>.
            </p>
          }
          steps={[
            {
              title: 'Declare the raw seed as a source and reference it',
              body: (
                <>
                  <p>Create <code>models/_sources.yml</code>:</p>
                  <CodeBlock
                    label="models/_sources.yml"
                    code={`version: 2
sources:
  - name: jaffle
    schema: main
    tables:
      - name: raw_orders`}
                  />
                  <p>
                    Point <code>stg_orders</code> at the source instead of the seed name — change its <code>FROM</code> to{' '}
                    <code>{`{{ source('jaffle', 'raw_orders') }}`}</code>. Confirm it still builds.
                  </p>
                </>
              ),
              commands: [{ ps: 'uv run dbt run -s stg_orders' }],
              checkpoint: (
                <>
                  <code>stg_orders</code> builds green off the declared source. Its compiled SQL now shows the source table name
                  where <code>source()</code> was, and the source appears as an upstream node in the graph.
                </>
              ),
            },
            {
              title: 'Add generic tests to the staging model',
              body: (
                <>
                  <p>Create <code>models/_stg.yml</code> with tests on the key and a bounded column:</p>
                  <CodeBlock
                    label="models/_stg.yml"
                    code={`version: 2
models:
  - name: stg_orders
    description: "Cleaned orders, one row per order."
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: ['completed', 'cancelled']`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run dbt test -s stg_orders' }],
              checkpoint: (
                <>
                  All three tests <strong>PASS</strong>: dbt prints <code>PASS unique_stg_orders_order_id</code>,{' '}
                  <code>PASS not_null_...</code>, and <code>PASS accepted_values_...</code>. Your model now has an executable
                  contract.
                </>
              ),
            },
            {
              title: 'Break the data and watch a test fail with a row count',
              body: (
                <>
                  <p>
                    Add a row to <code>seeds/raw_orders.csv</code> with a status the <code>accepted_values</code> test does not
                    allow, re-seed, and re-test.
                  </p>
                  <CodeBlock label="append to seeds/raw_orders.csv" code={`7,2026-01-11,erin,90.00,refunded`} />
                  <RevealSolution label="What the failure output tells you">
                    <p>
                      <code>dbt test</code> now reports <code>FAIL 1</code> on{' '}
                      <code>accepted_values_stg_orders_status</code> — the <code>1</code> is the number of violating rows (the
                      single <code>refunded</code> order). dbt prints the path to a query that returns the offending rows; run it
                      to see order 7. The other two tests still pass. A green run, a red test: exactly the point.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                { ps: 'uv run dbt seed\nuv run dbt test -s stg_orders' },
                { ps: 'uv run duckdb dev.duckdb "SELECT order_id, status FROM stg_orders WHERE status NOT IN (\'completed\',\'cancelled\');"', label: 'inspect the violating rows yourself' },
              ],
              checkpoint: (
                <>
                  <code>accepted_values</code> fails with <strong>1</strong> violating row; the manual query returns order 7 with
                  status <code>refunded</code>. Either extend the allowed values or fix upstream — but nothing silently reached a
                  mart.
                </>
              ),
            },
            {
              title: 'Generate and browse the docs + lineage graph',
              body: (
                <p>
                  Build the docs site from the graph dbt already has, then serve it and open the lineage view (the little graph
                  icon, bottom-right). Ctrl-C stops the server.
                </p>
              ),
              commands: [{ ps: 'uv run dbt docs generate\nuv run dbt docs serve' }],
              checkpoint: (
                <>
                  A browser opens to the docs site. You can search <code>stg_orders</code>, read its description and column
                  tests, view its compiled SQL, and open the lineage graph showing{' '}
                  <code>jaffle.raw_orders → stg_orders → fct_completed_orders</code> — all generated from your code, none drawn by
                  hand.
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
              q: 'A dbt test passes when its underlying query returns...',
              options: [
                'exactly one row',
                'zero rows — the query selects the violating rows, so none means no violations',
                'the same rows as the model',
                'a TRUE boolean',
              ],
              answer: 1,
              explain: 'Every dbt test is a "bad rows" SELECT. Zero rows returned = nothing violates the rule = pass. Any rows returned are the violations, which you can inspect directly.',
            },
            {
              q: 'Which built-in test checks that every value in a child column exists in a parent table (a foreign-key check)?',
              options: ['unique', 'not_null', 'accepted_values', 'relationships'],
              answer: 3,
              explain: 'relationships(to, field) is dbt’s referential-integrity test: it returns child rows whose key has no match in the parent, i.e. orphans. unique/not_null/accepted_values are single-column value checks.',
            },
            {
              q: 'What does declaring a table as a source (and using source()) give you that a hard-coded raw table name does not?',
              options: [
                'Faster queries',
                'A lineage edge, the ability to attach tests at the boundary, and freshness monitoring',
                'Automatic incremental loading',
                'A materialized table',
              ],
              answer: 1,
              explain: 'source() behaves like ref() for raw inputs: it resolves the name AND records lineage, and sources can carry tests plus a freshness SLA (loaded_at_field + thresholds) so you catch bad or stale data at the edge.',
            },
            {
              q: 'You wrote unique + not_null tests but only ever run dbt run (never dbt test or dbt build) in CI. What have you actually got?',
              options: [
                'Full protection — the tests run automatically',
                'Tests that never execute — a comment, not a gate; bad data still reaches marts',
                'A syntax error',
                'Automatic freshness checks',
              ],
              answer: 1,
              explain: 'Tests only protect you if something runs and gates on them. dbt run builds models but does not run tests; use dbt build (run + test interleaved) in CI and set severity to error so failures block the pipeline.',
            },
            {
              q: 'A stakeholder needs statistical anomaly detection and ingest-time schema contracts across many systems, not just structural checks in the warehouse. Best fit?',
              options: [
                'More dbt not_null tests',
                'A dedicated DQ framework (Great Expectations / Soda) layered alongside dbt',
                'Turn all models into views',
                'Remove the tests to reduce noise',
              ],
              answer: 1,
              explain: 'dbt tests excel at co-located structural/referential checks but are post-build, warehouse-only, and not distribution-aware. Statistical checks and cross-system contracts are where dedicated DQ tools (module 3.7) take over — they layer on top of dbt, not replace it.',
            },
            {
              q: 'Why is dbt’s generated documentation considered unusually trustworthy compared to a hand-drawn diagram?',
              options: [
                'It is written by a professional technical writer',
                'It is a rendering of the parsed graph (manifest) — lineage, tests, and descriptions are projections of the code, so they cannot silently drift',
                'It updates itself live from production queries',
                'It is stored in a database',
              ],
              answer: 1,
              explain: 'dbt docs/lineage are generated from manifest.json — the same parsed graph dbt runs. Because the diagram is derived from the actual refs and sources, it stays in sync with reality, unlike a diagram maintained separately.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do dbt tests work under the hood, and what are the built-in ones?',
            a: (
              <p>
                A dbt test is a SELECT that returns the rows violating an expectation; the test passes if it returns zero rows. The
                built-in generic tests are <code>unique</code>, <code>not_null</code>, <code>accepted_values</code>, and{' '}
                <code>relationships</code> (foreign-key). You attach them to columns in YAML, so the contract sits next to the
                model. For logic the generics don&apos;t cover, you write a <em>singular</em> test — a <code>.sql</code> file that
                selects the bad rows. <code>dbt test</code> (or <code>dbt build</code>) runs them and, with{' '}
                <code>--store-failures</code>, saves the offending rows for inspection. The gotcha: tests only protect you if you
                actually gate on them in CI with error severity.
              </p>
            ),
          },
          {
            q: 'What are sources in dbt and why declare them?',
            a: (
              <p>
                Sources declare your raw inputs — the tables your ingestion layer loaded that dbt did not build. You then reference
                them with <code>source(&apos;schema&apos;, &apos;table&apos;)</code>, which resolves the real name and adds a
                lineage edge (like <code>ref()</code> for raw data), so no raw names are hard-coded. Sources can carry tests, so you
                validate data at the boundary before it enters your models, and a freshness config (<code>loaded_at_field</code> +
                thresholds) lets <code>dbt source freshness</code> alert when a feed goes stale. Net effect: you shift data-quality
                failures left and turn &quot;is the pipeline being fed?&quot; into a monitored SLA.
              </p>
            ),
          },
          {
            q: 'When do dbt tests stop being enough, and what do you reach for?',
            a: (
              <p>
                dbt tests are post-build, warehouse-only, full-table &quot;bad rows&quot; checks — excellent for structural and
                referential invariants (keys unique/not-null, valid enums, FKs), which is the cheap, high-value 80%. They are not
                built for statistical/distribution anomaly detection, data profiling, ingest-time schema contracts, or org-wide DQ
                reporting. For those you layer a dedicated framework like Great Expectations or Soda on top. Strong answer: &quot;I
                put <code>unique</code>+<code>not_null</code> on every key in dbt from day one, and escalate to a DQ platform when
                the question shifts from &apos;are these rows well-formed?&apos; to &apos;is this distribution normal?&apos;&quot;
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A dbt test is a SELECT that returns the violating rows; it passes iff that query returns zero rows — so failures are inspectable rows, not opaque booleans.</>,
          <>Generic tests (<code>unique</code>, <code>not_null</code>, <code>accepted_values</code>, <code>relationships</code>) are one-line YAML checks on columns; singular tests are hand-written bad-rows <code>.sql</code> files for custom logic.</>,
          <>Sources declare raw inputs so you reference them with <code>source()</code> (name resolution + lineage), test them at the boundary, and monitor <em>freshness</em> as an SLA.</>,
          <>Tests only protect you if you gate on them: run <code>dbt build</code> in CI with critical tests set to <code>error</code>, or a test is just a comment.</>,
          <><code>dbt docs</code> renders searchable documentation and an interactive lineage graph from the parsed manifest — code-derived, so it cannot silently drift from reality.</>,
          <>dbt tests are the co-located structural 80%; statistical, distribution, and contract checks belong to a dedicated DQ framework (module 3.7) layered on top, not instead.</>,
        ]}
      />
    </>
  )
}
