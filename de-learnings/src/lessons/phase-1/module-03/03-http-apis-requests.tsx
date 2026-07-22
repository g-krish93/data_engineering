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
import { RetryBackoffViz } from '../../../viz/RetryBackoffViz'

const ID = '1.3.3'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="APIs are the front door of most pipelines">
        <Tiered
          layman={
            <>
              <p>Getting data from an API is like phoning a busy restaurant. Usually someone answers. But sometimes the line is busy, sometimes it rings forever, and sometimes a stressed host says "call back in five minutes" and hangs up. A rude caller redials instantly, over and over, making the jam worse. A sensible caller waits a bit, then a bit longer, adds some randomness so they do not redial in lockstep with every other frustrated caller, and gives up gracefully after a few tries.</p>
              <p>Pipelines phone other people's computers thousands of times a night, unattended. The difference between a pipeline that survives a flaky network and one that pages you at 3 a.m. — or gets your company's access revoked — is exactly those phone manners, written in code. This lesson is the manners.</p>
            </>
          }
          student={
            <>
              <p>This is the E in <GlossaryTerm k="etl">ETL</GlossaryTerm>: extraction over HTTP is how most third-party data enters a <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm>, and it is the least reliable link because it crosses into infrastructure you do not control. Everything here follows from one fact: <strong>the network fails routinely, and your code runs unattended.</strong> Requests hang (so: timeouts, always), servers hiccup (so: retries), retries can hammer a struggling server (so: exponential backoff), and synchronized backoff creates waves (so: jitter).</p>
              <p>Project P1 opens with exactly this: calling the Open-Meteo archive API with parameters, timeouts, status handling, and a retry wrapper. Today you build and test every piece — the browser snippets simulate the logic, and the lab hits the real API from your machine.</p>
            </>
          }
          phd={
            <>
              <p>Retry safety is a property of the operation, not the retry code. HTTP's method semantics (RFC 9110) encode it: GET, PUT, DELETE are defined idempotent — repeating them converges to the same state — while POST is not, so retrying a timed-out POST risks double effects (the classic double-charge). Extraction is overwhelmingly GET, which is why aggressive retry policies are safe here in a way they are not for payment APIs; the same <GlossaryTerm k="idempotency">idempotency</GlossaryTerm> argument returns for pipeline writes in every later phase.</p>
              <p>Two systems effects worth the math. <strong>Connection pooling:</strong> each fresh HTTPS connection pays TCP plus TLS handshakes (multiple round trips); a requests <code>Session</code> keeps connections alive, which is why paginated crawls should reuse one. <strong>Thundering herd:</strong> if N clients fail at the same instant with deterministic backoff, all N return at exactly base, then 2x base, then 4x — the outage arrives as synchronized waves that re-knock the server down. Full jitter draws each wait uniformly from [0, ceiling], flattening a spike of N simultaneous calls into an even trickle. The viz below is exactly this, toggleable.</p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Making one request properly">
        <Tiered
          layman={
            <>
              <p>One phone call, done right, has four parts: dial the right number with your request spelled out clearly (the URL and its parameters), decide in advance how long you will wait before hanging up (the timeout), listen to how the other side answered — "here you go", "never heard of it", "we're down" (the status code) — and only then trust what they told you (the body).</p>
              <p>Skipping any part works fine right up until it does not: the call that never hangs up freezes your whole evening, and the answer you did not double-check turns out to have been "we're down" wearing a smile.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Let the library build the URL.</strong> Pass a dict via <code>params=</code> — requests handles encoding, escaping, joining. Hand-concatenated query strings break on the first space, comma, or unicode character.</li>
                <li><strong><code>timeout=</code> on every call, no exceptions.</strong> The default is to wait <em>forever</em> — one hung request freezes an unattended pipeline permanently. <code>timeout=(5, 30)</code> means 5 s to connect, 30 s between bytes.</li>
                <li><strong>Check status before parsing.</strong> <code>resp.raise_for_status()</code> turns 4xx/5xx into exceptions; without it you call <code>.json()</code> on an HTML error page and crash three lines too late. Know: 200 OK, 400 bad request (your bug), 401/403 auth, 404 not found, 429 slow down, 5xx their problem (retryable).</li>
                <li><strong><code>resp.json()</code></strong> parses the body — then lesson 1.3.2 takes over.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>The status taxonomy encodes <em>who should act</em>: 4xx means the client is wrong — retrying the identical request is pointless (and looping on a 401 can lock an account) — while 5xx and transport failures (timeouts, resets) are transient by presumption and retryable. Your retry predicate should be exactly that partition, with 429 as the special case carrying an explicit contract: back off, honoring <code>Retry-After</code> when present.</p>
              <p>The two-part timeout mirrors the socket lifecycle: connect bounds SYN/TLS establishment (fails fast on unroutable hosts — your lab proves it), read bounds inter-byte gaps on an established connection, not total download time — a slow huge response can legally take hours without tripping a 30 s read timeout, so total deadlines need an outer mechanism. And <code>resp.json()</code> trusts Content-Type exactly zero: proxies and captive portals return HTML with status 200, which is why "parse errors" at ingestion boundaries are often network middleboxes, not the API.</p>
            </>
          }
        />
        <p>The canonical P1 request — display-only here because the browser sandbox has no network; the lab runs the real thing:</p>
        <CodeBlock
          label="python (runs in the lab, not the browser)"
          code={`import requests

BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'

params = {
    'latitude': 52.52,
    'longitude': 13.41,
    'start_date': '2024-01-01',
    'end_date': '2024-01-31',
    'hourly': 'temperature_2m',
}
resp = requests.get(BASE_URL, params=params, timeout=(5, 30))
resp.raise_for_status()
doc = resp.json()`}
        />
        <p>What you <em>can</em> run here is everything after the network: the status decision plus the parse, against a canned Open-Meteo-shaped response. This function drops straight into P1 — flip <code>canned_status</code> and re-run:</p>
        <CodeRunner
          language="python"
          code={`import json

canned_status = 200
canned_body = '''{
  "latitude": 52.52, "longitude": 13.41,
  "hourly": {
    "time": ["2024-01-01T00:00", "2024-01-01T01:00", "2024-01-01T02:00"],
    "temperature_2m": [3.1, 2.8, 2.6]
  }
}'''

RETRYABLE = {429, 500, 502, 503, 504}

def handle(status, body):
    if status in RETRYABLE:
        raise RuntimeError(f'HTTP {status}: transient - retry with backoff')
    if status != 200:
        raise RuntimeError(f'HTTP {status}: client-side problem - do NOT retry')
    doc = json.loads(body)
    h = doc['hourly']
    return [{'ts': t, 'temp_c': v} for t, v in zip(h['time'], h['temperature_2m'])]

rows = handle(canned_status, canned_body)
print(len(rows), 'rows, first:', rows[0])

for status in (503, 404):
    try:
        handle(status, canned_body)
    except RuntimeError as e:
        print(e)`}
        />
      </Section>

      <Section kicker="core concepts" title="Pagination, rate limits, and being a polite client">
        <Tiered
          layman={
            <>
              <p>No librarian hands you the whole archive at once — you get it shelf by shelf. APIs are the same: big datasets come in pages, and there are three ways to be told where the next shelf is. Either the shelves are numbered (page 1, page 2, ...), or you ask by date range (give me January, now February), or each delivery comes with a claim ticket for the next one (a cursor).</p>
              <p>And the librarian has house rules: only so many requests per minute. Break them and you get shushed — politely at first ("come back in 30 seconds"), then banned. Polite clients read the rules, pace themselves, and identify themselves. Rude scrapers get IP-blocked, and their company's data goes dark.</p>
            </>
          }
          student={
            <>
              <ul>
                <li><strong>Page-number:</strong> loop <code>page=1, 2, 3...</code> until an empty batch. Simple — but inserts mid-crawl shift the pages, so you can miss or duplicate records.</li>
                <li><strong>Date-range windows:</strong> ask for fixed slices (per day, per month). This is Open-Meteo's model (<code>start_date</code>/<code>end_date</code>) and the natural fit for backfills — each window is an independent, re-runnable, idempotent unit. P1 uses exactly this.</li>
                <li><strong>Cursor:</strong> each response carries an opaque <code>next_cursor</code> token you echo back until absent. Stable under concurrent writes; standard for feeds and event logs.</li>
                <li><strong>Politeness:</strong> honor 429 and <code>Retry-After</code>, keep request rates modest, set a descriptive <code>User-Agent</code>, cache what you already fetched. Keyless public APIs like Open-Meteo survive on clients behaving.</li>
              </ul>
            </>
          }
          phd={
            <>
              <p>Page-number pagination is an offset scan, and offset scans over mutating data are not stable snapshots: an insert between your page-3 and page-4 requests shifts every subsequent row, yielding duplicates or gaps. Cursor pagination keys continuation to a position in an ordered index, making each step a range scan — the keyset-pagination argument you will meet again in SQL. Date-windowing sidesteps differently: it partitions the keyspace up front into individually retryable units, which is precisely what makes backfills parallelizable and re-runs idempotent.</p>
              <p>Server-side rate limiting is usually a token bucket: capacity B, refill rate r — burst B, sustain r. A 429 means the bucket was empty; <code>Retry-After</code> is the refill horizon. Client-side, the dual discipline is pacing plus concurrency caps — and across a fleet of workers, per-worker politeness does not compose into global politeness, which is why serious ingestion platforms centralize rate budgeting.</p>
            </>
          }
        />
        <CodeBlock
          label="python — the pagination loop you will write forever"
          code={`def fetch_pages(session, url):
    page = 1
    while True:
        resp = session.get(url, params={'page': page, 'per_page': 100}, timeout=(5, 30))
        resp.raise_for_status()
        batch = resp.json()['results']
        if not batch:
            return
        yield from batch
        page += 1`}
        />
        <Callout kind="tip" title="Generators again">
          The loop <code>yield</code>s records instead of accumulating a list — pagination is a streaming problem, and the 1.1.4 generator pattern means a million-record crawl uses the memory of one page. The cursor variant has the identical shape: echo <code>next_cursor</code> back until the response stops including one.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Retries: exponential backoff plus jitter">
        <Tiered
          layman={
            <>
              <p>Busy tone? Wait half a minute and call again. Still busy? Wait a full minute. Then two. Each failure doubles your patience — that is exponential backoff, and it gives a struggling restaurant room to breathe instead of piling on.</p>
              <p>But there is a trap: if a hundred callers all got the busy tone at the same moment and all follow the same doubling rule, they all call back at the same instants — busy tone forever, for everyone. The fix is almost silly: everyone waits a <em>random</em> amount up to their limit. The redials spread out, the line clears. That randomness is jitter, and the animation below shows it untangling two colliding callers.</p>
            </>
          }
          student={
            <>
              <p>The production recipe, which you implement in the lab and reuse in P1:</p>
              <ul>
                <li>Retry only transient failures: timeouts, connection errors, 429, 5xx. Never 400/401/404.</li>
                <li>Wait <code>random.uniform(0, min(cap, base * 2 ** attempt))</code> — exponential ceiling, full jitter, capped (say base 0.5 s, cap 30 s).</li>
                <li>Bound attempts (4-6), then fail loudly. Infinite retries hide real outages from you.</li>
                <li>Honor <code>Retry-After</code> on 429 — the server told you the exact wait; use it.</li>
                <li>Log every retry with attempt number, status, and wait — silent retries make latency spikes undiagnosable.</li>
              </ul>
              <p>Libraries like <code>tenacity</code> package this as a decorator; in P1 you write it yourself once — about fifteen lines — so you know exactly what those decorators do.</p>
            </>
          }
          phd={
            <>
              <p>Why full jitter specifically: with deterministic backoff, clients that failed together stay phase-locked — the server sees recurring spikes of the full cohort size at identical instants. Drawing waits uniformly from [0, ceiling] spreads each cohort's return times evenly across the window, so the server experiences near-constant arrival rate instead of impulses. AWS's Architecture Blog analysis ("Exponential Backoff and Jitter", 2015) simulated the variants: full jitter completes contended workloads with close to the fewest total calls. The toggle in the viz below is that simulation in miniature — watch the two clients' attempts land on identical ticks without jitter, then desynchronize with it.</p>
              <p>Retries also compound across layers: if every layer of a call chain retries 3 times, a bottom-layer outage generates 3^depth attempts — retry amplification. The discipline is to retry at one designated layer (usually the outermost client of the unreliable hop) and let inner failures propagate fast. For long outages, add a circuit breaker: after k consecutive failures, stop calling for a cool-down and fail fast — turning hours of hanging into seconds of clean failure.</p>
            </>
          }
        />
        <RetryBackoffViz />
        <p>Compute the schedule yourself — pure arithmetic, no network. Notice the two no-jitter clients colliding on every retry:</p>
        <CodeRunner
          language="python"
          code={`import random

BASE, CAP = 0.5, 30.0

def schedule(attempts, jitter, seed=None):
    rng = random.Random(seed)
    waits = []
    for attempt in range(attempts):
        ceiling = min(CAP, BASE * (2 ** attempt))
        waits.append(round(rng.uniform(0, ceiling), 2) if jitter else ceiling)
    return waits

print('ceilings           :', schedule(7, jitter=False))
print('client A, no jitter:', schedule(5, jitter=False))
print('client B, no jitter:', schedule(5, jitter=False))   # identical = collisions
print('client A, jitter   :', schedule(5, jitter=True, seed=1))
print('client B, jitter   :', schedule(5, jitter=True, seed=2))  # desynchronized`}
        />
      </Section>

      <Section kicker="trade-offs" title="requests vs httpx vs urllib — and pull vs push">
        <Tradeoffs
          options={[
            {
              name: 'requests',
              strengths: [
                'The de facto standard: every example, answer, and teammate knows it',
                'Sessions give connection pooling; API is hard to misuse',
              ],
              weaknesses: [
                'Synchronous only — no async support, ever (by design)',
                'Third-party dependency; feature development essentially frozen',
              ],
              chooseWhen: 'default for pipeline extraction — P1 uses it. Sequential calls dominate batch ingestion anyway.',
            },
            {
              name: 'httpx',
              strengths: [
                'requests-compatible API plus async, HTTP/2, stricter timeout defaults',
                'One library for sync and async code paths',
              ],
              weaknesses: [
                'Smaller ecosystem; subtle behavior differences from requests',
                'Async buys nothing until you genuinely need concurrent requests',
              ],
              chooseWhen: 'you need many concurrent API calls (fan-out extraction) or HTTP/2.',
            },
            {
              name: 'urllib (stdlib)',
              strengths: [
                'Zero dependencies — always available, even in constrained environments',
                'Fine for a one-off script or tooling that must not add deps',
              ],
              weaknesses: [
                'Verbose, low-level; easy to get encoding, pooling, and errors wrong',
                'No connection pooling or sessions without extra work',
              ],
              chooseWhen: 'dependency budget is literally zero; otherwise your time is worth more.',
            },
          ]}
          note={<>Orthogonal decision: <strong>polling vs webhooks vs streaming.</strong> Polling (what we do here) pulls on your schedule — simple, resilient, but latency equals the poll interval and most polls return nothing new. Webhooks push events to an endpoint you host — low latency, but now you run a public server and must handle loss, replay, verification. Streaming (Kafka-style consumers, Phase 5) is a persistent subscription with offsets. Batch ingestion overwhelmingly polls; that is the right default until latency requirements say otherwise.</>}
        />
      </Section>

      <Section kicker="hands-on" title="Lab: call the real Open-Meteo API — P1 milestone M1 rehearsal">
        <Lab
          lessonId={ID}
          intro={<p>Everything so far simulated the network; now you cross it. Fetch a month of real hourly weather for Berlin, wrap the call in your own retry helper, then deliberately break the network path and watch the timeout and backoff machinery fire for real.</p>}
          steps={[
            {
              title: 'Project setup with requests',
              commands: [{ ps: `mkdir C:\\de-lab\\m13-http; cd C:\\de-lab\\m13-http
uv init
uv add requests
uv run python -c "import requests; print(requests.__version__)"` }],
              checkpoint: <><code>uv add</code> resolves and installs, and the last command prints a version like <code>2.32.x</code>.</>,
            },
            {
              title: 'Fetch a month of Berlin weather',
              body: <p>The archive endpoint is keyless — you can call it directly. January 2024, hourly temperature:</p>,
              commands: [{ ps: `@'
import requests

BASE_URL = 'https://archive-api.open-meteo.com/v1/archive'
params = {
    'latitude': 52.52,
    'longitude': 13.41,
    'start_date': '2024-01-01',
    'end_date': '2024-01-31',
    'hourly': 'temperature_2m',
}

resp = requests.get(BASE_URL, params=params, timeout=(5, 30))
resp.raise_for_status()
doc = resp.json()

h = doc['hourly']
rows = [{'ts': t, 'temp_c': v} for t, v in zip(h['time'], h['temperature_2m'])]
print('rows:', len(rows))
print('first:', rows[0])
print('last :', rows[-1])
'@ | Set-Content -Encoding utf8 fetch.py
uv run python fetch.py` }],
              checkpoint: <><code>rows: 744</code> — 31 days times 24 hours — with first timestamp <code>2024-01-01T00:00</code> and last <code>2024-01-31T23:00</code>. You just performed P1's extract step against the real internet.</>,
            },
            {
              title: 'Wrap it in your retry helper',
              body: <p>Now the production shape: a reusable <code>get_json</code> with exponential backoff, full jitter, and a retryable-status predicate. The URL comes from the command line so the next step can abuse it:</p>,
              commands: [{ ps: `@'
import random
import sys
import time

import requests

RETRYABLE = {429, 500, 502, 503, 504}

def get_json(url, params, max_attempts=4, base=0.5, cap=30.0, timeout=(3, 30)):
    for attempt in range(max_attempts):
        try:
            resp = requests.get(url, params=params, timeout=timeout)
            if resp.status_code in RETRYABLE:
                raise requests.RequestException(f'HTTP {resp.status_code}')
            resp.raise_for_status()
            print(f'attempt {attempt + 1}: success')
            return resp.json()
        except requests.RequestException as e:
            if attempt == max_attempts - 1:
                raise
            wait = random.uniform(0, min(cap, base * (2 ** attempt)))
            print(f'attempt {attempt + 1}: {type(e).__name__} - sleeping {wait:.2f}s')
            time.sleep(wait)

url = sys.argv[1] if len(sys.argv) > 1 else 'https://archive-api.open-meteo.com/v1/archive'
params = {
    'latitude': 52.52, 'longitude': 13.41,
    'start_date': '2024-01-01', 'end_date': '2024-01-31',
    'hourly': 'temperature_2m',
}
doc = get_json(url, params)
print('rows:', len(doc['hourly']['time']))
'@ | Set-Content -Encoding utf8 fetch_retry.py
uv run python fetch_retry.py` }],
              checkpoint: <><code>attempt 1: success</code> then <code>rows: 744</code> — the happy path goes straight through the wrapper with zero waiting.</>,
            },
            {
              title: 'Prove the failure path',
              body: <p>Point the same script at an unroutable address. The connect timeout (3 s) fires, backoff kicks in, and after four attempts it fails loudly — exactly what you want at 3 a.m.:</p>,
              commands: [{ ps: 'uv run python fetch_retry.py https://10.255.255.1/v1/archive' }],
              checkpoint: <>Four log lines: attempts 1-3 each show <code>ConnectTimeout</code> (or <code>ConnectionError</code>) followed by a randomized, growing sleep; attempt 4 raises and the script exits with a traceback. Total runtime is bounded — roughly 12 s of timeouts plus a few seconds of backoff — not an infinite hang. That bounded, logged, loud failure is the entire point of the wrapper.</>,
            },
          ]}
        />
      </Section>

      <Section kicker="check yourself" title="Quiz">
        <Quiz
          lessonId={ID}
          questions={[
            {
              q: 'Why must every requests call carry timeout=?',
              options: [
                'It makes responses arrive faster',
                'Without it requests waits forever, and one hung call freezes an unattended pipeline permanently',
                'The API rejects calls without a timeout header',
                'It enables connection pooling',
              ],
              answer: 1,
              explain:
                'The library default is no timeout at all. A single black-holed connection then blocks the process indefinitely — no exception, no log, no retry. timeout=(connect, read) converts a hang into a catchable, retryable failure.',
            },
            {
              q: 'Which failure should your retry loop NOT retry?',
              options: [
                'HTTP 503 Service Unavailable',
                'A connect timeout',
                'HTTP 429 Too Many Requests',
                'HTTP 400 Bad Request',
              ],
              answer: 3,
              explain:
                '4xx (except 429) means the request itself is wrong — resending the identical request yields the identical rejection, forever. 5xx and transport failures are presumed transient; 429 is retryable after honoring the wait it demands.',
            },
            {
              q: 'A thousand clients hit a server that blips offline for 2 seconds. Why does deterministic exponential backoff alone prolong the outage?',
              options: [
                'Exponential waits grow too slowly to matter',
                'All clients retry at the same synchronized instants, arriving as repeated thousand-strong spikes that re-overload the server',
                'Backoff without jitter retries 4xx errors too',
                'The server cannot distinguish retries from new requests',
              ],
              answer: 1,
              explain:
                'Clients that failed together stay phase-locked: every one returns at exactly base, 2x, 4x. Full jitter — uniform(0, ceiling) — decorrelates them, spreading each wave evenly across its window so the server sees a trickle instead of impulses.',
            },
            {
              q: "Why prefer a params dict (params={'start_date': ...}) over building the query string yourself?",
              options: [
                'It compresses the request',
                'requests URL-encodes values, joins pairs, and escapes special characters correctly — hand-built strings break on spaces, commas, unicode',
                'APIs ignore hand-built query strings',
                'It is required for HTTPS',
              ],
              answer: 1,
              explain:
                'Query strings have encoding rules (percent-escaping, reserved characters) that concatenation silently violates. Same principle as never hand-splitting CSV: the format has a grammar; use the tool that speaks it.',
            },
            {
              q: 'Open-Meteo pagination is by date range rather than page numbers. What does that buy a backfill job?',
              options: [
                'Fewer total HTTP requests',
                'Each window is an independent, re-runnable unit: a failed month retries alone, windows run in parallel, and re-runs are idempotent',
                'Responses arrive pre-sorted',
                'It avoids the need for timeouts',
              ],
              answer: 1,
              explain:
                'Date windows partition the keyspace up front: no shifting offsets, no cursor state to lose. A 10-year backfill becomes 120 independent month-jobs — parallelizable, individually retryable, safely re-runnable. P1 leans on exactly this.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'Design a resilient API extraction job. What goes in, layer by layer?',
            a: <p>Parameters via the library (never string-built), timeout on every call, raise_for_status, a retry predicate splitting transient (timeouts, 5xx, 429) from permanent (other 4xx), exponential backoff with full jitter and an attempt cap, Retry-After honored, a Session for pooling, every retry logged, pagination as a generator. Strong answers add: retries are safe because extraction is idempotent GETs — and name what is deliberately absent, like infinite retries.</p>,
          },
          {
            q: 'Why does jitter matter if exponential backoff already spaces retries out?',
            a: <p>Backoff controls how long each client waits; jitter controls whether clients wait the <em>same</em> amount. A shared failure synchronizes the cohort, and deterministic backoff keeps it phase-locked — the server gets hit at identical instants, wave after wave. Randomizing each wait over [0, ceiling] flattens the impulses into an even arrival rate. Cite the AWS full-jitter analysis if asked for evidence: fewest total calls to complete under contention.</p>,
          },
          {
            q: 'A timed-out POST — do you retry it?',
            a: <p>Not blindly. A timeout means you do not know whether the server processed the request — retrying a non-idempotent POST risks double effects (two orders, two charges). Options: an idempotency key so the server deduplicates, checking state before resending, or redesigning the operation as idempotent PUT. GET/PUT/DELETE are safe to retry by contract; that distinction is the interview point.</p>,
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>The network fails routinely and pipelines run unattended — timeouts, status checks, and retries are not defensive extras, they are the job.</>,
          <>Every call: <code>params=</code> dict, <code>timeout=(connect, read)</code>, <code>raise_for_status()</code>. No exceptions to the no-exceptions rule.</>,
          <>Retry only transient failures (timeouts, 5xx, 429); a 4xx replayed is the same 4xx. Honor Retry-After.</>,
          <>Backoff spaces retries; jitter desynchronizes clients: <code>uniform(0, min(cap, base * 2 ** attempt))</code>, capped attempts, every retry logged.</>,
          <>Pagination is a streaming problem — yield records; date-range windows make backfills parallel, retryable, idempotent units.</>,
          <>You have now performed P1 milestone M1 for real: parameterized request, parsed response, retry wrapper, proven failure path.</>,
        ]}
      />
    </>
  )
}
