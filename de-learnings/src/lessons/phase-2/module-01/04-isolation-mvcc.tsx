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

const ID = '2.1.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Two sessions, same rows">
        <Tiered
          layman={
            <>
              <p>Imagine a family shopping list pinned to the fridge — one sheet of paper everyone edits directly. Dad crosses off "milk" while Mom is halfway through renumbering the list; the kid reads it mid-edit and shops from a half-scribbled version. Every mess that follows comes from people reading and writing <em>the same paper at the same time</em>.</p>
              <p>Now imagine instead: whenever someone starts shopping, the fridge hands them a <em>photocopy stamped with the pickup time</em>. Everyone reads their own stable copy; edits go onto fresh sheets; the fridge reconciles. Nobody ever sees a half-scribble. That second design is how Postgres works — it is called MVCC — and this lesson is about what each shopper can and cannot see, and what still goes wrong even with photocopies.</p>
            </>
          }
          student={
            <>
              <p>A server database exists to serve many sessions at once — and lessons so far quietly dodged the question of what session B sees while session A is mid-transaction. The answer is governed by the <em>isolation level</em>, and the failure modes have names: <strong>dirty read</strong> (seeing uncommitted data), <strong>non-repeatable read</strong> (a row changes between two reads in one transaction), <strong>phantom</strong> (a query's row <em>set</em> changes), and <strong>lost update</strong> (two read-modify-write cycles, one overwrites the other).</p>
              <p>This is a two-terminal lesson: every anomaly below is scripted as a numbered interleaving between "terminal A" and "terminal B", and in the lab you will race them for real in split panes at each of Postgres's three levels — READ COMMITTED (the default), REPEATABLE READ, and SERIALIZABLE — recording which anomalies survive at each. The scripts are the rehearsal; the lab is the performance.</p>
            </>
          }
          phd={
            <>
              <p>The gold standard is <em>serializability</em>: the concurrent execution is equivalent to <em>some</em> serial order of the transactions. Databases historically shipped weaker levels because serializability was assumed to cost too much — the ANSI SQL levels are essentially a menu of which anomalies you tolerate for speed, and the famous critique (Berenson et al. 1995) showed the standard's definitions were too weak to even describe what real engines do. Snapshot isolation — what Postgres calls REPEATABLE READ — is the great non-ANSI level that critique named.</p>
              <p>Reading: DDIA chapter 7, second half — weak isolation levels, snapshot isolation, write skew, and SSI. Kleppmann's taxonomy (read anomalies vs write anomalies, and why "repeatable read" means different things in different engines) is the map for everything you will race in this lab. The Postgres-specific ground truth lives in the docs chapter "Transaction Isolation" — shorter than you fear, and worth reading once with the lab open.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The anomalies zoo, scripted">
        <Tiered
          layman={
            <>
              <p>Four things can go wrong when two people share data. Reading someone's <em>pencil draft</em> that they then erase (dirty read). Asking the same question twice and getting two different answers because someone edited between your questions (non-repeatable read). Counting "how many items on the list" twice and finding a new item materialized (phantom). And the cruelest: you and a friend both read "10 widgets left", each subtract one in your head, and both write "9" — a sale vanished (lost update).</p>
              <p>The scripts below choreograph each mishap step by step, like a two-actor play. Read the numbers: they are the order in which the two terminals take turns.</p>
            </>
          }
          student={
            <>
              <p>Postgres never allows dirty reads at any level — session A simply cannot see B's uncommitted changes. The other three anomalies are all live at the default level. Each script assumes the lab's <code>accounts</code> table (alice 70.00, bob 140.00); run the statements in the numbered order, one terminal per pane.</p>
              <p>Watch for the pattern in every script: the anomaly needs a transaction that <em>reads twice</em> (or read-then-writes) while another session commits in between. Single-statement autocommit work rarely trips these — which is exactly why the anomalies stay invisible until your code grows multi-step transactions and real concurrency.</p>
            </>
          }
          phd={
            <>
              <p>Classification worth internalizing: dirty/non-repeatable/phantom are <em>read anomalies</em> — a lone reader observing an inconsistent state of the world. Lost update (and its subtler sibling write skew, staged later in this lesson) are <em>write anomalies</em> — two writers whose combined effect matches no serial order. The distinction matters because snapshot-based engines fix all the read anomalies almost for free (reads come from a frozen snapshot) while write anomalies need conflict <em>detection</em> or <em>locking</em> — fundamentally different machinery.</p>
              <p>Formally, lost update is a cycle in the reads-from/writes-to dependency graph: T1 reads x before T2 writes x, and T2 reads x before T1 writes x — no serial order satisfies both. Serializability theory (conflict graphs, view equivalence) turns these stories into decidable properties; SSI, at the end of this lesson, is that theory running live in Postgres.</p>
            </>
          }
        />
        <p><strong>Race 1 — dirty read (Postgres refuses, always):</strong></p>
        <CodeBlock label="psql — terminal B" code={`-- (1) start a transaction, change a balance, do NOT commit:
BEGIN;
UPDATE accounts SET balance = 999.00 WHERE name = 'alice';
-- ...hold here until step (2) runs in terminal A...
-- (3) then abandon the experiment:
ROLLBACK;`} />
        <CodeBlock label="psql — terminal A" code={`-- (2) while B's update is uncommitted:
SELECT balance FROM accounts WHERE name = 'alice';
-- 70.00 — not 999. Uncommitted data is invisible at every level in Postgres.`} />
        <p><strong>Race 2 — non-repeatable read (happens at READ COMMITTED):</strong></p>
        <CodeBlock label="psql — terminal A" code={`-- (1)
BEGIN;
SELECT balance FROM accounts WHERE name = 'alice';  -- 70.00
-- (3) same query, same transaction:
SELECT balance FROM accounts WHERE name = 'alice';  -- 50.00 — it moved!
COMMIT;`} />
        <CodeBlock label="psql — terminal B" code={`-- (2) a plain autocommitted statement between A's two reads:
UPDATE accounts SET balance = 50.00 WHERE name = 'alice';`} />
        <p><strong>Race 3 — phantom (happens at READ COMMITTED):</strong></p>
        <CodeBlock label="psql — terminal A" code={`-- (1)
BEGIN;
SELECT count(*) FROM accounts WHERE balance >= 100;  -- 1
-- (3)
SELECT count(*) FROM accounts WHERE balance >= 100;  -- 2 — a phantom row appeared
COMMIT;`} />
        <CodeBlock label="psql — terminal B" code={`-- (2)
INSERT INTO accounts VALUES ('carol', 500.00);`} />
        <p><strong>Race 4 — lost update (happens at READ COMMITTED):</strong></p>
        <CodeBlock label="psql — terminal A" code={`-- (1) read the balance, planning to add a 10.00 deposit:
BEGIN;
SELECT balance FROM accounts WHERE name = 'bob';  -- 140.00
-- (3) app computes 140 + 10 and writes the result back:
UPDATE accounts SET balance = 150.00 WHERE name = 'bob';
COMMIT;  -- (4)`} />
        <CodeBlock label="psql — terminal B" code={`-- (2) reads the SAME starting balance for its own 10.00 deposit:
BEGIN;
SELECT balance FROM accounts WHERE name = 'bob';  -- 140.00
-- (5) blind write-back, unaware of A's deposit:
UPDATE accounts SET balance = 150.00 WHERE name = 'bob';
COMMIT;  -- (6) final balance: 150.00. Two deposits, one survived.`} />
      </Section>

      <Section kicker="core concepts" title="Postgres's three levels — what each one stops">
        <Tiered
          layman={
            <>
              <p>The library offers three strictness settings. <em>Standard</em> (the default): every question you ask gets the latest officially-recorded answer — accurate per question, but ask twice and the answer may change between. <em>Photocopy</em>: the moment you start, you get a timestamped copy of everything; all your questions are answered from that copy, perfectly stable, even as others keep editing the originals. <em>Referee</em>: like photocopy, but a referee also watches everyone's reads and writes, and if two people's work would contradict any possible one-at-a-time ordering, one of them is told "start over".</p>
              <p>Stricter costs more: the referee occasionally rejects work that must be redone. The skill is knowing which errands need which setting.</p>
            </>
          }
          student={
            <>
              <p>The behavior, <em>in Postgres specifically</em> (other engines differ at the same names):</p>
              <ul>
                <li><strong>READ COMMITTED (default):</strong> each <em>statement</em> sees a fresh snapshot of committed data. Stops dirty reads only — races 2, 3, 4 all reproduce. Fine for most OLTP because single statements are internally consistent.</li>
                <li><strong>REPEATABLE READ:</strong> one snapshot for the <em>whole transaction</em> — this is snapshot isolation. Non-repeatable reads and phantoms both vanish (yes, phantoms too — Postgres is stronger than the ANSI name requires). Concurrent writes to the same row become an error: <code>could not serialize access due to concurrent update</code> — the lost-update race turns into a forced retry instead of silent loss. Write skew still slips through.</li>
                <li><strong>SERIALIZABLE:</strong> snapshot isolation plus conflict detection (SSI). Guarantees some serial order explains the outcome; anything else aborts with SQLSTATE <code>40001</code>. The price: your application <em>must</em> have a retry loop.</li>
              </ul>
              <p>Set a level per transaction: <code>BEGIN ISOLATION LEVEL REPEATABLE READ;</code> — it lasts until COMMIT/ROLLBACK.</p>
            </>
          }
          phd={
            <>
              <p>Write skew, the anomaly that separates snapshot isolation from serializability: two transactions read an overlapping predicate, then write <em>disjoint</em> rows such that the combination violates an invariant neither violated alone. The canonical case (staged in the lab): two on-call doctors, each checks "at least two of us are on call, so I can leave", each marks <em>themselves</em> off — both commit under REPEATABLE READ because neither touched the other's row, and the invariant "at least one on call" is dead. No same-row conflict means the snapshot machinery never objects.</p>
              <p>SERIALIZABLE in Postgres is Serializable Snapshot Isolation (Cahill et al. 2008; in Postgres since 9.1): optimistic execution over snapshots, plus tracking of predicate reads (SIReadLocks) to detect dangerous rw-antidependency cycles, aborting one participant with 40001. Cheaper than two-phase locking under low contention, and the aborts are not bugs — they are the mechanism. Hence the iron rule: SERIALIZABLE without an application retry loop is a latent outage.</p>
            </>
          }
        />
        <p><strong>Race 5 — write skew (commits at REPEATABLE READ; aborts at SERIALIZABLE):</strong></p>
        <CodeBlock label="psql — terminal A" code={`-- (1)
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM oncall WHERE on_call;          -- 2: "safe for me to leave"
-- (3)
UPDATE oncall SET on_call = false WHERE doctor = 'alice';
-- (5)
COMMIT;   -- succeeds`} />
        <CodeBlock label="psql — terminal B" code={`-- (2)
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM oncall WHERE on_call;          -- 2: "safe for me to leave"
-- (4)
UPDATE oncall SET on_call = false WHERE doctor = 'bob';
-- (6)
COMMIT;   -- ALSO succeeds. Nobody is on call. Rerun with SERIALIZABLE:
          -- one COMMIT fails with SQLSTATE 40001 — retry it, and the retry
          -- sees the other doctor gone and refuses to leave.`} />
      </Section>

      <Section kicker="core concepts" title="MVCC: readers never block writers (and the VACUUM bill)">
        <Callout kind="info" title="Why these demos are psql scripts, not runnable blocks">
          The in-browser DuckDB engine is a single connection — it cannot host a two-session race, so true isolation demos are impossible here. Where one connection <em>can</em> demonstrate the logic (the optimistic-locking fix below), we use the runnable block; everything else is honest psql choreography for the lab.
        </Callout>
        <Tiered
          layman={
            <>
              <p>How does the photocopy trick work without a copy machine grinding all day? The fridge never erases anything. Crossing out "milk" secretly means: write a fresh "milk — removed" sheet and keep the old one. Each shopper's timestamped copy is really just an agreement about <em>which sheets they are allowed to see</em>. Old sheets pile up; a night cleaner comes through and recycles every sheet that no remaining shopper could possibly need.</p>
              <p>The pile is real storage, and the cleaner is a real background worker called VACUUM. If a shopper naps in the aisle for six hours holding an ancient photocopy, the cleaner cannot touch anything from before that stamp — the pile grows. Long naps are the enemy.</p>
            </>
          }
          student={
            <>
              <p>MVCC — multi-version concurrency control. An UPDATE never modifies a row in place: it writes a <em>new version</em> and marks the old one expired. DELETE just marks. Every transaction reads through a snapshot that decides which versions are visible. Consequences: <strong>readers never block writers, writers never block readers</strong> — only two writers on the <em>same row</em> queue up. This is why an <GlossaryTerm k="olap">OLAP</GlossaryTerm>-style analytics scan can run for minutes while live <GlossaryTerm k="oltp">OLTP</GlossaryTerm> writes proceed untouched on the same server.</p>
              <p>The bill: expired versions (<em>dead tuples</em>) occupy space — bloat. <code>VACUUM</code> reclaims them; <em>autovacuum</em> runs it automatically. Inspect with <code>SELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'accounts';</code>. And the shopper napping with an old photocopy is a <em>long-running transaction</em> pinning the cleanup horizon: a forgotten open psql transaction can bloat every busy table in the database.</p>
            </>
          }
          phd={
            <>
              <p>Each tuple carries <code>xmin</code> (creating transaction id) and <code>xmax</code> (deleting/expiring xid, or 0). A snapshot is (set of in-progress xids, horizon); tuple visibility = xmin committed and not in-progress at snapshot time, and xmax absent, aborted, or after the snapshot. READ COMMITTED takes a snapshot per statement; REPEATABLE READ per transaction — the entire difference between the two levels is snapshot lifetime.</p>
              <p>Transaction ids are 32-bit and wrap. Comparisons are modular, so an old committed xid must eventually be <em>frozen</em> (marked "visible to everyone, forever") before the counter laps it — anti-wraparound vacuum is the mechanism, and a database that blocks it long enough (billions of writes with vacuum starved) hits the famous forced shutdown. You will likely never see it; you should absolutely be able to explain it. VACUUM (plain) reclaims space into the table for reuse; VACUUM FULL rewrites the table exclusively-locked; autovacuum tuning is the classic first real DBA task on a growing system.</p>
            </>
          }
        />
        <p>Both fixes for the lost update, side by side. The pessimistic fix locks the row at read time (lab script):</p>
        <CodeBlock label="psql — both terminals, pessimistic fix" code={`BEGIN;
SELECT balance FROM accounts WHERE name = 'bob' FOR UPDATE;  -- lock the row now
-- the other terminal's FOR UPDATE blocks HERE until this commits...
UPDATE accounts SET balance = balance + 10 WHERE name = 'bob';
COMMIT;  -- ...then it reads the fresh value: both deposits survive`} />
        <p>The optimistic fix carries a version column and only writes if nothing moved — the write-and-check logic runs fine in one connection, so this one you can execute right here:</p>
        <CodeRunner
          language="sql"
          label="DuckDB — optimistic concurrency: the stale write loses politely"
          setup={`CREATE OR REPLACE TABLE inventory (item TEXT PRIMARY KEY, qty INTEGER NOT NULL, version INTEGER NOT NULL);
INSERT INTO inventory VALUES ('widget', 10, 1);`}
          code={`-- Two app servers both read (qty 10, version 1) and each try to sell one widget.
-- Each writes back only if the version is still what it read:
UPDATE inventory SET qty = 9, version = 2 WHERE item = 'widget' AND version = 1;  -- first wins
UPDATE inventory SET qty = 9, version = 2 WHERE item = 'widget' AND version = 1;  -- matches 0 rows!
SELECT * FROM inventory;
-- The stale writer sees "0 rows updated", re-reads (qty 9, version 2), and retries with qty 8.`}
        />
      </Section>

      <Section kicker="trade-offs" title="Choosing an isolation level">
        <Tradeoffs
          options={[
            {
              name: 'READ COMMITTED (default)',
              strengths: [
                'Highest throughput; no snapshot kept per transaction, no serialization aborts',
                'Each statement is internally consistent — enough for most single-statement OLTP',
              ],
              weaknesses: [
                'Non-repeatable reads, phantoms, and lost updates all possible',
                'Multi-step read-then-write logic is silently unsafe without FOR UPDATE or versioning',
              ],
              chooseWhen: 'the default workload: short transactions, single-statement writes, explicit locking where read-modify-write exists.',
            },
            {
              name: 'REPEATABLE READ (snapshot isolation)',
              strengths: [
                'One stable snapshot per transaction — reports and multi-query reads are perfectly consistent',
                'In Postgres, stops phantoms too; same-row write conflicts become explicit errors instead of silent loss',
              ],
              weaknesses: [
                'Concurrent same-row writes abort with a serialization error — callers must retry',
                'Write skew still possible: disjoint-row writes can jointly break an invariant',
              ],
              chooseWhen: 'multi-statement reads that must be consistent — pipeline extracts, reports, reconciliations. The DE workhorse.',
            },
            {
              name: 'SERIALIZABLE (SSI)',
              strengths: [
                'True serializability — write skew and every anomaly gone; invariants provably safe',
                'Optimistic: near-RR performance when conflicts are rare',
              ],
              weaknesses: [
                'Aborts (SQLSTATE 40001) are routine under contention — a retry loop is mandatory, not optional',
                'Predicate-read tracking costs memory and CPU; hot contention degrades badly',
              ],
              chooseWhen: 'correctness-critical invariants span multiple rows (money conservation, scheduling constraints) and you own the retry logic.',
            },
          ]}
          note={
            <>
              Orthogonal to levels: the lost update specifically offers pessimistic (<code>SELECT ... FOR UPDATE</code> — block up front, no retries, risk of waiting) vs optimistic (version column — never block, retry on conflict) fixes. Low contention favors optimistic; hot rows favor pessimistic. Being able to sketch both is a straight interview win.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: race two terminals through every anomaly">
        <Lab
          lessonId={ID}
          intro={
            <p>Open Windows Terminal and split the pane: <strong>Alt+Shift+D</strong> duplicates the current pane (Alt+Left/Right arrows move focus). Left pane is terminal A, right is terminal B. Keep a notes file open — you are building a table: rows = anomalies (non-repeatable read, phantom, lost update, write skew), columns = levels (RC, RR, SER), cells = observed or prevented.</p>
          }
          steps={[
            {
              title: 'Seed the race tables',
              body: <p>In either pane, connect and reset the fixtures (this intentionally recreates the accounts table from lesson 2.1.3):</p>,
              commands: [
                { ps: 'docker start pg-lab\ndocker exec -it pg-lab psql -U app_user -d appdb' },
                { ps: "DROP TABLE IF EXISTS accounts;\nCREATE TABLE accounts (name text PRIMARY KEY, balance numeric(12,2) NOT NULL CHECK (balance >= 0));\nINSERT INTO accounts VALUES ('alice', 70.00), ('bob', 140.00);\nDROP TABLE IF EXISTS oncall;\nCREATE TABLE oncall (doctor text PRIMARY KEY, on_call boolean NOT NULL);\nINSERT INTO oncall VALUES ('alice', true), ('bob', true);", label: 'psql' },
              ],
              checkpoint: <><code>SELECT * FROM accounts;</code> shows alice 70.00, bob 140.00; <code>oncall</code> has both doctors on call.</>,
            },
            {
              title: 'Open the second front',
              commands: [{ ps: 'docker exec -it pg-lab psql -U app_user -d appdb', label: 'PowerShell (terminal B pane)' }],
              checkpoint: <>Two <code>appdb=&gt;</code> prompts side by side. Verify both with <code>\conninfo</code> — same database, two independent sessions (two backend processes, per lesson 2.1.1).</>,
            },
            {
              title: 'Race 1 and 2 at READ COMMITTED: dirty read refused, non-repeatable read observed',
              body: <p>Run Race 1 exactly as scripted in the concepts section (B updates uncommitted, A reads, B rolls back), then Race 2 (A reads twice, B updates between).</p>,
              checkpoint: <>Race 1: A read <code>70.00</code>, never 999 — no dirty read at any level. Race 2: A's two reads inside one transaction returned <code>70.00</code> then <code>50.00</code> — non-repeatable read, observed at RC. First two cells of your table filled.</>,
            },
            {
              title: 'Race 3 at READ COMMITTED, then races 2+3 again at REPEATABLE READ',
              body: <p>Run the phantom race as scripted. Then repeat races 2 and 3, but terminal A starts with <code>BEGIN ISOLATION LEVEL REPEATABLE READ;</code> (reset alice to 70.00 and delete carol first: <code>UPDATE accounts SET balance = 70.00 WHERE name = 'alice'; DELETE FROM accounts WHERE name = 'carol';</code>).</p>,
              checkpoint: <>At RC the count changed 1 to 2 (phantom observed). At RR, A's repeated reads and repeated counts are identical no matter what B commits — non-repeatable read and phantom both prevented. Postgres RR blocks phantoms; note that in your table.</>,
            },
            {
              title: 'Same-row write conflict at REPEATABLE READ',
              commands: [
                { ps: "-- terminal A:\nBEGIN ISOLATION LEVEL REPEATABLE READ;\nSELECT balance FROM accounts WHERE name = 'bob';", label: 'psql — terminal A' },
                { ps: "-- terminal B (autocommit):\nUPDATE accounts SET balance = balance + 10 WHERE name = 'bob';", label: 'psql — terminal B' },
                { ps: "-- terminal A again:\nUPDATE accounts SET balance = balance + 10 WHERE name = 'bob';\nROLLBACK;", label: 'psql — terminal A' },
              ],
              checkpoint: <>Terminal A's UPDATE fails: <code>ERROR: could not serialize access due to concurrent update</code>. At RR the lost update cannot happen silently — it becomes an explicit retry signal.</>,
            },
            {
              title: 'Lost update at READ COMMITTED, then the FOR UPDATE fix',
              body: <p>Reset bob: <code>UPDATE accounts SET balance = 140.00 WHERE name = 'bob';</code>. Run Race 4 exactly as scripted — final balance 150.00, a deposit lost. Reset to 140.00 again, then rerun with both terminals using the pessimistic script (<code>SELECT ... FOR UPDATE</code> before the write, computing balance + 10 from what FOR UPDATE returned).</p>,
              checkpoint: <>Blind version: <code>150.00</code> — one deposit vanished at RC. FOR UPDATE version: terminal B visibly <em>hangs</em> at its SELECT until A commits, then proceeds; final balance <code>160.00</code>. Both deposits survive.</>,
            },
            {
              title: 'Write skew at REPEATABLE READ, then SERIALIZABLE stops it',
              body: <p>Run Race 5 as scripted. Then reset (<code>UPDATE oncall SET on_call = true;</code>) and rerun with both terminals using <code>BEGIN ISOLATION LEVEL SERIALIZABLE;</code>. When one COMMIT fails, retry that transaction from BEGIN — and watch its fresh SELECT change its decision.</p>,
              checkpoint: <>At RR both commits succeed and <code>SELECT count(*) FROM oncall WHERE on_call;</code> returns 0 — invariant broken, write skew observed. At SERIALIZABLE one commit fails with <code>SQLSTATE 40001</code> (could not serialize access); after the retry, exactly one doctor remains on call. Final row of your table complete.</>,
            },
            {
              title: 'See the MVCC bill: dead tuples and VACUUM',
              commands: [{ ps: "UPDATE accounts SET balance = balance + 0.01;\nUPDATE accounts SET balance = balance + 0.01;\nUPDATE accounts SET balance = balance + 0.01;\nSELECT n_dead_tup FROM pg_stat_user_tables WHERE relname = 'accounts';\nVACUUM (VERBOSE) accounts;", label: 'psql' }],
              checkpoint: <><code>n_dead_tup</code> is greater than 0 (stats can lag a second or two — re-run the SELECT if it shows 0), and VACUUM VERBOSE reports removing dead row versions. Every UPDATE left a corpse; VACUUM collected them.</>,
            },
            {
              title: 'Reconcile your table with the lesson',
              body: <p>Compare your notes grid against the summary in the isolation-levels section: RC allows non-repeatable reads, phantoms, lost updates; RR prevents the reads and turns same-row conflicts into errors but allows write skew; SERIALIZABLE prevents everything at the price of retries.</p>,
              checkpoint: <>Your observed grid matches the lesson's table cell for cell. Where it differs, rerun that race — the interleaving order (the numbers) is usually the culprit.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'At Postgres\'s default READ COMMITTED level, which anomaly is impossible?',
              options: [
                'Non-repeatable read',
                'Dirty read',
                'Lost update',
                'Phantom read',
              ],
              answer: 1,
              explain: 'Postgres never shows uncommitted data at any level (even asking for READ UNCOMMITTED gives you READ COMMITTED). The other three all reproduce at the default — you raced them.',
            },
            {
              q: 'Postgres REPEATABLE READ and phantoms:',
              options: [
                'Phantoms occur, as the ANSI standard permits at this level',
                'Phantoms are prevented — it is snapshot isolation, one snapshot for the whole transaction',
                'Phantoms occur only on indexed tables',
                'Phantoms become serialization errors',
              ],
              answer: 1,
              explain: 'Postgres RR is snapshot isolation: every read in the transaction sees the same snapshot, so the row set cannot change. Stronger than the ANSI name requires — engine-specific knowledge interviewers probe.',
            },
            {
              q: 'A 10-minute analytics SELECT is scanning a table receiving constant UPDATEs. Under MVCC:',
              options: [
                'The writers queue up behind the reader',
                'The reader sees a mix of old and new rows',
                'Neither blocks: writers create new versions while the reader reads its snapshot',
                'The reader is aborted when a writer commits',
              ],
              answer: 2,
              explain: 'Readers never block writers and vice versa — the reader\'s snapshot pins the versions it needs. The cost appears later as dead tuples for VACUUM (and a long reader delays that cleanup).',
            },
            {
              q: 'Your app uses SERIALIZABLE and a transaction fails with SQLSTATE 40001. The correct response is:',
              options: [
                'Log it as a bug in Postgres',
                'Switch to READ COMMITTED',
                'Retry the whole transaction from BEGIN — aborts are how SSI maintains correctness',
                'Wrap the statement in a savepoint',
              ],
              answer: 2,
              explain: 'SSI is optimistic: it lets transactions run, detects dangerous patterns, and aborts one. The retry re-reads fresh state and may legitimately decide differently. No retry loop means SERIALIZABLE is misconfigured.',
            },
            {
              q: 'Two transactions each read "2 doctors on call", then each set a DIFFERENT doctor off call; both commit at REPEATABLE READ leaving zero on call. Why did RR not stop this?',
              options: [
                'RR only protects indexed columns',
                'It is write skew: they wrote disjoint rows, so no same-row conflict existed for the snapshot machinery to detect',
                'One transaction must have been at READ COMMITTED',
                'The CHECK constraint was missing',
              ],
              answer: 1,
              explain: 'RR detects concurrent writes to the same row. Write skew breaks an invariant across different rows — only SERIALIZABLE (tracking read dependencies, not just writes) catches it.',
            },
            {
              q: 'What does VACUUM actually reclaim?',
              options: [
                'Dead tuples: expired row versions left behind by MVCC updates and deletes',
                'Rows deleted without a WHERE clause',
                'Unused indexes',
                'WAL segments',
              ],
              answer: 0,
              explain: 'Every UPDATE writes a new version and leaves the old as a dead tuple; DELETE just marks. VACUUM reclaims versions no snapshot can still see — and a long-running transaction holds that horizon back, bloating tables.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain MVCC and why Postgres readers do not block writers.',
            a: <p>Updates never overwrite: they create new row versions stamped with transaction ids, and each transaction reads through a snapshot that selects visible versions. Readers read old versions while writers write new ones — no lock conflict; only same-row writers serialize. The costs: dead tuples needing VACUUM, and long transactions pinning the cleanup horizon. Mentioning xmin/xmax and snapshot lifetime (per statement at RC, per transaction at RR) marks depth.</p>,
          },
          {
            q: 'Two processes read a value, both increment, one increment is lost. Fixes?',
            a: <p>Three, in order of preference: make the write atomic (UPDATE ... SET x = x + 1 — no read-modify-write at all); pessimistic locking (SELECT ... FOR UPDATE, the second reader blocks until the first commits); optimistic versioning (WHERE version = n, retry on zero rows affected). Also worth naming: REPEATABLE READ turns the silent loss into an explicit serialization error. Choosing by contention level — optimistic for cold rows, pessimistic for hot — is the senior answer.</p>,
          },
          {
            q: 'Why not just run everything at SERIALIZABLE?',
            a: <p>Because aborts are the mechanism: under contention, SSI cancels transactions routinely, so every caller needs retry logic, and predicate-read tracking costs memory and CPU. Most workloads are safe at READ COMMITTED with targeted FOR UPDATE, or REPEATABLE READ for consistent multi-query reads. Reserve SERIALIZABLE for genuine multi-row invariants — and budget the retries.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Four anomalies to name on demand: dirty read, non-repeatable read, phantom, lost update — plus write skew, the one snapshot isolation misses.</>,
          <>Postgres READ COMMITTED (default): fresh snapshot per statement — no dirty reads, everything else possible. REPEATABLE READ: one snapshot per transaction — stops non-repeatable reads AND phantoms, turns same-row conflicts into errors. SERIALIZABLE: SSI, stops write skew, requires retry loops.</>,
          <>MVCC means readers never block writers: updates create new row versions; snapshots choose what each transaction sees.</>,
          <>The MVCC bill is dead tuples: VACUUM/autovacuum reclaims them, and long-running transactions pin the horizon and cause bloat.</>,
          <>Lost updates have two fixes: pessimistic SELECT ... FOR UPDATE (block up front) and optimistic version columns (retry on conflict) — know both and when each wins.</>,
          <>Serialization failures (40001) are not bugs; they are the contract. SERIALIZABLE without an app-side retry loop is broken by design.</>,
        ]}
      />
    </>
  )
}
