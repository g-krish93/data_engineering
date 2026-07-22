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

const ID = '1.3.4'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Timezone bugs: the classic silent pipeline corrupter">
        <Tiered
          layman={
            <>
              <p>Look at an airport departure board: "Flight to Tokyo, departs 9:00". Whose 9:00? The board means local airport time, your watch might be on home time, your friend in Tokyo thinks in Tokyo time, and the airline's computers think in none of the above. Every "9:00" is meaningless until you know <em>where</em> its clock lives. Humans resolve this by context; computers do not do context.</p>
              <p>Data systems handle millions of timestamps recorded by machines in different countries, on servers set to different clocks, written in a dozen formats. When a pipeline mixes them up, nothing crashes — sales quietly land on the wrong day, "daily" reports cover 23-hour or 25-hour days twice a year, and nobody notices for months. That is what makes time the classic silent corrupter, and why engineers treat it with paranoid discipline.</p>
            </>
          }
          student={
            <>
              <p>Python datetimes come in two kinds and the distinction rules everything: <strong>naive</strong> (no <code>tzinfo</code> — a wall-clock reading with no idea whose wall) and <strong>aware</strong> (carries an offset/zone — an unambiguous instant). Naive timestamps are where bugs breed: two naive values from different zones compare as if from the same one, and Python cannot warn you because the information is simply not there.</p>
              <p>The professional discipline is one sentence: <strong>convert to UTC at ingestion, do all pipeline work in UTC, convert to local only at display.</strong> UTC has no DST, never repeats an hour, and totally orders events globally. Every messy source format — ISO 8601 strings, epoch seconds, "03/08/2026" vendor formats, local times with a zone name — gets normalized to aware-UTC at the boundary of your <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>: the same move as encodings in 1.3.1, chaos outside, one convention inside.</p>
            </>
          }
          phd={
            <>
              <p>Precision about what a timestamp <em>is</em>: an instant on the timeline versus a civil (wall-clock) time are different types, related only through a zone's offset function — a political artifact, piecewise-constant, changed by legislation with weeks of notice (hence IANA tzdata shipping several updates a year). Two further clocks matter: the wall clock (<code>time.time()</code>) can be stepped by NTP and is wrong for measuring durations; the monotonic clock (<code>time.monotonic()</code>, <code>perf_counter</code>) only moves forward — durations from wall-clock subtraction is a real bug class. Leap seconds add a wrinkle: UTC occasionally inserts second 60, POSIX time pretends it does not exist, so large fleets "smear" the second across the day rather than replay a timestamp.</p>
              <p>The distinction that dominates streaming (Phase 5): <strong>event time</strong> (when it happened, stamped at the source) versus <strong>processing time</strong> (when your system saw it). They diverge under lag, retries, and offline devices; windowed aggregations must choose, and choosing processing time silently reassigns late events to wrong windows. Storage-side, precision is a schema decision — int64 epoch at seconds, millis, micros, or nanos; nanosecond int64 overflows in 2262, and mixed precisions corrupt joins — foreshadowing Parquet's parameterized timestamp types in Phase 2.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="The datetime toolbox: naive, aware, epoch, ISO 8601">
        <Tiered
          layman={
            <>
              <p>Python gives you a small family: a <em>date</em> (just the day), a <em>datetime</em> (day plus time), and a <em>timedelta</em> (a duration — "36 hours" — you can add and subtract). A datetime can optionally carry a tag saying whose clock it belongs to; with the tag it names an exact moment on Earth, without it it is just numbers on a dial.</p>
              <p>For writing moments down, the world has one good convention: ISO 8601 — <code>2026-07-04T12:00:00+00:00</code>, biggest unit first, offset at the end. It sorts correctly as plain text and no one can misread the month for the day. For machines talking to machines there is the epoch: a count of seconds since Jan 1, 1970 UTC — one number, no format, no ambiguity.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Arithmetic:</strong> <code>timedelta</code> for durations; aware minus aware gives a timedelta; naive-vs-aware comparison raises <code>TypeError</code> — a <em>helpful</em> crash.</li>
                <li><strong>Make aware:</strong> <code>replace(tzinfo=...)</code> attaches a zone to the same wall time (only correct when you <em>know</em> the source zone); <code>astimezone(...)</code> converts (changes the clock, preserves the instant). Confusing these two is the classic off-by-an-offset bug.</li>
                <li><strong>Parsing:</strong> <code>datetime.fromisoformat()</code> for ISO strings (handles <code>Z</code> and offsets since 3.11); <code>strptime(s, '%d/%m/%Y %H:%M')</code> for vendor formats; <code>strftime</code> to format out. Try ISO first, documented vendor formats second, fail loudly third.</li>
                <li><strong>Epoch:</strong> <code>dt.timestamp()</code> and <code>datetime.fromtimestamp(ts, tz=timezone.utc)</code>. Always pass <code>tz=</code> — the bare version gives local time and a portability bug.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>Why the naive-vs-aware TypeError is the right design: a naive datetime is not "a time in an unknown zone" — it is a different type, a civil time with no instant semantics, and comparing it to an instant is a category error. The subtle corollary: naive arithmetic is civil arithmetic ("same wall time tomorrow"), aware-UTC arithmetic is instant arithmetic ("exactly 24 hours later") — across a DST boundary these genuinely differ, and which is "correct" depends on whether the requirement meant a wall-clock schedule or a physical duration. No library can answer that; only the requirement can.</p>
              <p>ISO 8601 (the standard) and RFC 3339 (the internet profile you actually want) differ at the margins — RFC 3339 mandates complete date-times with offsets, forbidding the standard's exotica (week dates, ordinal dates, local times). "Exchange RFC 3339 strings, store epoch integers or UTC timestamps" is the concise production position. And an offset is not a zone: <code>+02:00</code> gives you the instant but not the rulebook — you cannot compute "same time next month" from an offset, which is why zone names travel in a separate column when civil semantics must survive storage.</p>
            </>
          }
        />
        <p>Run the two kinds colliding — and the epoch round-trip:</p>
        <CodeRunner
          language="python"
          code={`from datetime import date, datetime, timedelta, timezone

naive = datetime(2026, 7, 1, 9, 0)
aware = datetime(2026, 7, 1, 9, 0, tzinfo=timezone.utc)
print('naive:', naive.isoformat(), '| tzinfo:', naive.tzinfo)
print('aware:', aware.isoformat(), '| tzinfo:', aware.tzinfo)

print('aware + 36h :', (aware + timedelta(hours=36)).isoformat())
print('days between:', (date(2026, 7, 15) - date(2026, 7, 1)).days)

try:
    naive < aware
except TypeError as e:
    print('TypeError:', e)          # Python refuses to guess - good!

# Epoch: the same instant as one number, and back
print('epoch:', aware.timestamp())
print('back :', datetime.fromtimestamp(aware.timestamp(), tz=timezone.utc).isoformat())`}
        />
        <p>And the normalizer pattern — messy formats in, one aware-UTC convention out. The lab's core, previewed:</p>
        <CodeRunner
          language="python"
          code={`from datetime import datetime, timezone

def normalize(value):
    if isinstance(value, (int, float)):                # epoch seconds
        return datetime.fromtimestamp(value, tz=timezone.utc)
    try:
        dt = datetime.fromisoformat(value)             # ISO 8601, Z or offset
    except ValueError:
        dt = datetime.strptime(value, '%d/%m/%Y %H:%M')  # vendor format, documented UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)           # documented-UTC naive -> aware
    return dt.astimezone(timezone.utc)

samples = ['2026-07-04T12:00:00Z', '2026-07-04 08:00:00-04:00',
           '04/07/2026 12:00', 1783166400]
for s in samples:
    print(str(s).ljust(28), '->', normalize(s).isoformat())`}
        />
        <Callout kind="warn" title="replace vs astimezone">
          <code>replace(tzinfo=...)</code> keeps the digits and changes the meaning; <code>astimezone(...)</code> keeps the meaning and changes the digits. Use <code>replace</code> only at the moment you attach a <em>known</em> source zone to a naive value; <code>astimezone</code> everywhere else. Swapping them shifts every timestamp by the offset — silently.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Time zones and DST: zoneinfo and the 2:30 that happens twice">
        <Tiered
          layman={
            <>
              <p>A timezone is not a fixed offset — it is a rulebook. "New York time" means "UTC minus 5, except mid-March to early November when it is minus 4, except the rules were different in 2006, except..." Python ships a reader for the world's official rulebooks: <code>zoneinfo</code>. Hand it a city-style name like <code>America/New_York</code> and it applies whichever rule was in force at that moment in history.</p>
              <p>Daylight saving is where clocks do impossible things. One night each spring, 2:30 a.m. never occurs — clocks jump from 2:00 to 3:00. One night each fall, 1:30 a.m. occurs <em>twice</em> — clocks roll back at 2:00. Any schedule, log, or report built on local time inherits these potholes twice a year. UTC has no potholes; that is the entire argument for it.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><code>ZoneInfo('Europe/Berlin')</code> — always IANA names, never fixed offsets (<code>UTC+2</code> is a snapshot; the zone is the rulebook) and never abbreviations (<code>IST</code> means three different things on three continents). On Windows, <code>uv add tzdata</code> supplies the database the OS does not ship.</li>
                <li><strong>Fall-back ambiguity:</strong> a local 1:30 a.m. on the repeat night maps to two instants. The <code>fold</code> attribute picks: <code>fold=0</code> first occurrence, <code>fold=1</code> second. Code that never mentions fold is silently taking the first.</li>
                <li><strong>Spring-forward gap:</strong> the skipped 2:30 does not error — zoneinfo maps it to <em>something</em> — so invalid source data flows through unless you check.</li>
                <li><strong>The arithmetic trap:</strong> adding <code>timedelta(hours=1)</code> to an aware local time does wall-clock math; to add <em>physical</em> hours, convert to UTC, add, convert back. Across a DST boundary these disagree by exactly the shift.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>The IANA tz database is one of software's great archival projects: per-zone piecewise offset functions back to the 1800s, including pre-standardization local mean time (hence odd second-offsets in very old timestamps), maintained by public review and versioned like <code>2026a</code>. Offsets are not integer hours (India +5:30, Nepal +5:45), have exceeded +13:00, and change by decree — Morocco shifts for Ramadan annually; Kiribati skipped December 31, 1994 entirely. Pinning tzdata like any dependency and re-running date logic after updates is a real operational concern for long-horizon schedulers.</p>
              <p>PEP 495 (<code>fold</code>) is a clean solution to a gnarly problem: local-time ambiguity is unresolvable within the value, so the disambiguator rides along as an attribute that comparison mostly ignores — preserving hash/equality for the unambiguous 8,758 hours a year while distinguishing the two 1:30s under conversion. Note the asymmetry with the gap: ambiguous times have two preimages, gap times have zero, and zoneinfo extrapolates rather than raises — the same lenient-parser stance you saw in CSV, with the same consequence: validation is your job, not the library's.</p>
            </>
          }
        />
        <p>Convert one stored UTC instant to four local displays — "whose 9 a.m.", answered properly. The first import fetches the IANA database into the browser runtime:</p>
        <CodeRunner
          language="python"
          code={`import tzdata  # noqa: F401 - makes the IANA timezone database available here
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

event_utc = datetime(2026, 7, 1, 13, 30, tzinfo=timezone.utc)
print('stored (UTC):      ', event_utc.isoformat())
for zone in ['America/New_York', 'Europe/Berlin', 'Asia/Kolkata', 'Australia/Sydney']:
    local = event_utc.astimezone(ZoneInfo(zone))
    print(zone.ljust(19), local.isoformat())`}
        />
        <p>Now the DST potholes, made runnable — the repeated hour, the missing hour, and the arithmetic trap:</p>
        <CodeRunner
          language="python"
          code={`import tzdata  # noqa: F401
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ny = ZoneInfo('America/New_York')

# Fall back, Nov 1 2026: 1:30am happens TWICE - fold picks which one
ambiguous = datetime(2026, 11, 1, 1, 30, tzinfo=ny)
print('1:30 first time :', ambiguous.isoformat())                 # -04:00 (EDT)
print('1:30 second time:', ambiguous.replace(fold=1).isoformat()) # -05:00 (EST)

# Spring forward, Mar 8 2026: 2:30am never happened - but no error!
ghost = datetime(2026, 3, 8, 2, 30, tzinfo=ny)
print('nonexistent 2:30:', ghost.isoformat(), '<- silently accepted')

# Wall-clock vs physical arithmetic across the gap
before = datetime(2026, 3, 8, 1, 30, tzinfo=ny)
wall = before + timedelta(hours=1)
physical = (before.astimezone(timezone.utc) + timedelta(hours=1)).astimezone(ny)
print('1:30 + 1h (wall)    :', wall.isoformat())
print('1:30 + 1h (physical):', physical.isoformat())`}
        />
      </Section>

      <Section kicker="trade-offs" title="What to store: aware UTC, naive UTC, or local?">
        <Tradeoffs
          options={[
            {
              name: 'Aware UTC at boundaries',
              strengths: [
                'Unambiguous instants; ISO output carries +00:00 so no reader can misinterpret',
                'Mixing zones is impossible by construction',
              ],
              weaknesses: [
                'tzinfo objects add overhead and serialization friction in some libraries',
                'Loses the original civil time — display zone must be tracked separately',
              ],
              chooseWhen: 'data crosses a boundary: APIs in, files out, anything another system will read.',
            },
            {
              name: 'Naive-UTC by convention inside',
              strengths: [
                'Lean and universal: every database, format, and library handles a plain timestamp',
                'One documented rule ("all internal timestamps are UTC") replaces per-value tags',
              ],
              weaknesses: [
                'The convention is invisible in the data — one undocumented local-time join corrupts silently',
                'Safety lives in docs and code review, not in the type',
              ],
              chooseWhen: 'inside storage and compute you control, with the convention written down and enforced at ingestion.',
            },
            {
              name: 'Local time (with zone column)',
              strengths: [
                'Preserves civil-time semantics: "9 a.m. store opening" survives DST rule changes',
                'What business users actually mean for wall-clock events and schedules',
              ],
              weaknesses: [
                'Ambiguous and gapped hours twice a year; cross-zone aggregation needs conversion every query',
                'Zone rulebook changes retroactively alter what stored values mean',
              ],
              chooseWhen: 'the wall-clock reading IS the datum: schedules, opening hours, legal/billing local dates.',
            },
          ]}
          note={<>The honest position most pipelines converge on: <strong>aware UTC at every boundary, naive-UTC by documented convention at rest, plus the original zone (or raw string) in a side column when civil semantics matter.</strong> The middle option is a pragmatic economy, not a principle — it works exactly as long as the ingestion gate normalizing everything to UTC never lets an exception through. That gate is what your lab builds.</>}
        />
      </Section>

      <Section kicker="hands-on" title="Lab: normalize the mess to aware-UTC ISO 8601">
        <Lab
          lessonId={ID}
          intro={<p>Five timestamps arrive in four formats from three "systems". You will normalize all of them to one aware-UTC convention — and because they all secretly name the same instant, the checkpoint is self-grading: five identical lines.</p>}
          steps={[
            {
              title: 'Project setup with tzdata',
              body: <p>Windows does not ship the IANA database, so <code>zoneinfo</code> needs the <code>tzdata</code> package:</p>,
              commands: [{ ps: `mkdir C:\\de-lab\\m13-time; cd C:\\de-lab\\m13-time
uv init
uv add tzdata
uv run python -c "from zoneinfo import ZoneInfo; print(ZoneInfo('Asia/Kolkata'))"` }],
              checkpoint: <>The last command prints <code>Asia/Kolkata</code>. Without tzdata it raises <code>ZoneInfoNotFoundError</code> — the Windows failure mode worth having seen once.</>,
            },
            {
              title: 'Write and run the normalizer',
              body: <p>The inputs: ISO with Z, ISO with an offset, a day-first vendor string documented as UTC, epoch seconds, and a wall-clock time tagged with its zone name:</p>,
              commands: [{ ps: `@'
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

MESSY = [
    '2026-03-08T14:30:00Z',
    '2026-03-08 09:30:00-05:00',
    '08/03/2026 14:30',
    1772980200,
    ('2026-03-08 20:00:00', 'Asia/Kolkata'),
]

def normalize(value):
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=timezone.utc)
    if isinstance(value, tuple):
        wall, zone = value
        return datetime.fromisoformat(wall).replace(tzinfo=ZoneInfo(zone)).astimezone(timezone.utc)
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        dt = datetime.strptime(value, '%d/%m/%Y %H:%M')
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

for raw in MESSY:
    print(str(raw).ljust(42), '->', normalize(raw).isoformat())
'@ | Set-Content -Encoding utf8 normalize.py
uv run python normalize.py` }],
              checkpoint: <>Five lines, and every one ends in exactly <code>2026-03-08T14:30:00+00:00</code>. Kolkata's 20:00 became 14:30 because IST is UTC+5:30. If any line differs, check <code>replace</code> vs <code>astimezone</code> in your copy — that swap is the usual culprit.</>,
            },
            {
              title: 'Touch the DST pothole yourself',
              commands: [{ ps: `@'
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ny = ZoneInfo('America/New_York')
first = datetime(2026, 11, 1, 1, 30, tzinfo=ny)
second = first.replace(fold=1)
print('fold=0:', first.isoformat(), '->', first.astimezone(timezone.utc).isoformat())
print('fold=1:', second.isoformat(), '->', second.astimezone(timezone.utc).isoformat())
'@ | Set-Content -Encoding utf8 dst_demo.py
uv run python dst_demo.py` }],
              checkpoint: <>The same local digits <code>01:30:00</code> appear with offset <code>-04:00</code> on the first line and <code>-05:00</code> on the second, mapping to UTC <code>05:30</code> and <code>06:30</code> — one wall-clock reading, two real instants, one hour apart.</>,
            },
            {
              title: 'Why "daily at 9 a.m. Berlin" is not a fixed UTC schedule',
              commands: [{ ps: `@'
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

berlin = ZoneInfo('Europe/Berlin')
for month, label in [(1, 'January'), (7, 'July')]:
    nine_local = datetime(2026, month, 15, 9, 0, tzinfo=berlin)
    print(label.ljust(8), '9:00 Berlin =', nine_local.astimezone(timezone.utc).isoformat(), 'UTC')
'@ | Set-Content -Encoding utf8 schedule_demo.py
uv run python schedule_demo.py` }],
              checkpoint: <>January's 9:00 is <code>08:00</code> UTC; July's is <code>07:00</code> UTC. Any cron job pinned to one UTC hour drifts an hour off a local-time SLA twice a year — the reason schedulers (and Phase 3's <GlossaryTerm k="orchestrator">orchestrator</GlossaryTerm>) let you attach a timezone to a schedule.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'What makes a datetime "aware", and why does the pipeline convention demand it at boundaries?',
              options: [
                'It stores nanosecond precision',
                'It carries tzinfo, making it an unambiguous instant — naive values silently compare across zones as if they shared one',
                'It is stored as an epoch integer internally',
                'It automatically updates when DST rules change',
              ],
              answer: 1,
              explain:
                'Awareness is just the presence of zone/offset information, but it upgrades the value from "numbers on some dial" to "a point on the global timeline". Python at least refuses naive-vs-aware comparisons; naive-vs-naive from different zones is the crash that never comes.',
            },
            {
              q: 'A log shows local time 01:30 on the November fall-back night in New York. What is true?',
              options: [
                'It names exactly one instant, like any other timestamp',
                'It is invalid — 1:30 does not exist that night',
                'It names two possible instants, one hour apart; fold (0 or 1) disambiguates',
                'zoneinfo raises an exception when constructing it',
              ],
              answer: 2,
              explain:
                'Clocks roll back at 2:00, so 1:00-2:00 happens twice: once at -04:00, once at -05:00. PEP 495 fold selects the occurrence, defaulting to the first. The nonexistent time is the spring one — and that one is silently accepted, not rejected.',
            },
            {
              q: 'A job stored datetime.fromtimestamp(1772980200) without tz= on a Berlin server; the company then moved servers to Virginia. What breaks?',
              options: [
                'Nothing — epoch conversion is deterministic',
                'The naive result now reflects US Eastern wall time instead of Berlin wall time: same code, same input, different values',
                'fromtimestamp raises without a tz argument',
                'The epoch value itself changes between machines',
              ],
              answer: 1,
              explain:
                "Bare fromtimestamp converts to the machine's local zone and returns naive — a hidden dependency on server configuration. tz=timezone.utc makes the result machine-independent and aware. Epoch in, explicit UTC out: no exceptions.",
            },
            {
              q: 'Adding timedelta(hours=24) to an aware Berlin datetime across the spring DST boundary differs from converting to UTC, adding 24h, and converting back. Which is right?',
              options: [
                'The wall-clock version — timedelta is defined on local time',
                'The UTC version — physical duration is the only correct interpretation',
                'They never differ; DST does not affect arithmetic',
                'Whichever the requirement means: "same time tomorrow" is wall-clock math, "24 physical hours" is instant math',
              ],
              answer: 3,
              explain:
                'Both are internally consistent answers to different questions. A daily 9 a.m. report wants wall-clock; a 24-hour data window wants physical. The bug is not choosing wrongly — it is not noticing there was a choice.',
            },
            {
              q: 'Why store IANA zone names (Europe/Berlin) rather than fixed offsets (+02:00) when civil time matters?',
              options: [
                'Offsets take more storage space',
                'An offset is one snapshot of the rulebook: it cannot express DST transitions or rule changes, so "next month, same local time" computed from an offset is wrong half the year',
                'Python cannot parse offset strings',
                'IANA names compress better',
              ],
              answer: 1,
              explain:
                'Berlin is +01:00 or +02:00 depending on the date — and on legislation. The zone name is the function; the offset is one evaluation of it. Store the offset and you can recover the instant; store the zone and you can also recover future and past civil times correctly.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'What is your timestamp discipline in a pipeline, end to end?',
            a: <p>Normalize to aware UTC at ingestion — parse each source's documented format, attach the source zone with replace only when it is known, astimezone to UTC, fail loudly on anything ambiguous. All internal computation, joins, and storage in UTC; convert to local exclusively at display boundaries, with the display zone as configuration. Strong answers add: preserve the raw string in a side column for replay, and store IANA zone names wherever civil-time semantics (schedules, opening hours) must survive.</p>,
          },
          {
            q: 'A daily local-midnight aggregation ran fine for months, then one Monday total came in wildly off. First hypothesis?',
            a: <p>DST transition: the local "day" was 23 or 25 hours long, so the window boundary shifted in UTC mid-series — the twice-a-year silent corrupter. Verify by checking whether the anomaly date matches a transition in that zone's rulebook. Fixes: aggregate in UTC and convert for display, or if business truly requires local days, compute window edges via the zone rulebook and accept unequal window lengths — explicitly, in code, with a comment.</p>,
          },
          {
            q: 'Why should duration measurements never subtract two wall-clock readings?',
            a: <p>The wall clock is not monotonic: NTP can step it backward or forward at any moment, so elapsed time from time.time() subtraction can come out negative or wildly inflated. time.monotonic() (or perf_counter for benchmarks) is guaranteed non-decreasing and exists precisely for durations. Wall clocks answer "when did it happen"; monotonic clocks answer "how long did it take" — different questions, different instruments.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Ingest to UTC, compute in UTC, display in local — one sentence, whole discipline. UTC has no DST potholes and totally orders events.</>,
          <><code>replace(tzinfo=)</code> attaches a known zone (changes meaning); <code>astimezone()</code> converts (preserves meaning). Swapping them shifts data by the offset, silently.</>,
          <>DST makes local clocks lie twice a year: one hour occurs twice (disambiguate with <code>fold</code>) and one never occurs (accepted silently — validate!).</>,
          <>Zones are rulebooks, not offsets: always IANA names via <code>zoneinfo</code>, with <code>uv add tzdata</code> on Windows.</>,
          <>Epoch conversions always carry <code>tz=timezone.utc</code>; ISO 8601 (RFC 3339 profile) is the interchange string; parse ISO first, vendor formats second, fail loudly third.</>,
          <>Wall-clock vs physical arithmetic diverge across DST; wall vs monotonic clocks answer different questions. Event time vs processing time returns, at scale, in Phase 5.</>,
        ]}
      />
    </>
  )
}
