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
import { BenchBars } from '../../../viz/BenchBars'

const ID = '3.6.2'

// A target fact table already holding rows 1-4, plus an incoming batch with one
// restated row (id 3) and one brand-new row (id 5).
const INCR = `CREATE OR REPLACE TABLE fct_events AS SELECT * FROM (VALUES
  (1, TIMESTAMP '2026-03-01 08:00', 10),
  (2, TIMESTAMP '2026-03-01 09:30', 20),
  (3, TIMESTAMP '2026-03-01 11:15', 30),
  (4, TIMESTAMP '2026-03-02 07:45', 40)
) AS t(event_id, event_ts, amount);
CREATE OR REPLACE TABLE source_batch AS SELECT * FROM (VALUES
  (3, TIMESTAMP '2026-03-01 11:15', 35),
  (5, TIMESTAMP '2026-03-02 12:00', 50)
) AS t(event_id, event_ts, amount);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Same SELECT, four different bargains with storage and time">
        <p>
          You wrote a model in 3.6.1 and dbt built it — but built it <em>as what</em>? A view that stores nothing and
          recomputes every read? A physical table rebuilt from scratch each run? A table that only appends the new rows?
          The SELECT is identical; the difference is the <GlossaryTerm k="materialization">materialization</GlossaryTerm>{' '}
          — one line of config that decides whether you pay at build time, at read time, or somewhere in between. Choosing
          it well is most of what separates a snappy dbt project from one that takes an hour to run or a dashboard that
          crawls.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Imagine a question you get asked a lot: &quot;what&apos;s our total sales so far?&quot; You could recompute
                the answer from every receipt each time someone asks (cheap to set up, slow every time), or write the running
                total on a whiteboard and update it (a bit of upkeep, instant to read), or only add each new receipt to the
                whiteboard total as it comes in (least work, but you must be careful not to double-count).
              </p>
              <p>
                None is &quot;correct&quot; — they are trades. Recompute-on-ask suits a question nobody asks twice. The
                whiteboard suits a number read all day. Add-only suits a whiteboard so huge that recopying it is wasteful.
                Materializations are exactly these three choices, plus a fourth &quot;don&apos;t write it down at all, just
                inline it into the next calculation.&quot;
              </p>
            </>
          }
          student={
            <>
              <p>
                dbt has four materializations. <strong>view</strong> (the default): dbt creates a database view — no data
                stored, the SELECT re-runs on every query against it. <strong>table</strong>: dbt runs{' '}
                <code>CREATE TABLE AS SELECT</code>, fully rebuilding the physical table each <code>dbt run</code>.{' '}
                <strong>incremental</strong>: on the first run it builds the table; on later runs it processes only new/changed
                rows and merges them in, guarded by <code>is_incremental()</code> and keyed by a <code>unique_key</code>.{' '}
                <strong>ephemeral</strong>: no database object at all — dbt inlines the model as a CTE inside the models that
                ref it.
              </p>
              <p>
                You set it per model (<code>{`{{ config(materialized='table') }}`}</code>) or per folder in{' '}
                <code>dbt_project.yml</code>. The SELECT never changes — you are only telling dbt how to persist the result.
                The rest of this lesson is when to reach for each, and what incremental actually compiles to.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A materialization is itself a dbt macro — a templated recipe for the DDL/DML that wraps your SELECT. A view
                emits <code>CREATE VIEW AS</code>; a table emits <code>CREATE TABLE AS</code> (drop-and-replace, or
                create-then-swap where the adapter supports atomic rename); incremental emits a two-branch template that on
                first build does <code>CREATE TABLE AS</code> and thereafter does a merge/delete+insert of a filtered subset;
                ephemeral emits nothing and is spliced into consumers as a common table expression. You can even write custom
                materializations — they are just macros over the adapter&apos;s relation API.
              </p>
              <p>
                The choice is a classic space-time trade: a view amortizes zero storage but pays full recomputation cost per
                read (and that cost compounds when views stack on views); a table pays storage and full build cost once per run
                to make reads O(scan); incremental trades build cost for state and complexity — it must reason about which rows
                are new, which reintroduces every late-arriving-data hazard from 3.2. Ephemeral trades an object for query
                complexity: fewer relations to manage, but the CTE re-expands into every consumer&apos;s plan.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="view vs table: pay at read time or at build time">
        <p>
          The first and most common decision is <strong>view</strong> versus <strong>table</strong>. A view is a saved query
          — it stores no data, so it is trivially cheap to build and always reflects the latest upstream data, but every read
          re-runs the underlying SELECT. A table is materialized bytes — expensive to build (a full rebuild each run) but fast
          to read. The bars show the build side of that bargain; the read side is the mirror image:
        </p>
        <BenchBars
          title="Cost to build one model per dbt run (relative)"
          betterIs="lower"
          items={[
            { label: 'view', value: 1, unit: 'units', note: 'stores only the query definition — but every READ re-runs the full SELECT' },
            { label: 'incremental', value: 8, unit: 'units', note: 'processes only new/changed rows; reads are fast like a table' },
            { label: 'table', value: 90, unit: 'units', note: 'full CREATE TABLE AS every run; reads are instant' },
          ]}
          caption={
            <>
              Build cost and read cost pull in opposite directions. A <b>view</b> wins on build and loses on read; a{' '}
              <b>table</b> is the reverse; <b>incremental</b> aims for cheap builds <em>and</em> fast reads at the price of
              complexity. For a big model read all day, the table&apos;s one-time build easily beats re-running a view on every
              dashboard load.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                A view is a sticky note that says &quot;the answer is: go recount the jar.&quot; It takes no room and is never
                stale, but you recount every single time. A table is the count written on the note itself — you have to redo
                the count to update it, but reading it is instant. Cheap-to-make-costly-to-read versus costly-to-make-cheap-to-read.
              </p>
              <p>
                So: is this thing read rarely (a view is fine) or read constantly (make it a table)? That one question settles
                most models.
              </p>
            </>
          }
          student={
            <>
              <p>
                Default everything to <strong>view</strong> — it is free to build and never stale, which is exactly right for
                staging models that are thin and read occasionally. Promote to <strong>table</strong> when a model is
                expensive to compute and read often: marts feeding dashboards, anything with heavy joins/aggregations, anything
                other models sit on top of. Materializing it once per run means downstream reads scan stored bytes instead of
                re-executing the whole lineage.
              </p>
              <p>
                The trap with views is <em>stacking</em>: a view on a view on a view means a single query at the top silently
                re-runs the entire chain. Three thin staging views are fine; a deep tower of views feeding a dashboard is a
                performance bug waiting to happen — materialize a table somewhere in the middle to cut the recomputation.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A view adds no persisted state, so it is always consistent with upstream and costs nothing to rebuild — but the
                optimizer must re-plan and re-execute its definition on every reference, and stacked views compose into one
                large logical plan that the engine expands and optimizes as a whole. Modern optimizers can sometimes collapse
                view stacks efficiently, but you are betting on the planner; a materialized table is a guarantee, not a bet.
              </p>
              <p>
                A table converts recurring read cost into a single build cost plus storage, and gives the engine real
                statistics and physical layout (row groups, zone maps — recall columnar/Parquet from Phase 2) to prune against.
                The break-even is roughly: materialize when (reads per run x view-recompute cost) exceeds (build cost + storage
                cost). For a model read hundreds of times a day, that inequality is satisfied immediately.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="incremental: process only the new rows">
        <p>
          For a fact table with hundreds of millions of rows, rebuilding it fully every run (a <code>table</code>) is
          wasteful when only a thin slice of new rows arrived. An <GlossaryTerm k="incremental-model">incremental model</GlossaryTerm>{' '}
          builds the table once, then on each later run processes only the new or changed rows and merges them in, matched on a{' '}
          <code>unique_key</code>. Here is exactly what that merge computes — an existing table plus an incoming batch that has
          one restated row (id 3) and one brand-new row (id 5):
        </p>
        <CodeRunner
          language="sql"
          setup={INCR}
          code={`-- what an incremental (merge / delete+insert on unique_key = event_id) produces:
-- keep existing rows whose id is NOT in the incoming batch, then add every incoming row
SELECT event_id, event_ts, amount FROM fct_events
WHERE event_id NOT IN (SELECT event_id FROM source_batch)
UNION ALL
SELECT event_id, event_ts, amount FROM source_batch
ORDER BY event_id;`}
        />
        <p>
          Row 3&apos;s amount is upserted from 30 to 35, row 5 is inserted, rows 1/2/4 are untouched. Now the other half: how
          does the model know <em>which</em> source rows are new? Inside an incremental model you write an{' '}
          <code>is_incremental()</code> guard that, on incremental runs only, filters the source down to rows newer than what
          is already loaded — the same high-watermark idea from lesson 3.2:
        </p>
        <CodeRunner
          language="sql"
          setup={INCR}
          code={`-- the filter inside the is_incremental() branch:
-- only scan source rows newer than the max timestamp already in the table
SELECT event_id, event_ts, amount
FROM source_batch
WHERE event_ts > (SELECT max(event_ts) FROM fct_events)
ORDER BY event_id;`}
        />
        <Callout kind="warn" title="Notice what the watermark filter MISSED">
          The second query returns only row 5 — the genuinely new-by-time row. Row 3&apos;s <em>restatement</em> (a late
          correction to an old timestamp) slips under the watermark and is skipped. This is the late-arriving-data problem from
          3.2, now living inside your materialization: an append-only incremental silently drops corrections. Handling it means
          widening the window (a lookback), keying on <code>unique_key</code> with a merge strategy, or periodically
          full-refreshing.
        </Callout>
        <Tiered
          layman={
            <>
              <p>
                Incremental is the &quot;only add the new receipts&quot; whiteboard. Every run you ask &quot;what came in since
                last time?&quot; and add just that, instead of recounting the whole pile. Enormously faster on a huge pile — but
                you have to be careful about two things: not adding the same receipt twice, and not missing a receipt that shows
                up late with yesterday&apos;s date on it.
              </p>
              <p>
                That care is the price of the speed. When in doubt, you can always throw away the whiteboard and recount from
                scratch — that is the &quot;full refresh,&quot; your reset button.
              </p>
            </>
          }
          student={
            <>
              <p>
                An incremental model needs two things: a <code>unique_key</code> (so a re-seen key updates in place instead of
                duplicating — that is the idempotency you learned in 3.2) and an <code>is_incremental()</code> block that filters
                the source to just the new window. On the first run (or with <code>--full-refresh</code>){' '}
                <code>is_incremental()</code> is false and dbt builds the whole table; on subsequent runs it is true and only the
                filtered rows flow through the merge.
              </p>
              <p>
                Reach for incremental only when a full-rebuild table is genuinely too slow — big append-mostly fact/event tables.
                It is the most complex materialization and the easiest to get subtly wrong (missed late data, a bad unique_key
                duplicating rows), so the rule is: <em>start with table, move to incremental when the build time forces you to.</em>
              </p>
            </>
          }
          phd={
            <>
              <p>
                The compiled template has two branches. First build: <code>CREATE TABLE fct_events AS (SELECT ... )</code>. On an
                incremental run, dbt materializes the filtered SELECT into a temp relation and applies a strategy: with{' '}
                <code>delete+insert</code> it deletes target rows whose <code>unique_key</code> is present in the temp set, then
                inserts the temp set (the anti-join + union you ran above); with <code>merge</code> (on adapters that support it)
                it issues a single <code>MERGE ... ON unique_key WHEN MATCHED UPDATE WHEN NOT MATCHED INSERT</code>;{' '}
                <code>append</code> skips the delete entirely (correct only when the source window is guaranteed
                non-overlapping). dbt-duckdb defaults to a delete+insert-style upsert when a <code>unique_key</code> is set.
              </p>
              <p>
                Correctness hinges on the interaction between the <code>is_incremental()</code> filter and the merge key. A
                high-watermark filter on <code>event_ts</code> is not idempotent against late data: a row corrected below the
                watermark never re-enters the pipeline. Mitigations trade cost for correctness — a lookback window
                (<code>event_ts &gt; max - interval</code>) reprocesses a trailing slice; a merge on a stable business key makes
                reprocessing idempotent; a scheduled <code>--full-refresh</code> bounds drift. The right answer depends on your
                source&apos;s late-data distribution, which is why 3.2&apos;s watermark discussion is a prerequisite, not a tangent.
              </p>
            </>
          }
        />
        <CodeBlock
          label="models/marts/fct_events.sql — a real incremental model (config + is_incremental guard)"
          code={`{{ config(
    materialized='incremental',
    unique_key='event_id'
) }}

SELECT event_id, event_ts, amount
FROM {{ ref('stg_events') }}

{% if is_incremental() %}
  -- only on incremental runs: filter to rows newer than what we already have
  WHERE event_ts > (SELECT max(event_ts) FROM {{ this }})
{% endif %}`}
        />
      </Section>

      <Section kicker="core concepts" title="ephemeral: a model that never becomes an object">
        <Tiered
          layman={
            <>
              <p>
                Sometimes a step is just a bit of shared arithmetic that two later steps both need — not something worth writing
                on its own whiteboard. Ephemeral is exactly that: you name the calculation so you can reuse it, but dbt never
                gives it a spot in the database. It quietly copies the logic into whoever uses it.
              </p>
              <p>
                Fewer things cluttering the database, at the cost of the logic being pasted into several places behind the scenes.
                Good for small reusable snippets, bad for anything you want to inspect or query on its own.
              </p>
            </>
          }
          student={
            <>
              <p>
                An <GlossaryTerm k="ephemeral-model">ephemeral model</GlossaryTerm> produces no view and no table. When another
                model <code>ref()</code>s it, dbt inlines its SELECT as a CTE at the top of the consumer&apos;s compiled SQL. Use
                it for light, reusable intermediate logic that you want to keep DRY but do not need to query directly — a shared
                filter or a small derived column set used by a couple of marts.
              </p>
              <p>
                The downsides: you cannot <code>SELECT</code> from an ephemeral model in a database console (there is nothing
                there), it cannot be tested at rest, and if many models ref it the same CTE is re-expanded and recomputed in each
                one. When either of those bites, promote it to a view.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Ephemeral models are pure compile-time inlining: dbt lifts the model&apos;s compiled SQL into a leading{' '}
                <code>WITH</code> clause of every consumer, so there is no relation, no statistics, and no reuse of computed
                results across consumers — each consumer re-derives it and the optimizer sees it inline. This reduces relation
                sprawl and permission surface, but defeats result reuse and makes the compiled SQL of consumers larger and harder
                to read.
              </p>
              <p>
                The trade against a view is subtle: a view is one shared object the optimizer can reference (and sometimes cache
                plans for), while ephemeral duplicates logic into each plan. For an intermediate transformation shared by many
                downstream models and expensive to compute, a materialized view or table is usually better than ephemeral despite
                the extra object — ephemeral pays off for cheap, few-consumer, keep-it-tidy cases.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="view, table, or incremental — the core materialization decision">
        <p>
          Ephemeral is a niche tidiness choice; the decision you make on almost every model is these three. It is a bargain
          between build time, read speed, and freshness/complexity:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'view (default)',
              strengths: [
                'Zero build cost and zero storage — dbt just saves the query',
                'Always reflects the latest upstream data; never stale',
                'Perfect for thin staging models read occasionally',
              ],
              weaknesses: [
                'Every read re-runs the SELECT — slow for heavy logic read often',
                'Views stacked on views silently recompute the whole chain per query',
              ],
              chooseWhen: 'the model is cheap to compute and/or read rarely — the sensible default, especially for staging.',
            },
            {
              name: 'table',
              strengths: [
                'Reads are fast — you scan stored bytes, not re-execute lineage',
                'Gives the engine real statistics and physical layout to prune against',
                'Simple and predictable: full rebuild each run, always correct',
              ],
              weaknesses: [
                'Full rebuild every run — build cost grows with the whole dataset',
                'Costs storage; brief window where the table is being rebuilt',
              ],
              chooseWhen: 'a model is expensive to compute and read often — most marts and anything other models sit on.',
            },
            {
              name: 'incremental',
              strengths: [
                'Processes only new/changed rows — cheap builds on huge tables',
                'Fast reads like a table, but without the full-rebuild cost',
              ],
              weaknesses: [
                'The most complex and error-prone: needs a unique_key and an is_incremental filter',
                'Late/updated data can be silently missed; must plan lookback or periodic full-refresh',
              ],
              chooseWhen: 'a table rebuild is genuinely too slow — big append-mostly fact/event tables — and only then.',
            },
          ]}
          note={
            <>
              The progression is a ladder, not a menu: default to <b>view</b>, promote to <b>table</b> when reads justify the
              build, and only climb to <b>incremental</b> when the full rebuild becomes the bottleneck. Every rung up buys speed
              and costs complexity — do not start at the top. When an incremental model drifts, the fix is almost always{' '}
              <code>dbt run --full-refresh</code> to rebuild from scratch.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: switch a model through view, table, and incremental">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Continuing the <code>jaffle_duck</code> project from 3.6.1. You will watch the same model built three ways,
              observe the objects DuckDB creates, and prove that an incremental run only processes the row you add. Run each
              step from <code>C:\de-lab\dbt-lab\jaffle_duck</code>.
            </p>
          }
          steps={[
            {
              title: 'Build stg_orders as a view (the default) and inspect the object',
              body: (
                <>
                  <p>
                    With no config, <code>stg_orders</code> is a view. Build it and ask DuckDB what kind of object it is:
                  </p>
                </>
              ),
              commands: [
                { ps: 'uv run dbt run -s stg_orders' },
                { ps: 'uv run duckdb dev.duckdb "SELECT table_name, table_type FROM information_schema.tables WHERE table_name = \'stg_orders\';"', label: 'what did dbt create?' },
              ],
              checkpoint: (
                <>
                  <code>table_type</code> is <code>VIEW</code>. dbt stored only the query — no data materialized.
                </>
              ),
            },
            {
              title: 'Promote it to a table and see the type change',
              body: (
                <>
                  <p>Add a config block at the top of <code>models/stg_orders.sql</code>:</p>
                  <CodeBlock label="models/stg_orders.sql (add at the very top)" code={`{{ config(materialized='table') }}`} />
                  <p>Rebuild and re-check the object type.</p>
                </>
              ),
              commands: [
                { ps: 'uv run dbt run -s stg_orders' },
                { ps: 'uv run duckdb dev.duckdb "SELECT table_name, table_type FROM information_schema.tables WHERE table_name = \'stg_orders\';"', label: 'same model, new object' },
              ],
              checkpoint: (
                <>
                  <code>table_type</code> is now <code>BASE TABLE</code>. Same SELECT, different materialization — you changed one
                  config line, not the query.
                </>
              ),
            },
            {
              title: 'Build an incremental fact model',
              body: (
                <>
                  <p>
                    Create <code>models/fct_orders_incr.sql</code> — an incremental model keyed on <code>order_id</code>, filtered
                    on incremental runs to newer order dates:
                  </p>
                  <CodeBlock
                    label="models/fct_orders_incr.sql"
                    code={`{{ config(materialized='incremental', unique_key='order_id') }}

SELECT order_id, order_date, customer_id, amount
FROM {{ ref('stg_orders') }}
WHERE status = 'completed'

{% if is_incremental() %}
  AND order_date > (SELECT max(order_date) FROM {{ this }})
{% endif %}`}
                  />
                  <p>Build it once (first run builds the whole table), then count the rows.</p>
                </>
              ),
              commands: [
                { ps: 'uv run dbt run -s fct_orders_incr' },
                { ps: 'uv run duckdb dev.duckdb "SELECT count(*) FROM fct_orders_incr;"' },
              ],
              checkpoint: (
                <>
                  First build succeeds and the count is <strong>4</strong> (the completed orders). dbt&apos;s log for this model
                  shows a plain <code>CREATE TABLE</code>-style build — the <code>is_incremental()</code> branch was skipped
                  because the table did not exist yet.
                </>
              ),
            },
            {
              title: 'Add one new row and prove incremental only processes it',
              body: (
                <>
                  <p>
                    Append a new completed order dated later than any existing one to <code>seeds/raw_orders.csv</code>, re-seed,
                    then run the incremental model again — this time the <code>is_incremental()</code> filter is active.
                  </p>
                  <CodeBlock label="append this line to seeds/raw_orders.csv" code={`6,2026-01-10,dave,75.00,completed`} />
                  <RevealSolution label="What to look for in the run">
                    <p>
                      On this second run, <code>is_incremental()</code> is true, so the compiled SQL includes{' '}
                      <code>AND order_date &gt; (SELECT max(order_date) ...)</code>. Only order 6 (dated 2026-01-10, newer than
                      the previous max of 2026-01-07) passes the filter and is merged in on <code>order_id</code>. Rows 1/2/4/5
                      are not re-read or re-written — that is the whole point of incremental.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                { ps: 'uv run dbt seed\nuv run dbt run -s fct_orders_incr' },
                { ps: 'uv run duckdb dev.duckdb "SELECT count(*) FROM fct_orders_incr;"', label: 'count after incremental run' },
              ],
              checkpoint: (
                <>
                  The count is now <strong>5</strong> — order 6 was appended without rebuilding the other four. Run{' '}
                  <code>uv run dbt run -s fct_orders_incr --full-refresh</code> and the model rebuilds from scratch (the reset
                  button), still landing at 5.
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
              q: 'What is the default materialization in dbt, and what does it store?',
              options: [
                'table — it stores the full result as physical rows',
                'view — it stores only the query definition; the SELECT re-runs on every read',
                'incremental — it stores only new rows',
                'ephemeral — it stores nothing and inlines as a CTE',
              ],
              answer: 1,
              explain: 'The default is view: no data materialized, always fresh, cheap to build, but every read re-executes the underlying SELECT. Cheap build, potentially costly reads.',
            },
            {
              q: 'A mart with heavy joins feeds a dashboard that is queried hundreds of times a day. Best materialization?',
              options: [
                'view — it is never stale',
                'table — pay the build cost once per run so each read scans stored bytes instead of re-executing the joins',
                'ephemeral — inline it everywhere',
                'It does not matter; they perform the same',
              ],
              answer: 1,
              explain: 'Read-heavy + expensive-to-compute is the textbook case for table. A view would re-run the joins on every dashboard load; a table converts that recurring read cost into one build per run.',
            },
            {
              q: 'What two things must an incremental model have to work correctly?',
              options: [
                'A view and a table version',
                'A unique_key (so re-seen keys update instead of duplicate) and an is_incremental() filter (to select only new rows)',
                'A primary key constraint and an index',
                'A snapshot and a seed',
              ],
              answer: 1,
              explain: 'unique_key drives the merge/upsert (idempotency — no duplicates on re-run); is_incremental() gates the WHERE that narrows the source to the new window on incremental runs only.',
            },
            {
              q: 'An incremental model filters source rows with WHERE event_ts > max(event_ts already loaded). A record arrives late with yesterday’s timestamp, correcting an old row. What happens?',
              options: [
                'It is merged in correctly',
                'It is silently skipped — its timestamp is below the watermark, so the filter excludes it',
                'dbt raises an error',
                'The whole table is rebuilt',
              ],
              answer: 1,
              explain: 'A pure high-watermark filter is not late-data-safe: a correction below the watermark never re-enters the pipeline. Fixes are a lookback window, a merge on a stable key, or periodic --full-refresh. This is the 3.2 late-data problem inside a materialization.',
            },
            {
              q: 'An ephemeral model, when another model refs it, becomes...',
              options: [
                'A physical table in the database',
                'A view you can query directly',
                'A CTE inlined into the compiled SQL of each consumer — no database object exists',
                'A seed CSV',
              ],
              answer: 2,
              explain: 'Ephemeral produces no object; dbt splices its SELECT as a CTE into every consumer. You cannot query it directly or test it at rest, and it re-expands in each consumer — good for small DRY logic, not for shared expensive computation.',
            },
            {
              q: 'Your incremental model’s results have drifted from what a full rebuild would produce. The simplest corrective run is...',
              options: [
                'Delete the whole project and re-init',
                'dbt run --full-refresh, which rebuilds the model from scratch, ignoring the is_incremental branch',
                'Switch it to a view',
                'Add more threads',
              ],
              answer: 1,
              explain: '--full-refresh makes is_incremental() false, so dbt does a clean CREATE-TABLE-AS build. It is the reset button for incremental drift; scheduling it periodically also bounds late-data drift.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Walk me through dbt’s materializations and when you’d use each.',
            a: (
              <p>
                <strong>view</strong> (default): stores only the query, free to build, always fresh, but re-runs on every read —
                good for thin staging models. <strong>table</strong>: full rebuild each run, costs storage and build time, but
                reads are fast — good for expensive marts read often. <strong>incremental</strong>: builds once then processes
                only new/changed rows via a <code>unique_key</code> and <code>is_incremental()</code> filter — for big
                append-mostly fact tables where a full rebuild is too slow. <strong>ephemeral</strong>: no object, inlined as a
                CTE — for small reusable logic you want DRY but not queryable. The discipline is a ladder: start at view, promote
                to table when reads justify it, climb to incremental only when build time forces you.
              </p>
            ),
          },
          {
            q: 'What does an incremental model actually compile to, and what’s the main correctness risk?',
            a: (
              <p>
                First run: a <code>CREATE TABLE AS SELECT</code>. Later runs: dbt materializes the <code>is_incremental()</code>-filtered
                SELECT into a temp set and merges it into the target on the <code>unique_key</code> — either a{' '}
                <code>MERGE</code> statement or a delete-matching-keys-then-insert (an anti-join plus union). The main risk is the
                filter missing late or restated data: a high-watermark filter skips corrections that arrive below the watermark,
                so you get silent under-counting. Mitigate with a lookback window, a merge on a stable business key, or scheduled
                full-refreshes — the same late-arriving-data reasoning as incremental ingestion.
              </p>
            ),
          },
          {
            q: 'When would you deliberately NOT use incremental even for a large table?',
            a: (
              <p>
                When the table is not append-mostly — if rows across the whole history change unpredictably, an incremental
                filter cannot cheaply find them and you either reprocess everything anyway or risk missing changes. Also when the
                full-rebuild time is acceptable: incremental adds real complexity (unique_key correctness, late-data handling,
                harder debugging), so if a plain table rebuilds in a tolerable window, keep it a table. Incremental is an
                optimization you earn by hitting a build-time wall, not a default.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A materialization is one config line that decides how dbt persists a model&apos;s SELECT — the SQL is identical; only the storage/timing bargain changes.</>,
          <><strong>view</strong> (default): no data stored, cheap build, always fresh, but every read re-runs the SELECT — and stacked views recompute the whole chain.</>,
          <><strong>table</strong>: full rebuild each run, costs build time and storage, but reads scan stored bytes — the right call for expensive marts read often.</>,
          <><strong>incremental</strong>: builds once then merges only new/changed rows via a <code>unique_key</code> + <code>is_incremental()</code> filter; fast on huge append-mostly tables but the most error-prone, especially around late data.</>,
          <><strong>ephemeral</strong>: no object at all — inlined as a CTE into consumers; good for small DRY logic, not for shared expensive computation.</>,
          <>Climb the ladder view → table → incremental only as performance forces you; when incremental drifts, <code>dbt run --full-refresh</code> rebuilds from scratch.</>,
        ]}
      />
    </>
  )
}
