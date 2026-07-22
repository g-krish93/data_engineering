import { Section } from '../../../components/Section'
import { Tiered } from '../../../components/Tiered'
import { Callout } from '../../../components/Callout'
import { Tradeoffs } from '../../../components/Tradeoffs'
import { Lab } from '../../../components/Lab'
import { Quiz } from '../../../components/Quiz'
import { InterviewAngle } from '../../../components/InterviewAngle'
import { KeyTakeaways } from '../../../components/KeyTakeaways'
import { GlossaryTerm } from '../../../components/GlossaryTerm'
import { CodeRunner } from '../../../components/CodeRunner'
import { BTreeViz } from '../../../viz/BTreeViz'

const ID = '2.2.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Without an index, every question reads everything">
        <Tiered
          layman={
            <>
              <p>
                A 900-page textbook with no index: “what page covers photosynthesis?” means reading the whole book,
                every time. Add the index — a few sorted pages mapping topic to page number — and you flip to
                “photosynthesis, p. 412” and jump. The book didn’t change; a small <em>side structure</em> made
                lookups hundreds of times faster.
              </p>
              <p>
                The paper phone book adds the second idea: it is <em>sorted</em>. Hunting “Miller”, you never start at
                page 1 — you flip straight to the M’s and narrow in a few flips. Sortedness turns “check everything”
                into “home in fast”. Databases bottle exactly that trick; the bottle is called a B-tree.
              </p>
            </>
          }
          student={
            <>
              <p>
                A Postgres table is a <em>heap</em>: rows in 8 KB pages, in no useful order. Run{' '}
                <code>SELECT * FROM users WHERE id = 654321</code> against a bare heap and the engine has one move — a{' '}
                <strong>sequential scan</strong>: every page, every row, O(n) I/O. Harmless at a thousand rows; on a
                busy <GlossaryTerm k="oltp">OLTP</GlossaryTerm> system with a hundred million, an outage.
              </p>
              <p>
                An <strong>index</strong> is a separate sorted structure maintained beside the table: a map from key
                value to <em>row location</em> (in Postgres, a tuple ID — page number plus offset). Sorted means
                navigable instead of scannable; the stored location means one final hop fetches the row. The price is
                paid on every write — this module’s arc: build the structure here, read plans in 2.2.2, design index
                sets in 2.2.3, count the cost in 2.2.4.
              </p>
            </>
          }
          phd={
            <>
              <p>
                An access method answers point queries (key = v) and range queries (k1 ≤ key ≤ k2) under updates. The
                constraint that shaped everything: storage is read in fixed-size pages, and touching a page dwarfs
                comparing keys in memory — the metric is <em>page reads</em>, not comparisons. Bayer and McCreight’s
                B-tree (1972) optimizes exactly that, and it is still the default index in Postgres, InnoDB, Oracle,
                SQL Server, and SQLite fifty-plus years on.
              </p>
              <p>
                Keep both regimes in view: heap scan is Θ(n) page reads; B-tree search is O(log<sub>f</sub> n) with
                fanout f in the hundreds — a practical constant of 3–4. Assigned reading:{' '}
                <em>Designing Data-Intensive Applications</em> ch. 3, the storage-engine half (append-only log up to
                B-trees and LSM-trees). Read it after 2.2.2; it lands harder once you have seen real plans.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="the structure" title="The B-tree: wide, shallow, balanced">
        <BTreeViz />
        <Callout kind="tip" title="Drive the tree — do not just look at it">
          Click <em>insert</em> until you witness a <strong>split</strong>: a node overflows past 3 keys, breaks in
          two, and pushes its middle key up a level. Then search <code>61</code> and watch the descent light up level
          by level — count the visits. Search <code>50</code>: absent, and <em>proven</em> absent in as few visits.
        </Callout>
        <Tiered
          layman={
            <>
              <p>
                It is a self-organizing phone book. The bottom row of boxes holds entries in sorted order; every box
                above holds only <em>signposts</em> — “below 42 go left, 42 and up go right”. Start at the top, follow
                signposts down, and any key is two or three hops away.
              </p>
              <p>
                The clever part is growth: a too-full box splits in two and its middle key moves <em>up</em> as a new
                signpost; if the top box splits, the tree gains a new top level. Growing at the top keeps every path
                the same length — that is “balanced”, automatically, forever.
              </p>
            </>
          }
          student={
            <>
              <p>
                Map the toy to the real thing: each node is one 8 KB page. Internal nodes hold separator keys and
                child pointers; leaves hold keys plus row locations. The viz fits 3 keys per node so you can watch it
                think — a real page holds <em>hundreds</em>, so the tree is enormously wide and therefore shallow.
              </p>
              <p>
                Inserts descend to the right leaf and land in sorted position; a full leaf splits and promotes its
                middle key; a root split is the only way height grows. Consequences to memorize: the tree is{' '}
                <strong>always balanced</strong> (worst case = average case), and the leaf level holds{' '}
                <strong>all keys in sorted order</strong> — the fact range queries will ride.
              </p>
            </>
          }
          phd={
            <>
              <p>
                What engines actually build is the <strong>B+ tree</strong>: internal nodes carry only routing keys;
                all values live in leaves. That fattens internal fanout (shallower tree) and enables the killer
                feature — <strong>sibling links</strong> chaining the leaves, so a range scan descends once and walks
                the leaf chain without re-entering upper levels. Postgres’s nbtree is a Lehman–Yao variant (high keys,
                right-links) keeping concurrent descents nearly lock-free.
              </p>
              <p>
                Page realities: leaves default to ~90% <em>fill factor</em> so near-future inserts amend in place
                rather than split; deletes are lazy (vacuum reclaims, pages rarely merge). Insert order matters too:
                sorted input packs ~90% with tidy rightmost splits; random order averages ~67–70% — foreshadowing
                2.2.4’s UUID story.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="the arithmetic" title="Why a billion rows costs four page reads">
        <Tiered
          layman={
            <>
              <p>
                It is twenty-questions, supercharged. Each yes/no halves the possibilities, so 20 questions
                distinguish a million things. A node with hundreds of signposts cuts by <em>hundreds</em> per hop: one
                hop narrows a billion to millions, the next to thousands, the third to a handful, the fourth lands
                exactly.
              </p>
              <p>
                Four page touches versus a billion rows — the trick is just a logarithm with a huge base. Run the
                calculator below and watch how lazily hop count grows as tables explode.
              </p>
            </>
          }
          student={
            <>
              <p>
                Height = ceil(log<sub>fanout</sub> n). At fanout ≈ 500: a thousand rows in 2 levels, a million in 3,
                a billion in 4. Better: the root and internal levels are tiny and hot, so they sit in the buffer cache
                — a “4 page read” lookup is often 1 real read (the leaf), or 0. Hence sub-millisecond indexed lookups
                at any table size.
              </p>
              <p>
                Two facts complete the model. <strong>Primary keys index themselves</strong>: PRIMARY KEY (and
                UNIQUE) constraints build a unique B-tree automatically — your most important index is usually one
                you never typed. And <strong>range scans ride sorted
                order</strong>: for <code>id BETWEEN 500000 AND 500999</code> the engine descends once to 500000 and
                walks sorted leaves sideways to 500999 — one descent plus a short sequential walk, not a thousand
                descents. The same trick serves prefixes and ORDER BY, which 2.2.3 exploits deliberately.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The economics underneath: on spinning disks a random page read costs a seek (~5–10 ms) while
                sequential streaming runs 100+ MB/s, so the goal was minimizing distinct page touches — B-trees
                achieve it near-optimally. SSDs cut random reads to ~50–100 microseconds but do not dethrone the
                structure: I/O stays page-granular and locality still pays. What SSDs really changed is the planner’s
                random-to-sequential cost ratio — the <code>random_page_cost</code> knob you meet in 2.2.2.
              </p>
              <p>
                Why not a hash index — O(1) beats O(log n)? Hashing destroys order by design: it answers key = v and
                nothing else — no ranges, prefixes, or ORDER BY. Postgres ships hash indexes (crash-safe since v10);
                their honest niche is equality on long keys. Versatility wins: default vs footnote. DDIA ch. 3
                formalizes the whole trade space.
              </p>
            </>
          }
        />
        <CodeRunner
          language="sql"
          label="the logarithm that runs the industry"
          code={`-- Worst-case page reads to find one key, fanout 500 per node.
SELECT n AS table_rows,
       CAST(ceil(ln(n) / ln(500)) AS INTEGER) AS page_reads
FROM (VALUES (1000), (1000000), (1000000000), (1000000000000)) AS t(n);
-- Edit me: drop the fanout to 4 (the toy viz) or 2 (a binary tree).`}
        />
      </Section>

      <Section kicker="trade-offs" title="B-tree vs hash vs no index at all">
        <Tradeoffs
          options={[
            {
              name: 'B-tree index',
              strengths: [
                'Equality, ranges, prefixes, ORDER BY — one structure serves all',
                '3–4 page touches for billions of rows; sorted leaves make range scans near-sequential',
              ],
              weaknesses: [
                'Every INSERT/UPDATE/DELETE must maintain the tree (lesson 2.2.4)',
                'Real disk space — often a large fraction of the table itself',
              ],
              chooseWhen: 'selective lookups or ranges on large, frequently-queried OLTP tables — the default.',
            },
            {
              name: 'Hash index',
              strengths: ['O(1) point lookups, no descent', 'Compact entries for long keys (stores the hash)'],
              weaknesses: [
                'Equality only — useless for ranges, prefixes, sorting',
                'B-tree matches it closely even on pure equality; niche in practice',
              ],
              chooseWhen: 'pure equality on long text/UUID keys, measured to actually win.',
            },
            {
              name: 'No index (full scan)',
              strengths: [
                'Zero write overhead, storage, or maintenance',
                'A tiny table scans in one page read; bulk scans are what analytics engines do best',
              ],
              weaknesses: [
                'Point lookups cost O(n) — unusable on big OLTP tables',
                'Cost grows linearly and silently with the table',
              ],
              chooseWhen: 'tables of a few hundred rows, or analytical reads touching most rows anyway.',
            },
          ]}
          note={
            <>
              The third column is a preview: <GlossaryTerm k="olap">OLAP</GlossaryTerm> engines like DuckDB skip
              B-trees mostly on purpose — scans with min/max pruning beat index-hopping when queries touch millions
              of rows. Module 2.3 makes that case; 2.2.4 shows the write-cost half.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: measure the 1000x">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Build a million-row table in the <code>pg-lab</code>{' '}
              <GlossaryTerm k="container">container</GlossaryTerm> from module 2.1, time a point lookup on the bare
              heap, add an index, time it again. Record both numbers — the table stays for 2.2.2–2.2.4.
            </p>
          }
          steps={[
            {
              title: 'Start the container and connect',
              commands: [{ ps: 'docker start pg-lab\ndocker exec -it pg-lab psql -U postgres' }],
              checkpoint: <>You are at the <code>postgres=#</code> prompt. Everything below is typed there.</>,
            },
            {
              title: 'Build a 1,000,000-row synthetic table',
              body: (
                <p>
                  <code>generate_series</code> is Postgres’s row factory: unique usernames, a 0–999 score, a 95/5
                  status split, a timestamp climbing one second per row (all reused through lesson 2.2.4).
                </p>
              ),
              commands: [
                {
                  ps: `DROP TABLE IF EXISTS bench_users;
CREATE TABLE bench_users AS
SELECT g AS id,
       'user_' || g AS username,
       (g * 37) % 1000 AS score,
       CASE WHEN g % 20 = 0 THEN 'inactive' ELSE 'active' END AS status,
       timestamp '2026-01-01' + make_interval(secs => g) AS created_at
FROM generate_series(1, 1000000) AS g;
SELECT count(*) FROM bench_users;`,
                  label: 'psql',
                },
              ],
              checkpoint: <><code>count</code> prints <code>1000000</code> — roughly 80 MB of heap pages written.</>,
            },
            {
              title: 'Time a point lookup with no index',
              commands: [
                {
                  ps: `\\timing on
SELECT * FROM bench_users WHERE id = 654321;
SELECT * FROM bench_users WHERE id = 654321;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  <code>\timing</code> makes psql print a <code>Time:</code> line — tens to a couple hundred
                  milliseconds here. <strong>Write the second run’s number down</strong> (the first warms the cache).
                  To find one row, Postgres checked all million.
                </>
              ),
            },
            {
              title: 'Create the index',
              commands: [
                {
                  ps: `CREATE INDEX bench_users_id_idx ON bench_users (id);
\\di bench_users*`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  <code>\di</code> lists <code>bench_users_id_idx</code> — a three-level tree over a million keys.
                  Note the CREATE took a moment: one full read-and-sort, paid once, so no query pays it again.
                </>
              ),
            },
            {
              title: 'Time the same lookup with the index',
              commands: [
                {
                  ps: `SELECT * FROM bench_users WHERE id = 654321;
SELECT * FROM bench_users WHERE id = 654321;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  Same row, but <code>Time:</code> is now well under a millisecond. Divide your two recorded numbers
                  — expect roughly 100x to 1000x. That ratio is this module in one number.
                </>
              ),
            },
            {
              title: 'Watch a range scan ride the sorted leaves',
              commands: [
                {
                  ps: `SELECT count(*) FROM bench_users WHERE id BETWEEN 500000 AND 500999;
SELECT count(*) FROM bench_users WHERE score = 500;`,
                  label: 'psql',
                },
              ],
              checkpoint: (
                <>
                  Both return 1000, but the <code>id</code> range takes about a millisecond (one descent, then a leaf
                  walk) while <code>score</code> takes seq-scan time — no index there. Bonus proof that PKs index
                  themselves: <code>CREATE TABLE pk_demo (id int PRIMARY KEY);</code> then <code>\d pk_demo</code> —
                  an index you never asked for. Leave <code>bench_users</code> and its index in place.
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
              q: 'What is a database index, structurally?',
              options: [
                'A compressed copy of the whole table',
                'A cache holding results of recent queries',
                'A separate sorted structure mapping key values to row locations',
                'A constraint that validates data before insert',
              ],
              answer: 2,
              explain: 'The heap stays as-is; the index is a sorted side structure pointing at row locations.',
            },
            {
              q: 'Why does finding one key among a billion take only ~4 page reads?',
              options: [
                'The entire index is always held in RAM',
                'Each node holds hundreds of keys, so every hop divides the search space by hundreds',
                'Rows are stored physically next to their index entries',
                'The database remembers where nearby keys were found last time',
              ],
              answer: 1,
              explain:
                'Height is a logarithm with base = fanout; base-500 log of a billion is about 4. Caching helps further, but the guarantee comes from fanout, not RAM.',
            },
            {
              q: 'A B-tree node overflows during an insert. What happens?',
              options: [
                'The tree adds a new level at the bottom for the extra key',
                'The node splits and its middle key is promoted to the parent',
                'The insert is rejected until vacuum frees space',
                'The whole index is rebuilt in the background',
              ],
              answer: 1,
              explain: 'Splits push keys upward; only a root split adds a level — so every leaf stays at the same depth.',
            },
            {
              q: 'Which query can a hash index NOT accelerate?',
              options: [
                "WHERE email = 'a@b.com'",
                'WHERE id = 42',
                "WHERE created_at BETWEEN '2026-01-01' AND '2026-02-01'",
                "WHERE session_token = 'abc123'",
              ],
              answer: 2,
              explain: 'Hashing scrambles keys deliberately — ranges need the sorted order hashes destroy.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What actually happens when Postgres runs WHERE id = 42 with, and without, an index?',
            a: (
              <p>
                Without: a sequential scan — every heap page, every row, O(n) however few match. With: descend the
                B-tree root to leaf (3–4 page touches, upper levels cached), take the tuple ID, fetch one heap page.
                Strong answers name the two cost regimes and note the primary key already built the index.
              </p>
            ),
          },
          {
            q: 'Why B-trees instead of binary search trees or hash maps?',
            a: (
              <p>
                Storage is page-granular, so cost = page reads. A binary tree does one comparison per page touch (~20
                I/Os for a million rows); a B-tree packs hundreds of keys per page, collapsing that to 3–4. A hash map
                destroys ordering, killing ranges, prefixes, and ORDER BY. The B-tree alone is both shallow on disk
                and sorted.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>An index is a sorted side structure mapping key → row location; the table stays an unordered heap.</>,
          <>
            B-trees are wide (hundreds of keys per page), shallow (3–4 levels for billions of rows), and
            self-balancing — splits promote keys upward, so every leaf sits at the same depth. Lookup cost is a
            logarithm with base = fanout: effectively constant. Your lab measured roughly 100–1000x.
          </>,
          <>
            Range scans descend once then walk sorted leaves — one structure serves equality, ranges, prefixes, and
            ORDER BY. Hash indexes serve equality only; PRIMARY KEY and UNIQUE build their B-trees automatically.
          </>,
          <>
            No index is a valid choice: tiny tables and scan-everything analytics don’t benefit — and every index
            taxes every write (2.2.4 measures the tax).
          </>,
        ]}
      />
    </>
  )
}
