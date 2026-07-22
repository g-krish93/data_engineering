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

const ID = '2.1.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="All or nothing: the transaction">
        <Tiered
          layman={
            <>
              <p>A wedding ceremony has a strange property: there is no halfway. If one person says "I do" and the officiant faints before the second "I do", nobody is married. The ceremony either completes — both vows, the pronouncement — or it legally never happened. You can rerun it tomorrow from the start; what you cannot be is half-married.</p>
              <p>Moving money works the same way. "Take 30 from Alice, give 30 to Bob" must never stop in the middle, because the middle is a world where 30 vanished. A <em>transaction</em> is the database's ceremony: a group of changes that either all happen or none happen, no matter what fails in between — your code, the network, or the power supply.</p>
            </>
          }
          student={
            <>
              <p>Every multi-step change has a dangerous middle. The transfer is the classic: debit succeeded, credit failed — money destroyed. Your P1 pipeline had the same shape: delete yesterday's partition, then insert the fresh rows. Crash between the two and the day's data is simply gone. When you wrapped both in one unit, you were using a transaction, whether you called it that or not.</p>
              <p>The contract is ACID. <strong>Atomicity</strong>: all statements in the transaction take effect or none do. <strong>Consistency</strong>: every constraint from lesson 2.1.2 holds at commit boundaries — the database moves from valid state to valid state. <strong>Isolation</strong>: concurrent transactions do not trample each other (the whole next lesson). <strong>Durability</strong>: once COMMIT returns, the change survives a crash. This lesson is A, C, and D in your hands, with deliberate crashes to test them.</p>
            </>
          }
          phd={
            <>
              <p>Precision matters with ACID because the letters are unequal. Atomicity here means abortability — not the concurrency meaning of "atomic" — and its value is that it makes <em>retry</em> safe: an aborted transaction leaves nothing to clean up, which is the foundation every reliable <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> builds on. Consistency is the odd letter out: the database can only enforce declared invariants (constraints); application-level invariants are your job, so C is a shared responsibility, not a database feature. Isolation and durability are the two with deep engineering underneath — MVCC and WAL respectively.</p>
              <p>Reading assignment: DDIA chapter 7, first half — "The Slippery Concept of a Transaction" through single-object and multi-object operations. Kleppmann's dissection of what ACID does and does not promise (and how vendors blur it) is the best 20 pages on the topic; the second half of the chapter belongs to lesson 2.1.4.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="BEGIN, COMMIT, ROLLBACK — atomicity in your hands">
        <Tiered
          layman={
            <>
              <p>Three words run the ceremony. BEGIN: "we are now in the middle — nothing counts yet." COMMIT: "pronounce it — everything counts, permanently." ROLLBACK: "call it off — restore the world as if we never started."</p>
              <p>The subtle part: if you never say BEGIN, the database quietly treats <em>every single sentence</em> as its own tiny ceremony, committed the instant it succeeds. That is convenient for one-line changes and a trap for multi-step ones — the trap is called autocommit, and it is on by default nearly everywhere.</p>
            </>
          }
          student={
            <>
              <p>In Postgres (and DuckDB, and SQLite) you are <em>always</em> inside a transaction. Without an explicit BEGIN, each statement runs in its own implicit transaction — autocommit. The transfer therefore must be wrapped explicitly: BEGIN, debit, credit, COMMIT. Between BEGIN and COMMIT your changes are private (next lesson makes this precise); at COMMIT they become real atomically; at ROLLBACK they evaporate.</p>
              <p>One more Postgres behavior you will hit in the lab: if any statement inside a transaction errors, the transaction enters an <em>aborted</em> state. Every further statement is refused with "current transaction is aborted" until you ROLLBACK. This is a feature — Postgres refuses to let you commit a half-broken unit — but it surprises everyone the first time.</p>
            </>
          }
          phd={
            <>
              <p>Under the hood, ROLLBACK is almost free in Postgres. Changes are made as new row versions tagged with the writing transaction's id; commit flips one bit per transaction in <code>pg_xact</code>. Abort simply never sets that bit — the already-written row versions are ignored by visibility rules and reclaimed later by VACUUM. There is no undo log replaying reverse operations, which is why even a huge aborted transaction rolls back instantly (contrast with engines like InnoDB or Oracle that maintain undo segments).</p>
              <p>This design also explains the aborted-state rule: after an error, the transaction's writes are unwound only logically. Allowing further statements to succeed and commit would fuse valid and invalid work into one commit bit. Refusing everything until ROLLBACK keeps the atomicity boundary honest. Savepoints (<code>SAVEPOINT s; ... ROLLBACK TO s;</code>) give you sub-transaction granularity when you genuinely need to recover mid-transaction.</p>
            </>
          }
        />
        <p>Run the ceremony three ways. First, a successful transfer — atomic and committed:</p>
        <CodeRunner
          language="sql"
          label="DuckDB — the two-account transfer, committed"
          setup={`CREATE OR REPLACE TABLE accounts (
  name    TEXT PRIMARY KEY,
  balance DECIMAL(12,2) NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES ('alice', 100.00), ('bob', 100.00);`}
          code={`BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE name = 'alice';
UPDATE accounts SET balance = balance + 30 WHERE name = 'bob';
COMMIT;
SELECT * FROM accounts ORDER BY name;  -- 70 and 130: both legs, or neither`}
        />
        <CodeRunner
          language="sql"
          label="DuckDB — same transfer, change of heart"
          setup={`CREATE OR REPLACE TABLE accounts (
  name    TEXT PRIMARY KEY,
  balance DECIMAL(12,2) NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES ('alice', 100.00), ('bob', 100.00);`}
          code={`BEGIN;
UPDATE accounts SET balance = balance - 90 WHERE name = 'alice';
UPDATE accounts SET balance = balance + 90 WHERE name = 'bob';
ROLLBACK;  -- as if it never happened
SELECT * FROM accounts ORDER BY name;  -- both back at 100.00`}
        />
        <p>Now the interesting one — a failure in the middle. Bob is credited, then Alice's debit violates the CHECK constraint (she only has 100):</p>
        <CodeRunner
          language="sql"
          label="DuckDB — deliberate mid-transaction failure"
          setup={`CREATE OR REPLACE TABLE accounts (
  name    TEXT PRIMARY KEY,
  balance DECIMAL(12,2) NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES ('alice', 100.00), ('bob', 100.00);`}
          code={`BEGIN;
UPDATE accounts SET balance = balance + 500 WHERE name = 'bob';   -- succeeds...
UPDATE accounts SET balance = balance - 500 WHERE name = 'alice'; -- CHECK rejects this
COMMIT;`}
        />
        <Callout kind="warn" title="What just happened to Bob's 500?">
          It evaporated with the transaction: COMMIT never succeeded, so the credit was never real. In Postgres the session would now be in the <em>aborted</em> state — here is the exact transcript you will reproduce in the lab:
          <CodeBlock label="psql" code={`appdb=> BEGIN;
appdb=> UPDATE accounts SET balance = balance + 500 WHERE name = 'bob';
UPDATE 1
appdb=> UPDATE accounts SET balance = balance - 500 WHERE name = 'alice';
ERROR:  new row for relation "accounts" violates check constraint "accounts_balance_check"
appdb=> SELECT 1;
ERROR:  current transaction is aborted, commands ignored until end of transaction block
appdb=> ROLLBACK;`} />
        </Callout>
      </Section>

      <Section kicker="core concepts" title="What COMMIT actually promises (durability and consistency)">
        <Tiered
          layman={
            <>
              <p>When the librarian says "recorded", what stops a power cut one second later from erasing it? Answer: before saying the word, she writes the change in a bound journal with a pen that cannot be un-inked, and waits for the ink to dry. If the building loses power, tomorrow's first task is rereading the journal and redoing anything the filing cabinets missed. The journal is slow-proof, crash-proof truth; the cabinets are just a convenient arrangement of it.</p>
              <p>That journal is the write-ahead log — WAL. "Write-ahead" is literal: the journal entry always lands before the cabinets are touched, and COMMIT does not return until the entry is safely dry.</p>
            </>
          }
          student={
            <>
              <p><strong>Durability, precisely:</strong> before COMMIT returns success, Postgres appends the transaction's changes to the WAL and calls <code>fsync</code>, forcing them onto durable storage. Data pages in memory may be written to their real locations much later — if the server crashes first, recovery replays WAL from the last checkpoint and reconstructs them. The promise is exact: <em>anything committed before the crash survives; anything uncommitted vanishes cleanly.</em> The lab has you kill the server mid-flight to watch both halves.</p>
              <p><strong>Consistency, precisely:</strong> at every commit boundary, all declared constraints hold. The CHECK that stopped Alice's overdraft above is consistency doing its job <em>inside</em> a transaction: atomicity guaranteed the rejection unwound the whole unit. The two properties compose — constraints define valid states, transactions ensure the database only ever moves between them.</p>
            </>
          }
          phd={
            <>
              <p>WAL is a masterpiece of turning random I/O into sequential I/O: modifying scattered heap pages becomes appending records to one log, and a single flush can durably cover many transactions (group commit — under load, throughput rises because commits amortize the fsync). The dark corners are real: consumer drives historically acknowledged fsync from volatile caches ("lying drives"), and a torn 8KB page write mid-crash could leave a Frankenstein page — Postgres counters with full-page writes after each checkpoint, logging entire page images so replay starts from known-good bytes.</p>
              <p>Recovery is redo-only: replay WAL forward from the last checkpoint; uncommitted transactions need no undo because their row versions simply never had the commit bit set in <code>pg_xact</code> — MVCC visibility makes them invisible dead tuples. Tuning knob worth knowing: <code>synchronous_commit = off</code> lets COMMIT return before the flush — a small window of committed-then-lost on crash, no corruption ever — a legitimate trade for high-volume, replayable ingestion. DDIA ch. 7's single-node sections formalize all of this.</p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="How big should a transaction be?">
        <Tradeoffs
          options={[
            {
              name: 'One transaction per logical unit (small)',
              strengths: [
                'Locks held briefly — concurrent writers barely notice',
                'A failure retries one small unit, not hours of work',
                'Steady, smooth WAL traffic',
              ],
              weaknesses: [
                'Per-commit overhead (an fsync each) caps throughput',
                'No atomicity across units — partial overall progress is visible',
              ],
              chooseWhen: 'OLTP request paths: one user action, one transaction. The default.',
            },
            {
              name: 'One giant transaction for the whole batch',
              strengths: [
                'Perfect all-or-nothing for the entire load — no partial states ever visible',
                'One fsync; bulk work amortizes beautifully',
              ],
              weaknesses: [
                'Locks and row versions held for the whole runtime — blocks others, bloats tables',
                'Retry blast radius is everything: one bad row at hour three wastes three hours',
              ],
              chooseWhen: 'small-to-medium batch loads where the atomic swap is the point — P1\'s delete-then-insert of a day partition is exactly this.',
            },
            {
              name: 'Chunked transactions + idempotent retries',
              strengths: [
                'Bounded lock times and bounded retry cost per chunk',
                'A crashed backfill resumes from the last committed chunk',
              ],
              weaknesses: [
                'Between chunks, the table is visibly half-loaded — readers need to tolerate it',
                'Requires deliberate design: stable keys, MERGE/upsert logic, progress tracking',
              ],
              chooseWhen: 'large backfills and long-running pipeline loads — the professional pattern from Phase 3 onward.',
            },
          ]}
          note={
            <>
              The pipeline connection: chunked loading only works because each chunk is atomic <em>and</em> the whole job is{' '}
              <GlossaryTerm k="idempotency">idempotent</GlossaryTerm> — rerunning a committed chunk must be harmless. Transactions give you the first property; you design the second.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: transfer money, then crash the server on purpose">
        <Lab
          lessonId={ID}
          intro={
            <p>You will run the transfer in <code>pg-lab</code>, reproduce the aborted-transaction state, then <code>docker kill</code> the server (SIGKILL — no graceful shutdown) twice: once mid-transaction and once just after COMMIT. Keep two terminals open: one holding psql, one for docker commands.</p>
          }
          steps={[
            {
              title: 'Create and seed the accounts table',
              commands: [
                { ps: 'docker start pg-lab\ndocker exec -it pg-lab psql -U app_user -d appdb' },
                { ps: "DROP TABLE IF EXISTS accounts;\nCREATE TABLE accounts (\n  name    text PRIMARY KEY,\n  balance numeric(12,2) NOT NULL CHECK (balance >= 0)\n);\nINSERT INTO accounts VALUES ('alice', 100.00), ('bob', 100.00);\nSELECT * FROM accounts ORDER BY name;", label: 'psql' },
              ],
              checkpoint: <>Two rows, both at <code>100.00</code>.</>,
            },
            {
              title: 'Run the committed transfer',
              commands: [{ ps: "BEGIN;\nUPDATE accounts SET balance = balance - 30 WHERE name = 'alice';\nUPDATE accounts SET balance = balance + 30 WHERE name = 'bob';\nCOMMIT;\nSELECT * FROM accounts ORDER BY name;", label: 'psql' }],
              checkpoint: <>alice <code>70.00</code>, bob <code>130.00</code>.</>,
            },
            {
              title: 'Fail mid-transaction and meet the aborted state',
              commands: [{ ps: "BEGIN;\nUPDATE accounts SET balance = balance + 500 WHERE name = 'bob';\nUPDATE accounts SET balance = balance - 500 WHERE name = 'alice';\nSELECT 1;\nROLLBACK;\nSELECT * FROM accounts ORDER BY name;", label: 'psql' }],
              checkpoint: <>Three observations: the second UPDATE fails with <code>violates check constraint "accounts_balance_check"</code>; the innocent <code>SELECT 1</code> fails with <code>current transaction is aborted</code>; after ROLLBACK, balances are still <code>70.00</code> / <code>130.00</code> — Bob's phantom 500 never existed.</>,
            },
            {
              title: 'Crash the server mid-transaction (uncommitted)',
              body: <p>Start a transfer but do not commit. In your <em>second</em> terminal, kill the container with SIGKILL — the process gets no chance to clean up.</p>,
              commands: [
                { ps: "BEGIN;\nUPDATE accounts SET balance = balance - 10 WHERE name = 'alice';\nUPDATE accounts SET balance = balance + 10 WHERE name = 'bob';\nSELECT * FROM accounts ORDER BY name;  -- inside the txn you see 60 / 140", label: 'psql' },
                { ps: 'docker kill pg-lab', label: 'PowerShell (second terminal)' },
              ],
              checkpoint: <>Your psql session dies (<code>server closed the connection unexpectedly</code> on the next keystroke). The transaction was in flight, never committed.</>,
            },
            {
              title: 'Restart and watch crash recovery replay the WAL',
              commands: [{ ps: 'docker start pg-lab\ndocker logs --tail 20 pg-lab' }],
              checkpoint: <>The log shows <code>database system was not shut down properly; automatic recovery in progress</code> and a <code>redo starts at ...</code> line — that is WAL replay reconstructing the data files.</>,
            },
            {
              title: 'Verify: uncommitted vanished, committed survived',
              commands: [
                { ps: 'docker exec -it pg-lab psql -U app_user -d appdb' },
                { ps: 'SELECT * FROM accounts ORDER BY name;', label: 'psql' },
              ],
              checkpoint: <>Balances are <code>70.00</code> / <code>130.00</code> — the uncommitted minus-10/plus-10 evaporated cleanly, while the committed transfer from step 2 is intact. Durability's promise, both halves, witnessed.</>,
            },
            {
              title: 'Crash immediately after COMMIT',
              body: <p>Now commit a transfer and kill the server as fast as you can afterwards — try to beat the checkpoint.</p>,
              commands: [
                { ps: "BEGIN;\nUPDATE accounts SET balance = balance - 10 WHERE name = 'alice';\nUPDATE accounts SET balance = balance + 10 WHERE name = 'bob';\nCOMMIT;", label: 'psql' },
                { ps: 'docker kill pg-lab\ndocker start pg-lab\ndocker exec -it pg-lab psql -U app_user -d appdb -c "SELECT * FROM accounts ORDER BY name;"' },
              ],
              checkpoint: <>alice <code>60.00</code>, bob <code>140.00</code> — committed one second before a SIGKILL, and still there after recovery. COMMIT returned only after the WAL record was fsynced; the crash could not take it back.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'A transfer debits account A, then the server crashes before the credit to B. After recovery:',
              options: [
                'A is debited; B must be credited manually',
                'Neither change exists — the uncommitted transaction left no trace',
                'Both changes exist because the debit statement succeeded',
                'The database is corrupted and needs restoring from backup',
              ],
              answer: 1,
              explain: 'Atomicity: without a COMMIT, the transaction never happened. Recovery replays WAL for committed work and the uncommitted row versions are simply never visible. This is what makes retrying safe.',
            },
            {
              q: 'What has Postgres guaranteed at the moment COMMIT returns successfully?',
              options: [
                'All modified data pages are written to their final locations on disk',
                'The changes are in the WAL, fsynced to durable storage — data pages may follow later',
                'All other sessions have seen the new data',
                'A checkpoint has completed',
              ],
              answer: 1,
              explain: 'Durability rides on the log, not the data files. WAL is flushed before COMMIT returns; crash recovery replays it to rebuild any data pages that had not been written yet.',
            },
            {
              q: 'Inside a transaction, one statement fails. You then run SELECT 1. Postgres:',
              options: [
                'Runs it normally — the failed statement was rolled back alone',
                'Automatically commits the statements that succeeded',
                'Refuses with "current transaction is aborted" until you ROLLBACK',
                'Disconnects your session',
              ],
              answer: 2,
              explain: 'An error aborts the whole transaction; Postgres refuses further work so you cannot commit a half-broken unit. ROLLBACK (or savepoints, if you planned ahead) is the only way out.',
            },
            {
              q: 'You never type BEGIN in psql. Your UPDATE statements are:',
              options: [
                'Not durable until you eventually type COMMIT',
                'Each wrapped in its own implicit transaction and committed immediately (autocommit)',
                'Queued until the session ends',
                'Rejected — statements require an explicit transaction',
              ],
              answer: 1,
              explain: 'Autocommit is the default reality: every standalone statement is its own atomic, durable transaction. Convenient for one-liners; the reason multi-step changes must be wrapped explicitly.',
            },
            {
              q: 'A 4-hour backfill runs as one giant transaction and fails on a bad row at hour 3. The strongest argument for chunked transactions instead:',
              options: [
                'Chunks use less total WAL',
                'Giant transactions are not atomic',
                'Chunks avoid the need for constraints',
                'The retry blast radius: chunk N fails, chunks 1 to N-1 stay committed, and you resume instead of redoing 3 hours',
              ],
              answer: 3,
              explain: 'Both shapes are atomic per transaction; the difference is what a failure costs. Chunking bounds locks and retries — provided each chunk is idempotent so re-running is harmless.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What does COMMIT actually guarantee, mechanically?',
            a: <p>That the transaction's WAL records are flushed (fsynced) to durable storage before the call returns. Data pages may be updated on disk much later; a crash in between is fine because recovery replays the WAL from the last checkpoint. Strong answers name the log-before-data ordering and note that uncommitted work needs no undo — it was never made visible.</p>,
          },
          {
            q: 'Your pipeline replaces a day partition by deleting then inserting. Why must that be one transaction?',
            a: <p>Because the middle state — partition deleted, new rows not yet in — is a lie readers can see, and a crash there loses the day entirely. Wrapping both in a transaction makes the swap atomic: readers see the old day or the new day, never neither, and a failed run leaves the old data intact for a clean retry. This is the smallest example of a general rule: pipeline writes should commit at meaningful boundaries.</p>,
          },
          {
            q: 'When would you loosen durability, and how?',
            a: <p>For high-volume ingestion of replayable data (events, logs), synchronous_commit = off lets commits return before the WAL flush — a crash can lose the last few hundred milliseconds of committed transactions but never corrupts. If the source can replay, that window is a fair price for throughput. Never for money or anything unreplayable.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A transaction is all-or-nothing: BEGIN starts the unit, COMMIT makes it real atomically, ROLLBACK erases it — and a mid-transaction error erases it too.</>,
          <>Autocommit is the default: without BEGIN, every statement is its own committed transaction. Multi-step changes must be wrapped explicitly.</>,
          <>After an error, a Postgres transaction is aborted — everything fails until ROLLBACK. This protects the atomicity boundary.</>,
          <>Durability = WAL flushed to disk before COMMIT returns. Crash recovery replays the log; committed work survives SIGKILL, uncommitted work vanishes cleanly — you proved both.</>,
          <>Consistency means constraints hold at every commit boundary; the database and your application share responsibility for invariants.</>,
          <>Transaction size is a trade-off: small = short locks and cheap retries; giant = perfect atomic swaps; chunked + idempotent = the backfill pattern.</>,
        ]}
      />
    </>
  )
}
