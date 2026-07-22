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
import { CodeBlock } from '../../../components/CodeBlock'
import { CollectionsViz } from '../../../viz/CollectionsViz'

const ID = '1.1.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="A dataset in Python IS a list of dicts">
        <Tiered
          layman={
            <>
              <p>Last lesson you handled single values — one price, one city. Real data comes in stacks: a thousand orders, a million sensor readings. Think of a filing cabinet: each <em>folder</em> is one record, with labeled fields inside — customer, amount, date. The <em>drawer</em> holds the folders in order. That is the whole mental model: drawer of folders, folders of labeled facts.</p>
              <p>Python gives you four containers, each answering a different question. A <strong>list</strong> keeps things in order ("give me the third one"). A <strong>dict</strong> labels things ("give me the one called price"). A <strong>set</strong> answers membership instantly ("have I seen this city before?"). A <strong>tuple</strong> is a list that refuses to change — a sealed folder. Combine them and you can model any dataset you will ever meet.</p>
            </>
          }
          student={
            <>
              <p>The punchline up front: in working Python, a table of data is a <strong>list of dicts</strong>. Each dict is one row — keys are column names, values are fields. Every tool you meet later formalizes this same shape: a CSV parsed row by row, a JSON API response, a database query result, a pandas DataFrame, a Spark dataset — all "an ordered collection of keyed records" in different costumes. The keys shared across rows form an implicit <GlossaryTerm k="schema">schema</GlossaryTerm>.</p>
              <p>So this is not Python trivia — it is the data shapes of every future <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>. Master four operations and you can sketch any transformation: iterate a list, look up a dict key, test set membership, unpack a tuple. The lab has you doing filter, dedup, and group-count on weather data — the same three verbs you will later write in SQL, pandas, and Spark.</p>
            </>
          }
          phd={
            <>
              <p>All four containers hold <em>references</em>, never inline values — a list of a million ints is a growable array of a million pointers plus a million int objects. That indirection is the price of "anything can hold anything", and why plain Python collections cost roughly an order of magnitude more memory than a typed array. Phase 4's columnar formats (Arrow, Parquet) exist precisely to strip this overhead — same logical list-of-records, radically different physical layout.</p>
              <p>The performance-defining distinction is access pattern: <code>list</code> is a contiguous dynamic array — O(1) index, O(n) search; <code>dict</code> and <code>set</code> are open addressing hash tables — expected O(1) lookup <em>regardless of size</em>. That phrase is the one to sit with; the visualization below makes it visceral, and the mechanics get their own tier further down.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="list and tuple: ordered data">
        <Tiered
          layman={
            <>
              <p>A list is the drawer: items sit in order, each with a position number. Python counts from zero — position 0 is the first item, which trips everyone exactly once. Negative positions count from the end: -1 is the last item. A <em>slice</em> pulls a range of positions out at once.</p>
              <p>A tuple is a drawer welded shut at the factory: read forever, change never. Why want that? The same reason forms have printed fields — some things are supposed to stay fixed, and a container that physically cannot change is a promise no bug can break.</p>
            </>
          }
          student={
            <>
              <CodeRunner
                language="python"
                code={`temps = [21.5, 23.1, 19.8, 25.0, 22.4]   # a list: ordered, mutable

print(temps[0], temps[-1])     # first and last (zero-based!)
print(temps[1:3])              # slice: index 1 up to (not including) 3
print(len(temps), sum(temps) / len(temps))

temps.append(20.9)             # lists grow in place
temps[0] = 21.6                # and edit in place
print(sorted(temps))           # sorted() returns a NEW list
print(temps)                   # ...the original is untouched`}
              />
              <p>Tuples: same indexing, zero mutation. Their superpowers are <em>unpacking</em> into named variables and serving as dict keys (lists cannot, precisely because they can change):</p>
              <CodeRunner
                language="python"
                code={`point = (12.97, 77.59)       # a tuple: (latitude, longitude)
lat, lon = point             # unpacking -- clean and idiomatic
print(lat, lon)

# point[0] = 0.0             # uncomment: TypeError. Sealed means sealed.

# Tuples can be dict keys because they cannot change:
city_by_coords = {(12.97, 77.59): "Bengaluru", (13.08, 80.27): "Chennai"}
print(city_by_coords[(13.08, 80.27)])`}
              />
            </>
          }
          phd={
            <>
              <p>CPython's list is a dynamic array that over-allocates on growth (~12.5% headroom), so <code>append</code> is amortized O(1): most appends land in spare capacity, and the occasional reallocate-and-copy is paid off across the cheap ones — the same amortization argument returns when log-structured storage engines batch writes in Phase 4. Inserting at the front shifts every element (O(n)), hence the idiom: build by appending, then sort or reverse.</p>
              <p>Slicing copies references, not objects: <code>temps[1:3]</code> is a new list whose slots point at the same objects. And tuple immutability is shallow for the same reason — the tuple's slots are frozen, but a mutable object referenced by a slot can still be mutated through any label. Immutability in Python is a property of the container, never a deep freeze.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="dict and set: keyed data, instant answers">
        <Tiered
          layman={
            <>
              <p>A dict is a labeled folder: instead of "give me item number 3", you ask by name — "give me <em>temp_c</em>". This matches how humans think about records: nobody remembers that temperature is the second column; everyone remembers its name.</p>
              <p>A set is a guest list at a door: the only question it answers is "is this name on the list?" — but it answers instantly no matter how long the list is, and it refuses duplicates. Instant membership plus automatic dedup make it a specialist you will use constantly.</p>
            </>
          }
          student={
            <>
              <CodeRunner
                language="python"
                code={`row = {"city": "Chennai", "temp_c": 31.4, "humidity": 74}

print(row["city"], row["temp_c"])   # lookup by key
row["temp_c"] = 30.9                # update
row["wind_kph"] = 12.0              # add a new field

# Missing keys: [] crashes, .get() returns a default
# print(row["pressure"])            # uncomment: KeyError
print(row.get("pressure"))          # None
print(row.get("pressure", 1013.0))  # your chosen fallback

for key, value in row.items():      # iterate a record
    print(key, "=", value)`}
              />
              <CodeRunner
                language="python"
                code={`observations = ["Chennai", "Mumbai", "Chennai", "Delhi", "Mumbai", "Chennai"]

unique = set(observations)        # dedup in one call
print(len(observations), "observations from", len(unique), "cities")

print("Delhi" in unique)          # instant membership test
print("Kolkata" in unique)

unique.add("Kolkata")
unique.add("Chennai")             # already present: nothing happens
print(sorted(unique))`}
              />
              <p>The choice between <code>row["k"]</code> and <code>row.get("k")</code> is a real data decision: crash loudly on a missing field, or continue with a default? Lesson 1.1.5 builds a whole philosophy on that question.</p>
            </>
          }
          phd={
            <>
              <p>Both dict and set are open addressing hash tables: insertion hashes the key to a bucket in a sparse array; on collision, a probe sequence (perturbed by higher hash bits) walks to the next candidate slot; lookup replays the walk — expected O(1) with resizing keeping the load factor under 2/3. This is why keys must be hashable: mutate an object after using it as a key and its hash no longer matches its bucket — the entry becomes unfindable. Lists are unhashable to make that bug impossible.</p>
              <p>Two refinements. Since CPython 3.6/3.7, dicts store entries in a dense array with the sparse table holding indices — less memory and, as a guaranteed language feature, <em>insertion order preserved</em> (sets promise no such thing). And "expected O(1)" hides a tail: adversarial keys that all collide degrade to O(n), which is why Python randomizes string hashing per process — a real denial-of-service vector patched across every major language around 2012.</p>
            </>
          }
        />
        <p>Now watch the complexity difference instead of taking it on faith. The race below scans a list element by element while the dict jumps straight to its bucket:</p>
        <CollectionsViz />
      </Section>

      <Section kicker="core concepts" title="Nesting: rows, at last">
        <Tiered
          layman={
            <>
              <p>Containers hold containers. Put labeled folders (dicts) into a drawer (a list) and you have built the filing cabinet: a dataset. Every question you would ask of a spreadsheet — "which rows are hot?", "how many per city?" — becomes a short loop over that structure.</p>
              <p>Stare at this shape until it feels obvious: from here on, almost everything you build consumes or produces it.</p>
            </>
          }
          student={
            <>
              <CodeRunner
                language="python"
                code={`rows = [
    {"city": "Chennai", "temp_c": 31.4},
    {"city": "Mumbai", "temp_c": 29.0},
    {"city": "Delhi", "temp_c": 35.2},
    {"city": "Chennai", "temp_c": 30.1},
]

# filter: keep rows matching a condition
hot = []
for row in rows:
    if row["temp_c"] > 30:
        hot.append(row)
print("hot rows:", hot)

# project: pull one column out
cities = []
for row in rows:
    cities.append(row["city"])
print("city column:", cities)

# reach into nested data: list -> dict -> value
print("first row's city:", rows[0]["city"])`}
              />
              <p>Read <code>rows[0]["city"]</code> inside-out: index the list, then key into the dict. Chains like this are everyday Python; when one link surprises you (a missing key, an index past the end), you get lesson 1.1.5's subject — a traceback pointing at the exact link that failed.</p>
            </>
          }
          phd={
            <>
              <p>What you just wrote — filter and project over keyed records — is relational algebra by hand, and naming that connection pays off for two phases: SQL's <code>WHERE</code> is the filter loop, <code>SELECT city</code> is the projection loop, and Phase 2 is largely learning to declare these loops instead of writing them.</p>
              <p>Also note what this row-of-pointers layout costs: iterating <code>rows</code> touching only <code>temp_c</code> still drags every whole row through memory. Analytical engines flip the layout — each column stored contiguously — so a one-column scan reads only that column. That is <GlossaryTerm k="columnar-storage">columnar storage</GlossaryTerm>, the load-bearing idea of Phase 4, and you have just seen the exact inefficiency it exists to fix.</p>
            </>
          }
        />
        <Callout kind="tip" title="Say the shape out loud">
          When you meet unfamiliar data, narrate its shape before coding: "a list of dicts, each with keys city and temp_c, temp_c is a float". Ten seconds of narration prevents most of the bugs this module's later lessons are about — and doing it aloud in interviews reads as seniority.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="Which container, when?">
        <Tradeoffs
          options={[
            {
              name: 'list',
              strengths: [
                'Preserves order and duplicates — it IS the dataset shape',
                'O(1) access by position; natural to iterate; amortized O(1) append',
              ],
              weaknesses: [
                '"Is X in here?" scans everything — O(n) per question',
                'Finding by content means writing a loop every time',
              ],
              chooseWhen: 'order matters or you will iterate everything anyway — i.e., for the rows themselves.',
            },
            {
              name: 'dict',
              strengths: [
                'O(1) lookup by meaningful key, at any size',
                'The natural shape for one record and for keyed aggregates (counts, indexes)',
                'Guaranteed insertion order since Python 3.7',
              ],
              weaknesses: [
                'More memory than a list (hash table overhead)',
                'Keys must be hashable; one value per key — duplicates need explicit handling',
              ],
              chooseWhen: 'you look things up by name/ID more than you iterate — records, indexes, accumulators.',
            },
            {
              name: 'set',
              strengths: [
                'O(1) membership tests and automatic deduplication',
                'Set algebra (union, intersection, difference) for comparing datasets',
              ],
              weaknesses: [
                'No order, no duplicates, no values attached — membership only',
                'Elements must be hashable',
              ],
              chooseWhen: 'the question is "have I seen this?" or "what is in A but not B?".',
            },
          ]}
          note={
            <>Tuple vs list is a different axis: not performance but <em>contract</em>. A tuple says "this is a fixed-shape value — coordinates, a (key, value) pair — not a growing collection." Reaching for a tuple when nothing should change turns a category of bugs into immediate, loud <code>TypeError</code>s. Cheap insurance; take it.</>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: filter, dedup, and count real-shaped data">
        <Lab
          lessonId={ID}
          intro={
            <p>In <code>python-lab</code> you will model ten weather records as a list of dicts, then perform the three verbs of data work: filter rows, dedup cities, count per city. Same verbs, bigger data, for the rest of your career.</p>
          }
          steps={[
            {
              title: 'Create weather.py',
              body: (
                <>
                  <p>In VS Code (<code>code C:\de-lab\python-lab</code> if it is not open), create <code>weather.py</code>:</p>
                  <CodeBlock
                    label="weather.py"
                    code={`# weather.py -- a tiny dataset, in the shape all datasets take
rows = [
    {"city": "Chennai",  "temp_c": 31.4, "rain_mm": 0.0},
    {"city": "Mumbai",   "temp_c": 29.0, "rain_mm": 12.5},
    {"city": "Delhi",    "temp_c": 35.2, "rain_mm": 0.0},
    {"city": "Chennai",  "temp_c": 30.1, "rain_mm": 2.0},
    {"city": "Kolkata",  "temp_c": 27.8, "rain_mm": 8.1},
    {"city": "Mumbai",   "temp_c": 28.5, "rain_mm": 20.3},
    {"city": "Delhi",    "temp_c": 36.0, "rain_mm": 0.0},
    {"city": "Chennai",  "temp_c": 29.9, "rain_mm": 0.5},
    {"city": "Pune",     "temp_c": 24.6, "rain_mm": 4.2},
    {"city": "Delhi",    "temp_c": 34.1, "rain_mm": 0.0},
]

# 1) FILTER: rows with temp_c >= 30
hot = []
for row in rows:
    if row["temp_c"] >= 30.0:
        hot.append(row)
print("hot rows:", len(hot))

# 2) DEDUP: distinct cities via a set
cities = set()
for row in rows:
    cities.add(row["city"])
print("distinct cities:", sorted(cities))

# 3) COUNT BY: rows per city with a plain dict accumulator
counts = {}
for row in rows:
    city = row["city"]
    if city in counts:
        counts[city] += 1
    else:
        counts[city] = 1
print("rows per city:", counts)`}
                  />
                </>
              ),
              checkpoint: <>The file exists and VS Code shows no red squiggles.</>,
            },
            {
              title: 'Run it and verify by hand',
              commands: [{ ps: 'cd C:\\de-lab\\python-lab\nuv run python weather.py' }],
              checkpoint: <>Output shows <code>hot rows: 5</code>, five distinct cities, and per-city counts with Chennai and Delhi at 3 each. Count the ten rows yourself and confirm — verifying a computation against a hand count on tiny data is how professionals test pipelines before scaling them.</>,
            },
            {
              title: 'Extend it: rainy cities',
              body: <p>Add a fourth block computing the set of cities where <em>any</em> row has <code>rain_mm</code> above zero, and print it sorted. You have every tool: a loop, a condition, <code>set.add</code>.</p>,
              checkpoint: <>Running again prints exactly four rainy cities: Chennai, Kolkata, Mumbai, Pune. Delhi (dry in all three rows) is absent.</>,
            },
            {
              title: 'Break the accumulator, read the crash',
              body: <p>In the counts loop, delete the <code>if city in counts:</code> check and keep only <code>counts[city] += 1</code>. Run it. Read the error's last line, then restore the check.</p>,
              checkpoint: <>You saw <code>KeyError: 'Chennai'</code> — incrementing a key that does not exist yet. You now know exactly why the membership check (or <code>.get</code>) is there, and you have met the exception lesson 1.1.5 dissects.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'You have 10 million user IDs and must repeatedly ask "is this ID present?". Best structure?',
              options: [
                'list — it preserves order',
                'set — O(1) membership regardless of size',
                'tuple — immutability makes lookups fast',
                'One giant string of IDs',
              ],
              answer: 1,
              explain:
                'Membership in a list scans element by element (O(n)); a set hashes straight to the answer. Immutability (tuple) has no effect on search speed — it is still a scan.',
            },
            {
              q: 'In the list-of-dicts dataset shape, one dict represents…',
              options: [
                'one column',
                'one row (a record: column names mapped to field values)',
                'the whole table',
                'the schema only, without data',
              ],
              answer: 1,
              explain:
                'Each dict is a row keyed by column names; the list holds rows in order. The shared keys across rows act as the implicit schema.',
            },
            {
              q: 'Why can a tuple be a dict key while a list cannot?',
              options: [
                'Tuples are faster to compare',
                'Lists are too large to hash',
                'Dict keys must be hashable, and a mutated key would break the table — tuples cannot mutate',
                'A historical accident kept for compatibility',
              ],
              answer: 2,
              explain:
                'A hash table finds a key by its hash. If a key mutated after insertion, its hash would no longer match its bucket and the entry would be lost. Banning mutable keys makes that bug impossible.',
            },
            {
              q: 'counts[city] += 1 raises KeyError on a city not seen before because…',
              options: [
                'dicts have a fixed size at creation',
                'it reads counts[city] first, and reading a missing key is an error',
                'strings cannot be dict keys',
                '+= only works on lists',
              ],
              answer: 1,
              explain:
                'Augmented assignment is read-then-write: the read fails on a missing key. Hence the accumulator idiom: check membership first, use .get(city, 0) + 1, or later, collections.Counter.',
            },
            {
              q: "row.get('pressure', 0.0) instead of row['pressure'] means…",
              options: [
                'the same thing, written fashionably',
                'return 0.0 instead of raising KeyError if the key is missing',
                'set pressure to 0.0 inside the dict',
                'delete the pressure key',
              ],
              answer: 1,
              explain:
                'get() never raises for a missing key — it returns your default and does NOT modify the dict. Whether silently defaulting is wise is a real data-quality decision, not a style choice.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'When would you use a list vs a dict vs a set in Python?',
            a: (
              <p>List for ordered sequences you iterate (rows); dict for lookup by meaningful key (records, indexes, accumulators); set for membership and dedup. The differentiator interviewers listen for is complexity — list membership is O(n), dict/set lookup expected O(1) via hashing — plus a concrete example, like deduping IDs with a set instead of a nested loop.</p>
            ),
          },
          {
            q: 'Why are Python dict lookups O(1), and when does that break down?',
            a: (
              <p>The key hashes to a bucket in a sparse table; collisions resolve by probing, and resizing keeps probe chains short — expected O(1). It degrades toward O(n) under adversarial collisions (mitigated by hash randomization) or a pathological custom <code>__hash__</code>. Mentioning insertion-order preservation since 3.7 signals current, not folkloric, knowledge.</p>
            ),
          },
          {
            q: 'Why choose an immutable structure like a tuple at all?',
            a: (
              <p>Immutability is a contract: fixed-shape values cannot be corrupted in passing, can serve as dict keys, and are safe to share without defensive copies. The strong follow-up: Python's immutability is shallow — a tuple's slots are frozen, but mutable objects referenced by those slots can still change.</p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>The dataset shape: a <strong>list of dicts</strong> — rows in order, fields by name. Everything later (CSV, JSON, SQL results, DataFrames) is this shape in costume.</>,
          <>list = order + iteration; dict = O(1) lookup by key; set = O(1) membership + dedup; tuple = sealed, fixed-shape value.</>,
          <>Choose by access pattern: iterate everything → list; fetch by name → dict; "seen it before?" → set.</>,
          <><code>row["k"]</code> crashes loudly on a missing field; <code>row.get("k", default)</code> continues quietly — a data-quality decision every time you make it.</>,
          <>The filter / dedup / count-by loops you wrote are the primitive verbs of all data work — SQL and Spark are largely declarative ways to say the same three things.</>,
        ]}
      />
    </>
  )
}
