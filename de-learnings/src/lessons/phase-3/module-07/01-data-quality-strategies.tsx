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

const ID = '3.7.1'

// orders: 10 rows with deliberate DQ violations across several dimensions:
// - a NULL order_id (completeness / not-null on the key)
// - a NULL customer_id (completeness)
// - order_id 5 appears twice (uniqueness)
// - amounts of -5.00 and 0.00 (validity / range)
// - status 'pending' is outside the accepted set {paid, refunded} (validity)
// loaded_at carries an ingest timestamp so we can also test timeliness/freshness.
const ORDERS = `CREATE OR REPLACE TABLE orders AS SELECT * FROM (VALUES
  (1,    101, 49.90, 'paid',     TIMESTAMP '2026-07-22 06:00:00'),
  (2,    102, 12.00, 'paid',     TIMESTAMP '2026-07-22 06:01:00'),
  (3,    103, 88.50, 'refunded', TIMESTAMP '2026-07-22 06:02:00'),
  (4,    104, -5.00, 'paid',     TIMESTAMP '2026-07-22 06:03:00'),
  (5,    105, 30.00, 'paid',     TIMESTAMP '2026-07-22 06:04:00'),
  (5,    106,  0.00, 'paid',     TIMESTAMP '2026-07-22 06:05:00'),
  (NULL, 107, 20.00, 'paid',     TIMESTAMP '2026-07-22 06:06:00'),
  (8,    108, 60.00, 'pending',  TIMESTAMP '2026-07-22 06:07:00'),
  (9,    NULL, 22.00, 'paid',    TIMESTAMP '2026-07-22 06:08:00'),
  (10,   110, 40.00, 'paid',     TIMESTAMP '2026-07-22 06:09:00')
) AS t(order_id, customer_id, amount, status, loaded_at);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Bad data is worse than no data">
        <p>
          A pipeline that fails loudly wakes you at 3am and you fix it. A pipeline that quietly loads{' '}
          <em>wrong</em> numbers ships a revenue dashboard that is off by 20%, the finance team makes a decision on
          it, and nobody notices for a month. The second failure is far more expensive, and the only defence is to{' '}
          <GlossaryTerm k="data-quality">check the data itself</GlossaryTerm>, not just whether the job ran. You
          already met one slice of this in 3.6 (dbt tests); this lesson is the full strategy — what to check,{' '}
          <em>where</em> to check it, and what to do when a check fails.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think of a factory that bottles juice. &quot;Did the machine run?&quot; is not the question that
                matters to a customer — a machine can run perfectly while filling every bottle with half the juice, or
                with the wrong flavour, or leaving some caps loose. So the factory adds inspection points: a scale that
                rejects underweight bottles, a camera that checks the label, a sensor that flags a loose cap. Each is a
                small, dumb, specific test that catches one kind of wrong.
              </p>
              <p>
                Data quality is exactly those inspection points, but for rows instead of bottles. You do not write one
                giant &quot;is the data good?&quot; test — nobody can. You write many tiny checks, each answering one
                sharp question: is this ID ever missing? is this amount ever negative? did today&apos;s data actually
                arrive? Together they are the difference between trusting your numbers and hoping.
              </p>
            </>
          }
          student={
            <>
              <p>
                &quot;The job succeeded&quot; is an <em>operational</em> signal (did the code run without crashing).
                &quot;The data is correct&quot; is a <em>data-quality</em> signal, and they are independent: a job can
                exit 0 while loading duplicated rows, null keys, or yesterday&apos;s file again. Data quality is the
                practice of asserting properties of the data as first-class, versioned checks that run every time the
                pipeline does.
              </p>
              <p>
                The mental model for the rest of the lesson: a check is just a query that returns the rows that break a
                rule. Zero rows means the rule holds; N rows means you have N problems to look at. That single idea —
                <em>a check is a query whose empty result set is a pass</em> — is what dbt tests, Great Expectations,
                Soda, and hand-written SQL all compile down to. Everything else is packaging.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Data-quality validation is a form of runtime assertion over a dataset relative to an expected
                specification. It splits cleanly along two axes. First, <em>testing</em> (a boolean gate evaluated in
                the pipeline, blocking on failure) versus <GlossaryTerm k="observability">observability</GlossaryTerm>{' '}
                (continuous measurement of metrics — row counts, null rates, distributions — with anomaly detection and
                alerting, outside the critical path). Second, <em>declared</em> constraints (a schema or{' '}
                <GlossaryTerm k="data-contract">contract</GlossaryTerm> the producer promises to uphold) versus{' '}
                <em>inferred</em> expectations (profiled from history, e.g. &quot;null rate on this column has never
                exceeded 2%&quot;).
              </p>
              <p>
                The formalism matters because the failure modes differ. Testing gives you a hard guarantee at the cost
                of availability (a failed test halts delivery). Observability preserves availability at the cost of
                latency-to-detection (you find out after the bad data landed). Mature stacks run both: contract-enforced
                blocking tests on the properties that must never break, and statistical monitors on the properties that
                drift. We return to where each belongs in a medallion architecture two sections down.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The six dimensions: what &quot;quality&quot; actually decomposes into">
        <p>
          &quot;Is the data good?&quot; is unanswerable until you break it into measurable properties. The industry
          settled on roughly six <strong>dimensions</strong>. Each one is a family of checks:
        </p>
        <Tiered
          layman={
            <>
              <p>
                Six questions you can ask about any table, and every real data problem is one of them in disguise:
              </p>
              <ul>
                <li><strong>Completeness</strong> — is anything missing that should be here? (a customer with no ID)</li>
                <li><strong>Validity</strong> — does each value obey its rules? (a negative price, a status nobody defined)</li>
                <li><strong>Uniqueness</strong> — is anything duplicated that should appear once? (the same order counted twice)</li>
                <li><strong>Consistency</strong> — do related facts agree? (an order line whose customer does not exist)</li>
                <li><strong>Timeliness</strong> — is the data fresh enough to trust? (a &quot;live&quot; dashboard showing last Tuesday)</li>
                <li><strong>Accuracy</strong> — does it match reality? (the address on file is not where the person lives)</li>
              </ul>
              <p>
                The first five you can check with a query. The last, accuracy, is the hard one — it needs a source of
                truth outside your database — which is why most automated data quality lives in the first five.
              </p>
            </>
          }
          student={
            <>
              <p>Each dimension maps to a concrete check shape you will write hundreds of times:</p>
              <ul>
                <li><strong>Completeness</strong>: <code>not_null</code> on keys and required fields; expected row counts.</li>
                <li><strong>Validity</strong>: range checks (<code>amount &gt; 0</code>), accepted-values (<code>status IN (...)</code>), regex/format, type conformance.</li>
                <li><strong>Uniqueness</strong>: <code>unique</code> on a primary or business key; no duplicate grain.</li>
                <li><strong>Consistency</strong>: referential integrity (every <code>customer_id</code> exists in <code>customers</code>); cross-field rules (<code>ship_date ≥ order_date</code>).</li>
                <li><strong>Timeliness / <GlossaryTerm k="freshness">freshness</GlossaryTerm></strong>: newest row is within an expected lag of now; the expected partition arrived.</li>
                <li><strong>Accuracy</strong>: reconciliation against an authoritative source (row counts vs the source system, totals vs the general ledger).</li>
              </ul>
              <p>
                dbt&apos;s four built-in tests (<code>not_null</code>, <code>unique</code>, <code>accepted_values</code>,{' '}
                <code>relationships</code>) cover completeness, uniqueness, validity, and consistency respectively — which
                is why they carry so much weight for so little code. Freshness and accuracy need a timestamp column and
                an external reference, so they usually live in bespoke checks or a source-freshness config.
              </p>
            </>
          }
          phd={
            <>
              <p>
                These dimensions are not orthogonal and the taxonomy is not canonical (DAMA-DMBOK, ISO 8000, and every
                vendor draw the lines slightly differently). The useful invariant is the <em>cost of measurement</em>:
                completeness, validity, and uniqueness are single-table, self-contained predicates — cheap, and fully
                automatable. Consistency requires a join (referential checks scale with the referenced table).
                Timeliness requires a clock and an SLA. Accuracy requires an oracle — a trusted external truth — which is
                epistemically the hardest and rarely fully automatable, so it degrades in practice to reconciliation
                (agreement with a designated system of record) rather than truth.
              </p>
              <p>
                At scale the interesting question is measurement strategy, not the check itself. A <code>not_null</code>{' '}
                over a billion-row table is a full scan; you either fold it into a pass you are already doing (compute it
                inside the transform that reads every row anyway) or you sample. Sampling turns a guarantee into a
                statistical bound — a 1% sample can miss a violation that affects 0.001% of rows — so the sampled monitor
                and the blocking test are different tools with different guarantees, not the same tool run cheaper.
              </p>
            </>
          }
        />
        <p>
          Below is one table with problems seeded across four dimensions. A check is a query that returns the offending
          rows — run it, and if rows come back, the rule is broken. Start with the simplest: the key must never be null.
        </p>
        <CodeRunner
          language="sql"
          setup={ORDERS}
          code={`-- COMPLETENESS: order_id is the key and must never be NULL.
-- This query returns the violating rows. Zero rows = the rule holds.
SELECT * FROM orders WHERE order_id IS NULL;`}
        />
        <p>
          One row comes back, so the rule is broken. Rather than run five separate queries, real check suites report a{' '}
          <em>summary</em>: one row per check, with a violation count. Zero across the board is a green pipeline.
        </p>
        <CodeRunner
          language="sql"
          setup={ORDERS}
          code={`-- A check suite as one result: each row is a rule, "violations" is how many rows break it.
-- 0 = PASS. Anything higher is a failure to investigate.
SELECT 'completeness: order_id not null'  AS check_name, COUNT(*) AS violations
FROM orders WHERE order_id IS NULL
UNION ALL
SELECT 'completeness: customer_id not null', COUNT(*)
FROM orders WHERE customer_id IS NULL
UNION ALL
SELECT 'uniqueness: order_id unique', COUNT(*)
FROM (SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1) d
UNION ALL
SELECT 'validity: amount is positive', COUNT(*)
FROM orders WHERE amount <= 0
UNION ALL
SELECT 'validity: status is accepted', COUNT(*)
FROM orders WHERE status NOT IN ('paid', 'refunded')
ORDER BY violations DESC, check_name;`}
        />
        <Callout kind="tip" title="Read the summary like a checklist">
          Five checks, and this seed breaks every one — the validity check on amount catches two rows (the{' '}
          <code>-5.00</code> and the <code>0.00</code>), so it tops the list. This single query is a complete
          data-quality report over the table. In production the exact same shape runs on every load and the pipeline
          reacts to the counts (a clean table would show <code>0</code> down the whole column).
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Timeliness is a data-quality dimension too">
        <p>
          Five of the six dimensions are about the values in a row. Timeliness is about <em>when the row showed up</em>,
          and it fails silently in a way the others do not: a stale pipeline returns perfectly valid, unique, complete
          rows — they are just yesterday&apos;s. The watermark you met in incremental loading (3.2) is the tool. It is
          the pipeline&apos;s claim &quot;I have processed every event up to here&quot;; anything arriving behind it is
          late, and a dashboard built only from what the watermark has passed is only as fresh as the watermark.
        </p>
        <WatermarkTimeline
          caption={
            <>
              A <span style={{ color: '#38bdf8' }}>freshness</span> check asks one question about this picture: how far
              behind &quot;now&quot; is the newest row the pipeline has accepted? <span style={{ color: '#34d399' }}>On-time</span>{' '}
              events land before the watermark; <span style={{ color: '#f43f5e' }}>late</span> ones (an out-of-order or
              delayed arrival) land behind it and may be missed. Timeliness quality = the gap between the watermark and
              wall-clock stays inside your agreed limit.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                Imagine a &quot;last delivery&quot; clock on a warehouse wall. If it says 6am and it is now 8am, fine —
                two hours is normal. If it still says 6am at 6pm, something upstream stopped feeding you and every report
                downstream is quietly running on morning data. Nothing looks broken; the numbers are just old.
              </p>
              <p>
                A freshness check is that clock with an alarm: &quot;if the newest data is more than N hours behind, shout.&quot;
                It catches the failures where the data is not <em>wrong</em>, just <em>late</em> — which for a live
                dashboard is the same as wrong.
              </p>
            </>
          }
          student={
            <>
              <p>
                A freshness check compares the maximum timestamp in the table (last loaded row, or last event) against a
                reference time and fails if the lag exceeds a threshold — your <GlossaryTerm k="sla">SLA</GlossaryTerm>{' '}
                for that dataset. dbt ships this as source <code>freshness</code> (<code>warn_after</code> /{' '}
                <code>error_after</code> on a <code>loaded_at_field</code>); the hand-written version is a{' '}
                <code>date_diff</code> against <code>MAX(loaded_at)</code>.
              </p>
              <p>
                The subtlety is which clock: <em>ingestion</em> freshness (when did the last row load?) catches a broken
                loader, while <em>event</em> freshness (how recent is the newest business event?) catches an upstream
                that stopped producing even if your loader is happily reloading the same stale file. They fail in
                different scenarios; pick the one that matches the failure you fear.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Freshness is where testing and observability blur. As a blocking test it is a threshold predicate:{' '}
                <code>now() - MAX(loaded_at) &gt; error_after</code> aborts the run. As an observability signal it is a
                time series — the lag itself, monitored for anomalies — which detects gradual degradation (the feed
                slipping from 5-minute to 40-minute lag) that a fixed threshold misses until it crosses. The two compose:
                a hard SLA gate for the contract, a monitored lag metric for early warning.
              </p>
              <p>
                In streaming, freshness and the watermark are the same object. The watermark is a lower bound on event
                time; the gap between watermark and processing time is exactly the freshness lag, and the
                allowed-lateness window is the explicit trade of completeness against latency (drop late events for a
                fresher-but-incomplete result, or hold the window open for completeness at the cost of freshness). The
                batch <code>date_diff</code> check is the same idea sampled once per run instead of maintained
                continuously.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          setup={ORDERS}
          code={`-- TIMELINESS: the newest row must be no more than 90 minutes behind the run reference.
-- Returns a row ONLY when the table is stale (staleness > 90 min). Empty = fresh.
WITH ref AS (SELECT TIMESTAMP '2026-07-22 08:00:00' AS run_at)
SELECT MAX(o.loaded_at)                                     AS newest_row,
       date_diff('minute', MAX(o.loaded_at), ref.run_at)    AS staleness_minutes
FROM orders o, ref
GROUP BY ref.run_at
HAVING date_diff('minute', MAX(o.loaded_at), ref.run_at) > 90;`}
        />
        <Callout kind="info" title="Why this one returns a row">
          The newest row loaded at 06:09; the reference run time is 08:00 — a 111-minute lag, past the 90-minute SLA, so
          the check fails and returns the staleness. Loosen the threshold to <code>&gt; 120</code> and it passes (empty
          result). That threshold is a business decision, not a technical one: how old is too old for <em>this</em> table?
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Where to check, and testing vs monitoring">
        <Tiered
          layman={
            <>
              <p>
                Two decisions turn a pile of checks into a strategy. First, <em>where</em> to inspect. You can check
                goods as they arrive at the warehouse (catch a bad shipment before it touches anything), on the assembly
                line (catch a step that damages them), and at the loading dock before they ship to customers (last line
                of defence). Serious operations inspect at all three, because each catches a different kind of problem.
              </p>
              <p>
                Second, <em>what to do</em> when an inspection fails. Do you stop the whole line (nothing bad ships, but
                nothing ships), or do you flag the problem and keep running (things keep moving, but you have to trust
                someone reads the flags)? There is no universally right answer — it depends on what shipping a bad
                bottle costs versus what stopping the line costs.
              </p>
            </>
          }
          student={
            <>
              <p>
                <strong>Where to check</strong> maps onto the medallion flow from 3.3:
              </p>
              <ul>
                <li>
                  <strong>At the source / ingest (bronze):</strong> schema and freshness checks on raw data. Catch a
                  malformed feed before it contaminates anything downstream — cheapest place to catch the widest problem.
                </li>
                <li>
                  <strong>Mid-transform (silver):</strong> the invariants your models assume — keys are unique after
                  dedup, joins did not fan out, business rules hold. This is where most dbt tests live.
                </li>
                <li>
                  <strong>At the output / contract (gold):</strong> the promises consumers depend on — row counts,
                  totals reconcile, no nulls in the columns the dashboard reads. The last gate before anyone trusts it.
                </li>
              </ul>
              <p>
                <strong>Testing vs monitoring</strong> is the reaction. A <em>test</em> is a boolean gate inside the
                pipeline: it blocks on failure (bad data does not proceed). A <em>monitor</em> observes and alerts but
                does not block: the data flows, someone gets paged. Test the properties that must never break; monitor
                the ones that drift or that you cannot afford to block on. Most real systems do both.
              </p>
              <CodeBlock
                label="the same check, expressed three ways (dbt / Great Expectations / raw SQL)"
                code={`# dbt schema test (declarative, in schema.yml)
models:
  - name: orders
    columns:
      - name: order_id
        tests: [not_null, unique]
      - name: status
        tests:
          - accepted_values: { values: ['paid', 'refunded'] }

# Great Expectations (an "expectation" over a batch)
validator.expect_column_values_to_not_be_null("order_id")
validator.expect_column_values_to_be_in_set("status", ["paid", "refunded"])

# raw SQL (a check = a query that returns violating rows; 0 rows = pass)
SELECT * FROM orders WHERE order_id IS NULL;`}
              />
            </>
          }
          phd={
            <>
              <p>
                Placement is a cost/blast-radius optimisation. Checking at ingest has the smallest blast radius (reject
                before anything derives from it) and the lowest cost (raw is often smaller than the exploded marts), but
                it can only assert source-level properties — it cannot know a join will fan out. Checking at the output
                asserts exactly the consumer contract but pays for the full transform before discovering the problem and
                has the largest blast radius if it blocks. The medallion layering exists partly to give you three
                natural, differently-priced assertion points.
              </p>
              <p>
                The blocking-vs-observing choice is fundamentally a CAP-flavoured availability/consistency trade for your
                data plane. A blocking gate chooses consistency: downstream never sees data that failed the predicate,
                at the cost of availability when it does. An out-of-band monitor chooses availability: data always flows,
                at the cost of a detection-latency window during which consumers see unverified data. Data{' '}
                <GlossaryTerm k="data-contract">contracts</GlossaryTerm> formalise which properties get which treatment:
                the contract enumerates the guaranteed invariants (blocked, versioned, breaking-change-managed) and
                everything else is best-effort and monitored. That is what makes a contract more than a schema — it is a
                machine-checkable, owned agreement about which checks are load-bearing.
              </p>
            </>
          }
        />
        <p>
          A check does not have to live in SQL. Any assertion in code works — here is the same suite as plain Python
          (stdlib only), the shape you would drop into an ingestion script <em>before</em> writing rows out. It prints
          each violation, then raises — which is how a check <em>blocks</em> a pipeline.
        </p>
        <CodeRunner
          language="python"
          code={`# A data-quality check is just an assertion over records.
rows = [
    {"order_id": 1, "amount": 49.90, "status": "paid"},
    {"order_id": 2, "amount": -5.00, "status": "paid"},     # bad: negative amount
    {"order_id": 2, "amount": 30.00, "status": "pending"},  # bad: duplicate id AND bad status
    {"order_id": None, "amount": 20.00, "status": "paid"},  # bad: null key
]

allowed = {"paid", "refunded"}
seen = set()
violations = []
for r in rows:
    if r["order_id"] is None:
        violations.append(("completeness: order_id", r))
    elif r["order_id"] in seen:
        violations.append(("uniqueness: order_id", r))
    seen.add(r["order_id"])
    if r["amount"] <= 0:
        violations.append(("validity: amount > 0", r))
    if r["status"] not in allowed:
        violations.append(("validity: status", r))

for name, r in violations:
    print(f"FAIL {name}: {r}")
print(f"total violations: {len(violations)}")

# To BLOCK the pipeline, raise on any violation. (This assert fails on purpose here.)
assert not violations, f"data quality failed: {len(violations)} violations"
print("all checks passed")`}
        />
      </Section>

      <Section kicker="trade-offs" title="When a check fails: block, monitor, or quarantine?">
        <p>
          The dimensions and placement decide <em>what</em> you catch. This decides what happens next — and it is the
          decision interviewers actually probe, because there is no default answer. It depends on what shipping bad data
          costs versus what halting delivery costs, for this specific dataset.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Fail fast — block the pipeline',
              strengths: [
                'Bad data never reaches downstream consumers — the strongest correctness guarantee',
                'Failure is loud and immediate; you fix the cause, not the symptoms',
                'Simple to reason about: green means every gate passed',
              ],
              weaknesses: [
                'One bad row can halt the entire delivery — the dashboard is now stale instead of slightly wrong',
                'A noisy or over-strict check causes alert fatigue and pressure to disable it',
                'All-or-nothing: no partial value delivered from the good 99.9%',
              ],
              chooseWhen: 'the property is load-bearing and shipping a violation is worse than shipping nothing — financial totals, primary keys, regulatory fields.',
            },
            {
              name: 'Warn and monitor',
              strengths: [
                'Data keeps flowing — availability preserved, no delivery halted',
                'Great for properties that drift (distributions, null rates) where a hard threshold is wrong',
                'Trends over time reveal slow degradation a pass/fail gate misses',
              ],
              weaknesses: [
                'Bad data DOES reach consumers — you detect after the fact, inside a latency window',
                'Only works if someone actually watches the alerts; an ignored monitor is worse than none',
                'Turns a guarantee into a probability',
              ],
              chooseWhen: 'the property is informative rather than absolute, blocking is unacceptable, or you are still learning what "normal" looks like.',
            },
            {
              name: 'Quarantine and continue',
              strengths: [
                'Good rows flow; only the bad rows are held aside in a dead-letter table (the 3.2.4 pattern)',
                'No data loss — quarantined rows are inspected, fixed, and replayed later',
                'Partial delivery: consumers get the valid 99.9% now, not nothing',
              ],
              weaknesses: [
                'Downstream totals are silently incomplete until the quarantine is drained — a hidden completeness hit',
                'Needs machinery: a quarantine table, a reprocessing path, someone owning the backlog',
                'Splitting rows can break referential integrity (an order kept, its line quarantined)',
              ],
              chooseWhen: 'most rows are fine and a few are malformed, and partial-but-flowing beats all-or-nothing — high-volume ingestion is the classic case.',
            },
          ]}
          note={
            <>
              These are not mutually exclusive across a pipeline — the usual shape is{' '}
              <GlossaryTerm k="quarantine">quarantine</GlossaryTerm> malformed rows at ingest (keep flowing), block at
              the gold contract on the handful of invariants that must never break, and monitor the drift-prone metrics
              everywhere. The anti-pattern is picking one globally: blocking on every check makes the pipeline
              brittle and gets checks disabled under pressure; monitoring everything means bad data always ships and you
              are just watching it happen.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: build a check suite, break it, then quarantine">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will build a small DuckDB dataset, write data-quality checks across four dimensions, watch one fail
              when you inject a bad row, add a freshness check, then implement quarantine-and-continue: split good rows
              from bad into a dead-letter table so the pipeline keeps flowing. Everything runs with{' '}
              <code>uv</code> and DuckDB — no services. Work in <code>C:\de-lab\dq-lab</code>.
            </p>
          }
          steps={[
            {
              title: 'Create the lab folder and seed a table',
              body: (
                <>
                  <p>
                    Make the folder, then a script <code>seed.py</code> that builds a persistent DuckDB file with a
                    small orders table (with one deliberately bad row already in it).
                  </p>
                  <CodeBlock
                    label="seed.py"
                    code={`import duckdb

con = duckdb.connect("dq.duckdb")
con.execute("DROP TABLE IF EXISTS orders")
con.execute("""
CREATE TABLE orders AS SELECT * FROM (VALUES
  (1,    101, 49.90, 'paid',     TIMESTAMP '2026-07-22 06:00:00'),
  (2,    102, 12.00, 'paid',     TIMESTAMP '2026-07-22 06:01:00'),
  (3,    103, 88.50, 'refunded', TIMESTAMP '2026-07-22 06:02:00'),
  (4,    104, -5.00, 'paid',     TIMESTAMP '2026-07-22 06:03:00'),
  (5,    105, 30.00, 'paid',     TIMESTAMP '2026-07-22 06:04:00')
) AS t(order_id, customer_id, amount, status, loaded_at)
""")
n = con.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
print(f"seeded {n} rows")`}
                  />
                </>
              ),
              commands: [
                { ps: 'mkdir C:\\de-lab\\dq-lab\ncd C:\\de-lab\\dq-lab', label: 'create + enter folder' },
                { ps: '# save seed.py into this folder, then:\nuv run --with duckdb python seed.py', label: 'seed the table' },
              ],
              checkpoint: (
                <>
                  Prints <code>seeded 5 rows</code> and a <code>dq.duckdb</code> file appears in the folder. Row 4 has a
                  negative amount — a validity violation already lurking.
                </>
              ),
            },
            {
              title: 'Write the check suite',
              body: (
                <>
                  <p>
                    Create <code>checks.py</code> that runs each check as a query returning violating rows, and reports a
                    count per check. Zero across the board is a pass.
                  </p>
                  <CodeBlock
                    label="checks.py"
                    code={`import duckdb, sys

con = duckdb.connect("dq.duckdb")

CHECKS = {
    "completeness: order_id not null":  "SELECT * FROM orders WHERE order_id IS NULL",
    "completeness: customer_id not null":"SELECT * FROM orders WHERE customer_id IS NULL",
    "uniqueness: order_id unique":      "SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1",
    "validity: amount > 0":             "SELECT * FROM orders WHERE amount <= 0",
    "validity: status accepted":        "SELECT * FROM orders WHERE status NOT IN ('paid','refunded')",
}

failed = 0
for name, sql in CHECKS.items():
    violations = len(con.execute(sql).fetchall())
    flag = "PASS" if violations == 0 else f"FAIL ({violations})"
    if violations: failed += 1
    print(f"{flag:12} {name}")

print(f"\\n{failed} check(s) failed")
sys.exit(1 if failed else 0)`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run --with duckdb python checks.py' }],
              checkpoint: (
                <>
                  Four checks print <code>PASS</code>; <code>validity: amount &gt; 0</code> prints{' '}
                  <code>FAIL (1)</code> — the negative row from the seed. The script exits non-zero, which is exactly how
                  a check <em>blocks</em> a pipeline: a non-zero exit fails the job.
                </>
              ),
            },
            {
              title: 'Inject a bad row and watch a second check fail',
              body: (
                <p>
                  Insert a row with a NULL <code>order_id</code> and a duplicate id, then re-run the checks. Predict
                  which checks flip to FAIL before you run it.
                </p>
              ),
              commands: [
                {
                  ps: 'uv run --with duckdb python -c "import duckdb; con=duckdb.connect(\'dq.duckdb\'); con.execute(\\"INSERT INTO orders VALUES (NULL, 106, 15.0, \'pending\', TIMESTAMP \'2026-07-22 06:05:00\'), (5, 107, 9.0, \'paid\', TIMESTAMP \'2026-07-22 06:06:00\')\\"); print(\'inserted 2 rows\')"',
                  label: 'inject bad rows',
                },
                { ps: 'uv run --with duckdb python checks.py', label: 're-run checks' },
              ],
              checkpoint: (
                <>
                  Now <strong>four</strong> checks fail: completeness on <code>order_id</code> (the NULL), uniqueness (id{' '}
                  <code>5</code> twice), validity on amount (still the <code>-5.00</code>), and validity on status (the{' '}
                  <code>&apos;pending&apos;</code>). One insert, four dimensions lit up.
                </>
              ),
            },
            {
              title: 'Add a freshness (timeliness) check',
              body: (
                <>
                  <p>
                    Values can be perfect and the data still be stale. Add a freshness check comparing the newest row to
                    a reference time. Try it yourself first, then reveal.
                  </p>
                  <RevealSolution label="Reveal the freshness check">
                    <CodeBlock
                      label="freshness.py"
                      code={`import duckdb

con = duckdb.connect("dq.duckdb")
row = con.execute("""
  WITH ref AS (SELECT TIMESTAMP '2026-07-22 08:00:00' AS run_at)
  SELECT date_diff('minute', MAX(o.loaded_at), ref.run_at) AS staleness_min
  FROM orders o, ref GROUP BY ref.run_at
""").fetchone()

staleness = row[0]
SLA_MIN = 90
verdict = "STALE" if staleness > SLA_MIN else "FRESH"
print(f"newest row is {staleness} min behind the run -> {verdict} (SLA {SLA_MIN} min)")`}
                    />
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run --with duckdb python freshness.py' }],
              checkpoint: (
                <>
                  Prints <code>newest row is 114 min behind the run -&gt; STALE (SLA 90 min)</code>. (114 because the
                  injected 06:06 row is now the newest.) Raise <code>SLA_MIN</code> to <code>120</code> and it reports
                  FRESH — the threshold is a business call.
                </>
              ),
            },
            {
              title: 'Quarantine and continue: split good from bad',
              body: (
                <>
                  <p>
                    Blocking on every bad row halts everything. Instead, route bad rows to a{' '}
                    <code>orders_quarantine</code> table (a dead-letter, per 3.2.4) and keep the clean rows flowing to{' '}
                    <code>orders_clean</code>. Write the two <code>CREATE TABLE ... AS SELECT</code> statements.
                  </p>
                  <RevealSolution label="Reveal the quarantine split">
                    <CodeBlock
                      label="quarantine.py"
                      code={`import duckdb

con = duckdb.connect("dq.duckdb")

BAD = """
  order_id IS NULL
  OR customer_id IS NULL
  OR amount <= 0
  OR status NOT IN ('paid','refunded')
  OR order_id IN (SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1)
"""

con.execute(f"CREATE OR REPLACE TABLE orders_quarantine AS SELECT * FROM orders WHERE {BAD}")
con.execute(f"CREATE OR REPLACE TABLE orders_clean      AS SELECT * FROM orders WHERE NOT ({BAD})")

clean = con.execute("SELECT COUNT(*) FROM orders_clean").fetchone()[0]
bad   = con.execute("SELECT COUNT(*) FROM orders_quarantine").fetchone()[0]
print(f"clean: {clean} rows flow downstream | quarantined: {bad} rows held for review")`}
                    />
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run --with duckdb python quarantine.py' }],
              checkpoint: (
                <>
                  Prints <code>clean: 3 rows flow downstream | quarantined: 4 rows held for review</code>. The good rows
                  proceed; the bad ones wait in a dead-letter table for inspection and replay. You just chose
                  quarantine-and-continue over block-everything — and you can see the completeness cost: downstream now
                  sees 3 of 7 rows until the quarantine is drained.
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
              q: 'In the "a check is a query" model, when does a check PASS?',
              options: [
                'When the query returns at least one row',
                'When the query returns zero rows',
                'When the query runs without a syntax error',
                'When the query returns the same rows as last time',
              ],
              answer: 1,
              explain: 'A check queries for the rows that BREAK a rule. Zero rows means nothing broke it — a pass. N rows means N violations. Whether the query executed is an operational signal, not a data-quality one.',
            },
            {
              q: 'A nightly job exits 0 (success) but the revenue dashboard is wrong. Which is the most likely gap?',
              options: [
                'The job needs more CPU',
                'There are operational checks (did it run) but no data-quality checks (is the data correct)',
                'The dashboard cache is stale',
                'The job should run more often',
              ],
              answer: 1,
              explain: 'Operational success and data correctness are independent. A job can exit 0 while loading duplicated, null, or stale rows. Data-quality checks assert properties of the data itself, not just that the code ran.',
            },
            {
              q: 'The newest row in a "live" table loaded 9 hours ago, but every value in it is valid, unique, and complete. Which dimension is failing?',
              options: [
                'Validity',
                'Uniqueness',
                'Timeliness / freshness',
                'None — the data is fine',
              ],
              answer: 2,
              explain: 'Freshness is about WHEN the data arrived, independent of whether the values are correct. Stale-but-valid data is the silent failure freshness checks exist to catch — for a live dashboard, old is as bad as wrong.',
            },
            {
              q: 'Which reaction lets the good rows keep flowing while holding bad rows aside for later replay?',
              options: [
                'Fail fast (block the pipeline)',
                'Warn and monitor',
                'Quarantine and continue (dead-letter the bad rows)',
                'Delete the bad rows',
              ],
              answer: 2,
              explain: 'Quarantine routes violating rows to a dead-letter table and passes the clean rows downstream — partial delivery with no data loss. Blocking halts everything; monitoring ships the bad rows; deleting loses them.',
            },
            {
              q: 'You must guarantee a financial total never ships wrong, even at the cost of a delayed dashboard. Best reaction?',
              options: [
                'Warn and monitor',
                'Fail fast — block the pipeline on that check',
                'Quarantine the bad rows and ship the rest',
                'Log it and move on',
              ],
              answer: 1,
              explain: 'When shipping a violation is worse than shipping nothing, block. Monitoring lets the wrong total reach consumers; quarantining a subset of rows would silently understate the total. A load-bearing invariant gets a hard gate.',
            },
            {
              q: 'Where does checking for referential integrity (every customer_id exists in customers) naturally belong, and why is it more expensive than a not_null check?',
              options: [
                'At ingest, and it is cheaper because raw data is smaller',
                'Mid-transform, and it requires a join to the referenced table',
                'It is a freshness check and needs a clock',
                'It cannot be automated',
              ],
              answer: 1,
              explain: 'Consistency checks like referential integrity compare across tables, so they need a join and scale with the referenced table — unlike single-table predicates (not_null, range, unique). They typically run mid-transform where the relationships are assembled.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do you decide whether a failing data-quality check should block the pipeline or just alert?',
            a: (
              <p>
                By the cost of shipping a violation versus the cost of halting delivery, for that specific dataset. Block
                on load-bearing invariants where a wrong value is worse than no value — primary keys, financial totals,
                regulatory fields. Monitor properties that drift or are informative rather than absolute (distributions,
                null rates), where a hard threshold would cause false alarms and blocking is unacceptable. For
                high-volume ingest where a few rows are malformed but most are fine, quarantine: dead-letter the bad
                rows, let the clean ones flow, and replay after fixing. Strong answers note these coexist in one
                pipeline — quarantine at ingest, block at the gold contract, monitor the drift-prone metrics — and that
                blocking on everything gets checks disabled under delivery pressure.
              </p>
            ),
          },
          {
            q: 'What is the difference between data testing and data observability?',
            a: (
              <p>
                Testing is a boolean gate inside the pipeline: a predicate that blocks on failure, giving a hard
                correctness guarantee at the cost of availability. Observability is continuous measurement of metrics —
                row counts, null rates, freshness lag, distributions — outside the critical path, with anomaly detection
                and alerting; it preserves availability but detects problems after the data has landed. Testing catches
                the violations you can enumerate in advance; observability catches the drift and anomalies you did not
                think to write a test for. Mature stacks run both: contract-enforced tests on invariants that must never
                break, statistical monitors on everything that moves.
              </p>
            ),
          },
          {
            q: 'Name the data-quality dimensions and give a check for each.',
            a: (
              <p>
                Completeness (not-null on keys, expected row counts), validity (range and accepted-values checks —
                amount &gt; 0, status in a defined set), uniqueness (no duplicate primary/business key), consistency
                (referential integrity, cross-field rules like ship_date ≥ order_date), timeliness/freshness (newest
                row within an SLA of now), and accuracy (reconciliation against a system of record). The first five are
                queryable in-database; accuracy needs an external source of truth, so it usually degrades to
                reconciliation. dbt&apos;s four built-ins (not_null, unique, accepted_values, relationships) cover the
                first four dimensions, which is why they carry so much weight for so little config.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A data-quality check is a query that returns the rows breaking a rule: zero rows = pass, N rows = N problems. dbt tests, Great Expectations, Soda, and raw SQL all compile to that idea.</>,
          <>Quality decomposes into six dimensions — completeness, validity, uniqueness, consistency, timeliness/freshness, accuracy. The first five are queryable; accuracy needs an external source of truth.</>,
          <>&quot;The job ran&quot; (operational) and &quot;the data is correct&quot; (data-quality) are independent signals — a job can exit 0 while loading null keys, duplicates, or stale rows.</>,
          <>Check at three natural points in a medallion flow: at ingest (schema/freshness, smallest blast radius), mid-transform (model invariants), and at the gold contract (consumer promises).</>,
          <>Testing blocks (consistency at the cost of availability); observability monitors and alerts (availability at the cost of detection latency). Load-bearing invariants get tests; drift-prone metrics get monitors.</>,
          <>On failure choose block (never ship a violation), monitor (keep flowing, detect after), or quarantine (dead-letter the bad rows, ship the clean ones). Real pipelines mix all three; picking one globally is the anti-pattern.</>,
        ]}
      />
    </>
  )
}
