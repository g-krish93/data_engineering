// Growing glossary. New jargon introduced in any lesson gets an entry here
// (see CLAUDE.md content rules) and is wrapped in <GlossaryTerm> on first use.

export interface GlossaryEntry {
  term: string
  definition: string
}

export const glossary: Record<string, GlossaryEntry> = {
  'data-pipeline': {
    term: 'Data pipeline',
    definition:
      'A sequence of automated steps that moves data from where it is produced to where it is useful, usually cleaning and reshaping it along the way.',
  },
  etl: {
    term: 'ETL',
    definition:
      'Extract, Transform, Load — pull data from a source, reshape it, then write it to a destination. Contrast with ELT, where raw data is loaded first and transformed inside the destination.',
  },
  elt: {
    term: 'ELT',
    definition:
      'Extract, Load, Transform — load raw data into the warehouse/lake first, then transform it there with SQL. The dominant modern pattern because storage is cheap and warehouses are fast.',
  },
  'data-warehouse': {
    term: 'Data warehouse',
    definition:
      'A database optimized for analytical questions over large history ("how did sales trend by region?") rather than fast single-record lookups.',
  },
  'data-lake': {
    term: 'Data lake',
    definition:
      'Cheap object storage (like S3) holding raw files — any format, any size — that engines read directly. Flexible, but without discipline it becomes a swamp.',
  },
  oltp: {
    term: 'OLTP',
    definition:
      'Online Transaction Processing — many small, fast reads/writes of individual records (place order, update profile). What operational app databases do.',
  },
  olap: {
    term: 'OLAP',
    definition:
      'Online Analytical Processing — few, large queries that scan and aggregate millions of rows (sum revenue by month). What warehouses do.',
  },
  idempotency: {
    term: 'Idempotency',
    definition:
      'A property of an operation: running it twice has the same effect as running it once. The single most important property of a reliable pipeline — reruns must not duplicate data.',
  },
  orchestrator: {
    term: 'Orchestrator',
    definition:
      'The system that runs your pipelines on schedule, in the right order, with retries, and tells you when things fail (e.g., Dagster, Airflow).',
  },
  'columnar-storage': {
    term: 'Columnar storage',
    definition:
      'Storing all values of each column together (instead of row by row) so analytical queries read only the columns they need — often 10–100x less I/O.',
  },
  repository: {
    term: 'Repository',
    definition: 'A folder whose entire history of changes is tracked by git. "Repo" for short.',
  },
  commit: {
    term: 'Commit',
    definition:
      'A saved snapshot of your repository at a point in time, with a message describing what changed. The unit of history in git.',
  },
  branch: {
    term: 'Branch',
    definition:
      'A movable pointer to a line of commits, letting you work on changes in parallel without touching the main history until you merge.',
  },
  'virtual-environment': {
    term: 'Virtual environment',
    definition:
      'An isolated per-project Python installation, so each project pins its own package versions without breaking the others.',
  },
  container: {
    term: 'Container',
    definition:
      'A lightweight, isolated box for running software with everything it needs bundled in — the same on every machine. Docker is the standard tool.',
  },
  image: {
    term: 'Image (Docker)',
    definition:
      'The frozen template a container is started from — like a class to a container’s instance. Pulled from registries such as Docker Hub.',
  },
  terminal: {
    term: 'Terminal',
    definition:
      'A text interface for driving your computer with commands. Data engineering work lives here: running pipelines, inspecting servers, using git.',
  },
  'package-manager': {
    term: 'Package manager',
    definition:
      'A tool that installs and updates software libraries and resolves their version requirements (uv/pip for Python, npm for JavaScript).',
  },
  'object-storage': {
    term: 'Object storage',
    definition:
      'Storage that keeps files ("objects") under string keys in buckets, accessed over HTTP — no real folders, no in-place edits. S3 is the archetype; MinIO is the local stand-in.',
  },
  'schema': {
    term: 'Schema',
    definition:
      'The declared shape of data: column names, types, and constraints. Schemas are contracts between producers and consumers of data.',
  },
}
