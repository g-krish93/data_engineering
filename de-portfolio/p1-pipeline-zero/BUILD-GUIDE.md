# Pipeline Zero — Build Guide

> **Rules of engagement:** Claude coaches, you code. Try each step yourself first.
> Ask for a hint before asking for code. Anything Claude writes for you gets an
> **[assisted]** note in this file so you revisit and rewrite it later.
>
> Start this project after finishing module 1.6 (you'll have everything you need;
> you can start after 1.4 if impatient — M5's queries will stretch you).

## Milestone M0 — Running skeleton

**Goal:** a uv project with a CLI entry point and a passing test — the frame everything hangs on.

### Steps

1. Inside `de-portfolio/p1-pipeline-zero/`, create a uv project (`uv init --package`). Name the package `pipeline_zero`.
2. Add dependencies: `requests`, `duckdb`; dev-dependency: `pytest`.
3. Create the CLI module with argparse: subcommands `ingest`, `backfill`, `query`, `status` — each just prints its own name for now. Wire it as a script entry point in `pyproject.toml` so `uv run pipeline-zero` works.
4. Write `tests/test_smoke.py` with one test that imports your package and asserts the version string.

### Hints (escalating)

<details><summary>Hint 1 (nudge)</summary>

`uv init --package` gives you the `src/pipeline_zero/` layout and a `[project.scripts]` example. Lesson 1.6.3 built exactly this argparse shape (subparsers with `dest="command"`).

</details>

<details><summary>Hint 2 (approach)</summary>

`pyproject.toml` needs `[project.scripts] pipeline-zero = "pipeline_zero.cli:main"`. In `cli.py`, `main()` builds an `ArgumentParser`, adds subparsers, parses, and dispatches on `args.command` via a dict of handler functions — no if/elif ladder.

</details>

### Checkpoint

```powershell
uv run pipeline-zero --help     # shows the four subcommands
uv run pytest                   # 1 passed
```

### Commit point

`portfolio(p1): complete M0 skeleton`

---

## Milestone M1 — Fetch

**Goal:** real data from the real API, with the failure modes handled that WILL happen.

### Steps

1. Create `config.toml` with 2–3 cities (name, latitude, longitude) and a `start_date`. Parse it with stdlib `tomllib`.
2. Write `fetch.py`: a function taking (city, start_date, end_date) that calls the Open-Meteo archive API and returns a list of row dicts `(city, ts, temperature_c, precipitation_mm, wind_kmh)`. Set an explicit timeout on every request.
3. The API returns parallel arrays (`hourly.time`, `hourly.temperature_2m`, ...) — zip them into per-row dicts. Decide now what a missing (null) temperature becomes; write your decision down, you'll defend it in M4.
4. Wire `ingest --city X` to fetch and print the row count (no DB yet).

### Hints (escalating)

<details><summary>Hint 1 (nudge)</summary>

Build the URL with `params={...}` (requests encodes it), not string concatenation. Print `response.url` once — seeing the final URL demystifies the API.

</details>

<details><summary>Hint 2 (approach)</summary>

`zip(h["time"], h["temperature_2m"], h["precipitation"], h["wind_speed_10m"])` then a list comprehension building dicts. `response.raise_for_status()` before parsing. Timeout: `requests.get(url, params=params, timeout=30)`.

</details>

### Checkpoint

```powershell
uv run pipeline-zero ingest --city london
# prints something like: fetched 744 rows for london (2026-06-01..2026-06-30)
```

### Commit point

`portfolio(p1): complete M1 fetch`

---

## Milestone M2 — Load (where idempotency is born)

**Goal:** rows land in DuckDB — and re-running changes nothing.

### Steps

1. Write `db.py`: `connect()` opens `data/weather.duckdb` (create `data/` if missing — it's gitignored) and creates tables if absent. `raw_weather` gets `PRIMARY KEY (city, ts)` — write the DDL by hand, no ORM.
2. Load the fetched rows. You must choose an upsert strategy — this is the project's first real design decision. Candidates: `INSERT OR REPLACE`, `INSERT ... ON CONFLICT DO UPDATE`, or delete-the-range-then-insert. Pick one and write a comment defending it.
3. Run ingest twice. Count rows both times.

### Hints (escalating)

<details><summary>Hint 1 (nudge)</summary>

DuckDB speaks `INSERT OR REPLACE INTO ... SELECT * FROM df` — and it can query a list of dicts via a pandas-free `duckdb.sql` with `executemany`, or you can build a `VALUES` batch. Lesson 1.4.1 showed both.

</details>

<details><summary>Hint 2 (approach)</summary>

Delete-then-insert *by the date range you're loading* is the strategy that generalizes to every warehouse you'll ever meet (partition overwrite). `BEGIN; DELETE FROM raw_weather WHERE city=? AND ts BETWEEN ? AND ?; INSERT ...; COMMIT;` — atomic, obviously idempotent, easy to reason about. PK-upsert is fine too; know why you chose yours.

</details>

### Checkpoint

```powershell
uv run pipeline-zero ingest --city london
uv run pipeline-zero ingest --city london   # run it AGAIN
# row count identical both times — prove it with:
uv run python -c "import duckdb; print(duckdb.connect('data/weather.duckdb').sql('select count(*) from raw_weather').fetchone())"
```

### Commit point

`portfolio(p1): complete M2 idempotent load`

---

## Milestone M3 — Incremental loading

**Goal:** ingest resumes from where it left off; backfill rewrites history safely.

### Steps

1. Add the `watermarks(city, last_date)` table. After a successful load, upsert the city's watermark.
2. `ingest` now computes its range: from watermark+1 day (or config `start_date` if none) through yesterday. Loading an empty range is a clean no-op, not an error.
3. Implement `backfill --city X --start D --end D` reusing the same load path (it must inherit idempotency for free).
4. Write the test that matters: with a fake fetch, run ingest → assert watermark; run again → assert nothing loaded; backfill an old range → assert watermark unchanged and row count stable.

### Hints (escalating)

<details><summary>Hint 1 (nudge)</summary>

Watermark advances only after the load commits, and only for `ingest` (a backfill of last March must not drag the watermark backwards). What happens if the process dies between load and watermark update — is your pipeline still correct? (It should be: worst case is re-loading a range that idempotency makes harmless. Write that sentence in a comment; it's the whole philosophy.)

</details>

<details><summary>Hint 2 (approach)</summary>

Make fetch injectable: `run_ingest(fetch_fn, con, city, ...)`. Tests pass a `fake_fetch` returning canned rows; production passes the real one. This is dependency injection without any framework — and it's what makes NFR-3 (no network in tests) trivial.

</details>

### Checkpoint

```powershell
uv run pipeline-zero status      # shows per-city watermarks
uv run pipeline-zero ingest --city london    # "up to date, nothing to load"
uv run pytest                    # incremental tests green
```

### Commit point

`portfolio(p1): complete M3 incremental watermarks`

---

## Milestone M4 — Robustness

**Goal:** the pipeline survives a hostile network and dirty data — visibly.

### Steps

1. Retry with exponential backoff + jitter on 429/5xx/timeouts (max ~5 attempts); 4xx (except 429) fails fast. Write it as a decorator or wrapper so it's testable in isolation.
2. Test it against a fake that fails twice then succeeds — assert 3 calls, correct sleeps (patch `time.sleep`).
3. Validation in `validate.py`: required fields present, temperature in −60..60, no duplicate `(city, ts)` within the batch. Valid rows load; invalid rows go to `rejects` with a reason string.
4. Replace prints with `logging` (module 1.2.6 pattern): one line per ingest with city, range, rows fetched/loaded/rejected.

### Hints (escalating)

<details><summary>Hint 1 (nudge)</summary>

Backoff formula: `sleep = base * 2**attempt + random.uniform(0, jitter)`. Why jitter? Imagine 50 instances retrying in lockstep after an outage — you'll meet this again as "thundering herd" in Phase 6.

</details>

<details><summary>Hint 2 (approach)</summary>

`def with_retries(fn, *, attempts=5, base=1.0): ...` catching `(requests.Timeout, requests.ConnectionError)` and checking `resp.status_code` — re-raise a custom `PermanentError` for 4xx so callers distinguish. Tests: `unittest.mock.patch("time.sleep")` and a closure counting calls.

</details>

### Checkpoint

```powershell
uv run pytest                    # retry + validation tests green
uv run pipeline-zero status      # shows a nonzero rejects count after you feed it a poisoned batch in a test run
```

### Commit point

`portfolio(p1): complete M4 retries and validation`

---

## Milestone M5 — Polish (the part employers actually see)

**Goal:** saved analytics, an honest README, and your first ADR.

### Steps

1. `queries/` folder with at least 3 saved SQL files: `daily-summary.sql` (per city/day min/max/avg temp, total precipitation), `extremes.sql` (hottest/coldest days), `rolling.sql` (7-day rolling average — window functions, lesson 1.5.3). `query --name daily-summary` loads and runs the file, prints an aligned table.
2. `status`: watermarks + row counts + reject counts in one view.
3. Write `README.md` (replace the skeleton): what it is, the architecture diagram from the spec, the 3 commands, test instructions, and a short honest "what I'd do differently".
4. Write `docs/decisions/ADR-001-duckdb.md` from the template: why DuckDB over SQLite and Postgres *for this project* — with the case for each alternative made fairly.
5. Rewrite the spec's resume bullets with your real numbers. Do the spec's Interview Q&A section out loud, then write your answers down.

### Checkpoint

The stranger test, literally:

```powershell
uv sync
uv run pipeline-zero ingest --city london
uv run pipeline-zero query --name daily-summary
```

Three commands, readable output, on a machine (or fresh clone) that has never seen the project.

### Commit point

`portfolio(p1): complete M5 polish — P1 done`

Then update the status row in `de-portfolio/README.md`, and take the win: you have built a real pipeline. Phase 2 starts whenever you're ready.

---

## Assisted notes

- (none yet)
