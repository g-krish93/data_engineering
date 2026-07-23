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

const ID = '3.7.2'

// A CI-flavoured git story: open a PR, CI runs dbt build, it fails, you fix, it goes green, then merge.
const CI_SCRIPT: GitStep[] = [
  {
    kind: 'commit',
    branch: 'main',
    msg: 'init: dbt project + CI workflow',
    note: 'main holds a working dbt project and a .github/workflows file. Every change from here on arrives through a pull request.',
  },
  {
    kind: 'commit',
    branch: 'main',
    msg: 'feat: fct_orders model',
    note: 'main is the protected, always-deployable line. Nothing is committed to it directly once branch protection is on.',
  },
  {
    kind: 'branch',
    name: 'feat/margin',
    from: 'main',
    note: 'Open a feature branch for one unit of work. Your changes are isolated; main is untouched while you experiment.',
  },
  {
    kind: 'commit',
    branch: 'feat/margin',
    msg: 'feat: add margin model + accepted_values test',
    note: 'You push the branch and open a pull request. Opening the PR is the event that triggers the CI workflow.',
  },
  {
    kind: 'commit',
    branch: 'feat/margin',
    msg: 'ci run: RED — accepted_values test fails',
    note: 'CI ran dbt build against a fresh DuckDB target. A data test failed, so the check is RED and the merge button is blocked.',
  },
  {
    kind: 'commit',
    branch: 'feat/margin',
    msg: 'fix: correct status value mapping',
    note: 'You push a fix. CI re-runs automatically on the new commit — this time build and all tests pass, so the check turns GREEN.',
  },
  {
    kind: 'merge',
    from: 'feat/margin',
    into: 'main',
    msg: 'merge: margin model (CI green)',
    note: 'Only a green PR can merge. Every commit that reaches main has already built and passed its tests — main stays trustworthy.',
  },
]

// Main CI workflow. Note: ${{ ... }} expressions are escaped as \${{ so the JS
// template literal does not try to interpolate them.
const DBT_CI_YAML = `name: dbt-ci

on:
  pull_request:
    branches: [main]

# Cancel a superseded run when you push again to the same PR branch.
concurrency:
  group: dbt-ci-\${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Check out the PR code
        uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v5

      - name: dbt deps
        run: uv run --with dbt-duckdb dbt deps

      # dbt build = dbt run + dbt test, in dependency order, against the CI target.
      # It exits non-zero if any model errors or any test fails -> the check goes red.
      - name: dbt build against the CI DuckDB target
        run: uv run --with dbt-duckdb dbt build --target ci`

// The 'ci' target in profiles.yml: an ephemeral, throwaway DuckDB file created
// fresh on the runner and discarded when the job ends.
const PROFILES_YAML = `jaffle_shop:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: dev.duckdb
    ci:
      type: duckdb
      path: ci.duckdb   # created fresh on the CI runner, thrown away after the job`

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Catch the broken model before it reaches main, not after">
        <p>
          In 3.6 you wrote dbt models and tests. Right now the only thing standing between a broken model and everyone
          else&apos;s dashboards is <em>you remembering to run</em> <code>dbt build</code> before you push — and
          reviewers eyeballing a diff they cannot actually execute.{' '}
          <GlossaryTerm k="continuous-integration">Continuous integration</GlossaryTerm> removes the &quot;remembering&quot;:
          a robot builds your models and runs every test automatically on each pull request, and refuses the merge if
          anything is red. This lesson wires that robot up with GitHub Actions.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Imagine a shared recipe book that a whole kitchen cooks from. Anyone can suggest an edit, but if a bad
                edit lands — a step that ruins the dish — everyone who cooks it that night serves garbage. You do not
                want to <em>hope</em> people test their edits. So you hire a taster who stands at the door: every
                proposed edit gets cooked and tasted before it is allowed into the book. Bad edits bounce; only edits
                that produce a good dish get in.
              </p>
              <p>
                Continuous integration is that taster for code. Every proposed change is automatically built and tested
                by a machine before it can join the shared version. The shared version stays trustworthy because nothing
                broken is ever allowed to merge into it — not because everyone is careful, but because the door is
                guarded.
              </p>
            </>
          }
          student={
            <>
              <p>
                CI is the practice of automatically building and testing every change against the shared codebase before
                it merges. For application code that means compile + unit tests. For a data project it means the same
                move you already run by hand — <code>dbt build</code>, which is <code>dbt run</code> (materialise the
                models) plus <code>dbt test</code> (run every schema and data test), in dependency order — executed by a
                runner on every pull request against a disposable CI warehouse.
              </p>
              <p>
                The payoff is a protected <code>main</code>: with{' '}
                <GlossaryTerm k="branch-protection">branch protection</GlossaryTerm> requiring the CI check to pass,
                every commit that reaches main has already built cleanly and passed its tests. A broken model or a
                failing test surfaces on the PR — visible to you and the reviewer, in minutes — instead of in production
                after merge. You move the moment of discovery left, from &quot;after it broke things&quot; to
                &quot;before it could.&quot;
              </p>
            </>
          }
          phd={
            <>
              <p>
                CI is a mechanism for keeping a mainline continuously in a known-good state by gating every integration
                on an automated, reproducible verification. The reproducibility clause is what makes it more than a
                cron&apos;d test run: CI executes in a clean, declared environment (a fresh runner, pinned dependency
                versions) so a pass means &quot;this builds from nothing&quot;, not &quot;this builds on the author&apos;s
                laptop where a stale artifact happened to be lying around.&quot; That is precisely the reproducibility
                argument from the container lessons, applied to verification instead of runtime.
              </p>
              <p>
                Data CI lagged software CI by roughly a decade, and the reasons are structural. Software has cheap,
                hermetic unit tests; data transformations were historically tested only against production warehouses,
                which are expensive, shared, stateful, and slow to spin up per-PR. Three things closed the gap: SQL
                transformations became version-controlled code with a compiler (dbt), tests became declarative and
                colocated with models, and embedded engines like DuckDB made a full warehouse spin up in a CI runner in
                seconds for free. The remaining hard problem — you cannot always afford to build every model from
                scratch on every PR — is what slim/stateful CI addresses, below.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The shape of a PR-triggered CI run">
        <p>
          Step through the story: a change branches off main, opens a PR, gets built and tested by CI, fails, is fixed,
          goes green, and only then merges. Watch where CI sits — between the commit and the merge, as a gate nothing
          crosses while red. Hover a commit; use <strong>next step</strong>.
        </p>
        <GitGraph3D script={CI_SCRIPT} />
        <Tiered
          layman={
            <>
              <p>
                The story in the picture: you copy the shared book onto your own desk (branch), make your edit, and put
                up a note saying &quot;please consider this&quot; (open a pull request). The taster immediately cooks
                your version. The first time, it fails — so your note is stamped &quot;not yet.&quot; You fix the edit
                and put it up again; the taster re-cooks automatically and this time it passes, stamping your note
                &quot;good.&quot; Only a &quot;good&quot; note is allowed to fold your edit back into the shared book.
              </p>
              <p>
                The important part is the order: cook first, merge second. Nothing broken ever touches the shared copy,
                because the check happens on your isolated copy, before the merge — never after.
              </p>
            </>
          }
          student={
            <>
              <p>
                The mechanics: you push a feature branch and open a PR. The <code>pull_request</code> trigger fires the
                workflow. GitHub provisions a fresh Ubuntu runner, checks out your branch&apos;s code, installs
                dependencies, and runs <code>dbt build</code> against a disposable CI target. The job&apos;s exit code
                becomes the check status — non-zero (a model errored or a test failed) shows a red X on the PR; zero
                shows a green check.
              </p>
              <p>
                Push a fix and the workflow re-runs automatically on the new commit — CI is edge-triggered on every push
                to the PR, not something you invoke. With branch protection set to require the <code>dbt-ci</code> check,
                the merge button stays disabled until it is green. The result is the invariant in the viz: every commit
                on main has passed CI.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The trigger taxonomy matters for cost and safety. <code>pull_request</code> runs against a merge commit
                (your branch merged into the base) using the base repo&apos;s workflow definition, and — critically —
                withholds secrets from forks, which is the standard defence against a malicious PR exfiltrating
                credentials. <code>push</code> to main is the complementary post-merge trigger, often used to build
                artifacts or run a heavier suite. Scheduled runs (the same cron model as 1.6) catch drift that no code
                change triggered — a source that started emitting bad data.
              </p>
              <p>
                A subtlety unique to data CI: the check must run against a target that is safe to destroy and isolated
                from every other concurrent PR. Two PRs building into the same schema at once will corrupt each
                other&apos;s results. The disposable-DuckDB-file approach sidesteps this entirely (each run gets its own
                filesystem), but on a shared warehouse you need per-run{' '}
                <GlossaryTerm k="ephemeral-environment">ephemeral schemas</GlossaryTerm> — a schema named after the PR or
                run id, created at the start and dropped at the end — which is exactly the isolation containers gave you
                for runtime, now applied to the CI warehouse.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The workflow file, and what it actually does">
        <p>
          A GitHub Actions workflow is a YAML file under <code>.github/workflows/</code>. It declares <em>when</em> to
          run (the trigger), <em>where</em> (the runner), and <em>what</em> (the steps). Here is a complete dbt CI
          workflow — it installs <code>uv</code>, then runs <code>dbt build</code> against a DuckDB CI target on every
          PR to main:
        </p>
        <CodeBlock label=".github/workflows/dbt-ci.yml" code={DBT_CI_YAML} />
        <p>
          The one piece that lives outside the workflow is the <code>ci</code> target it builds against — defined in{' '}
          <code>profiles.yml</code> as a throwaway DuckDB file created fresh on the runner:
        </p>
        <CodeBlock label="profiles.yml (the ci target)" code={PROFILES_YAML} />
        <Callout kind="info" title="Reading the YAML">
          <code>on: pull_request</code> is the trigger. <code>runs-on: ubuntu-latest</code> is a fresh cloud machine.
          Each <code>- name:</code> is a step: checkout the code, install uv, install dbt deps, then{' '}
          <code>dbt build</code>. Because <code>dbt build</code> exits non-zero on any model error or test failure, the
          job&apos;s status directly reflects your data quality. The <code>concurrency</code> block cancels an
          in-flight run when you push again — no point finishing a build for code you just replaced.
        </Callout>
        <p>
          CI is not only for dbt. The same job commonly runs a{' '}
          <GlossaryTerm k="linter">linter</GlossaryTerm> to enforce style before anything is built — for SQL that is{' '}
          <GlossaryTerm k="sqlfluff">sqlfluff</GlossaryTerm>, which parses your SQL and flags rule violations. A linter
          is itself a check: it exits non-zero on a problem. Here is a tiny stand-in for the kind of rule a linter
          enforces — a naming convention that CI can fail on — in plain Python (stdlib only), so you can run it:
        </p>
        <CodeRunner
          language="python"
          code={`# A linter is just a check that returns non-zero on a violation.
# Rule: every staging model file must be named stg_<something>.sql
model_files = [
    "models/staging/stg_orders.sql",
    "models/staging/stg_customers.sql",
    "models/staging/orders_raw.sql",     # violates the convention
    "models/marts/fct_orders.sql",
]

violations = [
    f for f in model_files
    if f.startswith("models/staging/") and not f.split("/")[-1].startswith("stg_")
]

for v in violations:
    print(f"LINT FAIL: staging model not prefixed stg_ -> {v}")

exit_code = 1 if violations else 0
print(f"{len(violations)} violation(s) -> CI would exit {exit_code} "
      + ("(check RED, merge blocked)" if exit_code else "(check GREEN)"))`}
        />
        <Callout kind="tip" title="Order the cheap checks first">
          Real CI runs the fast, cheap checks (lint, compile) before the slow ones (build + test), so a style slip fails
          in seconds instead of after a multi-minute build. Fail fast applies to CI itself, not just to data.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Slim CI: only build what changed">
        <Tiered
          layman={
            <>
              <p>
                The taster problem: if your recipe book has a thousand dishes and you edit one, does the taster really
                need to cook all thousand? On a small book, sure — it is quick. On a huge one, cooking everything for a
                one-line edit is slow and wasteful, and people start resenting the wait.
              </p>
              <p>
                The smarter taster remembers what the book looked like last time it was known-good, compares, and cooks
                only the dish you changed plus anything that uses it as an ingredient. Same safety for the part you
                touched, a fraction of the work. The cost is that the taster now has to keep notes about the last good
                version — more setup for more speed.
              </p>
            </>
          }
          student={
            <>
              <p>
                Building every model on every PR is correct but does not scale — a project with thousands of models
                turns a one-model change into a 40-minute CI run.{' '}
                <GlossaryTerm k="slim-ci">Slim CI</GlossaryTerm> builds only the models that changed and their
                downstream dependents, using dbt&apos;s state comparison: <code>dbt build --select state:modified+</code>{' '}
                selects modified models (and the <code>+</code> pulls in everything downstream of them).
              </p>
              <p>
                &quot;Modified relative to what?&quot; is answered by a saved <code>manifest.json</code> — a snapshot of
                the project&apos;s state from the last successful production run, downloaded as a build artifact. dbt
                compares your PR against it to compute the diff. The companion flag is{' '}
                <GlossaryTerm k="defer">--defer</GlossaryTerm>: unchanged upstream models are not rebuilt in CI but{' '}
                <em>referenced</em> from production, so a changed model can still join to its parents without rebuilding
                the whole lineage. Modified-plus-defer is the standard slim-CI recipe.
              </p>
              <CodeBlock
                label="slim CI: build only what changed, defer the rest to prod"
                code={`# 'prod-run-artifacts/' holds the manifest.json from the last good production run.
uv run --with dbt-duckdb dbt build \\
  --select state:modified+ \\
  --defer \\
  --state prod-run-artifacts/`}
              />
            </>
          }
          phd={
            <>
              <p>
                Slim CI is incremental verification: the correctness argument is that a model&apos;s behaviour can only
                change if the model itself or one of its ancestors changed, so <code>state:modified+</code> (modified
                nodes and their transitive descendants) is a sound over-approximation of the affected set — it never
                skips a model that could have broken. It relies on the deferred upstreams in production being valid,
                which holds precisely because your protected main guarantees it. The state comparison is a graph diff
                over the two manifests: node fingerprints (compiled SQL, config, and — depending on flags — upstream
                schema) determine <code>modified</code>.
              </p>
              <p>
                The frontier is managing the artifact and the ephemeral compute. The manifest is a build artifact you
                must publish from production and retrieve in CI (an availability dependency: no prior artifact means no
                state comparison, so the first run degrades to full build). On a shared warehouse, isolation forces
                per-PR ephemeral schemas created and torn down per run; matrix builds fan the job across
                warehouse/adapter/Python versions for compatibility coverage. The trade is stark and worth stating
                plainly: slim CI turns an O(all models) run into O(changed subgraph), often 10-50x faster, at the cost of
                real orchestration complexity — artifact plumbing, deferral config, ephemeral-environment lifecycle —
                that a small project simply should not pay for.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Full-refresh CI, slim CI, or no CI?">
        <p>
          How much verification to automate is a real decision, and the right answer moves as a project grows. The axis
          is speed and simplicity versus coverage and cost:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Full-refresh CI (build everything on every PR)',
              strengths: [
                'Dead simple: one dbt build command, no state or artifacts to manage',
                'Maximum coverage — every model and test runs, nothing is skipped',
                'No dependency on a prior production run existing',
              ],
              weaknesses: [
                'CI time grows with the whole project, not the change — slow and costly at scale',
                'A one-line edit pays for a full-project build; wait times breed pressure to skip CI',
              ],
              chooseWhen: 'small-to-medium projects (up to a few hundred models) and especially embedded engines like DuckDB where a full build is still fast and free.',
            },
            {
              name: 'Slim / stateful CI (state:modified+ with --defer)',
              strengths: [
                'CI time scales with the size of the change, not the project — often 10-50x faster',
                'Cheap on metered warehouses: you build a subgraph, not everything',
                'Keeps CI fast enough that nobody is tempted to bypass it',
              ],
              weaknesses: [
                'Real setup cost: publish and retrieve manifest artifacts, configure deferral, manage ephemeral schemas',
                'Depends on a prior good production run existing; the first/broken-state run falls back to full build',
                'More moving parts to debug when CI itself misbehaves',
              ],
              chooseWhen: 'large projects, metered/shared warehouses, or any team where full-build CI has grown slow enough to hurt.',
            },
            {
              name: 'No CI (rely on local runs and review)',
              strengths: [
                'Zero setup, zero wait — ship as fast as you can type',
                'Fine for a solo throwaway or a one-off exploration',
              ],
              weaknesses: [
                'Nothing stops a broken model or failing test from reaching main and everyone downstream',
                'Relies entirely on discipline; reviewers cannot actually execute the diff they approve',
                'Regressions are found in production, the most expensive place to find them',
              ],
              chooseWhen: 'a solo experiment or a repo nobody depends on — essentially never once a second person or a downstream consumer exists.',
            },
          ]}
          note={
            <>
              The honest progression: start with full-refresh CI the day a second person or a consumer appears (the
              setup is one YAML file and it is the highest-leverage automation you will add), and migrate to slim CI only
              when full builds have grown slow enough to actually hurt. Reaching for slim CI on a fifty-model DuckDB
              project is premature optimisation — you pay the artifact-and-deferral complexity for a build that was
              already fast.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: wire dbt CI onto your GitHub repo">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will add a GitHub Actions workflow that runs <code>dbt build</code> on every pull request, watch it go
              green, then deliberately break a test and watch it go red. This uses the GitHub repo you created in 0.1.2
              and a dbt+DuckDB project like the one from 3.6. Because Actions runs on GitHub&apos;s servers, your
              checkpoints are what appears in the repo&apos;s <strong>Actions</strong> tab and the check status on the
              PR — not local output.
            </p>
          }
          steps={[
            {
              title: 'Add the workflow file to your dbt project repo',
              body: (
                <>
                  <p>
                    In your dbt project (a git repo with a remote on GitHub), create the folders and the workflow file.
                    Paste the workflow from this lesson into <code>.github/workflows/dbt-ci.yml</code>, and make sure
                    your <code>profiles.yml</code> has the <code>ci</code> target shown above.
                  </p>
                  <CodeBlock
                    label="powershell — create the workflow folder + file"
                    code={`cd C:\\de-lab\\your-dbt-project
New-Item -ItemType Directory -Force .github\\workflows
New-Item -ItemType File -Force .github\\workflows\\dbt-ci.yml
# open dbt-ci.yml in VS Code and paste the workflow from this lesson
code .github\\workflows\\dbt-ci.yml`}
                  />
                </>
              ),
              checkpoint: (
                <>
                  <code>.github\workflows\dbt-ci.yml</code> exists and contains the YAML. YAML is whitespace-sensitive —
                  2-space indents, no tabs. VS Code shows no red squiggles in the file.
                </>
              ),
            },
            {
              title: 'Commit on a branch and push',
              body: (
                <p>
                  CI triggers on a pull request, so put this on a branch rather than committing straight to main
                  (recall branching from 0.1.2).
                </p>
              ),
              commands: [
                {
                  ps: 'git checkout -b ci/add-dbt-ci\ngit add .github/workflows/dbt-ci.yml profiles.yml\ngit commit -m "ci: run dbt build on every PR"\ngit push -u origin ci/add-dbt-ci',
                  label: 'branch, commit, push',
                },
              ],
              checkpoint: (
                <>
                  <code>git push</code> succeeds and prints a link to open a pull request for{' '}
                  <code>ci/add-dbt-ci</code>. Nothing has run yet — the workflow triggers when the PR opens.
                </>
              ),
            },
            {
              title: 'Open the PR and watch CI run',
              body: (
                <p>
                  Open the pull request (click the link from the push, or use the GitHub UI). GitHub reads
                  <code>dbt-ci.yml</code>, provisions a runner, and runs the job. Open the repo&apos;s{' '}
                  <strong>Actions</strong> tab and click into the running <code>dbt-ci</code> workflow to watch the
                  steps stream.
                </p>
              ),
              checkpoint: (
                <>
                  Under <strong>Actions</strong>, a <code>dbt-ci</code> run appears for your PR. Each step (checkout,
                  install uv, dbt deps, dbt build) turns green in turn, and the PR shows a green{' '}
                  <strong>All checks have passed</strong>. If it is red, click the failed step&apos;s logs — the error is
                  the same one <code>dbt build</code> would print locally.
                </>
              ),
            },
            {
              title: 'Break a test on purpose and watch CI go red',
              body: (
                <>
                  <p>
                    CI is only worth having if it actually catches problems. Add a test you know will fail — an{' '}
                    <code>accepted_values</code> test listing a value that does not exist in the data — commit it to the
                    same branch, and push. CI re-runs automatically.
                  </p>
                  <RevealSolution label="Reveal a test guaranteed to fail">
                    <CodeBlock
                      label="models/schema.yml — add this failing test"
                      code={`models:
  - name: stg_orders
    columns:
      - name: status
        tests:
          - accepted_values:
              values: ['this_value_does_not_exist']`}
                    />
                    <CodeBlock
                      label="powershell — commit and push the break"
                      code={`git add models/schema.yml
git commit -m "test: intentionally failing accepted_values (demo)"
git push`}
                    />
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  A new <code>dbt-ci</code> run starts on the push. The <code>dbt build</code> step fails, the run turns
                  red, and the PR shows <strong>Some checks were not successful</strong> — the merge button is blocked
                  (once branch protection requires the check). You have proven CI stops a bad change from merging.
                </>
              ),
            },
            {
              title: 'Revert the break and go green again',
              body: (
                <p>
                  Remove the failing test (or fix it to list the real status values), commit, and push. CI re-runs and
                  goes green — the normal fix-and-repush loop from the viz.
                </p>
              ),
              commands: [
                {
                  ps: '# delete the failing accepted_values block from schema.yml, then:\ngit add models/schema.yml\ngit commit -m "test: remove demo failing test"\ngit push',
                  label: 'fix and re-push',
                },
              ],
              checkpoint: (
                <>
                  The newest <code>dbt-ci</code> run passes and the PR returns to <strong>All checks have passed</strong>.
                  Optionally set a branch-protection rule (Settings → Branches) requiring the <code>dbt-ci</code>{' '}
                  check, so this gate is enforced, not advisory, on every future PR.
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
              q: 'What does dbt build do that makes it the natural command for data CI?',
              options: [
                'It only compiles SQL without running anything',
                'It runs models AND runs every test, in dependency order, exiting non-zero on any failure',
                'It uploads models to production',
                'It lints the SQL',
              ],
              answer: 1,
              explain: 'dbt build = dbt run + dbt test interleaved in DAG order. A model error or a failing test makes it exit non-zero, so the CI job status directly reflects whether the change is safe to merge.',
            },
            {
              q: 'A GitHub Actions workflow with "on: pull_request" runs when...',
              options: [
                'Every hour on a schedule',
                'A pull request is opened or updated (a new commit is pushed to its branch)',
                'Only when you manually click Run',
                'Code is merged into main',
              ],
              answer: 1,
              explain: 'The pull_request trigger is edge-triggered on PR open and on every subsequent push to the PR branch. That is what makes the fix-and-repush loop automatic. A schedule uses on: schedule (cron); post-merge uses on: push.',
            },
            {
              q: 'Why run dbt build in CI against a fresh DuckDB file (or an ephemeral schema) rather than your dev database?',
              options: [
                'DuckDB is the only database CI supports',
                'So the build is reproducible and isolated — a clean target proves it builds from nothing and cannot collide with other PRs',
                'To make CI slower and more thorough',
                'Because dev databases cannot run tests',
              ],
              answer: 1,
              explain: 'CI must verify the change builds in a clean, declared environment (reproducibility) and must not corrupt or be corrupted by other concurrent runs (isolation). A throwaway DuckDB file gives both for free; a shared warehouse needs per-run ephemeral schemas.',
            },
            {
              q: 'What does dbt build --select state:modified+ do in slim CI?',
              options: [
                'Builds every model in the project',
                'Builds only the models that changed plus everything downstream of them',
                'Builds only models that have never been built',
                'Skips all tests',
              ],
              answer: 1,
              explain: 'state:modified selects models changed relative to a saved manifest; the trailing + adds all downstream dependents. This is a sound over-approximation of what could have broken, so CI time scales with the change, not the whole project.',
            },
            {
              q: 'Slim CI compares your PR against "modified relative to what"? What supplies that baseline?',
              options: [
                'The current dev database schema',
                'A saved manifest.json artifact from the last successful production run',
                'The main branch README',
                'A random previous commit',
              ],
              answer: 1,
              explain: 'dbt computes the diff against a manifest.json snapshot from the last good production run, retrieved as a build artifact. --defer then references unchanged upstreams from prod instead of rebuilding them. No prior artifact means the run falls back to a full build.',
            },
            {
              q: 'You have a 60-model dbt project on DuckDB, two engineers. Which CI approach fits best?',
              options: [
                'No CI — the project is small',
                'Full-refresh CI — one dbt build per PR; the full build is fast and free on DuckDB',
                'Slim CI with manifest artifacts and ephemeral schemas from day one',
                'Manual testing only',
              ],
              answer: 1,
              explain: 'Full-refresh CI is the right first step: one YAML file, maximum coverage, and a 60-model DuckDB build is fast and costs nothing. Slim CI adds artifact and deferral complexity you would not yet benefit from — save it for when full builds grow slow.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What does CI look like for a dbt project, and how does it differ from CI for application code?',
            a: (
              <p>
                The shape is the same — on every pull request, a runner checks out the branch, installs dependencies,
                and runs the verification — but the verification is <code>dbt build</code> (run + test in DAG order)
                against a disposable warehouse target instead of a compile-and-unit-test step. The key data-specific
                concerns are the target and isolation: CI must build against a clean, throwaway warehouse (a fresh
                DuckDB file, or a per-PR ephemeral schema on a shared warehouse) so runs are reproducible and cannot
                corrupt each other. Data CI historically lagged software CI because transformations could only be tested
                against expensive shared warehouses; dbt making SQL into tested, version-controlled code plus embedded
                engines like DuckDB spinning up a warehouse in seconds is what closed the gap.
              </p>
            ),
          },
          {
            q: 'Your dbt CI takes 40 minutes because it rebuilds everything on every PR. How do you speed it up?',
            a: (
              <p>
                Move to slim CI: build only the changed models and their downstream dependents with{' '}
                <code>dbt build --select state:modified+ --defer --state path/to/prod/artifacts</code>. It compares the
                PR against a <code>manifest.json</code> saved from the last successful production run to find what
                changed, and <code>--defer</code> references unchanged upstream models from production instead of
                rebuilding them — so CI time scales with the size of the change, not the project, often 10-50x faster.
                The costs to name: you must publish and retrieve the manifest artifact, configure deferral, and (on a
                shared warehouse) manage per-PR ephemeral schemas, and the first run with no prior artifact falls back to
                a full build. Also order cheap checks (lint/compile) before the build so style failures are instant.
              </p>
            ),
          },
          {
            q: 'Why run tests in CI on a pull request instead of just running them in the scheduled production pipeline?',
            a: (
              <p>
                To shift the moment of discovery left — from after a broken change has run in production to before it can
                merge. CI on the PR catches the regression while it is still isolated on a branch, visible to the author
                and reviewer, and cheap to fix; a failure caught only in the nightly production run has already produced
                bad data and affected downstream consumers, the most expensive place to find it. With branch protection
                requiring the check, main stays continuously deployable because nothing broken can reach it. Scheduled
                production tests are still valuable — they catch source-data drift that no code change triggered — but
                they are the last line of defence, not the first.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>CI runs automatically on every pull request: a runner checks out the branch, installs deps, and runs your verification before the change can merge — moving discovery of breakage left, from production to the PR.</>,
          <>For a data project the verification is <code>dbt build</code> (dbt run + dbt test in dependency order), which exits non-zero on any model error or failing test, so the CI check status directly reflects data quality.</>,
          <>GitHub Actions workflows are YAML under <code>.github/workflows/</code> declaring when (trigger), where (runner), and what (steps). <code>on: pull_request</code> re-runs on every push to the PR branch.</>,
          <>Run CI against a clean, throwaway target — a fresh DuckDB file or a per-PR ephemeral schema — for reproducibility (builds from nothing) and isolation (concurrent PRs cannot corrupt each other).</>,
          <>Slim CI (<code>state:modified+</code> with <code>--defer</code> against a saved manifest) builds only the changed subgraph, scaling CI time with the change instead of the whole project — at the cost of artifact and deferral complexity.</>,
          <>Choose by size: full-refresh CI the moment a second person or consumer appears (one YAML file, highest-leverage automation); slim CI only once full builds have grown slow enough to hurt. No CI is fine only for a solo throwaway.</>,
        ]}
      />
    </>
  )
}
