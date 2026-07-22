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
import { RevealSolution } from '../../../components/RevealSolution'
import { PipelineDAG } from '../../../viz/PipelineDAG'

const ID = '3.1.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="One file for the whole stack, instead of a wall of docker run flags">
        <p>
          In 2.1.1 you started Postgres with a long <code>docker run -d --name ... -e ... -p ... -v ...</code> line, then
          typed it again by hand every time. A real pipeline is not one container — it is a database, an app, maybe a
          cache and a UI, all needing to find each other, start in the right order, and keep their data.{' '}
          <GlossaryTerm k="docker-compose">Docker Compose</GlossaryTerm> lets you declare that whole stack in one YAML
          file and bring it up or tear it down with a single command.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Running containers one <code>docker run</code> at a time is like staging a play by walking each actor
                on-stage individually and shouting their cues from the wings — every night, from memory. It works until
                you miss a cue or forget an actor.
              </p>
              <p>
                A compose file is the <em>script and stage directions</em> written down once: who is in the show, what
                each one needs, who waits for whom, where the props are stored. &quot;Run the show&quot; is now one
                command, and it goes the same way every time. Tear it down and put it back up tomorrow and nothing is
                improvised.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <code>docker-compose.yml</code> file describes a multi-container application declaratively: a set of{' '}
                <GlossaryTerm k="compose-service">services</GlossaryTerm> (each a container), the network they share, the
                volumes that hold their data, and the dependencies between them. <code>docker compose up</code> reads it
                and creates everything; <code>docker compose down</code> removes it. The file is version-controlled, so
                the stack is reproducible and reviewable — no more remembering flags.
              </p>
              <p>
                Compose is the standard tool for <em>local development and single-host</em> deployments. It is not a
                production cluster manager (that is Kubernetes, in the trade-offs), but for &quot;spin up Postgres plus my
                pipeline on my laptop or one server,&quot; it is exactly right and you will use it constantly.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Compose is a thin declarative layer over the same primitives you already know: it creates a user-defined
                bridge network, named volumes, and containers, then wires them together — anything Compose does you could
                do with a sequence of <code>docker network create</code>, <code>docker volume create</code>, and{' '}
                <code>docker run</code> calls. Its value is that the desired state is a single reconcilable artifact, not
                an imperative script, which makes it diffable and idempotent (<code>up</code> converges to the file).
              </p>
              <p>
                The Compose Specification is now an open standard, and the same YAML shape informs how people think about
                higher orchestrators. The gap is scope: Compose targets one Docker host. It has no scheduler, no
                multi-node networking, no self-healing rescheduling — the moment you need containers spread across
                machines with automatic failover, you have outgrown it and reach for a cluster orchestrator.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="One network, and services find each other by name">
        <p>
          Compose puts every service in a stack on one shared network and gives each a DNS name equal to its service
          name. Your app reaches the database at the hostname <code>db</code> — not an IP address, not{' '}
          <code>localhost</code>, just the service&apos;s name.
        </p>
        <CodeBlock
          label="docker-compose.yml (shape)"
          code={`services:
  db:                       # <-- this name IS the hostname other services use
    image: postgres:17
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:delab@db:5432/appdb
      #                                            ^^ the service name "db"`}
        />
        <Tiered
          layman={
            <>
              <p>
                Picture a stage crew during a show. The lighting person does not need the sound person&apos;s phone
                number — they just call out &quot;Sound!&quot; and the right person answers. Everyone knows everyone else
                by their <em>job title</em>, not by some number that changes every night.
              </p>
              <p>
                Compose works the same way. Each service has a name — <code>db</code>, <code>app</code>, <code>cache</code>{' '}
                — and any service can reach another just by using that name as the address. You never chase down an IP.
              </p>
            </>
          }
          student={
            <>
              <p>
                When you <code>docker compose up</code>, Compose creates a private bridge network for the project and
                attaches every service to it. Docker&apos;s embedded DNS then resolves each{' '}
                <GlossaryTerm k="service-discovery">service name</GlossaryTerm> to that container&apos;s current IP on the
                network. So <code>app</code> connects to <code>db:5432</code> and it just works, even though the container
                IP is assigned dynamically and changes on restart.
              </p>
              <p>
                Two traps for beginners. First, <em>inside</em> the app container, the database is <strong>not</strong> at{' '}
                <code>localhost</code> — <code>localhost</code> means the app container itself; the database is at{' '}
                <code>db</code>. Second, the published host port (<code>-p 5432:5432</code>) is only for tools on your
                Windows machine reaching in; containers talking to each other do not need it and use the service name plus
                the container-internal port.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Each service attaches to a user-defined bridge network, which (unlike the legacy default bridge) provides
                automatic DNS-based service discovery via Docker&apos;s embedded resolver at <code>127.0.0.11</code>
                inside each container. Names resolve to the container&apos;s network-scoped IP; a service with multiple
                replicas resolves to multiple A records. This is why hard-coding IPs is always wrong — the address is an
                implementation detail the DNS layer abstracts.
              </p>
              <p>
                Network isolation is a real boundary: services on different Compose networks cannot reach each other
                unless explicitly joined, which is how you segment, say, a database network from a public-facing one. The
                published-port distinction (<code>ports</code> vs <code>expose</code>) is precisely the host-namespace vs
                overlay-network boundary — <code>ports</code> punches a hole from the host into the network;{' '}
                <code>expose</code> only documents an internal port.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Volumes: named for data, bind for code">
        <Tiered
          layman={
            <>
              <p>
                You learned in 2.1.1 that the container is disposable and precious data must live somewhere outside it.
                Compose writes that rule into the file. There are two kinds of &quot;outside.&quot;
              </p>
              <p>
                A <strong>named volume</strong> is a vault Docker manages for you — you give it a name, Docker decides
                where to keep it, and it survives containers coming and going. A <strong>bind mount</strong> is a window
                cut straight through to a specific folder on your own laptop, so the container sees your files live and
                edits flow both ways. Vault for the database&apos;s data; window for the code you are editing.
              </p>
            </>
          }
          student={
            <>
              <ul>
                <li>
                  <strong><GlossaryTerm k="named-volume">Named volume</GlossaryTerm></strong> (
                  <code>pgdata:/var/lib/postgresql/data</code>): Docker manages the storage location (inside its VM,
                  outside OneDrive by construction). Best for database data and anything stateful — durable, fast, and
                  portable. Declared under a top-level <code>volumes:</code> key.
                </li>
                <li>
                  <strong><GlossaryTerm k="bind-mount">Bind mount</GlossaryTerm></strong> (
                  <code>./src:/app/src</code>): maps a host folder into the container. Best for injecting source code or
                  config in development so edits appear instantly without a rebuild. Tied to a specific host path, so less
                  portable, and on Windows the WSL2 boundary makes it slower for lots of small writes.
                </li>
              </ul>
              <CodeBlock
                label="docker-compose.yml"
                code={`services:
  db:
    image: postgres:17
    volumes:
      - pgdata:/var/lib/postgresql/data   # named volume — the DATA
  app:
    build: .
    volumes:
      - ./app:/app                        # bind mount — live CODE in dev

volumes:
  pgdata:                                 # declare the named volume`}
              />
              <p>
                Rule of thumb: <strong>database data → named volume; source you are actively editing → bind mount.</strong>{' '}
                Never put a database&apos;s data directory on a Windows bind mount — the same reason as 2.1.1 (slow
                fsyncs, OneDrive danger).
              </p>
            </>
          }
          phd={
            <>
              <p>
                A named volume is a Docker-managed directory on the host (under the daemon&apos;s storage root) mounted
                into the container, bypassing the union filesystem entirely — so writes go straight to the host
                filesystem at native speed with no copy-on-write penalty. A bind mount maps an arbitrary host path in;
                its semantics depend on the host filesystem, which is why the WSL2/NTFS boundary hurts for fsync-heavy
                workloads.
              </p>
              <p>
                A subtle Compose behavior: <code>docker compose down</code> removes containers and the network but{' '}
                <em>preserves named volumes</em> by default; you must pass <code>-v</code> (<code>--volumes</code>) to
                delete them. That default is deliberate — it is the guardrail that stops a routine teardown from wiping
                your database. You will exploit it in the lab to prove persistence across a full <code>down</code>/
                <code>up</code> cycle.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="depends_on is not enough: wait for READY, not just STARTED">
        <p>
          The single most common Compose bug: the app starts before the database can accept connections, throws{' '}
          <code>connection refused</code>, and dies. <code>depends_on</code> alone does not fix it, because it waits for
          the database container to <em>start</em>, not to be <em>ready</em>. The fix is a{' '}
          <GlossaryTerm k="healthcheck">healthcheck</GlossaryTerm> plus <code>depends_on: condition: service_healthy</code>.
          The graph below is your stack; click <code>db</code> to see everything that waits on it.
        </p>
        <PipelineDAG
          height={380}
          nodes={[
            { id: 'db', label: 'db', col: 0, sub: 'postgres · healthcheck', color: '#fbbf24' },
            { id: 'app', label: 'app', col: 1, sub: 'waits: service_healthy', color: '#34d399' },
            { id: 'adminer', label: 'adminer', col: 1, sub: 'db web UI', color: '#a78bfa' },
          ]}
          edges={[
            ['db', 'app'],
            ['db', 'adminer'],
          ]}
          caption={
            <>
              <b>Click a service.</b> Arrows are <code>depends_on</code> edges. Selecting <code>db</code> lights its{' '}
              <span style={{ color: '#22d3ee' }}>downstream</span> — <code>app</code> and <code>adminer</code>, the
              services that must wait for it. With a healthcheck, they wait for <em>ready</em>, not merely <em>started</em>.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                The show cannot start until the lead actor is not just <em>in the building</em> but actually{' '}
                <em>on stage, in costume, ready for the first line</em>. &quot;They arrived at the theater&quot; is not
                the same as &quot;they are ready to perform.&quot; Plain <code>depends_on</code> only checks that they
                walked in the door.
              </p>
              <p>
                A healthcheck is the stage manager peeking through the curtain and asking &quot;ready?&quot; every few
                seconds. The show waits until the answer is yes. Now the other actors never start a scene talking to
                someone who is still lacing their boots.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>depends_on: [db]</code> only guarantees start <em>order</em>: Compose starts <code>db</code>&apos;s
                container before <code>app</code>&apos;s. But Postgres takes a second or two <em>after</em> its process
                starts before it accepts connections, so <code>app</code> can still race ahead and fail.
              </p>
              <p>
                Define a healthcheck on <code>db</code> (a command Docker runs on a schedule; exit 0 = healthy), then make{' '}
                <code>app</code> wait for that status:
              </p>
              <CodeBlock
                label="docker-compose.yml"
                code={`services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: delab
      POSTGRES_DB: appdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]
      interval: 3s
      timeout: 3s
      retries: 10
  app:
    build: .
    depends_on:
      db:
        condition: service_healthy   # wait for HEALTHY, not just started`}
              />
              <p>
                Now Compose holds <code>app</code> back until <code>pg_isready</code> succeeds. No retry loop in your app,
                no random startup failures. This exact pattern — <code>pg_isready</code> healthcheck plus{' '}
                <code>condition: service_healthy</code> — is one you will copy into nearly every stack you build.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A container healthcheck runs its <code>test</code> command every <code>interval</code>, marking the
                container <code>starting</code> → <code>healthy</code> after enough consecutive successes or{' '}
                <code>unhealthy</code> after <code>retries</code> failures. <code>condition: service_healthy</code> gates
                dependents on that state transition. This is a <em>readiness</em> signal — &quot;can serve
                requests&quot; — distinct from <em>liveness</em> (&quot;is the process alive at all&quot;), a distinction
                borrowed from and formalized in orchestrators.
              </p>
              <p>
                The honest caveat: even <code>service_healthy</code> is a startup-ordering convenience, not a correctness
                guarantee. In steady state a dependency can crash or become unreachable at any moment, so robust services
                still need connection retries and backoff (the pattern from Phase 1&apos;s retry lesson). Healthchecks
                reduce startup races; they do not remove the need for the application to tolerate a database that
                disappears mid-run. This is why production leans on an orchestrator that continuously watches readiness
                and reschedules, rather than a one-shot start gate.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="depends_on without a condition is a start-order promise only">
          <code>depends_on: [db]</code> orders container <em>creation</em>. It does not wait for the program inside to be
          ready. If you have ever seen &quot;connection refused&quot; on the first <code>up</code> that goes away on a
          retry, this is why — add a healthcheck and <code>condition: service_healthy</code>.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Config and the up/down/logs lifecycle">
        <Tiered
          layman={
            <>
              <p>
                Two more everyday pieces. First, settings: instead of hard-coding passwords and paths, you hand each
                service a small list of labeled settings — and you can keep the secret ones in a separate file that never
                goes into version control. Second, the daily controls: one command to raise the whole set up, one to
                watch what they are saying, one to take them down.
              </p>
            </>
          }
          student={
            <>
              <ul>
                <li>
                  <strong>environment / env_file:</strong> pass settings as{' '}
                  <GlossaryTerm k="environment-variable">environment variables</GlossaryTerm> inline under{' '}
                  <code>environment:</code>, or point <code>env_file: .env</code> at a file of{' '}
                  <code>KEY=value</code> lines you keep out of git. Secrets belong in <code>env_file</code>, not committed
                  YAML.
                </li>
                <li>
                  <strong>ports vs expose:</strong> <code>ports: [&quot;5432:5432&quot;]</code> publishes the port to your
                  host so Windows tools can reach it; <code>expose: [&quot;5432&quot;]</code> only documents an
                  internal-only port. Service-to-service traffic never needs <code>ports</code> — only humans reaching in
                  from the host do.
                </li>
                <li>
                  <strong>lifecycle:</strong> <code>docker compose up -d</code> (create and start, detached),{' '}
                  <code>docker compose ps</code> (what is running and its health), <code>docker compose logs -f app</code>{' '}
                  (follow one service&apos;s output), <code>docker compose down</code> (stop and remove; add{' '}
                  <code>-v</code> to also drop named volumes).
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                <code>up</code> is a reconcile: Compose diffs the file against running state and creates/recreates only
                what changed (a changed <code>image</code> or <code>build</code> triggers recreation of just that
                service). Variable precedence has real gotchas — shell environment overrides <code>.env</code>, and{' '}
                <code>environment:</code> entries override <code>env_file:</code> — so a stale exported shell var silently
                shadowing your <code>.env</code> is a classic time-sink.
              </p>
              <p>
                <code>ports</code> maps into the host&apos;s network namespace (a real socket bind on the host, subject to
                host port conflicts); <code>expose</code> is metadata only. Minimizing published ports is a security
                posture — a database that only its app needs should have no <code>ports</code> entry at all, so nothing on
                the host network can reach it directly.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Compose, raw docker run scripts, or a full orchestrator">
        <p>
          Compose is not the only way to run multiple containers, and it is deliberately not built for a production
          cluster. The axis is how many hosts you run on and how much automatic recovery you need.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Raw docker run scripts',
              strengths: [
                'No new tool — just the docker CLI you already know',
                'Fine for a single throwaway container',
              ],
              weaknesses: [
                'Multi-container wiring (networks, order, volumes) becomes a fragile hand-written script',
                'Imperative: no single source of truth, easy to drift, hard to review',
              ],
              chooseWhen: 'you are running exactly one container ad hoc and nothing depends on it.',
            },
            {
              name: 'Docker Compose',
              strengths: [
                'Whole stack declared in one version-controlled file; up/down in one command',
                'Automatic service DNS, networks, named volumes, healthcheck gating',
                'Ideal for local dev and simple single-host deployments',
              ],
              weaknesses: [
                'Single host only — no scheduling across machines',
                'No self-healing: a crashed service is not automatically rescheduled elsewhere',
              ],
              chooseWhen: 'developing locally or running a small stack on one machine — the dev/single-host sweet spot.',
            },
            {
              name: 'Kubernetes (or similar)',
              strengths: [
                'Multi-host scheduling, self-healing, rolling deploys, autoscaling',
                'Continuous readiness/liveness probes with automatic rescheduling',
              ],
              weaknesses: [
                'Large operational surface — a system to learn and run in its own right',
                'Overkill for a laptop or a single server; slow to iterate on',
              ],
              chooseWhen: 'production workloads must span many machines with automatic failover and scaling.',
            },
          ]}
          note={
            <>
              A very common path: develop the stack in Compose, then translate it to{' '}
              <GlossaryTerm k="kubernetes">Kubernetes</GlossaryTerm> manifests for production. The concepts carry over —
              services, volumes, healthchecks become probes — which is exactly why learning Compose well pays off later.
              Do not reach for a cluster orchestrator to run three containers on your laptop; reach for it when
              <em>multiple machines</em> and <em>automatic recovery</em> are hard requirements.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: a Postgres + Python stack that waits for health and keeps its data">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Docker Desktop must be running. You will build a two-service stack — Postgres plus a tiny Python app that
              connects to it by the DNS name <code>db</code> — gate the app on a Postgres healthcheck, prove the app
              waited, and prove the data survives a full <code>down</code>/<code>up</code>. All commands are PowerShell in{' '}
              <code>C:\de-lab\compose-lab</code>.
            </p>
          }
          steps={[
            {
              title: 'Create the project files',
              body: (
                <>
                  <p>Make <code>C:\de-lab\compose-lab</code> and put four files in it. The app, <code>app.py</code>:</p>
                  <CodeBlock
                    label="app.py"
                    code={`import os
import psycopg

dsn = os.environ["DATABASE_URL"]
with psycopg.connect(dsn) as conn:
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS runs (id serial PRIMARY KEY, ran_at timestamptz DEFAULT now())")
    cur.execute("INSERT INTO runs DEFAULT VALUES")
    conn.commit()
    cur.execute("SELECT count(*) FROM runs")
    n = cur.fetchone()[0]
    print("connected to db; runs table now has", n, "rows")`}
                  />
                  <p><code>requirements.txt</code>:</p>
                  <CodeBlock label="requirements.txt" code={`psycopg[binary]==3.2.1`} />
                  <p><code>Dockerfile</code> for the app (the 3.1.2 pattern):</p>
                  <CodeBlock
                    label="Dockerfile"
                    code={`FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]`}
                  />
                  <p>and <code>docker-compose.yml</code> tying them together:</p>
                  <CodeBlock
                    label="docker-compose.yml"
                    code={`services:
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: delab
      POSTGRES_DB: appdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d appdb"]
      interval: 3s
      timeout: 3s
      retries: 10
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:delab@db:5432/appdb
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:`}
                  />
                </>
              ),
              commands: [
                { ps: 'mkdir C:\\de-lab\\compose-lab\ncd C:\\de-lab\\compose-lab', bash: 'mkdir -p ~/de-lab/compose-lab && cd ~/de-lab/compose-lab' },
              ],
              checkpoint: (
                <>
                  <code>dir</code> shows all four files: <code>app.py</code>, <code>requirements.txt</code>,{' '}
                  <code>Dockerfile</code>, <code>docker-compose.yml</code>.
                </>
              ),
            },
            {
              title: 'Bring the stack up and watch the ordering',
              body: <p>Build the app image and start both services in the foreground so you see the logs interleave.</p>,
              commands: [{ ps: 'docker compose up --build' }],
              checkpoint: (
                <>
                  You see <code>db</code> log <code>database system is ready to accept connections</code> and become
                  healthy first; only then does <code>app</code> run and print{' '}
                  <code>connected to db; runs table now has 1 rows</code>, then exit with code 0. The app reached Postgres
                  by the hostname <code>db</code> — no host port involved. Press <code>Ctrl-C</code> to return to the
                  prompt.
                </>
              ),
            },
            {
              title: 'Prove the healthcheck actually mattered',
              body: (
                <>
                  <p>
                    Was the wait real, or luck? Temporarily weaken the dependency, observe, then restore it.
                  </p>
                  <RevealSolution label="The experiment and what it shows">
                    <p>
                      In <code>docker-compose.yml</code>, replace the <code>depends_on</code> block for <code>app</code>{' '}
                      with the bare form <code>depends_on: [db]</code> (start-order only, no health condition), then run{' '}
                      <code>docker compose up --build</code> a few times. On some runs <code>app</code> now races ahead
                      and prints a <code>connection refused</code> / <code>could not connect</code> error before Postgres
                      is ready, exiting non-zero. Restore <code>condition: service_healthy</code> and the failure
                      disappears every time. That is the difference between &quot;started&quot; and &quot;ready.&quot;
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  With the bare <code>depends_on</code>, at least one run prints a connection error and a non-zero exit.
                  With <code>condition: service_healthy</code> restored, every run prints the success line. Put the health
                  condition back before continuing.
                </>
              ),
            },
            {
              title: 'Tear down, bring back up — prove the data persisted',
              body: (
                <p>
                  <code>down</code> removes the containers and network but keeps the named volume. Bring it back up and the
                  row count should climb, because the table survived.
                </p>
              ),
              commands: [
                { ps: 'docker compose down\ndocker volume ls', label: 'down (volume survives)' },
                { ps: 'docker compose up --build', label: 'up again' },
              ],
              checkpoint: (
                <>
                  After <code>down</code>, <code>docker volume ls</code> still lists a volume ending in <code>_pgdata</code>{' '}
                  — the containers are gone but the data vault stands. On the second <code>up</code>, the app now prints{' '}
                  <code>runs table now has 2 rows</code>: the first run&apos;s row is still there. The named volume is the
                  database; the containers are disposable. Press <code>Ctrl-C</code>.
                </>
              ),
            },
            {
              title: 'Inspect the running stack',
              body: <p>See services, their health, and the private network Compose created.</p>,
              commands: [
                { ps: 'docker compose up -d\ndocker compose ps', label: 'detached + status' },
                { ps: 'docker network ls --filter name=compose-lab', label: 'the auto-created network' },
              ],
              checkpoint: (
                <>
                  <code>docker compose ps</code> lists <code>db</code> (State <code>running</code>, and a{' '}
                  <code>healthy</code> marker) and <code>app</code>; <code>docker network ls</code> shows a network named
                  like <code>compose-lab_default</code> — the private network your services share and resolve each other
                  on.
                </>
              ),
            },
            {
              title: 'Full clean-up (including the volume)',
              body: <p>This time drop the volume too, since the lab is done.</p>,
              commands: [{ ps: 'docker compose down -v\ndocker volume ls' }],
              checkpoint: (
                <>
                  <code>docker compose down -v</code> removes containers, the network, <em>and</em> the{' '}
                  <code>_pgdata</code> volume. <code>docker volume ls</code> no longer lists it. Note this needed the
                  explicit <code>-v</code> — a plain <code>down</code> would have preserved your data.
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
              q: 'Inside your app container, what hostname reaches the Postgres service named "db" in the same compose file?',
              options: [
                'localhost',
                '127.0.0.1',
                'db — Compose gives each service a DNS name equal to its service name',
                'The container’s IP address, which you must look up',
              ],
              answer: 2,
              explain: 'Compose puts services on a shared network with embedded DNS; the service name is the hostname. localhost inside the app means the app container itself, not the database.',
            },
            {
              q: 'depends_on: [db] guarantees that:',
              options: [
                'app starts only after db is ready to accept connections',
                'app starts only after db’s container has started — but not that Postgres is ready yet',
                'db and app start at exactly the same time',
                'app restarts whenever db restarts',
              ],
              answer: 1,
              explain: 'Bare depends_on controls start order of containers, not readiness of the program inside. To wait for ready, add a healthcheck and depends_on: condition: service_healthy.',
            },
            {
              q: 'You run `docker compose down` (no flags). Your Postgres data in a named volume is:',
              options: [
                'Deleted along with the containers',
                'Preserved — down removes containers and the network but keeps named volumes unless you pass -v',
                'Exported to a backup automatically',
                'Moved into the app image',
              ],
              answer: 1,
              explain: 'Named volumes survive a plain down by design — a guardrail against wiping data on teardown. Use down -v to also remove them.',
            },
            {
              q: 'When does a service need a `ports:` entry?',
              options: [
                'Whenever any other service needs to reach it',
                'Only when something on the host (your Windows tools) must reach it — service-to-service traffic uses the service name and does not need it',
                'Always, or Compose will not start it',
                'Only for databases',
              ],
              answer: 1,
              explain: 'ports publishes to the host network namespace for humans/tools reaching in. Containers talk to each other over the shared network by service name and internal port, no published port required. Fewer published ports is also safer.',
            },
            {
              q: 'A healthcheck that gates dependents via condition: service_healthy is best described as a:',
              options: [
                'Liveness signal — is the process alive at all',
                'Readiness signal — can the service actually serve requests yet',
                'Backup mechanism',
                'Replacement for application-level retries',
              ],
              answer: 1,
              explain: 'It is a readiness signal used to gate startup. It is not a substitute for retries: a dependency can still fail mid-run, so robust apps keep connection retry/backoff too.',
            },
            {
              q: 'Why is Compose the wrong tool for a production cluster spanning many machines?',
              options: [
                'It cannot use volumes',
                'It targets a single Docker host and has no cross-machine scheduling or self-healing rescheduling',
                'It does not support Postgres',
                'It cannot run more than two services',
              ],
              answer: 1,
              explain: 'Compose is a single-host, declarative convenience. Multi-host scheduling, automatic failover, and rolling deploys are the job of an orchestrator like Kubernetes.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do containers in a Compose stack find each other?',
            a: (
              <p>
                Compose attaches every service to a shared user-defined network and Docker&apos;s embedded DNS resolves
                each service name to that container&apos;s current IP. So the app connects to <code>db:5432</code> using
                the service name <code>db</code> as the hostname — never a hard-coded IP, and never <code>localhost</code>{' '}
                (which inside a container means that container itself). Published <code>ports</code> are only for reaching
                a service from the host.
              </p>
            ),
          },
          {
            q: 'Your app container crashes on startup with "connection refused" to the database, but only sometimes. What is happening and how do you fix it?',
            a: (
              <p>
                A startup race: <code>depends_on</code> waited for the database <em>container</em> to start, but the
                database process needs another moment before it accepts connections, so the app sometimes wins the race
                and fails. Fix it with a healthcheck on the database (for Postgres, <code>pg_isready</code>) and{' '}
                <code>depends_on: condition: service_healthy</code> so the app waits for <em>ready</em>, not just{' '}
                <em>started</em>. Belt and braces: keep connection retries in the app, since a dependency can also drop
                mid-run.
              </p>
            ),
          },
          {
            q: 'When would you move from Docker Compose to Kubernetes?',
            a: (
              <p>
                When the workload must span multiple machines with automatic recovery — self-healing rescheduling,
                rolling deploys, autoscaling, continuous liveness/readiness probes. Compose is the single-host dev and
                simple-deployment sweet spot; a cluster orchestrator is warranted once high availability across nodes is a
                hard requirement. Running three containers on a laptop does not need Kubernetes, and saying so shows
                judgment.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A <code>docker-compose.yml</code> declares a multi-container stack — services, one shared network, volumes, and dependencies — brought up or down with a single command and kept in version control.</>,
          <>Services share a network and resolve each other by service name via DNS: the app reaches Postgres at host <code>db</code>, not <code>localhost</code> and not a hard-coded IP.</>,
          <>Named volumes hold stateful data (database dir) and are Docker-managed and durable; bind mounts map a host folder in for live code in development. A plain <code>down</code> keeps named volumes; <code>down -v</code> deletes them.</>,
          <><code>depends_on</code> alone only orders container start. To wait for <em>readiness</em>, add a healthcheck (<code>pg_isready</code>) and <code>depends_on: condition: service_healthy</code> — the fix for &quot;connection refused&quot; startup races.</>,
          <>Healthchecks are a readiness signal, not a correctness guarantee: keep application-level retries because a dependency can still fail mid-run. <code>ports</code> publishes to the host; service-to-service traffic needs only the service name.</>,
          <>Compose is the single-host dev and simple-deploy sweet spot — above raw <code>docker run</code> scripts, below Kubernetes, which you reach for only when multiple machines and automatic recovery are hard requirements.</>,
        ]}
      />
    </>
  )
}
