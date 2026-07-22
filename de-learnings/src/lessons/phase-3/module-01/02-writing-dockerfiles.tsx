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
import { ContainerLayers } from '../../../viz/ContainerLayers'

const ID = '3.1.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The recipe that turns your code into a shippable image">
        <p>
          In 3.1.1 you <em>pulled</em> images other people built and watched their layers cache and disappear. Now you
          write your own. A <GlossaryTerm k="dockerfile">Dockerfile</GlossaryTerm> is the ordered list of instructions
          Docker follows to bake your pipeline into an <GlossaryTerm k="image">image</GlossaryTerm> — one artifact that
          runs the same on your laptop, in CI, and on a server. Every instruction you write becomes a layer, so the
          instructions you choose and the <em>order</em> you put them in decide your build speed and your image size.
        </p>
        <Tiered
          layman={
            <>
              <p>
                A Dockerfile is a recipe card, and the kitchen follows it top to bottom without improvising. &quot;Start
                from this pre-stocked pantry. Move to this counter. Bring in the ingredients. Cook them. Here is the dish
                to serve when someone orders.&quot; Write the steps in a sensible order and the kitchen can reuse
                yesterday&apos;s prep; write them in a silly order and it re-chops every onion every time.
              </p>
              <p>
                There is a second trick you will learn today: when you finish cooking, you do not ship the whole kitchen —
                the flour sacks, the mixing bowls, the peelings. You plate <em>only the finished dish</em> and send that.
                A big messy kitchen produced it, but the customer receives something small and clean.
              </p>
            </>
          }
          student={
            <>
              <p>
                A Dockerfile is a plain-text file (literally named <code>Dockerfile</code>, no extension) of instructions,
                one per line, each in <code>UPPERCASE</code> by convention. <code>docker build</code> reads it top to
                bottom, runs each instruction, and commits the filesystem change it produced as a layer. The result is a
                named image you can <code>run</code>, <code>push</code>, and share.
              </p>
              <p>
                Two skills separate a working Dockerfile from a good one. First, ordering instructions so the layer cache
                (3.1.1) actually helps you — least-changing at the top, your code at the bottom. Second, keeping the final
                image small, because a 1.2 GB image is slow to push, slow to pull, and carries compilers and headers an
                attacker would love. Both come down to understanding what each instruction does to the layer stack.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A Dockerfile is a specification compiled into a build graph. The modern builder,{' '}
                <GlossaryTerm k="buildkit">BuildKit</GlossaryTerm>, parses the whole file into a DAG of steps, so
                independent stages run in parallel and only the steps reachable from the requested target are executed. It
                is closer to a build system (Make, Bazel) than a shell script: declarative targets, content-addressed
                caching, and pruning of unused work.
              </p>
              <p>
                The instruction set is small but semantically loaded — <code>CMD</code> versus <code>ENTRYPOINT</code>,
                exec versus shell form, <code>ARG</code> versus <code>ENV</code> — and each choice changes runtime
                behavior (signal delivery to PID 1), cache behavior, or reproducibility. This lesson treats the Dockerfile
                as an interface contract with the runtime, not as a list of commands that happen to work.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The core instructions, one job each">
        <p>
          There are about a dozen instructions and you will use seven constantly. Here is a complete little Dockerfile;
          every line is one of them:
        </p>
        <CodeBlock
          label="Dockerfile"
          code={`FROM python:3.13-slim          # 1. base image every later layer sits on
WORKDIR /app                   # 2. cd into (and create) /app for all that follows
ENV PYTHONUNBUFFERED=1         # 3. a runtime env var: logs flush immediately
COPY requirements.txt .        # 4. bring the dep list into the image
RUN pip install --no-cache-dir -r requirements.txt   # 5. run a command at BUILD time
COPY . .                       # 6. bring in the application code (changes most)
EXPOSE 8000                    # 7. document the port the app listens on
CMD ["python", "app.py"]       # 8. the default command at RUN time`}
        />
        <Tiered
          layman={
            <>
              <p>
                Read it like recipe steps. <strong>FROM</strong> picks the pantry you start from. <strong>WORKDIR</strong>{' '}
                is &quot;work at this counter&quot;. <strong>COPY</strong> carries ingredients from your kitchen into the
                image. <strong>RUN</strong> is a step done <em>while cooking</em> (installing libraries), and its result
                is baked in. <strong>ENV</strong> pins a setting on the wall. <strong>EXPOSE</strong> is a note on the
                door saying &quot;orders come in on window 8000&quot;. <strong>CMD</strong> is &quot;when someone orders,
                do this&quot;.
              </p>
              <p>
                The big mental split: some steps happen <em>while building</em> the image (RUN, COPY) and are frozen in.
                One step, CMD, does nothing at build time — it just records what to do later, when the image is actually
                run. Building the cake versus the instruction &quot;now serve a slice&quot;.
              </p>
            </>
          }
          student={
            <>
              <ul>
                <li>
                  <strong>FROM</strong> — the <GlossaryTerm k="base-image">base image</GlossaryTerm> every later layer
                  builds on. Always first (after optional <code>ARG</code>s). Pin it: <code>python:3.13-slim</code>, not{' '}
                  <code>python</code>.
                </li>
                <li>
                  <strong>WORKDIR /app</strong> — sets the working directory for every following <code>RUN</code>,{' '}
                  <code>COPY</code>, and <code>CMD</code>, creating it if absent. Use it instead of{' '}
                  <code>RUN cd /app</code> (which does not persist across layers).
                </li>
                <li>
                  <strong>COPY src dst</strong> — copies from the build context (next section) into the image. Prefer{' '}
                  <code>COPY</code> over <code>ADD</code>; <code>ADD</code> also unpacks tarballs and fetches URLs, which
                  is surprising — reach for it only when you specifically want those.
                </li>
                <li>
                  <strong>RUN cmd</strong> — executes a command <em>at build time</em> and commits the result as a layer.
                  This is where <code>pip install</code> and <code>apt-get</code> live.
                </li>
                <li>
                  <strong>ENV KEY=val</strong> — sets an{' '}
                  <GlossaryTerm k="environment-variable">environment variable</GlossaryTerm> baked into the image and
                  present at run time. <strong>ARG</strong> (below) differs: build-time only.
                </li>
                <li>
                  <strong>EXPOSE 8000</strong> — pure documentation of the port the process listens on. It does{' '}
                  <em>not</em> publish anything; you still need <code>-p</code> at <code>docker run</code>.
                </li>
                <li>
                  <strong>CMD</strong> / <strong>ENTRYPOINT</strong> — what runs when the container starts. Its own
                  section below, because the distinction matters.
                </li>
              </ul>
            </>
          }
          phd={
            <>
              <p>
                Instructions split into two classes. Filesystem-mutating ones (<code>RUN</code>, <code>COPY</code>,{' '}
                <code>ADD</code>) each produce a layer blob. Metadata-only ones (<code>ENV</code>, <code>WORKDIR</code>,{' '}
                <code>EXPOSE</code>, <code>CMD</code>, <code>ENTRYPOINT</code>, <code>USER</code>, <code>LABEL</code>)
                write to the image <em>config</em> JSON, not the filesystem, so they are effectively zero-byte layers —
                exactly the <code>0B</code> rows you saw in <code>docker history</code>.
              </p>
              <p>
                <code>ARG</code> versus <code>ENV</code> is a scope-and-leak question. <code>ARG</code> is visible only
                during build and is <em>not</em> present in the running container; <code>ENV</code> persists into runtime
                and shows up in <code>docker inspect</code>. Never pass secrets through either — an <code>ARG</code> still
                lands in the build history/cache, and an <code>ENV</code> lands in the image config. BuildKit&apos;s{' '}
                <code>RUN --mount=type=secret</code> is the correct channel for build-time credentials.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="CMD vs ENTRYPOINT, and exec vs shell form">
        <p>
          Both <code>CMD</code> and <code>ENTRYPOINT</code> say what runs when the container starts, and both can be
          written two ways. Getting these confused is the source of &quot;my container exits immediately&quot; and
          &quot;Ctrl-C does nothing&quot; bugs, so pin them down now.
        </p>
        <CodeBlock
          label="Dockerfile — the two forms"
          code={`# exec form (JSON array): no shell, PID 1 is python itself. PREFER THIS.
CMD ["python", "app.py"]

# shell form (bare string): runs as /bin/sh -c "python app.py"
CMD python app.py

# ENTRYPOINT + CMD: ENTRYPOINT is the fixed command, CMD its default args
ENTRYPOINT ["python", "app.py"]
CMD ["--once"]     # default arg; 'docker run img --loop' overrides just this`}
        />
        <Tiered
          layman={
            <>
              <p>
                Think of a coffee machine. <strong>ENTRYPOINT</strong> is the machine itself — it always makes coffee,
                that is what it is. <strong>CMD</strong> is the default cup size printed on the button, which you can
                override by pressing a different button when you start it. If you set only CMD, the whole thing (machine
                and default) is overridable in one go; if you set ENTRYPOINT, the machine is fixed and you only get to
                change the cup size.
              </p>
              <p>
                The &quot;exec vs shell&quot; part is about who is really in charge inside the box. In exec form your
                program is the boss and hears it directly when someone says &quot;stop&quot;. In shell form a little
                middle-manager (a shell) is the boss and your program is its employee — and the middle-manager sometimes
                forgets to pass the &quot;stop&quot; message along, so shutdowns hang.
              </p>
            </>
          }
          student={
            <>
              <p>
                <strong>CMD alone</strong> sets a default command that a <code>docker run image somethingelse</code>{' '}
                completely replaces. <strong>ENTRYPOINT</strong> sets a command that always runs; anything after the image
                name on <code>docker run</code> becomes <em>arguments</em> to it. Combine them: <code>ENTRYPOINT</code>{' '}
                for the fixed executable, <code>CMD</code> for default arguments the user may override. A CLI tool wants
                ENTRYPOINT; a simple &quot;run this script&quot; image is fine with just CMD.
              </p>
              <p>
                <strong>Exec form</strong> (<code>[&quot;python&quot;, &quot;app.py&quot;]</code>, a JSON array) runs your
                program directly as PID 1. <strong>Shell form</strong> (<code>python app.py</code>, a bare string) wraps
                it in <code>/bin/sh -c</code>, so the shell is PID 1 and your program is its child. Prefer exec form:
                shell form breaks signal handling, so <code>docker stop</code> may hang for its 10-second grace period
                before killing your process instead of letting it shut down cleanly.
              </p>
            </>
          }
          phd={
            <>
              <p>
                PID 1 in a container has the kernel semantics of <code>init</code>: it does not get default signal
                handlers, and it is responsible for reaping zombie children. In shell form, <code>sh -c</code> is PID 1
                and typically does <em>not</em> forward <code>SIGTERM</code> to your child, so <code>docker stop</code>{' '}
                (which sends SIGTERM, waits, then SIGKILL) degrades into a hard kill — no graceful flush, no clean
                connection drain. Exec form makes your process PID 1, but then <em>it</em> must handle SIGTERM and reap
                children; for multi-process images people add a tiny init like <code>tini</code> (or{' '}
                <code>docker run --init</code>).
              </p>
              <p>
                ENTRYPOINT/CMD concatenation is defined precisely: the container&apos;s argv is{' '}
                <code>ENTRYPOINT + CMD</code>, where <code>docker run</code> args replace <code>CMD</code>. A common
                pattern is an <code>entrypoint.sh</code> that does setup (wait for a dependency, run migrations) then{' '}
                <code>exec &quot;$@&quot;</code> — the <code>exec</code> matters because it replaces the shell with your
                program so PID 1 is again the real process, restoring signal semantics.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="Default to exec form">
          Write <code>CMD [&quot;python&quot;, &quot;app.py&quot;]</code>, not <code>CMD python app.py</code>. The only
          time you want shell form is when you deliberately need shell features (variable expansion, pipes) in the command
          line — and even then, an explicit <code>[&quot;sh&quot;, &quot;-c&quot;, &quot;...&quot;]</code> is clearer.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Build context and .dockerignore: what actually gets sent">
        <p>
          When you run <code>docker build -t app .</code> that trailing <code>.</code> is the{' '}
          <GlossaryTerm k="build-context">build context</GlossaryTerm> — the directory Docker packages up and hands to
          the builder. <code>COPY</code> can only see files inside it. If that folder is fat, every build is slow and you
          risk baking secrets and junk into your image.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Before the kitchen can cook, you hand it a box of everything it might need. If you dump your <em>entire
                house</em> into that box — old mail, the dog, last year&apos;s taxes — it takes forever to carry in, and
                private things end up on the counter. Instead you pack a small box with just the ingredients. The packing
                list of what to leave out is called <code>.dockerignore</code>.
              </p>
              <p>
                It matters more than it sounds. A folder full of downloaded data, virtual environments, and secret keys
                does not just slow the build — some of it can get copied into the dish and shipped to strangers.
              </p>
            </>
          }
          student={
            <>
              <p>
                At build start, Docker sends the whole context to the daemon. Anything huge or irrelevant —{' '}
                <code>.git/</code>, <code>node_modules/</code>, <code>.venv/</code>, gigabytes of <code>data/</code>,{' '}
                <code>__pycache__/</code>, <code>.env</code> — is transferred for nothing, and a careless{' '}
                <code>COPY . .</code> can bake it into a layer. A <GlossaryTerm k="dockerignore">.dockerignore</GlossaryTerm>{' '}
                file (same glob syntax as <code>.gitignore</code>) keeps those out of the context entirely:
              </p>
              <CodeBlock
                label=".dockerignore"
                code={`.git
.venv
__pycache__/
*.pyc
data/
.env
*.parquet
Dockerfile
.dockerignore`}
              />
              <p>
                Two payoffs: builds get faster because less is transferred and hashed, and <code>COPY . .</code> becomes
                safe because the sensitive and heavy paths are invisible to it. This is the direct fix for the &quot;why
                is my tiny app a 900 MB image&quot; surprise — usually a <code>data/</code> or <code>.venv/</code> folder
                rode along.
              </p>
            </>
          }
          phd={
            <>
              <p>
                With the classic builder, the entire context tar is streamed to the daemon before the first instruction
                runs, so context size is pure latency. BuildKit improves this with incremental context transfer and,
                crucially, changes the <code>COPY</code> cache key to a hash of the <em>selected</em> files&apos; contents
                and metadata — but files excluded by <code>.dockerignore</code> are never sent, so they can never bust a
                cache nor leak into a layer regardless of builder.
              </p>
              <p>
                The leak is worse than size because layers are immutable and independently addressable: a secret{' '}
                <code>COPY</code>&apos;d in an early layer and <code>rm</code>&apos;d in a later one is <em>still present
                </em> in the earlier layer&apos;s blob and recoverable from the image. There is no &quot;delete from
                history&quot; short of rebuilding. Keeping secrets out of the context (and using{' '}
                <code>--mount=type=secret</code>) is the only real defense.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Multi-stage builds: ship the dish, not the kitchen">
        <p>
          Many images need heavy tooling to <em>build</em> — compilers, dev headers, build caches — that the running app
          never uses. A <GlossaryTerm k="multi-stage-build">multi-stage build</GlossaryTerm> puts that tooling in one
          stage, then copies only the finished artifacts into a clean, slim final stage. The compilers never ship. Click
          through the two stacks below: the fat builder on the left produced the artifact, but the shipped image on the
          right keeps almost none of it.
        </p>
        <ContainerLayers
          writable={false}
          layers={[
            { label: 'FROM python:3.13 (builder)', detail: 'The FULL Python image — includes compilers, headers, git. Great for building, far too heavy to ship.', mb: 1000 },
            { label: 'RUN apt-get install build-essential', detail: 'gcc, make, C headers — needed to compile some Python wheels. Pure build-time weight.', mb: 400 },
            { label: 'COPY requirements.txt .', detail: 'The dependency list, isolated so pip only reruns when it changes.', mb: 0 },
            { label: 'RUN pip install --target=/install', detail: 'Compiles and installs packages into /install. Leaves behind build caches too.', mb: 260 },
            { label: 'COPY . .', detail: 'Application source, compiled into the builder stage only.', mb: 3 },
          ]}
          caption={
            <>
              <b>Stage 1: the builder (discarded).</b> This whole stack — roughly 1.6 GB of compilers, headers, and
              caches — exists only to produce the installed packages. None of it is shipped. Compare with the final image
              below.
            </>
          }
        />
        <ContainerLayers
          writable={false}
          layers={[
            { label: 'FROM python:3.13-slim (runtime)', detail: 'A minimal Debian + Python, no compilers. The clean base the app actually runs on.', mb: 130 },
            { label: 'WORKDIR /app', detail: 'Metadata-only. Sets the working directory.', mb: 0 },
            { label: 'COPY --from=builder /install /usr/local/lib/...', detail: 'ONLY the built packages are copied over from stage 1. The compilers that made them are left behind.', mb: 60 },
            { label: 'COPY . .', detail: 'Application source code.', mb: 3 },
            { label: 'USER appuser', detail: 'Metadata-only. Drop root: the process runs as an unprivileged user.', mb: 0 },
          ]}
          caption={
            <>
              <b>Stage 2: the shipped image (~195 MB).</b> Built <code>FROM</code> a slim base, it copies only the
              installed packages out of the builder with <code>COPY --from=builder</code>. The 1.6 GB of build tooling is
              gone. Same app, a fraction of the size and attack surface.
            </>
          }
        />
        <Tiered
          layman={
            <>
              <p>
                You bake in a big, messy kitchen full of mixers and flour dust, then you plate one clean slice on a fresh
                dish to send out. The kitchen (stage one) did the hard work; the plate (stage two) carries only the
                result. The customer never sees the mess, and the package they get is small.
              </p>
              <p>
                The magic word is &quot;copy from the other stage&quot;: reach back into the messy kitchen and take
                <em>only</em> the finished dish, nothing else.
              </p>
            </>
          }
          student={
            <>
              <p>
                A multi-stage Dockerfile has more than one <code>FROM</code>. You name a stage (<code>AS builder</code>),
                do all the heavy work there, then start a fresh <code>FROM</code> for the runtime and pull artifacts
                across with <code>COPY --from=builder</code>. Only what you explicitly copy survives into the final image;
                everything else in the builder is discarded.
              </p>
              <CodeBlock
                label="Dockerfile — multi-stage"
                code={`# ---- stage 1: build ----
FROM python:3.13 AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/install -r requirements.txt

# ---- stage 2: runtime ----
FROM python:3.13-slim
WORKDIR /app
ENV PYTHONPATH=/install
COPY --from=builder /install /install   # only the built packages
COPY . .
RUN useradd --create-home appuser
USER appuser
CMD ["python", "app.py"]`}
              />
              <p>
                The final image is <code>FROM python:3.13-slim</code> and never contained a compiler. This is how a
                pipeline that needs <code>gcc</code> to install a package ships without <code>gcc</code> inside it — a
                smaller image, a smaller attack surface, faster pulls.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Each stage is an independent node in BuildKit&apos;s graph. When you build the default (last) target,
                BuildKit walks the dependency edges: a stage is executed only if something the target needs copies from
                it, and independent stages build in parallel. <code>COPY --from</code> can reference a named stage, a
                stage index, or even an external image (<code>COPY --from=nginx:latest ...</code>), making stages a
                general artifact-extraction mechanism.
              </p>
              <p>
                The size win is not just aesthetics — it is supply-chain surface. A shipped compiler, package manager, and
                shell are all tools an attacker can use post-exploit; distroless and slim runtime stages exist to remove
                them. The trade is debuggability (no shell to <code>exec</code> into), which is why the runtime-vs-builder
                split is a deliberate decision, discussed in the trade-offs below.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="Non-root by default">
          Notice the <code>USER appuser</code> near the end. By default a container process runs as <strong>root</strong>{' '}
          inside the container, and if that root escapes isolation it is root-adjacent on the host. Adding a
          non-privileged user and switching to it with <GlossaryTerm k="non-root-user">USER</GlossaryTerm> costs one line
          and removes a whole class of risk. Do it after the steps that need root (installing packages), not before.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="How much kitchen to ship, and which pantry to start from">
        <p>
          Two real decisions every Dockerfile forces. First: single-stage or multi-stage. Second: which base image —
          <code>slim</code>, <code>alpine</code>, or the full image. Neither has a universal winner.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Single-stage build',
              strengths: [
                'Dead simple — one FROM, easy to read and debug',
                'Build tools remain in the image, so you can exec in and diagnose',
                'Perfectly fine when the base needs no compilation (pure-Python deps, prebuilt wheels)',
              ],
              weaknesses: [
                'Ships compilers, headers, and caches you never run — bigger image, bigger attack surface',
                'Slower to push and pull; more to scan and patch',
              ],
              chooseWhen: 'the image is already small, nothing needs compiling, or you are prototyping and simplicity wins.',
            },
            {
              name: 'Multi-stage build',
              strengths: [
                'Final image carries only runtime artifacts — often a fraction of the size',
                'Smaller attack surface: no compilers or build tooling in production',
                'Faster registry pulls and quicker container starts',
              ],
              weaknesses: [
                'More Dockerfile complexity; you must know which artifacts to copy across',
                'The lean runtime may lack a shell/tools, making live debugging harder',
              ],
              chooseWhen: 'building anything that compiles, or any image headed to production where size and surface matter.',
            },
            {
              name: 'Alpine base (musl)',
              strengths: [
                'Tiny base (~5 MB) — the smallest mainstream Linux base',
                'Attractive when raw image size is the top priority',
              ],
              weaknesses: [
                'Uses musl libc, not glibc: some Python wheels have no musl build and must compile from source (slow) or fail',
                'Subtle runtime differences (DNS, locale) and fewer debugging tools; harder to diagnose',
              ],
              chooseWhen: 'you have verified your dependencies work on musl and you truly need the smallest possible image.',
            },
          ]}
          note={
            <>
              For Python data work the pragmatic default is <code>python:3.13-slim</code> (Debian, glibc, prebuilt wheels
              just work) combined with a multi-stage build when something needs compiling. Reach for <code>alpine</code>{' '}
              only after confirming your wheels have musl builds — the musl-vs-glibc gap turns a &quot;smaller image&quot;
              into a source-compilation rabbit hole surprisingly often. The full <code>python:3.13</code> is best kept as
              a <em>builder</em> stage, not a runtime.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: build a pipeline image, then shrink it with multi-stage">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Docker Desktop must be running (<code>docker version</code> shows a Client and a Server). You will write a
              Dockerfile for a tiny Python pipeline, build it, add a <code>.dockerignore</code>, then convert it to a
              multi-stage build and measure the size difference with <code>docker images</code>. Every checkpoint is a
              concrete number or a <code>CACHED</code> line — not &quot;it works&quot;.
            </p>
          }
          steps={[
            {
              title: 'Make the project folder and a 3-line pipeline',
              body: (
                <>
                  <p>
                    Create <code>C:\de-lab\dockerfile-lab</code> with an <code>app.py</code>. It uses one third-party
                    package (<code>requests</code>) so the build actually installs something:
                  </p>
                  <CodeBlock label="app.py" code={`import requests
print("pipeline start")
print("requests version:", requests.__version__)`} />
                  <p>and a <code>requirements.txt</code>:</p>
                  <CodeBlock label="requirements.txt" code={`requests==2.32.3`} />
                </>
              ),
              commands: [
                { ps: 'mkdir C:\\de-lab\\dockerfile-lab\ncd C:\\de-lab\\dockerfile-lab', bash: 'mkdir -p ~/de-lab/dockerfile-lab && cd ~/de-lab/dockerfile-lab' },
              ],
              checkpoint: (
                <>
                  <code>dir</code> (or <code>ls</code>) shows <code>app.py</code> and <code>requirements.txt</code> in the
                  folder. Nothing built yet.
                </>
              ),
            },
            {
              title: 'Write a single-stage Dockerfile and build it',
              body: (
                <>
                  <p>Cache-friendly order: dependencies before code.</p>
                  <CodeBlock
                    label="Dockerfile"
                    code={`FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]`}
                  />
                </>
              ),
              commands: [{ ps: 'docker build -t pipe:v1 .\ndocker run --rm pipe:v1' }],
              checkpoint: (
                <>
                  The build ends <code>naming to ...pipe:v1</code>; running it prints <code>pipeline start</code> and{' '}
                  <code>requests version: 2.32.3</code>. Your pipeline runs inside a container.
                </>
              ),
            },
            {
              title: 'Prove cache order: edit code, rebuild',
              body: (
                <>
                  <p>
                    Change the first print in <code>app.py</code> to <code>print(&quot;pipeline start v2&quot;)</code> and
                    rebuild. Watch which steps say <code>CACHED</code>.
                  </p>
                  <RevealSolution label="What you should see">
                    <p>
                      <code>FROM</code>, <code>WORKDIR</code>, <code>COPY requirements.txt</code>, and the{' '}
                      <code>RUN pip install</code> all report <code>CACHED</code> — the pip install did <em>not</em> rerun,
                      because <code>requirements.txt</code> did not change. Only <code>COPY . .</code> and <code>CMD</code>{' '}
                      rebuild. That is the 3.1.1 ordering rule paying off: a code edit never reinstalls packages.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [{ ps: 'docker build -t pipe:v1 .' }],
              checkpoint: (
                <>
                  The output shows <code>CACHED</code> on the <code>pip install</code> step; only the <code>COPY . .</code>{' '}
                  layer reruns. The rebuild finishes in a second or two, not the original install time.
                </>
              ),
            },
            {
              title: 'Add a .dockerignore and see the context shrink',
              body: (
                <>
                  <p>
                    Simulate junk: create a fake data file and a stray virtual-env folder, then add a{' '}
                    <code>.dockerignore</code> so they never enter the build context.
                  </p>
                  <CodeBlock label=".dockerignore" code={`.venv
__pycache__/
*.pyc
data/
.env
Dockerfile
.dockerignore`} />
                </>
              ),
              commands: [
                { ps: 'mkdir data\nfsutil file createnew data\\big.parquet 50000000\nmkdir .venv', bash: 'mkdir -p data .venv && head -c 50000000 /dev/zero > data/big.parquet', label: 'make junk' },
                { ps: 'docker build -t pipe:v1 .', label: 'rebuild — watch the context size' },
              ],
              checkpoint: (
                <>
                  The first build line reads <code>transferring context:</code> with a small size (a few KB). Without the{' '}
                  <code>.dockerignore</code> it would report ~50 MB because <code>data\big.parquet</code> would be sent.
                  Delete a line from <code>.dockerignore</code> and rebuild to watch the transferred size jump — proof the
                  ignore file is what keeps the context lean.
                </>
              ),
            },
            {
              title: 'Convert to a multi-stage build',
              body: (
                <>
                  <p>Replace the Dockerfile with a builder stage plus a slim runtime stage that runs as a non-root user:</p>
                  <CodeBlock
                    label="Dockerfile — multi-stage"
                    code={`# ---- stage 1: build ----
FROM python:3.13 AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/install -r requirements.txt

# ---- stage 2: runtime ----
FROM python:3.13-slim
WORKDIR /app
ENV PYTHONPATH=/install
COPY --from=builder /install /install
COPY . .
RUN useradd --create-home appuser
USER appuser
CMD ["python", "app.py"]`}
                  />
                </>
              ),
              commands: [{ ps: 'docker build -t pipe:v2 .\ndocker run --rm pipe:v2\ndocker run --rm pipe:v2 whoami' }],
              checkpoint: (
                <>
                  <code>pipe:v2</code> prints the same <code>requests version: 2.32.3</code>, and <code>whoami</code>{' '}
                  prints <code>appuser</code> (not <code>root</code>) — the non-root USER took effect. The heavy compiler
                  base never made it into <code>v2</code>.
                </>
              ),
            },
            {
              title: 'Compare the sizes',
              body: <p>Line the two images up and read the SIZE column.</p>,
              commands: [{ ps: 'docker images pipe' }],
              checkpoint: (
                <>
                  Both <code>pipe:v1</code> and <code>pipe:v2</code> appear. <code>v1</code> (single-stage on{' '}
                  <code>slim</code>) is roughly 150 MB; a naive build on the <em>full</em> base would be ~1 GB. The
                  multi-stage <code>v2</code> stays near the slim size while having used the full compiler base only in the
                  discarded builder. Note the concrete numbers you get — the builder&apos;s weight never shipped.
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
              q: 'What does the trailing dot in `docker build -t app .` mean?',
              options: [
                'Build the image named "."',
                'The build context — the directory sent to the builder, which COPY can read from',
                'Use the current image cache',
                'Run the build in the background',
              ],
              answer: 1,
              explain: 'The final argument is the build context path. Docker packages that directory and sends it to the daemon; COPY/ADD can only reference files inside it. A .dockerignore trims what is sent.',
            },
            {
              q: 'Why prefer CMD ["python", "app.py"] (exec form) over CMD python app.py (shell form)?',
              options: [
                'Exec form is shorter to type',
                'Shell form does not support arguments',
                'Exec form makes your program PID 1 so it receives signals directly; shell form wraps it in sh -c, which often swallows SIGTERM and makes docker stop hang',
                'They are identical',
              ],
              answer: 2,
              explain: 'Exec form runs your process as PID 1, so docker stop delivers SIGTERM straight to it for a clean shutdown. Shell form makes /bin/sh PID 1; it usually does not forward SIGTERM, so stop degrades to a hard SIGKILL after the grace period.',
            },
            {
              q: 'What is the difference between ENTRYPOINT and CMD?',
              options: [
                'They are aliases',
                'ENTRYPOINT is the fixed command that always runs; CMD supplies default arguments that docker run can override',
                'CMD runs at build time, ENTRYPOINT at run time',
                'ENTRYPOINT is for shell form only',
              ],
              answer: 1,
              explain: 'The container argv is ENTRYPOINT + CMD. Args after the image name on docker run replace CMD but not ENTRYPOINT. Use ENTRYPOINT for the fixed executable, CMD for overridable defaults.',
            },
            {
              q: 'Your simple Python app builds into a 1.1 GB image. The most likely single cause is:',
              options: [
                'Too many Dockerfile instructions',
                'A fat build context (e.g. a data/ or .venv/ folder) copied in, and/or building on the full base instead of slim',
                'Using CMD instead of ENTRYPOINT',
                'Not enough layers',
              ],
              answer: 1,
              explain: 'Image bloat is almost always a fat context baked in by COPY . . (fix with .dockerignore) or a heavy base image. A .dockerignore plus a slim/multi-stage base is the standard fix.',
            },
            {
              q: 'In a multi-stage build, what ends up in the final image?',
              options: [
                'Everything from every stage, merged',
                'Only the last stage plus whatever you explicitly COPY --from earlier stages',
                'Only the first stage',
                'Nothing until you run docker export',
              ],
              answer: 1,
              explain: 'The final image is the last FROM stage. Earlier stages contribute only the artifacts you pull across with COPY --from. Compilers and build caches left in the builder are discarded.',
            },
            {
              q: 'Why add a non-root USER near the end of a Dockerfile?',
              options: [
                'It makes the image smaller',
                'It speeds up the build',
                'By default the container runs as root; dropping to an unprivileged user shrinks the blast radius if the process is compromised',
                'Root is not allowed in containers',
              ],
              answer: 2,
              explain: 'Containers run as root by default, and container-root can be dangerous if isolation is bypassed. Switching to a non-root USER (after the root-requiring install steps) is a cheap, standard hardening step.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Walk me through how you would order a Dockerfile for a Python service.',
            a: (
              <p>
                Pin a slim base with <code>FROM python:3.13-slim</code>, set <code>WORKDIR</code>, then copy{' '}
                <em>only</em> <code>requirements.txt</code> and <code>pip install</code> before copying the application
                code — so the expensive install layer stays cached and a code change rebuilds only the cheap top layer.
                Add a <code>.dockerignore</code> to keep the context lean and secrets out, run as a non-root{' '}
                <code>USER</code>, and use exec-form <code>CMD</code>. If anything needs compiling, split into a
                multi-stage build so the compilers never ship.
              </p>
            ),
          },
          {
            q: 'What is the difference between CMD and ENTRYPOINT, and when do you use each?',
            a: (
              <p>
                <code>CMD</code> alone is a default command fully replaced by whatever you pass to{' '}
                <code>docker run</code>. <code>ENTRYPOINT</code> is a fixed command; run-time arguments become its
                parameters. Use <code>ENTRYPOINT</code> when the image <em>is</em> a specific tool (arguments configure
                it), and <code>CMD</code> alone for a plain &quot;run this script&quot; image. Combine them —
                <code>ENTRYPOINT</code> for the executable, <code>CMD</code> for default args — when you want overridable
                defaults. Always exec form so signals reach the process.
              </p>
            ),
          },
          {
            q: 'How do you make a large image smaller?',
            a: (
              <p>
                First, a <code>.dockerignore</code> so a fat context (data, <code>.venv</code>, <code>.git</code>) is
                never copied in. Second, a slim base instead of the full one. Third, a multi-stage build so compilers and
                build caches stay in a discarded builder stage and only artifacts ship. Also combine and clean up{' '}
                <code>RUN</code> layers (one <code>apt-get</code> with <code>--no-install-recommends</code> and a cache
                clean) and use <code>--no-cache-dir</code> for pip. Alpine is a last resort, gated on your wheels having
                musl builds.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>A Dockerfile is an ordered recipe: <code>FROM</code>, <code>WORKDIR</code>, <code>COPY</code>, <code>RUN</code>, <code>ENV</code>, <code>EXPOSE</code>, <code>CMD</code>. <code>RUN</code>/<code>COPY</code> happen at build time and become layers; <code>CMD</code>/<code>ENTRYPOINT</code> only record what runs later.</>,
          <>Prefer exec form (<code>[&quot;python&quot;,&quot;app.py&quot;]</code>) so your process is PID 1 and receives signals — shell form makes <code>docker stop</code> hang. <code>ENTRYPOINT</code> is the fixed command; <code>CMD</code> supplies overridable default arguments.</>,
          <>The build context is the folder sent to the builder. A <code>.dockerignore</code> keeps heavy and secret files out — faster builds and no accidental leaks, since a secret baked into an early layer cannot be deleted from history.</>,
          <>Multi-stage builds do heavy work in a builder stage, then <code>COPY --from=builder</code> only the artifacts into a slim runtime stage — dropping compilers, shrinking size, and reducing attack surface.</>,
          <>Base-image choice is a trade-off: <code>slim</code> (glibc, wheels just work) is the pragmatic default; <code>alpine</code> is smaller but its musl libc can force source compilation; the full image is best used only as a builder.</>,
          <>Run as a non-root <code>USER</code> after the steps that need root — a one-line reduction in blast radius that costs nothing at runtime.</>,
        ]}
      />
    </>
  )
}
