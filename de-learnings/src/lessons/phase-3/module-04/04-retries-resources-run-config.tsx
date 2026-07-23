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

const ID = '3.4.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Three things that do not belong hardcoded inside an asset">
        <p>
          Your assets so far have their guts wired in: the database path is a string literal, the connection is opened inline,
          and if the network hiccups the asset just fails. That is fine until the first time you need to run the same pipeline
          against a <em>different</em> database (dev vs prod), or survive a flaky API, or change a threshold without editing
          code. This lesson is the three seams that fix that: <b>resources</b> (pluggable external dependencies),{' '}
          <b>retries</b> (survive transient failure), and <b>run config</b> (parameterize a run) — with secrets kept out of
          code via <GlossaryTerm k="environment-variable">environment variables</GlossaryTerm>.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think of a power tool. A good one takes interchangeable bits — you snap in the drill bit at home and the
                heavy-duty bit on the job site, without rebuilding the tool. It has a slip clutch, so when the bit catches it
                does not just snap; it eases off and tries again. And it has a dial for speed, so you set the setting for the
                job instead of buying a new tool for each speed.
              </p>
              <p>
                An asset should be built the same way. The database connection is the snap-in bit (swap dev for prod). Retries
                are the slip clutch (a transient snag should not break the whole job). Run config is the dial (change a
                threshold for one run without touching the tool). And the key to the tool shed — the password — hangs on a hook
                outside the tool, never welded inside it.
              </p>
            </>
          }
          student={
            <>
              <p>
                Concretely: a <GlossaryTerm k="dagster-resource">resource</GlossaryTerm> is an external dependency — a database
                connection, an S3 client, an API session — that Dagster constructs once and <em>injects</em> into any asset
                that asks for it, so the asset never news up its own connection. A <code>RetryPolicy</code> tells Dagster to
                re-run a failed step a few times with a growing delay, so a transient blip does not fail the run. Run config is
                a typed set of parameters supplied when you launch a run, so one asset can behave differently per run without a
                code change.
              </p>
              <p>
                All three share one goal: get the things that <em>vary</em> — where you connect, how you recover, what
                thresholds you use, what secrets you need — <em>out</em> of the business logic, so the asset function is just
                the transformation and everything environmental is supplied from outside.
              </p>
            </>
          }
          phd={
            <>
              <p>
                This is dependency inversion applied to a pipeline. The asset declares <em>what</em> it needs (a resource with
                a <code>query</code> method, a config with a <code>min_fare</code>) as a typed dependency; the runtime decides
                <em>which</em> concrete implementation and values to bind at execution time. That inversion is what makes assets
                testable — you instantiate the asset with an in-memory fake resource and a fixed config in a unit test, no
                Dagster daemon, no real database — and portable — the same asset code runs against DuckDB locally and Postgres
                in prod purely by swapping the resource in <code>Definitions</code>.
              </p>
              <p>
                Retries sit at the execution layer: a <code>RetryPolicy</code> is per-step (op) policy the executor applies,
                distinct from run-level automatic retries and from application-level backoff inside your code. Config is a
                Pydantic model (<code>dg.Config</code> / <code>ConfigurableResource</code> are Pydantic-backed), so parameters
                are schema-validated before the run starts rather than blowing up mid-execution — the same &quot;fail at the
                boundary, not in the middle&quot; discipline that typed schemas give you everywhere.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Resources: inject the connection, do not hardcode it">
        <p>
          A resource is a class Dagster builds once and hands to any asset that names it as a parameter — the same
          dependency-by-parameter trick you saw for assets, now for external systems. Define it as a{' '}
          <code>ConfigurableResource</code>; ask for it by parameter name; bind the concrete instance in{' '}
          <code>Definitions</code>.
        </p>
        <CodeBlock
          label="defs.py — a DuckDB resource, injected"
          code={`import dagster as dg

class DuckDBResource(dg.ConfigurableResource):
    # The path is configuration, not hardcoded — and can come from an env var.
    database: str

    def query(self, sql: str) -> list:
        import duckdb
        con = duckdb.connect(self.database)
        try:
            return con.execute(sql).fetchall()
        finally:
            con.close()

@dg.asset
def trips_summary(duckdb: DuckDBResource) -> None:
    # The asset asks for "duckdb" and Dagster injects it. No connection code here.
    duckdb.query("CREATE TABLE IF NOT EXISTS summary AS SELECT 1 AS ok")

defs = dg.Definitions(
    assets=[trips_summary],
    resources={
        # Swap THIS line for a Postgres resource in prod — asset code never changes.
        "duckdb": DuckDBResource(database=dg.EnvVar("DUCKDB_PATH")),
    },
)`}
        />
        <Tiered
          layman={
            <>
              <p>
                The asset says &quot;I need a database&quot; and holds out its hand; Dagster puts the right one in it. At home
                that hand gets a small local database; at work it gets the big shared one — but the asset&apos;s recipe never
                changes, because it never reaches out and grabs a specific database itself. And the actual file path comes from
                a hook outside the code (<code>DUCKDB_PATH</code>), so no secret or machine-specific path is baked in.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>ConfigurableResource</code> gives you a typed, reusable wrapper around an external system. The asset takes
                a parameter named <code>duckdb</code>; Dagster matches it to the <code>&quot;duckdb&quot;</code> key in the{' '}
                <code>resources</code> dict and injects the instance. The payoff is the commented line: to move from dev to
                prod you swap the one binding in <code>Definitions</code> (DuckDB → Postgres), and every asset that uses{' '}
                <code>duckdb</code> follows, with zero edits to asset code. <code>dg.EnvVar(&quot;DUCKDB_PATH&quot;)</code>{' '}
                reads the value from the environment at runtime, so paths and secrets live outside the repo.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A <code>ConfigurableResource</code> has a lifecycle: Dagster instantiates it per run, optionally runs{' '}
                <code>setup_for_execution</code>/<code>teardown_after_execution</code> hooks (for pooled connections or clients
                that must open and close), and can nest resources inside resources. Because binding happens in{' '}
                <code>Definitions</code>, the resource graph is itself swappable per deployment — a common pattern is one{' '}
                <code>Definitions</code> per environment, or resource values driven entirely by <code>EnvVar</code>, so the
                same image runs anywhere. <code>EnvVar</code> is resolved at run launch, not import, so a rotated secret is
                picked up without rebuilding.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="Secrets never live in code">
          A hardcoded password in a Python file is a password in your Git history forever. Read it from an environment variable
          (<code>dg.EnvVar</code>) or a secrets manager. The asset asks for a resource; the resource reads the secret from the
          environment; the code and the repo stay clean.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Retries: survive the transient blip with backoff">
        <p>
          External I/O fails for boring, temporary reasons — a dropped connection, a rate limit, a node restart. A{' '}
          <code>RetryPolicy</code> tells Dagster to re-run the failed step a few times before giving up, and to <em>wait
          longer between each attempt</em> — <GlossaryTerm k="exponential-backoff">exponential backoff</GlossaryTerm>, the same
          pattern you met for API rate limits in 3.2, now at the orchestration layer.
        </p>
        <RetryBackoffViz />
        <CodeBlock
          label="defs.py — a retry policy on a flaky asset"
          code={`import dagster as dg

@dg.asset(
    retry_policy=dg.RetryPolicy(
        max_retries=3,
        delay=2,                       # seconds before the first retry
        backoff=dg.Backoff.EXPONENTIAL # 2s, then 4s, then 8s
    )
)
def flaky_load(context: dg.AssetExecutionContext) -> None:
    # Imagine this calls a flaky external API.
    context.log.info("attempting the flaky call")
    raise Exception("transient network error")`}
        />
        <p>
          The delays double: 2s, then 4s, then 8s. You can compute that schedule with pure Python — run it to see why backoff
          matters (a fixed short retry would hammer a struggling server; a doubling one gives it room to recover):
        </p>
        <CodeRunner
          language="python"
          code={`base_delay = 2      # seconds
max_retries = 3

total = 0
for attempt in range(1, max_retries + 1):
    wait = base_delay * (2 ** (attempt - 1))   # exponential backoff
    total += wait
    print("retry", attempt, "waits", wait, "s")
print("worst-case total wait before giving up:", total, "s")`}
        />
        <Tiered
          layman={
            <>
              <p>
                If a phone call drops, you do not redial forever at top speed — you wait a moment, then a bit longer, then
                longer still, because the line might just be busy. Retries with backoff are that patience built into the
                pipeline: try again, but ease off each time, so a server that is briefly overwhelmed gets a chance to catch its
                breath instead of being pounded.
              </p>
            </>
          }
          student={
            <>
              <p>
                Attach <code>retry_policy=RetryPolicy(...)</code> to an asset and Dagster re-executes the step on failure up to{' '}
                <code>max_retries</code> times, waiting <code>delay</code> seconds and multiplying that wait each round with{' '}
                <code>Backoff.EXPONENTIAL</code>. Use it for anything that touches the network or an external service; do{' '}
                <em>not</em> use it to paper over a real bug (a null-pointer will just fail three more times, slower). Retries
                assume the operation is safe to repeat — which is exactly why the idempotency you built in 3.2 matters: a
                retried write must not double-count.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>RetryPolicy</code> is per-op policy the executor enforces; each retry is a fresh step attempt recorded in
                the event log, so you can see the attempt count and delays. It composes with, but is separate from, run-level
                retries (re-launching a whole failed run) and from application-level backoff you might code inside a resource.
                Production policies add <em>jitter</em> to break synchronization between many clients retrying at once (the
                thundering-herd problem the viz shows) — randomizing the wait so a recovering service is not hit by every
                client on the same doubling schedule. The correctness precondition throughout is idempotency: retry safety
                requires that re-executing the step converges to the same state, not a duplicated side effect.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Run config: parameterize a run without touching code">
        <p>
          Sometimes you want the same asset to behave differently for one run — a stricter fare threshold, a different batch
          size. Run config supplies typed parameters at launch time. Declare a <code>Config</code> subclass, take it as a
          parameter, and Dagster validates and injects it.
        </p>
        <CodeBlock
          label="defs.py — config-driven threshold"
          code={`import dagster as dg

class TripsConfig(dg.Config):
    min_fare: float = 0.0     # default; override per run

@dg.asset
def clean_trips(raw_trips: list, config: TripsConfig) -> list:
    # The threshold is supplied per run, not hardcoded.
    return [r for r in raw_trips if r["fare"] >= config.min_fare]`}
        />
        <Tiered
          layman={
            <>
              <p>
                It is the dial on the tool. Most days you leave it at the default. For one job you turn it up — &quot;only keep
                fares of at least five&quot; — run it, and leave the tool itself unchanged. Tomorrow it is back to the default.
                You changed the setting, not the machine.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <code>dg.Config</code> subclass is a typed schema of run parameters with defaults. An asset that takes a{' '}
                <code>config: TripsConfig</code> parameter receives it filled in — from the defaults, or from values you pass in
                the UI&apos;s launchpad (or via the API) when you kick off a run. Because it is validated up front, a bad value
                (a string where a float belongs) is caught before the run starts, not halfway through. Use config for knobs a
                human tweaks per run; use resources for connections; keep secrets in env vars — three different jobs, three
                different mechanisms.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>Config</code> and <code>ConfigurableResource</code> are both Pydantic models, so the run config is a
                validated, self-documenting schema surfaced in the launchpad. The distinction from a resource is intent and
                lifetime: config is per-run scalar parameters (thresholds, dates, flags); a resource is a constructed object
                with behavior and a lifecycle (connections, clients). Blurring them — stuffing a connection string into config,
                or hardcoding a threshold into a resource — is the common smell; the clean split is &quot;config parameterizes,
                resources provide.&quot;
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Hardcode it, or inject it via resources and config?">
        <p>
          Indirection is not free — a resource and a config schema are more moving parts than a literal string. The honest
          question is when that indirection pays for itself.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Hardcoded connections and values',
              strengths: [
                'Simplest possible thing — the value is right there in the function, nothing to wire',
                'Fine for a throwaway script or a one-environment prototype',
              ],
              weaknesses: [
                'Cannot swap dev vs prod without editing code; secrets end up in Git history',
                'Untestable in isolation — the asset always reaches for the real database',
                'A threshold change means a code change, review, and redeploy',
              ],
              chooseWhen: 'a genuine one-off in a single environment where nothing will be reused, swapped, or tested.',
            },
            {
              name: 'Resources + run config (dependency injection)',
              strengths: [
                'Swap dev/prod (DuckDB → Postgres) by changing one binding, not asset code',
                'Testable — inject a fake resource and fixed config, no live systems needed',
                'Secrets stay in env vars; per-run knobs move to config, validated before the run',
              ],
              weaknesses: [
                'More concepts and indirection — a resource class and a config schema to maintain',
                'Over-abstracting a tiny pipeline adds ceremony with little payoff',
              ],
              chooseWhen: 'anything that runs in more than one environment, needs testing, touches secrets, or has knobs — i.e. almost all real pipelines.',
            },
          ]}
          note={
            <>
              The trade is the classic abstraction one: indirection buys portability and testability at the cost of a layer to
              understand. For a five-line experiment, hardcode. The moment the pipeline must run somewhere else, be tested, or
              hold a secret, the injected version has already paid for itself — which is why production Dagster code is written
              this way by default.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: inject a resource, add a retry policy, drive with config">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Continue in <code>C:\de-lab\dagster-lab</code>. You will add a DuckDB resource fed by an environment variable,
              add a retry policy to a deliberately flaky asset and watch it retry with backoff, then materialize with a config
              value. You need DuckDB: <code>uv add duckdb</code>.
            </p>
          }
          steps={[
            {
              title: 'Add DuckDB and set the env var',
              body: (
                <p>
                  Install DuckDB, then set <code>DUCKDB_PATH</code> in the shell you will launch Dagster from (env vars are read
                  at run time, so set it before starting <code>dagster dev</code>).
                </p>
              ),
              commands: [
                {
                  ps: 'cd C:\\de-lab\\dagster-lab\nuv add duckdb\n$env:DUCKDB_PATH = "trips.duckdb"',
                  bash: 'cd ~/de-lab/dagster-lab && uv add duckdb\nexport DUCKDB_PATH=trips.duckdb',
                },
              ],
              checkpoint: (
                <>
                  <code>uv add duckdb</code> succeeds. <code>echo $env:DUCKDB_PATH</code> (PowerShell) prints{' '}
                  <code>trips.duckdb</code>. Keep this terminal — its environment is what Dagster will inherit.
                </>
              ),
            },
            {
              title: 'Add a resource-backed asset',
              body: (
                <>
                  <p>Add to <code>defs.py</code> and register the resource and asset:</p>
                  <CodeBlock
                    label="defs.py — additions"
                    code={`class DuckDBResource(dg.ConfigurableResource):
    database: str

    def query(self, sql: str) -> list:
        import duckdb
        con = duckdb.connect(self.database)
        try:
            return con.execute(sql).fetchall()
        finally:
            con.close()

@dg.asset
def trips_summary(duckdb: DuckDBResource) -> None:
    duckdb.query("CREATE OR REPLACE TABLE summary AS SELECT 42 AS answer")

# in Definitions(...): add trips_summary to assets=[...], and add:
#   resources={"duckdb": DuckDBResource(database=dg.EnvVar("DUCKDB_PATH"))}`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  Restart <code>uv run dagster dev -f defs.py</code> in the terminal where <code>DUCKDB_PATH</code> is set.
                  Materialize <code>trips_summary</code>; it goes green. A file <code>trips.duckdb</code> appears in the project
                  folder — the resource-backed asset wrote to the injected database.
                </>
              ),
            },
            {
              title: 'Add a flaky asset with a retry policy',
              body: (
                <>
                  <p>
                    Add an asset that fails on its first two attempts and succeeds on the third, with a retry policy so the run
                    ultimately survives:
                  </p>
                  <CodeBlock
                    label="defs.py — flaky asset"
                    code={`import os

@dg.asset(
    retry_policy=dg.RetryPolicy(max_retries=3, delay=1, backoff=dg.Backoff.EXPONENTIAL)
)
def flaky_load(context: dg.AssetExecutionContext) -> None:
    marker = "attempts.txt"
    n = int(open(marker).read()) + 1 if os.path.exists(marker) else 1
    with open(marker, "w") as f:
        f.write(str(n))
    context.log.info("attempt " + str(n))
    if n < 3:
        raise Exception("transient failure on attempt " + str(n))
    context.log.info("succeeded on attempt " + str(n))

# add flaky_load to assets=[...] in Definitions(...)`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  Restart <code>dagster dev</code>. Delete any stale <code>attempts.txt</code> first (
                  <code>Remove-Item attempts.txt -ErrorAction Ignore</code>), then materialize <code>flaky_load</code>.
                </>
              ),
            },
            {
              title: 'Watch the retries with backoff',
              body: (
                <>
                  <p>Open the run for <code>flaky_load</code> and read its step log.</p>
                  <RevealSolution label="What the log shows">
                    <p>
                      Attempt 1 logs then raises; Dagster waits ~1s and retries. Attempt 2 raises; Dagster waits ~2s (delay
                      doubled) and retries. Attempt 3 logs &quot;succeeded&quot; and the step goes <b>green</b> — the run passes
                      despite two failures. <code>attempts.txt</code> contains <code>3</code>. If you set{' '}
                      <code>max_retries=1</code> instead, the step would exhaust retries on attempt 2 and the run would fail —
                      the policy is the difference between surviving a blip and not.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  The run log shows three attempts with increasing delay between them and a final success; the asset ends green.
                  <code>Get-Content attempts.txt</code> prints <code>3</code>.
                </>
              ),
            },
            {
              title: 'Drive an asset with run config',
              body: (
                <>
                  <p>
                    Add a config-driven asset and materialize it with a non-default value from the UI launchpad:
                  </p>
                  <CodeBlock
                    label="defs.py — config-driven asset"
                    code={`class TripsConfig(dg.Config):
    min_fare: float = 0.0

@dg.asset
def clean_trips(raw_trips: list, config: TripsConfig) -> list:
    return [r for r in raw_trips if r["fare"] >= config.min_fare]

# add clean_trips to assets=[...] in Definitions(...)`}
                  />
                  <p>
                    In the UI, materialize <code>clean_trips</code> and open the launchpad / config editor; supply{' '}
                    <code>min_fare: 8.0</code> for this run.
                  </p>
                </>
              ),
              checkpoint: (
                <>
                  With <code>min_fare: 8.0</code>, <code>clean_trips</code> returns only the rows with fare ≥ 8 (from the 3.4.1
                  sample, that drops the 7.25 and 0.00 rows). Materialize again with the default (0.0) and more rows pass — same
                  code, different run, driven purely by config.
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
              q: 'What problem do Dagster resources solve?',
              options: [
                'They make assets run faster',
                'They inject external dependencies (a DB connection, an S3 client) into assets, so you can swap dev vs prod without changing asset code',
                'They schedule assets on a cron',
                'They store the asset’s output data',
              ],
              answer: 1,
              explain: 'A resource is a pluggable external dependency Dagster constructs and injects. Because the binding lives in Definitions, you swap DuckDB for Postgres by changing one line, not the assets that use it — dependency injection.',
            },
            {
              q: 'Where should a database password go?',
              options: [
                'Hardcoded as a string literal in the asset',
                'In an environment variable (e.g. dg.EnvVar) or a secrets manager, read at run time — never in code or Git',
                'In the quiz answer',
                'In the asset’s return value',
              ],
              answer: 1,
              explain: 'A secret hardcoded in a Python file is in your Git history forever. Read it from the environment via dg.EnvVar (resolved at run launch) or a secrets manager, so the repo stays clean.',
            },
            {
              q: 'A RetryPolicy with delay=2 and Backoff.EXPONENTIAL waits how long between the first three retries?',
              options: [
                '2s, 2s, 2s (constant)',
                '2s, 4s, 8s (doubling each time)',
                '2s, 1s, 0.5s (halving)',
                'It does not wait at all',
              ],
              answer: 1,
              explain: 'Exponential backoff doubles the wait each round: 2s, then 4s, then 8s. It gives a struggling server room to recover instead of hammering it on a fixed short interval.',
            },
            {
              q: 'When should you NOT rely on a retry policy?',
              options: [
                'When the failure is transient (a dropped connection or rate limit)',
                'When the failure is a real bug (e.g. a null-pointer) — retrying just fails again, slower',
                'When the operation touches the network',
                'When you want to survive a node restart',
              ],
              answer: 1,
              explain: 'Retries are for transient, self-correcting failures. A deterministic bug will fail identically on every retry — you have just made the failure slower. Fix the bug; retry the blip.',
            },
            {
              q: 'What is run config used for?',
              options: [
                'Storing secrets',
                'Supplying typed, validated parameters at launch time (e.g. a threshold) so one asset behaves differently per run without a code change',
                'Opening database connections',
                'Scheduling the run',
              ],
              answer: 1,
              explain: 'Config is per-run knobs, validated up front via a dg.Config schema. Resources provide connections; env vars hold secrets; config parameterizes — three jobs, three mechanisms.',
            },
            {
              q: 'Why does injecting resources/config make assets more testable?',
              options: [
                'It does not affect testability',
                'You can instantiate the asset with a fake in-memory resource and a fixed config in a unit test — no Dagster daemon, no real database',
                'It disables retries during tests',
                'It logs more output',
              ],
              answer: 1,
              explain: 'Dependency injection lets you bind fakes: the asset declares what it needs, the test supplies stand-ins. That is the core testability payoff of separating environmental concerns from business logic.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What are resources in Dagster and why use them instead of hardcoding a connection?',
            a: (
              <p>
                A resource is a pluggable external dependency — a database connection, an object-store client, an API session —
                that Dagster constructs and injects into any asset that names it as a parameter. Instead of an asset opening its
                own connection to a specific database, it declares &quot;I need a duckdb resource&quot; and the runtime binds the
                concrete instance, chosen in <code>Definitions</code>. That buys two things hardcoding cannot: portability (swap
                DuckDB for Postgres by changing one binding, with no edits to asset code) and testability (inject an in-memory
                fake in a unit test). Combined with reading secrets from environment variables, it keeps connection details and
                credentials out of the business logic and out of Git.
              </p>
            ),
          },
          {
            q: 'How do you make a pipeline resilient to a flaky external API?',
            a: (
              <p>
                Attach a <code>RetryPolicy</code> to the asset with a small <code>max_retries</code> and exponential backoff, so
                a transient failure — a dropped connection, a 429 rate limit, a brief outage — is retried with a growing delay
                rather than failing the run. Add jitter at scale so many clients do not retry in lockstep and re-overwhelm a
                recovering service. The precondition is idempotency: the retried operation must be safe to repeat without
                double-counting, which is why idempotent writes matter. Crucially, retries are only for transient failures — a
                deterministic bug will just fail again more slowly, so retries are not a substitute for fixing it.
              </p>
            ),
          },
          {
            q: 'What is the difference between a resource and run config?',
            a: (
              <p>
                A resource is a constructed object with behavior and a lifecycle — a connection or client you build once and
                reuse; run config is a set of typed, validated scalar parameters supplied at launch time — thresholds, dates,
                flags. Rule of thumb: resources <em>provide</em> (the how-to-connect), config <em>parameterizes</em> (the
                per-run knobs), and secrets live in environment variables. Both are Pydantic-backed so they are validated before
                the run starts. Blurring them — a connection string in config, a hardcoded threshold in a resource — is a common
                smell; keeping the split clean is what makes the pipeline portable and testable.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Resources are pluggable external dependencies (connections, clients) Dagster injects into assets by parameter name — swap dev vs prod by changing one binding in <code>Definitions</code>, not asset code.</>,
          <>Secrets and machine-specific values come from environment variables (<code>dg.EnvVar</code>), resolved at run time — never hardcoded, never in Git.</>,
          <>A <code>RetryPolicy</code> (max_retries + delay + exponential backoff) lets a step survive transient I/O failures; use it for blips, not for real bugs, and only when the operation is idempotent.</>,
          <>Run config supplies typed, validated parameters at launch time so one asset behaves differently per run without a code change — knobs a human tweaks, caught at the boundary.</>,
          <>Resources provide, config parameterizes, env vars hold secrets — three concerns, three mechanisms; keeping them separate is what makes assets portable and testable.</>,
          <>The through-line is dependency injection: the asset declares what it needs, the runtime binds the concrete implementation — so business logic stays free of environmental detail.</>,
        ]}
      />
    </>
  )
}
