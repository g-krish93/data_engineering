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

const ID = '1.3.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Half of data engineering is somebody else's weird file">
        <Tiered
          layman={
            <>
              <p>Imagine working at a port. Shipping containers arrive all day, and the manifest taped to each one is supposed to say what is inside. In practice: some manifests are in another language, some use commas where you expect semicolons, some say "machine parts" but contain furniture, and one has a sticker that scrambles your scanner. Your job is not to complain — it is to open every container correctly anyway.</p>
              <p>Files are the shipping containers of data. Before anything clever happens in a{' '} <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>, someone has to open a file some other team, vendor, or decade-old system produced, and read it without silently mangling names, amounts, or dates. This lesson is that skill.</p>
            </>
          }
          student={
            <>
              <p>Every pipeline starts at an ingestion boundary, and at that boundary you meet files: ERP exports, partner SFTP drops, "the spreadsheet Karen sends on Fridays". Three things go wrong, always the same three: the <strong>encoding</strong> (how bytes map to characters), the <strong>dialect</strong> (delimiter, quoting, line endings), and the <strong>types</strong> (everything in a CSV is a string until you say otherwise). None of these failures announce themselves — a wrong encoding usually still "works" and quietly corrupts every non-ASCII name in the dataset.</p>
              <p>Python gives you three layers of defense: <code>open()</code> with an explicit <code>encoding=</code>, <code>pathlib.Path</code> for sane path handling, and the stdlib <code>csv</code> module for dialect rules you should never hand-roll. Master these and the messy-file class of bug becomes routine instead of terrifying.</p>
            </>
          }
          phd={
            <>
              <p>The root cause of CSV pain is that RFC 4180 is a description, not an enforced standard. Written in 2005 — decades after CSV was everywhere — it is explicitly informational and leaves the important parts loose: encoding unspecified, header optional, and real producers ignore even the pinned-down parts (Excel emits semicolon-delimited "CSV" across half of Europe because the decimal separator there is the comma). A CSV file is not a format; it is a family of dialects you must detect or be told.</p>
              <p>The deeper model is the two-layer split: files contain <em>bytes</em>, programs want <em>text</em>, and an encoding is the codec between them. Python 3 makes the layering explicit — <code>bytes</code> and <code>str</code> are distinct types, and text-mode <code>open()</code> inserts the decode step. Every mojibake incident is a producer-codec/consumer-codec mismatch. CSV persists despite everything because it is the lowest common denominator every tool can emit — but it carries no <GlossaryTerm k="schema">schema</GlossaryTerm>, no types, no compression. Phase 2 introduces Parquet, which fixes all three; until then, CSV is what the world hands you.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="open(), encodings, and pathlib">
        <Tiered
          layman={
            <>
              <p>A file on disk is a long row of numbers (bytes). To turn numbers into letters, the computer needs a lookup table — an encoding. If the writer used one table and the reader uses another, plain English mostly survives (the tables agree there), but accented letters turn into garbage: <code>MÃ¼ller</code> instead of <code>Müller</code>. The fix is never clever code — it is finding out which table the writer used and saying so.</p>
              <p>A path like <code>C:\de-lab\raw\sales.csv</code> is an address. You could build addresses by gluing strings together, but Python has a proper address book — <code>pathlib</code> — that knows how to join folders, extract names, and behave the same on Windows and Linux.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Always pass <code>encoding=</code> to <code>open()</code>.</strong> Omit it and Python guesses from the machine's locale — historically cp1252 on Windows, utf-8 on Linux — so the same script reads the same file differently on two machines.</li>
                <li><strong>The two encodings that matter:</strong> <code>utf-8</code> (modern default, variable-width, covers everything) and <code>cp1252</code> (legacy Windows-Western, one byte per character — where old exports come from). Plus <code>utf-8-sig</code>, utf-8 that tolerates Excel's BOM marker — more below.</li>
                <li><strong>Modes:</strong> <code>'r'</code> read text, <code>'w'</code> write text (truncates!), <code>'a'</code> append; add <code>'b'</code> for raw bytes with no decoding.</li>
                <li><strong>Use <code>pathlib.Path</code></strong>, not string concatenation: <code>/</code> joins segments; <code>.name</code>, <code>.stem</code>, <code>.suffix</code>, <code>.parent</code> decompose; <code>Path.open()</code> replaces the bare builtin.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>Why cp1252 half-works: it assigns a printable character to nearly every byte value, so decoding arbitrary bytes with it virtually never raises — it just yields plausible wrong text. utf-8 is the opposite: self-synchronizing, with strict continuation-byte rules, so wrong input fails fast. The asymmetry dictates debugging: a <code>UnicodeDecodeError</code> means "not utf-8, find the real codec"; silent <code>Ã©</code> garbage means "was utf-8, decoded as a legacy single-byte codec".</p>
              <p>The BOM (<code>EF BB BF</code>) exists because UTF-16 genuinely needs a byte-order signal, and Windows tooling habitually prepends the utf-8 version too, where it serves no purpose. Python deliberately does not strip it under plain <code>utf-8</code> — that would silently modify data — hence the explicit <code>utf-8-sig</code> codec. Detection tools like chardet are statistical (byte n-gram frequencies) and genuinely guess wrong; use them forensically, never as a production default.</p>
            </>
          }
        />
        <p><code>pathlib</code> in action — pure path algebra, no filesystem needed. The Windows flavor renders backslashes even though the code writes forward slashes:</p>
        <CodeRunner
          language="python"
          code={`from pathlib import PurePosixPath, PureWindowsPath

p = PureWindowsPath('C:/de-lab/raw/sales_2026-07.csv')
print('name  :', p.name)
print('stem  :', p.stem)
print('suffix:', p.suffix)
print('parent:', p.parent)
print('joined:', p.parent / 'archive' / p.name)

# Same API on Linux paths - code stays portable across OSes
q = PurePosixPath('/data/raw') / 'sales_2026-07.csv'
print('posix :', q)`}
        />
        <p>Now the classic silent corruption, made visible. Run it — this is mojibake being born:</p>
        <CodeRunner
          language="python"
          code={`text = 'café crème'                 # what the producer meant
data = text.encode('utf-8')         # bytes on disk: é is the pair 0xC3 0xA9
print('bytes on disk :', data)

# A consumer who assumes cp1252 decodes each byte separately:
print('wrong decode  :', data.decode('cp1252'))   # mojibake, no error raised!
print('right decode  :', data.decode('utf-8'))

# The reverse mistake at least fails loudly:
try:
    text.encode('cp1252').decode('utf-8')
except UnicodeDecodeError as e:
    print('utf-8 refused cp1252 bytes:', e)`}
        />
        <Callout kind="tip" title="Read the error direction">
          Garbage like <code>Ã©</code> with no exception = utf-8 read as cp1252. A loud <code>UnicodeDecodeError: invalid start byte</code> = the reverse. The failure mode tells you the fix.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="The csv module: quoting, dialects, and newline=''">
        <Tiered
          layman={
            <>
              <p>Reading a CSV sounds easy: split each line on commas. But what about a customer named "Smith, Alice"? That comma is data, not a separator — so the file wraps the field in quotes. Now your splitter must understand quotes. And a quote inside a quoted field? There is a rule for that too (double it). Splitting on commas is opening containers with a chainsaw: fast, and sometimes you cut the cargo in half.</p>
              <p>Python's <code>csv</code> module is the trained crane operator: it knows the quoting rules, the delimiter variations, and the line-ending quirks, and it has been battle-tested for twenty years. Never split CSV by hand; always let the module do it.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong><code>csv.reader(f)</code></strong> yields rows as lists; <strong><code>csv.DictReader(f)</code></strong> uses the header to yield dicts — usually what you want, because <code>row['total']</code> survives column reordering while <code>row[3]</code> does not.</li>
                <li><strong>Dialect parameters:</strong> <code>delimiter=';'</code> for European exports, <code>quotechar</code>, and writer <code>quoting</code> policies (<code>QUOTE_MINIMAL</code> is the sane default).</li>
                <li><strong>Everything is a string.</strong> <code>DictReader</code> gives you <code>{"{'qty': '5'}"}</code> — type conversion is your job, and it is exactly where decimal commas (<code>49,90</code>) ambush <code>float()</code>.</li>
                <li><strong>On Windows, always open CSV files with <code>newline=''</code></strong> — reading and writing. Otherwise Python's newline translation stacks with the csv module's own <code>\r\n</code> handling and every written row gains a blank line.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>The quoting grammar is why CSV cannot be parsed by a per-line regex: a quoted field may contain the delimiter, the quote character (doubled), and even embedded newlines — so record boundaries are not line boundaries. A correct parser is a small state machine (inside/outside quotes), which is what the C-implemented <code>_csv</code> module is. The embedded-newline case is also why counting rows with line-counting tools is subtly wrong on arbitrary CSV.</p>
              <p><code>newline=''</code> is a layering fix: Windows text mode translates <code>\n</code> to <code>\r\n</code> on write, but the csv module — per RFC 4180 — already terminates records with <code>\r\n</code>. Two layers each adding a carriage return yields <code>\r\r\n</code>, which readers render as alternating blank lines. <code>newline=''</code> disables the translation layer and hands newline discipline to the csv module, which is the documented contract.</p>
            </>
          }
        />
        <p>Proof, not vibes — naive splitting versus the real parser on the same data:</p>
        <CodeRunner
          language="python"
          code={`import csv
import io

raw = '''id,customer,city
1,"Smith, Alice",Austin
2,Bob,Boston
'''

print('--- naive str.split(",") ---')
for line in raw.strip().split('\\n')[1:]:
    print(line.split(','))          # Alice gets cut in half

print()
print('--- csv.reader ---')
for row in csv.reader(io.StringIO(raw)):
    print(row)                      # quoting handled correctly`}
        />
        <p>The ingestion workhorse — <code>DictReader</code> with a non-default dialect plus explicit type conversion, and <code>DictWriter</code> back out:</p>
        <CodeRunner
          language="python"
          code={`import csv
import io

# A European-style export: semicolon delimiter, decimal commas
raw = '''sku;qty;price
A-100;5;9,99
B-200;3;12,50
'''

rows = []
for r in csv.DictReader(io.StringIO(raw), delimiter=';'):
    r['qty'] = int(r['qty'])
    r['price'] = float(r['price'].replace(',', '.'))
    rows.append(r)
print(rows)

out = io.StringIO()
# lineterminator only because this demo prints to screen; real files
# get their newline discipline from open(..., newline='') instead
w = csv.DictWriter(out, fieldnames=['sku', 'qty', 'price'], lineterminator='\\n')
w.writeheader()
w.writerows(rows)
print(out.getvalue())`}
        />
        <p>Finally the BOM — Excel's little gift at the front of the file, and why it breaks column lookups:</p>
        <CodeRunner
          language="python"
          code={`import csv
import io

data = b'\\xef\\xbb\\xbfid,name\\n1,Ana\\n'   # Excel prepends EF BB BF

header = next(csv.reader(io.StringIO(data.decode('utf-8'))))
print('utf-8     first column:', repr(header[0]))   # '\\ufeffid' - row['id'] fails!
header = next(csv.reader(io.StringIO(data.decode('utf-8-sig'))))
print('utf-8-sig first column:', repr(header[0]))`}
        />
      </Section>

      <Section kicker="trade-offs" title="csv module vs pandas vs rolling your own">
        <Tradeoffs
          options={[
            {
              name: 'stdlib csv module',
              strengths: [
                'Zero dependencies, streams row-by-row in constant memory',
                'Full dialect control; you handle every malformed row explicitly',
              ],
              weaknesses: [
                'Everything is a string — type conversion is manual',
                'No header inference, date parsing, or missing-value handling',
              ],
              chooseWhen: 'you are building ingestion code: predictable, streaming, dependency-free — the P1 default.',
            },
            {
              name: 'pandas.read_csv',
              strengths: [
                'One line gives typed columns, NA handling, date parsing',
                'Fast C engine; great for exploration and analysis',
              ],
              weaknesses: [
                'Loads the whole file into memory by default',
                'Type inference guesses wrong silently (leading zeros in IDs, mixed columns)',
              ],
              chooseWhen: 'the data fits in RAM and you are about to analyze or reshape it anyway (lesson 1.3.5).',
            },
            {
              name: 'manual split/regex parsing',
              strengths: [
                'No abstractions — total control over every byte',
                'Occasionally right for fixed-width or truly non-CSV line formats',
              ],
              weaknesses: [
                'Breaks on quoted delimiters, escaped quotes, embedded newlines',
                'You will re-implement the csv state machine, badly, under deadline',
              ],
              chooseWhen: 'the file is genuinely not CSV (fixed-width, ad-hoc logs) — never for actual CSV.',
            },
          ]}
          note={<>The recurring shape: stdlib for <em>moving</em> data reliably, pandas for <em>analyzing</em> it, manual parsing only when the format is not what it claims to be. You will make the same call again with JSON (1.3.2) and DataFrames (1.3.5).</>}
        />
      </Section>

      <Section kicker="hands-on" title="Lab: defuse a legacy Windows export">
        <Lab
          lessonId={ID}
          intro={<p>You will manufacture a realistically nasty file — cp1252-encoded, semicolon-delimited, decimal commas, a quoted comma, CRLF endings — watch the naive approach fail, then parse it correctly. This is a rehearsal for every vendor file you will ever receive.</p>}
          steps={[
            {
              title: 'Create the project',
              commands: [{ ps: 'mkdir C:\\de-lab\\m13-files; cd C:\\de-lab\\m13-files\nuv init' }],
              checkpoint: <><code>uv init</code> reports the project created and <code>ls</code> shows <code>pyproject.toml</code>.</>,
            },
            {
              title: 'Write the messy file',
              body: <p>Paste the whole block — the here-string writes a Python script, then runs it. The script encodes the file the way a 2009-era Windows system would:</p>,
              commands: [{ ps: `@'
CONTENT = (
    'order_id;customer;city;total\\r\\n'
    '1001;"Müller, Hans";München;49,90\\r\\n'
    '1002;José García;Málaga;15,00\\r\\n'
    '1003;"Brien, Anne";Cork;22,50\\r\\n'
)
with open('messy.csv', 'w', encoding='cp1252', newline='') as f:
    f.write(CONTENT)
print('wrote messy.csv')
'@ | Set-Content -Encoding utf8 make_messy.py
uv run python make_messy.py` }],
              checkpoint: <><code>wrote messy.csv</code> prints and <code>ls</code> shows <code>messy.csv</code> (about 120 bytes).</>,
            },
            {
              title: 'Watch the naive read fail',
              body: <p>Try reading it the way most tutorials would — assuming utf-8:</p>,
              commands: [{ ps: `uv run python -c "print(open('messy.csv', encoding='utf-8').read())"` }],
              checkpoint: <>A <code>UnicodeDecodeError</code> mentioning <code>invalid start byte</code> — cp1252's 0xFC (the ü in Müller) refusing to be utf-8. Loud failure is the <em>good</em> outcome; remember the silent one from the mojibake demo.</>,
            },
            {
              title: 'Parse it correctly',
              body: <p>The real ingestion script: right encoding, right delimiter, <code>newline=''</code>, typed conversion of decimal-comma totals:</p>,
              commands: [{ ps: `@'
import csv
from pathlib import Path

rows = []
with Path('messy.csv').open(encoding='cp1252', newline='') as f:
    for row in csv.DictReader(f, delimiter=';'):
        row['total'] = float(row['total'].replace(',', '.'))
        rows.append(row)

for r in rows:
    print(r)
print('parsed', len(rows), 'rows')
'@ | Set-Content -Encoding utf8 parse_messy.py
uv run python parse_messy.py` }],
              checkpoint: <>Exactly 3 rows print. Row 1 shows customer <code>Müller, Hans</code> — umlaut intact, internal comma intact — city <code>München</code>, and <code>'total': 49.9</code> as a float. If you see <code>MÃ¼ller</code>, the encoding is wrong; if Hans lost his comma, the quoting is.</>,
            },
            {
              title: 'Re-export clean utf-8 (and trigger the newline bug on purpose)',
              body: <p>Good pipelines normalize weird inputs into boring outputs. Write the parsed rows back as comma-delimited utf-8:</p>,
              commands: [{ ps: `@'
import csv

rows = [
    {'order_id': '1001', 'customer': 'Müller, Hans', 'city': 'München', 'total': 49.9},
    {'order_id': '1002', 'customer': 'José García', 'city': 'Málaga', 'total': 15.0},
    {'order_id': '1003', 'customer': 'Brien, Anne', 'city': 'Cork', 'total': 22.5},
]
with open('clean.csv', 'w', encoding='utf-8', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['order_id', 'customer', 'city', 'total'])
    w.writeheader()
    w.writerows(rows)
print('wrote clean.csv')
'@ | Set-Content -Encoding utf8 write_clean.py
uv run python write_clean.py
Get-Content clean.csv` }],
              checkpoint: <><code>Get-Content clean.csv</code> shows 4 tidy lines with <em>no blank lines between rows</em>. Now delete <code>newline=''</code> from the script, rerun, and look again — every row grows a blank line under it. Put it back. You have now seen the bug you would otherwise meet in production.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: "Your parser prints 'MÃ¼ller' instead of 'Müller' and raises no error. What happened?",
              options: [
                'The file is corrupted on disk',
                'utf-8 bytes were decoded as cp1252 (or another single-byte codec)',
                'cp1252 bytes were decoded as utf-8',
                'The csv module mangled the quotes',
              ],
              answer: 1,
              explain:
                'The two-byte utf-8 sequence for ü (0xC3 0xBC) was decoded one byte at a time by a single-byte codec, yielding Ã¼. The reverse mistake fails loudly with UnicodeDecodeError. The direction of the failure tells you the direction of the fix.',
            },
            {
              q: "Why is str.split(',') not a CSV parser?",
              options: [
                'It is too slow for large files',
                'It cannot handle files bigger than memory',
                'Quoted fields may contain delimiters, doubled quotes, even newlines — splitting ignores all of that',
                'It only works on utf-8 files',
              ],
              answer: 2,
              explain:
                'CSV quoting is a grammar, not a character split: "Smith, Alice" must stay one field, "" inside quotes means a literal quote, and a quoted field can span lines. Parsing it needs a state machine — which is exactly what the csv module is.',
            },
            {
              q: "Why must you pass newline='' when opening CSV files on Windows?",
              options: [
                'It makes reading faster',
                "It stops newline translation from stacking with the csv module's own \\r\\n handling, which otherwise writes blank lines",
                'It converts the file to utf-8 automatically',
                'It is only needed for files created by Excel',
              ],
              answer: 1,
              explain:
                "The csv module terminates rows with \\r\\n per RFC 4180; Windows text mode then translates the \\n again, producing \\r\\r\\n — a blank line after every row. newline='' hands newline discipline entirely to the csv module.",
            },
            {
              q: "row['id'] raises KeyError, but the header clearly says id. Likeliest cause?",
              options: [
                'The file uses semicolons as delimiters',
                "A BOM: the first column is actually '\\ufeffid' — open with encoding='utf-8-sig'",
                'DictReader lowercases all column names',
                'The file has trailing whitespace',
              ],
              answer: 1,
              explain:
                'Excel prepends the utf-8 BOM (EF BB BF). Decoded with plain utf-8 it becomes an invisible \\ufeff glued to the first column name. utf-8-sig strips it; a delimiter problem would instead give you one giant column.',
            },
            {
              q: 'When is pandas.read_csv the wrong tool for reading a CSV?',
              options: [
                'When the file has more than 10 columns',
                'When you need typed columns',
                'When the file may exceed RAM or you need explicit, streaming, dependency-free ingestion',
                'pandas is always the right tool for CSV',
              ],
              answer: 2,
              explain:
                'read_csv loads everything into memory and infers types silently — great for analysis, risky for ingestion. The stdlib csv module streams in constant memory and makes every conversion explicit, which is what pipeline boundary code wants.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'A customer-uploaded CSV shows names like JosÃ© in your warehouse. Walk me through your diagnosis.',
            a: <p>The Ã pattern means utf-8 bytes were decoded with a single-byte codec (cp1252/latin-1) somewhere in the path — silently, because cp1252 can decode almost any byte. Find the first decode step, make the encoding explicit instead of platform-default, re-ingest. Strong answers add the asymmetry — the reverse mismatch would have been a loud UnicodeDecodeError — and note that corrupted rows need re-ingestion from source, since mojibake is not always reversible.</p>,
          },
          {
            q: 'Why does CSV still dominate data exchange when better formats exist?',
            a: <p>Lowest common denominator: every system of the last forty years can emit and consume it, it is human-inspectable, and it streams trivially. The costs — no schema, no types, no enforced encoding, dialect chaos — are paid by the consumer, not the producer, which is exactly why it persists. In-pipeline, you convert to a typed columnar format (Parquet, Phase 2) at the first opportunity and keep CSV at the edges.</p>,
          },
          {
            q: 'How would you handle a 200 GB CSV on a 16 GB laptop?',
            a: <p>Stream it: the csv reader is an iterator, so read, transform, and write row-by-row in constant memory — never materialize the file. Mention chunked processing (read_csv with chunksize, or engines like DuckDB/polars that scan CSV larger than RAM), and that the durable answer is converting to partitioned Parquet once so nobody pays the 200 GB parse twice.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Files are bytes; text needs a codec. Always pass <code>encoding=</code> explicitly — the platform default is a bug waiting for a second machine.</>,
          <>Mojibake (<code>Ã©</code>) means utf-8 read as cp1252 and is silent; <code>UnicodeDecodeError</code> means the reverse and is loud. The failure mode tells you the fix.</>,
          <>Never split CSV by hand: quoting rules require the csv module's state machine.</>,
          <>On Windows, every CSV <code>open()</code> gets <code>newline=''</code>, and Excel-born files get <code>utf-8-sig</code>.</>,
          <><code>DictReader</code> plus explicit type conversion is the ingestion workhorse; everything it yields is a string until you convert it.</>,
          <>CSV is for the edges of a pipeline. Inside, you will convert to typed, schema-carrying formats — Parquet, coming in Phase 2.</>,
        ]}
      />
    </>
  )
}
