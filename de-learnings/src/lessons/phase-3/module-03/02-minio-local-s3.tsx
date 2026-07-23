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
import { DataJourney } from '../../../viz/DataJourney'

const ID = '3.3.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="You need an S3 without an AWS bill or an internet connection">
        <p>
          Lesson 3.3.1 gave you the mental model of object storage. Now you need to actually <em>use</em> one — create a
          bucket, upload a Parquet file, query it with the exact S3 API and paths you would use in the cloud — without a
          credit card, without a network round-trip to AWS, and without the fear of a surprise bill. The answer is{' '}
          <GlossaryTerm k="minio">MinIO</GlossaryTerm>: a small, S3-compatible object store that runs in one Docker
          container on your laptop and speaks the same API as Amazon S3.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Imagine you are learning to drive but do not want to practice on a real motorway. You get a driving
                simulator that has the same steering wheel, the same pedals, the same road signs — everything behaves like
                the real road, but a mistake costs nothing and you can practice at 2am with no traffic. When you finally
                drive the real motorway, your hands already know what to do.
              </p>
              <p>
                MinIO is that simulator for cloud storage. It behaves like Amazon&apos;s storage in every way that matters
                — same commands, same concepts — but it runs on your own machine, for free, offline. Everything you learn
                on it transfers directly to the real cloud, because from your code&apos;s point of view they are the same
                thing.
              </p>
            </>
          }
          student={
            <>
              <p>
                MinIO is an open-source, S3-compatible object store: a single Go binary (shipped as a Docker image) that
                implements the <GlossaryTerm k="s3-api">S3 API</GlossaryTerm>. Any tool that talks to S3 — the AWS CLI,
                DuckDB&apos;s httpfs extension, Spark, boto3 — talks to MinIO by changing one thing: the endpoint URL.
                Point them at <code>http://localhost:9000</code> instead of AWS, hand over an access key and secret, and
                the rest of the code is byte-for-byte identical.
              </p>
              <p>
                Why bother instead of just using S3? Local parity. You develop and test against a real object store with
                real S3 semantics — buckets, keys, multipart uploads, presigned URLs — with zero cost, zero latency, and
                full offline reproducibility, which is also why MinIO is the standard object store in CI pipelines. You
                write the code once; flipping from MinIO to production S3 is a config change, not a rewrite.
              </p>
            </>
          }
          phd={
            <>
              <p>
                &quot;S3-compatible&quot; means MinIO implements the S3 REST API surface — the same request signing
                (AWS Signature V4), the same XML/HTTP responses, the same error codes — so it is a drop-in target for the
                S3 client ecosystem. Compatibility is high but not total: some AWS-specific features (certain storage
                classes, cross-region replication semantics, IAM breadth, S3 Select edge cases) differ or are absent, so
                MinIO is a faithful <em>development and CI</em> mirror, not a guarantee that every AWS-only behavior is
                reproduced.
              </p>
              <p>
                The value in a data-engineering context is a hermetic test environment: object storage is a hard external
                dependency to mock convincingly (mocks never reproduce real listing, consistency, or multipart behavior),
                so running the genuine protocol locally gives you fidelity a fake cannot. This is the same argument as
                running the pinned Postgres image in Docker rather than SQLite-as-a-stand-in — test against the real
                protocol, pinned and reproducible, and keep prod-vs-dev drift near zero.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="MinIO in the picture: a real S3 endpoint on localhost">
        <p>
          The lake&apos;s landing zone, running on your own machine. Sources produce records, an ingest job PUTs them as
          objects, and they come to rest in a MinIO bucket you query exactly like cloud S3:
        </p>
        <DataJourney
          source={{ label: 'SOURCES', blurb: 'CSVs, an API, a Postgres export — raw records to be landed in the lake.' }}
          transform={{ label: 'PUT (S3 API)', blurb: 'A client (mc, aws s3, DuckDB, boto3) uploads whole objects to an S3 endpoint. Against MinIO the endpoint is just http://localhost:9000.' }}
          warehouse={{ label: 'MinIO BUCKET', blurb: 'A real S3-compatible object store in a Docker container. Same buckets, keys, and API as AWS S3 — free, offline, reproducible.' }}
          caption={<>The same journey as the cloud, on localhost. Swap the endpoint URL and this diagram becomes production S3 unchanged.</>}
        />
        <Tiered
          layman={
            <>
              <p>
                There are three ways to talk to your MinIO, and they are like three ways to move boxes into a storage
                unit. There is a purpose-built hand truck made by the same company (the <code>mc</code> client — MinIO&apos;s
                own tool). There is the universal moving-company van that works with every storage unit brand (the{' '}
                <code>aws</code> command-line tool). And there is your smart assistant who can fetch a box, read what is
                inside, and answer questions about it without you unpacking anything (DuckDB reading straight from the
                bucket).
              </p>
              <p>
                You will use all three in the lab. They are just different remote controls for the same storage room; pick
                whichever fits the moment.
              </p>
            </>
          }
          student={
            <>
              <p>Three clients you will meet, each for a different job:</p>
              <ul>
                <li>
                  <strong>
                    <code>mc</code> (MinIO Client)
                  </strong>{' '}
                  — MinIO&apos;s own CLI. You <code>mc alias set</code> a name for your server, then{' '}
                  <code>mc mb</code> (make bucket), <code>mc cp</code> (copy up), <code>mc ls</code> (list). Cleanest for
                  admin and bucket management.
                </li>
                <li>
                  <strong>
                    <code>aws s3</code>
                  </strong>{' '}
                  — the standard AWS CLI, pointed at MinIO with <code>--endpoint-url http://localhost:9000</code>. Proves
                  the compatibility: the same command works against real S3 by dropping that flag.
                </li>
                <li>
                  <strong>DuckDB via <GlossaryTerm k="httpfs">httpfs</GlossaryTerm></strong> — DuckDB reads Parquet
                  directly from <code>s3://bucket/key</code> without downloading it first: set the endpoint and
                  credentials, then <code>SELECT * FROM read_parquet(&apos;s3://...&apos;)</code>. This is the one you will
                  live in as a data engineer.
                </li>
              </ul>
              <p>
                All three need the same three facts: the endpoint (<code>localhost:9000</code>), an access key, and a
                secret key. Configure those once per client and the object-store commands are identical to their cloud
                form.
              </p>
            </>
          }
          phd={
            <>
              <p>
                A subtlety that bites everyone once: <strong>path-style vs virtual-host-style</strong> addressing. AWS
                historically addressed a bucket as a subdomain — <code>https://bucket.s3.amazonaws.com/key</code>{' '}
                (virtual-host style). MinIO on <code>localhost</code> cannot do that (you cannot resolve{' '}
                <code>bucket.localhost</code> as a real host), so it uses <strong>path style</strong>:{' '}
                <code>http://localhost:9000/bucket/key</code>. Clients must be told which to use — in DuckDB that is{' '}
                <code>SET s3_url_style = &apos;path&apos;</code>; in boto3 an <code>addressing_style</code> config; in the
                AWS CLI usually automatic. A misconfigured style is the classic &quot;works against AWS, mysteriously fails
                against MinIO&quot; error.
              </p>
              <p>
                Under the hood every request is signed with AWS SigV4 using the access key / secret key pair. Credentials
                flow through env vars (<code>AWS_ACCESS_KEY_ID</code>, <code>AWS_SECRET_ACCESS_KEY</code>), config files,
                or explicit client config — never hard-code them in source. Against MinIO the &quot;region&quot; is a
                required-but-ignored formality (<code>us-east-1</code> by convention). Getting endpoint, credentials, and
                URL style right is the entire configuration surface; everything above it is unchanged S3.
              </p>
            </>
          }
        />
        <p>
          The DuckDB story is the important one, and the punchline is how little changes. Below, DuckDB writes a Parquet
          file and reads it back with <code>read_parquet</code> — the exact function you will call against MinIO, where
          the <em>only</em> difference is the path (a local filename becomes an <code>s3://</code> URL). Run it:
        </p>
        <CodeRunner
          language="sql"
          label="DuckDB reading Parquet — the query is identical against a bucket"
          setup={`CREATE OR REPLACE TABLE trips AS
SELECT
  i AS trip_id,
  ['london','paris','berlin','rome'][1 + i % 4] AS city,
  round(6 + (i * 29) % 40 + 0.5, 2) AS fare
FROM range(20) t(i);
COPY trips TO 'trips.parquet' (FORMAT PARQUET);`}
          code={`-- Reading Parquet is one function call. On your machine (after the lab) the ONLY
-- change is the path: 'trips.parquet' becomes 's3://warehouse/trips.parquet'.
-- The SELECT, the aggregation, everything else is byte-for-byte identical.
SELECT city, count(*) AS trips, round(sum(fare), 2) AS revenue
FROM read_parquet('trips.parquet')
GROUP BY city
ORDER BY revenue DESC;`}
        />
        <p>
          On your own machine, pointing that same <code>read_parquet</code> at MinIO takes three setup lines. This block
          cannot run in the browser (it needs your local MinIO), but it is the whole configuration surface:
        </p>
        <CodeBlock
          label="DuckDB against MinIO — the only new part is the s3:// setup"
          code={`INSTALL httpfs; LOAD httpfs;
SET s3_endpoint   = 'localhost:9000';   -- MinIO, not AWS
SET s3_access_key_id     = 'minioadmin';
SET s3_secret_access_key = 'minioadmin';
SET s3_use_ssl    = false;              -- plain HTTP locally
SET s3_url_style  = 'path';             -- MinIO needs path style, not virtual-host

-- ...and now the query is the SAME one you ran above, just a different path:
SELECT city, count(*), round(sum(fare), 2)
FROM read_parquet('s3://warehouse/trips.parquet')
GROUP BY city ORDER BY 3 DESC;`}
        />
      </Section>

      <Section kicker="core concepts" title="Why a local S3 mirrors the cloud (and where it doesn't)">
        <Tiered
          layman={
            <>
              <p>
                The point of the driving simulator is that the muscle memory transfers. If the simulator used a joystick
                instead of a wheel, it would teach you the wrong habits. MinIO uses the real wheel and pedals — the same
                commands and concepts as the cloud — so the habits you build are the correct ones.
              </p>
              <p>
                But a simulator is not the real road in every detail: no real weather, no real police, a few road signs it
                does not model. MinIO is the same — faithful for almost everything you do while learning and testing, but
                not a promise that every rare cloud-only quirk shows up. For this course, and for most real development,
                that gap never matters.
              </p>
            </>
          }
          student={
            <>
              <p>
                The value is <strong>dev/prod parity</strong>: your ingestion code, your DuckDB queries, your bucket
                layout, your credential handling — all written and tested against a real S3 protocol, then shipped to AWS
                with a changed endpoint and keys. No &quot;it worked locally against a fake, then broke in prod against the
                real thing,&quot; because locally you already used the real thing. This is why MinIO is a fixture in CI:
                spin it up in a container, run the pipeline&apos;s integration tests against genuine object-storage
                behavior, tear it down — cheap, fast, offline, deterministic.
              </p>
              <p>
                Where it does not perfectly mirror: some AWS-only features (specific storage classes, cross-region
                replication semantics, the full breadth of IAM policies, a few S3 Select behaviors) differ or are missing.
                For everything in this curriculum — buckets, keys, PUT/GET/LIST, Parquet over s3://, medallion layers — the
                mirror is exact. Just do not assume MinIO validates an obscure AWS IAM policy exactly as AWS would.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The deeper reason to test against the genuine protocol is that object-storage failure modes are
                emergent, not mockable: real LIST pagination, real multipart-upload assembly, real consistency semantics,
                real signing failures. A hand-rolled mock reproduces the happy path and hides exactly the behaviors that
                cause production incidents. MinIO gives you the real state machine, so an integration test can actually
                exercise &quot;what happens when a multipart upload is interrupted&quot; or &quot;does my code handle a
                paginated listing of 5000 keys.&quot;
              </p>
              <p>
                The residual risk is compatibility drift on the long tail of AWS behavior — which is why the mature setup
                is layered: unit tests against nothing, integration tests against MinIO in CI for protocol-level parity,
                and a small suite of smoke tests against a real AWS bucket in a staging account to catch the AWS-only
                edge cases. MinIO covers the 95% cheaply; a thin real-S3 layer covers the tail. Same reasoning you will
                apply to any &quot;real dependency vs stand-in&quot; testing decision.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="One config, two worlds">
          Keep endpoint, keys, and URL style in environment variables, never hard-coded. Then MinIO and AWS differ by a
          <code>.env</code> file: <code>S3_ENDPOINT=localhost:9000</code> locally, the AWS endpoint (and real IAM
          credentials) in production. The pipeline code never changes — the mark of code that treats object storage as the
          interface it is.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="MinIO vs AWS S3 vs a plain local folder">
        <p>
          For &quot;where do my lake files live during development,&quot; there are three honest choices. The axis is
          fidelity to production versus operational simplicity and cost.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Self-hosted MinIO (in Docker)',
              strengths: [
                'Real S3 API and semantics — code written here runs unchanged against AWS',
                'Free, offline, fast, deterministic — ideal for local dev and CI integration tests',
                'You control it fully: reset state, inspect internals, no cloud account needed',
              ],
              weaknesses: [
                'One more service to run (a container, a volume, a console) versus just a folder',
                'Not a 100% mirror of every AWS-only feature (some IAM, storage classes, replication differ)',
                'You operate it — in production, self-hosting object storage at scale is real work',
              ],
              chooseWhen: 'local development and CI where you want true S3 parity without cloud cost — the choice for this whole module.',
            },
            {
              name: 'AWS S3 (the real cloud service)',
              strengths: [
                'The genuine article — every AWS-specific behavior, at production scale and durability',
                'Fully managed: no servers, eleven-nines durability, integrates with the AWS ecosystem',
              ],
              weaknesses: [
                'Costs money (storage + requests + egress) and needs an account and network access',
                'Slower feedback loop; risk of leaking credentials or racking up a surprise bill while learning',
              ],
              chooseWhen: 'production, and a thin layer of staging smoke tests to catch AWS-only edge cases.',
            },
            {
              name: 'A plain local filesystem folder',
              strengths: [
                'Zero setup — read and write Parquet to a path, exactly what you did in 3.3.1',
                'Simplest possible thing for a quick experiment on one machine',
              ],
              weaknesses: [
                'Not object storage — no S3 API, no buckets/keys, no prefix-listing or consistency semantics',
                'Code learns filesystem habits (cheap rename, append) that break on a real bucket',
              ],
              chooseWhen: 'a throwaway local experiment where you never intend the code to touch a real object store.',
            },
          ]}
          note={
            <>
              The trap is the third option masquerading as the first: developing against a folder, then discovering in
              production that your code assumed cheap renames and directory listings that object storage does not provide.
              MinIO closes that gap for the price of one container — you learn the real interface locally, then production
              is a config change. Cheap dev fidelity now, no nasty surprise later.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: run MinIO, make a bucket, and query it from DuckDB over s3://">
        <Lab
          lessonId={ID}
          intro={
            <p>
              You will run MinIO in Docker with a named volume (so data survives restarts), create a{' '}
              <code>warehouse</code> bucket, upload a Parquet file, and then — the payoff — query it from Python + DuckDB
              using an <code>s3://</code> URL, exactly as you would against AWS. Docker Desktop must be running. Work in{' '}
              <code>C:\de-lab\minio-lab</code>.
            </p>
          }
          steps={[
            {
              title: 'Start MinIO with a named volume and the web console',
              body: (
                <>
                  <p>
                    This runs MinIO, exposes the S3 API on <code>9000</code> and the web console on <code>9001</code>, and
                    stores data in a Docker named volume <code>minio-data</code> (a pet-safe place, not the container&apos;s
                    disposable writable layer — the 3.1.1 rule). The default credentials are{' '}
                    <code>minioadmin</code>/<code>minioadmin</code>.
                  </p>
                  <CodeBlock
                    label="run MinIO (PowerShell — one line)"
                    code={`docker run -d --name minio -p 9000:9000 -p 9001:9001 -v minio-data:/data -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" minio/minio:RELEASE.2024-09-13T20-26-02Z server /data --console-address ":9001"`}
                  />
                </>
              ),
              commands: [{ ps: 'docker ps --filter name=minio' }],
              checkpoint: (
                <>
                  <code>docker ps</code> shows the <code>minio</code> container as <code>Up</code>, with ports{' '}
                  <code>9000</code> and <code>9001</code> mapped. Open <code>http://localhost:9001</code> in a browser and
                  log in with <code>minioadmin</code>/<code>minioadmin</code> — the MinIO console loads.
                </>
              ),
            },
            {
              title: 'Create the warehouse bucket',
              body: (
                <>
                  <p>
                    Two ways — pick one. Easiest is the web console: in <code>http://localhost:9001</code>, click{' '}
                    <strong>Buckets → Create Bucket</strong>, name it <code>warehouse</code>. Or use the{' '}
                    <code>mc</code> client from a throwaway container:
                  </p>
                  <CodeBlock
                    label="create bucket with mc (alternative to the console)"
                    code={`docker run --rm --network host --entrypoint sh minio/mc:latest -c "mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb local/warehouse && mc ls local"`}
                  />
                  <RevealSolution label="If --network host does not work (Docker Desktop on Windows)">
                    <p>
                      Docker Desktop&apos;s <code>--network host</code> is limited on Windows. Simplest fallback: just
                      create the bucket in the web console (Buckets → Create Bucket → <code>warehouse</code>). That is the
                      recommended path on Windows and needs no networking flags at all.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  A bucket named <code>warehouse</code> appears in the console&apos;s Buckets list (or <code>mc ls</code>{' '}
                  prints <code>warehouse/</code>). It is empty — a bucket with no objects, the prefix illusion from 3.3.1
                  starting from nothing.
                </>
              ),
            },
            {
              title: 'Make a Parquet file and set up the Python project',
              body: (
                <>
                  <p>Create the project, add DuckDB, and write a small Parquet file to upload. Save as <code>make_parquet.py</code>:</p>
                  <CodeBlock
                    label="make_parquet.py"
                    code={`import duckdb

con = duckdb.connect()
con.sql("""
    CREATE OR REPLACE TABLE trips AS
    SELECT
      i AS trip_id,
      ['london','paris','berlin','rome'][1 + i % 4] AS city,
      round(6 + (i * 29) % 40 + 0.5, 2) AS fare
    FROM range(20) t(i)
""")
con.sql("COPY trips TO 'trips.parquet' (FORMAT PARQUET)")
print("wrote trips.parquet:", con.sql("SELECT count(*) FROM 'trips.parquet'").fetchone()[0], "rows")`}
                  />
                </>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\minio-lab; cd C:\\de-lab\\minio-lab\nuv init --bare\nuv add duckdb\nuv run python make_parquet.py',
                  bash: 'mkdir -p ~/de-lab/minio-lab && cd ~/de-lab/minio-lab\nuv init --bare\nuv add duckdb\nuv run python make_parquet.py',
                },
              ],
              checkpoint: (
                <>Prints <code>wrote trips.parquet: 20 rows</code>; a <code>trips.parquet</code> file exists in the project.</>
              ),
            },
            {
              title: 'Upload the object to the bucket',
              body: (
                <p>
                  Upload <code>trips.parquet</code> into the <code>warehouse</code> bucket. Easiest: in the console, open
                  the <code>warehouse</code> bucket and click <strong>Upload → Upload File</strong>, choose{' '}
                  <code>trips.parquet</code>. (Or use <code>mc cp</code> if your <code>mc</code> alias worked above.) After
                  upload, the key is <code>trips.parquet</code> — no folder, just a key in the bucket.
                </p>
              ),
              checkpoint: (
                <>
                  The console&apos;s <code>warehouse</code> bucket now lists one object, <code>trips.parquet</code>, with
                  its size shown. You have PUT a whole object into a real S3-compatible store.
                </>
              ),
            },
            {
              title: 'The payoff: query the bucket from DuckDB over s3://',
              body: (
                <>
                  <p>
                    Now read the object <em>without downloading it first</em> — DuckDB&apos;s httpfs streams it straight
                    from MinIO. Save as <code>query_s3.py</code>:
                  </p>
                  <CodeBlock
                    label="query_s3.py"
                    code={`import duckdb

con = duckdb.connect()
con.sql("INSTALL httpfs; LOAD httpfs;")
con.sql("SET s3_endpoint = 'localhost:9000';")
con.sql("SET s3_access_key_id = 'minioadmin';")
con.sql("SET s3_secret_access_key = 'minioadmin';")
con.sql("SET s3_use_ssl = false;")
con.sql("SET s3_url_style = 'path';")      # MinIO needs path style

rows = con.sql("""
    SELECT city, count(*) AS trips, round(sum(fare), 2) AS revenue
    FROM read_parquet('s3://warehouse/trips.parquet')
    GROUP BY city ORDER BY revenue DESC
""").fetchall()
print("rows returned from s3://:", len(rows))
for r in rows:
    print("  ", r)`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python query_s3.py' }],
              checkpoint: (
                <>
                  Prints <code>rows returned from s3://: 4</code> followed by the four city aggregates. That result came
                  from a real object store over the S3 API — the identical <code>read_parquet</code> call you ran in the
                  browser, now against <code>s3://warehouse/trips.parquet</code>. Swap the endpoint and keys for AWS and
                  this exact script runs against the cloud.
                </>
              ),
            },
            {
              title: 'Prove the named volume survives a restart',
              body: (
                <p>
                  Stop and remove the container, start a fresh one with the same volume, and re-query. Because state lives
                  in <code>minio-data</code> (not the container&apos;s writable layer), the object is still there.
                </p>
              ),
              commands: [
                {
                  ps: 'docker rm -f minio\ndocker run -d --name minio -p 9000:9000 -p 9001:9001 -v minio-data:/data -e "MINIO_ROOT_USER=minioadmin" -e "MINIO_ROOT_PASSWORD=minioadmin" minio/minio:RELEASE.2024-09-13T20-26-02Z server /data --console-address ":9001"',
                },
                { ps: 'uv run python query_s3.py' },
              ],
              checkpoint: (
                <>
                  After destroying and recreating the container, <code>query_s3.py</code> still returns 4 rows —{' '}
                  <code>trips.parquet</code> survived because it lived on the named volume. Container disposable, data
                  durable: the 3.1.1 rule, proven on your lake.
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
              q: 'What is MinIO, in one sentence?',
              options: [
                'A managed AWS service that is cheaper than S3',
                'An open-source, S3-compatible object store you run yourself (e.g. in Docker) that speaks the same S3 API as AWS',
                'A Python library that mocks S3 responses for unit tests',
                'A columnar file format like Parquet',
              ],
              answer: 1,
              explain:
                'MinIO implements the real S3 API, so S3 clients (aws CLI, DuckDB httpfs, boto3, Spark) work against it by only changing the endpoint URL. It is a real object store, not a mock and not a file format.',
            },
            {
              q: 'You have a working DuckDB script reading s3:// from MinIO. What must change to run it against real AWS S3?',
              options: [
                'The read_parquet call and the whole query must be rewritten',
                'Essentially just the config: the endpoint (drop/replace it) and the credentials — the query and read_parquet stay the same',
                'You must switch from Parquet to a different file format',
                'Nothing works — MinIO scripts cannot run against AWS',
              ],
              answer: 1,
              explain:
                'That is the entire point of an S3-compatible store: parity. Endpoint + credentials (and URL style) are the config surface; the object-store commands and queries are identical. Code once, switch worlds by config.',
            },
            {
              q: 'A DuckDB query works against AWS S3 but fails against MinIO on localhost. The classic cause is:',
              options: [
                'MinIO cannot read Parquet',
                'Wrong addressing style — MinIO needs path style (localhost:9000/bucket/key), not virtual-host style (bucket.host); set s3_url_style = path',
                'MinIO requires the files to be CSV',
                'The AWS CLI is incompatible with MinIO',
              ],
              answer: 1,
              explain:
                'You cannot resolve bucket.localhost as a host, so MinIO uses path-style addressing. Clients default to virtual-host style for AWS; telling them to use path style (SET s3_url_style = path in DuckDB) fixes the "works on AWS, fails on MinIO" error.',
            },
            {
              q: 'Why run MinIO locally instead of just reading/writing Parquet to a normal folder during development?',
              options: [
                'A folder is slower than MinIO',
                'Only MinIO can store Parquet files',
                'A folder is a filesystem, not object storage — you would learn filesystem habits (cheap rename, append, directory listing) that break on a real bucket; MinIO gives true S3 parity so prod is a config change',
                'There is no reason — a folder is always equivalent',
              ],
              answer: 2,
              explain:
                'The folder trap: code developed against a filesystem assumes semantics object storage does not provide. MinIO exposes the real S3 API and semantics locally, so what you build runs unchanged on AWS — dev/prod parity for the price of one container.',
            },
            {
              q: 'In the lab, the MinIO container was started with -v minio-data:/data. Why does the uploaded object survive docker rm -f and a fresh container?',
              options: [
                'Docker automatically backs up containers to the cloud',
                'The object lives on a named volume (minio-data), which is outside the container’s disposable writable layer, so destroying the container does not touch it',
                'MinIO re-downloads the object from AWS on restart',
                'The object was stored in the image',
              ],
              answer: 1,
              explain:
                'Named volumes live outside the layer stack (the 3.1.1 rule). State a database or object store must keep goes on a volume; the container itself stays disposable. Same volume, new container, data intact.',
            },
            {
              q: 'What is a fair statement about MinIO’s S3 compatibility?',
              options: [
                'It reproduces 100% of every AWS-only feature and behavior',
                'It faithfully mirrors the core S3 API (buckets, keys, PUT/GET/LIST, multipart, presigned URLs) — enough for dev and CI — but some AWS-only features (certain IAM, storage classes, replication) differ or are absent',
                'It only supports reading, not writing',
                'It is a mock that never runs the real S3 protocol',
              ],
              answer: 1,
              explain:
                'MinIO runs the genuine S3 protocol, which is why it is a fixture in CI, but it is a high-fidelity mirror, not a total one. The mature pattern: integration-test against MinIO for the 95%, plus a thin real-AWS smoke suite for the long-tail edge cases.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Why would a team run MinIO in local development and CI instead of pointing everything at real S3?',
            a: (
              <p>
                Cost, speed, and hermetic reproducibility with real S3 semantics. MinIO is a genuine S3-compatible store,
                so integration tests exercise real listing, multipart uploads, and consistency behavior — things a mock
                hides — but for free, offline, and deterministic in CI. The pipeline code is written against the S3 API
                once; production is the same code with a different endpoint and real credentials. You avoid both the cost
                and the credential/bill risk of hammering AWS from every developer laptop and CI run, and you keep
                dev/prod drift near zero.
              </p>
            ),
          },
          {
            q: 'A colleague’s ingestion works against AWS S3 but fails against your local MinIO. Where do you look first?',
            a: (
              <p>
                Addressing style and endpoint config. MinIO on localhost needs path-style addressing
                (host:9000/bucket/key) because you cannot resolve bucket.localhost as a virtual host; clients that default
                to virtual-host style for AWS must be switched to path style (s3_url_style=path in DuckDB, addressing_style
                in boto3). Then verify the endpoint URL points at MinIO, SSL is off for plain-HTTP localhost, and the
                access/secret keys and (ignored-but-required) region are set. Nearly every "works on AWS, fails on MinIO"
                bug is one of those.
              </p>
            ),
          },
          {
            q: 'How do you configure a client (DuckDB, boto3, aws CLI) to talk to an S3-compatible store, and how do credentials flow?',
            a: (
              <p>
                Three facts: endpoint URL, access key, secret key (plus URL style and SSL flag). In DuckDB you SET
                s3_endpoint / s3_access_key_id / s3_secret_access_key / s3_use_ssl / s3_url_style; in the AWS CLI you pass
                --endpoint-url and read keys from env or config; boto3 takes endpoint_url and a config object. Credentials
                should come from environment variables or a secrets manager, never hard-coded — every request is signed
                with AWS SigV4 from that key pair. Keeping endpoint and keys in env vars is what lets the same code target
                MinIO or AWS by config alone.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>MinIO is an open-source, S3-compatible object store you run yourself (one Docker container); it speaks the real S3 API, so S3 clients work against it by changing only the endpoint.</>,
          <>Three clients, same three facts (endpoint, access key, secret key): mc (MinIO’s CLI, best for admin), aws s3 (proves compatibility), and DuckDB httpfs (reads Parquet straight from s3:// — your daily driver).</>,
          <>Reading Parquet is one read_parquet call; going from a local file to MinIO changes only the path (to an s3:// URL) plus a few SET lines for endpoint, keys, SSL, and URL style.</>,
          <>MinIO on localhost needs path-style addressing (host/bucket/key), not virtual-host style — the classic "works on AWS, fails on MinIO" bug; fix with s3_url_style = path.</>,
          <>The value is dev/prod parity: build and test against real S3 semantics locally and in CI (free, offline, deterministic), then ship the same code to AWS by changing config. Keep endpoint and keys in env vars.</>,
          <>MinIO is a faithful mirror, not a total one: some AWS-only features (certain IAM, storage classes, replication) differ — cover the 95% with MinIO, the long tail with a thin real-AWS smoke suite.</>,
        ]}
      />
    </>
  )
}
