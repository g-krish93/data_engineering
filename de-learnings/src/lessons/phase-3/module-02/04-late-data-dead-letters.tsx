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

const ID = '3.2.4'

// One incoming batch, five rows. Two are valid; the rest are broken in ways a
// pipeline must handle without crashing: a negative amount, a NULL amount, and
// an event whose time is BEFORE the watermark (late).
const ROUTE = `CREATE OR REPLACE TABLE incoming AS SELECT * FROM (VALUES
  (1, TIMESTAMP '2026-03-02 09:00', 50.0),
  (2, TIMESTAMP '2026-03-02 09:05', -5.0),
  (3, TIMESTAMP '2026-03-01 08:00', 30.0),
  (4, TIMESTAMP '2026-03-02 09:10', NULL),
  (5, TIMESTAMP '2026-03-02 09:15', 20.0)
) AS t(id, event_time, amount);
CREATE OR REPLACE TABLE clean (id INTEGER, event_time TIMESTAMP, amount DOUBLE);
CREATE OR REPLACE TABLE dead_letter (id INTEGER, event_time TIMESTAMP, amount DOUBLE, reason TEXT);
INSERT INTO clean
  SELECT id, event_time, amount FROM incoming
  WHERE amount IS NOT NULL AND amount > 0 AND event_time >= TIMESTAMP '2026-03-02 00:00';
INSERT INTO dead_letter
  SELECT id, event_time, amount,
    CASE WHEN amount IS NULL OR amount <= 0 THEN 'bad_amount'
         WHEN event_time < TIMESTAMP '2026-03-02 00:00' THEN 'late'
         ELSE 'unknown' END AS reason
  FROM incoming
  WHERE NOT (amount IS NOT NULL AND amount > 0 AND event_time >= TIMESTAMP '2026-03-02 00:00');`

const LATE_EVENTS = [
  { t: 0.14 },
  { t: 0.28 },
  { t: 0.2, late: true, label: 'late!' },
  { t: 0.46 },
  { t: 0.6 },
  { t: 0.4, late: true, label: 'late!' },
  { t: 0.74 },
  { t: 0.88 },
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The row that shows up after you already moved on">
        <p>
          Your incremental load advanced its <GlossaryTerm k="watermark">watermark</GlossaryTerm> to 2pm and closed the
          books on the morning. Then a phone that was offline all day reconnects and uploads a sale timestamped 9am — an
          event whose time is <em>behind</em> a watermark you already passed. Separately, some rows are simply broken: a
          negative price, a null amount, a corrupt line. A production pipeline cannot crash on either. It needs a plan for{' '}
          <GlossaryTerm k="late-data">late data</GlossaryTerm> and a place to quarantine the unprocessable — a{' '}
          <GlossaryTerm k="dead-letter">dead-letter</GlossaryTerm> table.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Imagine collecting a school&apos;s permission slips. You announce a deadline and count what came in. Later,
                a slip arrives that a kid actually signed a week ago — it is real, but it showed up after you counted. Do
                you reopen the tally, ignore it, or set a grace period? Separately, some slips are unreadable — coffee-stained,
                unsigned, filled in wrong. You do not throw those in the trash and forget them; you put them in a labelled
                &quot;needs a look&quot; box so nothing silently disappears.
              </p>
              <p>
                Pipelines face both problems constantly. Late arrivals need a policy (ignore, allow a grace window, or
                redo the count). Unreadable records need a quarantine box — the dead-letter table — so a few bad rows never
                take down the whole run and never vanish without a trace.
              </p>
            </>
          }
          student={
            <>
              <p>
                Two distinct problems share this lesson. <strong>Late data</strong> is an event whose event-time is behind
                the current watermark when it arrives — the pipeline already declared that window complete. You decide the
                policy: drop it, admit it via <GlossaryTerm k="allowed-lateness">allowed lateness</GlossaryTerm> (a grace
                window past the watermark), or restate the affected window. <strong>Dead-lettering</strong> is the pattern
                for records you cannot process at all — bad types, failed validation, schema violations, so-called{' '}
                <GlossaryTerm k="poison-message">poison messages</GlossaryTerm>. Instead of crashing or silently dropping
                them, you route them to a side table with a reason, and the good rows flow on.
              </p>
              <p>
                The design rule is the same for both: <em>never let a few problem rows fail the batch, and never let them
                disappear unseen.</em> Route, tag with a reason, count, and alert when the dead-letter volume spikes — that
                count is one of your best data-quality signals.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A watermark is a heuristic assertion that event-time completeness has reached time W; it is deliberately
                imperfect, because waiting for a true guarantee of completeness on an unbounded stream would mean waiting
                forever. <GlossaryTerm k="allowed-lateness">Allowed lateness</GlossaryTerm> L extends the contract: window
                state is retained until watermark &gt; window_end + L, so an event arriving within L past the watermark can
                still update the window (a late firing), after which state is garbage-collected and further stragglers are
                dropped. This is the Dataflow model&apos;s explicit separation of <em>when</em> results fire (triggers) from{' '}
                <em>what</em> window they belong to.
              </p>
              <p>
                The trade is memory versus completeness versus correctness of already-emitted results. A larger L captures
                more stragglers but pins window state longer and forces downstream <GlossaryTerm k="restatement">restatement</GlossaryTerm>{' '}
                of any result already published. Late firings interact with delivery semantics: if a window emitted at the
                watermark and re-emits on a late event, consumers must handle the refinement idempotently (accumulating vs
                discarding mode), or exactly-once at the sink degrades into visibly changing aggregates. Dead-lettering is
                the orthogonal concern — it isolates schema/type failures so a single poison record cannot stall the
                consumer group or trigger an infinite retry loop.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Late arrivals: the watermark already moved past them">
        <p>
          The animation makes &quot;late&quot; concrete. The blue watermark sweeps event-time; on-time events go green as
          it passes. The <span style={{ color: '#f43f5e' }}>red</span> events are late — they belong <em>behind</em> the
          line (their true event-time is earlier) but only appear after the watermark has already swept past that point.
          By the time they show up, the window they belonged to may already be closed and its result published.
        </p>
        <WatermarkTimeline
          events={LATE_EVENTS}
          caption={
            <>
              <span style={{ color: '#34d399' }}>On-time</span> events are seen before the{' '}
              <span style={{ color: '#38bdf8' }}>watermark</span> passes their event-time. A{' '}
              <span style={{ color: '#f43f5e' }}>late</span> event lands behind the watermark — its window may already be
              closed. Your three options: drop it, admit it within an allowed-lateness grace window, or restate the closed
              window. There is no free choice; each trades completeness against cost.
            </>
          }
        />
        <Callout kind="warn" title="Event-time vs processing-time">
          Late data only makes sense once you separate <em>event-time</em> (when the thing happened) from{' '}
          <em>processing-time</em> (when your pipeline saw it). A row is late when its event-time is behind the watermark
          at the moment of arrival — a gap caused by offline devices, retries, network delays, and clock skew. If you key
          everything on processing-time you never have &quot;late&quot; data, but your windows no longer mean what the
          business thinks they mean.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Dead-lettering: quarantine the unprocessable, keep flowing">
        <p>
          Here is the pattern in SQL. One incoming batch of five rows: two are clean, one has a negative amount, one has a
          null amount, one is late (event-time before the 2026-03-02 watermark). The setup routes each row — valid rows to{' '}
          <code>clean</code>, the rest to <code>dead_letter</code> with a reason. Look at what got quarantined:
        </p>
        <CodeRunner
          language="sql"
          setup={ROUTE}
          code={`-- the quarantine: every row that could not be processed, tagged with WHY
SELECT id, event_time, amount, reason
FROM dead_letter
ORDER BY id;`}
        />
        <p>
          Three rows sidelined (bad_amount twice, late once), and crucially the batch did <em>not</em> fail — the two good
          rows made it through. Confirm the split:
        </p>
        <CodeRunner
          language="sql"
          setup={ROUTE}
          code={`-- good rows flowed; bad rows are safe in quarantine, nothing lost
SELECT
  (SELECT COUNT(*) FROM clean)       AS clean_rows,
  (SELECT COUNT(*) FROM dead_letter) AS dead_rows,
  (SELECT COUNT(*) FROM incoming)    AS total_in;`}
        />
        <Tiered
          layman={
            <>
              <p>
                The good rows went in the front door; the problem rows went into the labelled box with a sticky note saying
                why. Nobody had to stop the line, and nothing got thrown away. Tomorrow someone can open the box, see two
                &quot;bad amount&quot; slips and one &quot;arrived late&quot; slip, and decide what to do — fix the source,
                or reprocess the late one.
              </p>
            </>
          }
          student={
            <>
              <p>
                The routing is a validation predicate applied twice: rows that pass go to <code>clean</code>, rows that
                fail go to <code>dead_letter</code> with a <code>reason</code> column (why it failed). The reason is the
                valuable part — <code>bad_amount</code>, <code>late</code>, <code>schema_mismatch</code> — because it turns
                the dead-letter table into a triage queue and a data-quality dashboard. A sudden spike in{' '}
                <code>schema_mismatch</code> tells you a source changed its format before any downstream report breaks.
              </p>
              <p>
                Operationally you monitor the dead-letter count, alert on anomalies, and periodically reprocess or discard
                its contents. The rows are not lost, not blocking, and not silent — the three properties that separate a
                robust ingestion path from a fragile one.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Dead-lettering decouples record-level failure from batch-level failure. In a streaming consumer a poison
                message that throws on deserialize will, without a dead-letter path, block the partition and often trigger
                an infinite retry (the consumer never advances its offset). Routing the poison to a DLQ and committing the
                offset lets the group make progress while preserving the failed payload for forensics. The reason code and
                original payload are the contract: enough to reconstruct, replay, or discard after the source is fixed.
              </p>
              <p>
                The subtle design choice is <em>where</em> validation sits relative to the idempotency boundary. Route
                before the idempotent apply and a re-run re-routes the same poison deterministically (fine); route after,
                and dead-letter writes must themselves be idempotent (keyed on record id) or a retry multiplies quarantine
                rows. The dead-letter table is still a sink, and every sink in this module obeys the same rule from lesson
                3.2.3.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="What to do with a late (or bad) row">
        <p>
          Once a row arrives behind the watermark, you have three honest choices, and they trade completeness against cost
          and complexity. The same axis applies, softened, to how aggressively you validate and quarantine.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Drop late data',
              strengths: [
                'Simplest possible policy — no retained state, no reprocessing, bounded memory',
                'Fine when a small tail of stragglers does not change the decision (rough dashboards, trend lines)',
              ],
              weaknesses: [
                'Silently incomplete — dropped events are gone, and totals are quietly wrong',
                'Unacceptable for anything financial, legal, or audited',
              ],
              chooseWhen: 'approximate, low-stakes aggregates where a tiny loss is tolerable and simplicity matters most — but log the drop count.',
            },
            {
              name: 'Widen the window / allow lateness',
              strengths: [
                'Captures most stragglers by holding window state a grace period past the watermark',
                'One tunable knob (allowed lateness) trades completeness for memory without reprocessing history',
              ],
              weaknesses: [
                'Higher latency and memory — window state is pinned longer before it can be finalized',
                'Still bounded: events later than the grace window are dropped anyway; results may fire multiple times',
              ],
              chooseWhen: 'stragglers are common but arrive within a predictable delay (mobile, IoT); pick a grace window that covers most of the tail.',
            },
            {
              name: 'Restate (reprocess the window)',
              strengths: [
                'Fully correct — the late event is incorporated by recomputing and republishing the affected window',
                'No permanent loss; the record of truth is eventually complete',
              ],
              weaknesses: [
                'Most expensive and complex — needs idempotent backfills and atomic republish so consumers do not see torn results',
                'Downstream numbers change after the fact, which must be communicated',
              ],
              chooseWhen: 'correctness is non-negotiable (finance, billing, compliance); pair with the idempotent backfill pattern from 3.2.3.',
            },
          ]}
          note={
            <>
              These are layered in practice: allow a modest lateness window for the common case, dead-letter or drop the
              rare extreme straggler, and keep a periodic restatement (a nightly full-refresh backfill) as the correctness
              backstop. The dead-letter table is orthogonal — it handles rows that are <em>malformed</em> rather than merely
              late, and both mechanisms exist so a handful of problem rows never fails a run or vanishes unseen.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: route late and invalid rows to a dead-letter table">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will extend an incremental load so that instead of trusting every incoming row, it validates each one —
              routing good rows to the target and late/invalid rows to a <code>dead_letter</code> table with a reason —
              then reports the counts. Work in <code>C:\de-lab\deadletter</code> with <code>uv</code> and{' '}
              <code>duckdb</code>.
            </p>
          }
          steps={[
            {
              title: 'Set up and seed a messy incoming batch',
              body: (
                <>
                  <p>
                    Save <code>seed.py</code>: an <code>incoming</code> batch with a mix of valid rows, a negative amount, a
                    null amount, and two events timed before the watermark; plus empty <code>clean</code> and{' '}
                    <code>dead_letter</code> tables. The watermark is fixed at 2026-03-02 00:00.
                  </p>
                  <CodeBlock
                    label="seed.py"
                    code={`import duckdb
con = duckdb.connect("dl.duckdb")
con.execute("CREATE OR REPLACE TABLE incoming (id INTEGER, event_time TIMESTAMP, amount DOUBLE)")
con.execute("""INSERT INTO incoming VALUES
  (1, TIMESTAMP '2026-03-02 09:00', 50.0),
  (2, TIMESTAMP '2026-03-02 09:05', -5.0),
  (3, TIMESTAMP '2026-03-01 08:00', 30.0),
  (4, TIMESTAMP '2026-03-02 09:10', NULL),
  (5, TIMESTAMP '2026-03-02 09:15', 20.0),
  (6, TIMESTAMP '2026-03-01 23:30', 15.0)""")
con.execute("CREATE OR REPLACE TABLE clean (id INTEGER, event_time TIMESTAMP, amount DOUBLE)")
con.execute("CREATE OR REPLACE TABLE dead_letter (id INTEGER, event_time TIMESTAMP, amount DOUBLE, reason TEXT)")
print("seeded", con.execute("SELECT count(*) FROM incoming").fetchone()[0], "incoming rows")`}
                  />
                </>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\deadletter; cd C:\\de-lab\\deadletter\nuv init --bare\nuv add duckdb\nuv run python seed.py',
                  bash: 'mkdir -p ~/de-lab/deadletter && cd ~/de-lab/deadletter\nuv init --bare\nuv add duckdb\nuv run python seed.py',
                },
              ],
              checkpoint: (
                <>
                  Prints <code>seeded 6 incoming rows</code> and creates <code>dl.duckdb</code>.
                </>
              ),
            },
            {
              title: 'Write the routing load and run it',
              body: (
                <>
                  <p>
                    Save <code>route.py</code>: valid rows (positive, non-null amount, at or after the watermark) go to{' '}
                    <code>clean</code>; everything else goes to <code>dead_letter</code> with a reason. Print the split and
                    the dead-letter breakdown by reason.
                  </p>
                  <CodeBlock
                    label="route.py"
                    code={`import duckdb
con = duckdb.connect("dl.duckdb")
WM = "TIMESTAMP '2026-03-02 00:00'"
valid = f"amount IS NOT NULL AND amount > 0 AND event_time >= {WM}"
con.execute(f"INSERT INTO clean SELECT id, event_time, amount FROM incoming WHERE {valid}")
con.execute(f"""INSERT INTO dead_letter
  SELECT id, event_time, amount,
    CASE WHEN amount IS NULL OR amount <= 0 THEN 'bad_amount'
         WHEN event_time < {WM} THEN 'late'
         ELSE 'unknown' END
  FROM incoming WHERE NOT ({valid})""")
c = con.execute("SELECT count(*) FROM clean").fetchone()[0]
d = con.execute("SELECT count(*) FROM dead_letter").fetchone()[0]
print(f"clean={c}  dead_letter={d}")
for reason, n in con.execute("SELECT reason, count(*) FROM dead_letter GROUP BY reason ORDER BY reason").fetchall():
    print(f"  {reason}: {n}")`}
                  />
                  <RevealSolution label="Predict the split before running">
                    <p>
                      Rows 1 and 5 are clean (2). Rows 2 and 4 fail on amount (<code>bad_amount</code>); rows 3 and 6 are
                      before the watermark (<code>late</code>). So <code>clean=2, dead_letter=4</code>, with{' '}
                      <code>bad_amount: 2</code> and <code>late: 2</code>. The batch did not crash on the null or the
                      negative — that is the whole point of routing rather than asserting.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run python route.py' }],
              checkpoint: (
                <>
                  Prints <strong>clean=2 dead_letter=4</strong>, then <code>bad_amount: 2</code> and <code>late: 2</code>.
                  No crash, nothing lost — good rows through, problem rows quarantined with a reason.
                </>
              ),
            },
            {
              title: 'Reprocess the late rows with an allowed-lateness grace window',
              body: (
                <>
                  <p>
                    A grace window of a few hours would have admitted the 23:30 straggler (row 6) that arrived just before
                    the watermark. Save <code>rescue.py</code>: pull rows from the dead-letter table whose only sin was
                    lateness and that fall within a 6-hour allowed-lateness window, move them to <code>clean</code>, and
                    remove them from quarantine.
                  </p>
                  <CodeBlock
                    label="rescue.py"
                    code={`import duckdb
con = duckdb.connect("dl.duckdb")
# allowed lateness: admit 'late' rows whose event_time is within 6h before the watermark
grace = "TIMESTAMP '2026-03-02 00:00' - INTERVAL 6 HOUR"
con.execute(f"""INSERT INTO clean
  SELECT id, event_time, amount FROM dead_letter
  WHERE reason = 'late' AND event_time >= {grace}""")
con.execute(f"""DELETE FROM dead_letter
  WHERE reason = 'late' AND event_time >= {grace}""")
c = con.execute("SELECT count(*) FROM clean").fetchone()[0]
d = con.execute("SELECT count(*) FROM dead_letter").fetchone()[0]
print(f"after rescue: clean={c}  dead_letter={d}")`}
                  />
                  <RevealSolution label="Which straggler comes back?">
                    <p>
                      Row 6 (23:30 on 03-01) is within 6 hours of the 00:00 watermark, so it is rescued into{' '}
                      <code>clean</code>. Row 3 (08:00 on 03-01) is 16 hours early — outside the grace window — so it stays
                      in the dead-letter table. Result: <code>clean=3, dead_letter=3</code> (bad_amount: 2, late: 1). That
                      is allowed lateness in action: a tunable grace window recovers the near-misses and drops the extreme
                      stragglers.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run python rescue.py' }],
              checkpoint: (
                <>
                  Prints <strong>after rescue: clean=3 dead_letter=3</strong>. The 23:30 straggler was admitted by the
                  6-hour grace window; the 08:00 one stayed quarantined. Widen the interval to 24 hours and re-seed to see
                  both come back.
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
              q: 'What makes a data row "late"?',
              options: [
                'It is larger than the other rows',
                'Its event-time is behind the current watermark when it arrives — the window it belongs to may already be closed',
                'It was inserted with the wrong SQL syntax',
                'It has a null primary key',
              ],
              answer: 1,
              explain: 'Lateness is about event-time vs the watermark. A row is late when the pipeline has already advanced past its event-time (window possibly closed) by the time it shows up — caused by offline devices, retries, and network delay.',
            },
            {
              q: 'What is a dead-letter table (or queue) for?',
              options: [
                'Storing the fastest-arriving rows',
                'Quarantining records that cannot be processed (bad types, failed validation, poison messages) with a reason, so the batch neither crashes nor silently drops them',
                'Backing up the whole database nightly',
                'Holding the watermark value',
              ],
              answer: 1,
              explain: 'Dead-lettering routes unprocessable rows to a side table tagged with why they failed. Good rows flow on, nothing is lost, and the reason column doubles as a data-quality signal.',
            },
            {
              q: 'What does "allowed lateness" (a grace window) do?',
              options: [
                'Deletes late rows faster',
                'Holds window state for a period past the watermark so stragglers arriving within that window can still update the result',
                'Disables the watermark',
                'Converts event-time to processing-time',
              ],
              answer: 1,
              explain: 'Allowed lateness retains a window’s state for a grace period beyond the watermark, admitting near-miss stragglers at the cost of held memory and possibly re-firing the result. Events later than the window are still dropped.',
            },
            {
              q: 'A single malformed message keeps crashing your streaming consumer and it never advances. What pattern fixes this?',
              options: [
                'Increase the batch size',
                'Route the poison message to a dead-letter queue and commit the offset, so the consumer makes progress while preserving the failed payload',
                'Delete the whole topic',
                'Retry it forever',
              ],
              answer: 1,
              explain: 'Without a dead-letter path a poison message blocks the partition and retries infinitely. Dead-lettering it and advancing the offset lets the group progress while keeping the payload for forensics.',
            },
            {
              q: 'Which late-data policy is appropriate for billing or compliance data?',
              options: [
                'Drop late rows — simplest',
                'Restate: incorporate the late event by recomputing and republishing the affected window (with idempotent backfills)',
                'Ignore the watermark entirely',
                'Convert everything to processing-time',
              ],
              answer: 1,
              explain: 'Financial/compliance data cannot silently lose events, so you restate — reprocess and republish the window atomically. Dropping is unacceptable; a bounded grace window helps but only restatement guarantees eventual completeness.',
            },
            {
              q: 'Why is a "reason" column valuable on the dead-letter table?',
              options: [
                'It makes queries faster',
                'It turns the quarantine into a triage queue and data-quality dashboard — a spike in one reason (e.g. schema_mismatch) warns you before downstream reports break',
                'It is required by SQL',
                'It replaces the primary key',
              ],
              answer: 1,
              explain: 'Tagging each quarantined row with why it failed lets you monitor, alert on anomalies, and decide whether to reprocess or discard. A sudden rise in a reason code is an early warning of a source change or upstream bug.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do you handle late-arriving data in a pipeline?',
            a: (
              <p>
                First separate event-time from processing-time so &quot;late&quot; is even definable — a row is late when
                its event-time is behind the watermark on arrival. Then pick a policy by stakes: drop with a logged count
                for rough, low-stakes aggregates; allow a bounded lateness grace window to admit common stragglers (mobile,
                IoT) at the cost of held state; or restate — recompute and atomically republish the affected window — when
                correctness is non-negotiable, like billing. In practice I layer them: a modest grace window for the common
                case plus a periodic full-refresh backfill as the correctness backstop.
              </p>
            ),
          },
          {
            q: 'What is a dead-letter queue and when do you reach for one?',
            a: (
              <p>
                It is a side channel for records that cannot be processed — failed validation, type errors, schema
                violations, poison messages. Instead of crashing the batch or silently dropping the row, you route it to a
                dead-letter table/topic tagged with a reason and the original payload, and let the good rows continue. I
                reach for it whenever a single bad record could otherwise fail a whole run or block a streaming consumer.
                The dead-letter volume by reason is also one of my primary data-quality alerts.
              </p>
            ),
          },
          {
            q: 'Explain the trade-off in choosing an allowed-lateness window.',
            a: (
              <p>
                A larger window captures more stragglers (higher completeness) but pins window state in memory longer
                (higher cost and latency) and increases the chance of re-firing an already-published result, which forces
                downstream to handle refinements idempotently. Too small and you drop recoverable events; too large and you
                never finalize and you pay for retained state. I size it to cover the bulk of the observed lateness
                distribution — enough to catch most stragglers without holding state indefinitely — and dead-letter or drop
                the rare extreme tail.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Late data is an event whose event-time is behind the watermark when it arrives; it only exists once you separate event-time (when it happened) from processing-time (when you saw it).</>,
          <>Three honest policies for late rows: drop (simple, silently incomplete), allow a bounded lateness grace window (tunable completeness vs memory), or restate the window (fully correct, most expensive).</>,
          <>Dead-lettering routes unprocessable rows (bad types, failed validation, poison messages) to a side table with a reason, so a few bad rows never crash the batch and never vanish unseen.</>,
          <>The reason column makes the dead-letter table a triage queue and data-quality dashboard; monitor its volume and alert on spikes before downstream reports break.</>,
          <>In streaming, dead-lettering a poison message and committing the offset lets the consumer make progress instead of blocking the partition and retrying forever.</>,
          <>Allowed lateness trades completeness against retained state and result stability; size it to cover most of the observed lateness, and keep restatement as the correctness backstop for high-stakes data.</>,
        ]}
      />
    </>
  )
}
