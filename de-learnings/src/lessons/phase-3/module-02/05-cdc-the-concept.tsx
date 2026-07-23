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
import { GitGraph3D } from '../../../viz/GitGraph3D'
import type { GitStep } from '../../../viz/GitGraph3D'

const ID = '3.2.5'

// A prior full capture, then the operational DB changes: id 2 updated, id 3
// HARD-DELETED. Query-based polling will see the update but never the delete.
const CDC_SETUP = `CREATE OR REPLACE TABLE source AS SELECT * FROM (VALUES
  (1, 'Ana', 50.0, TIMESTAMP '2026-03-01 09:00'),
  (2, 'Bo',  20.0, TIMESTAMP '2026-03-01 10:00'),
  (3, 'Cy',  75.0, TIMESTAMP '2026-03-01 11:00')
) AS t(id, customer, amount, updated_at);
CREATE OR REPLACE TABLE captured AS SELECT * FROM source;
UPDATE source SET amount = 25.0, updated_at = TIMESTAMP '2026-03-02 08:00' WHERE id = 2;
DELETE FROM source WHERE id = 3;`

// The WAL as an ordered change-log: each commit is one row-level change, in
// commit order. The DELETE is the entry query-based CDC can never see.
const WAL_LOG: GitStep[] = [
  { kind: 'commit', branch: 'wal', msg: 'INSERT customer#1 Ana', note: 'The write-ahead log records every row change in commit order, before it is even applied to the table files. It is the database’s own source of truth — and what log-based CDC reads.' },
  { kind: 'commit', branch: 'wal', msg: 'INSERT customer#2 Bo', note: 'Every INSERT is a log entry with the new row image. A CDC reader turns each entry into a change event on a stream.' },
  { kind: 'commit', branch: 'wal', msg: 'UPDATE customer#2 amount 20→25', note: 'An UPDATE is a log entry carrying the new values (and, if configured, the old ones). Query-based polling can catch this too — because updated_at moved.' },
  { kind: 'commit', branch: 'wal', msg: 'DELETE customer#3 Cy', note: 'A DELETE is ALSO a log entry — the exact event query-based polling misses, because the row simply vanishes from the table. Only the log still remembers it happened.' },
  { kind: 'commit', branch: 'wal', msg: 'INSERT customer#4 Di', note: 'The log keeps advancing. A CDC consumer tracks its position (an LSN/offset) so it resumes exactly where it left off after a restart.' },
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Polling a table can't tell you what left it">
        <p>
          Your watermark load (3.2.2) reads the source by polling: &quot;give me rows changed since last time.&quot; It is
          simple and it works — until a row is <em>deleted</em>. A delete removes the row from the source entirely, so a
          poll can never see it: there is nothing left to select. Your warehouse keeps a ghost copy forever.{' '}
          <GlossaryTerm k="change-data-capture">Change data capture</GlossaryTerm> (CDC) is the family of techniques for
          capturing every row-level change — insert, update, <em>and</em> delete — as it happens at the source.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Suppose you keep a copy of a friend&apos;s address book by occasionally asking &quot;who did you add or
                change lately?&quot; That catches new friends and updated phone numbers. But if they <em>removed</em>
                someone, your question never surfaces it — the person is just gone from their book, and your copy still
                lists them. To stay truly in sync you would need them to tell you every change as they make it:{' '}
                &quot;added Sam, changed Lee&apos;s number, deleted Alex.&quot; That running commentary is CDC.
              </p>
              <p>
                Databases already keep exactly such a commentary for their own safety — a change journal they write before
                touching the real data. CDC just reads that journal. It is how a warehouse can mirror a live database
                within seconds, deletes and all, without hammering it with constant queries.
              </p>
            </>
          }
          student={
            <>
              <p>
                CDC captures inserts, updates, and deletes at the row level from a source database and turns them into a
                stream of change events. There are three strategies. <strong>Query-based</strong> polls a{' '}
                <code>updated_at</code>/version column on a schedule — this is your watermark load, and it cannot see hard
                deletes. <strong>Trigger-based</strong> installs database triggers that write every change to an audit
                table — captures deletes, but adds write overhead to every transaction. <strong>Log-based</strong> reads
                the database&apos;s <GlossaryTerm k="wal">write-ahead log</GlossaryTerm> (Postgres WAL, MySQL binlog) —
                captures everything including deletes, with minimal source load. Tools like Debezium do this.
              </p>
              <p>
                Why CDC instead of periodic full/batch loads? Three reasons: <em>freshness</em> (changes stream in seconds,
                not on a nightly schedule), <em>deletes</em> (the batch/watermark approach misses them), and{' '}
                <em>low source load</em> (log-based reads a log the DB already writes, rather than repeatedly scanning big
                tables). This lesson is the concept; wiring up Debezium is a later, hands-on lesson.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Log-based CDC is <GlossaryTerm k="logical-decoding">logical decoding</GlossaryTerm>: the WAL is a physical
                redo log, and a logical decoding plugin translates its low-level entries back into logical row changes
                (op, table, before/after images) in commit order. In Postgres a <GlossaryTerm k="replication-slot">replication
                slot</GlossaryTerm> gives the consumer a durable cursor and — critically — pins the WAL so the server will
                not recycle log the consumer has not yet acknowledged. That is a double-edged guarantee: a stalled or
                forgotten slot causes unbounded WAL growth and can fill the disk, the classic CDC operational incident.
              </p>
              <p>
                Ordering and delivery are the deep properties. The log imposes a total order (LSN); the consumer tracks its
                offset and, on restart, resumes from the last acknowledged LSN — inherently{' '}
                <GlossaryTerm k="idempotency">at-least-once</GlossaryTerm>, because a crash between emit and ack replays
                events. Exactly-once at the sink therefore still requires idempotent apply keyed on primary key plus LSN, or
                a transactional offset commit — the same lesson-3.2.3 discipline, one layer down. Deletes surface as
                explicit delete events (and, in log-compacted streams like Kafka, as{' '}
                <GlossaryTerm k="tombstone">tombstones</GlossaryTerm> — a key with a null value that also triggers physical
                cleanup).
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="See it fail: query-based CDC misses the delete">
        <p>
          Let us reproduce the exact problem. A prior capture copied all three source rows into <code>captured</code>.
          Then the operational database changed: customer 2&apos;s amount was updated (its <code>updated_at</code> moved
          forward), and customer 3 was <strong>hard-deleted</strong>. Now poll for changes since the last cursor
          (2026-03-01 11:00), just like a watermark load:
        </p>
        <CodeRunner
          language="sql"
          setup={CDC_SETUP}
          code={`-- query-based CDC: poll the source for rows changed since the cursor
SELECT id, customer, amount, updated_at
FROM source
WHERE updated_at > TIMESTAMP '2026-03-01 11:00'
ORDER BY id;`}
        />
        <p>
          Exactly one row comes back: customer 2&apos;s update. The delete of customer 3 is <em>invisible</em> — there is
          no row left in <code>source</code> to select, and no <code>updated_at</code> to compare. So our captured copy
          still holds a ghost. Prove it: which rows exist in <code>captured</code> but no longer in <code>source</code>?
        </p>
        <CodeRunner
          language="sql"
          setup={CDC_SETUP}
          code={`-- the ghost query-based CDC can never remove: deleted at source, still captured
SELECT c.id, c.customer, c.amount
FROM captured c
LEFT JOIN source s ON c.id = s.id
WHERE s.id IS NULL;`}
        />
        <Callout kind="warn" title="This is not a bug you can fix by polling harder">
          No polling frequency catches a delete, because polling can only see what <em>is</em>, never what <em>was</em>.
          The fixes are structural: log-based CDC (read the WAL, which records the delete), a soft-delete flag on the
          source (<code>is_deleted = true</code> instead of a real delete, so the row remains pollable), or a periodic full
          refresh that mirrors the source and thus drops the ghost.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Log-based CDC: read the journal the database already keeps">
        <p>
          The database writes every change to its <GlossaryTerm k="wal">write-ahead log</GlossaryTerm> before applying it —
          for crash recovery. Log-based CDC reads that same log and turns each entry into a change event, in commit order,
          including deletes. Step through the log below: inserts, an update, and the <em>delete</em> that polling missed
          are all just entries in the stream. The white ring is the consumer&apos;s position — its offset — which it
          advances as it processes each change.
        </p>
        <GitGraph3D script={WAL_LOG} />
        <Tiered
          layman={
            <>
              <p>
                Think of a shop&apos;s security-camera tape. It records everything that happens in order — items added to
                shelves, prices changed, items removed. If you want to keep a perfect running inventory somewhere else, you
                do not walk the aisles counting every hour; you watch the tape and apply each event. The write-ahead log is
                that tape, and log-based CDC is watching it.
              </p>
              <p>
                The consumer remembers how far along the tape it has watched. If it goes home and comes back, it resumes
                from that spot — never missing an event, never replaying the whole tape from the start.
              </p>
            </>
          }
          student={
            <>
              <p>
                Each log entry is a change event: an operation (insert/update/delete), the table, and the row image
                (after, and often before). Because the log is ordered and durable, a CDC consumer tracks a position (an
                LSN or offset) and resumes exactly there after a restart. Deletes are first-class entries, which is the
                whole advantage over polling. The source barely notices — it was writing this log anyway; CDC just adds a
                reader.
              </p>
              <p>
                The catch is operational, not conceptual. In Postgres, the reader holds a{' '}
                <GlossaryTerm k="replication-slot">replication slot</GlossaryTerm> that stops the server from deleting WAL
                the reader has not consumed. If your CDC consumer dies and nobody notices, the WAL piles up and can fill
                the source&apos;s disk — a real incident teams hit. Log-based CDC is powerful but not free to run.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The change stream is a materialization of the commit log, so it inherits the log&apos;s total order and its
                transactional boundaries — good implementations emit changes grouped by source transaction so a consumer
                can preserve atomicity. Snapshots and streaming must be stitched: CDC tools take an initial consistent
                snapshot at an LSN, then switch to streaming from that exact LSN, deduping the overlap — the correctness of
                the whole pipeline hinges on that handoff being exactly at the snapshot&apos;s log position.
              </p>
              <p>
                Delete semantics ripple downstream. A hard delete becomes a delete event; in a compacted log (Kafka)
                it is often a <GlossaryTerm k="tombstone">tombstone</GlossaryTerm> (null value for the key) that both
                signals deletion and lets compaction physically reclaim the key. Sinks must apply these idempotently:
                re-applying a delete for an already-absent key must be a no-op, exactly the idempotency property from 3.2.3
                — CDC does not remove the need for idempotent sinks, it makes it mandatory.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Log-based vs query-based vs trigger-based CDC">
        <p>
          Three ways to capture change, with genuinely different operational profiles. The honest axes are: do you catch
          deletes, how fresh is the data, how much load do you add to the source, and how much operational machinery you
          take on.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Log-based (read the WAL / binlog)',
              strengths: [
                'Captures everything — inserts, updates, and deletes — in commit order',
                'Lowest source load: reads a log the database already writes, no table scans',
                'Lowest latency: changes stream in near real-time (the basis of Debezium)',
              ],
              weaknesses: [
                'Most operational machinery: replication slots, connectors, a streaming platform to run and monitor',
                'A stalled consumer can pin WAL and fill the source disk — needs real monitoring',
                'Requires source privileges/config (logical replication enabled)',
              ],
              chooseWhen: 'you need fresh, complete replication (deletes included) of a busy source with minimal load — the production default for real CDC.',
            },
            {
              name: 'Query-based (poll updated_at)',
              strengths: [
                'Dead simple: just a SELECT with a watermark — no special DB privileges or infrastructure',
                'Works against any database with a suitable timestamp/version column',
              ],
              weaknesses: [
                'Cannot see hard deletes — the central flaw',
                'Adds query load and scales poorly on large tables; latency bounded by poll interval',
                'Misses intermediate states between polls; needs a monotonic updated_at (3.2.2 hazards)',
              ],
              chooseWhen: 'a lightweight sync where deletes are rare or soft, infrastructure is limited, and near-real-time is unnecessary.',
            },
            {
              name: 'Trigger-based (audit table via DB triggers)',
              strengths: [
                'Captures deletes and full before/after images, including for databases without accessible logs',
                'Change history lives in the same database, transactionally consistent with the data',
              ],
              weaknesses: [
                'Adds write overhead to every source transaction — triggers fire inline',
                'Invasive: schema changes on the source, triggers to maintain, audit tables to prune',
              ],
              chooseWhen: 'the source lacks log access or you need rich audit history, and the extra per-write cost is acceptable.',
            },
          ]}
          note={
            <>
              The industry has largely converged on log-based CDC for serious replication because it catches deletes with
              minimal source impact — but it is not free: you run and monitor a streaming stack. Query-based polling (your
              watermark load) remains the pragmatic choice for simple syncs where deletes are handled by soft-delete flags
              or a periodic full refresh. Match the mechanism to whether deletes, freshness, and source load actually
              matter for the table in front of you.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: build query-based CDC, then watch it miss a delete">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will build a query-based CDC loop over DuckDB: poll a source by <code>updated_at</code>, upsert changes
              into a captured copy, advance a cursor. Then you will change a row (captured fine) and delete a row (missed),
              seeing firsthand the flaw that log-based CDC exists to fix. Work in <code>C:\de-lab\cdc</code> with{' '}
              <code>uv</code> and <code>duckdb</code>.
            </p>
          }
          steps={[
            {
              title: 'Set up and seed source + captured copy + cursor',
              body: (
                <>
                  <p>
                    Save <code>seed.py</code>: a <code>source</code> table (3 rows), a <code>captured</code> mirror of it,
                    and a <code>meta</code> cursor set to the newest row&apos;s time.
                  </p>
                  <CodeBlock
                    label="seed.py"
                    code={`import duckdb
con = duckdb.connect("cdc.duckdb")
con.execute("CREATE OR REPLACE TABLE source (id INTEGER PRIMARY KEY, customer TEXT, amount DOUBLE, updated_at TIMESTAMP)")
con.execute("""INSERT INTO source VALUES
  (1,'Ana',50.0, TIMESTAMP '2026-03-01 09:00'),
  (2,'Bo', 20.0, TIMESTAMP '2026-03-01 10:00'),
  (3,'Cy', 75.0, TIMESTAMP '2026-03-01 11:00')""")
con.execute("CREATE OR REPLACE TABLE captured (id INTEGER PRIMARY KEY, customer TEXT, amount DOUBLE, updated_at TIMESTAMP)")
con.execute("INSERT INTO captured SELECT * FROM source")
con.execute("CREATE OR REPLACE TABLE meta (cursor TIMESTAMP)")
con.execute("INSERT INTO meta VALUES (TIMESTAMP '2026-03-01 11:00')")
print("seeded; captured has", con.execute("SELECT count(*) FROM captured").fetchone()[0], "rows")`}
                  />
                </>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\cdc; cd C:\\de-lab\\cdc\nuv init --bare\nuv add duckdb\nuv run python seed.py',
                  bash: 'mkdir -p ~/de-lab/cdc && cd ~/de-lab/cdc\nuv init --bare\nuv add duckdb\nuv run python seed.py',
                },
              ],
              checkpoint: (
                <>
                  Prints <code>seeded; captured has 3 rows</code> and creates <code>cdc.duckdb</code>.
                </>
              ),
            },
            {
              title: 'Write the polling CDC loop and run it once (baseline)',
              body: (
                <>
                  <p>
                    Save <code>poll.py</code>: read the cursor, upsert rows changed since it, advance the cursor, and — the
                    telltale — count &quot;ghost&quot; rows still in <code>captured</code> that no longer exist in{' '}
                    <code>source</code>. Run it once now; nothing has changed yet.
                  </p>
                  <CodeBlock
                    label="poll.py"
                    code={`import duckdb
con = duckdb.connect("cdc.duckdb")
cur = con.execute("SELECT cursor FROM meta").fetchone()[0]
changed = con.execute("SELECT count(*) FROM source WHERE updated_at > ?", [cur]).fetchone()[0]
con.execute("""INSERT INTO captured
  SELECT * FROM source WHERE updated_at > ?
  ON CONFLICT (id) DO UPDATE SET
    customer = excluded.customer, amount = excluded.amount, updated_at = excluded.updated_at""", [cur])
new_cur = con.execute("SELECT max(updated_at) FROM source").fetchone()[0]
con.execute("UPDATE meta SET cursor = ?", [new_cur])
ghosts = con.execute(
    "SELECT count(*) FROM captured c LEFT JOIN source s ON c.id = s.id WHERE s.id IS NULL"
).fetchone()[0]
print(f"polled: captured {changed} changed rows; cursor -> {new_cur}; ghost rows: {ghosts}")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python poll.py' }],
              checkpoint: (
                <>
                  Prints <code>polled: captured 0 changed rows; cursor -&gt; 2026-03-01 11:00:00; ghost rows: 0</code>.
                  Nothing changed since the cursor, so nothing captured, and no ghosts — the mirror is in sync.
                </>
              ),
            },
            {
              title: 'Update a row — polling catches it',
              body: (
                <>
                  <p>
                    Save <code>bump.py</code> (update customer 2 with a newer <code>updated_at</code>), then poll again.
                  </p>
                  <CodeBlock
                    label="bump.py"
                    code={`import duckdb
con = duckdb.connect("cdc.duckdb")
con.execute("UPDATE source SET amount = 25.0, updated_at = TIMESTAMP '2026-03-02 08:00' WHERE id = 2")
print("bumped source id 2")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python bump.py\nuv run python poll.py' }],
              checkpoint: (
                <>
                  <code>poll.py</code> prints <strong>captured 1 changed rows</strong> and <code>ghost rows: 0</code>. The
                  update moved <code>updated_at</code> forward, so polling saw it and upserted it. Query-based CDC handles
                  updates perfectly.
                </>
              ),
            },
            {
              title: 'Delete a row — polling misses it',
              body: (
                <>
                  <p>
                    Save <code>del.py</code> (hard-delete customer 3), then poll again and watch the ghost appear.
                  </p>
                  <CodeBlock
                    label="del.py"
                    code={`import duckdb
con = duckdb.connect("cdc.duckdb")
con.execute("DELETE FROM source WHERE id = 3")
print("hard-deleted source id 3")`}
                  />
                  <RevealSolution label="What the ghost count proves">
                    <p>
                      <code>poll.py</code> prints <strong>captured 0 changed rows</strong> (nothing has an{' '}
                      <code>updated_at</code> past the cursor) but <strong>ghost rows: 1</strong> — customer 3 is gone from{' '}
                      <code>source</code> yet still sits in <code>captured</code>, and polling has no way to remove it. This
                      is the delete blindness of query-based CDC, exactly what reading the WAL (log-based CDC) fixes: the
                      delete is an entry in the log even though the row is gone from the table.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'uv run python del.py\nuv run python poll.py' }],
              checkpoint: (
                <>
                  <code>poll.py</code> prints <strong>captured 0 changed rows ... ghost rows: 1</strong>. The deleted
                  customer lingers in <code>captured</code> forever under polling — the motivating failure for log-based
                  CDC.
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
              q: 'What is change data capture (CDC)?',
              options: [
                'A way to back up a database nightly',
                'Capturing row-level changes (inserts, updates, and deletes) from a source database as they happen',
                'A method for compressing tables',
                'A type of database index',
              ],
              answer: 1,
              explain: 'CDC captures every row-level change at the source and turns it into a stream of change events, so a downstream system can stay in sync — including deletes, which polling misses.',
            },
            {
              q: 'Why does query-based CDC (polling updated_at) miss hard deletes?',
              options: [
                'The poll interval is too long',
                'A deleted row is gone from the table, so a SELECT has nothing to return and no updated_at to compare — polling can only see what exists',
                'updated_at is not indexed',
                'It only misses deletes on weekends',
              ],
              answer: 1,
              explain: 'Polling sees the current state of the table. A hard delete removes the row entirely, leaving nothing to select. No polling frequency fixes this — you need the log (which records the delete) or a soft-delete flag.',
            },
            {
              q: 'What does log-based CDC read to capture changes?',
              options: [
                'A random sample of rows',
                'The database’s write-ahead log (Postgres WAL / MySQL binlog), which records every change in commit order',
                'The query cache',
                'The application’s log files',
              ],
              answer: 1,
              explain: 'Log-based CDC reads the WAL/binlog the database already writes for crash recovery, decoding each entry into a change event — inserts, updates, and deletes — with minimal extra load on the source.',
            },
            {
              q: 'Which is a real operational risk specific to log-based CDC on Postgres?',
              options: [
                'It deletes the source table',
                'A stalled or forgotten replication slot pins the WAL, which can grow unbounded and fill the source disk',
                'It requires the database to be offline',
                'It cannot capture inserts',
              ],
              answer: 1,
              explain: 'A replication slot durably tracks the consumer’s position and stops the server from recycling unconsumed WAL. If the consumer dies unmonitored, WAL accumulates and can fill the disk — the classic CDC incident.',
            },
            {
              q: 'What is the main downside of trigger-based CDC?',
              options: [
                'It cannot capture deletes',
                'It adds write overhead to every source transaction and is invasive (schema changes, triggers, audit tables to maintain)',
                'It needs a streaming platform',
                'It has the lowest latency',
              ],
              answer: 1,
              explain: 'Triggers fire inline on every write, so they tax the source’s transactions and require schema/trigger maintenance. They do capture deletes and rich before/after images, which is their upside.',
            },
            {
              q: 'Compared to a nightly full/batch load, what does CDC primarily buy you?',
              options: [
                'Smaller disk usage only',
                'Freshness (changes in seconds), correct handling of deletes, and low source load — instead of scheduled, delete-blind reloads',
                'It removes the need for any warehouse',
                'It eliminates the need for idempotency',
              ],
              answer: 1,
              explain: 'CDC streams changes in near real-time, includes deletes, and (log-based) barely loads the source. Note it does NOT remove the need for idempotent sinks — at-least-once delivery still means you dedup on key/LSN.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is CDC and why would you use it instead of a nightly batch load?',
            a: (
              <p>
                CDC captures row-level inserts, updates, and deletes from a source database as they happen, emitting a
                change stream a downstream system applies. I&apos;d use it over a nightly batch for three reasons:
                freshness (changes arrive in seconds, not once a day), deletes (a batch/watermark load can&apos;t see a
                hard delete — the row just disappears), and low source load (log-based CDC reads the WAL the database
                already writes rather than rescanning big tables). The trade is operational complexity: connectors,
                replication slots, and a streaming stack to run and monitor.
              </p>
            ),
          },
          {
            q: 'Compare log-based, query-based, and trigger-based CDC.',
            a: (
              <p>
                Query-based polls an updated_at/version column — trivially simple, no special infra, but blind to hard
                deletes and bounded by the poll interval. Trigger-based writes every change to an audit table via DB
                triggers — captures deletes and full before/after images, but taxes every write and is invasive to the
                schema. Log-based reads the WAL/binlog — captures everything including deletes, in commit order, with the
                lowest source load and latency, at the cost of the most operational machinery (slots, connectors,
                monitoring). Production replication usually lands on log-based; simple syncs stay query-based.
              </p>
            ),
          },
          {
            q: 'A team runs log-based CDC and the source database disk keeps filling up. What is likely happening?',
            a: (
              <p>
                Almost certainly a replication slot pinning WAL. The slot durably marks how far the CDC consumer has read
                and prevents the server from recycling WAL past that point. If the consumer has stalled, crashed, or was
                left behind, unconsumed WAL accumulates without bound and fills the disk. The fix is to restore or remove
                the lagging consumer/slot and to monitor slot lag and WAL size as first-class metrics — this is the
                signature CDC operational failure.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>CDC captures row-level inserts, updates, and deletes from a source database as they happen, as a stream of change events — most importantly, it captures deletes that polling cannot.</>,
          <>Query-based CDC (polling updated_at — your watermark load) is simple and infra-free but blind to hard deletes: a deleted row leaves nothing to select, so your copy keeps a ghost.</>,
          <>Log-based CDC reads the database’s write-ahead log (Postgres WAL / MySQL binlog) in commit order, capturing everything including deletes with minimal source load — the basis of tools like Debezium.</>,
          <>Trigger-based CDC writes changes to an audit table via DB triggers: captures deletes and rich history, but adds write overhead to every transaction and is invasive.</>,
          <>Log-based CDC’s power has an operational cost: a replication slot pins WAL for the consumer, and a stalled consumer can grow WAL until the source disk fills.</>,
          <>CDC is at-least-once and does not remove the need for idempotent sinks — you still dedup on primary key (and LSN/offset), applying deletes idempotently, exactly the 3.2.3 discipline one layer down.</>,
        ]}
      />
    </>
  )
}
