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
import { WatermarkTimeline } from '../../../viz/WatermarkTimeline'

const ID = '3.6.4'

// Current dimension state + a fresh source read where one customer's tier changed.
const SCD = `CREATE OR REPLACE TABLE dim_customers AS SELECT * FROM (VALUES
  (1, 'alice', 'Bronze', DATE '2026-01-01', DATE '9999-12-31', TRUE),
  (2, 'bob',   'Silver', DATE '2026-01-01', DATE '9999-12-31', TRUE)
) AS t(customer_id, name, tier, valid_from, valid_to, is_current);
CREATE OR REPLACE TABLE source_now AS SELECT * FROM (VALUES
  (1, 'alice', 'Gold'),
  (2, 'bob',   'Silver')
) AS t(customer_id, name, tier);`

// Each sweep = one snapshot run; a red point is a change that happened and
// reverted between two runs, so the snapshot never recorded it.
const SNAP_EVENTS = [
  { t: 0.12, label: 'run 1' },
  { t: 0.32 },
  { t: 0.46, late: true, label: 'missed' },
  { t: 0.55, label: 'run 2' },
  { t: 0.74 },
  { t: 0.9, label: 'run 3' },
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The source only remembers 'now' — but you need 'back then'">
        <p>
          In lesson 2.4.3 you built a Slowly Changing Dimension Type 2 by hand: when a customer&apos;s tier changed, you expired
          the old row and inserted a new version, so a fact could always join to the attribute value that was true{' '}
          <em>at the time of the event</em>. The problem is that most source systems overwrite in place — the operational
          database only knows a customer&apos;s tier is <em>Gold</em> today; it has forgotten it was <em>Bronze</em> last
          quarter. If you do not capture that change when it happens, the history is gone forever. dbt{' '}
          <GlossaryTerm k="dbt-snapshot">snapshots</GlossaryTerm> automate exactly the 2.4.3 pattern: run one repeatedly and it
          builds and maintains SCD2 history for you.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Your address book only shows where a friend lives <em>now</em>. Overwrite it when they move and you lose the fact
                that birthday cards you sent last year went to the old place. If you want to answer &quot;where did they live
                when I sent that card?&quot;, you must write down each address <em>with the dates it was valid</em>, not just the
                latest one.
              </p>
              <p>
                A snapshot is a diary that checks your friends&apos; details every so often and, whenever one changes, stamps the
                old entry with an end date and starts a new one. Run it regularly and you accumulate a full history from a source
                that only ever shows the present.
              </p>
            </>
          }
          student={
            <>
              <p>
                A snapshot is a special dbt build that captures the state of a source table each time it runs and records changes
                as SCD2 history. On the first run it stores every current row with an open validity window. On later runs it
                compares the live source to what it has stored: unchanged rows are left alone, but for a row whose tracked columns
                changed, it <em>closes</em> the existing version (sets its end timestamp, marks it not-current) and{' '}
                <em>inserts</em> a new version with a fresh start timestamp — precisely the expire-and-insert you wrote manually in
                2.4.3.
              </p>
              <p>
                dbt manages three bookkeeping columns for you: <code>dbt_valid_from</code>, <code>dbt_valid_to</code> (NULL for
                the current version), and <code>dbt_scd_id</code> (a surrogate key per version). Snapshots live in a{' '}
                <code>snapshots/</code> directory and run with <code>dbt snapshot</code>. The catch that shapes everything: they
                only capture what they can see <em>at run time</em>, so history granularity equals your run cadence.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A snapshot is dbt&apos;s built-in Type-2 <GlossaryTerm k="scd2">SCD2</GlossaryTerm> materialization: an
                idempotent, incremental merge that diffs the source against the stored history and applies the SCD2 transition.
                Its correctness rests on running <em>at the source</em>, before any transformation collapses or overwrites the
                attribute — you cannot reconstruct history a mutable source has already destroyed, so the snapshot must sit at the
                earliest capturable point. This is why dbt keeps snapshots separate from models: they are stateful,
                append-and-expire artifacts whose whole job is to defeat the statelessness of the rest of the DAG.
              </p>
              <p>
                Two detection strategies exist (below), and both share the fundamental limit of any polling-based CDC: temporal
                resolution equals sampling interval. A value that changes and reverts between two runs is invisible; a value that
                changes N times between runs collapses to one recorded transition. True change-data-capture off the source&apos;s
                write-ahead log avoids this, at much higher operational cost. Snapshots are the pragmatic 80%: no CDC
                infrastructure, just a scheduled diff, accepting run-cadence granularity as the price.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="What a snapshot produces: build the SCD2 result by hand">
        <p>
          A snapshot&apos;s output is nothing exotic — it is the SCD2 table you already know how to build. To make the mechanism
          concrete, here is the current dimension (alice is Bronze, bob is Silver) meeting a fresh source read where alice has
          become Gold. Run the expire-and-insert logic and watch alice split into two versions — this is exactly what{' '}
          <code>dbt snapshot</code> does for you:
        </p>
        <CodeRunner
          language="sql"
          setup={SCD}
          code={`-- SCD2 by hand (the 2.4.3 pattern) = what a dbt snapshot produces automatically.
WITH changed AS (                       -- which current rows have a new tier?
  SELECT s.customer_id
  FROM source_now s
  JOIN dim_customers d ON d.customer_id = s.customer_id AND d.is_current
  WHERE s.tier <> d.tier
),
kept AS (                               -- unchanged + already-historical rows: leave alone
  SELECT * FROM dim_customers
  WHERE NOT (is_current AND customer_id IN (SELECT customer_id FROM changed))
),
expired AS (                            -- close the old current version
  SELECT customer_id, name, tier, valid_from,
         DATE '2026-03-01' AS valid_to, FALSE AS is_current
  FROM dim_customers
  WHERE is_current AND customer_id IN (SELECT customer_id FROM changed)
),
new_version AS (                        -- open a new current version from the source
  SELECT s.customer_id, s.name, s.tier,
         DATE '2026-03-01' AS valid_from, DATE '9999-12-31' AS valid_to, TRUE AS is_current
  FROM source_now s
  WHERE s.customer_id IN (SELECT customer_id FROM changed)
)
SELECT * FROM kept
UNION ALL SELECT * FROM expired
UNION ALL SELECT * FROM new_version
ORDER BY customer_id, valid_from;`}
        />
        <Tiered
          layman={
            <>
              <p>
                Alice&apos;s single &quot;Bronze&quot; line becomes two lines: &quot;Bronze, from January until March&quot; and
                &quot;Gold, from March onwards.&quot; Bob, who did not change, stays one line. Nothing was deleted — the old truth
                is preserved with the dates it was true. That is the entire idea of keeping history.
              </p>
              <p>
                Doing this by hand every time is fiddly and easy to get wrong. A snapshot is that fiddly logic, packaged and
                correct, that you just re-run.
              </p>
            </>
          }
          student={
            <>
              <p>
                Read the result: alice now has two rows — Bronze with <code>valid_to = 2026-03-01</code> and{' '}
                <code>is_current = FALSE</code>, and Gold with <code>valid_from = 2026-03-01</code>,{' '}
                <code>valid_to = 9999-12-31</code>, <code>is_current = TRUE</code>. A fact from February joins to the Bronze
                version; a fact from April joins to Gold. bob remains a single current row. This is the whole SCD2 contract, and a
                snapshot regenerates it every run without you rewriting the CTEs.
              </p>
              <p>
                The manual version is error-prone: forget the <code>WHERE is_current</code> and you expire historical rows;
                mishandle the boundary date and windows overlap or gap. Snapshots encode these details once, which is the main
                reason to prefer them over hand-rolled SCD2 for ongoing capture.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Note the boundary semantics: the old version&apos;s <code>valid_to</code> equals the new version&apos;s{' '}
                <code>valid_from</code>, giving contiguous, half-open intervals <code>[valid_from, valid_to)</code> so a
                point-in-time join uses <code>event_ts &gt;= valid_from AND event_ts &lt; valid_to</code> with no overlap or gap.
                dbt uses NULL rather than a sentinel like 9999-12-31 for the open <code>dbt_valid_to</code>, which is cleaner for
                &quot;currently valid&quot; predicates (<code>dbt_valid_to IS NULL</code>) and avoids sentinel-date arithmetic
                bugs.
              </p>
              <p>
                The manual query above is the logical specification; dbt&apos;s implementation is an incremental merge that is
                idempotent under re-runs (running <code>dbt snapshot</code> twice with an unchanged source is a no-op) and keyed
                by <code>dbt_scd_id</code>, a hash surrogate per version. That idempotency is the property that lets you schedule
                it fearlessly — the same reasoning as incremental models in 3.6.2, applied to history capture.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Two strategies, and the granularity you actually get">
        <p>
          A snapshot needs to know <em>how</em> to detect a change. dbt offers two strategies, and either way the history you
          capture is only as fine-grained as how often you run. Each sweep of the line below is one snapshot run — watch what a
          change that happens and reverts <em>between</em> runs does:
        </p>
        <WatermarkTimeline
          events={SNAP_EVENTS}
          height={380}
          caption={
            <>
              Each pass of the <span style={{ color: '#38bdf8' }}>line</span> is one <b>snapshot run</b>. The{' '}
              <span style={{ color: '#34d399' }}>green</span> points are source states the snapshot captured and turned into
              versions. The <span style={{ color: '#f43f5e' }}>red &quot;missed&quot;</span> point is a change that occurred and
              reverted <em>between</em> two runs — the snapshot never saw it, so it left no version. Snapshot history is exactly as
              granular as your run cadence: run hourly, get hourly resolution.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                How does the diary decide something changed? Two ways. Either the source stamps every record with a
                &quot;last-updated&quot; time and the diary trusts it (fast, but only as honest as that stamp), or the diary
                compares the actual values column by column against what it last wrote down (reliable, a bit more work).
              </p>
              <p>
                And a warning either way: if a friend moved twice between your diary check-ins, you only record the latest address.
                The diary is blind to anything that happened and undid itself between visits.
              </p>
            </>
          }
          student={
            <>
              <p>
                <strong>timestamp strategy</strong>: you tell the snapshot which column is the source&apos;s reliable
                &quot;updated_at&quot;; a row is considered changed when that timestamp is newer than the stored version&apos;s.
                Cheap and precise — but only trustworthy if the source actually maintains that column correctly on every update.{' '}
                <strong>check strategy</strong>: you list the columns to watch (or <code>all</code>), and the snapshot compares
                their values to the stored version, recording a change on any difference. No dependence on a source timestamp, at
                the cost of a column-by-column comparison.
              </p>
              <p>
                Both share the granularity limit the viz shows: a snapshot is polling, so it captures the state <em>at each
                run</em>. Intermediate changes that revert before the next run are invisible, and multiple changes between runs
                collapse to one recorded transition. Pick your cadence to match how much history resolution you actually need.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>timestamp</code> compares <code>updated_at &gt; dbt_valid_from</code>-equivalent state and is O(changed
                rows) with an indexable predicate, but it is only correct if the source&apos;s <code>updated_at</code> is
                monotonic and set on every mutation — a soft delete that skips it, or a backdated correction, defeats it.{' '}
                <code>check</code> hashes or compares the tracked column set, robust to a missing/untrustworthy timestamp but
                paying a wider comparison and blind to changes in untracked columns. A subtle failure mode of <code>check</code>{' '}
                with a narrow column list is missing a real change in a column you did not list.
              </p>
              <p>
                <code>invalidate_hard_deletes</code> handles rows that vanish from the source: without it, a hard delete leaves
                the last version open forever (implying the record is still current); with it, the snapshot closes that version at
                the run time so the history reflects the disappearance. This is a genuine correctness knob — whether &quot;gone
                from source&quot; should mean &quot;expired&quot; is a modeling decision, and snapshots make it explicit rather
                than silently wrong.
              </p>
            </>
          }
        />
        <CodeBlock
          label="snapshots/customers_snapshot.sql — the timestamp strategy"
          code={`{% snapshot customers_snapshot %}
{{
  config(
    target_schema='snapshots',
    unique_key='customer_id',
    strategy='timestamp',
    updated_at='updated_at',
    invalidate_hard_deletes=True
  )
}}

SELECT * FROM {{ source('jaffle', 'raw_customers') }}

{% endsnapshot %}`}
        />
        <Callout kind="warn" title="Snapshot at the source, not in the warehouse">
          Point a snapshot at the earliest, rawest version of the data — the source, before any model has cleaned or
          overwritten it. You cannot recover history that a downstream, mutable model has already flattened. If the value you want
          to track is destroyed before the snapshot sees it, no strategy can bring it back.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="dbt snapshot, hand-rolled SCD2, or just overwrite (Type 1)?">
        <p>
          Keeping history is not free, and sometimes you genuinely do not want it. The decision is how much of the past you must
          be able to reconstruct, and who maintains the machinery:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'dbt snapshot (managed SCD2)',
              strengths: [
                'The 2.4.3 expire-and-insert logic, encoded correctly once and re-runnable — idempotent',
                'Manages dbt_valid_from/to and dbt_scd_id for you; handles hard deletes as a config',
                'Sits in your dbt project with the rest of the graph — versioned, reviewed, scheduled',
              ],
              weaknesses: [
                'Polling granularity: changes between runs are lost or collapsed',
                'A distinct, stateful artifact to understand and back up carefully',
              ],
              chooseWhen: 'you need SCD2 history from a mutable source and want it maintained reliably with minimal code — the default for change history in dbt.',
            },
            {
              name: 'Hand-rolled SCD2 SQL (as in 2.4.3)',
              strengths: [
                'Total control over boundary semantics, keys, and edge cases',
                'No snapshot abstraction to learn; pure SQL you already understand',
              ],
              weaknesses: [
                'You own every subtle bug: overlapping windows, expiring the wrong rows, non-idempotent re-runs',
                'Reinvents what dbt snapshots already solved, per table',
              ],
              chooseWhen: 'you have unusual SCD2 requirements a snapshot cannot express, or you are learning the mechanism (which you did in 2.4.3).',
            },
            {
              name: 'Type 1 overwrite (no history)',
              strengths: [
                'Simplest possible: one current row per entity, just upsert it',
                'Cheapest storage and the easiest joins — no validity windows',
              ],
              weaknesses: [
                'The past is gone — you can never answer "what was the value at event time?"',
                'Silent analytical errors when a fact is joined to a since-changed attribute',
              ],
              chooseWhen: 'the attribute genuinely has no analytical history value, or the source is already the system of record for history.',
            },
          ]}
          note={
            <>
              The question that decides it: <em>will anyone ever ask &quot;what was this value back then?&quot;</em> If yes,
              you need SCD2, and a snapshot is the low-effort, low-bug way to get it — hand-rolling it (2.4.3) is for learning or
              genuinely odd requirements. If the answer is truly no, Type 1 overwrite is honest and cheaper; do not carry
              history-tracking machinery for a value whose past nobody will ever query.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: capture a change as two versions with a snapshot">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will add a snapshot to the <code>jaffle_duck</code> project, run it to capture the initial state, change a
              customer&apos;s tier in the source, snapshot again, and query the two versions dbt produced — Bronze expired, Gold
              current. Run from <code>C:\de-lab\dbt-lab\jaffle_duck</code>.
            </p>
          }
          steps={[
            {
              title: 'Seed a customers source with a change-tracking column',
              body: (
                <>
                  <p>
                    Create <code>seeds/raw_customers.csv</code> with an <code>updated_at</code> the timestamp strategy can trust:
                  </p>
                  <CodeBlock
                    label="seeds/raw_customers.csv"
                    code={`customer_id,name,tier,updated_at
1,alice,Bronze,2026-01-01 00:00:00
2,bob,Silver,2026-01-01 00:00:00`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run dbt seed -s raw_customers' }],
              checkpoint: (
                <>
                  <code>raw_customers</code> loads with two rows. <code>uv run duckdb dev.duckdb &quot;SELECT * FROM
                  raw_customers;&quot;</code> shows alice as Bronze, bob as Silver.
                </>
              ),
            },
            {
              title: 'Define the snapshot and run it once',
              body: (
                <>
                  <p>Create <code>snapshots/customers_snapshot.sql</code> using the timestamp strategy:</p>
                  <CodeBlock
                    label="snapshots/customers_snapshot.sql"
                    code={`{% snapshot customers_snapshot %}
{{
  config(
    target_schema='main',
    unique_key='customer_id',
    strategy='timestamp',
    updated_at='updated_at'
  )
}}

SELECT * FROM {{ ref('raw_customers') }}

{% endsnapshot %}`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run dbt snapshot' }],
              checkpoint: (
                <>
                  The first snapshot builds <code>customers_snapshot</code> with two rows, each having a{' '}
                  <code>dbt_valid_from</code> set and <code>dbt_valid_to = NULL</code> (both currently valid). dbt also added a{' '}
                  <code>dbt_scd_id</code> per row.
                </>
              ),
            },
            {
              title: 'Change a tier in the source, then snapshot again',
              body: (
                <>
                  <p>
                    Edit <code>seeds/raw_customers.csv</code> so alice becomes <code>Gold</code> with a newer{' '}
                    <code>updated_at</code>, re-seed, and snapshot again — this is the run that detects the change.
                  </p>
                  <CodeBlock
                    label="seeds/raw_customers.csv (change alice’s row)"
                    code={`customer_id,name,tier,updated_at
1,alice,Gold,2026-03-01 00:00:00
2,bob,Silver,2026-01-01 00:00:00`}
                  />
                  <RevealSolution label="What the second snapshot does">
                    <p>
                      dbt sees alice&apos;s <code>updated_at</code> is newer than her stored version, so it <em>closes</em> the
                      Bronze version (sets its <code>dbt_valid_to</code> to the change time) and <em>inserts</em> a new Gold
                      version with <code>dbt_valid_to = NULL</code>. bob&apos;s timestamp is unchanged, so bob is left as one row.
                      Snapshot count goes from 2 to 3.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run dbt seed -s raw_customers\nuv run dbt snapshot' }],
              checkpoint: (
                <>
                  The snapshot now holds <strong>3</strong> rows. dbt&apos;s log reports one row updated (Bronze closed) and one
                  inserted (Gold opened).
                </>
              ),
            },
            {
              title: 'Query the history: two versions of alice',
              body: (
                <p>Read the SCD2 columns to confirm the expire-and-insert happened exactly as the by-hand query predicted.</p>
              ),
              commands: [
                { ps: 'uv run duckdb dev.duckdb "SELECT customer_id, name, tier, dbt_valid_from, dbt_valid_to FROM customers_snapshot ORDER BY customer_id, dbt_valid_from;"' },
              ],
              checkpoint: (
                <>
                  alice has <strong>two</strong> rows: <code>Bronze</code> with a non-NULL <code>dbt_valid_to</code> (the closed,
                  historical version) and <code>Gold</code> with <code>dbt_valid_to = NULL</code> (the current version). bob has{' '}
                  <strong>one</strong> row, still <code>NULL</code>. Run <code>dbt snapshot</code> a third time with no source
                  change and the count stays 3 — proof it is idempotent.
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
              q: 'What does a dbt snapshot implement, and how is it related to lesson 2.4.3?',
              options: [
                'A Type 1 overwrite — it keeps only the latest value',
                'SCD2 history — the same expire-old-row / insert-new-version pattern you built by hand in 2.4.3, automated and re-runnable',
                'An incremental fact table',
                'A data-quality test',
              ],
              answer: 1,
              explain: 'A snapshot is managed SCD2: it captures source state over time and records changes as closed + new versions — exactly the 2.4.3 hand-rolled pattern, now maintained by dbt with dbt_valid_from/to and dbt_scd_id.',
            },
            {
              q: 'Which three columns does dbt manage on a snapshot?',
              options: [
                'created_at, updated_at, deleted_at',
                'dbt_valid_from, dbt_valid_to (NULL for current), and dbt_scd_id (per-version surrogate key)',
                'id, version, is_active',
                'valid_from, valid_to, primary_key',
              ],
              answer: 1,
              explain: 'dbt writes dbt_valid_from and dbt_valid_to (NULL means the current version) to define each version’s validity window, plus dbt_scd_id, a hash surrogate uniquely identifying each version.',
            },
            {
              q: 'A customer’s tier changes from Bronze to Gold and back to Bronze, all between two daily snapshot runs. What does the snapshot record?',
              options: [
                'Three versions: Bronze, Gold, Bronze',
                'Nothing new — at run time the value is Bronze again, matching the stored version, so no change is detected',
                'An error',
                'Only the Gold version',
              ],
              answer: 1,
              explain: 'Snapshots poll: they see state at run time. A change that reverts between runs is invisible, and multiple changes collapse to at most one recorded transition. History granularity = run cadence.',
            },
            {
              q: 'Difference between the timestamp and check strategies?',
              options: [
                'timestamp is for facts, check is for dimensions',
                'timestamp trusts a source updated_at column to detect change; check compares the actual tracked column values against the stored version',
                'They are identical',
                'check is faster and always preferred',
              ],
              answer: 1,
              explain: 'timestamp keys change detection on a reliable updated_at (cheap, but only as honest as that column). check compares column values directly (robust to a missing/untrusted timestamp, but a wider comparison and blind to columns you did not list).',
            },
            {
              q: 'Why must you point a snapshot at the source, not at a downstream cleaned model?',
              options: [
                'Snapshots run faster on sources',
                'You cannot recover history that a downstream mutable model has already overwritten or flattened — capture must happen at the earliest point',
                'dbt forbids snapshots on models',
                'Sources are always smaller',
              ],
              answer: 1,
              explain: 'Snapshots defeat the source’s statelessness by recording change over time. If a downstream model already overwrote the old value before the snapshot saw it, no strategy can reconstruct it — so snapshot at the rawest capturable point.',
            },
            {
              q: 'What does invalidate_hard_deletes=True change?',
              options: [
                'It deletes the whole snapshot table',
                'When a row disappears from the source, the snapshot closes its current version at run time instead of leaving it open forever',
                'It makes the snapshot run faster',
                'It turns the snapshot into a Type 1 overwrite',
              ],
              answer: 1,
              explain: 'Without it, a hard-deleted source row keeps its last version open (implying still-current). With it, the snapshot expires that version on the run where the row vanished, so history reflects the disappearance — an explicit modeling choice.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is a dbt snapshot and when would you use one?',
            a: (
              <p>
                A snapshot is dbt&apos;s built-in SCD2: run it repeatedly against a source and it records how rows change over
                time, closing the old version (setting <code>dbt_valid_to</code>) and inserting a new one whenever a tracked
                column changes. You use it when the source overwrites in place but you need to reconstruct historical attribute
                values — e.g. joining a fact to the customer tier that was true at event time. It automates the expire-and-insert
                SCD2 pattern, manages <code>dbt_valid_from/to</code> and <code>dbt_scd_id</code>, and is idempotent so you can
                schedule it. It must run at the source, before anything overwrites the value.
              </p>
            ),
          },
          {
            q: 'What are the limitations of snapshot-based history capture?',
            a: (
              <p>
                It is polling, so temporal resolution equals run cadence: changes that revert between runs are lost, and multiple
                changes collapse to one transition. The <code>timestamp</code> strategy is only as correct as the source&apos;s{' '}
                <code>updated_at</code> (a mutation that skips it is missed); the <code>check</code> strategy is blind to columns
                you did not track. Hard deletes need <code>invalidate_hard_deletes</code> or the last version stays open forever.
                When you need true per-change fidelity you graduate to log-based CDC off the source&apos;s WAL — much more
                infrastructure, which is exactly why snapshots exist as the pragmatic middle.
              </p>
            ),
          },
          {
            q: 'Snapshot vs Type 1 overwrite — how do you decide?',
            a: (
              <p>
                Ask whether anyone will ever need the value as it was in the past. If a fact must join to the attribute value that
                was true at event time — customer tier, product price, account status — you need SCD2, and a snapshot is the
                low-bug way to maintain it. If the attribute has no analytical history value, or the source itself is the system
                of record for history, Type 1 overwrite (one current row, just upsert) is cheaper and honest. Carrying validity
                windows for a value nobody queries historically is pure overhead.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A snapshot automates SCD2 — the same expire-old-version / insert-new-version pattern you built by hand in 2.4.3 — so you can reconstruct historical attribute values from a source that overwrites in place.</>,
          <>dbt manages <code>dbt_valid_from</code>, <code>dbt_valid_to</code> (NULL = current), and <code>dbt_scd_id</code>; snapshots live in <code>snapshots/</code> and run with <code>dbt snapshot</code>, idempotently.</>,
          <>Two change-detection strategies: <strong>timestamp</strong> (trust a source <code>updated_at</code>) and <strong>check</strong> (compare tracked column values) — each with its own trust/cost trade.</>,
          <>Snapshots poll, so history granularity equals run cadence: changes that revert between runs are lost and multiple changes collapse to one. <code>invalidate_hard_deletes</code> handles rows that vanish.</>,
          <>Always snapshot at the source, before any model overwrites the value — you cannot recover history that has already been flattened.</>,
          <>Choose SCD2 (snapshot) when someone will ask &quot;what was the value back then?&quot;; choose Type 1 overwrite when the past has no analytical value — do not carry history machinery for nothing.</>,
        ]}
      />
    </>
  )
}
