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

const ID = '3.2.2'

// Source = the operational DB's CURRENT state, one row per id. Two rows have
// been touched since the last load (id 2 updated, id 4 is new).
const SRC = `CREATE OR REPLACE TABLE orders AS SELECT * FROM (VALUES
  (1, 'Ana', 50.0,  TIMESTAMP '2026-03-01 09:00'),
  (2, 'Bo',  35.0,  TIMESTAMP '2026-03-02 08:30'),
  (3, 'Cy',  75.0,  TIMESTAMP '2026-03-01 11:00'),
  (4, 'Di', 120.0,  TIMESTAMP '2026-03-02 14:00')
) AS t(id, customer, amount, updated_at);`

// The warehouse target after a FIRST load whose watermark reached 2026-03-01 11:00.
// It still holds Bo's OLD amount (20.0) and has no row 4 yet.
const TGT_THEN_LOAD =
  SRC +
  `
CREATE OR REPLACE TABLE target (id INTEGER PRIMARY KEY, customer TEXT, amount DOUBLE, updated_at TIMESTAMP);
INSERT INTO target VALUES
  (1, 'Ana', 50.0, TIMESTAMP '2026-03-01 09:00'),
  (2, 'Bo',  20.0, TIMESTAMP '2026-03-01 10:00'),
  (3, 'Cy',  75.0, TIMESTAMP '2026-03-01 11:00');
INSERT INTO target
SELECT * FROM orders WHERE updated_at > TIMESTAMP '2026-03-01 11:00'
ON CONFLICT (id) DO UPDATE SET
  customer = excluded.customer, amount = excluded.amount, updated_at = excluded.updated_at;`

const WM_EVENTS = [
  { t: 0.12, label: 'row 1' },
  { t: 0.34, label: 'row 3' },
  { t: 0.55, label: 'last load' },
  { t: 0.72, label: 'row 2' },
  { t: 0.88, label: 'row 4' },
]

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Reloading everything every night stops working">
        <p>
          Your Phase 2 loads copied whole tables. That is fine at a thousand rows and ruinous at a hundred million:
          re-reading the entire source every run wastes hours and money to re-copy data that did not change. An{' '}
          <GlossaryTerm k="incremental-load">incremental load</GlossaryTerm> moves only what is new or changed since last
          time — and the trick that makes it possible is a single remembered number called a{' '}
          <GlossaryTerm k="watermark">watermark</GlossaryTerm>.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Imagine copying a friend&apos;s diary by hand. The lazy-but-safe way is to recopy the whole diary every
                week — you never miss anything, but you rewrite hundreds of pages you already have. The smart way: jot down
                the date of the last entry you copied. Next week you flip to that date and copy only the pages after it.
                That remembered date is the watermark: &quot;I have everything up to here; start from there.&quot;
              </p>
              <p>
                It only works if the diary is dated and the dates never go backwards. If your friend sometimes slips a page
                in <em>behind</em> the bookmark, you will skip it. That one failure mode — a page arriving behind the
                bookmark — is the source of almost every incremental-load bug, and the rest of this module is about
                handling it.
              </p>
            </>
          }
          student={
            <>
              <p>
                An incremental load needs a <GlossaryTerm k="high-water-mark">high-water-mark column</GlossaryTerm>: a
                value on each source row that only ever increases as rows change — typically an <code>updated_at</code>{' '}
                timestamp or a monotonic auto-increment id. You store the maximum value you have loaded so far (the
                watermark). Each run: select rows where <code>updated_at &gt; watermark</code>, write them to the target,
                then advance the watermark to the new maximum. Next run picks up exactly where you left off.
              </p>
              <p>
                &quot;Write them to the target&quot; cannot be a blind <code>INSERT</code> — a changed row would appear
                twice. It must be an <GlossaryTerm k="upsert">upsert</GlossaryTerm>: update the row if its key already
                exists, insert it if not. SQL spells this <code>MERGE INTO</code> (ANSI) or{' '}
                <code>INSERT ... ON CONFLICT DO UPDATE</code> (DuckDB/Postgres). Watermark to find the delta, upsert to
                apply it — that pair is the entire pattern.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Correctness of a watermark load rests on <em>monotonicity</em>: the high-water-mark column must be
                non-decreasing with respect to the order in which changes become visible to the reader. A wall-clock{' '}
                <code>updated_at</code> set by the application violates this under clock skew, long-running transactions
                that commit out of timestamp order, and backdated writes — any row whose <code>updated_at</code> is less
                than the current watermark but which becomes visible <em>after</em> the load is silently skipped. This is
                the read-committed &quot;phantom below the watermark&quot; hazard.
              </p>
              <p>
                It also fixes your delivery semantics. Advancing the watermark strictly greater-than means a crash between
                the write and the watermark update re-selects the same rows next run — <GlossaryTerm k="idempotency">at-least-once</GlossaryTerm>{' '}
                delivery, made safe only because the write is an idempotent upsert. Achieving true exactly-once requires the
                target write and the watermark advance to commit atomically (same transaction) or a dedup key; otherwise
                &quot;exactly-once&quot; is really &quot;at-least-once plus idempotent apply&quot;, which is what almost
                every real pipeline actually ships. Lesson 3.2.3 makes the idempotent-apply half rigorous.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Step 1 — select the delta: rows past the watermark">
        <p>
          Say the last load reached watermark <code>2026-03-01 11:00</code>. The delta is every source row with an{' '}
          <code>updated_at</code> strictly greater than that. In our source, one row was updated (Bo, now{' '}
          <code>08:30</code> on the 2nd) and one is brand new (Di). Run it:
        </p>
        <CodeRunner
          language="sql"
          setup={SRC}
          code={`-- everything changed since the last load's watermark
SELECT id, customer, amount, updated_at
FROM orders
WHERE updated_at > TIMESTAMP '2026-03-01 11:00'
ORDER BY updated_at;`}
        />
        <Callout kind="tip" title="Strictly greater-than, never >=">
          Use <code>&gt;</code>, not <code>&gt;=</code>. With <code>&gt;=</code> you reload the boundary row every single
          run — harmless if your write is idempotent (next lesson), wasteful regardless. The watermark is the newest thing
          you have already handled; you want everything <em>after</em> it.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Step 2 — apply the delta with an upsert (MERGE)">
        <p>
          The target already holds the first load, including Bo&apos;s <em>old</em> amount (20.0) and no row 4. We apply
          only the delta with an upsert: Bo&apos;s row is <strong>updated</strong> in place, Di&apos;s row is{' '}
          <strong>inserted</strong>, and rows 1 and 3 are never touched. The setup below runs the upsert; the query shows
          the target afterward:
        </p>
        <CodeRunner
          language="sql"
          setup={TGT_THEN_LOAD}
          code={`-- target after the incremental upsert: id 2 updated, id 4 inserted, 1 & 3 unchanged
SELECT id, customer, amount, updated_at
FROM target
ORDER BY id;`}
        />
        <p>
          The upsert that setup ran is DuckDB&apos;s <code>ON CONFLICT</code> form. The portable ANSI spelling is{' '}
          <code>MERGE INTO</code> — same intent, and worth recognizing because you will meet it in Snowflake, BigQuery,
          Spark SQL, and DuckDB 1.3+:
        </p>
        <CodeBlock
          label="sql — the same upsert, two dialects"
          code={`-- DuckDB / Postgres: INSERT ... ON CONFLICT
INSERT INTO target
SELECT * FROM orders WHERE updated_at > :watermark
ON CONFLICT (id) DO UPDATE SET
  customer = excluded.customer, amount = excluded.amount, updated_at = excluded.updated_at;

-- ANSI standard: MERGE INTO
MERGE INTO target AS t
USING (SELECT * FROM orders WHERE updated_at > :watermark) AS s
  ON t.id = s.id
WHEN MATCHED THEN UPDATE SET amount = s.amount, updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT VALUES (s.id, s.customer, s.amount, s.updated_at);`}
        />
      </Section>

      <Section kicker="core concepts" title="Step 3 — advance the watermark, and watch it settle">
        <p>
          After applying the delta, the new watermark is the maximum <code>updated_at</code> you just loaded. Compute it
          from the source you loaded:
        </p>
        <CodeRunner
          language="sql"
          setup={SRC}
          code={`SELECT MAX(updated_at) AS new_watermark FROM orders;`}
        />
        <p>
          That new watermark is <code>2026-03-02 14:00</code>. Now re-run the load with the watermark already at that
          value: the delta is empty, so nothing moves. This is the load reaching steady state — the animation shows the
          same idea, the blue line sweeping past every row it has already seen:
        </p>
        <CodeRunner
          language="sql"
          setup={SRC}
          code={`-- re-running once the watermark has caught up: zero rows to load
SELECT COUNT(*) AS rows_to_load
FROM orders
WHERE updated_at > TIMESTAMP '2026-03-02 14:00';`}
        />
        <WatermarkTimeline
          events={WM_EVENTS}
          caption={
            <>
              Each dot is a source row at its <code>updated_at</code>. The{' '}
              <span style={{ color: '#38bdf8' }}>watermark</span> is the &quot;last load&quot; line; rows behind it
              (<span style={{ color: '#34d399' }}>green</span>) are already in the target, rows ahead of it are the delta
              the next run will pick up. Advancing the watermark to the newest row is what makes the following run a
              no-op — the load has caught up.
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Full refresh vs incremental">
        <p>
          Incremental is not free: you trade compute for correctness risk. A full refresh is dumb and slow but almost
          impossible to get subtly wrong; an incremental load is cheap but has a dozen ways to silently miss rows. Choose
          per table, not per religion.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Full refresh (truncate + reload everything)',
              strengths: [
                'Always correct by construction — it cannot "miss" a changed row because it reloads all of them',
                'Trivially handles deletes, backdated edits, and schema drift — the target simply mirrors the source',
                'No state to track: no watermark, no upsert logic to get wrong',
              ],
              weaknesses: [
                'Cost and time scale with total size, not with change volume — untenable on large tables',
                'Heavy, bursty load on the source and network every run',
              ],
              chooseWhen: 'small or slowly-changing tables (dimensions, config, lookups), or when correctness matters more than cost and the table is modest.',
            },
            {
              name: 'Incremental (watermark + upsert)',
              strengths: [
                'Cost scales with change volume, not table size — the only viable option at scale',
                'Light, steady load on the source; short run times',
              ],
              weaknesses: [
                'Correctness depends on a well-behaved high-water-mark column — non-monotonic updated_at skips rows',
                'Does not see hard deletes (a deleted row simply stops appearing — nothing signals it left)',
                'More moving parts: watermark state, upsert logic, late-data handling',
              ],
              chooseWhen: 'large or fast-growing fact tables where a full refresh is too slow or expensive — the default for events and transactions.',
            },
          ]}
          note={
            <>
              A common hybrid: incremental every hour for freshness, plus a periodic full refresh (nightly or weekly) to
              &quot;heal&quot; anything the incremental logic missed — backdated edits, deletes, a watermark that skipped a
              row. The full refresh is your safety net; the incremental load is your daily driver. Deletes specifically are
              why change data capture (lesson 3.2.5) exists.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: an incremental load that catches up and stays put">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will build a real watermark load over a persistent DuckDB file, run it until it reaches steady state,
              then add and change source rows and watch only those move. Work in <code>C:\de-lab\incremental</code> with{' '}
              <code>uv</code>; this one needs the <code>duckdb</code> package.
            </p>
          }
          steps={[
            {
              title: 'Set up and add DuckDB',
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\incremental; cd C:\\de-lab\\incremental\nuv init --bare\nuv add duckdb',
                  bash: 'mkdir -p ~/de-lab/incremental && cd ~/de-lab/incremental\nuv init --bare\nuv add duckdb',
                },
              ],
              checkpoint: (
                <>
                  <code>uv add duckdb</code> resolves and writes a lockfile; <code>uv run python -c "import duckdb"</code>{' '}
                  exits with no error.
                </>
              ),
            },
            {
              title: 'Seed the source, an empty target, and the watermark',
              body: (
                <>
                  <p>
                    Save <code>seed.py</code>. It creates a <code>source</code> table (5 rows), an empty{' '}
                    <code>target</code> with a primary key (so upserts work), and a <code>meta</code> table holding the
                    watermark, initialized to the epoch so the first load takes everything.
                  </p>
                  <CodeBlock
                    label="seed.py"
                    code={`import duckdb
con = duckdb.connect("warehouse.duckdb")
con.execute("CREATE OR REPLACE TABLE source (id INTEGER PRIMARY KEY, customer TEXT, amount DOUBLE, updated_at TIMESTAMP)")
con.execute("""INSERT INTO source VALUES
  (1,'Ana', 50.0, TIMESTAMP '2026-03-01 09:00'),
  (2,'Bo',  20.0, TIMESTAMP '2026-03-01 10:00'),
  (3,'Cy',  75.0, TIMESTAMP '2026-03-01 11:00'),
  (4,'Di', 120.0, TIMESTAMP '2026-03-01 11:30'),
  (5,'Ed',  10.0, TIMESTAMP '2026-03-01 11:45')""")
con.execute("CREATE OR REPLACE TABLE target (id INTEGER PRIMARY KEY, customer TEXT, amount DOUBLE, updated_at TIMESTAMP)")
con.execute("CREATE OR REPLACE TABLE meta (last_watermark TIMESTAMP)")
con.execute("INSERT INTO meta VALUES (TIMESTAMP '1970-01-01 00:00')")
print("seeded", con.execute("SELECT count(*) FROM source").fetchone()[0], "source rows")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python seed.py' }],
              checkpoint: (
                <>
                  Prints <code>seeded 5 source rows</code> and creates <code>warehouse.duckdb</code> in the folder.
                </>
              ),
            },
            {
              title: 'Write the incremental load and run it twice',
              body: (
                <>
                  <p>
                    Save <code>load.py</code>: read the watermark, count and upsert the delta, advance the watermark to the
                    new maximum, and report. Run it, then run it again immediately.
                  </p>
                  <CodeBlock
                    label="load.py"
                    code={`import duckdb
con = duckdb.connect("warehouse.duckdb")
wm = con.execute("SELECT last_watermark FROM meta").fetchone()[0]
moved = con.execute("SELECT count(*) FROM source WHERE updated_at > ?", [wm]).fetchone()[0]
con.execute("""INSERT INTO target
  SELECT * FROM source WHERE updated_at > ?
  ON CONFLICT (id) DO UPDATE SET
    customer = excluded.customer, amount = excluded.amount, updated_at = excluded.updated_at""", [wm])
new_wm = con.execute("SELECT max(updated_at) FROM target").fetchone()[0]
if new_wm is not None:
    con.execute("UPDATE meta SET last_watermark = ?", [new_wm])
tgt = con.execute("SELECT count(*) FROM target").fetchone()[0]
print(f"moved {moved} rows; target now {tgt} rows; watermark = {new_wm}")`}
                  />
                </>
              ),
              commands: [
                { ps: 'uv run python load.py', label: 'first run' },
                { ps: 'uv run python load.py', label: 'second run — steady state' },
              ],
              checkpoint: (
                <>
                  First run: <code>moved 5 rows; target now 5 rows; watermark = 2026-03-01 11:45:00</code>. Second run:{' '}
                  <strong>moved 0 rows; target now 5 rows</strong> — the watermark caught up, so a re-run does nothing. That
                  no-op is the proof your load is safe to re-run.
                </>
              ),
            },
            {
              title: 'Add a new row and change an existing one; load again',
              body: (
                <>
                  <p>
                    Save <code>touch.py</code>: insert a brand-new order (id 6) and bump an existing one (id 2) to a later{' '}
                    <code>updated_at</code>. Then run <code>load.py</code> once more.
                  </p>
                  <CodeBlock
                    label="touch.py"
                    code={`import duckdb
con = duckdb.connect("warehouse.duckdb")
con.execute("INSERT INTO source VALUES (6,'Fi', 99.0, TIMESTAMP '2026-03-02 09:00')")
con.execute("UPDATE source SET amount = 999.0, updated_at = TIMESTAMP '2026-03-02 10:00' WHERE id = 2")
print("added row 6 and bumped row 2")`}
                  />
                  <RevealSolution label="Predict the numbers before you run">
                    <p>
                      The delta is exactly two rows: the new id 6 (an INSERT) and the bumped id 2 (an UPDATE). So{' '}
                      <code>load.py</code> prints <code>moved 2 rows</code>, but the target grows by only <strong>one</strong>{' '}
                      (5 → 6) because id 2 already existed and was updated in place, not added. Bo&apos;s amount in{' '}
                      <code>target</code> is now 999.0, and the watermark advances to <code>2026-03-02 10:00</code>. This is
                      the whole point: changed rows update, new rows insert, untouched rows never move.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                { ps: 'uv run python touch.py\nuv run python load.py' },
                {
                  ps: 'uv run python -c "import duckdb; print(duckdb.connect(\'warehouse.duckdb\').execute(\'SELECT id, amount FROM target ORDER BY id\').fetchall())"',
                  label: 'inspect target',
                },
              ],
              checkpoint: (
                <>
                  <code>load.py</code> prints <strong>moved 2 rows; target now 6 rows; watermark = 2026-03-02 10:00:00</strong>.
                  The inspect line shows id 2&apos;s amount is now <code>999.0</code> and a new id 6 exists — one update,
                  one insert, everything else untouched.
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
              q: 'What is a watermark in an incremental load?',
              options: [
                'A checksum of the whole target table',
                'The maximum value of the high-water-mark column loaded so far — the "everything up to here is done" marker',
                'The number of rows in the source',
                'A random sample used for validation',
              ],
              answer: 1,
              explain: 'The watermark is the newest high-water-mark value (e.g. max updated_at) you have already processed. Next run selects rows strictly greater than it, then advances it to the new maximum.',
            },
            {
              q: 'Why must the load write with an upsert (MERGE / ON CONFLICT) rather than a plain INSERT?',
              options: [
                'INSERT is slower',
                'A changed row selected by the delta already exists in the target; a plain INSERT would duplicate it, while an upsert updates it in place',
                'INSERT cannot read timestamps',
                'Upserts skip the watermark',
              ],
              answer: 1,
              explain: 'The delta includes rows that changed, whose keys already exist in the target. A plain INSERT would create a second copy; the upsert updates the existing row and inserts only genuinely new keys.',
            },
            {
              q: 'You select the delta with updated_at >= watermark instead of > watermark. What happens?',
              options: [
                'Rows are skipped',
                'The boundary row is reloaded every run — harmless if the write is idempotent, but wasteful',
                'The query errors',
                'The watermark never advances',
              ],
              answer: 1,
              explain: 'With >= you always re-select the row exactly at the watermark. An idempotent upsert makes it correct, but it is needless work. Use strictly greater-than to pick up only rows after the last one handled.',
            },
            {
              q: 'A source row is edited but its updated_at is set to a time BEFORE the current watermark (clock skew or a backdated write). What is the risk?',
              options: [
                'It is loaded twice',
                'It is silently skipped — the delta query never selects it because it sits behind the watermark',
                'The load crashes',
                'The watermark resets to epoch',
              ],
              answer: 1,
              explain: 'This is the "phantom below the watermark" hazard. A non-monotonic high-water-mark column lets a changed row fall behind the line and never be picked up. A periodic full refresh is the usual safety net.',
            },
            {
              q: 'Which is a genuine weakness of incremental loads that full refresh does not have?',
              options: [
                'It is more expensive on large tables',
                'It cannot see hard deletes — a deleted source row just stops appearing, with nothing to signal it left',
                'It cannot use timestamps',
                'It always duplicates rows',
              ],
              answer: 1,
              explain: 'An incremental load only sees rows that appear in the delta. A DELETE removes a row from the source entirely, so it never shows up as a change. Full refresh mirrors the source and thus reflects deletes; CDC (3.2.5) is the other fix.',
            },
            {
              q: 'When is a full refresh the better choice despite being "dumb and slow"?',
              options: [
                'On billion-row fact tables',
                'On small or slowly-changing tables (dimensions, lookups) where correctness is easy and the cost is trivial',
                'Never — incremental is always better',
                'Only for streaming data',
              ],
              answer: 1,
              explain: 'Full refresh is correct by construction and has no watermark/delete/late-data pitfalls. On a small table the cost is negligible, so the simplicity wins. Reserve incremental for tables where full refresh is genuinely too slow.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Walk me through designing an incremental load from a large orders table.',
            a: (
              <p>
                Pick a high-water-mark column that only increases as rows change — ideally a DB-maintained{' '}
                <code>updated_at</code> or a monotonic id. Store the last loaded maximum as the watermark. Each run: select
                rows where the column is strictly greater than the watermark, upsert them into the target keyed on the
                natural/primary key (MERGE or ON CONFLICT DO UPDATE), then advance the watermark to the new maximum. I&apos;d
                make the write idempotent so an at-least-once re-run is safe, and I&apos;d add a periodic full refresh to
                heal missed deletes and backdated edits. If deletes and low latency both matter, I&apos;d move to CDC.
              </p>
            ),
          },
          {
            q: 'What can go wrong with a timestamp-based watermark, and how do you mitigate it?',
            a: (
              <p>
                The column may not be truly monotonic: clock skew across app servers, long transactions committing out of
                timestamp order, and backdated writes can all place a changed row behind the current watermark, where the
                delta query never sees it. Mitigations: use a DB-generated commit time or a monotonic sequence rather than
                an app-set timestamp; overlap the window slightly (reload a small lookback) and rely on idempotent upserts;
                and run a periodic full refresh as a safety net. For strict correctness with deletes, log-based CDC sidesteps
                the whole issue.
              </p>
            ),
          },
          {
            q: 'What delivery guarantee does a watermark load give, and how do you make it safe?',
            a: (
              <p>
                Typically at-least-once: if the process crashes after writing rows but before persisting the new watermark,
                the next run re-selects and re-applies the same rows. That is safe only because the write is an idempotent
                upsert — re-applying a row yields the same target state. True exactly-once needs the target write and the
                watermark advance to commit atomically (one transaction) or a dedup key. In practice &quot;exactly-once&quot;
                usually means &quot;at-least-once plus idempotent apply,&quot; which is the next lesson.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>An incremental load moves only rows changed since last time; its cost scales with change volume, not table size — the only viable pattern at scale.</>,
          <>The watermark is the maximum high-water-mark value (updated_at or monotonic id) already loaded; each run selects rows strictly greater than it, then advances it to the new maximum.</>,
          <>Apply the delta with an upsert (MERGE INTO / INSERT ... ON CONFLICT DO UPDATE), never a plain INSERT — changed rows update in place, new rows insert, untouched rows never move.</>,
          <>Correctness depends on a monotonic high-water-mark column; clock skew, out-of-order commits, and backdated writes can drop a row behind the watermark and skip it.</>,
          <>Incremental loads do not see hard deletes and carry late-data risk; a periodic full refresh (or CDC) is the usual safety net.</>,
          <>Watermark loads are at-least-once by default; they are safe only because the upsert is idempotent — advancing the watermark strictly greater-than means a crash simply re-applies the same delta.</>,
        ]}
      />
    </>
  )
}
