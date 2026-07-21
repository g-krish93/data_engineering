import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { DataJourney } from '../../../viz/DataJourney'

const ID = '0.1.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="the world you're entering" title="What data engineering actually is">
        <DataJourney caption="Hover the three stations. Raw records (amber) leave source systems, get cleaned at the pipeline gate (cyan), and land organized in analytical storage (violet). Everything in this curriculum is about making that flow reliable, fast, and cheap." />
        <Tiered
          layman={
            <>
              <p>
                Think of a restaurant. Ingredients arrive messy — sacks of potatoes, crates of fish, whatever
                suppliers dropped off. Nobody cooks straight out of the delivery truck. A kitchen crew washes,
                chops, sorts, and stores everything so that when a chef needs “two cups of diced onion,” it’s
                <em> right there</em>.
              </p>
              <p>
                A <GlossaryTerm k="data-pipeline">data pipeline</GlossaryTerm> is that kitchen crew, but for
                information. Companies produce messy raw records all day — orders, clicks, sensor readings. Data
                engineers build the automated systems that collect, clean, and organize them so analysts and apps
                can instantly answer questions like “how did sales do last month?”. You are learning to build
                those systems.
              </p>
            </>
          }
          student={
            <>
              <p>
                Data engineering is the discipline of building reliable, automated systems that move data from
                where it is <em>produced</em> (application databases, APIs, event streams) to where it is{' '}
                <em>useful</em> (<GlossaryTerm k="data-warehouse">warehouses</GlossaryTerm>,{' '}
                <GlossaryTerm k="data-lake">lakes</GlossaryTerm>, ML feature stores, dashboards) — transforming
                it along the way. The three recurring problems: <strong>correctness</strong> (no lost or
                duplicated records — you will hear the word{' '}
                <GlossaryTerm k="idempotency">idempotency</GlossaryTerm> constantly), <strong>scale</strong>{' '}
                (gigabytes today, terabytes later), and <strong>cost</strong> (compute and storage are billed by
                the hour and the byte).
              </p>
              <p>
                Your workstation is where all of it happens: you will write pipeline code in an editor, run
                engines in containers, and drive everything from a terminal. Setting it up properly today saves
                hours of “works on my machine” pain later.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Formally, most of this field reduces to building and operating <em>dataflow systems</em>:
                directed acyclic graphs of transformations over unbounded or batched datasets, with correctness
                constraints (exactly-once <em>effects</em>, ordering, consistency between derived views and
                sources of truth) and resource constraints (I/O bandwidth, memory hierarchies, dollars). The
                interesting theory — log-structured storage, consensus, incremental view maintenance, columnar
                execution — arrives in Phases 4–8, and by Phase 8 you will implement toy versions of these
                engines yourself.
              </p>
              <p>
                Today’s concern is mundane but foundational: a <em>reproducible environment</em>. Nearly every
                environment bug you will ever hit is a violation of hermeticity — some implicit dependency on
                global machine state (a system Python, a PATH entry, an unpinned package). The tools you install
                today (per-project virtual environments, containers with pinned images) are progressively
                stronger approximations of hermetic builds.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The four pillars of a DE workstation">
        <Tiered
          layman={
            <>
              <p>Four tools, four jobs:</p>
              <ul>
                <li>
                  <strong>A <GlossaryTerm k="terminal">terminal</GlossaryTerm></strong> — you type commands
                  instead of clicking buttons. Feels old-fashioned; is actually faster, scriptable, and how all
                  real data systems are driven.
                </li>
                <li>
                  <strong>An editor (VS Code)</strong> — where you write code, with helpful hints built in.
                </li>
                <li>
                  <strong>Python, kept in boxes</strong> — each project gets its own private set of Python
                  add-ons (a <GlossaryTerm k="virtual-environment">virtual environment</GlossaryTerm>), so
                  projects can’t break each other.
                </li>
                <li>
                  <strong>Docker</strong> — runs whole systems (databases, message queues) in sealed{' '}
                  <GlossaryTerm k="container">containers</GlossaryTerm> you can start and delete freely, without
                  cluttering your PC.
                </li>
              </ul>
            </>
          }
          student={
            <>
              <ul>
                <li>
                  <strong>Terminal: Windows Terminal + PowerShell.</strong> Every pipeline run, git command, and
                  server you manage happens here. You’ll learn PowerShell properly in module 1.6; for now you
                  copy commands and read output.
                </li>
                <li>
                  <strong>Editor: VS Code</strong> with the Python extension — linting, debugging, and notebook
                  support in one place.
                </li>
                <li>
                  <strong>Python via <code>uv</code>.</strong> uv is a fast{' '}
                  <GlossaryTerm k="package-manager">package manager</GlossaryTerm> that also manages Python
                  versions and per-project <GlossaryTerm k="virtual-environment">virtual environments</GlossaryTerm>.
                  One tool instead of three (pyenv + pip + venv), and it writes a lockfile so an environment can
                  be rebuilt exactly.
                </li>
                <li>
                  <strong>Docker Desktop.</strong> A <GlossaryTerm k="container">container</GlossaryTerm> is a
                  process wrapped in isolation (own filesystem, own network) started from an immutable{' '}
                  <GlossaryTerm k="image">image</GlossaryTerm>. From Phase 2 on, every database and engine
                  (Postgres, MinIO, Kafka, Spark) runs this way — version-pinned, disposable, identical on any
                  machine.
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                The pillar worth understanding deeply is the isolation ladder. A virtual environment isolates
                only the Python package namespace — it shares the OS, filesystem, and native libraries, so it’s
                the weakest form. A container isolates the userspace: Linux namespaces (pid, net, mnt) plus
                cgroups for resources, sharing only the kernel. On Windows, Docker Desktop runs containers
                inside a lightweight WSL2 utility VM — so your containers are genuinely Linux, which is exactly
                what production will be. Full VMs isolate the kernel too; hermetic build systems (Nix, Bazel)
                attack the problem from the other side by making <em>inputs</em> content-addressed.
              </p>
              <p>
                Practical corollary: “it works in the container” is a far stronger statement than “it works in
                my venv” — and CI (Phase 3) will exploit exactly that.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="OneDrive and this repo">
          This repository currently lives inside OneDrive. Sync daemons fight anything that writes thousands of
          small files fast — <code>node_modules</code>, database volumes, datasets. Those are gitignored here,
          and labs will always write data to gitignored <code>data/</code> folders or Docker named volumes.
          Before Phase 4 (tens-of-GB datasets), plan to move the repo to something like <code>C:\repos\</code>.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Why uv (and what you gave up)">
        <p>
          Nothing in this curriculum is “the answer” — every tool is a position in a trade-off space. Here is
          the first one: how to manage Python itself.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'uv',
              strengths: [
                'One tool: Python versions, venvs, packages, lockfiles',
                '10–100x faster resolver than pip',
                'Lockfile means exactly reproducible installs',
              ],
              weaknesses: [
                'Young tool — conventions still settling',
                'Some tutorials/teams still assume pip, so you must know the mapping',
              ],
              chooseWhen: 'you control the project and want speed plus reproducibility (that’s us).',
            },
            {
              name: 'pip + venv',
              strengths: [
                'Ships with Python — zero install, universal in docs and CI',
                'The lingua franca every Python dev knows',
              ],
              weaknesses: [
                'Slow resolver; no built-in lockfile (needs pip-tools)',
                'Doesn’t manage Python versions at all',
              ],
              chooseWhen: 'you’re on a machine or team where installing new tooling isn’t an option.',
            },
            {
              name: 'conda / mamba',
              strengths: [
                'Handles non-Python native deps (GDAL, MKL) well',
                'Dominant in scientific computing',
              ],
              weaknesses: [
                'Heavy; slow; two package ecosystems (conda + pip) that can conflict',
                'Environment drift is common in practice',
              ],
              chooseWhen: 'you need compiled scientific stacks that pip wheels don’t cover.',
            },
          ]}
          note={
            <>
              Interview vocabulary: whichever tool, the <em>concepts</em> are constant — interpreter version,
              dependency resolution, lockfile, environment isolation. Name the concept, not just the brand.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: build the workstation">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Run each step in <strong>Windows Terminal (PowerShell)</strong>. Every step ends in a checkpoint —
              an observable proof it worked. Don’t tick the box until you saw the proof with your own eyes;
              that habit is the whole point of this curriculum’s labs.
            </p>
          }
          steps={[
            {
              title: 'Confirm your shell',
              body: (
                <p>
                  Open Windows Terminal (install it from the Microsoft Store if missing) and check the
                  PowerShell version:
                </p>
              ),
              commands: [{ ps: '$PSVersionTable.PSVersion' }],
              checkpoint: (
                <>
                  A version table prints (5.1 or 7.x are both fine). You know which shell you’re in — that
                  matters every time a tutorial shows bash syntax instead.
                </>
              ),
            },
            {
              title: 'Install VS Code + Python extension',
              body: (
                <p>
                  If you don’t have VS Code yet, install it with winget (Windows’ built-in package manager),
                  then add the Python extension:
                </p>
              ),
              commands: [
                { ps: 'winget install -e --id Microsoft.VisualStudioCode' },
                { ps: 'code --install-extension ms-python.python' },
              ],
              checkpoint: (
                <>
                  <code>code --version</code> prints a version. (Open a new terminal first so PATH refreshes.)
                </>
              ),
            },
            {
              title: 'Install uv',
              commands: [
                { ps: 'winget install -e --id astral-sh.uv', label: 'PowerShell (winget)' },
              ],
              checkpoint: (
                <>
                  In a <em>new</em> terminal, <code>uv --version</code> prints a version number.
                </>
              ),
            },
            {
              title: 'Create your first isolated Python project',
              body: (
                <p>
                  This creates a scratch project with its own virtual environment — Python without touching
                  the rest of your machine:
                </p>
              ),
              commands: [
                {
                  ps: 'mkdir ~\\de-scratch; cd ~\\de-scratch\nuv init\nuv run python -c "print(\'hello, data\')"',
                },
              ],
              checkpoint: (
                <>
                  <code>hello, data</code> prints, and <code>uv run python --version</code> shows the pinned
                  interpreter. Note the <code>.venv</code> folder uv created — that’s the isolation box.
                </>
              ),
            },
            {
              title: 'Verify Docker Desktop',
              body: (
                <p>
                  Install Docker Desktop from docker.com if you haven’t (accept the WSL2 backend during setup),
                  start it, then run the canonical smoke test:
                </p>
              ),
              commands: [{ ps: 'docker run hello-world' }],
              checkpoint: (
                <>
                  Output includes <code>Hello from Docker!</code>. That one line proves the engine pulled an{' '}
                  image, created a container, ran it, and streamed its output — the full lifecycle you’ll use
                  for every database in this course.
                </>
              ),
            },
            {
              title: 'Prepare a home for lab data (outside OneDrive)',
              commands: [{ ps: 'mkdir C:\\de-lab' }],
              checkpoint: (
                <>
                  <code>C:\de-lab</code> exists. Datasets and database volumes in later phases go here — never
                  into OneDrive-synced folders.
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
              q: 'Why does each Python project get its own virtual environment?',
              options: [
                'Virtual environments make Python code run faster',
                'So each project pins its own package versions without breaking other projects',
                'Python cannot import packages without one',
                'It encrypts your dependencies',
              ],
              answer: 1,
              explain:
                'Isolation is the whole point: project A can use pandas 2.2 while project B stays on 1.5, and deleting a project leaves no residue on your machine.',
            },
            {
              q: 'What is the relationship between a Docker image and a container?',
              options: [
                'They are two words for the same thing',
                'An image is a running container that has been paused',
                'A container is a running instance started from an immutable image',
                'Images run on Windows, containers on Linux',
              ],
              answer: 2,
              explain:
                'The image is the frozen template (like a class); the container is a live instance of it (like an object). You can start many identical containers from one image.',
            },
            {
              q: 'Why will this curriculum run Postgres, Kafka, and Spark in containers rather than installing them on Windows?',
              options: [
                'They have no Windows installers',
                'Containers are always faster than native installs',
                'Version-pinned, disposable, Linux-identical environments that match production',
                'Docker is required by their licenses',
              ],
              answer: 2,
              explain:
                'Pinned image versions make labs reproducible; deleting a container leaves the machine clean; and production data infrastructure runs on Linux — which is exactly what Docker gives you on Windows.',
            },
            {
              q: 'A tutorial’s command fails in your terminal with a syntax error, but looks correct. The most likely boring cause?',
              options: [
                'Your computer is too old',
                'The command is bash syntax and you are in PowerShell (or vice versa)',
                'Python is not installed',
                'You need administrator rights',
              ],
              answer: 1,
              explain:
                'Shell mismatch is the #1 beginner time-sink on Windows. This curriculum always labels commands PowerShell-first, with bash variants when they differ.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Why do Python projects use virtual environments?',
            a: (
              <p>
                Because Python resolves imports from a shared environment: two projects needing different
                versions of the same library would conflict. A venv gives each project its own site-packages,
                pinned in a lockfile, so environments are reproducible and disposable. Strong answers mention
                the lockfile — isolation without pinning still drifts.
              </p>
            ),
          },
          {
            q: 'Container vs virtual machine — what’s the practical difference?',
            a: (
              <p>
                A VM virtualizes hardware and boots its own kernel; a container is just an isolated process
                sharing the host kernel via namespaces and cgroups. Containers therefore start in milliseconds
                and cost megabytes, which is why we can casually run five data systems on a laptop — the
                trade-off is weaker isolation than a VM (shared kernel).
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            Data engineering = automated, reliable, affordable movement and reshaping of data from sources to
            analytical storage.
          </>,
          <>
            The workstation has four pillars: terminal, editor, isolated Python (uv), containers (Docker).
          </>,
          <>
            Reproducibility is the underlying principle — venvs and pinned container images are increasingly
            strong versions of the same idea.
          </>,
          <>Every lab ends with an observable checkpoint. Never tick a box you didn’t see proven.</>,
          <>Keep heavy data out of OneDrive: gitignored <code>data/</code> folders and named volumes.</>,
        ]}
      />
    </>
  )
}
