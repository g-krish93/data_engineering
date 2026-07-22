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

const ID = '1.2.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="&quot;It works on my machine&quot; is a bug in your machine">
        <Tiered
          layman={
            <>
              <p>
                Lend a friend a recipe that says "flour, butter, some chocolate" and they will buy a different flour,
                guess the amounts, and get different cookies. The recipe wasn't wrong — it was <em>incomplete</em>. A
                proper recipe card lists exact brands and amounts: "250 g Brand-X flour, 82%-fat butter, 70% dark
                chocolate". Anyone following it gets the same cookies.
              </p>
              <p>
                This lesson turns your Python code into that recipe card. A <em>project</em> is a folder that declares
                exactly which Python version and which add-on packages (at which versions) it needs — so it behaves the
                same on your laptop, a teammate's laptop, and a server in a data center.
              </p>
            </>
          }
          student={
            <>
              <p>
                In module 1.1 you ran scripts in one <code>python-lab</code> playground. Real code ships as a{' '}
                <strong>project</strong>: a directory with a <code>pyproject.toml</code> manifest (declared
                dependencies), a lockfile (exact resolved versions), and its own{' '}
                <GlossaryTerm k="virtual-environment">virtual environment</GlossaryTerm>. The project is the unit of
                reproducibility: clone the <GlossaryTerm k="repository">repository</GlossaryTerm>, run one sync
                command, get an identical environment.
              </p>
              <p>
                Data engineers care more than most because a <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>{' '}
                runs unattended on a scheduler. If the server resolves different package versions than you tested with,
                the failure appears at 3am in production, not at 3pm in code review. Environment drift breaks pipelines
                with zero code changes — the code stayed still, the environment moved.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Dependency resolution is constraint satisfaction: each requirement like <code>httpx&gt;=0.27</code> is
                a constraint over the version universe, and the resolver must satisfy every package's constraints
                simultaneously, transitively. The general problem embeds SAT; real resolvers use backtracking (pip's
                resolvelib) or PubGrub-style conflict-driven solving (uv). That is why installs can be slow, can fail,
                and can yield <em>different answers on different days</em> as new versions publish.
              </p>
              <p>
                A lockfile removes the solver at install time by recording the resolved closure — every transitive
                dependency, exact version, content hash. Pinning only direct deps is insufficient (a transitive dep can
                ship a breaking release); pinning without hashes is insufficient too (a mirror could serve different
                bytes for the same version — a supply-chain vector). Picture a reproducibility spectrum:{' '}
                <code>requirements.txt</code> loose pins &lt; committed lockfile with hashes &lt; pinned{' '}
                <GlossaryTerm k="container">container</GlossaryTerm> image (adds OS + native libs) &lt; Nix-style
                content-addressed builds (adds the toolchain). This module lives at step two.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="pyproject.toml: the project's contract">
        <Tiered
          layman={
            <>
              <p>
                <code>pyproject.toml</code> is the recipe card — one small text file at the top of the project. It
                answers: what is this project called? Which Python does it need? Which add-ons does it use? What
                commands does it offer? It is TOML: readable by humans and machines alike.
              </p>
              <p>
                The habit that matters: you never install packages "into your computer" anymore. You write them on the
                card, and the card is the truth. Lose the environment? Rebuild it from the card in seconds.
              </p>
            </>
          }
          student={
            <>
              <p>The zones you touch constantly:</p>
              <ul>
                <li>
                  <code>[project]</code> — <code>name</code>, <code>version</code>, <code>requires-python</code>, and{' '}
                  <code>dependencies</code>: packages your code imports at runtime, as version <em>ranges</em>.
                </li>
                <li>
                  <code>[dependency-groups]</code> — the <code>dev</code> group: pytest, ruff, pyright — needed while
                  developing, never shipped, so production stays small with less attack surface.
                </li>
                <li>
                  <code>[project.scripts]</code> — entry points: <code>clean = "realpy.cli:main"</code> means "create a
                  command <code>clean</code> that calls <code>main</code> in module <code>realpy.cli</code>". CLIs by
                  declaration, not path hacks.
                </li>
                <li>
                  <code>[build-system]</code> — which tool makes the folder installable. Generated; rarely edited.
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                <code>pyproject.toml</code> standardized a messy history: metadata (PEP 621) plus build-backend
                declaration (PEP 517/518) in one file, replacing <code>setup.py</code> — arbitrary code execution at
                install time, a reproducibility and security disaster. Declarative metadata is what makes resolution
                analyzable: the resolver reads constraints without executing anything.
              </p>
              <p>
                Note the split between <em>abstract</em> requirements in <code>[project]</code> (ranges — a
                compatibility claim) and <em>concrete</em> ones in the lock (exact pins — a claim about one tested
                artifact set). Libraries publish ranges so consumers' resolvers have room to solve; applications deploy
                from the lock so nothing moves. A pipeline is an application: it deploys from the lock.
              </p>
            </>
          }
        />
        <p>TOML is data, not magic — run this and watch the config become an ordinary dictionary:</p>
        <CodeRunner
          language="python"
          code={`import tomllib

PYPROJECT = """
[project]
name = "realpy"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["httpx>=0.27"]

[project.scripts]
clean = "realpy.cli:main"

[dependency-groups]
dev = ["pytest>=8"]
"""

cfg = tomllib.loads(PYPROJECT)
print(type(cfg))
print("runtime deps:", cfg["project"]["dependencies"])
print("dev deps:    ", cfg["dependency-groups"]["dev"])
print("entry point: ", cfg["project"]["scripts"]["clean"])`}
        />
      </Section>

      <Section kicker="core concepts" title="uv's verbs, the lockfile, and the src layout">
        <Tiered
          layman={
            <>
              <p>Five commands cover almost everything:</p>
              <ul>
                <li><code>uv init</code> — start a project with the recipe card pre-filled.</li>
                <li><code>uv add httpx</code> — write an ingredient on the card <em>and</em> install it.</li>
                <li><code>uv lock</code> — freeze the exact shopping list (every brand, every amount).</li>
                <li><code>uv sync</code> — make your kitchen match the frozen list exactly.</li>
                <li><code>uv run clean</code> — cook, using only this project's kitchen.</li>
              </ul>
              <p>
                The frozen list is <code>uv.lock</code>. Never edited by hand — but saved with your code, because it is
                what lets anyone rebuild your exact setup.
              </p>
            </>
          }
          student={
            <>
              <p>
                <code>uv add</code> edits <code>pyproject.toml</code>, re-resolves, updates <code>uv.lock</code>, and
                installs into <code>.venv</code> — one command keeps all three in agreement (<code>--dev</code> targets
                the dev group). <code>uv sync</code> goes the other way: make <code>.venv</code> match the lock.{' '}
                <code>uv run X</code> implies a sync, then runs <code>X</code> in the environment — you almost never
                activate a venv manually. Commit <code>uv.lock</code>; gitignore <code>.venv</code>, a disposable build
                product.
              </p>
              <p>
                We also adopt the <strong>src layout</strong>: code in <code>src/realpy/</code>, not a top-level{' '}
                <code>realpy/</code>. Not cosmetic: with a flat layout, running Python from the project root imports
                the working-copy folder directly — tests can pass while the installed package is broken. src layout
                forces every import through the installed package, exactly as production does.{' '}
                <code>uv init --package</code> scaffolds all of this.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>uv.lock</code> is a platform-independent resolution: the graph is recorded with environment
                markers so one lockfile serves Windows, macOS, and Linux, and every artifact carries a SHA-256 hash
                verified at install. Contrast <code>pip freeze</code>: one environment, one platform, no hashes, no
                direct-vs-transitive distinction.
              </p>
              <p>
                The src-layout argument is namespace hygiene: Python puts the script's (or current) directory at the
                front of the module search path, so a flat project root <em>shadows</em> installed packages. src layout
                leaves exactly one importable copy — the one the build backend installed — collapsing the gap between
                "works in dev" and "works installed". Next lesson dissects that search path mechanically.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="Speed changes behavior">
          uv resolves and installs orders of magnitude faster than pip. The payoff is not saved seconds — it is that
          rebuilding an environment becomes so cheap you do it casually instead of nursing one fragile venv for months.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Pinning strategy and project layout">
        <Tradeoffs
          options={[
            {
              name: 'Committed lockfile (uv.lock)',
              strengths: ['Transitive deps pinned with hashes — reproducible, tamper-evident installs', 'Upgrades are explicit, reviewable diffs in version control'],
              weaknesses: ['Large machine-written file — conflicts resolved by re-locking, not by hand', 'Tool-specific format: consumers need uv (uv export bridges, one more step)'],
              chooseWhen: 'you deploy the code (apps, pipelines) — which is this entire curriculum.',
            },
            {
              name: 'requirements.txt with loose pins',
              strengths: ['Universal — every tool, tutorial, and CI system understands it', 'Human-readable and hand-editable in seconds'],
              weaknesses: ['Transitive dependencies float — today\'s install differs from last month\'s', 'No hashes by default; "worked yesterday, broken today" with zero code changes'],
              chooseWhen: 'handing a quick script to someone whose tooling you cannot control.',
            },
          ]}
          note={
            <>
              These compose: <code>uv export</code> emits a fully-pinned <code>requirements.txt</code> from the lock.
              The principle is constant — <em>apps pin everything, libraries declare ranges</em>.
            </>
          }
        />
        <Tradeoffs
          options={[
            {
              name: 'src layout',
              strengths: ['Tests run against the installed package — dev matches production', 'Cannot accidentally import the working copy from the project root'],
              weaknesses: ['One extra directory level; more ceremony for tiny experiments', 'Project must actually be installable (build system configured)'],
              chooseWhen: 'the code will be installed anywhere beyond your scratch folder — our default.',
            },
            {
              name: 'Flat layout',
              strengths: ['Zero ceremony — a folder of files you can run immediately', 'Fine for one-off analysis scripts that never ship'],
              weaknesses: ['Current-directory imports mask packaging bugs until deploy day', 'Root accumulates a mix of package code, tests, and configs'],
              chooseWhen: 'throwaway exploration — promote to src layout when it stops being throwaway.',
            },
          ]}
        />
      </Section>

      <Section kicker="hands-on" title="Lab: birth of realpy">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You are creating <strong>realpy</strong> — a small library that cleans messy weather records. Every
              lesson in this module grows it: today the skeleton; later lessons add modules, error design, types,
              tests, and logging. Work in PowerShell.
            </p>
          }
          steps={[
            {
              title: 'Scaffold the project',
              body: (
                <p>
                  <code>--package</code> tells uv you are building an installable package (src layout + build system),
                  not a loose script folder:
                </p>
              ),
              commands: [{ ps: 'cd C:\\de-lab\nuv init --package realpy\ncd realpy\nGet-Content pyproject.toml' }],
              checkpoint: (
                <>
                  <code>Get-ChildItem -Recurse -Name</code> shows <code>pyproject.toml</code> and{' '}
                  <code>src\realpy\__init__.py</code> (src layout — the package lives one level down), and the printed
                  TOML has a <code>[project]</code> zone plus a <code>[project.scripts]</code> entry pointing at{' '}
                  <code>realpy:main</code>.
                </>
              ),
            },
            {
              title: 'Banner + entry point named clean',
              body: (
                <>
                  <p>
                    Open the project (<code>code .</code>). Replace <code>src\realpy\__init__.py</code> with:
                  </p>
                  <CodeBlock
                    label="python — src/realpy/__init__.py"
                    code={`"""realpy: clean messy weather records."""

__version__ = "0.1.0"


def main() -> None:
    print("realpy " + __version__ + " - cleaning messy weather records")`}
                  />
                  <p>
                    Then rename the script in <code>pyproject.toml</code> so the command is <code>clean</code>:
                  </p>
                  <CodeBlock
                    label="toml — pyproject.toml (section)"
                    code={`[project.scripts]
clean = "realpy:main"`}
                  />
                </>
              ),
              checkpoint: <>Both files saved; the only script entry is <code>clean = "realpy:main"</code>.</>,
            },
            {
              title: 'Run it',
              commands: [{ ps: 'uv run clean' }],
              checkpoint: (
                <>
                  Prints <code>realpy 0.1.0 - cleaning messy weather records</code>; <code>uv.lock</code> and{' '}
                  <code>.venv</code> now exist — one command resolved, locked, synced, and executed.
                </>
              ),
            },
            {
              title: 'Add a dev dependency',
              body: <p>Add the ruff linter to the dev group — used while developing, never shipped:</p>,
              commands: [{ ps: 'uv add --dev ruff\nuv run ruff --version' }],
              checkpoint: (
                <>
                  A version prints, and <code>pyproject.toml</code> gains <code>[dependency-groups]</code> listing ruff
                  — while <code>[project] dependencies</code> stays empty.
                </>
              ),
            },
            {
              title: 'Prove the environment is disposable',
              body: <p>Delete the venv entirely, rebuild from the lock — the recipe-card idea made real:</p>,
              commands: [{ ps: 'Remove-Item -Recurse -Force .venv\nuv sync\nuv run clean' }],
              checkpoint: (
                <>
                  The banner prints again. You destroyed the environment and rebuilt it in seconds from{' '}
                  <code>pyproject.toml</code> + <code>uv.lock</code>. Environments are cattle, not pets.
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
              q: 'What is the division of labor between pyproject.toml and uv.lock?',
              options: [
                'pyproject.toml is for uv; uv.lock is for pip',
                'pyproject.toml declares intent (ranges); uv.lock records exact resolved versions and hashes',
                'Two formats of the same information, kept for compatibility',
                'pyproject.toml pins exact versions; uv.lock stores loose ranges',
              ],
              answer: 1,
              explain:
                'You edit intent (dependency ranges) in pyproject.toml; the resolver computes one concrete answer — every transitive package, exact version, hash — into uv.lock. Both are committed; only one is hand-edited.',
            },
            {
              q: 'Why must a lockfile pin transitive dependencies, not just the packages you asked for?',
              options: [
                'Transitive packages are larger and slower to download',
                'A transitive dep can release a breaking version, changing behavior with zero changes to your code or pins',
                'Python refuses to import unpinned packages',
                'It makes pyproject.toml shorter',
              ],
              answer: 1,
              explain:
                'You depend on the whole closure, not just its surface. If pandas depends on numpy and numpy ships a breaking release, loose pins pull it in silently. Locks freeze the entire graph.',
            },
            {
              q: 'What does the src layout protect you from?',
              options: [
                'Accidentally committing secrets',
                'Tests importing the working-copy folder directly, hiding packaging bugs until deployment',
                'Slow dependency resolution',
                'Merge conflicts in uv.lock',
              ],
              answer: 1,
              explain:
                'With a flat layout the project root is on the module search path, so imports hit the working copy even when the installed package is broken. src layout forces imports through the installed package — dev behaves like production.',
            },
            {
              q: 'Where do pytest and ruff belong, and why?',
              options: [
                'In [project] dependencies, so production can run tests too',
                'In the dev dependency group — needed for development, excluded from deployed environments',
                'Installed globally with pip so all projects share them',
                'In [build-system] requires',
              ],
              answer: 1,
              explain:
                'Production environments should contain exactly what the code imports at runtime — smaller, faster, less attack surface. Global installs recreate the shared-environment problem projects exist to solve.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How do you make a Python deployment reproducible?',
            a: (
              <p>
                Declare direct dependencies as ranges in <code>pyproject.toml</code>, commit a lockfile pinning the
                full transitive closure with hashes, install from the lock in CI and production. Strong answers add the
                next rungs: a pinned container image freezes OS and native libs too; hash verification protects against
                a compromised index. "We pin versions in requirements.txt" is partial — probe transitive deps and
                hashes.
              </p>
            ),
          },
          {
            q: 'Libraries vs applications — how does dependency pinning differ?',
            a: (
              <p>
                Libraries publish compatible <em>ranges</em> so consumers' resolvers can find a joint solution across
                many libraries; exact-pinning a library causes unsolvable conflicts downstream. Applications — and data
                pipelines are applications — deploy from an exact lock, because nothing installs on top of them and
                determinism beats flexibility.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A project is the unit of reproducibility: <code>pyproject.toml</code> (intent) + <code>uv.lock</code> (exact resolution) + a disposable <code>.venv</code>.</>,
          <>Five uv verbs: <code>init</code>, <code>add</code>, <code>lock</code>, <code>sync</code>, <code>run</code> — and <code>run</code> syncs for you.</>,
          <>Lockfiles must pin <em>transitive</em> deps with hashes; pinning only direct deps still drifts.</>,
          <>Runtime deps and dev tools live in separate groups; production installs only the former.</>,
          <>src layout + <code>[project.scripts]</code>: imports go through the installed package, and CLIs are declared, not path-hacked.</>,
          <>Environments are cattle: delete <code>.venv</code> freely — <code>uv sync</code> rebuilds it.</>,
        ]}
      />
    </>
  )
}
