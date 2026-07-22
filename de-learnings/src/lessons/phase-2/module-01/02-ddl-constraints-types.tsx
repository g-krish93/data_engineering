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

const ID = '2.1.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="A schema is a contract">
        <Tiered
          layman={
            <>
              <p>Imagine collecting job applications two ways. Option one: hand people a blank sheet of paper. You will get life stories, phone numbers with missing digits, and one drawing of a cat. Option two: a printed form — name <em>required</em>, date in boxes, salary must be a number, and a clerk who rejects any form filled out wrong <em>before</em> it enters the filing cabinet.</p>
              <p>A database <GlossaryTerm k="schema">schema</GlossaryTerm> is the printed form; constraints are the clerk. The clerk never sleeps, never makes an exception for a coworker in a hurry, and checks every single submission. Data that gets past the clerk can be trusted forever after — that is the entire value proposition.</p>
            </>
          }
          student={
            <>
              <p>In P1 you loaded API data into DuckDB and cleaned up whatever arrived. Postgres flips the responsibility: <code>CREATE TABLE</code> declares what valid data looks like — column types, required fields, uniqueness, cross-table references — and the engine <em>rejects</em> any write that violates the contract, no matter which application, script, or intern sent it.</p>
              <p>This matters most precisely because a server has many clients (last lesson). Application-side validation only protects writes that go through that application. A constraint in the database protects the data against every path — the web app, the batch job, the one-off psql session at 2am. For a data engineer, upstream constraints are a gift: they are the reason source data has a knowable shape at all.</p>
            </>
          }
          phd={
            <>
              <p>Constraints are declarative invariants: the engine guarantees that every committed state satisfies them, which is exactly the C in ACID (next lesson). The guarantee is enforced at write time — per-row checks, index probes for uniqueness, lookups for foreign keys — so the contract has a runtime price, and you will see engines at the other end of the spectrum (warehouses) deliberately decline to pay it.</p>
              <p>There is also an information-theoretic reading: a schema is documentation that cannot rot. Column types, nullability, and references encode the data model in a machine-checked form; ORMs, BI tools, and your future pipeline code all introspect it. When you meet schemaless systems later (JSON blobs, <GlossaryTerm k="data-lake">data lakes</GlossaryTerm>), the schema has not disappeared — it has moved into every reader, unchecked. DDIA chapter 2 covers this schema-on-write vs schema-on-read tension well.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Choosing types (money is never float)">
        <Tiered
          layman={
            <>
              <p>Types are the shapes of the boxes on the form: a date box cannot hold "banana", and a number box cannot hold "N/A". Picking the right box matters most for two things people constantly get wrong: money and time.</p>
              <p>Money: computers have two kinds of number boxes — a fast one that stores <em>approximations</em> (fine for sensor readings) and an exact one that stores decimal digits (required for money). Use the fast one for prices and pennies quietly go missing. Time: always store the world-clock time (UTC) and translate for display, the way airlines schedule in UTC and print your boarding pass in local time.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Integers:</strong> <code>int</code> (4 bytes, max about 2.1 billion) vs <code>bigint</code> (8 bytes). IDs get <code>bigint GENERATED ALWAYS AS IDENTITY</code> — tables outlive your estimates.</li>
                <li><strong>Money and exact quantities:</strong> <code>numeric(p,s)</code> — exact decimal, e.g. <code>numeric(12,2)</code>. <code>float</code>/<code>double precision</code> are binary approximations: 0.1 has no exact binary representation. Money is never float.</li>
                <li><strong>Strings:</strong> <code>text</code>. In Postgres, <code>varchar(n)</code> has identical storage and performance — it only adds a length check. Prefer <code>text</code>, add a <code>CHECK</code> if the business truly has a limit.</li>
                <li><strong>Time:</strong> <code>timestamptz</code>, always. It stores the UTC instant and converts to the session's time zone for display. Plain <code>timestamp</code> stores a zone-less wall-clock reading — a bug generator across time zones and DST. Store UTC, convert at the edge.</li>
                <li><strong>Others:</strong> <code>boolean</code> for flags; <code>uuid</code> for identifiers generated outside the database (distributed systems, public URLs).</li>
              </ul>
            </>
          }
          phd={
            <>
              <p><code>numeric</code> stores base-10 digits (internally groups of four decimal digits) with arbitrary precision — exact, but arithmetic is software-implemented and slower. <code>double precision</code> is IEEE 754 binary64: 53 bits of mantissa, hardware speed, and any value not expressible as a sum of powers of two (like 0.1) is rounded on entry. The classic failure is not one addition — it is a million-row SUM whose error compounds, then a reconciliation against the general ledger that is off by 3 cents and costs a week.</p>
              <p><code>timestamptz</code> is a single int64: microseconds since 2000-01-01 00:00:00 UTC. No time zone is stored — the name is misleading. The session's <code>TimeZone</code> setting drives parsing on input and rendering on output; two sessions in different zones see different text for the same stored instant. This is why "store UTC" is not a style preference: it is what the type physically does, and fighting it with plain <code>timestamp</code> means encoding the zone in application convention, invisibly.</p>
            </>
          }
        />
        <p>Prove the float problem to yourself — this is the single most expensive type mistake in data work:</p>
        <CodeRunner
          language="sql"
          label="DuckDB — why money is never float"
          code={`SELECT 0.1::DOUBLE + 0.2::DOUBLE          AS float_sum,      -- not 0.3
       (0.1::DOUBLE + 0.2::DOUBLE) = 0.3  AS float_equal,    -- false!
       0.1::DECIMAL(12,2) + 0.2::DECIMAL(12,2) AS numeric_sum;`}
        />
        <CodeRunner
          language="sql"
          label="DuckDB — a dime goes missing at scale"
          code={`-- Subtract a million dollars from a million dollars and ten cents:
SELECT 1000000.10::DOUBLE - 1000000.00::DOUBLE       AS float_dime,
       1000000.10::DECIMAL(12,2) - 1000000.00::DECIMAL(12,2) AS exact_dime;`}
        />
        <p>And the time-zone behavior, which needs a real Postgres session (run this in the lab):</p>
        <CodeBlock label="psql" code={`SET timezone = 'Asia/Kolkata';
SELECT now();               -- 2026-07-22 21:15:00.000000+05:30
SET timezone = 'UTC';
SELECT now();               -- same instant, displayed +00`} />
      </Section>

      <Section kicker="core concepts" title="Constraints: the contract, enforced">
        <Tiered
          layman={
            <>
              <p>Five rules the clerk can enforce: a box may not be left blank (NOT NULL); each form gets a unique file number (PRIMARY KEY); no two people may claim the same email (UNIQUE); an answer must pass a sanity test, like "quantity above zero" (CHECK); and a form may only reference another file that actually exists (FOREIGN KEY).</p>
              <p>The foreign-key rule also works in reverse: what happens if someone tries to throw away a file that other forms point at? The office can refuse (RESTRICT), shred every form that pointed there too (CASCADE), or blank out the reference (SET NULL). Choosing which is a business decision, not a technical one.</p>
            </>
          }
          student={
            <>
              <p>The full vocabulary in one table definition — this is the shape you will build in the lab:</p>
              <CodeBlock label="psql" code={`CREATE TABLE customers (
  customer_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL UNIQUE,
  full_name   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  order_id    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES customers (customer_id) ON DELETE RESTRICT,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  quantity    integer NOT NULL CHECK (quantity > 0),
  unit_price  numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  ordered_at  timestamptz NOT NULL DEFAULT now()
);`} />
              <p><code>ON DELETE RESTRICT</code> refuses to delete a customer who has orders; <code>CASCADE</code> deletes their orders too (dangerous default to reach for — great for genuinely dependent data like order line-items); <code>SET NULL</code> keeps orders but orphans them explicitly (requires the column be nullable). Schemas evolve with <code>ALTER TABLE ... ADD COLUMN</code> and <code>ADD CONSTRAINT</code> — Postgres validates existing rows against a new constraint before accepting it.</p>
            </>
          }
          phd={
            <>
              <p>Enforcement costs: NOT NULL and CHECK are per-row expression evaluations — nearly free. PRIMARY KEY and UNIQUE are backed by a btree index; every insert probes it (and gains fast lookups as a side effect). FOREIGN KEY fires an internal parent-table lookup per write, and under concurrency takes a lock on the referenced row so a concurrent delete cannot invalidate the check mid-transaction — correctness that costs contention on hot parent rows. Constraints can be declared <code>DEFERRABLE</code> to move the check to commit time, useful for circular references and bulk reorderings.</p>
              <p>These write-time costs explain a pattern you will meet in Phase 4: analytical <GlossaryTerm k="data-warehouse">warehouses</GlossaryTerm> (Snowflake, BigQuery) accept FK declarations but do not enforce them. Bulk-loading billions of rows with per-row parent lookups would be ruinous, and warehouse data arrives from sources that already enforced integrity (or from pipelines expected to test it). Enforcement moves from the engine to the <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> — dbt tests, contract checks — trading a hard guarantee for load throughput.</p>
            </>
          }
        />
        <Callout kind="info" title="DuckDB runs these demos; Postgres runs the lab">
          The runnable blocks below use DuckDB, which enforces PRIMARY KEY, NOT NULL, UNIQUE, CHECK, and FK existence — the portable core. The <code>ON DELETE</code> actions (RESTRICT/CASCADE/SET NULL) are Postgres territory here: you will exercise them in the lab container.
        </Callout>
        <p>Now break the contract on purpose and read each rejection. First, a duplicate key:</p>
        <CodeRunner
          language="sql"
          label="DuckDB — primary key violation"
          setup={`CREATE OR REPLACE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  price      DECIMAL(10,2) NOT NULL CHECK (price >= 0)
);
INSERT INTO products VALUES (1, 'Keyboard', 49.99), (2, 'Mouse', 19.99);`}
          code={`-- product_id 1 is taken. Run it, read the error, then change 1 to 3 and re-run.
INSERT INTO products VALUES (1, 'Duplicate keyboard', 10.00);`}
        />
        <CodeRunner
          language="sql"
          label="DuckDB — CHECK constraint violation"
          setup={`CREATE OR REPLACE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  price      DECIMAL(10,2) NOT NULL CHECK (price >= 0)
);`}
          code={`-- The clerk reads every form: a negative price never enters the cabinet.
INSERT INTO products VALUES (3, 'Refund glitch', -5.00);`}
        />
        <CodeRunner
          language="sql"
          label="DuckDB — foreign key violation"
          setup={`DROP TABLE IF EXISTS fk_orders;
DROP TABLE IF EXISTS fk_customers;
CREATE TABLE fk_customers (customer_id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE);
CREATE TABLE fk_orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES fk_customers (customer_id),
  amount      DECIMAL(10,2) NOT NULL CHECK (amount > 0)
);
INSERT INTO fk_customers VALUES (1, 'ada@example.com');`}
          code={`-- Customer 99 does not exist, so this order would be an orphan.
-- Run it, read the error, then change 99 to 1 and re-run.
INSERT INTO fk_orders VALUES (1, 99, 25.00);`}
        />
      </Section>

      <Section kicker="trade-offs" title="Where should the rules live?">
        <Tradeoffs
          options={[
            {
              name: 'Constraints in the database',
              strengths: [
                'Protects every write path — every app, script, and human',
                'Cannot drift out of sync with the data; self-documenting via introspection',
                'Violations fail loudly at the source, not silently downstream',
              ],
              weaknesses: [
                'Write-time cost: index probes and FK lookups on every insert',
                'Poor error messages for end users — apps must translate them',
                'Schema changes need migrations, coordinated with deploys',
              ],
              chooseWhen: 'the database is a shared source of truth with multiple writers — the default for OLTP.',
            },
            {
              name: 'Validation in application code',
              strengths: [
                'Rich, user-facing error handling and business logic',
                'Rules can be complex, contextual, and easy to unit-test',
              ],
              weaknesses: [
                'Only guards its own path — psql, batch jobs, and the next microservice bypass it',
                'Duplicated across services; drifts from reality over time',
              ],
              chooseWhen: 'never alone for integrity rules. Right layer for UX validation and business workflows, on top of database constraints.',
            },
            {
              name: 'Declared but not enforced (warehouse style)',
              strengths: [
                'Bulk loads run at full speed — no per-row checks',
                'Declarations still document the model and help query planners',
              ],
              weaknesses: [
                'Integrity is only as good as the upstream pipeline and its tests',
                'Bad data lands silently; you find out from a dashboard, not an error',
              ],
              chooseWhen: 'analytical warehouses fed by pipelines that already test integrity — throughput beats per-row guarantees there.',
            },
          ]}
          note={
            <>
              The professional answer is defense in depth: database constraints as the last line that cannot be bypassed, application validation for user experience, pipeline tests for analytical copies. The interview trap is "we validate in the app, so the database does not need constraints" — name the bypass paths.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: build the schema, then attack it">
        <Lab
          lessonId={ID}
          intro={
            <p>You will create the customers/orders schema in <code>pg-lab</code>, then try to break every rule on purpose. Each rejection is a checkpoint: read the error name — Postgres tells you exactly which constraint fired. Commands labeled <strong>psql</strong> go in your psql session.</p>
          }
          steps={[
            {
              title: 'Connect to appdb as app_user',
              commands: [{ ps: 'docker start pg-lab\ndocker exec -it pg-lab psql -U app_user -d appdb' }],
              checkpoint: <><code>\conninfo</code> shows user <code>app_user</code>, database <code>appdb</code>. (<code>docker start</code> is a no-op if the container already runs.)</>,
            },
            {
              title: 'Create both tables',
              body: <p>Copy the two CREATE TABLE statements from the concepts section above (customers first — orders references it). Then inspect what Postgres recorded:</p>,
              commands: [{ ps: '\\dt\n\\d customers\n\\d orders', label: 'psql' }],
              checkpoint: <><code>\d orders</code> lists the CHECK constraints, the FK (<code>REFERENCES customers</code>), defaults for <code>status</code> and <code>ordered_at</code>, and identity on <code>order_id</code>.</>,
            },
            {
              title: 'Insert valid rows',
              commands: [{ ps: "INSERT INTO customers (email, full_name) VALUES\n  ('ada@example.com', 'Ada Lovelace'),\n  ('grace@example.com', 'Grace Hopper')\nRETURNING customer_id, created_at;\n\nINSERT INTO orders (customer_id, quantity, unit_price) VALUES (1, 2, 19.99), (2, 1, 149.00)\nRETURNING order_id, status, ordered_at;", label: 'psql' }],
              checkpoint: <><code>RETURNING</code> shows generated ids (1, 2), <code>status</code> defaulted to <code>pending</code>, and timestamps defaulted to now — DEFAULT and IDENTITY working.</>,
            },
            {
              title: 'Attack NOT NULL',
              commands: [{ ps: "INSERT INTO customers (email) VALUES ('nameless@example.com');", label: 'psql' }],
              checkpoint: <>Rejected: <code>null value in column "full_name" ... violates not-null constraint</code>. The row never entered the table.</>,
            },
            {
              title: 'Attack UNIQUE',
              commands: [{ ps: "INSERT INTO customers (email, full_name) VALUES ('ada@example.com', 'Ada Impostor');", label: 'psql' }],
              checkpoint: <>Rejected: <code>duplicate key value violates unique constraint "customers_email_key"</code> — note Postgres auto-named the constraint from table and column.</>,
            },
            {
              title: 'Attack CHECK',
              commands: [{ ps: "INSERT INTO orders (customer_id, quantity, unit_price) VALUES (1, 0, 9.99);\nINSERT INTO orders (customer_id, quantity, unit_price, status) VALUES (1, 1, 9.99, 'teleported');", label: 'psql' }],
              checkpoint: <>Two rejections: <code>violates check constraint "orders_quantity_check"</code> and <code>"orders_status_check"</code>. Both name the exact rule that fired.</>,
            },
            {
              title: 'Attack the foreign key from both sides',
              commands: [{ ps: 'INSERT INTO orders (customer_id, quantity, unit_price) VALUES (999, 1, 5.00);\nDELETE FROM customers WHERE customer_id = 1;', label: 'psql' }],
              checkpoint: <>Both rejected with <code>violates foreign key constraint</code>: the insert because customer 999 does not exist, the delete because ON DELETE RESTRICT protects a customer who still has orders.</>,
            },
            {
              title: 'Watch timestamptz convert',
              commands: [{ ps: "SET timezone = 'Asia/Kolkata';\nSELECT order_id, ordered_at FROM orders;\nSET timezone = 'UTC';\nSELECT order_id, ordered_at FROM orders;", label: 'psql' }],
              checkpoint: <>The same rows display <code>+05:30</code> then <code>+00</code> — offsets differ, the instant is identical. Nothing in the table changed; only the rendering did.</>,
            },
            {
              title: 'Evolve the schema with ALTER TABLE',
              commands: [{ ps: 'ALTER TABLE customers ADD COLUMN loyalty_points integer NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0);\nUPDATE customers SET loyalty_points = -10 WHERE customer_id = 1;', label: 'psql' }],
              checkpoint: <>The ADD COLUMN succeeds (existing rows get 0); the UPDATE is rejected by the new CHECK. Constraints guard updates, not just inserts.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why is numeric(12,2) the right type for money instead of double precision?',
              options: [
                'numeric is faster for arithmetic',
                'numeric stores exact decimal digits; double is a binary approximation where 0.1 cannot be represented exactly',
                'double cannot store values over a million',
                'numeric compresses better on disk',
              ],
              answer: 1,
              explain: 'Floats are base-2: 0.1 is a repeating fraction in binary, rounded on entry, and errors compound across aggregations. numeric is exact decimal at the cost of slower, software-implemented arithmetic — the correct trade for money.',
            },
            {
              q: 'What does a timestamptz column actually store?',
              options: [
                'The timestamp plus the writer\'s time zone',
                'A UTC instant (no zone stored); the session time zone converts it for display',
                'Local wall-clock time in the server\'s zone',
                'A formatted string with an offset suffix',
              ],
              answer: 1,
              explain: 'Despite the name, no zone is stored — just an int64 UTC instant. Input is normalized to UTC and output rendered per the session TimeZone, which is why two sessions can print different text for the same value.',
            },
            {
              q: 'In Postgres, varchar(50) compared to text:',
              options: [
                'Is stored more compactly',
                'Is significantly faster to index',
                'Has identical storage and performance — it only adds a length check',
                'Is required for columns used in a UNIQUE constraint',
              ],
              answer: 2,
              explain: 'Both are the same variable-length string type under the hood. varchar(n) merely enforces a maximum length — use text, and add a CHECK if the business really has a limit.',
            },
            {
              q: 'orders.customer_id REFERENCES customers ON DELETE RESTRICT. Deleting a customer with orders will:',
              options: [
                'Delete the customer and their orders',
                'Delete the customer and set orders.customer_id to NULL',
                'Fail with a foreign key violation, leaving everything unchanged',
                'Succeed, leaving orphaned orders',
              ],
              answer: 2,
              explain: 'RESTRICT refuses the delete while referencing rows exist. CASCADE would delete the orders too; SET NULL would orphan them explicitly and needs a nullable column. Which one is right is a business decision.',
            },
            {
              q: 'Why do analytical warehouses like Snowflake accept FK declarations but not enforce them?',
              options: [
                'Their storage format cannot express references',
                'Analytical queries never join tables',
                'FKs are a legacy OLTP-only concept with no documentation value',
                'Per-row FK checks would cripple bulk loads; integrity is delegated to upstream systems and pipeline tests',
              ],
              answer: 3,
              explain: 'Enforcement costs a parent lookup per row — ruinous at billions of rows. Warehouses trust that OLTP sources enforced integrity and that pipelines test it; the declarations still document the model.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What type would you use for a price column, and why?',
            a: <p>numeric (decimal) with explicit precision and scale, never float. Floats are binary approximations — 0.1 is not representable — and errors compound in aggregations, which is fatal for reconciliation. Strong answers add: integers of the minor unit (cents) are a valid alternative, and analytics engines make the same distinction (DECIMAL vs DOUBLE).</p>,
          },
          {
            q: 'Should data integrity rules live in the database or the application?',
            a: <p>Both, with different jobs: database constraints are the non-bypassable last line (they guard every write path, including ad-hoc scripts); application validation gives users good error messages and handles business workflow. The follow-up worth volunteering: in warehouses, enforcement moves to pipeline tests because per-row checks are too expensive at bulk-load scale.</p>,
          },
          {
            q: 'Why timestamptz over timestamp in Postgres?',
            a: <p>timestamptz pins the value to a real instant (stored as UTC) and converts per session for display; plain timestamp is a zone-less wall-clock reading whose meaning depends on convention nobody wrote down. Cross-timezone teams and DST transitions break the latter silently. Store UTC, convert at the display edge.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A schema is a contract; constraints are that contract enforced on every write path by an engine that never sleeps.</>,
          <>Money is never float: numeric stores exact decimal digits; float is a binary approximation whose errors compound in aggregates.</>,
          <>timestamptz stores a UTC instant and converts for display — no zone is stored. Always timestamptz; always store UTC.</>,
          <>Prefer text over varchar(n) in Postgres (identical storage); prefer bigint identity for keys.</>,
          <>NOT NULL, PRIMARY KEY, UNIQUE, CHECK, FOREIGN KEY (+ ON DELETE RESTRICT/CASCADE/SET NULL) and DEFAULT are the whole constraint vocabulary — and every rejection names the constraint that fired.</>,
          <>Defense in depth: database constraints for integrity, app validation for UX, pipeline tests for warehouses that deliberately skip enforcement.</>,
        ]}
      />
    </>
  )
}
