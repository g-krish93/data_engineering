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

const ID = '1.6.2'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Code that works on your machine and nowhere else">
        <Tiered
          layman={
            <>
              <p>
                Imagine writing your home address inside every appliance you own. Move house, and you must open up the
                toaster, the TV, and the washing machine to update each one. That&apos;s a program hardcoding{' '}
                <code>C:\Users\you\data\file.csv</code> or pasting a password into the code: knowledge baked in where
                it&apos;s hardest to change.
              </p>
              <p>
                The fix is sticky notes on the fridge: one shared place saying &quot;data lives here&quot;, &quot;the
                API is over there&quot; — every app reads the note instead of memorizing the answer. Move house? Change
                the note once. Those sticky notes are <em>environment variables</em> and <em>config files</em>, and this
                lesson is about using them well.
              </p>
            </>
          }
          student={
            <>
              <p>
                A <GlossaryTerm k="data-pipeline">pipeline</GlossaryTerm> that hardcodes a path, a URL, or a credential
                works exactly once, in exactly one place. The same code must run on your laptop, in a teammate&apos;s
                clone, in CI, and in production — four environments with different paths, endpoints, and secrets.
                Configuration is how one artifact serves all four: settings are read from <em>outside the code</em> at
                startup.
              </p>
              <p>
                The two daily mechanisms: <strong>environment variables</strong> (key-value strings the OS hands every
                process it starts) and <strong>config files</strong> (checked-in, human-editable settings like{' '}
                <code>config.toml</code>). The art — and the interview question — is knowing what belongs where, and who
                wins when they disagree.
              </p>
            </>
          }
          phd={
            <>
              <p>
                The canonical doctrine is the Twelve-Factor App (factor III): store config in the environment — env vars
                are language-agnostic, per-deploy, and impossible to accidentally commit. The critics have a point too:
                untyped flat strings, invisible in code review, inherited by unconsidered child processes, easy to leak
                into logs. Mature systems therefore layer: checked-in files for structure and defaults, environment for
                per-deploy overrides and secrets, dedicated secret managers (Vault, cloud KMS — Phase 6) when secrets
                need rotation and audit trails.
              </p>
              <p>
                Frame it as reproducibility, the theme since Phase 0: a program&apos;s behavior is a function of its code{' '}
                <em>and</em> its config. Pin the code with git and the packages with a lockfile, and unmanaged config
                becomes the last source of &quot;works here, fails there&quot; — config drift. Making configuration
                explicit, layered, and inspectable closes that gap.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Environment variables: reading, setting, and their lifetimes">
        <Tiered
          layman={
            <>
              <p>
                Every program starts life with a backpack of sticky notes handed over by the operating system: &quot;your
                home folder is here&quot;, &quot;temporary files go there&quot;. Programs read any note by name, and you
                can slip new notes in before a program starts.
              </p>
              <p>
                The catch is lifetime. A note you write in one terminal window exists only in that window — close it,
                gone. There&apos;s also a way to pin a note permanently, but with a twist: programs already running never
                see new notes — only freshly started ones get the updated backpack.
              </p>
            </>
          }
          student={
            <>
              <p>In PowerShell, environment variables live on the <code>Env:</code> drive; persisting across sessions is <code>setx</code>, which carries a famous trap:</p>
              <CodeBlock
                label="powershell"
                code={'$env:USERPROFILE                       # read one\nGet-ChildItem Env: | Sort-Object Name   # list them all (it is a drive!)\n$env:REALPY_DATA_DIR = "C:\\de-lab\\realpy\\data"   # set for THIS session only\nRemove-Item Env:REALPY_DATA_DIR         # unset\n\nsetx REALPY_DATA_DIR "C:\\de-lab\\realpy\\data"\n# Persists to the user registry... but takes effect in FUTURE shells only.\n# Your current window still sees the old value (or nothing). Open a new terminal.'}
              />
              <p>Python reads the same variables through <code>os.environ</code> — run this, then try changing the default or the override:</p>
              <CodeRunner
                language="python"
                code={'import os\n\n# This browser Python has its own tiny environment - peek at it:\nprint("some env keys here:", sorted(os.environ.keys())[:4], "...")\n\n# The pattern your pipelines will use everywhere - read with a fallback:\ndata_dir = os.environ.get("REALPY_DATA_DIR", "C:/de-lab/realpy/data")\nprint("data_dir =", data_dir, "(default won - variable is not set)")\n\n# Simulate the variable being set, as PowerShell would before launching you:\nos.environ["REALPY_DATA_DIR"] = "D:/fast-disk/data"\nprint("data_dir =", os.environ.get("REALPY_DATA_DIR", "C:/de-lab/realpy/data"), "(env won)")'}
              />
            </>
          }
          phd={
            <>
              <p>
                Mechanically, the environment is a block of key=value strings copied into every child process at spawn
                time (part of the CreateProcess / execve contract). That copy semantics explains every confusing
                behavior: <code>setx</code> edits the registry, not running processes, so nothing already started
                notices; a variable set in one terminal can&apos;t appear in another because siblings share no
                environment; and VS Code&apos;s integrated terminal inherits from VS Code itself — restart the editor,
                not just the terminal, after a <code>setx</code>.
              </p>
              <p>
                Inheritance is also the security story: every library you import and subprocess you launch can read the
                whole environment — which is why crash reporters and CI debug logs so often leak secrets. Treat it as
                visible-to-everything-in-the-process-tree, not as a vault.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title=".env files, config files, and the secrets rule">
        <Tiered
          layman={
            <>
              <p>
                Typing all your sticky notes again in every new terminal window gets old fast. So there&apos;s a
                convention: keep a plain text file called <code>.env</code> next to your project — a page of sticky notes
                the program reads at startup. Yours to keep, never to share: this is the file where passwords go.
              </p>
              <p>
                Settings that <em>aren&apos;t</em> secret — which cities to load, where the data folder is — go in a
                config file you do share, so everyone gets sensible defaults for free.
              </p>
            </>
          }
          student={
            <>
              <p>A <code>.env</code> file is just <code>KEY=value</code> lines. The popular loader is <code>python-dotenv</code>, but the core is ~15 lines — no magic:</p>
              <CodeBlock
                label="python"
                code={'# load_env.py - a .env loader, hand-rolled\nimport os\n\ndef load_env(path=".env"):\n    try:\n        lines = open(path, encoding="utf-8").read().splitlines()\n    except FileNotFoundError:\n        return  # no .env file is fine - env vars may be set for real\n    for line in lines:\n        line = line.strip()\n        if not line or line.startswith("#") or "=" not in line:\n            continue\n        key, _, value = line.partition("=")\n        # setdefault: a REAL environment variable beats the .env file\n        os.environ.setdefault(key.strip(), value.strip().strip(\'"\'))'}
              />
              <p>
                Note the <code>setdefault</code>: a variable already set in the real environment is <em>not</em>{' '}
                overridden by .env — a precedence decision the next section makes systematic. The split to internalize:{' '}
                <code>config.toml</code> is checked in and holds shape; <code>.env</code> is gitignored and holds
                secrets and machine-local overrides.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Why not put secrets in the checked-in config? Because a{' '}
                <GlossaryTerm k="repository">repository</GlossaryTerm> remembers forever: a key committed once lives in
                history after deletion, and repo access widens over time (teammates, forks, CI mirrors). The industry
                answer escalates with stakes: gitignored .env files, CI secret stores injected as env vars, then
                dedicated managers — Vault, AWS Secrets Manager — adding rotation, audit logs, and short-lived
                credentials. You&apos;ll meet those in Phase 6; the habit of &quot;secrets never touch git&quot; starts
                now.
              </p>
              <p>
                TOML won the Python config-format war (pyproject.toml made it official) on boring virtues: comments
                allowed (JSON&apos;s fatal flaw), obvious types, no whitespace surprises (YAML&apos;s foot-gun:{' '}
                <code>no</code> parsing as a boolean). Since 3.11, stdlib <code>tomllib</code> parses it.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="The rule with no exceptions">
          Secrets never go in git. Your Phase 0 <code>.gitignore</code> habit is the enforcement: add <code>.env</code>{' '}
          before creating the file, verify with <code>git check-ignore .env</code>. If a secret ever lands in a commit —
          rotate it immediately; deleting the file later does not un-leak it.
        </Callout>
      </Section>

      <Section kicker="core concepts" title="Precedence: who wins when settings disagree">
        <Tiered
          layman={
            <>
              <p>
                House rules: the printed appliance manual says one thing, the handwritten note taped to the machine says
                another, and the person standing next to you says a third. You instinctively know the order — the note
                beats the manual, the human beats the note. The most specific, most intentional voice wins.
              </p>
              <p>
                Programs need the same etiquette written down: defaults are the manual, the config file is the taped
                note, environment variables are standing instructions from the house manager, and the command line is
                the person standing next to you.
              </p>
            </>
          }
          student={
            <>
              <p>The convention, from weakest to strongest:</p>
              <ol>
                <li><strong>Defaults</strong> in code — the program works out of the box.</li>
                <li><strong>Config file</strong> — checked-in project settings, shared by everyone.</li>
                <li><strong>Environment variables</strong> — per-machine, per-deploy overrides. No file edits.</li>
                <li><strong>CLI flags</strong> — this run only, typed by a human (built in lesson 1.6.3).</li>
              </ol>
              <p>Each layer is more specific and shorter-lived than the one below. The whole idea in twenty lines — edit the <code>cli</code> dict to prove the top layer wins, or empty <code>env</code> to watch the file value resurface:</p>
              <CodeRunner
                language="python"
                code={'DEFAULTS = {"data_dir": "data", "api_base": "https://archive-api.open-meteo.com"}\n\n# Pretend inputs (in realpy these come from tomllib, os.environ, argparse):\nconfig_file = {"data_dir": "C:/de-lab/realpy/data"}\nenv = {"REALPY_API_BASE": "http://localhost:9999"}\ncli = {}  # try: {"api_base": "https://flag-wins.example"}\n\ndef resolve(key, env_name):\n    for source, value in [\n        ("cli flag", cli.get(key)),\n        ("env var", env.get(env_name)),\n        ("config file", config_file.get(key)),\n        ("default", DEFAULTS.get(key)),\n    ]:\n        if value is not None:\n            return value, source\n    raise KeyError(key)\n\nfor key, env_name in [("data_dir", "REALPY_DATA_DIR"), ("api_base", "REALPY_API_BASE")]:\n    value, source = resolve(key, env_name)\n    print(key, "=", value, "  <-", source)'}
              />
            </>
          }
          phd={
            <>
              <p>
                The order is operational, not aesthetic. Layers are ranked by <em>blast radius and latency of change</em>:
                a default means a code release (slow, affects everyone); the config file means a commit (whole team); an
                env var affects one deployment on restart; a CLI flag affects one invocation and vanishes. In an incident
                you want the override that is fastest to apply and cheapest to revert — exactly why the short-lived
                layers must win.
              </p>
              <p>
                Two failure modes to respect. Inverted precedence (file beating env) makes systems un-operable — the
                on-call engineer sets the variable and nothing changes. And silent resolution invites drift: good tools
                can <em>show</em> their effective config and where each value came from (the source-tagging you just
                ran). When prod and laptop disagree, that printout is the debugging session.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="trade-offs" title="Env vars vs config files vs CLI flags">
        <p>These aren&apos;t competitors — they&apos;re layers. But each is the <em>right home</em> for a different kind of setting:</p>
        <Tradeoffs
          options={[
            {
              name: 'Environment variables',
              strengths: [
                'Language-agnostic; every OS, shell, and CI system can inject them',
                'Never committed — the natural home for secrets and per-deploy values',
              ],
              weaknesses: [
                'Untyped flat strings; typos fail silently (REALPY_DATADIR is just... unset)',
                'Invisible: nothing in the repo documents which variables exist; inherited by every child process',
              ],
              chooseWhen: 'the value is secret, or differs per machine/deployment: tokens, hosts, mode switches.',
            },
            {
              name: 'Config files (config.toml)',
              strengths: [
                'Checked in: versioned, diffed, code-reviewed like code',
                'Typed and structured; the file itself documents every available setting',
              ],
              weaknesses: [
                'Changing one means a commit — wrong tool for a quick prod override',
                'Dangerous for anything secret (repos remember forever)',
              ],
              chooseWhen: 'the value is shared, structural, and not secret: city lists, paths, schedules.',
            },
            {
              name: 'CLI flags',
              strengths: [
                'Explicit and visible in the command itself — ideal for one-off runs and debugging',
                'Self-documenting via --help; typos fail loudly with an error',
              ],
              weaknesses: [
                'Ephemeral — nothing persists between runs',
                'Unwieldy beyond a handful of values; nobody types 30 flags',
              ],
              chooseWhen: 'the value changes per invocation: which city, which date range, dry-run or real.',
            },
          ]}
          note={
            <>
              The layered answer: defaults in code, structure in config.toml, secrets and deploy overrides in env,
              per-run choices as flags. P1 requires this layout (cities in <code>config.toml</code>, FR-7), so the lab
              builds it into realpy now.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: make realpy configurable, then prove the precedence">
        <Lab
          lessonId={ID}
          intro={
            <p>
              Give realpy a configurable data directory and API base URL, then prove each layer wins exactly when it
              should. Work in <code>C:\de-lab\realpy</code> (needs Python 3.11+ for <code>tomllib</code>).
            </p>
          }
          steps={[
            {
              title: 'Create realpy/config.py and see the defaults win',
              body: (
                <>
                  <p>In VS Code, create <code>config.py</code> inside your realpy package (next to your existing modules — <code>src/realpy/config.py</code> if you used a src layout):</p>
                  <CodeBlock
                    label="python"
                    code={'"""realpy configuration: defaults < config.toml < environment variables."""\nimport os\nimport tomllib\nfrom pathlib import Path\n\nDEFAULTS = {\n    "data_dir": "data",\n    "api_base": "https://archive-api.open-meteo.com",\n}\nENV_NAMES = {"data_dir": "REALPY_DATA_DIR", "api_base": "REALPY_API_BASE"}\n\ndef load_config(path="config.toml"):\n    file_cfg = {}\n    p = Path(path)\n    if p.exists():\n        file_cfg = tomllib.loads(p.read_text(encoding="utf-8"))\n    cfg = {}\n    for key, default in DEFAULTS.items():\n        # precedence: env var beats config file beats default\n        cfg[key] = os.environ.get(ENV_NAMES[key]) or file_cfg.get(key) or default\n    return cfg\n\nif __name__ == "__main__":\n    for key, value in load_config().items():\n        print(key, "=", value)'}
                  />
                  <p>Run it before any config.toml exists (rename yours if one is already there):</p>
                </>
              ),
              commands: [{ ps: 'Set-Location C:\\de-lab\\realpy\nuv run python -m realpy.config' }],
              checkpoint: (
                <>
                  Two lines print: <code>data_dir = data</code> and <code>api_base = https://archive-api.open-meteo.com</code>{' '}
                  — the defaults; no other layer exists yet. (If Python can&apos;t find <code>realpy.config</code>, run{' '}
                  <code>uv run python src/realpy/config.py</code> and check your package folder name.)
                </>
              ),
            },
            {
              title: 'Layer 2: the config file beats the default',
              body: <p>Create a config.toml with a deliberately fake value so the winner is unmistakable:</p>,
              commands: [
                { ps: 'Set-Content config.toml \'api_base = "https://config-file.example"\'\nuv run python -m realpy.config' },
              ],
              checkpoint: (
                <><code>api_base = https://config-file.example</code> (file beat default) while <code>data_dir = data</code> is still the default — the file only overrides what it mentions.</>
              ),
            },
            {
              title: 'Layer 3: the environment beats the config file',
              commands: [
                { ps: '$env:REALPY_API_BASE = "https://env-wins.example"\nuv run python -m realpy.config' },
              ],
              checkpoint: (
                <>
                  <code>api_base = https://env-wins.example</code>: the config file still says{' '}
                  <code>config-file.example</code> — the environment simply outranks it. Bonus proof of session scope:
                  run the same command in a brand-new terminal and the file value is back (the new shell never saw your
                  variable).
                </>
              ),
            },
            {
              title: 'Secrets hygiene, then restore a real configuration',
              body: (
                <p>
                  Create a .env with a pretend secret and ignore it <em>before</em> it can ever be staged; then leave
                  realpy in a sane state — lessons 1.6.3 and 1.6.4 build on this exact setup:
                </p>
              ),
              commands: [
                {
                  ps: 'Set-Content .env \'REALPY_API_TOKEN=demo-not-a-real-secret\'\nAdd-Content .gitignore ".env"\ngit check-ignore -v .env\nSet-Content config.toml \'data_dir = "data"\'\nAdd-Content config.toml \'api_base = "https://archive-api.open-meteo.com"\'\nRemove-Item Env:REALPY_API_BASE -ErrorAction SilentlyContinue\nuv run python -m realpy.config',
                },
              ],
              checkpoint: (
                <>
                  <code>git check-ignore -v .env</code> prints the .gitignore rule that matched (the secret is invisible
                  to git), and the final run prints <code>data_dir = data</code> and{' '}
                  <code>api_base = https://archive-api.open-meteo.com</code> — you can explain which layer produced each
                  line.
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
              q: 'You run setx REALPY_MODE prod, then immediately echo $env:REALPY_MODE in the same window. What prints?',
              options: [
                'prod',
                'Nothing (or the old value) — setx affects future shells only',
                'An access-denied error',
                'PROD in uppercase',
              ],
              answer: 1,
              explain:
                'setx writes the registry; the environment of already-running processes is a copy made at launch and never updated. New terminal, new copy. This one bites everyone once.',
            },
            {
              q: 'Why should environment variables outrank the config file, and not the other way around?',
              options: [
                'Env vars are faster to read at runtime',
                'So operators can override behavior per-deploy without editing committed files',
                'Config files cannot store URLs',
                'It is arbitrary — either order works equally well',
              ],
              answer: 1,
              explain:
                'Precedence ranks layers by how fast and how narrowly you can change them. If the checked-in file could veto the environment, fixing production would require a commit — the slowest possible override.',
            },
            {
              q: 'Where does a third-party API token belong?',
              options: [
                'In config.toml, so teammates get it automatically',
                'As a constant in the code, clearly named',
                'In an env var or gitignored .env file — never in anything committed',
                'In the README so it is easy to find',
              ],
              answer: 2,
              explain:
                'Repos remember forever — a committed secret stays in history even after deletion, so it must be rotated. config.toml is for shared, non-secret structure; secrets live outside version control.',
            },
            {
              q: 'The hand-rolled .env loader used os.environ.setdefault rather than assignment. What behavior does that buy?',
              options: [
                'It makes the loader faster',
                'Variables set in the real environment are not overwritten by the .env file',
                'It writes values back into the .env file',
                'It converts values to integers automatically',
              ],
              answer: 1,
              explain:
                'setdefault only fills gaps, so real environment beats .env — precedence enforced in a single method choice. With plain assignment, a stale .env would silently override a deliberate deploy setting.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'How would you run the same pipeline against dev and prod without changing code?',
            a: (
              <p>
                Layered configuration: defaults in code, shared structure in a checked-in file, per-environment values
                injected as env vars by the deploy platform, per-run choices as CLI flags — with exactly that precedence.
                Strong answers name the order, justify it operationally (env overrides need no commit), and mention the
                app should print its effective config for debugging.
              </p>
            ),
          },
          {
            q: 'A teammate just committed an API key to the repo. Walk me through your response.',
            a: (
              <p>
                Rotate the key first — treat it as leaked the moment it was committed, because history keeps it even
                after a deleting commit. Then scrub history if the repo is shared (filter-repo / BFG) and add prevention:
                .gitignore for .env, secret-scanning hooks or CI checks. Rotation is the fix; history-rewriting is only
                cleanup.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>Hardcoded paths and secrets are why code &quot;works on my machine&quot; only. Configuration lives outside the code.</>,
          <>PowerShell: <code>$env:NAME</code> reads, assignment sets for this session, <code>setx</code> persists — for future shells only. Python: <code>os.environ.get(name, default)</code>.</>,
          <>Precedence, weakest to strongest: defaults, config file, environment, CLI flags — ranked by blast radius and speed of change.</>,
          <>config.toml holds shared, non-secret structure; .env (gitignored) and env vars hold secrets and per-machine overrides. Secrets never touch git — committed means rotate.</>,
          <>realpy now reads data_dir and api_base through layered config — the exact shape P1 requires (FR-7).</>,
        ]}
      />
    </>
  )
}
