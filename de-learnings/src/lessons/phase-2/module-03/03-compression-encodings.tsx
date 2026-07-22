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
import { RevealSolution } from '../../../components/RevealSolution'
import { BenchBars } from '../../../viz/BenchBars'

const ID = '2.3.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Columnar's second superpower: neighbors that compress">
        <Tiered
          layman={
            <>
              <p>
                Write down the string <code>AAAAABBB</code>. Now write it shorter: <code>5A3B</code> — "five A's, three B's". Half the ink, zero
                information lost. That trick only works because identical letters sit <em>next to each other</em>; shuffle them into{' '}
                <code>ABABABAA</code> and the trick dies. Here is a second trick: a page listing city names over and over —{' '}
                <code>London, Oslo, London, London, Oslo...</code> — gets a legend, <code>1=London 2=Oslo</code>, and the page becomes{' '}
                <code>1 2 1 1 2...</code>. Tiny numbers instead of repeated words.
              </p>
              <p>
                Last lesson's shelving choice set these tricks up perfectly: a column store puts a thousand city names side by side, a thousand
                amounts side by side — same-kind things, full of runs and repeats. Row storage interleaves a city with a price with a date, and the
                tricks get nothing to grab. This lesson is those two tricks plus three cousins — and the punchline that shrunken data is not just
                smaller to store but <em>faster to read</em>.
              </p>
            </>
          }
          student={
            <>
              <p>
                Columnar layout cut I/O by reading fewer columns; compression cuts it again by shrinking the columns you do read. The reason it works
                so well here: a column is a run of <em>same-typed, similarly-distributed</em> values — 1M city names drawn from 50 distinct values,
                timestamps ticking steadily upward, amounts in a narrow range. Encoders feast on that regularity. Row-major bytes (int, string,
                timestamp, int, string...) offer no such regularity, which is why row stores compress modestly and column stores compress absurdly —
                5-50x on real data.
              </p>
              <p>
                And the win is not merely disk rental. Scan speed is usually bounded by how many bytes move through disk, memory, and cache — so if
                the <code>city</code> column shrinks 20x, a scan of it moves 20x fewer bytes. Cheap decompression (or better, operating directly on
                encoded data) means <strong>compressed scans are typically faster than uncompressed ones</strong>. In a{' '}
                <GlossaryTerm k="data-warehouse">warehouse</GlossaryTerm> billed on bytes stored and bytes scanned, compression is simultaneously the
                storage bill, the speed, and the query bill.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The information-theoretic frame makes the "why per column" precise: compression approaches the entropy of the data stream, and a
                single column is a low-entropy stream. A city column with 50 equiprobable values carries under 6 bits per value versus ~60 bits of
                UTF-8; a sorted column's conditional entropy given the previous value is near zero, which is exactly what RLE and delta encoding
                exploit. Interleaving heterogeneous fields (row-major) raises the modeled entropy toward the mixture's, which is why the same
                general-purpose compressor does far better on columnar bytes. This is DDIA chapter 3's column-compression section, formalized.
              </p>
              <p>
                The deeper systems insight is that encoding and execution co-design. RLE-aware aggregation computes value-times-run-length without
                expanding runs; dictionary codes let equality predicates compare small integers instead of strings, and a sorted dictionary turns
                range predicates into code-range tests; bit-packed vectors feed SIMD lanes directly (lesson 2.3.4). Engines therefore choose
                encodings per column chunk from statistics — cardinality, sortedness, value range — trying cheap candidates and keeping the winner
                (DuckDB does this per row group; Parquet writers pick dictionary vs plain per chunk). Compression here is not a wrapper around the
                engine; it is part of the query processor's calculus.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Build the encoders: RLE and dictionary in 15 lines each">
        <p>
          You will meet these encodings inside Parquet files, DuckDB storage, and every warehouse engine for the rest of your career — so build them
          once with your own hands. The runners are complete; run them, then bend them (change the data, break the assumptions) to see where each
          shines and fails. In Phase 8 (project P8b) you assemble a mini columnar engine — these functions are, almost verbatim, its storage layer.
        </p>
        <p><strong>Run-length encoding (RLE)</strong> — store each run of repeated values once, with a count:</p>
        <CodeRunner
          language="python"
          code={`# A sorted city column: sortedness creates long runs
cities = ["Chennai"] * 240 + ["London"] * 180 + ["Oslo"] * 60 + ["Pune"] * 320

def rle_encode(values):
    runs = []
    for v in values:
        if runs and runs[-1][0] == v:
            runs[-1][1] += 1
        else:
            runs.append([v, 1])
    return runs

def rle_decode(runs):
    out = []
    for v, n in runs:
        out.extend([v] * n)
    return out

runs = rle_encode(cities)
assert rle_decode(runs) == cities  # lossless or it doesn't count

raw_bytes = sum(len(v) for v in cities)          # text bytes, back to back
rle_bytes = sum(len(v) + 2 for v, _ in runs)     # value + 2-byte run length
print(len(cities), "values ->", len(runs), "runs")
print("raw:", raw_bytes, "bytes   RLE:", rle_bytes, "bytes")
print("ratio:", round(raw_bytes / rle_bytes), "x smaller")

# Now sabotage it: shuffle the column first --
#   import random; random.shuffle(cities)
# and watch the run count explode and the ratio collapse.`}
        />
        <p><strong>Dictionary encoding</strong> — replace each distinct value with a small integer code, plus one legend:</p>
        <CodeRunner
          language="python"
          code={`# Unsorted this time -- dictionary encoding does not need runs
cities = ["London", "Oslo", "Chennai", "London", "Pune", "Oslo", "London"] * 150

def dict_encode(values):
    mapping = {}
    codes = []
    for v in values:
        if v not in mapping:
            mapping[v] = len(mapping)
        codes.append(mapping[v])
    return mapping, codes

mapping, codes = dict_encode(cities)

# decode check: invert the legend
inverse = {code: v for v, code in mapping.items()}
assert [inverse[c] for c in codes] == cities

raw_bytes = sum(len(v) for v in cities)
dict_bytes = sum(len(v) for v in mapping) + len(codes) * 1  # 1-byte codes (<=256 cities)
print("distinct values:", len(mapping))
print("raw:", raw_bytes, "bytes   dict:", dict_bytes, "bytes")
print("ratio:", round(raw_bytes / dict_bytes, 1), "x smaller")

# Bend it: what happens to the ratio if every city name were unique?
# Try: cities = ["city_" + str(i) for i in range(1000)]`}
        />
        <p>
          <strong>Delta encoding</strong> — for ordered numbers (ids, timestamps), store differences instead of values. Steady differences then
          bit-pack into almost nothing:
        </p>
        <CodeRunner
          language="python"
          code={`# Sensor timestamps: one reading every 10 seconds (epoch seconds)
ts = [1750000000 + i * 10 for i in range(1000)]

deltas = [ts[0]] + [b - a for a, b in zip(ts, ts[1:])]
print("first values:", ts[:3])
print("first deltas:", deltas[:3], "... all equal?", len(set(deltas[1:])) == 1)

# raw: 8 bytes per 64-bit timestamp
raw_bytes = 8 * len(ts)
# delta: one 8-byte base + tiny deltas; delta=10 fits in 1 byte (even 4 bits)
delta_bytes = 8 + (len(ts) - 1) * 1
print("raw:", raw_bytes, "bytes   delta+packed:", delta_bytes, "bytes,",
      round(raw_bytes / delta_bytes), "x smaller")

# Delta-of-delta (used for timestamps in Gorilla/Parquet): if readings tick
# steadily, deltas are CONSTANT, so differences-of-differences are ~all zero:
dod = [deltas[1]] + [b - a for a, b in zip(deltas[1:], deltas[2:])]
print("delta-of-delta values, all zero?", set(dod[1:]) == {0})`}
        />
        <Callout kind="info" title="The stack, assembled">
          Real engines layer these: dictionary-encode the strings, RLE the codes if sorted, delta the timestamps, then <strong>bit-pack</strong>{' '}
          (use exactly as many bits as the largest value needs — codes 0-49 need 6 bits, not 8). Finally a <strong>general-purpose
          compressor</strong> (snappy, lz4, zstd) squeezes whatever byte-level redundancy remains. The specialized encodings do the heavy lifting
          precisely <em>because</em> they know the column's type and shape; gzip knows nothing.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Sorting is compression's force multiplier">
        <BenchBars
          title="1M-value city column (50 distinct cities, avg 7.6 chars) — illustrative arithmetic"
          items={[
            { label: 'raw text, back to back', value: 7600000, unit: 'bytes', note: '1M strings of ~7.6 chars' },
            { label: 'dictionary (1-byte codes + legend)', value: 1000380, unit: 'bytes', note: '1M codes + 50-entry legend' },
            { label: 'sorted, then dictionary + RLE', value: 680, unit: 'bytes', note: '50 runs of (code, count) + legend' },
          ]}
          betterIs="lower"
          caption="Pencil-and-paper sizes, not measurements — real files add headers, page boundaries, and checksums. The shape is what matters: dictionary buys ~7.6x, but sorting first buys three more orders of magnitude, because 1M values collapse into 50 runs."
        />
        <Tiered
          layman={
            <>
              <p>
                The bars tell a story in three acts. The legend trick alone shrinks the page a lot. But the spectacular bar is the third one: if you
                first <em>sort</em> the column, all the Londons stand together, all the Oslos together — 50 runs total — and the run-length trick
                compresses a million entries into a few hundred characters. Order is what the tricks feed on.
              </p>
              <p>
                Sorting is not free: someone has to shelve a million receipts in order, once, at filing time. But filing happens once and reading
                happens thousands of times — so tidying at write time to save at read time is nearly always the right trade in an archive.
              </p>
            </>
          }
          student={
            <>
              <p>
                Practical rules that fall out of the arithmetic. <strong>Low-cardinality columns</strong> (country, status, category) are dictionary
                gold regardless of order. <strong>Sorted or clustered columns</strong> are RLE and delta gold — which is why analytical tables
                declare sort keys (warehouse clustering keys, Parquet writers sorting before writing). One sort order helps some columns and not
                others: sorting by city makes <code>city</code> compress magnificently, helps correlated columns somewhat, and leaves shuffled ones
                alone — choosing the sort key is a real design decision you will make in module 2.4 and Phase 4.
              </p>
              <p>
                Also visible in the bars: encoding choice is <strong>per column</strong>. The engine picks dictionary for <code>city</code>, delta
                for <code>ts</code>, plain-or-nothing for a high-entropy <code>uuid</code>. You mostly configure the top layer (the general-purpose
                codec) and the sort order; per-column encodings are chosen from statistics automatically. Your job is to hand the engine
                compressible data — sorted, typed properly, not stringly-typed.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The general-purpose layer has its own economics. snappy and lz4 target multiple GB/s of decompression at modest ratios; zstd spans a
                level dial (1-22) trading compression-time CPU for ratio — and, crucially for scans, its <em>decompression</em> speed stays high and
                nearly level-independent. That asymmetry (pay once at write, decode cheap forever) is why zstd has been displacing snappy as the
                warehouse default. gzip/deflate sits in the awkward middle: slower to decode than zstd at comparable ratios — historical inertia
                keeps it around.
              </p>
              <p>
                The frontier worth knowing: avoiding decompression entirely. RLE-aware operators aggregate run headers; dictionary-aware operators
                evaluate predicates on codes and only materialize matching strings; systems can defer decompression across operator boundaries the
                way late materialization defers row assembly (Abadi et al., "Integrating Compression and Execution in Column-Oriented Database
                Systems", SIGMOD 2006 — the paper behind this whole lesson; DDIA ch. 3's column-compression pages give the practitioner view). One
                caution for your mental model: encodings this aggressive make <em>updates in place</em> essentially impossible — you cannot poke
                value 500,001 into an RLE stream — which is the second, independent reason columnar systems batch, append, and compact (lesson
                2.3.2's write story).
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Choosing codecs: ratio, CPU, and when to sort">
        <Tradeoffs
          options={[
            {
              name: 'Fast codec (snappy, lz4)',
              strengths: [
                'Multi-GB/s compression and decompression — nearly free at scan time',
                'Low, predictable CPU cost on the write path',
              ],
              weaknesses: [
                'Moderate ratios — typically 2-4x on top of encodings',
                'Larger files than zstd: more storage cost and more bytes scanned',
              ],
              chooseWhen: 'the write path is CPU-tight (streaming ingest) or data is short-lived staging.',
            },
            {
              name: 'zstd (moderate level, e.g. 3-9)',
              strengths: [
                'Noticeably better ratios than snappy; decompression stays fast at every level',
                'One codec spans the whole speed/ratio dial — tune per table, not per system',
              ],
              weaknesses: [
                'More write-time CPU than snappy, growing with level',
                'Very high levels (19+) burn CPU for shrinking marginal gains',
              ],
              chooseWhen: 'data is written once and scanned many times — the warehouse default case.',
            },
            {
              name: 'No general-purpose codec (encodings only, or raw)',
              strengths: [
                'Zero codec CPU; simplest possible debugging (bytes are inspectable)',
                'Specialized encodings alone often capture most of the win on well-sorted data',
              ],
              weaknesses: [
                'Leaves easy ratio on the table for string-heavy or messy columns',
                'Storage and scan-byte costs rise directly with the forgone ratio',
              ],
              chooseWhen: 'benchmarking to isolate effects (as in this lab), or data is provably incompressible (random ids, pre-compressed blobs).',
            },
          ]}
          note={
            <>
              The other axis is <strong>sorting before writing</strong>: an O(n log n) pass at write time that can dramatically improve RLE and delta
              on the sort column at scan time, forever. Since analytical data is written once and read many times, the read side usually wins the
              argument — unless ingest latency is the bottleneck, which is a Phase 5 conversation.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: same table, three codecs, measured">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Back in <code>warehouse-lab</code>, you will write the 2M-row <code>orders</code> table (from lesson 2.3.2) to Parquet with three
              compression codecs, compare file sizes, time scans over each, and then measure what sorting before writing does. Everything lands in a
              recorded size/time table.
            </p>
          }
          steps={[
            {
              title: 'Confirm the table is still there',
              body: <p>If <code>warehouse.duckdb</code> is missing, re-run <code>build_table.py</code> from lesson 2.3.2 first.</p>,
              commands: [
                {
                  ps: 'cd ~\\warehouse-lab\nuv run python -c "import duckdb; print(duckdb.connect(\'warehouse.duckdb\').execute(\'SELECT count(*) FROM orders\').fetchone())"',
                },
              ],
              checkpoint: <>Prints <code>(2000000,)</code>.</>,
            },
            {
              title: 'Write Parquet with three codecs and measure',
              body: (
                <>
                  <p>Create <code>parquet_codecs.py</code>:</p>
                  <CodeBlock
                    label="python — parquet_codecs.py"
                    code={`import os
import time

import duckdb

con = duckdb.connect("warehouse.duckdb")
codecs = ["UNCOMPRESSED", "SNAPPY", "ZSTD"]

for codec in codecs:
    path = "orders_" + codec.lower() + ".parquet"
    con.execute(
        "COPY orders TO '" + path + "' (FORMAT PARQUET, COMPRESSION " + codec + ")"
    )

print("codec         size_mb   scan_ms")
for codec in codecs:
    path = "orders_" + codec.lower() + ".parquet"
    size_mb = os.path.getsize(path) / 1e6
    query = "SELECT city, avg(amount), count(*) FROM '" + path + "' GROUP BY city"
    con.execute(query).fetchall()  # warm-up
    t0 = time.perf_counter()
    con.execute(query).fetchall()
    ms = (time.perf_counter() - t0) * 1000
    print(codec.ljust(14), str(round(size_mb, 1)).rjust(7), str(round(ms, 1)).rjust(9))`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python parquet_codecs.py' }],
              checkpoint: (
                <>
                  Three rows print. Sizes order <code>UNCOMPRESSED &gt; SNAPPY &gt; ZSTD</code>. Scan times are in the same neighborhood — the
                  compressed files are not slower to query, despite the decompression work.
                </>
              ),
            },
            {
              title: 'Measure what sorting buys — and what it costs',
              body: (
                <>
                  <p>Create <code>sorted_test.py</code> — same data, same codec, sorted by <code>city</code> before writing:</p>
                  <CodeBlock
                    label="python — sorted_test.py"
                    code={`import os

import duckdb

con = duckdb.connect("warehouse.duckdb")
con.execute(
    "COPY (SELECT * FROM orders ORDER BY city, ts) "
    "TO 'orders_sorted_zstd.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)"
)
for name in ["orders_zstd.parquet", "orders_sorted_zstd.parquet"]:
    print(name.ljust(28), round(os.path.getsize(name) / 1e6, 1), "MB")`}
                  />
                </>
              ),
              commands: [{ ps: 'uv run python sorted_test.py' }],
              checkpoint: (
                <>
                  Surprise: the sorted file is <em>bigger</em> — roughly 50 MB versus roughly 6 MB unsorted, about 8x larger. That is not a bug, it is
                  the lesson. Sorting by <code>city</code> does collapse the <code>city</code> column into 50 long runs, but this table&apos;s other
                  nineteen columns are sequential (<code>id</code>) or periodic (the <code>m00..m15</code> measures cycle every 997 values), so in their
                  natural order they already delta- and RLE-compress almost to nothing. Reordering by city shatters that regularity, and the loss dwarfs
                  the city column&apos;s gain. Sorting is a force multiplier only for columns whose repeats are otherwise <em>scattered</em> — here the
                  natural order is already ideal. Keep the habit, not the number: measure before committing to a sort key. It rewards the sort column
                  and anything correlated with it, and can penalize columns that were already ordered.
                </>
              ),
            },
            {
              title: 'Record the table and explain one number',
              body: (
                <>
                  <p>
                    Copy the full size/time table into your notes. Then answer before revealing: the uncompressed file is much bigger, yet its scan
                    was not proportionally faster — sometimes even slower. Why?
                  </p>
                  <RevealSolution label="Reveal the explanation">
                    <p>
                      Because the scan is bound by bytes moved, not bytes decoded. The uncompressed file drags every byte through disk and memory;
                      the zstd file moves several times fewer bytes and spends a little CPU inflating them — and modern decompression runs at GB/s,
                      far faster than the storage it is saving. Fewer bytes plus cheap decode beats more bytes plus no decode. This is the sentence
                      "compressed data scans faster" made concrete, and it is why warehouses compress everything by default.
                    </p>
                  </RevealSolution>
                </>
              ),
              checkpoint: (
                <>
                  Your notes hold a 4-row table (three codecs + sorted-zstd) with sizes and scan times, plus the one-sentence explanation. Keep the
                  Parquet files — Phase 4 reads them again.
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
              q: 'A status column holds 1M values from the set {placed, shipped, delivered}. Which encoding is the obvious first move, and why?',
              options: [
                'Delta encoding — statuses change incrementally',
                'Dictionary encoding — 3 distinct values means a tiny legend plus 1M two-bit codes',
                'No encoding — text is already compact',
                'zstd alone — general-purpose always wins',
              ],
              answer: 1,
              explain:
                'Cardinality 3 is dictionary heaven: the codes need 2 bits each. Delta is for ordered numerics. zstd on top helps, but the 30x-ish structural win comes from the dictionary.',
            },
            {
              q: 'Why does sorting a column before writing often multiply its compression ratio?',
              options: [
                'Sorting removes duplicate values',
                'Sorted values place identical/similar neighbors together, creating long runs for RLE and tiny deltas for delta encoding',
                'Compressors require sorted input to function',
                'Sorting converts strings to integers',
              ],
              answer: 1,
              explain:
                'No data is removed — it is rearranged so encoders see regularity. 1M sorted city values with 50 cities collapse to 50 runs. Shuffled, the same values yield ~1M runs and RLE does nothing.',
            },
            {
              q: 'Your pipeline writes files once; dashboards scan them hundreds of times a day. snappy or zstd?',
              options: [
                'snappy — decompression speed is all that matters',
                'zstd — pay more CPU once at write time for smaller files; decompression stays fast, so hundreds of scans each move fewer bytes',
                'Uncompressed — scans should not pay any decode cost',
                'They are equivalent in this scenario',
              ],
              answer: 1,
              explain:
                'Write-once/read-many amortizes zstd’s write cost across every scan. zstd’s decompression-speed asymmetry (slowish encode, fast decode at any level) is exactly shaped for this pattern.',
            },
            {
              q: 'Why can a query engine compute sum(amount) FASTER on an RLE-compressed column than on the raw values?',
              options: [
                'It cannot — decompression always adds time',
                'It can multiply each run’s value by its length, processing 50 run headers instead of 1M values — and it moved fewer bytes to begin with',
                'RLE sorts the data, and sorted data sums faster',
                'The result is approximate, which is faster',
              ],
              answer: 1,
              explain:
                'Operating directly on compressed data is the endgame: less I/O and fewer operations, exactly. This is why "compressed" and "fast" stopped being opposites in columnar systems.',
            },
            {
              q: 'A column of random UUIDs compresses to 98% of its original size. What is the right conclusion?',
              options: [
                'The codec is buggy; try a higher zstd level',
                'The column has near-maximal entropy — no encoder can find regularity that isn’t there; store it raw and spend effort elsewhere',
                'It should be dictionary encoded — strings always dictionary-encode well',
                'Sorting it will fix the ratio',
              ],
              answer: 1,
              explain:
                'Compression approaches entropy, and random 128-bit values are already at it. Dictionary needs repeats (UUIDs have none); sorting random ids creates no runs in the id itself. Recognizing incompressible columns saves CPU.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Why does columnar data compress so much better than row-oriented data?',
            a: (
              <p>
                A column is a homogeneous, low-entropy stream — same type, narrow value distribution, often sorted — so specialized encodings bite:
                dictionary for low cardinality, RLE for runs, delta for ordered numerics, bit-packing for small ranges, then a general-purpose codec
                on the residue. Row-major bytes interleave unrelated types, destroying that regularity. Strong answers add the kicker: smaller also
                means faster, because scans are byte-bound and engines can operate directly on encoded data.
              </p>
            ),
          },
          {
            q: 'How would you choose compression settings for a new warehouse table?',
            a: (
              <p>
                Default to zstd at a moderate level for write-once/read-many tables; consider snappy/lz4 only where ingest CPU is the bottleneck.
                Pick a sort key that clusters the columns your queries filter and group by — sorting is the cheapest ratio multiplier available. Let
                the engine pick per-column encodings, but verify with its inspection tools that low-cardinality columns went dictionary. And skip
                heavy effort on provably high-entropy columns like UUIDs.
              </p>
            ),
          },
          {
            q: 'What does compression do to updates, and how do columnar systems cope?',
            a: (
              <p>
                In-place updates become effectively impossible — you cannot rewrite one value inside an RLE or bit-packed block without rebuilding
                it. So columnar systems make chunks immutable: updates and deletes are recorded as new data plus tombstones or delta stores, and
                compaction rewrites chunks in the background. It is the same batch/append/compact pattern the write path already required —
                compression just makes it non-negotiable.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>
            Columnar compresses because columns are low-entropy streams: same type, repeated values, gentle ordering. Row-major interleaving
            destroys exactly that.
          </>,
          <>
            The encoding zoo, in one breath: dictionary for low cardinality, RLE for runs, delta (and delta-of-delta) for ordered numerics,
            bit-packing for small ranges, then snappy/zstd on top.
          </>,
          <>Sorted and low-cardinality columns are compression gold — choosing a sort key is choosing your compression ratio.</>,
          <>
            Compressed data scans faster: scans are byte-bound, decompression runs at GB/s, and engines can aggregate RLE runs and filter dictionary
            codes without decompressing at all.
          </>,
          <>
            zstd's asymmetry — pay at write, decode fast forever — fits write-once/read-many analytics; you measured the size/time table yourself.
          </>,
          <>
            You have now hand-built the storage tricks inside every Parquet file — Phase 8's mini columnar engine (P8b) starts from these exact
            functions.
          </>,
        ]}
      />
    </>
  )
}
