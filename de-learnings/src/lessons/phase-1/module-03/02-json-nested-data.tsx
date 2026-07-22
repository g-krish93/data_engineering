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

const ID = '1.3.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="APIs speak JSON; warehouses want rows">
        <Tiered
          layman={
            <>
              <p>Picture opening your mail and finding an envelope. Inside is a letter — and another envelope. Inside that one: a list of three more envelopes, each holding a card. JSON is data shipped exactly like that: containers inside containers, as deep as the sender felt like nesting them. Wonderfully flexible for the sender, mildly maddening for you — because before anything can be filed into a neat cabinet of drawers (a table with rows and columns), every envelope must be opened in the right order without tearing anything.</p>
              <p>This lesson is envelope-opening practice: reading nested data safely, and flattening it into tidy identical rows — because rows are what every database, spreadsheet, and chart ultimately wants.</p>
            </>
          }
          student={
            <>
              <p>Nearly every API you will ingest from — including Open-Meteo in project P1 — returns JSON: nested objects and arrays mapping directly onto Python dicts and lists via <code>json.loads</code>. But analytical storage is tabular. So a huge fraction of real ingestion code is one transformation, repeated forever: <strong>nested document in, flat rows out</strong>. The skills: navigating nesting without crashing on absent keys, reshaping structures like parallel arrays into row dicts, and writing rows out as JSON Lines — one object per line — the de facto file format between pipeline stages.</p>
              <p>The failure modes are predictable: a <code>KeyError</code> at 3 a.m. because one record lacked an optional field; types drifting because JSON has no integer-vs-float discipline; and memory blowups from loading a giant document when you should have streamed lines. All three are covered here.</p>
            </>
          }
          phd={
            <>
              <p>JSON (RFC 8259) is deliberately minimal, and its sharp edges are numeric. The spec puts no bounds on number size or precision, but interoperability is de facto governed by IEEE 754 doubles: JavaScript consumers silently round integers beyond 2^53, which is why Twitter's API famously ships <code>id</code> and <code>id_str</code> side by side. Python parses integers arbitrarily large but decimals as floats — <code>0.1</code> arrives already rounded; use <code>parse_float=Decimal</code> when money is involved. Duplicate keys are another spec hole: names "should" be unique, and Python resolves duplicates silently, last one wins — with real security history in parser-differential attacks.</p>
              <p>Architecturally, JSON is a <em>wire</em> format: self-describing, human-readable, schema-optional, row-at-a-time — ideal at system boundaries. It is a poor <em>storage</em> format: keys repeated per record, no types, no compression-friendly layout, no column pruning. That is why pipelines land JSON but store <GlossaryTerm k="columnar-storage">columnar</GlossaryTerm> (Parquet, Phase 2). For documents too large for memory, streaming parsers like <code>ijson</code> yield events from an incremental SAX-style parse — but the pipeline answer is usually simpler: insist on JSON Lines, where streaming is just file iteration.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Parsing and navigating without crashing">
        <Tiered
          layman={
            <>
              <p>Opening the outer envelope is one line: <code>json.loads(text)</code> hands you Python objects — dictionaries for labeled containers, lists for numbered ones. Getting at anything means walking the path: "inside <em>hourly</em>, take <em>time</em>, take the first item".</p>
              <p>The trap is assuming an envelope is always there. Senders omit things: an optional field, an empty day, a field renamed since the docs were written. Grabbing confidently (<code>doc['daily']</code>) crashes when it is missing; asking politely (<code>doc.get('daily')</code>) hands back "nothing" and lets you decide. Good pipeline code asks politely at uncertain doors — and crashes on purpose at doors that must exist.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><code>json.loads(text)</code> parses; <code>json.dumps(obj)</code> serializes. Mapping: object to dict, array to list, number to int/float, <code>true/false/null</code> to <code>True/False/None</code>.</li>
                <li><strong>KeyError discipline:</strong> use <code>d['key']</code> for fields that <em>must</em> exist — a loud crash on malformed input is correct at an ingestion boundary. Use <code>d.get('key', default)</code> only for genuinely optional fields. Blanket <code>.get</code> everywhere is how silent Nones corrupt a table.</li>
                <li><strong>Chained access:</strong> <code>(doc.get('daily') or {'{}'}).get('sunrise')</code> survives a missing intermediate level. The <code>or {'{}'}</code> matters because <code>.get</code> returns <code>None</code>, and <code>None.get</code> is its own crash.</li>
                <li><code>json.dumps(obj, indent=2)</code> is your debugging x-ray for unfamiliar payloads; <code>sort_keys=True</code> makes diffs stable.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>Hard-vs-soft access is really a contract question: which parts of the payload <GlossaryTerm k="schema">schema</GlossaryTerm> are you asserting, and which tolerating? Mature pipelines make the assertion explicit — validate the envelope against a declared schema (dataclasses, Pydantic, JSON Schema) at the boundary, then use plain <code>[]</code> access downstream because the shape is now guaranteed. Scattering <code>.get</code> through business logic is schema validation smeared into a thousand implicit, untestable decisions.</p>
              <p>Note also what <code>json.loads</code> costs: the whole document materializes as Python objects, with per-object overhead that can inflate a 100 MB file to several times that in RAM. That is the concrete reason JSON Lines wins for bulk data — the unit of parsing drops from the file to the line, restoring O(1) memory — and why streaming event parsers exist for the cases where one giant document is forced on you.</p>
            </>
          }
        />
        <p>A trimmed Open-Meteo-shaped payload — the exact shape P1 ingests. Run it, then change a key name and re-run to see loud-vs-quiet failures:</p>
        <CodeRunner
          language="python"
          code={`import json

payload = '''{
  "latitude": 52.52, "longitude": 13.41,
  "hourly_units": {"temperature_2m": "degC"},
  "hourly": {
    "time": ["2026-07-01T00:00", "2026-07-01T01:00", "2026-07-01T02:00"],
    "temperature_2m": [18.4, 17.9, 17.6]
  }
}'''

doc = json.loads(payload)
print(type(doc).__name__)                      # dict
print(doc['hourly']['time'][0])                # hard access: must exist
print(doc['hourly_units']['temperature_2m'])

# Optional fields: ask politely
print(doc.get('elevation'))                    # None, no crash
print((doc.get('daily') or {}).get('sunrise')) # survives missing level

# Hard access on a missing key fails loudly - RIGHT for required fields
try:
    doc['daily']
except KeyError as e:
    print('KeyError on required-but-missing:', e)`}
        />
      </Section>

      <Section kicker="core concepts" title="Flattening nested payloads, and JSON Lines">
        <Tiered
          layman={
            <>
              <p>Here is the odd thing about many API payloads: instead of 24 little cards each saying "time and temperature", you get one envelope holding a list of 24 times and a separate list of 24 temperatures, matched up by position — first with first, second with second. Flattening is doing that zip-up: one identical-shaped record per hour, each also stamped with the shared facts from the outer envelope (which city, which coordinates).</p>
              <p>And JSON Lines is just this: one complete record per line of a file, no outer envelope at all. To read a million records you read a million lines, one at a time — a stack of index cards instead of one giant scroll.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Parallel arrays to rows</strong> is a <code>zip</code>: pair element i of <code>time</code> with element i of <code>temperature_2m</code>, emit one dict per pair, and copy envelope-level context (latitude, longitude) into every row so each record stands alone downstream.</li>
                <li><strong>JSON Lines (.jsonl, ndjson):</strong> one <code>json.dumps(row)</code> per line. Append-friendly (a crashed job leaves a valid prefix), streamable (iterate the file handle — the 1.1.4 generator pattern), splittable for parallel processing, greppable. It is the standard interchange between pipeline stages, and what P1 lands before loading DuckDB.</li>
                <li>A whole-file JSON array (<code>[{'{...}'}, {'{...}'}]</code>) has none of those properties: not appendable (the closing bracket), not line-splittable, and it must parse entirely to yield the first record.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>Parallel arrays are not API laziness — they are a columnar encoding. Open-Meteo ships the payload column-oriented (compresses better, no repeated keys), and your flatten step is literally a column-to-row pivot. The inverse arrives in Phase 2: analytical engines immediately pivot rows back to columns for storage and vectorized execution. A pipeline is a chain of these transpositions, and knowing which orientation you hold at each stage is half of data engineering literacy.</p>
              <p>JSONL's splittability is the property distributed systems care about: any byte range can be locally realigned to the next newline, so files shard across workers with no coordination — the same property that made line-oriented formats native to MapReduce and log shipping. Its weakness is per-record schema drift: nothing stops line 5,000,001 from having new keys. Landing zones tolerate that; warehouses do not — hence the schema gate between them in every serious <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>.</p>
            </>
          }
        />
        <p>The P1 core move — flatten the nested payload into rows. This exact function ships in your project:</p>
        <CodeRunner
          language="python"
          code={`import json

payload = '''{
  "latitude": 52.52, "longitude": 13.41,
  "hourly": {
    "time": ["2026-07-01T00:00", "2026-07-01T01:00", "2026-07-01T02:00", "2026-07-01T03:00"],
    "temperature_2m": [18.4, 17.9, 17.6, 17.2],
    "relative_humidity_2m": [71, 74, 76, 78]
  }
}'''

def flatten(doc):
    h = doc['hourly']
    rows = []
    for ts, temp, rh in zip(h['time'], h['temperature_2m'], h['relative_humidity_2m']):
        rows.append({
            'ts': ts, 'temp_c': temp, 'rh_pct': rh,
            'latitude': doc['latitude'], 'longitude': doc['longitude'],
        })
    return rows

rows = flatten(json.loads(payload))
for r in rows:
    print(r)
print(len(rows), 'rows')`}
        />
        <p>And the JSONL round-trip: serialize line-by-line, then read back with a generator — constant memory at any scale:</p>
        <CodeRunner
          language="python"
          code={`import json
import io

rows = [
    {'ts': '2026-07-01T00:00', 'temp_c': 18.4},
    {'ts': '2026-07-01T01:00', 'temp_c': 17.9},
    {'ts': '2026-07-01T02:00', 'temp_c': 17.6},
]

# WRITE: one dumps() per line - no outer brackets, no commas between records
jsonl_text = ''
for r in rows:
    jsonl_text += json.dumps(r) + '\\n'
print(jsonl_text)

# READ: a generator that streams records one at a time (the 1.1.4 pattern)
def read_jsonl(fh):
    for line in fh:
        line = line.strip()
        if line:
            yield json.loads(line)

coldest = min(read_jsonl(io.StringIO(jsonl_text)), key=lambda r: r['temp_c'])
print('coldest hour:', coldest)`}
        />
        <Callout kind="warn" title="Floats and money">
          <code>json.loads('0.1')</code> gives a float that is not exactly 0.1 — fine for temperatures, unacceptable for currency. For money, parse with <code>parse_float=decimal.Decimal</code> or transport integer cents. Decide per field, on purpose, at the boundary.
        </Callout>
      </Section>

      <Section kicker="trade-offs" title="JSON vs CSV vs JSONL for pipeline interchange">
        <Tradeoffs
          options={[
            {
              name: 'JSON (single document)',
              strengths: [
                'Native to every HTTP API; nesting expresses real structure',
                'Self-describing keys; human-readable for debugging',
              ],
              weaknesses: [
                'Whole document must parse before the first record is usable',
                'Not appendable or splittable; repeated keys bloat size',
              ],
              chooseWhen: 'you are talking to an API — it is the wire format, not your storage choice.',
            },
            {
              name: 'CSV',
              strengths: [
                'Universally consumable, compact for flat data, spreadsheet-friendly',
                'Streams and splits by line (with the 1.3.1 quoting caveats)',
              ],
              weaknesses: [
                'Cannot represent nesting or lists at all',
                'No types, no null-vs-empty-string distinction, dialect chaos',
              ],
              chooseWhen: 'the data is genuinely flat and a human or spreadsheet is the consumer.',
            },
            {
              name: 'JSON Lines',
              strengths: [
                'Streamable, appendable, splittable — one valid record per line',
                'Keeps nested values when rows are not perfectly flat; crash-tolerant',
              ],
              weaknesses: [
                'Larger than CSV (keys on every line); still untyped text',
                'Schema drift between lines goes undetected until load time',
              ],
              chooseWhen: 'moving records between pipeline stages — the default landing format, and what P1 uses.',
            },
          ]}
          note={<>All three are text formats for the <em>edges</em>. Inside the platform, Phase 2 replaces them with typed columnar storage (Parquet) — this table is about what to do before you get there.</>}
        />
      </Section>

      <Section kicker="hands-on" title="Lab: nested payload to JSONL and back">
        <Lab
          lessonId={ID}
          intro={<p>Take a nested weather payload on disk, flatten it to JSONL, then read the JSONL back with a streaming generator — the exact shape of P1's transform stage.</p>}
          steps={[
            {
              title: 'Create the project and the input file',
              body: <p>The here-string writes a nested payload covering six hours:</p>,
              commands: [{ ps: `mkdir C:\\de-lab\\m13-json; cd C:\\de-lab\\m13-json
uv init
@'
{
  "latitude": 52.52, "longitude": 13.41, "timezone": "UTC",
  "hourly": {
    "time": ["2026-07-01T00:00", "2026-07-01T01:00", "2026-07-01T02:00",
             "2026-07-01T03:00", "2026-07-01T04:00", "2026-07-01T05:00"],
    "temperature_2m": [18.4, 17.9, 17.6, 17.2, 17.5, 18.1],
    "relative_humidity_2m": [71, 74, 76, 78, 77, 73]
  }
}
'@ | Set-Content -Encoding utf8 weather.json` }],
              checkpoint: <><code>Get-Content weather.json</code> shows the nested document, and <code>uv run python -c "import json; json.load(open('weather.json', encoding='utf-8'))"</code> exits silently — meaning it parsed.</>,
            },
            {
              title: 'Flatten to JSONL',
              commands: [{ ps: `@'
import json
from pathlib import Path

doc = json.loads(Path('weather.json').read_text(encoding='utf-8'))
h = doc['hourly']

with open('weather.jsonl', 'w', encoding='utf-8') as out:
    n = 0
    for ts, temp, rh in zip(h['time'], h['temperature_2m'], h['relative_humidity_2m']):
        row = {
            'ts': ts, 'temp_c': temp, 'rh_pct': rh,
            'latitude': doc['latitude'], 'longitude': doc['longitude'],
        }
        out.write(json.dumps(row) + '\\n')
        n += 1
print('wrote', n, 'rows to weather.jsonl')
'@ | Set-Content -Encoding utf8 flatten.py
uv run python flatten.py` }],
              checkpoint: <><code>wrote 6 rows to weather.jsonl</code> prints, and <code>(Get-Content weather.jsonl | Measure-Object -Line).Lines</code> reports <code>6</code>. Open the file: every line is a complete, self-contained JSON record carrying the coordinates.</>,
            },
            {
              title: 'Stream it back with a generator',
              body: <p>Read the JSONL without ever holding all rows in memory — the 1.1.4 generator pattern applied to files:</p>,
              commands: [{ ps: `@'
import json

def read_jsonl(path):
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)

count = 0
coldest = None
for row in read_jsonl('weather.jsonl'):
    count += 1
    if coldest is None or row['temp_c'] < coldest['temp_c']:
        coldest = row
print('rows:', count)
print('coldest:', coldest['ts'], coldest['temp_c'])
'@ | Set-Content -Encoding utf8 stream_read.py
uv run python stream_read.py` }],
              checkpoint: <>Prints <code>rows: 6</code> and <code>coldest: 2026-07-01T03:00 17.2</code>. The script never built a list of all rows — it would work identically on 6 million lines.</>,
            },
            {
              title: 'Prove the append-friendliness',
              body: <p>Simulate a second pipeline run appending fresh data, then re-aggregate:</p>,
              commands: [{ ps: `@'
{"ts": "2026-07-01T06:00", "temp_c": 19.0, "rh_pct": 70, "latitude": 52.52, "longitude": 13.41}
'@ | Add-Content -Encoding utf8 weather.jsonl
uv run python stream_read.py` }],
              checkpoint: <><code>rows: 7</code> now — the file stayed valid under a plain append, no bracket surgery required. Try to imagine doing that to a JSON array file; that difference is why JSONL is the pipeline default.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: "When should you use doc['field'] instead of doc.get('field') on an API payload?",
              options: [
                'Never — .get is always safer',
                'When the field is required by your pipeline, so absence should fail loudly at the boundary',
                'Only when the field is nested more than two levels deep',
                'When you need better performance',
              ],
              answer: 1,
              explain:
                'A missing required field is malformed input, and the correct response is a loud, early crash — not a None flowing silently into your warehouse. Reserve .get for genuinely optional fields.',
            },
            {
              q: 'Open-Meteo returns hourly.time and hourly.temperature_2m as parallel arrays. Flattening them into rows means:',
              options: [
                'Calling json.normalize on the payload',
                'Concatenating the arrays end to end',
                'Zipping them by position and emitting one dict per pair, copying envelope fields into each row',
                'Sorting both arrays first to align them',
              ],
              answer: 2,
              explain:
                'Element i of every parallel array belongs to the same observation, so zip pairs them by position. Copying envelope context makes records self-contained downstream. It is a column-to-row pivot — the payload ships columnar.',
            },
            {
              q: 'Why does a pipeline prefer JSON Lines over one big JSON array for landing 10 million records?',
              options: [
                'JSONL files are always smaller',
                'Each line parses independently: streamable in constant memory, appendable, splittable across workers, crash-tolerant',
                'JSON arrays cannot hold more than a million elements',
                'JSONL preserves types that JSON arrays lose',
              ],
              answer: 1,
              explain:
                'A JSON array must parse whole to reach the first element, cannot be appended without bracket surgery, and cannot be split by byte range. JSONL restores line-oriented superpowers; sizes and types are essentially the same.',
            },
            {
              q: 'A payload contains "account_id": 9007199254740993 and your downstream is JavaScript-based. The risk is:',
              options: [
                'Python raises OverflowError on parse',
                'The value silently rounds — it exceeds the 2^53 integer precision of IEEE 754 doubles',
                'JSON forbids numbers that large, so the payload is invalid',
                'No risk; JSON numbers are arbitrary precision everywhere',
              ],
              answer: 1,
              explain:
                'Python parses big ints exactly, but anything float64-bound rounds beyond 2^53 — silently. This is why APIs ship large IDs as strings (id_str). JSON the spec allows any number; JSON the ecosystem is governed by doubles.',
            },
            {
              q: 'A single 8 GB JSON document must be processed on a 16 GB machine. Best approach?',
              options: [
                'json.loads the file — 8 GB fits in 16 GB',
                'Convert it to CSV first',
                'A streaming event parser (ijson) — or push the producer to emit JSON Lines instead',
                'Split the file at every 100 MB boundary and parse the chunks',
              ],
              answer: 2,
              explain:
                'json.loads materializes the document at a multiple of on-disk size — 8 GB of JSON likely will not fit. Byte-split chunks are invalid JSON. Streaming parsers process events incrementally; the durable fix is a line-oriented format at the source.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Design the transform step: a nested API payload arrives, a warehouse table must be loaded. What happens in between?',
            a: <p>Validate the envelope first (required keys present, array lengths equal — fail loudly if not), then flatten: zip parallel arrays into per-observation records, denormalize envelope context into each row, convert types deliberately (timestamps, decimals), and land as JSON Lines before the load. Strong answers mention idempotent re-runs (same input, same rows) and keeping the raw payload for replay when the schema assumption breaks.</p>,
          },
          {
            q: 'Why is JSON a poor storage format for analytics if every API uses it?',
            a: <p>Wire and storage optimize for different things. JSON's self-description costs dearly at rest: keys repeated per record, no native types (dates and decimals are strings and floats), and a row-oriented text layout that cannot skip columns or compress well. Analytical engines want typed, columnar, compressed files — Parquet — where a query touching 2 of 40 columns reads only those. JSON at the boundary, columnar at rest.</p>,
          },
          {
            q: 'What could go wrong parsing money amounts from JSON, and how do you prevent it?',
            a: <p>json.loads turns 19.99 into a binary float that is not exactly 19.99, and arithmetic compounds the error — classic ledger drift. Prevent it at the parse: parse_float=Decimal, or better, transport integer minor units (cents) end to end. The general lesson interviewers want: numeric fidelity is a boundary decision, made per field, not a cleanup task downstream.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <><code>json.loads</code> maps JSON onto dicts and lists one-to-one; from there it is Python, not magic.</>,
          <>Access discipline: <code>[]</code> for required fields (crash loudly at the boundary), <code>.get</code> only for genuinely optional ones.</>,
          <>Flattening parallel arrays is <code>zip</code> plus copying envelope context into every row — the core transform of P1.</>,
          <>JSON Lines — one record per line — is the pipeline interchange default: streamable, appendable, splittable, crash-tolerant.</>,
          <>Numbers are the sharp edge: floats arrive pre-rounded, big ints break float64 consumers, money needs Decimal or integer cents.</>,
          <>JSON is for the wire, CSV for humans, JSONL for landing — and Phase 2's columnar formats for everything at rest.</>,
        ]}
      />
    </>
  )
}
