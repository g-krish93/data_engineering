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

const ID = '3.3.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="The storage the whole lake sits on is not a filesystem">
        <p>
          You have written Parquet files to folders on your laptop and queried them back. In the real world those files
          live in <GlossaryTerm k="object-storage">object storage</GlossaryTerm> — Amazon S3, Google Cloud Storage,
          Azure Blob — not on a disk you can <code>cd</code> into. Object storage looks like a folder tree in the console,
          but it is not one, and the places where the illusion leaks are exactly the places pipelines break. This lesson
          is the mental model that everything else in the module — MinIO, the medallion layers, later Iceberg — is built
          on top of.
        </p>
        <Tiered
          layman={
            <>
              <p>
                Think of a giant coat check, the kind at a stadium. You hand over a coat and get a numbered ticket. You
                never see the racks in the back; you cannot walk in and rearrange them. To get your coat you present the
                ticket and the whole coat comes back. You cannot ask them to sew a button onto a coat that is already on
                the rack — you take the whole coat out, change it, and hand the whole thing back in.
              </p>
              <p>
                A filesystem on your laptop is the opposite: it is your own closet. You can open a drawer, tuck one sock
                into a corner, rename a shelf, edit the middle of a document in place. Object storage is the coat check —
                simpler, endless, cheap, run by someone else — but it will not let you reach into the middle of anything.
                That single difference shapes how every data lake is designed.
              </p>
            </>
          }
          student={
            <>
              <p>
                A filesystem gives you a hierarchical tree of directories and files, with in-place edits, appends, cheap
                renames, and POSIX semantics (seek, partial writes, file locks). Object storage gives you a flat
                key-to-blob map behind an HTTP API: you <code>PUT</code> a whole object under a key and <code>GET</code>
                the whole object back. No directories, no in-place edit, no cheap rename, higher per-request latency.
              </p>
              <p>
                That sounds like a downgrade, and locally it is. At scale it is why the{' '}
                <GlossaryTerm k="data-lake">data lake</GlossaryTerm> exists: object storage is effectively infinite,
                costs a few cents per GB-month, and — critically — is decoupled from any compute. Ten query engines can
                read the same bucket at once; you scale storage and compute independently. The price you pay is losing the
                filesystem conveniences, and the rest of this lesson is about what those losses actually cost you.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Object stores expose a small, deliberately weak interface — <code>PUT</code>, <code>GET</code>,{' '}
                <code>DELETE</code>, <code>LIST</code> (prefix scan), plus multipart upload for large objects — over HTTP.
                The weakness is the feature: no hierarchical inode tree, no rename syscall, no byte-range writes means the
                service can be a massively sharded, replicated key-value store with no single metadata bottleneck. Keys
                hash across partitions; there is no directory to lock. This is what buys eleven-nines durability and
                horizontal read throughput that a POSIX filesystem, with its centralized metadata and strict ordering
                guarantees, cannot match at exabyte scale.
              </p>
              <p>
                The cost surfaces precisely where table formats have to work hardest: no atomic rename means you cannot
                use the classic &quot;write to temp then rename into place&quot; commit trick that HDFS-era jobs relied on,
                which is the whole reason Iceberg, Delta, and Hudi maintain their own metadata/manifest logs to get atomic
                commits over a non-atomic store. Keep that thread in mind — it is the connective tissue from here to Phase
                4.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Buckets, keys, objects — and the flat namespace">
        <p>
          Sources on the left stream raw records; they land as whole objects in a bucket on the right. That landing zone
          — cheap, infinite, compute-independent — is the lake. Hover the stations:
        </p>
        <DataJourney
          source={{ label: 'SOURCES', blurb: 'App databases, APIs, event streams, CSV drops — systems constantly producing raw records.' }}
          transform={{ label: 'INGEST', blurb: 'A job that PUTs each batch as a whole object under a key. No in-place edits — every write is a full object.' }}
          warehouse={{ label: 'OBJECT STORE (LAKE)', blurb: 'A flat bucket of immutable objects, addressed by key. Effectively infinite, a few cents per GB-month, decoupled from any compute engine.' }}
          caption={<>Sources to lake. The bucket on the right is object storage: the cheap, endless floor the entire data lake is built on.</>}
        />
        <Tiered
          layman={
            <>
              <p>
                Three words. A <strong>bucket</strong> is a named container you own — like renting one numbered locker
                room. An <strong>object</strong> is one blob of data you store — a file, basically. A <strong>key</strong>{' '}
                is the object&apos;s full name inside the bucket, the label on it.
              </p>
              <p>
                Here is the twist that trips up everyone: a key like{' '}
                <code>raw/2026/01/trips.parquet</code> looks like it lives in a folder called <code>raw</code>, inside a
                folder called <code>2026</code>. It does not. The whole thing — slashes and all — is just one long name.
                There are no folders. The console <em>draws</em> folders by grouping names that share a beginning, the way
                a phone book pretends there are &quot;sections&quot; when really it is one long sorted list.
              </p>
            </>
          }
          student={
            <>
              <p>
                A bucket is a globally- or account-scoped namespace. An object is bytes plus metadata. A key is the
                object&apos;s unique string identifier within the bucket. The slashes in a key are ordinary characters — the
                namespace is <strong>flat</strong>: <code>raw/2026/01/trips.parquet</code> is not nested under anything;
                it is a single key that happens to contain slashes.
              </p>
              <p>
                What the console calls &quot;folders&quot; are{' '}
                <GlossaryTerm k="prefix">prefixes</GlossaryTerm>: a <code>LIST</code> request takes a prefix (
                <code>raw/2026/01/</code>) and a delimiter (<code>/</code>), and the service returns keys starting with
                that prefix, rolling up everything past the next delimiter into &quot;common prefixes&quot; that look like
                subfolders. There is no directory object, no <code>mkdir</code>, and an empty &quot;folder&quot; cannot
                exist — a prefix exists only as long as at least one key uses it. Say &quot;prefix&quot;, not
                &quot;folder&quot;, and you will reason correctly about listing cost and layout.
              </p>
            </>
          }
          phd={
            <>
              <p>
                <code>LIST</code> is a paginated prefix scan over a sorted keyspace, not a directory read. With a delimiter
                the service computes common prefixes server-side, but it still walks keys — listing a &quot;directory&quot;
                of N million objects is N million keys of work, paginated ~1000 per request. This is why lakes with too
                many small files are slow to <em>plan</em> before a single byte of data is read (the small-files problem
                you met in 2.5.3, now with its root cause: there is no directory index to consult, only a key scan).
              </p>
              <p>
                Because &quot;directories&quot; are synthesized, operations that are O(1) on a filesystem become O(objects)
                here: renaming a &quot;folder&quot; means copying every object under a prefix to new keys and deleting the
                old ones. Rename-heavy jobs (the Hadoop <code>_temporary</code> commit dance) that were nearly free on HDFS
                become the dominant cost on object storage — the direct motivation for metadata-based commit protocols in
                modern table formats.
              </p>
            </>
          }
        />
        <p>
          The store is genuinely just a map from key to bytes. Prove it to yourself: this Python simulates an object store
          as a dict, and &quot;listing a folder&quot; is nothing but filtering keys by prefix.
        </p>
        <CodeRunner
          language="python"
          label="an object store is a flat dict; folders are a prefix filter"
          code={`# An object store: one flat map from key -> bytes. There are NO directories.
store = {}                       # key "bucket-path/name" -> object bytes

def put(key, data):
    store[key] = data            # whole-object write; replaces any existing object

def list_prefix(prefix):
    # "Opening a folder" is just: which keys start with this string?
    return sorted(k for k in store if k.startswith(prefix))

# The slashes are ordinary characters in one long name -- not nested folders.
put("lake/raw/2026/01/trips-0001.parquet", b"row1row2")
put("lake/raw/2026/01/trips-0002.parquet", b"row3row4")
put("lake/raw/2026/02/trips-0003.parquet", b"row5row6")
put("lake/curated/trips.parquet",          b"cleaned")

print("LIST prefix 'lake/raw/2026/01/':")
for k in list_prefix("lake/raw/2026/01/"):
    print("   ", k)

# There is no rename. To 'move' an object you COPY it, then DELETE the original.
src, dst = "lake/curated/trips.parquet", "lake/gold/trips.parquet"
store[dst] = store[src]          # copy: rewrites the whole object under a new key
del store[src]                   # delete the old key
print("after rename = copy + delete, LIST 'lake/gold/':", list_prefix("lake/gold/"))

# There is no partial append. You cannot add one byte in place: you must PUT
# the WHOLE new object. Even this += builds a new bytes value and re-stores it.
before = store["lake/gold/trips.parquet"]
store["lake/gold/trips.parquet"] = before + b"+onemorerow"   # a full re-PUT
print("append really means: read all, change, write ALL back ->",
      store["lake/gold/trips.parquet"])`}
        />
      </Section>

      <Section kicker="core concepts" title="Objects are immutable wholes: no append, no cheap rename">
        <Tiered
          layman={
            <>
              <p>
                Back to the coat check. Two rules follow from &quot;you only ever hand in or take out a whole coat.&quot;
                First, you cannot add a button to a coat on the rack — you take the whole coat out, add the button, hand
                the whole coat back. Second, there is no &quot;move to a different rack&quot; button; the staff make a
                copy on the new rack and throw the old one away.
              </p>
              <p>
                So writing is all-or-nothing per object, and moving is really copy-then-delete. Annoying for tiny edits —
                but it makes the coat check dead simple and impossible to corrupt halfway, which is the trade being made.
              </p>
            </>
          }
          student={
            <>
              <p>
                Objects are immutable at the whole-object level. There is no byte-range write, no in-place append, no
                truncate. To &quot;change&quot; an object you <code>PUT</code> a complete new version under the same key,
                which atomically replaces the old bytes. To &quot;append a row&quot; to a Parquet file you must read it,
                add the row, and write the entire file back — which is why lakes append by writing <em>new files</em>
                rather than growing existing ones.
              </p>
              <p>
                &quot;Rename&quot; and &quot;move&quot; are not primitives either. They decompose into <code>COPY</code>
                (server-side, but still a full data copy that you pay for) followed by <code>DELETE</code>. For one object
                that is a minor cost; for a &quot;directory&quot; of a million objects it is a million copies plus a
                million deletes — the operation that quietly dominates the runtime of naive lake jobs. This immutability is
                also why the append-only bronze layer (lesson 3.3.3) is a natural fit for object storage: never edit,
                always add.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Whole-object PUT gives read-your-writes atomicity for free: a reader sees either the old object or the new
                one, never a torn write, because there is no partial-update path to tear. That atomicity is per key only —
                there is no cross-key transaction, no way to atomically swap two objects — which is exactly the gap table
                formats fill with a single atomic metadata pointer swap that flips many data files live at once.
              </p>
              <p>
                Multipart upload is the one apparent exception and proves the rule: a large object is uploaded in parts,
                but nothing is visible until the final <code>CompleteMultipartUpload</code> call assembles them into one
                immutable object — the parts are not an appendable file, they are a staging protocol for a single
                whole-object PUT. Even S3&apos;s newer append capability is bounded and not the general random-write
                interface a filesystem offers; the immutable-whole-object model remains the design center.
              </p>
            </>
          }
        />
        <Callout kind="tip" title="The rule that flows from immutability">
          Lakes never edit files; they add files (and later delete or compact them). Every design you meet in this module
          — append-only bronze, new-file-per-batch ingestion, compaction jobs, Iceberg snapshots — is a consequence of
          &quot;objects are immutable wholes, and rename is copy+delete.&quot;
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Metadata, and the consistency you can (now) rely on">
        <Tiered
          layman={
            <>
              <p>
                Each coat on the rack comes with a little tag: what it is made of, when it arrived, a fingerprint so staff
                can tell two identical-looking coats apart. That tag is metadata — information <em>about</em> the object
                that rides along with it.
              </p>
              <p>
                And a fairness promise: the moment the staff take your coat and hand you the ticket, if you immediately
                ask for it back, you get it — no &quot;come back in a minute, it hasn&apos;t reached the rack yet.&quot;
                Modern coat checks make that promise. Older ones sometimes did not, and people built elaborate habits
                around the wait. Knowing which promise you have changes how you write your pipelines.
              </p>
            </>
          }
          student={
            <>
              <p>
                Every object carries metadata: size, last-modified time, content-type, an <code>ETag</code> (usually an
                MD5-ish content fingerprint), plus arbitrary user-defined key/value tags. This is what lets tools detect
                changes, verify integrity, and route objects without opening them — and it is stored and served far more
                cheaply than reading the object itself.
              </p>
              <p>
                On <strong>consistency</strong>: since December 2020, Amazon S3 provides{' '}
                <GlossaryTerm k="strong-consistency">strong read-after-write consistency</GlossaryTerm> for all
                operations — <code>PUT</code> a new object and an immediate <code>GET</code> or <code>LIST</code> always
                sees it; overwrite an object and every subsequent read sees the new version. Historically S3 was only{' '}
                <GlossaryTerm k="eventual-consistency">eventually consistent</GlossaryTerm> for these, and a read right
                after a write could return the old object or a 404 — a real source of &quot;my file isn&apos;t there yet&quot;
                bugs that whole libraries existed to paper over. Modern S3 and MinIO are strongly consistent, so you can
                mostly stop worrying — but interview questions and old codebases still assume the eventual model.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Pre-2020 S3 offered read-after-write consistency for new-object PUTs in most regions but only eventual
                consistency for overwrite PUTs, DELETEs, and — most painfully — LIST-after-PUT: a freshly written key
                could be invisible to a subsequent LIST for an unbounded (if usually short) window. This is why
                Hadoop-era commit protocols and tools like S3Guard bolted a strongly-consistent metadata store (DynamoDB)
                alongside S3 to get a reliable listing; the file layout on S3 could not be trusted as the source of truth
                for &quot;which files exist.&quot;
              </p>
              <p>
                The 2020 move to strong consistency (achieved without a performance or availability tax, via internal
                metadata coordination) removed that entire class of workaround — but it does <em>not</em> give you atomic
                multi-object operations or a consistent snapshot across many keys. A LIST is still not a point-in-time
                view of the whole bucket; concurrent writers can produce a listing that reflects some writes and not
                others. That residual gap — per-key strong consistency, no multi-key isolation — is precisely the seam
                Iceberg&apos;s manifest-based snapshots close, and it is the reason a table format, not raw object listing,
                should define &quot;the set of files in this table.&quot;
              </p>
            </>
          }
        />
        <Callout kind="warn" title="A gotcha that still bites at scale">
          Strong consistency fixed &quot;is my object visible yet.&quot; It did not fix &quot;is my LIST a clean snapshot
          of the table.&quot; Two jobs writing and deleting files in the same prefix can hand a reader a listing that is
          internally inconsistent. Never let raw <code>LIST</code> define a table&apos;s file set for a job that must be
          correct — that is a table format&apos;s job (Phase 4).
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Object storage vs a filesystem vs HDFS">
        <p>
          &quot;Store the data in files&quot; has three very different meanings, and the lake picked one on purpose. The
          axis is cost and scale versus the convenience of rich file operations and low latency.
        </p>
        <Tradeoffs
          options={[
            {
              name: 'Object storage (S3 / GCS / MinIO)',
              strengths: [
                'Effectively infinite and cheap (~cents/GB-month); pay only for what you store and request',
                'Storage fully decoupled from compute — many engines read the same bucket, scale independently',
                'Eleven-nines durability, no servers to run, strong read-after-write consistency today',
              ],
              weaknesses: [
                'No in-place edit or append; no cheap rename (copy+delete); higher per-request latency',
                'LIST is a key scan, so millions of small objects are slow and costly to plan over',
                'No cross-object atomic operations — needs a table format for transactional correctness',
              ],
              chooseWhen: 'the storage layer of any modern data lake or lakehouse — the default, and what the rest of this module uses.',
            },
            {
              name: 'POSIX block/file storage (local disk, NAS, EBS)',
              strengths: [
                'Rich semantics: in-place edits, appends, byte-range writes, atomic rename, file locks',
                'Very low latency; every tool understands a normal filesystem path',
              ],
              weaknesses: [
                'Coupled to a machine or a mounted volume — capacity is bounded and hard to share widely',
                'Scaling and durability are your problem; not built for many engines reading petabytes concurrently',
              ],
              chooseWhen: 'a single machine or tightly-coupled cluster, databases, or anything needing real file semantics and low latency.',
            },
            {
              name: 'HDFS (Hadoop Distributed File System)',
              strengths: [
                'Distributed, replicated, with real directories and cheap atomic rename (the old commit trick works)',
                'Data-locality-aware — compute scheduled near the blocks it reads',
              ],
              weaknesses: [
                'Storage and compute coupled: you scale (and pay for) a cluster of machines together',
                'A NameNode metadata bottleneck; heavy to operate; being displaced by object storage for lakes',
              ],
              chooseWhen: 'legacy on-prem Hadoop estates; rarely the choice for a new lake in 2026.',
            },
          ]}
          note={
            <>
              The lake won on economics and decoupling: object storage lets you keep petabytes cheaply and point any
              number of engines at it, which is worth losing cheap rename and in-place append. Those losses did not vanish
              — they moved up a layer, into the table formats (Iceberg, Delta) that re-create atomic commits and
              consistent file sets on top of a &quot;dumb,&quot; cheap, immutable store. Coarse cheap floor below, smart
              metadata above.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: write a prefix tree with DuckDB, then read it back by glob">
        <Lab
          lessonId={ID}
          intro={
            <p>
              No MinIO yet — that is the next lesson. Here you use tools you already have (<code>uv</code> + DuckDB) to
              build a local folder tree that mirrors exactly how objects sit under prefixes in a bucket:{' '}
              <code>city=.../*.parquet</code>. You will see the &quot;directories&quot; that partitioning creates, then
              query the whole tree back through one glob pattern — the same read pattern an engine uses against a real
              bucket. Work in <code>C:\de-lab\lake-lab</code>.
            </p>
          }
          steps={[
            {
              title: 'Set up the lab folder and DuckDB',
              body: (
                <p>
                  Create the project and add DuckDB to a fresh <code>uv</code> environment. (If a previous lab already has
                  DuckDB, <code>uv add</code> is a no-op.)
                </p>
              ),
              commands: [
                {
                  ps: 'mkdir C:\\de-lab\\lake-lab; cd C:\\de-lab\\lake-lab\nuv init --bare\nuv add duckdb',
                  bash: 'mkdir -p ~/de-lab/lake-lab && cd ~/de-lab/lake-lab\nuv init --bare\nuv add duckdb',
                },
              ],
              checkpoint: (
                <>
                  <code>uv add duckdb</code> reports it installed a duckdb package; a <code>pyproject.toml</code> now lists
                  duckdb as a dependency.
                </>
              ),
            },
            {
              title: 'Write a partitioned Parquet dataset — a prefix tree on disk',
              body: (
                <>
                  <p>
                    Save this as <code>write_lake.py</code>. It seeds ~24 rides across four cities and writes them{' '}
                    <em>partitioned by city</em>, so DuckDB creates one &quot;directory&quot; per city value — exactly the{' '}
                    <code>city=london/</code> prefix layout a real bucket would show:
                  </p>
                  <CodeBlock
                    label="write_lake.py"
                    code={`import duckdb

con = duckdb.connect()
con.sql("""
    CREATE OR REPLACE TABLE rides AS
    SELECT
      i AS ride_id,
      ['london','paris','berlin','rome'][1 + i % 4] AS city,
      round(5 + (i * 37) % 60 + 0.25, 2) AS amount
    FROM range(24) t(i)
""")
con.sql("""
    COPY rides TO 'lake'
    (FORMAT PARQUET, PARTITION_BY (city), OVERWRITE_OR_IGNORE)
""")
print("wrote partitioned dataset under .\\\\lake")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python write_lake.py' }],
              checkpoint: (
                <>
                  Prints <code>wrote partitioned dataset under .\lake</code>. A <code>lake</code> folder now exists in the
                  project.
                </>
              ),
            },
            {
              title: 'See the prefix layout that partitioning created',
              body: (
                <p>
                  List the tree recursively. Each <code>city=...</code> folder is a prefix; the <code>.parquet</code> file
                  inside it is an object. In a bucket these would be keys like{' '}
                  <code>lake/city=london/data_0.parquet</code> — the folders are the same illusion.
                </p>
              ),
              commands: [
                {
                  ps: 'Get-ChildItem -Recurse .\\lake | Select-Object FullName',
                  bash: 'find lake -type f',
                },
              ],
              checkpoint: (
                <>
                  You see four <code>city=london</code>, <code>city=paris</code>, <code>city=berlin</code>,{' '}
                  <code>city=rome</code> folders, each holding one <code>.parquet</code> file — four data files total. The
                  column value is literally encoded in the folder name.
                </>
              ),
            },
            {
              title: 'Read the whole tree back through one glob',
              body: (
                <>
                  <p>
                    An engine does not open folders one by one — it hands the store a glob and reads every matching object.
                    Save as <code>read_lake.py</code>:
                  </p>
                  <CodeBlock
                    label="read_lake.py"
                    code={`import duckdb

con = duckdb.connect()
# One glob matches every object under every city= prefix.
total = con.sql(
    "SELECT count(*) FROM read_parquet('lake/**/*.parquet')"
).fetchone()[0]
print("rows across all prefixes:", total)

# hive_partitioning recovers 'city' from the folder name -- it is not stored
# inside the files, it lives in the key/prefix itself.
by_city = con.sql("""
    SELECT city, count(*) AS n
    FROM read_parquet('lake/**/*.parquet', hive_partitioning = true)
    GROUP BY city ORDER BY city
""").fetchall()
print("per prefix:", by_city)`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python read_lake.py' }],
              checkpoint: (
                <>
                  Prints <code>rows across all prefixes: 24</code> and a per-city breakdown of 6 rows each. Note{' '}
                  <code>city</code> was recovered from the folder name, not read from inside the files — proof the
                  &quot;directory&quot; carries information.
                </>
              ),
            },
            {
              title: 'Feel copy+delete: there is no cheap rename',
              body: (
                <>
                  <p>
                    &quot;Rename a folder&quot; on an object store is copy-every-object then delete-every-object. Simulate
                    it with <code>rename_lake.py</code>: rewrite the dataset under a new top-level prefix, then remove the
                    old one.
                  </p>
                  <CodeBlock
                    label="rename_lake.py"
                    code={`import duckdb

con = duckdb.connect()
# The "copy" half of a rename: rewrite every object under a new prefix.
con.sql("""
    COPY (SELECT * FROM read_parquet('lake/**/*.parquet', hive_partitioning = true))
    TO 'curated' (FORMAT PARQUET, PARTITION_BY (city), OVERWRITE_OR_IGNORE)
""")
print("copied lake -> curated (every object rewritten)")`}
                  />
                  <RevealSolution label="Why this is the honest simulation">
                    <p>
                      On your local filesystem <code>Rename-Item lake curated</code> would be instant — one metadata edit.
                      On an object store there is no such operation: the client must <code>COPY</code> each object to a new
                      key and <code>DELETE</code> the old key. For four files it is trivial; for four million it is the job.
                      Re-writing then deleting, as below, mirrors what actually happens over the wire.
                    </p>
                  </RevealSolution>
                </>
              ),
              commands: [
                {
                  ps: 'uv run python rename_lake.py\nRemove-Item -Recurse -Force .\\lake',
                  bash: 'uv run python rename_lake.py\nrm -rf lake',
                },
                {
                  ps: 'Get-ChildItem -Recurse .\\curated | Measure-Object | Select-Object Count',
                  bash: 'find curated -type f | wc -l',
                },
              ],
              checkpoint: (
                <>
                  <code>curated</code> now holds four Parquet files (the copy); <code>lake</code> is gone (the delete). The
                  &quot;rename&quot; moved every byte — exactly the cost model that makes rename-heavy lake jobs slow, and
                  the reason bronze layers append rather than reorganize.
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
              q: 'In object storage, what is the key "raw/2026/01/trips.parquet"?',
              options: [
                'A file named trips.parquet nested inside real directories raw, 2026, and 01',
                'A single object name (key) in a flat namespace; the slashes are ordinary characters, and the "folders" are just prefixes',
                'A pointer to a directory inode',
                'An invalid key — slashes are not allowed in keys',
              ],
              answer: 1,
              explain:
                'The namespace is flat: the whole string is one key. Consoles synthesize "folders" by grouping keys on a delimiter, but there is no directory object, no mkdir, and no empty folder. Reasoning in "prefixes" keeps listing cost and layout correct.',
            },
            {
              q: 'You need to add one row to an existing 200 MB Parquet object in a bucket. What actually happens?',
              options: [
                'The store appends the row to the end of the object in place',
                'You cannot append in place — you read the object, add the row, and PUT the whole ~200 MB object back (lakes instead just write a new file)',
                'The store edits the middle of the object with a byte-range write',
                'The object is automatically split so only the new row is written',
              ],
              answer: 1,
              explain:
                'Objects are immutable wholes: no in-place append, no byte-range write. Any change is a full-object PUT that atomically replaces the old bytes. This is exactly why lakes append by writing new files rather than growing existing ones.',
            },
            {
              q: 'Why is "rename this folder of a million objects" an expensive operation on object storage?',
              options: [
                'Renames require a paid support ticket',
                'There is no rename primitive: it decomposes into a COPY (full data copy) plus a DELETE for every object under the prefix',
                'The store locks the whole bucket during a rename',
                'Renames are free — the question is wrong',
              ],
              answer: 1,
              explain:
                'No cheap rename exists. Move = copy + delete, per object. One object is trivial; a million objects is a million copies and a million deletes — the cost that dominates naive lake jobs and motivated metadata-based commits in table formats.',
            },
            {
              q: 'A teammate says "S3 might not show my file right after I write it, so add a retry loop." For a brand-new object on modern S3, is that needed?',
              options: [
                'Yes — S3 is always eventually consistent, so new objects can be invisible for minutes',
                'No — since Dec 2020 S3 gives strong read-after-write consistency; a GET/LIST right after a PUT of a new object always sees it (the advice describes the old, pre-2020 behavior)',
                'Yes — object storage never guarantees a written object can be read back',
                'It depends on the file size',
              ],
              answer: 1,
              explain:
                'Modern S3 (and MinIO) are strongly read-after-write consistent for all operations, so that retry loop is legacy folklore. It does NOT follow that a LIST is an atomic snapshot of the whole table, though — that gap still needs a table format.',
            },
            {
              q: 'What is the single biggest reason data lakes are built on object storage instead of a POSIX filesystem or HDFS?',
              options: [
                'Object storage has the lowest per-request latency',
                'Object storage supports the richest file operations (in-place edit, cheap rename)',
                'Cheap, effectively-infinite storage decoupled from compute — many engines read the same bucket and you scale storage and compute independently',
                'Object storage guarantees cross-object atomic transactions out of the box',
              ],
              answer: 2,
              explain:
                'The win is economics + decoupling: cents per GB-month, near-infinite capacity, and storage separate from compute. The price is losing cheap rename/append and cross-object atomicity — losses that table formats re-solve one layer up.',
            },
            {
              q: 'What does a LIST request against a bucket prefix actually do?',
              options: [
                'Reads a directory index that the store maintains for O(1) folder access',
                'Performs a paginated scan over the sorted keyspace for keys starting with the prefix — so millions of small objects are slow and costly to enumerate',
                'Opens and reads every matching object to build the list',
                'Returns instantly regardless of how many objects share the prefix',
              ],
              answer: 1,
              explain:
                'There is no directory index — LIST is a prefix scan over sorted keys, paginated (~1000/request). That is why a prefix holding millions of tiny files is expensive to plan over before any data is read: the small-files problem at the namespace level.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How is object storage different from a filesystem, and why does the data lake use it?',
            a: (
              <p>
                A filesystem is a hierarchical tree with in-place edits, appends, byte-range writes, and atomic rename. An
                object store is a flat key-to-blob map behind an HTTP API: whole-object PUT/GET, no directories (just
                prefixes), no in-place edit or append, no cheap rename (copy+delete), higher latency. The lake chooses it
                for economics and decoupling — cents per GB-month, near-infinite capacity, and storage fully separated
                from compute so many engines read the same bucket and scale independently. The losses (rename, append,
                cross-object atomicity) are re-solved by table formats layered on top.
              </p>
            ),
          },
          {
            q: 'Why are "directories" on S3 a fiction, and when does that bite?',
            a: (
              <p>
                Keys live in a flat namespace; the console draws folders by grouping keys on the "/" delimiter, but no
                directory object exists. It bites in two places: listing a prefix is a scan over sorted keys (paginated
                ~1000 at a time), so millions of small files are slow and costly to enumerate before any data is read; and
                renaming or moving a "folder" is copy-then-delete for every object under it, which dominates the runtime of
                rename-heavy jobs. Both are why table formats keep their own file manifests instead of trusting LIST.
              </p>
            ),
          },
          {
            q: 'What consistency does S3 give you today, and what does it still not give you?',
            a: (
              <p>
                Since December 2020, S3 is strongly read-after-write consistent for all operations — PUT a new object or
                overwrite one, and every subsequent GET and LIST sees the latest version, no eventual-consistency window.
                What it still does not give you is cross-object atomicity or a point-in-time snapshot across many keys: a
                LIST can reflect some concurrent writers and not others. So per-key reads are safe, but "the set of files
                in this table" must be defined by a table format's metadata, not by a raw bucket listing.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Object storage is a flat key-to-blob map behind an HTTP API (PUT/GET/DELETE/LIST), not a filesystem: no directories, only buckets, keys, and objects.</>,
          <>The slashes in a key are ordinary characters; "folders" are prefixes the console synthesizes on a delimiter. Say prefix, not folder, and listing cost and layout make sense.</>,
          <>Objects are immutable wholes: no in-place edit, no append, no cheap rename. Change = full-object PUT; move = COPY + DELETE per object — which is why lakes add files instead of editing them.</>,
          <>LIST is a scan over sorted keys, so a prefix of millions of small files is slow and costly to plan over — the small-files problem seen at the namespace level.</>,
          <>Modern S3 and MinIO are strongly read-after-write consistent (the old eventual-consistency window is gone), but there is still no cross-object atomicity or consistent multi-key snapshot.</>,
          <>The lake chose object storage for cheap, infinite, compute-decoupled storage; the lost conveniences (rename, append, transactions) are re-created one layer up by table formats.</>,
        ]}
      />
    </>
  )
}
