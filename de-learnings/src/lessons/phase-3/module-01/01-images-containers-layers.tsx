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

const ID = '3.1.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="&quot;It works on my machine&quot; — the sentence containers delete">
        <p>
          You built a pipeline in Phase 2. It reads Postgres, runs some Python, writes Parquet. It works — on your
          laptop, with your Python 3.13, your installed packages, your environment variables. Ship it to a server with
          Python 3.10 and a different <code>libssl</code>, and it breaks in ways that take a day to diagnose. A{' '}
          <GlossaryTerm k="container">container</GlossaryTerm> packages the code <em>and</em> everything it needs to run
          into one artifact that behaves the same everywhere.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think of shipping furniture. You could send a chair, a bag of screws, and instructions, and hope the
                other end has the right screwdriver and reads the manual the same way you did. Or you could send it fully
                assembled in a sealed crate that fits any truck, any warehouse, any door. The crate is standard; what is
                inside is yours. That is a container: your program, sealed with its dependencies, in a box the world
                already knows how to handle.
              </p>
              <p>
                Before crates, every shipping company packed goods their own way and nothing fit together. The shipping
                container — one steel box, standard corners — is what made global trade cheap. Software containers borrow
                the name on purpose: one standard box, and the machinery underneath (cranes, ships, trucks — here,
                laptops, servers, clouds) stops caring what is inside.
              </p>
            </>
          }
          student={
            <>
              <p>
                A container is an isolated process on a shared kernel. It sees its own filesystem, its own process tree,
                its own network — but there is no second operating system booting underneath, unlike a virtual machine.
                It is your host&apos;s Linux kernel, fenced off with two kernel features:{' '}
                <em>namespaces</em> (what a process can see — PIDs, mounts, network) and <em>cgroups</em> (what it can
                use — CPU, memory). The result is near-native speed with strong-enough isolation for most work.
              </p>
              <p>
                Two words you must not blur: an <GlossaryTerm k="image">image</GlossaryTerm> is the frozen template
                (the crate&apos;s blueprint and packed contents); a container is a running instance of it. One image,
                many containers — exactly class versus object. This lesson is about what an image actually <em>is</em>
                inside, because that structure explains every build speed-up and every gotcha you will hit.
              </p>
            </>
          }
          phd={
            <>
              <p>
                &quot;Container&quot; is not a kernel object — there is no <code>struct container</code> in Linux. It is a
                userspace convention over namespaces (<code>pid</code>, <code>mnt</code>, <code>net</code>, <code>uts</code>,
                <code>ipc</code>, <code>user</code>), cgroups v2 for resource accounting, and a capability/seccomp profile
                to shrink the syscall surface. The runtime (containerd → runc, per the OCI runtime spec) assembles those
                primitives; Docker is the developer-facing tooling above them.
              </p>
              <p>
                The isolation is real but weaker than a VM&apos;s: every container shares one kernel, so a kernel
                vulnerability is a shared blast radius, and a Linux image cannot run on a Windows kernel without a Linux
                VM underneath (which is exactly what Docker Desktop runs). The trade is deliberate — surrender
                hardware-level isolation to gain density and sub-second start. Phase 6&apos;s security lesson revisits the
                threat model; here we stay on the filesystem.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="An image is a stack of read-only layers">
        <p>
          An image is not one opaque blob. It is a stack of <GlossaryTerm k="image-layer">layers</GlossaryTerm>, each one
          the filesystem <em>change</em> made by a single build step, stacked so that upper layers override lower ones.
          Click through the stack — each slab is one instruction, content-addressed by hash:
        </p>
        <ContainerLayers />
        <Tiered
          layman={
            <>
              <p>
                Picture a painting built up in transparent sheets. The bottom sheet is the plain background (the base
                operating system). The next adds some furniture, the next some people, the next a caption. Look straight
                down through the stack and you see one finished picture — but it is really many sheets, and if you only
                repaint the caption you keep every sheet beneath untouched.
              </p>
              <p>
                That reuse is the point. If ten paintings all start from the same background sheet, you draw and store
                that sheet <em>once</em>. Docker does the same: shared layers are stored a single time and reused across
                every image and container that references them.
              </p>
            </>
          }
          student={
            <>
              <p>
                Each layer is the diff a build step produced: the files it added, changed, or deleted. At run time a{' '}
                <GlossaryTerm k="union-filesystem">union filesystem</GlossaryTerm> (overlayfs on Linux) merges the stack
                into one coherent tree — later layers shadow earlier ones, and a special &quot;whiteout&quot; marker even
                lets an upper layer delete a file that a lower layer added. Layers are immutable and identified by the
                SHA-256 of their content, so identical layers are <em>the same bytes on disk</em>, shared everywhere.
              </p>
              <p>
                This is why <code>docker pull</code> of a second image based on the same{' '}
                <GlossaryTerm k="base-image">base image</GlossaryTerm> downloads almost nothing — you already have the
                shared layers. And it is why <code>docker history &lt;image&gt;</code> reads like a receipt: one row per
                layer, each with the instruction that made it and its size.
              </p>
            </>
          }
          phd={
            <>
              <p>
                An OCI image is a JSON manifest referencing an ordered list of content-addressed layer blobs (gzipped
                tarballs of filesystem diffs) plus a config blob holding the ordered <code>diff_id</code> list and
                metadata (entrypoint, env, working dir). &quot;Content-addressed&quot; is the whole trick: the digest{' '}
                <em>is</em> the identity, so deduplication, integrity verification, and cache lookups are all the same
                hash comparison. Registries store each blob once regardless of how many images share it.
              </p>
              <p>
                overlayfs composes a set of read-only <code>lowerdir</code> layers under a writable <code>upperdir</code>
                with an in-memory <code>merged</code> view. Reads resolve top-down; the first layer holding the path
                wins. Deletions are recorded as whiteout inodes rather than actual removal, because lower layers are
                immutable. The cost surfaces on first write to a large existing file — see copy-on-write next — which is
                why databases mount a volume instead of writing into the container filesystem.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The container adds one thin writable layer on top">
        <Tiered
          layman={
            <>
              <p>
                Start the program and Docker lays one blank glass sheet on top of the finished painting. Everything the
                running program scribbles — temp files, logs, a downloaded file — goes on that top sheet. The painting
                underneath is never touched. Throw the container away and you throw away only the glass sheet; the image
                is pristine, ready to start a fresh container with a fresh blank sheet.
              </p>
              <p>
                If the program wants to change something on a lower sheet, Docker first copies that one item up to the
                glass, then edits the copy. The original stays put. This is why two containers from the same image never
                step on each other — each has its own private top sheet.
              </p>
            </>
          }
          student={
            <>
              <p>
                Running a container adds exactly one layer: a thin writable layer on top of the read-only image stack.
                All changes a container makes live there. Modifying a file that exists in a lower layer triggers{' '}
                <GlossaryTerm k="copy-on-write">copy-on-write</GlossaryTerm>: the file is copied up into the writable
                layer first, then edited — the underlying image layer is never mutated. <code>docker diff</code> shows
                exactly what a container has changed relative to its image.
              </p>
              <p>
                The consequence you must internalize: <strong>the writable layer dies with the container.</strong>{' '}
                <code>docker rm</code> and every byte written inside is gone. That is a feature (containers are
                disposable and reproducible), but it means anything worth keeping — a database&apos;s data, output files —
                must go on a <em>volume</em>, which lives outside the layer stack. You saw this exact rule with Postgres
                in lesson 2.1.1; now you know the mechanism underneath it.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The writable layer is overlayfs&apos;s <code>upperdir</code>. First write to a path present only in a
                lower layer performs a full copy_up of that file (whole-file, not block-level, on overlayfs), so writing
                one byte into a 2 GB file materializes 2 GB in the upper layer. This makes the container filesystem a
                poor place for write-heavy, large-file, or fsync-sensitive workloads — hence volumes (bind mounts or
                named volumes) bypass the union filesystem entirely and hit the host filesystem directly.
              </p>
              <p>
                Because layers below are shared and immutable, N containers from one image cost one image on disk plus N
                small upperdirs — the density argument for containers over VMs made concrete. It also means container
                filesystem state is ephemeral by construction: reproducibility and horizontal scaling both assume the
                writable layer carries nothing you cannot afford to lose.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="The rule that follows from the mechanism">
          Never keep data you care about inside a container&apos;s writable layer. Databases, uploaded files, anything
          stateful → a named volume. Containers are cattle, not pets: you should be able to <code>docker rm -f</code> any
          container and recreate it with no loss. If that scares you, something stateful is in the wrong place.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Layer caching: why Dockerfile order decides your build speed">
        <p>
          Because each instruction is a layer keyed by its inputs, Docker caches aggressively: on rebuild it reuses every
          layer whose inputs have not changed, and only rebuilds from the first changed layer upward. Order your{' '}
          Dockerfile to put what changes <em>least</em> at the bottom and what changes <em>most</em> at the top, and your
          rebuilds go from minutes to seconds.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Imagine assembling a sandwich the same way every day. If you always start with bread, then the slow-cooked
                filling, then a quick sprinkle of salt on top, you can keep the bread-and-filling ready and just redo the
                salt each morning. But if you put the salt <em>under</em> the filling, changing the salt means rebuilding
                the whole sandwich. Same ingredients, different order, wildly different effort.
              </p>
              <p>
                Your code is the salt — it changes every day. Your installed libraries are the slow filling — they change
                rarely. Put the libraries below the code, and a code change never forces a library reinstall.
              </p>
            </>
          }
          student={
            <>
              <p>
                The classic pattern: copy the dependency list and install dependencies <em>before</em> copying your
                application code. Dependencies change rarely, so that expensive layer stays cached; code changes
                constantly, so it sits last where a rebuild is cheap. Invert the two and every one-line code edit
                reinstalls every package — the single most common Dockerfile mistake.
              </p>
              <CodeBlock
                label="Dockerfile — cache-friendly order"
                code={`FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .              # changes rarely
RUN pip install -r requirements.txt  # heavy — stays cached
COPY . .                             # changes constantly — cheap, and last
CMD ["python", "pipeline.py"]`}
              />
              <p>
                Edit <code>pipeline.py</code> and rebuild: the <code>FROM</code>, <code>WORKDIR</code>,{' '}
                <code>COPY requirements.txt</code>, and <code>pip install</code> layers all report <code>CACHED</code>;
                only <code>COPY . .</code> reruns. You will watch this happen in the lab. (The <code>CMD</code>/
                <code>WORKDIR</code>/<code>COPY</code>/<code>RUN</code> instructions themselves are lesson 3.1.2 —
                here we care only about the layer/cache behavior they produce.)
              </p>
            </>
          }
          phd={
            <>
              <p>
                The build cache key for a layer is a function of the parent layer&apos;s digest plus the instruction and
                its inputs. For <code>COPY</code>/<code>ADD</code> the inputs include a hash of the copied files&apos;
                contents and metadata; for <code>RUN</code> it is (by default) just the command string — which is why{' '}
                <code>RUN apt-get update</code> can serve stale package indexes from cache and why cache-busting args or{' '}
                <code>--no-cache</code> exist. A cache hit requires the parent to also be a hit: the first miss
                invalidates everything above it, unconditionally.
              </p>
              <p>
                BuildKit (the modern builder) refines this with a content-addressable cache, parallel execution of
                independent stages, and <code>RUN --mount=type=cache</code> for persistent package-manager caches that
                survive layer invalidation. Multi-stage builds (3.1.2) exploit the same graph to discard build-only
                layers from the final image. The mental model stays constant: minimize what sits above your most
                frequently changing input.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Registries, tags, and digests: how images travel and get named">
        <Tiered
          layman={
            <>
              <p>
                A registry is an app store for images. You <em>pull</em> to download one and <em>push</em> to publish one.
                Docker Hub is the default store; companies run private ones. A name like{' '}
                <code>python:3.13-slim</code> is &quot;the app called python, the edition tagged 3.13-slim&quot;.
              </p>
              <p>
                One warning about the word &quot;latest&quot;: it is not magic, it is just the default tag&apos;s name, and
                it can quietly point at a different version tomorrow than it did today. For anything you depend on, name
                the exact edition.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <GlossaryTerm k="container-registry">container registry</GlossaryTerm> stores and serves images.{' '}
                <code>docker pull python:3.13-slim</code> parses as <code>registry/repository:tag</code> — here Docker
                Hub&apos;s <code>library/python</code> repo at tag <code>3.13-slim</code>. A <em>tag</em> is a mutable
                human label; a <em>digest</em> (<code>python@sha256:...</code>) is the immutable content hash. Tags move;
                digests never do.
              </p>
              <p>
                <code>latest</code> is not &quot;the newest&quot; — it is merely the tag applied when you specify none, and
                whoever publishes the image decides what it points to. Pinning <code>postgres:17</code> (as you did in
                2.1.1) rather than <code>postgres:latest</code> is the difference between a reproducible pipeline and one
                that silently jumps a major version on the next pull. For maximum reproducibility, pin the digest.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A tag is a mutable pointer in a registry&apos;s repository namespace; the manifest it references is
                content-addressed by digest. Production supply-chain practice pins by digest (<code>image@sha256:...</code>)
                so a rebuild is bit-reproducible and a compromised or re-pushed tag cannot silently alter what runs —
                the same integrity argument as a lockfile, one level down the stack.
              </p>
              <p>
                A single tag can resolve to a <em>manifest list</em> (OCI image index) that maps
                platform → manifest, which is how <code>python:3.13-slim</code> transparently serves an arm64 image on
                Apple Silicon and amd64 on a cloud VM. Mismatches here cause the classic &quot;exec format error&quot; when
                an amd64-only image lands on arm64 — a real gotcha once you build and ship across architectures (Phase 6).
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Containers, virtual machines, or just a process?">
        <p>
          Containers are not the only way to isolate a workload, and &quot;put it in a container&quot; is not always the
          right answer. The axis is how much isolation you buy versus how much weight and speed you pay:
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Container',
              strengths: [
                'Sub-second start, near-native speed, high density (share one kernel)',
                'Image bundles dependencies — same artifact runs on laptop, CI, and cloud',
                'Layer sharing makes storage and pulls cheap',
              ],
              weaknesses: [
                'Shares the host kernel — weaker isolation than a VM; a kernel exploit crosses the boundary',
                'Linux images need a Linux kernel (a VM underneath on Windows/macOS)',
              ],
              chooseWhen: 'packaging and running services and pipelines reproducibly — the default for modern data infrastructure.',
            },
            {
              name: 'Virtual machine',
              strengths: [
                'Hardware-level isolation with its own kernel — strongest boundary of the three',
                'Can run a completely different OS from the host',
              ],
              weaknesses: [
                'Boots a whole OS: GBs of RAM, minutes to start, far lower density',
                'Heavier to build, ship, and patch',
              ],
              chooseWhen: 'you need a different OS, hard multi-tenant isolation, or to run untrusted code.',
            },
            {
              name: 'Plain process (no container)',
              strengths: [
                'Zero overhead and zero moving parts — nothing to build or orchestrate',
                'Simplest possible thing for a one-off script on a machine you control',
              ],
              weaknesses: [
                'No dependency isolation — back to &quot;works on my machine&quot;',
                'No resource limits or reproducible environment',
              ],
              chooseWhen: 'a throwaway local script where the environment is already correct and reproducibility does not matter.',
            },
          ]}
          note={
            <>
              In practice these nest: your cloud containers run inside VMs the provider manages, which run on bare metal.
              You reach for the lightest isolation that meets the requirement — usually a container. VMs and containers
              are not rivals so much as different rungs; knowing which rung a workload needs is the actual skill.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: watch layers cache, share, and disappear">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Docker Desktop must be running (<code>docker version</code> should print both a Client and a Server). You
              will read an image&apos;s layers, build a tiny image and watch the cache work, then prove the writable
              layer is disposable. Everything here is <code>docker</code> on the command line — no application code beyond
              a one-line script.
            </p>
          }
          steps={[
            {
              title: 'First contact, then pull a real base image',
              body: (
                <p>
                  <code>hello-world</code> confirms the engine works; then pull the Python base image you will build on.
                </p>
              ),
              commands: [
                { ps: 'docker run --rm hello-world' },
                { ps: 'docker pull python:3.13-slim\ndocker run --rm python:3.13-slim python -c "print(2**10)"' },
              ],
              checkpoint: (
                <>
                  hello-world prints &quot;Hello from Docker!&quot;; the second command prints <code>1024</code>.{' '}
                  <code>--rm</code> auto-removes each container the instant it exits — so nothing piles up.
                </>
              ),
            },
            {
              title: 'Read the layers as a receipt',
              body: <p>Every image carries its build history. Read it top-to-bottom:</p>,
              commands: [{ ps: 'docker history python:3.13-slim' }],
              checkpoint: (
                <>
                  A table of layers prints, one row per build step, each with a <code>SIZE</code>. A few layers carry real
                  megabytes (the OS, the Python install); several show <code>0B</code> (metadata-only, like setting
                  environment variables). That stack is exactly the viz above.
                </>
              ),
            },
            {
              title: 'Build a tiny image',
              body: (
                <>
                  <p>
                    Make a folder <code>C:\de-lab\docker-lab</code> with two files. <code>app.py</code>:
                  </p>
                  <CodeBlock label="app.py" code={`print("pipeline v1")`} />
                  <p>and a <code>Dockerfile</code> using the cache-friendly order from this lesson:</p>
                  <CodeBlock
                    label="Dockerfile"
                    code={`FROM python:3.13-slim
WORKDIR /app
COPY app.py .
CMD ["python", "app.py"]`}
                  />
                </>
              ),
              commands: [{ ps: 'cd C:\\de-lab\\docker-lab\ndocker build -t layer-lab .\ndocker run --rm layer-lab' }],
              checkpoint: (
                <>
                  The build prints a step per instruction and ends <code>naming to ...layer-lab</code>; running it prints{' '}
                  <code>pipeline v1</code>.
                </>
              ),
            },
            {
              title: 'Rebuild unchanged, then after a code change — watch the cache',
              body: (
                <>
                  <p>Rebuild with nothing changed, then edit <code>app.py</code> to <code>print(&quot;pipeline v2&quot;)</code> and rebuild again.</p>
                  <RevealSolution label="What to look for">
                    <p>
                      The unchanged rebuild reports <code>CACHED</code> on every step and finishes near-instantly. After
                      the edit, the <code>FROM</code>/<code>WORKDIR</code> steps still say <code>CACHED</code>, but{' '}
                      <code>COPY app.py .</code> and everything after it rerun — because that layer&apos;s input (the file)
                      changed. Only the changed layer and those above it rebuild.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                { ps: 'docker build -t layer-lab .', label: 'unchanged rebuild' },
                { ps: '# edit app.py to print("pipeline v2"), then:\ndocker build -t layer-lab .\ndocker run --rm layer-lab', label: 'after edit' },
              ],
              checkpoint: (
                <>
                  Unchanged rebuild: every step <code>CACHED</code>. After the edit: <code>COPY app.py .</code> reruns and
                  the run prints <code>pipeline v2</code>. You have just seen why dependency order matters.
                </>
              ),
            },
            {
              title: 'Prove the writable layer is disposable',
              body: (
                <p>
                  Start a container that stays up, write a file <em>inside</em> it, see the change, then destroy the
                  container and start a fresh one.
                </p>
              ),
              commands: [
                { ps: 'docker run -d --name scratch python:3.13-slim sleep 600' },
                { ps: 'docker exec scratch sh -c "echo hi > /tmp/note.txt && cat /tmp/note.txt"\ndocker diff scratch', label: 'write + inspect' },
                { ps: 'docker rm -f scratch\ndocker run --rm python:3.13-slim cat /tmp/note.txt', label: 'destroy + recheck' },
              ],
              checkpoint: (
                <>
                  <code>cat</code> prints <code>hi</code>; <code>docker diff</code> lists <code>A /tmp/note.txt</code> (Added)
                  — your change living in the writable layer. After <code>docker rm -f</code>, the fresh container&apos;s{' '}
                  <code>cat</code> fails with <code>No such file or directory</code>: the writable layer, and everything in
                  it, is gone. This is why stateful data belongs on a volume.
                </>
              ),
            },
            {
              title: 'See layer sharing in the numbers',
              body: <p>The base image is stored once and shared by every image built on it. Ask Docker to account for it:</p>,
              commands: [{ ps: 'docker system df -v' }],
              checkpoint: (
                <>
                  Under <code>Images</code>, <code>layer-lab</code> and <code>python:3.13-slim</code> both appear, but the
                  reclaimable/shared accounting shows the base layers counted once, not twice — <code>layer-lab</code>
                  adds only its tiny <code>app.py</code> layer on top. Shared, content-addressed layers in action.
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
              q: 'What is the relationship between an image and a container?',
              options: [
                'They are two words for the same thing',
                'An image is the read-only template; a container is a running instance of it with a writable layer on top',
                'A container is the template; an image is the running copy',
                'An image runs inside a container',
              ],
              answer: 1,
              explain: 'Image : container :: class : object. One image starts many containers, each adding its own thin writable layer over the shared read-only image stack.',
            },
            {
              q: 'You change one line of application code and rebuild. Why might every Python package reinstall?',
              options: [
                'Docker always reinstalls everything',
                'The COPY of your code sits BELOW the pip install, so changing code invalidates the install layer and everything above it',
                'pip has no cache',
                'The base image changed',
              ],
              answer: 1,
              explain: 'A cache miss invalidates that layer and all layers above it. If code is copied before dependencies are installed, a code change busts the install layer. Copy requirements and install first; copy code last.',
            },
            {
              q: 'A container writes 500 MB of logs to its own filesystem, then you run docker rm on it. The logs are:',
              options: [
                'Saved into the image for next time',
                'Gone — they lived in the writable layer, which is destroyed with the container',
                'Automatically moved to a volume',
                'Pushed to the registry',
              ],
              answer: 1,
              explain: 'The writable layer dies with the container. Anything you must keep goes on a volume, which lives outside the layer stack — the same rule that protected the Postgres data in 2.1.1.',
            },
            {
              q: 'You pull two different images that are both built FROM python:3.13-slim. Disk usage is roughly:',
              options: [
                'Double — each image stores its own full copy',
                'One shared copy of the common base layers plus each image’s unique upper layers',
                'Zero — images are not stored on disk',
                'Unpredictable and unrelated to sharing',
              ],
              answer: 1,
              explain: 'Layers are content-addressed by hash, so identical layers are stored exactly once and shared. The common base costs one copy; only the differing upper layers add space.',
            },
            {
              q: 'Why prefer postgres:17 over postgres:latest in a pipeline you depend on?',
              options: [
                'latest is slower to pull',
                'A tag is a mutable label — latest can point at a new major version on the next pull, silently changing your environment',
                'latest images are always broken',
                '17 is a digest and latest is not',
              ],
              answer: 1,
              explain: 'Tags move; latest is just the default tag and its target is chosen by the publisher. Pinning a specific tag (or, for maximum reproducibility, a digest) keeps rebuilds reproducible.',
            },
            {
              q: 'Which best describes why a container starts in well under a second while a VM takes much longer?',
              options: [
                'Containers skip loading the program',
                'A container is an isolated process on the host’s existing kernel; a VM must boot its own operating system first',
                'VMs are written in a slower language',
                'Containers do not isolate anything',
              ],
              answer: 1,
              explain: 'Containers reuse the running host kernel and just fence a process with namespaces and cgroups — no OS boot. VMs virtualize hardware and boot a full guest OS, which is why they are heavier and slower to start.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Explain the difference between a container and a virtual machine.',
            a: (
              <p>
                A VM virtualizes hardware and boots its own guest OS kernel on top of a hypervisor — strong isolation,
                but GBs of memory and minutes to start. A container is an isolated process sharing the host&apos;s kernel,
                fenced with namespaces (what it sees) and cgroups (what it can use) — near-native speed, sub-second start,
                high density, but weaker isolation because the kernel is shared. Rule of thumb: containers for packaging
                and running your own services reproducibly; VMs when you need a different OS or hard multi-tenant
                isolation. In the cloud they nest — your containers run inside managed VMs.
              </p>
            ),
          },
          {
            q: 'Your Docker builds are slow on every code change. How would you fix it?',
            a: (
              <p>
                Almost always Dockerfile layer order. Copy the dependency manifest and install dependencies before
                copying application code, so the expensive install layer stays cached and only the cheap code layer
                rebuilds on a code change. A cache miss invalidates that layer and everything above it, so you want the
                least-frequently-changing inputs at the bottom. Beyond ordering: a <code>.dockerignore</code> to keep the
                build context small, multi-stage builds to drop build-only tooling, and BuildKit cache mounts for
                package managers.
              </p>
            ),
          },
          {
            q: 'Where should a containerized database write its data, and why not the container filesystem?',
            a: (
              <p>
                On a volume, never the container&apos;s writable layer. That layer is destroyed with the container, and
                copy-on-write over a union filesystem is poor for write-heavy, large-file, fsync-sensitive workloads.
                A volume (named volume or bind mount) bypasses the layer stack and writes directly to the host
                filesystem, so data survives <code>docker rm</code> and performs well. It is the &quot;containers are
                disposable, state lives outside&quot; principle made concrete.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>An image is a read-only stack of content-addressed layers (one per build step); a container is a running instance that adds one thin writable layer on top.</>,
          <>A union filesystem merges the layers into one tree; modifying a lower-layer file triggers copy-on-write into the writable layer, leaving the image untouched.</>,
          <>The writable layer dies with the container — keep anything stateful on a volume, outside the layer stack (the 2.1.1 rule, now with its mechanism).</>,
          <>Layer caching reuses every layer whose inputs are unchanged and rebuilds from the first change upward: put rarely-changing steps (dependency installs) below frequently-changing ones (your code).</>,
          <>Identical layers are stored once and shared across images and containers — which is why images built on a common base cost little extra disk and pull fast.</>,
          <>Tags are mutable labels (latest is just the default one); pin a specific tag or a digest for reproducible pipelines. Containers share the host kernel — lighter than VMs, with correspondingly weaker isolation.</>,
        ]}
      />
    </>
  )
}
