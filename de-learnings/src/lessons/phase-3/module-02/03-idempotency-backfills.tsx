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
import { RetryBackoffViz } from '../../../viz/RetryBackoffViz'

const ID = '3.2.3'

// The SAME batch applied twice with a plain INSERT — rows double.
const APPEND_TWICE = `CREATE OR REPLACE TABLE loads (day DATE, city TEXT, revenue DOUBLE);
INSERT INTO loads VALUES (DATE '2026-03-01', 'Chennai', 100.0), (DATE '2026-03-01', 'Berlin', 80.0);
INSERT INTO loads VALUES (DATE '2026-03-01', 'Chennai', 100.0), (DATE '2026-03-01', 'Berlin', 80.0);`

// The SAME batch applied twice with an upsert — no change on the second apply.
const UPSERT_TWICE = `CREATE OR REPLACE TABLE loads (day DATE, city TEXT, revenue DOUBLE, PRIMARY KEY (day, city));
INSERT INTO loads VALUES (DATE '2026-03-01', 'Chennai', 100.0), (DATE '2026-03-01', 'Berlin', 80.0)
  ON CONFLICT (day, city) DO UPDATE SET revenue = excluded.revenue;
INSERT INTO loads VALUES (DATE '2026-03-01', 'Chennai', 100.0), (DATE '2026-03-01', 'Berlin', 80.0)
  ON CONFLICT (day, city) DO UPDATE SET revenue = excluded.revenue;`

// Delete-insert by partition: reprocess one day cleanly, leave others untouched.
const DELETE_INSERT = `CREATE OR REPLACE TABLE daily (day DATE, city TEXT, revenue DOUBLE);
INSERT INTO daily VALUES
  (DATE '2026-03-01', 'Chennai', 100.0), (DATE '2026-03-01', 'Berlin', 80.0),
  (DATE '2026-03-02', 'Chennai', 110.0);
-- reprocess 2026-03-01 (a correction arrived): drop the whole day, re-insert it fresh
DELETE FROM daily WHERE day = DATE '2026-03-01';
INSERT INTO daily VALUES (DATE '2026-03-01', 'Chennai', 105.0), (DATE '2026-03-01', 'Berlin', 80.0);`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Every pipeline runs twice eventually — make that safe">
        <p>
          A job times out and the scheduler retries it. A network blip makes a write ambiguous, so it is sent again. You
          discover a bug and re-run last month to fix the numbers. In all three cases the same load runs more than once
          over the same data — and unless you designed for it, the result is doubled revenue, duplicated rows, and a very
          bad morning. <GlossaryTerm k="idempotency">Idempotency</GlossaryTerm> is the property that makes re-running
          harmless: run it once or five times, the end state is identical.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think of an elevator call button. You press it, it lights up, the elevator is coming. Press it five more
                times out of impatience and nothing changes — the elevator still arrives once. The button is{' '}
                <em>idempotent</em>: extra presses have no extra effect. Contrast a &quot;dispense one coin&quot; lever that
                pays out every single time you pull it — pull it five times and you get five coins. That one is dangerous
                to touch twice.
              </p>
              <p>
                Data pipelines get bumped constantly — retries, restarts, re-runs. You want them built like the elevator
                button, not the coin lever. Then a retry after a crash is a shrug instead of a disaster, and re-running
                last week to fix a bug simply corrects the numbers instead of doubling them.
              </p>
            </>
          }
          student={
            <>
              <p>
                A write is idempotent if applying it N times leaves the same state as applying it once. A plain{' '}
                <code>INSERT</code> is <em>not</em>: run it twice and you get two copies. The fixes are all about giving
                each logical record a stable identity so a re-apply overwrites rather than accumulates:{' '}
                <strong>upsert/MERGE</strong> keyed on a natural key, <strong>delete-insert by partition</strong> (drop the
                day/hour, rewrite it), or <strong>deterministic keys</strong> so duplicates collide instead of stacking.
              </p>
              <p>
                Idempotency is what makes retries and <GlossaryTerm k="backfill">backfills</GlossaryTerm> safe. A backfill
                is reprocessing history — re-running a pipeline over a past date range to fix a bug, fill a gap, or apply
                new logic. If each partition&apos;s load is idempotent, a backfill is just &quot;run these dates again&quot;
                with zero fear of duplication. If it is not, a backfill is a minefield you defuse by hand.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Formally an operation <code>f</code> is idempotent when <code>f(f(x)) = f(x)</code>. In a pipeline the
                relevant <code>f</code> is &quot;apply this batch to the target,&quot; and the standard techniques make it
                idempotent by construction: an upsert keyed on a primary key is a set write (last-writer-wins per key);
                delete-insert-by-partition is a transactional overwrite of a bounded key range; and a{' '}
                <em>deterministic</em> record id (a hash of the natural key, or a source LSN/offset) lets the sink dedup.
                Note that append with a unique id is idempotent only if the sink enforces the constraint — otherwise you
                have merely made duplicates <em>detectable</em>, not absent.
              </p>
              <p>
                Idempotency is also how &quot;exactly-once&quot; is actually delivered in practice. End-to-end
                exactly-once is expensive (distributed transactions, two-phase commit); the cheaper and far more common
                design is <em>at-least-once delivery + idempotent apply</em>, which is observationally exactly-once at the
                sink. The idempotency key must be stable across retries and independent of processing time — deriving it
                from wall-clock, a random UUID per attempt, or row arrival order silently breaks the guarantee, because a
                retry generates a different key and the dedup misses.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Feel it: append doubles, upsert doesn't">
        <p>
          Here is the danger in four lines. The setup runs the <em>exact same</em> two-row batch <strong>twice</strong>{' '}
          with a plain <code>INSERT</code> — exactly what a retry or an accidental re-run does. Count the result:
        </p>
        <CodeRunner
          language="sql"
          setup={APPEND_TWICE}
          code={`-- ran the same batch twice with plain INSERT: every row is now doubled
SELECT day, city, COUNT(*) AS copies, SUM(revenue) AS revenue
FROM loads
GROUP BY day, city
ORDER BY city;`}
        />
        <p>
          Two copies of every row, revenue doubled — a silent data-quality catastrophe. Now the same double-apply, but the
          table has a primary key and the write is an <GlossaryTerm k="upsert">upsert</GlossaryTerm> (
          <code>ON CONFLICT DO UPDATE</code>). Run it and count again:
        </p>
        <CodeRunner
          language="sql"
          setup={UPSERT_TWICE}
          code={`-- ran the same batch twice with an upsert: exactly one copy per key, stable
SELECT day, city, COUNT(*) AS copies, SUM(revenue) AS revenue
FROM loads
GROUP BY day, city
ORDER BY city;`}
        />
        <Callout kind="tip" title="The difference is a key and a conflict clause">
          The only change between the two examples is a <code>PRIMARY KEY (day, city)</code> and{' '}
          <code>ON CONFLICT (day, city) DO UPDATE</code>. That is the whole trick: give each logical record a stable
          identity, and tell the database that a repeat of that identity means &quot;replace,&quot; not &quot;add.&quot;
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Retries are why this is not optional">
        <p>
          Idempotency and retries are two halves of one design. Distributed systems retry constantly — a request times out,
          you cannot tell whether it succeeded, so you send it again. The animation below shows retries backing off (each
          wait doubles) so a struggling server is not hammered. But backoff only controls <em>when</em> you retry; whether
          the retry is <em>safe</em> is entirely down to idempotency.
        </p>
        <RetryBackoffViz />
        <Tiered
          layman={
            <>
              <p>
                When you send a letter and get no reply, you do not know if it was lost or just the reply was lost. Send it
                again to be safe — but if the letter is &quot;charge my account $100,&quot; sending twice is a problem.
                Rewrite it as &quot;set my balance to $400&quot; and sending it ten times is fine: the balance ends at $400
                regardless. Idempotency is rewriting your instructions so repeating them is always safe.
              </p>
              <p>
                That is why a retry system and idempotency go together. The retry gives resilience; idempotency makes the
                retry harmless. Neither is enough alone.
              </p>
            </>
          }
          student={
            <>
              <p>
                A retry after an ambiguous failure is <GlossaryTerm k="idempotency">at-least-once</GlossaryTerm> by nature:
                you might apply the same write twice. If the write is idempotent, that is fine — the duplicate apply is a
                no-op. If it is not, every retry is a chance to duplicate data. This is why you cannot bolt retries onto a
                pipeline that appends: you would be trading transient failures for permanent data corruption.
              </p>
              <p>
                <GlossaryTerm k="exponential-backoff">Exponential backoff</GlossaryTerm> with jitter (the viz) decides the
                timing; idempotent apply decides the safety. Design both: retries so a blip does not fail the run, and
                idempotency so those retries cannot double-write. You built backoff intuition around transient errors; here
                it pairs with the write pattern that makes retrying free.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The link is delivery semantics. A network partition makes the outcome of a write unknowable to the sender,
                so any at-least-once transport must retry, which means the sink <em>will</em> occasionally see duplicates.
                The only way to keep at-least-once transport from corrupting state is an idempotent sink: dedup on a stable
                key, or a set-write (upsert/overwrite) whose repeated application is a fixed point. This is precisely how
                Kafka&apos;s idempotent producer, exactly-once sinks, and Spark&apos;s output-commit protocols work — the
                transport stays at-least-once and the sink absorbs the duplicates.
              </p>
              <p>
                The failure mode to internalize: an idempotency key that varies per attempt (a fresh UUID, a timestamp)
                defeats the whole scheme, because the retry looks like a new record. The key must be a deterministic
                function of the data or the source position (offset/LSN), not of the attempt. Get that wrong and you have
                the illusion of exactly-once with the reality of at-least-once.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Delete-insert by partition, and what a backfill is">
        <p>
          Upsert is not the only idempotent write. When you reprocess a whole time slice — a day, an hour — the cleanest
          pattern is <strong>delete-insert by partition</strong>: delete the target rows for that slice, then insert the
          freshly computed rows for it. Re-running reprocesses the same slice to the same result, and never touches other
          slices. Below, day <code>2026-03-01</code> is reprocessed (a correction bumped Chennai to 105) while{' '}
          <code>2026-03-02</code> is left alone:
        </p>
        <CodeRunner
          language="sql"
          setup={DELETE_INSERT}
          code={`-- 2026-03-01 was reprocessed cleanly; 2026-03-02 untouched; no duplicates anywhere
SELECT day, COUNT(*) AS rows, SUM(revenue) AS revenue
FROM daily
GROUP BY day
ORDER BY day;`}
        />
        <Tiered
          layman={
            <>
              <p>
                A <GlossaryTerm k="backfill">backfill</GlossaryTerm> is going back to redo history. You found a mistake in
                how you totalled last quarter, so you re-run the totals for every day of last quarter with the corrected
                method. Delete-insert makes each day safe to redo: wipe that day&apos;s totals, recompute them, move on.
                Do the whole quarter and you have restated it cleanly, no duplicates, no leftover wrong numbers.
              </p>
            </>
          }
          student={
            <>
              <p>
                Delete-insert-by-partition suits aggregated or file-partitioned targets where you can cheaply drop and
                rewrite a whole slice (a date partition, a Parquet folder). It is often simpler and faster than a row-level
                upsert when the whole slice is recomputed anyway. A <strong>backfill</strong> is then a loop over past
                partitions applying that same idempotent load — reprocessing history to fix a bug, fill a gap after an
                outage, or apply new business logic to old data.
              </p>
              <p>
                The critical property: because each partition load is idempotent, the backfill can run, fail halfway, and
                re-run from the start with no harm. Without idempotency a half-finished backfill leaves a mess of partial
                duplicates that is worse than the bug you set out to fix.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Delete-insert-by-partition is a transactional overwrite of a bounded key range; its idempotency holds as
                long as the delete predicate and the insert&apos;s partition assignment use the <em>same</em> deterministic
                key (the partition column), so re-running targets exactly the rows it wrote. On object stores without
                atomic multi-object operations, the classic hazard is a reader observing the window between delete and
                insert — solved by writing to a new location and atomically swapping (table formats like Iceberg/Delta make
                this a metadata pointer flip), which also gives snapshot isolation for backfills.
              </p>
              <p>
                A <em>restatement</em> is a backfill that changes already-published numbers; the engineering concern shifts
                from &quot;no duplicates&quot; to &quot;consistent visibility&quot; — downstream consumers should see the
                old or new version, never a torn mix. That is why serious platforms backfill into a shadow table/partition
                and cut over atomically, rather than mutating live partitions in place.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Append vs upsert vs delete-insert-by-partition">
        <p>
          Three ways to write to a target, three idempotency stories. The right one depends on whether you have a stable
          key, how much of a slice you recompute at once, and whether the sink supports upserts at all.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Append (plain INSERT)',
              strengths: [
                'Simplest and fastest write — no keys, no conflict handling, no read-before-write',
                'Perfect for immutable event logs where every row is a distinct fact that should never be updated',
              ],
              weaknesses: [
                'Not idempotent — a retry or re-run duplicates rows silently',
                'Cannot express updates or corrections; deletes are impossible',
              ],
              chooseWhen: 'the data is append-only and immutable (raw event/audit logs), and de-duplication happens later downstream.',
            },
            {
              name: 'Upsert / MERGE (keyed)',
              strengths: [
                'Idempotent per key — re-applying a row overwrites, never duplicates',
                'Handles inserts and updates in one statement; the natural partner of watermark loads',
              ],
              weaknesses: [
                'Requires a stable natural/primary key and sink support for upserts',
                'Row-level; can be slower than a bulk overwrite when you recompute a whole slice anyway',
              ],
              chooseWhen: 'you have a reliable key and are applying a delta of changed rows — the default for incremental loads into a warehouse.',
            },
            {
              name: 'Delete-insert by partition',
              strengths: [
                'Idempotent per slice — reprocessing a day/hour yields the same result, other slices untouched',
                'Great for aggregates and file-partitioned lakes; fast bulk rewrite, no per-row key needed',
              ],
              weaknesses: [
                'Rewrites the whole partition even for a one-row change — wasteful for tiny edits',
                'On non-atomic stores, readers can glimpse the delete/insert gap unless you swap atomically',
              ],
              chooseWhen: 'you recompute whole time slices (daily aggregates, partitioned Parquet) and want simple, robust backfills.',
            },
          ]}
          note={
            <>
              These compose: raw layers often append immutable events, while curated/aggregate layers upsert or
              delete-insert to stay idempotent and restatable. The question to ask of any load is simply: &quot;if this
              runs twice, is the result identical?&quot; If you cannot answer yes, you cannot safely retry it or backfill
              with it.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: run it three times, then backfill a date range">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will build a per-day aggregate load using delete-insert-by-partition, run it three times to prove the
              row count never drifts, then backfill a whole date range with the same idempotent logic. Work in{' '}
              <code>C:\de-lab\idempotent</code> with <code>uv</code> and the <code>duckdb</code> package.
            </p>
          }
          steps={[
            {
              title: 'Set up and seed raw events across three days',
              body: (
                <>
                  <p>
                    Create the project, add DuckDB, and save <code>seed.py</code> — a <code>raw</code> events table
                    spanning 2026-03-01 to 03-03 and an empty <code>daily_rev</code> aggregate target.
                  </p>
                  <CodeBlock
                    label="seed.py"
                    code={`import duckdb
con = duckdb.connect("wh.duckdb")
con.execute("CREATE OR REPLACE TABLE raw (day DATE, city TEXT, amount DOUBLE)")
con.execute("""INSERT INTO raw VALUES
  (DATE '2026-03-01','Chennai', 60.0), (DATE '2026-03-01','Chennai', 40.0), (DATE '2026-03-01','Berlin', 80.0),
  (DATE '2026-03-02','Chennai', 55.0), (DATE '2026-03-02','Berlin', 30.0),
  (DATE '2026-03-03','Chennai', 90.0), (DATE '2026-03-03','Berlin', 20.0), (DATE '2026-03-03','Berlin', 25.0)""")
con.execute("CREATE OR REPLACE TABLE daily_rev (day DATE, city TEXT, revenue DOUBLE)")
print("seeded", con.execute("SELECT count(*) FROM raw").fetchone()[0], "raw rows")`}
                  />
                </>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\idempotent; cd C:\\de-lab\\idempotent\nuv init --bare\nuv add duckdb\nuv run python seed.py',
                  bash: 'mkdir -p ~/de-lab/idempotent && cd ~/de-lab/idempotent\nuv init --bare\nuv add duckdb\nuv run python seed.py',
                },
              ],
              checkpoint: (
                <>
                  Prints <code>seeded 8 raw rows</code> and creates <code>wh.duckdb</code>.
                </>
              ),
            },
            {
              title: 'Write an idempotent per-day load; run it THREE times',
              body: (
                <>
                  <p>
                    Save <code>load_day.py</code>. It takes a day as an argument, deletes that day from{' '}
                    <code>daily_rev</code>, then inserts the freshly aggregated rows for it — delete-insert by partition.
                    Run it for the same day three times in a row.
                  </p>
                  <CodeBlock
                    label="load_day.py"
                    code={`import duckdb, sys
day = sys.argv[1]
con = duckdb.connect("wh.duckdb")
con.execute("DELETE FROM daily_rev WHERE day = ?", [day])
con.execute("""INSERT INTO daily_rev
  SELECT day, city, sum(amount) AS revenue
  FROM raw WHERE day = ? GROUP BY day, city""", [day])
n = con.execute("SELECT count(*) FROM daily_rev").fetchone()[0]
print(f"loaded {day}: daily_rev now {n} rows total")`}
                  />
                  <RevealSolution label="What the three runs prove">
                    <p>
                      All three runs print <code>daily_rev now 2 rows total</code> — 2026-03-01 has two cities. The count
                      does not climb to 4 or 6 on re-runs, because each run first deletes the day it is about to write. A
                      plain <code>INSERT</code> without the delete would have printed 2, then 4, then 6. That stable count
                      under repetition is idempotency you can see.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                { ps: 'uv run python load_day.py 2026-03-01\nuv run python load_day.py 2026-03-01\nuv run python load_day.py 2026-03-01' },
              ],
              checkpoint: (
                <>
                  All three runs print <strong>daily_rev now 2 rows total</strong> — identical every time. Re-running the
                  same load never duplicates.
                </>
              ),
            },
            {
              title: 'Backfill the whole date range',
              body: (
                <>
                  <p>
                    Save <code>backfill.py</code>: loop over 2026-03-01 through 03-03, applying the same idempotent
                    delete-insert per day. This is a backfill — reprocessing a history range with an idempotent load.
                  </p>
                  <CodeBlock
                    label="backfill.py"
                    code={`import duckdb, datetime
con = duckdb.connect("wh.duckdb")
d, end = datetime.date(2026, 3, 1), datetime.date(2026, 3, 3)
while d <= end:
    day = d.isoformat()
    con.execute("DELETE FROM daily_rev WHERE day = ?", [day])
    con.execute("""INSERT INTO daily_rev
      SELECT day, city, sum(amount) FROM raw WHERE day = ? GROUP BY day, city""", [day])
    print("backfilled", day)
    d += datetime.timedelta(days=1)
total = con.execute("SELECT count(*) FROM daily_rev").fetchone()[0]
print("done; daily_rev has", total, "rows")`}
                  />
                </>
              ),
              commands: [
                { ps: 'uv run python backfill.py', label: 'first backfill' },
                { ps: 'uv run python backfill.py', label: 'run it AGAIN — still safe' },
              ],
              checkpoint: (
                <>
                  Both runs print three <code>backfilled ...</code> lines and end with{' '}
                  <strong>daily_rev has 6 rows</strong> — two cities (Chennai, Berlin) on each of the three days. Running
                  the backfill a second time yields the <em>same</em> total, not 12 — a repeated or half-finished backfill
                  never corrupts the target. That is the payoff of idempotent partition loads.
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
              q: 'A load is "idempotent" when...',
              options: [
                'it runs faster the second time',
                'applying it N times leaves the same target state as applying it once',
                'it never fails',
                'it only ever inserts rows',
              ],
              answer: 1,
              explain: 'Idempotency means repeated application has no additional effect — like an elevator button. Run it once or five times, the end state is identical, which is what makes retries and backfills safe.',
            },
            {
              q: 'Your nightly job appends with a plain INSERT. The scheduler retries it after a timeout. What is the likely result?',
              options: [
                'Nothing — INSERT is idempotent',
                'The rows from that run are duplicated, silently doubling counts and sums',
                'The job errors and rolls back automatically',
                'The watermark resets',
              ],
              answer: 1,
              explain: 'A plain INSERT is not idempotent. A retry re-applies the same batch, creating a second copy of every row. Use an upsert or delete-insert so a re-run overwrites instead of accumulating.',
            },
            {
              q: 'Which change turns a duplicating INSERT into an idempotent write?',
              options: [
                'Adding an ORDER BY',
                'Giving the table a key and using ON CONFLICT DO UPDATE (or MERGE) so repeats overwrite',
                'Running it during off-hours',
                'Increasing the timeout',
              ],
              answer: 1,
              explain: 'A stable key plus a conflict/merge clause makes a repeated row replace the existing one rather than add a new copy. That is the minimal change from "append" to "idempotent apply".',
            },
            {
              q: 'What is a backfill?',
              options: [
                'Deleting old data to save space',
                'Reprocessing a past date range — to fix a bug, fill a gap, or apply new logic to historical data',
                'A type of database index',
                'The first load of a brand-new table only',
              ],
              answer: 1,
              explain: 'A backfill re-runs a pipeline over history. It is only safe if each partition load is idempotent, so the backfill can fail halfway and re-run without leaving partial duplicates.',
            },
            {
              q: 'Why must an idempotency (dedup) key be deterministic — not a fresh UUID or timestamp per attempt?',
              options: [
                'UUIDs are too long',
                'A retry generates a different key, so the sink sees it as a new record and the dedup misses — duplicates return',
                'Timestamps are not supported as keys',
                'Deterministic keys are faster to hash',
              ],
              answer: 1,
              explain: 'The key must be a function of the data or source position (offset/LSN), stable across retries. If each attempt invents a new key, the duplicate looks new and slips through — the illusion of exactly-once with the reality of at-least-once.',
            },
            {
              q: 'You recompute whole daily aggregates and want simple, safe backfills. Which write pattern fits best?',
              options: [
                'Append every run',
                'Delete-insert by partition — drop the day, re-insert its freshly computed rows',
                'A random sample overwrite',
                'Never write twice',
              ],
              answer: 1,
              explain: 'When you recompute an entire slice, delete-insert-by-partition is idempotent per slice and cheap in bulk: re-running a day yields the same result and leaves other days untouched. Upsert shines for row-level deltas instead.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What does idempotency mean in a data pipeline, and why do you care?',
            a: (
              <p>
                It means running the same load once or many times leaves the target in the same state. I care because
                pipelines are re-run constantly — scheduler retries after timeouts, restarts after crashes, and backfills to
                fix bugs. Without idempotency each of those re-runs risks duplicating data. I achieve it with upserts/MERGE
                keyed on a natural key, delete-insert by partition for recomputed slices, or deterministic record ids for
                dedup. The test I apply to any load is: &quot;if this runs twice, is the result identical?&quot;
              </p>
            ),
          },
          {
            q: 'How do retries and idempotency relate to exactly-once processing?',
            a: (
              <p>
                Retries are inherently at-least-once: after an ambiguous failure you re-send, so the sink may see a write
                twice. True end-to-end exactly-once is expensive (distributed transactions). The common, cheaper design is
                at-least-once delivery plus an idempotent sink — dedup on a stable key or a set-write (upsert/overwrite) —
                which is observationally exactly-once. The catch is the key must be deterministic across attempts; a
                per-attempt UUID or timestamp breaks it.
              </p>
            ),
          },
          {
            q: 'You need to reprocess three months of data with corrected logic. How do you do it safely?',
            a: (
              <p>
                A backfill over idempotent partition loads. I&apos;d loop the date range applying delete-insert (or upsert)
                per partition so each day is recomputed cleanly and the job can fail and resume without duplicating. For a
                restatement that changes published numbers, I&apos;d backfill into a shadow table/partition and swap
                atomically so consumers never see a torn mix of old and new. And I&apos;d verify a couple of partitions
                against the old output before cutting over.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Idempotency means running a load N times yields the same state as running it once — the elevator-button property that makes retries and backfills safe.</>,
          <>A plain INSERT is not idempotent: a retry or re-run duplicates rows. Give each record a stable identity so a repeat overwrites instead of accumulating.</>,
          <>The three idempotent write patterns: upsert/MERGE keyed on a natural key, delete-insert by partition for recomputed slices, and deterministic ids for dedup.</>,
          <>Retries are at-least-once by nature; they are safe only over an idempotent sink. "Exactly-once" in practice usually means at-least-once delivery plus idempotent apply.</>,
          <>A backfill is reprocessing history; it is safe to fail and re-run only when each partition load is idempotent — otherwise a half-finished backfill leaves partial duplicates.</>,
          <>The one question to ask of any load: "if this runs twice, is the result identical?" If not, you cannot safely retry or backfill it.</>,
        ]}
      />
    </>
  )
}
