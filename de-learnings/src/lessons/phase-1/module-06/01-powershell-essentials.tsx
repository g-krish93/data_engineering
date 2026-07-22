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

const ID = '1.6.1'

export default function Lesson() {
  return (
    <>
      <Section kicker="why this exists" title="Pipelines are born, debugged, and buried in a terminal">
        <Tiered
          layman={
            <>
              <p>
                Walk into a busy diner kitchen and the orders sound like code: &quot;two, wreck &apos;em, on a raft&quot;.
                Terse and strange — but during the rush, nobody has time for full sentences. Learning to work in a
                kitchen partly means learning the short-order slang, because that&apos;s how work actually gets ordered,
                checked, and fixed.
              </p>
              <p>
                The <GlossaryTerm k="terminal">terminal</GlossaryTerm> is the short-order slang of computing: compact
                typed commands — &quot;list what&apos;s here&quot;, &quot;show me the end of that log&quot;, &quot;find
                every file bigger than a megabyte&quot;. It feels awkward for a week. Then it becomes the fastest way you
                interact with any computer — especially computers that have no screen attached at all.
              </p>
            </>
          }
          student={
            <>
              <p>
                Every <GlossaryTerm k="data-pipeline">data pipeline</GlossaryTerm> you will ever operate lives its whole
                life in a shell: scaffolded with commands, debugged by tailing logs, retired by deleting its scheduled
                task. The machines that matter — Linux servers, CI runners, Docker containers — have no desktop. If you
                can only work through a GUI, you can only work on your own laptop.
              </p>
              <p>
                This lesson makes you fluent in the four moves you&apos;ll repeat daily: navigating, inspecting files
                without opening them, composing commands with pipes, and discovering what a command can do from inside
                the shell — PowerShell-first (your native shell), bash-literate (the dialect of every server and CI
                system).
              </p>
            </>
          }
          phd={
            <>
              <p>
                A shell is a REPL over your operating system: a live, programmable interface where every interactive
                command is also a valid line of a script. That equivalence is the entire basis of automation — anything
                you type today can be saved, parameterized (lesson 1.6.3), and scheduled (lesson 1.6.4) tomorrow, with
                zero translation. GUIs have no such property; a sequence of clicks cannot be committed to a{' '}
                <GlossaryTerm k="repository">repository</GlossaryTerm>.
              </p>
              <p>
                The deeper skill is compositional thinking: small single-purpose commands connected by pipes. You already
                think this way about pipelines of data; the shell is the same idea at the keystroke level — and where the
                idea came from.
              </p>
            </>
          }
        />
      </Section>

      <Section kicker="core concepts" title="Navigating and reading files without opening them">
        <Tiered
          layman={
            <>
              <p>
                Your file system is a building. Three commands are your legs and eyes: one tells you which room you&apos;re
                in, one moves you to another room, one lists what&apos;s in the room. Everything else builds on those three.
              </p>
              <p>
                For files, the trick is reading <em>without opening</em>. A log file can be gigabytes; double-clicking it
                freezes your editor. The shell instead reads just the first page, or the last page, or watches the end of
                the file live as new lines arrive — like checking the latest entry in a guestbook instead of re-reading
                the whole book.
              </p>
            </>
          }
          student={
            <>
              <p>The navigation trio, with their aliases (short nicknames PowerShell accepts for the full names):</p>
              <CodeBlock
                label="powershell"
                code={'Get-Location                          # where am I?  (alias: pwd)\nSet-Location C:\\de-lab               # move         (alias: cd)\nGet-ChildItem                         # list         (aliases: ls, dir, gci)\nGet-ChildItem -Recurse -Filter *.csv  # every CSV anywhere below here'}
              />
              <p>Reading files is <code>Get-Content</code> plus three flags that will save you daily:</p>
              <CodeBlock
                label="powershell"
                code={'Get-Content .\\run.log -TotalCount 10   # first 10 lines (bash: head)\nGet-Content .\\run.log -Tail 10         # last 10 lines  (bash: tail)\nGet-Content .\\run.log -Tail 0 -Wait    # follow new lines live (bash: tail -f); Ctrl+C stops\nSelect-String -Path .\\run.log -Pattern "ERROR"   # find matching lines (bash: grep)'}
              />
              <p>
                Redirection sends output to a file instead of the screen: <code>&gt;</code> overwrites,{' '}
                <code>&gt;&gt;</code> appends. <code>uv run python etl.py &gt;&gt; run.log</code> is how a scheduled
                pipeline keeps a diary — you&apos;ll rely on exactly this in lesson 1.6.4.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Why <code>-Tail</code> matters mechanically: to print the last 10 lines, PowerShell seeks to the end and
                reads backwards until it has 10 newlines — cost proportional to the tail, not the file. Reading a 2 GB
                log to reach its end costs 2 GB of I/O; tailing it costs kilobytes. The same asymmetry is why{' '}
                <code>tail -f</code> can follow a file that grows forever: it sleeps on the end and prints deltas.
              </p>
              <p>
                Pipelines also stream: <code>Get-Content big.csv | Select-Object -First 5</code> reads only the start of
                the file, because lines flow through the pipe one at a time and the downstream command stops the pipeline
                once it has five. Lazy, incremental evaluation — the principle behind Python generators from module 1.1 —
                is what lets shell tools handle files far bigger than RAM.
              </p>
            </>
          }
        />
        <Callout kind="warn" title="Aliases are nicknames, not the same program">
          In PowerShell, <code>ls</code> is an alias for <code>Get-ChildItem</code> — so bash muscle memory like{' '}
          <code>ls -la</code> fails: <code>Get-ChildItem</code> has no <code>-la</code> parameter. When a tutorial&apos;s
          command errors mysteriously, first ask: which shell was this written for?
        </Callout>
      </Section>

      <Section kicker="core concepts" title="The object pipeline — and discovering commands from inside the shell">
        <Tiered
          layman={
            <>
              <p>
                Imagine a conveyor belt between work stations. In most shells, the belt carries shredded paper: each
                station gets raw text and must squint at it to find what it needs. PowerShell&apos;s belt carries labeled
                boxes: each item keeps its labels — name, size, date modified — so the next station just says &quot;keep
                the boxes where size is over a megabyte&quot; without any squinting.
              </p>
              <p>
                Four stations do most of the work: pick columns, filter, sort, count. If that sounds like SQL from
                modules 1.4–1.5, it should — it&apos;s SELECT, WHERE, ORDER BY, and COUNT for your file system.
              </p>
            </>
          }
          student={
            <>
              <p>
                The pipe <code>|</code> passes .NET <em>objects</em>, and four cmdlets compose into most answers
                you&apos;ll ever need:
              </p>
              <CodeBlock
                label="powershell"
                code={'Get-ChildItem C:\\de-lab -Recurse -File |\n  Where-Object { $_.Length -gt 1MB } |\n  Sort-Object Length -Descending |\n  Select-Object -First 5 Name, Length\n\nGet-Content .\\data.csv | Measure-Object -Line     # line count (bash: wc -l)'}
              />
              <p>
                <code>$_</code> means &quot;the current object flowing through the pipe&quot;, and <code>Length</code> is
                a real property, not text you parsed out of a listing. How do you learn what properties exist? Ask the
                objects themselves:
              </p>
              <CodeBlock
                label="powershell"
                code={'Get-ChildItem | Get-Member          # every property and method the items carry\nGet-Help Get-Content -Examples      # worked examples for any cmdlet\nGet-Help Sort-Object -Online        # full docs in your browser'}
              />
              <p>
                <code>Get-Member</code> and <code>Get-Help</code> make the shell self-documenting, and the Verb-Noun
                naming (<code>Get-</code>, <code>Set-</code>, <code>Measure-</code>) means you can often guess a command
                you&apos;ve never seen.
              </p>
            </>
          }
          phd={
            <>
              <p>
                Objects-versus-text is a genuine design fork. The 2002 Monad manifesto (PowerShell&apos;s origin) argued
                that Unix pipelines waste effort <em>re-parsing</em> at every stage: <code>ls</code> formats a table,{' '}
                <code>awk</code> re-tokenizes it, and the chain breaks if a filename contains a space. Typed objects
                eliminate that fragility — but demand a shared runtime on both ends of the pipe. Text needs nothing: it
                is the universal interface between programs in any language, on any machine, in any decade. That&apos;s
                why Unix text won on servers — heterogeneous systems can only agree on bytes — and why McIlroy&apos;s
                pipe philosophy (&quot;do one thing well; expect your output to become someone&apos;s input&quot;) still
                describes your data pipelines today.
              </p>
              <p>
                The tax both worlds pay is quoting and escaping — the eternal source of shell bugs: word splitting on
                spaces, <code>*</code> expanding when you meant it literally, PowerShell&apos;s two parsing modes.
                Discipline that serves you well: quote every path, prefer single quotes unless you need variable
                expansion, and when a command misbehaves, suspect quoting before anything else.
              </p>
            </>
          }
        />
        <p>
          To demystify these tools: <code>grep</code> in about ten lines of Python. Run it, then change the pattern to{' '}
          <code>city=</code> or make it a count instead of a listing.
        </p>
        <CodeRunner
          language="python"
          code={'import re\n\nLOG = """2026-07-21 08:00:01 INFO  start run city=london\n2026-07-21 08:00:02 WARN  slow response ms=2300\n2026-07-21 08:00:03 ERROR timeout city=paris\n2026-07-21 08:00:04 INFO  loaded rows=480\n2026-07-21 08:00:05 ERROR timeout city=oslo"""\n\ndef grep(pattern, text, ignore_case=False):\n    flags = re.IGNORECASE if ignore_case else 0\n    rx = re.compile(pattern, flags)\n    return [line for line in text.splitlines() if rx.search(line)]\n\nfor line in grep("ERROR", LOG):\n    print(line)\n\nprint("--")\nprint(len(grep("error", LOG, ignore_case=True)), "matches ignoring case")'}
        />
      </Section>

      <Section kicker="trade-offs" title="Your daily driver on Windows: PowerShell or bash?">
        <p>
          Servers and CI speak bash, so you must read it regardless. The survival kit — enough bash to not be lost when
          you SSH into a Linux box or read a GitHub Actions workflow:
        </p>
        <table>
          <thead>
            <tr><th>Task</th><th>PowerShell</th><th>bash</th></tr>
          </thead>
          <tbody>
            <tr><td>list files</td><td><code>Get-ChildItem</code></td><td><code>ls -la</code></td></tr>
            <tr><td>print a file</td><td><code>Get-Content f</code></td><td><code>cat f</code></td></tr>
            <tr><td>first 10 lines</td><td><code>Get-Content f -TotalCount 10</code></td><td><code>head f</code></td></tr>
            <tr><td>last 10 / follow</td><td><code>Get-Content f -Tail 10 [-Wait]</code></td><td><code>tail f</code> / <code>tail -f f</code></td></tr>
            <tr><td>search text</td><td><code>Select-String -Pattern p f</code></td><td><code>grep p f</code></td></tr>
            <tr><td>count lines</td><td><code>Get-Content f | Measure-Object -Line</code></td><td><code>wc -l f</code></td></tr>
            <tr><td>find files</td><td><code>Get-ChildItem -Recurse -Filter *.csv</code></td><td><code>find . -name "*.csv"</code></td></tr>
          </tbody>
        </table>
        <Tradeoffs
          options={[
            {
              name: 'PowerShell (native)',
              strengths: [
                'Already installed; full access to Windows (Task Scheduler, services, drives)',
                'Object pipeline: filter on real properties instead of parsing text',
                'Consistent Verb-Noun naming plus Get-Help/Get-Member self-discovery',
              ],
              weaknesses: [
                'Verbose; most internet examples and CI snippets are bash',
                'Skills transfer to Linux servers only conceptually, not literally',
              ],
              chooseWhen: 'you work on Windows daily and automate Windows itself (this curriculum: yes).',
            },
            {
              name: 'bash via WSL2 (or Git Bash)',
              strengths: [
                'WSL2 is a real Linux — what production and CI actually run; server tutorials work verbatim',
                'Git Bash ships with Git for Windows: zero setup for quick one-liners',
              ],
              weaknesses: [
                'Two worlds on one machine: separate file systems, PATH confusion, slow cross-OS file I/O',
                'Windows-side automation (schtasks, drives) still needs PowerShell; Git Bash is not a full Linux',
              ],
              chooseWhen: 'you are rehearsing for Linux-first work or need Linux-only tooling locally.',
            },
          ]}
          note={
            <>
              This curriculum&apos;s position: PowerShell-first, bash-literate. Labs give PowerShell commands (with bash
              variants where they differ), and by Phase 3 you&apos;ll read bash in CI configs without blinking.
            </>
          }
        />
      </Section>

      <Section kicker="hands-on" title="Lab: shell scavenger hunt across C:\de-lab">
        <Lab
          lessonId={ID}
          intro={
            <p>
              A scavenger hunt over the projects from modules 1.1–1.5. Several checkpoints are <em>exact</em> answers —
              if your number differs, something is genuinely wrong. Run it in PowerShell; the bash toggle shows the
              server dialect for comparison.
            </p>
          }
          steps={[
            {
              title: 'Survey the territory',
              body: <p>Start from the lab root and look around without clicking anything:</p>,
              commands: [
                { ps: 'Set-Location C:\\de-lab\nGet-ChildItem\nGet-ChildItem -Recurse -Directory | Measure-Object', bash: 'cd /c/de-lab\nls -la\nfind . -type d | wc -l' },
              ],
              checkpoint: (
                <>Your project folders (<code>python-lab</code>, <code>realpy</code>, <code>sql-lab</code>) are listed, and Measure-Object prints a Count of directories below <code>C:\de-lab</code>.</>
              ),
            },
            {
              title: 'Plant a deterministic 1M-row CSV',
              body: <p>So the next checkpoints can be exact, generate a fresh million-row file with a known recipe (takes a few seconds — a million lines is real work):</p>,
              commands: [
                {
                  ps: 'Set-Location C:\\de-lab\\sql-lab\nNew-Item -ItemType Directory -Force data | Out-Null\nuv run python -c "f=open(\'data/hunt_events.csv\',\'w\'); f.write(\'id,user,amount\\n\'); [f.write(str(i)+\',u\'+str(i%997)+\',\'+str(i*37%5000)+\'\\n\') for i in range(1000000)]; f.close()"',
                },
              ],
              checkpoint: (
                <><code>Get-ChildItem data\hunt_events.csv</code> shows the file with Length around 17 MB (roughly 17,600,000 bytes).</>
              ),
            },
            {
              title: 'Count its lines without opening it',
              commands: [
                { ps: 'Get-Content .\\data\\hunt_events.csv | Measure-Object -Line', bash: 'wc -l data/hunt_events.csv' },
              ],
              checkpoint: (
                <>Exactly <strong>1000001</strong> lines — one million rows plus the header. (It takes a moment: counting streams every line. Opening this file in Notepad would be far worse.)</>
              ),
            },
            {
              title: 'Read the first and last pages',
              commands: [
                { ps: 'Get-Content .\\data\\hunt_events.csv -TotalCount 3\nGet-Content .\\data\\hunt_events.csv -Tail 1', bash: 'head -3 data/hunt_events.csv\ntail -1 data/hunt_events.csv' },
              ],
              checkpoint: (
                <>
                  First lines: <code>id,user,amount</code>, <code>0,u0,0</code>, <code>1,u1,37</code>; last line exactly{' '}
                  <code>999999,u8,4963</code> — and the tail came back instantly, because it seeks to the end.
                </>
              ),
            },
            {
              title: 'Grep for a needle',
              body: <p>Find the row whose id is 424242 — one line among a million:</p>,
              commands: [
                { ps: 'Select-String -Path .\\data\\hunt_events.csv -Pattern "^424242,"', bash: 'grep -n "^424242," data/hunt_events.csv' },
              ],
              checkpoint: (
                <>One match on line <strong>424244</strong> (header is line 1, row 0 is line 2): <code>424242,u517,1954</code>.</>
              ),
            },
            {
              title: 'Find the largest files in all of C:\\de-lab',
              commands: [
                {
                  ps: 'Get-ChildItem C:\\de-lab -Recurse -File |\n  Sort-Object Length -Descending |\n  Select-Object -First 5 FullName, Length',
                  bash: 'du -a /c/de-lab | sort -nr | head -5',
                },
              ],
              checkpoint: (
                <><code>hunt_events.csv</code> appears at or near the top. Note what you just did: filtered and sorted on a real <code>Length</code> property — no text parsing anywhere.</>
              ),
            },
            {
              title: 'Tail a live log in realpy',
              body: <p>Append two known lines to a realpy log, then read back just the end — the move you&apos;ll use on every scheduled pipeline from lesson 1.6.4 onward:</p>,
              commands: [
                {
                  ps: 'Set-Location C:\\de-lab\\realpy\nAdd-Content run.log "2026-07-22 09:00:00 INFO hunt begins"\nAdd-Content run.log "2026-07-22 09:00:01 INFO hunt ends"\nGet-Content .\\run.log -Tail 2',
                  bash: 'cd /c/de-lab/realpy\necho "2026-07-22 09:00:00 INFO hunt begins" >> run.log\necho "2026-07-22 09:00:01 INFO hunt ends" >> run.log\ntail -2 run.log',
                },
              ],
              checkpoint: (
                <>
                  The two lines print, <code>hunt ends</code> last. Bonus: run{' '}
                  <code>Get-Content .\run.log -Tail 0 -Wait</code> in one terminal, append a line from a second, watch it
                  appear live (Ctrl+C stops).
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
              q: 'What travels down a PowerShell pipe between two cmdlets?',
              options: [
                'Plain text, one line at a time',
                'Objects with typed properties like Name and Length',
                'JSON documents',
                'File handles',
              ],
              answer: 1,
              explain:
                'PowerShell pipes .NET objects, so Where-Object can test $_.Length directly. Unix shells pipe text, which every downstream tool must re-parse — the central design fork of this lesson.',
            },
            {
              q: 'ls -la works in bash but errors in PowerShell. Why?',
              options: [
                'PowerShell has no way to list files',
                'ls must be written in uppercase in PowerShell',
                'In PowerShell, ls is an alias for Get-ChildItem, which has no -la parameter',
                '-la needs administrator rights on Windows',
              ],
              answer: 2,
              explain:
                'Aliases map names, not flags. ls runs Get-ChildItem, which does not understand bash-style combined flags. Shell mismatch remains the most common beginner error on Windows.',
            },
            {
              q: 'The bash equivalent of Get-Content f | Measure-Object -Line is:',
              options: ['grep f', 'wc -l f', 'head f', 'du f'],
              answer: 1,
              explain:
                'wc -l counts lines. grep searches, head shows the start, du reports disk usage. The survival table is worth memorizing — CI logs and server sessions all speak bash.',
            },
            {
              q: 'What is the difference between > and >> in redirection?',
              options: [
                'They are interchangeable',
                '> appends to the file; >> overwrites it',
                '> overwrites the file; >> appends to it',
                '> works only for errors',
              ],
              answer: 2,
              explain:
                'Overwrite versus append. A scheduled job logging with > would keep only its latest run — with >> it keeps a history. You will care about exactly this in lesson 1.6.4.',
            },
          ]}
        />
      </Section>

      <InterviewAngle
        items={[
          {
            q: 'You SSH into a Linux box where a pipeline has written a 10 GB log. How do you investigate recent errors?',
            a: (
              <p>
                Never open the file. <code>tail -n 100 app.log</code> for the recent end,{' '}
                <code>grep ERROR app.log | tail -50</code> for recent errors, <code>tail -f</code> to watch live. The
                point interviewers listen for: these tools stream, so cost scales with what you extract, not file size.
              </p>
            ),
          },
          {
            q: 'PowerShell pipes objects and Unix pipes text. What is the actual trade-off?',
            a: (
              <p>
                Objects carry structure, so downstream stages filter on typed properties with zero re-parsing. But
                objects require a shared runtime on both ends of the pipe; text requires nothing, making it the universal
                interface across languages, machines, and decades. Heterogeneous server environments can only agree on
                bytes — why the Unix model won there, and why CSV and JSON play the same universal-interface role in your
                pipelines.
              </p>
            ),
          },
        ]}
      />

      <KeyTakeaways
        points={[
          <>The terminal is where pipelines live: scaffolded, debugged, and retired. Machines that matter have no GUI.</>,
          <>
            Navigation is Get-Location / Set-Location / Get-ChildItem; read big files with <code>-TotalCount</code>,{' '}
            <code>-Tail</code>, and <code>-Wait</code> — never by opening them.
          </>,
          <>
            PowerShell pipes objects: Where-Object, Sort-Object, Select-Object, Measure-Object are WHERE, ORDER BY,
            SELECT, and COUNT for your file system. Get-Help and Get-Member make it self-documenting.
          </>,
          <>
            Be bash-literate: servers and CI speak ls / cat / head / tail / grep / wc. Same ideas, different spelling.
          </>,
          <>
            <code>&gt;</code> overwrites, <code>&gt;&gt;</code> appends — the difference between a snapshot and a log.
          </>,
        ]}
      />
    </>
  )
}
