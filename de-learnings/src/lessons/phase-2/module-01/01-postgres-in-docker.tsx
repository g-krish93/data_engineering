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

const ID = '2.1.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Your first database server">
        <Tiered
          layman={
            <>
              <p>Until now your database was a personal notebook. DuckDB lives in your bag: you open it, write in it, close it. Nobody else can write in it while you hold the pen, and if a friend wants to read it, you hand over the whole notebook.</p>
              <p>A database <em>server</em> is the town library with a librarian. Hundreds of people visit at once. The librarian checks your card at the door, decides which rooms you may enter, fetches what you ask for, and keeps the one authoritative copy of every record safe — even if the power goes out mid-sentence. Postgres is that librarian. This module teaches you to run one, talk to one, and trust one.</p>
            </>
          }
          student={
            <>
              <p>DuckDB is an <em>embedded</em> database: a library linked into your process. In P1 your CLI opened a <code>.duckdb</code> file directly — queries were function calls, and your process owned the file. Perfect for single-user analytics; hopeless for an application. A web app has many concurrent users, needs per-user permissions, must accept connections over a network, and needs one durable source of truth that outlives any client process.</p>
              <p>Postgres is a <em>client-server</em> database. The server runs as its own long-lived process, listens on TCP port 5432, and speaks a wire protocol. Clients — your Python code, <code>psql</code>, a dashboard — connect, authenticate as a role, and send SQL. The server enforces permissions, coordinates concurrent transactions, and guarantees committed data survives crashes. Nearly every <GlossaryTerm k="oltp">OLTP</GlossaryTerm> system you will ever integrate with is built this way.</p>
            </>
          }
          phd={
            <>
              <p>Embedded vs client-server is an architecture axis, not a maturity ranking — SQLite is the most widely deployed database on earth precisely because embedding is often right. Putting a network protocol at the boundary buys authentication, admission control, centralized caching, and a single write-ahead log making durability decisions in one place. It costs round-trips, serialization overhead, and connection management — a cost you will meet concretely as connection pooling later in this lesson.</p>
              <p>Phase 2 is also where the reading track starts including Kleppmann's <em>Designing Data-Intensive Applications</em> (DDIA). Chapter 2 (data models) and the storage half of chapter 3 pair well with this module; transactions get a dedicated assignment in lesson 2.1.3. Treat DDIA as the theory running alongside these labs.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Embedded vs client-server, concretely">
        <Callout kind="info" title="How runnable snippets work from here on">
          Runnable SQL blocks in this app execute <strong>DuckDB</strong> in your browser — used for portable SQL (DDL, constraints, transactions). Postgres-specific commands appear as <code>psql</code> blocks that you run inside your lab container instead. When a block is labeled <code>psql</code>, it belongs in the lab, not the browser.
        </Callout>
        <Tiered
          layman={
            <>
              <p>"Embedded" means the database lives <em>inside</em> your program, like the spell-checker inside your word processor — there is no separate thing to start or stop. "Client-server" means the database is a separate service you call, like phoning the bank instead of keeping cash in a drawer.</p>
              <p>Each shape is good at what the other is bad at. The drawer is instant and private; the bank handles thousands of customers, checks identity, and keeps the official balance. You are about to run your own tiny bank.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Embedded (DuckDB, SQLite):</strong> the engine is compiled into your process. Zero network hops, zero setup — but one process effectively owns the data file, and there are no users or permissions; the OS filesystem is the only gatekeeper.</li>
                <li><strong>Client-server (Postgres, MySQL):</strong> one server process owns the data directory; any number of clients connect over TCP with credentials. The server arbitrates concurrent writes, enforces per-role permissions, and makes durability promises when it says "committed".</li>
                <li><strong>The modern pattern is both:</strong> Postgres as the <GlossaryTerm k="oltp">OLTP</GlossaryTerm> source of truth, DuckDB (or a warehouse) for <GlossaryTerm k="olap">OLAP</GlossaryTerm>, with a pipeline moving data between them — exactly the architecture your P2/P3 projects build.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>The Postgres process model: a supervisor (the <em>postmaster</em>) listens on the socket and <strong>forks a dedicated backend process per connection</strong>. No thread pool — each connection is an OS process with its own memory. Robust (a crashing backend cannot scribble on its siblings) but expensive: fork cost, per-backend caches, and scheduler pressure mean a few hundred connections is already a lot. That is why serious deployments put a pooler (PgBouncer) in front, multiplexing thousands of client connections onto tens of backends.</p>
              <p>Memory: Postgres reads pages through <code>shared_buffers</code>, its own cache, while the OS page cache <em>also</em> caches the same files — double buffering, and the reason the standard advice is shared_buffers around 25% of RAM rather than most of it. One teaser: every change is written to a <em>write-ahead log</em> before data pages are touched. WAL is the machine under every durability promise — lesson 2.1.3 opens it up.</p>
            </>
          }
        />
        <p>To feel the difference, run an analytics query in the embedded engine that ships inside this very page — no server, no connection, no password:</p>
        <CodeRunner
          language="sql"
          label="DuckDB — an embedded engine running in your browser tab"
          setup={`CREATE OR REPLACE TABLE orders_sample AS
SELECT * FROM (VALUES
  (1, 'north', 120.00, DATE '2026-07-01'),
  (2, 'north',  80.00, DATE '2026-07-02'),
  (3, 'south', 200.00, DATE '2026-07-02'),
  (4, 'east',   40.00, DATE '2026-07-03'),
  (5, 'south', 160.00, DATE '2026-07-04'),
  (6, 'east',   90.00, DATE '2026-07-05'),
  (7, 'north',  60.00, DATE '2026-07-05'),
  (8, 'south',  30.00, DATE '2026-07-06')
) AS t(order_id, region, amount, order_day);`}
          code={`-- OLAP is DuckDB's home turf: scan, group, rank.
SELECT region,
       count(*)    AS orders,
       sum(amount) AS revenue,
       rank() OVER (ORDER BY sum(amount) DESC) AS revenue_rank
FROM orders_sample
GROUP BY region
ORDER BY revenue_rank;`}
        />
        <p>Postgres could run this query too — but its specialty is many clients concurrently reading and writing individual rows, safely. Keep that division of labor in mind all phase.</p>
      </Section>

      <Section kicker="core concepts" title="Postgres in a container, data in a named volume">
        <Tiered
          layman={
            <>
              <p>You will run Postgres inside a Docker <GlossaryTerm k="container">container</GlossaryTerm> — think of the container as the library <em>building</em> and the data as the <em>archive</em> stored in a vault next door. You can demolish the building and put up an identical one tomorrow; as long as the new building connects to the same vault, every book is still there.</p>
              <p>The vault is a <em>named volume</em>. It exists independently of any container. This is the Phase 0 habit again: the disposable thing (the container) and the precious thing (the data) must never live in the same place — and the data must never live inside a OneDrive-synced folder.</p>
            </>
          }
          student={
            <>
              <p>Here is the exact command the lab uses — read it flag by flag:</p>
              <CodeBlock label="PowerShell" code={`docker run -d --name pg-lab -e POSTGRES_PASSWORD=delab -p 5432:5432 -v pglab:/var/lib/postgresql/data postgres:17`} />
              <ul>
                <li><code>-d --name pg-lab</code> — run detached, with a name every later command can use.</li>
                <li><code>-e POSTGRES_PASSWORD=delab</code> — first-boot configuration. It applies only when the data directory is <em>empty</em>; on a reused volume, initialization is skipped and this variable is ignored.</li>
                <li><code>-p 5432:5432</code> — publish the server's port to Windows, so host tools can reach <code>localhost:5432</code>.</li>
                <li><code>-v pglab:/var/lib/postgresql/data</code> — mount the named volume <code>pglab</code> at the path where Postgres keeps its data directory. Docker Desktop stores named volumes inside its WSL2 VM — outside OneDrive by construction.</li>
                <li><code>postgres:17</code> — a pinned <GlossaryTerm k="image">image</GlossaryTerm> version, so the lab is reproducible.</li>
              </ul>
              <p><code>docker rm -f pg-lab</code> destroys the container; the volume survives. Recreate the container with the same mount and your databases are back. The lab makes you prove this with your own eyes.</p>
            </>
          }
          phd={
            <>
              <p>What lives in that volume is the <em>cluster data directory</em>: <code>base/</code> (heap and index files per database), <code>pg_wal/</code> (the write-ahead log), <code>pg_xact/</code> (transaction commit status), plus configuration. After an unclean shutdown, startup replays WAL from the last checkpoint to reconstruct consistent pages — you will deliberately trigger and watch this in lesson 2.1.3. Hold this now: durability lives in the data directory, so the volume <em>is</em> the database; the container is just an engine wrapped around it.</p>
              <p>Why not a bind mount to a Windows folder? Crossing the Windows/WSL2 filesystem boundary is slow for the thousands of small fsyncs a database performs, and OneDrive syncing a live data directory is actively dangerous (files locked and rewritten mid-sync). Named volumes sidestep both — the Phase 0 rule, now with a database-shaped reason.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="psql survival kit, databases, and roles">
        <Tiered
          layman={
            <>
              <p><code>psql</code> is how you talk to the librarian directly — a text conversation. A handful of short commands cover daily life: list the rooms, walk into one, list the shelves, inspect one shelf, leave.</p>
              <p>Your library card is a <em>role</em>. The head librarian's card (the <code>postgres</code> superuser) opens every door — exactly why your application should not carry it. Apps get a limited card that opens only their own room. A <em>connection string</em> is the full address on one line: which building, which door, which card, which room.</p>
            </>
          }
          student={
            <>
              <p>Inside psql, backslash commands are psql's own shortcuts (they never reach the SQL engine); everything else is SQL ending in a semicolon. The survival kit:</p>
              <CodeBlock
                label="psql"
                code={`\\l             -- list databases
\\c appdb       -- connect to database appdb
\\dt            -- list tables in the current database
\\d customers   -- describe one table: columns, types, constraints
\\du            -- list roles
\\conninfo      -- who am I, connected to what
\\timing        -- toggle per-query wall-clock timing
\\q             -- quit`}
              />
              <p>Creating a home for an application — a role that can log in, and a database it owns:</p>
              <CodeBlock label="psql" code={`CREATE ROLE app_user WITH LOGIN PASSWORD 'app_pw';\nCREATE DATABASE appdb OWNER app_user;`} />
              <p>Connection strings pack the whole route into one URL your Python code will use in module 2.2: <code>postgresql://app_user:app_pw@localhost:5432/appdb</code> — user, password, host, port, database. Never commit one containing a real password; it belongs in an environment variable.</p>
            </>
          }
          phd={
            <>
              <p>Authentication is a pipeline: the server matches the incoming (host, database, user) triple against <code>pg_hba.conf</code> rules, each naming a method — the modern default is <code>scram-sha-256</code>, a salted challenge-response where the password never crosses the wire in plaintext. Roles are cluster-wide; databases contain schemas, which contain tables; an unqualified table name resolves through <code>search_path</code>, defaulting to <code>public</code>.</p>
              <p>A footnote that bites people following old tutorials: since Postgres 15, ordinary roles can no longer create tables in another database's <code>public</code> schema by default. Making <code>app_user</code> the <em>owner</em> of <code>appdb</code> (as the lab does) sidesteps the ceremony — owners build freely inside their own database. The deeper principle is least privilege: the app role can do exactly what the app needs, so a leaked credential has a small blast radius.</p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Embedded, server, or both">
        <Tradeoffs
          options={[
            {
              name: 'Embedded (DuckDB, SQLite)',
              strengths: [
                'Zero operations: no server, no ports, no passwords',
                'In-process speed — a query is a function call, not a network round-trip',
                'Perfect fit for CLIs, local analytics, single-app storage',
              ],
              weaknesses: [
                'One process owns the data — no concurrent remote clients',
                'No roles or permissions; the filesystem is the only gatekeeper',
                'Backup and durability discipline is entirely on you',
              ],
              chooseWhen: 'one program on one machine needs a database — local analytics (DuckDB) or app-local state (SQLite).',
            },
            {
              name: 'Server (Postgres, MySQL)',
              strengths: [
                'Many concurrent clients with safe, transactional writes',
                'Roles, permissions, and network access built in',
                'Durability machinery (WAL) plus mature backup and replication tooling',
              ],
              weaknesses: [
                'Something to operate: install, upgrade, monitor, secure',
                'Every query pays a network round-trip',
                'Connections are expensive — pooling becomes your problem',
              ],
              chooseWhen: 'multiple applications or users need one consistent, protected source of truth — the OLTP backbone.',
            },
            {
              name: 'Both (Postgres OLTP + DuckDB OLAP)',
              strengths: [
                'Each engine on home turf: row-oriented transactions, columnar scans',
                'Analytics load stays off the production database',
              ],
              weaknesses: [
                'Two systems to run, and data must move between them — that pipeline is real work',
                'Analytical copies lag the source; freshness becomes a design decision',
              ],
              chooseWhen: 'a production app and serious analytics coexist — the P2/P3 project architecture you are building toward.',
            },
          ]}
          note={
            <>
              Interview framing: never say "X is better". Name the workload — concurrency, permissions, and durability point to a server; single-process analytics points to embedded; most real companies run both with a <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> in between.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: run Postgres, then prove the data outlives the container">
        <Lab
          lessonId={ID}
          intro={
            <p>Docker Desktop must be running. Commands labeled <strong>PowerShell</strong> run in Windows Terminal; commands labeled <strong>psql</strong> are typed at the psql prompt inside the container. Do not skip the demolition step — watching data survive it is the whole lesson.</p>
          }
          steps={[
            {
              title: 'Start the server',
              body: <p>Pinned image, named volume, published port. The first run downloads the image.</p>,
              commands: [{ ps: 'docker run -d --name pg-lab -e POSTGRES_PASSWORD=delab -p 5432:5432 -v pglab:/var/lib/postgresql/data postgres:17\ndocker ps --filter name=pg-lab' }],
              checkpoint: <><code>docker ps</code> shows <code>pg-lab</code> with STATUS <code>Up</code> and ports <code>0.0.0.0:5432-&gt;5432/tcp</code>.</>,
            },
            {
              title: 'Connect with psql',
              commands: [{ ps: 'docker exec -it pg-lab psql -U postgres' }],
              checkpoint: <>The prompt changes to <code>postgres=#</code> — a live SQL session with the server. The <code>#</code> means superuser.</>,
            },
            {
              title: 'Tour with the survival kit',
              commands: [{ ps: 'SELECT version();\n\\l\n\\timing', label: 'psql' }],
              checkpoint: <><code>version()</code> reports PostgreSQL 17.x; <code>\l</code> lists <code>postgres</code>, <code>template0</code>, <code>template1</code>; <code>\timing</code> prints "Timing is on." so every query now reports wall-clock time.</>,
            },
            {
              title: 'Create the application role and database',
              commands: [{ ps: "CREATE ROLE app_user WITH LOGIN PASSWORD 'app_pw';\nCREATE DATABASE appdb OWNER app_user;\n\\l", label: 'psql' }],
              checkpoint: <><code>\l</code> now shows <code>appdb</code> with Owner <code>app_user</code>.</>,
            },
            {
              title: 'Reconnect as app_user and write proof data',
              body: <p>Quit with <code>\q</code>, then connect as the limited role — the prompt ends in <code>=&gt;</code> instead of <code>=#</code>: no superuser powers.</p>,
              commands: [
                { ps: 'docker exec -it pg-lab psql -U app_user -d appdb' },
                { ps: "CREATE TABLE proof (msg text);\nINSERT INTO proof VALUES ('written before the demolition');\nSELECT * FROM proof;\n\\conninfo", label: 'psql' },
              ],
              checkpoint: <><code>SELECT</code> returns 1 row, and <code>\conninfo</code> confirms user <code>app_user</code>, database <code>appdb</code>.</>,
            },
            {
              title: 'Demolish the container',
              body: <p>Quit psql, then remove the container entirely — not just stop it.</p>,
              commands: [{ ps: 'docker rm -f pg-lab\ndocker ps -a --filter name=pg-lab\ndocker volume ls' }],
              checkpoint: <><code>docker ps -a</code> shows no <code>pg-lab</code> at all — the container is gone. But <code>docker volume ls</code> still lists <code>pglab</code>. The vault stands.</>,
            },
            {
              title: 'Rebuild and prove survival',
              body: <p>Same command as step 1. Because the volume already holds a data directory, Postgres skips initialization — which also means <code>POSTGRES_PASSWORD</code> is ignored this time.</p>,
              commands: [
                { ps: 'docker run -d --name pg-lab -e POSTGRES_PASSWORD=delab -p 5432:5432 -v pglab:/var/lib/postgresql/data postgres:17\ndocker exec -it pg-lab psql -U app_user -d appdb' },
                { ps: 'SELECT * FROM proof;', label: 'psql' },
              ],
              checkpoint: <><code>written before the demolition</code> comes back. New container, same data: the named volume is the database; the container is disposable.</>,
            },
            {
              title: 'Connect by connection string',
              body: <p>The same route your Python code takes in module 2.2 — the whole route in one URL. Quit psql first.</p>,
              commands: [{ ps: 'docker exec -it pg-lab psql "postgresql://app_user:app_pw@localhost:5432/appdb"' }],
              checkpoint: <>You land in psql connected as <code>app_user</code> to <code>appdb</code> (verify with <code>\conninfo</code>). Leave <code>pg-lab</code> running — every lesson in this module uses it.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'The fundamental difference between DuckDB and Postgres is:',
              options: [
                'Postgres is faster at every kind of query',
                'DuckDB runs inside your process; Postgres is a separate server process clients connect to over a network',
                'DuckDB cannot run window functions',
                'Postgres does not store data on disk',
              ],
              answer: 1,
              explain: 'Embedded vs client-server is the axis. The server buys concurrency, permissions, and central durability at the cost of operations and round-trips — and DuckDB often beats Postgres on analytical scans.',
            },
            {
              q: 'You run docker rm -f pg-lab. What happened to your databases?',
              options: [
                'Gone forever — removing a container deletes everything',
                'Safe in the named volume; a new container mounting pglab sees them again',
                'Automatically backed up to Docker Hub',
                'Moved into the postgres:17 image',
              ],
              answer: 1,
              explain: 'The data directory lives on the pglab volume, which containers merely mount. Destroy and recreate containers freely; the volume (and only the volume) is precious.',
            },
            {
              q: 'You recreate the container with -e POSTGRES_PASSWORD=newpass on the existing pglab volume. The password:',
              options: [
                'Changes to newpass immediately',
                'Changes after a restart',
                'Does not change — init only runs on an empty data directory, so the variable is ignored',
                'Resets to the image default',
              ],
              answer: 2,
              explain: 'POSTGRES_PASSWORD is consumed by first-boot initialization. A non-empty volume skips init entirely; change passwords with ALTER ROLE in SQL instead.',
            },
            {
              q: 'Why do production deployments put a connection pooler (like PgBouncer) in front of Postgres?',
              options: [
                'To encrypt traffic between app and database',
                'To cache query results for faster reads',
                'Because Postgres allows only one connection at a time',
                'Because Postgres forks an OS process per connection, so connections are expensive and best shared',
              ],
              answer: 3,
              explain: 'The postmaster forks a backend process per connection — robust but costly. A pooler multiplexes thousands of client connections onto a small set of long-lived backends.',
            },
            {
              q: 'Why create app_user instead of letting applications connect as the postgres superuser?',
              options: [
                'Superuser connections are slower',
                'postgres cannot own tables',
                'Least privilege: a leaked app credential should open one room, not every door in the building',
                'Docker containers forbid superuser logins',
              ],
              answer: 2,
              explain: 'A superuser credential in app config is a full-cluster compromise waiting to happen. A role owning only its own database bounds the blast radius.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'When would you choose SQLite or DuckDB over Postgres?',
            a: <p>When one process on one machine needs a database: application-local state (SQLite) or in-process analytics (DuckDB). The moment you need concurrent remote clients, roles and permissions, or a shared source of truth, you need a server. Strong answers add the hybrid: Postgres for OLTP plus DuckDB or a warehouse for OLAP, connected by a pipeline.</p>,
          },
          {
            q: 'You removed a database container and the data was gone. What went wrong?',
            a: <p>The data directory lived in the container's writable layer instead of a volume. A container's filesystem dies with it; state must live on a named volume (or managed disk) mounted at the data path — for Postgres, /var/lib/postgresql/data. Containers should be cattle; the volume is the pet.</p>,
          },
          {
            q: 'Why is the number of Postgres connections something to worry about?',
            a: <p>Each connection is a forked backend process with real memory and scheduling cost, so thousands of direct connections degrade the server. Apps reuse pooled connections, and infrastructure adds PgBouncer to multiplex clients onto few backends. Naming the process-per-connection model is what makes the answer credible.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Embedded databases live inside your process (DuckDB, SQLite); server databases are separate processes many clients share (Postgres). Concurrency, permissions, and central durability are what the server buys.</>,
          <>The container is disposable; the named volume is the database. <code>docker rm -f</code> plus recreate with the same <code>-v pglab:...</code> mount proves it.</>,
          <><code>POSTGRES_PASSWORD</code> and other init settings apply only to an empty data directory — a reused volume ignores them.</>,
          <>psql survival kit: <code>\l \c \dt \d \du \conninfo \timing \q</code> — backslash commands are psql's; semicolon statements are SQL.</>,
          <>Applications connect as a least-privilege role via a connection string — never as the superuser, and never with the password committed to git.</>,
          <>Postgres forks a process per connection — the reason connection pooling exists.</>,
        ]}
      />
    </>
  )
}
