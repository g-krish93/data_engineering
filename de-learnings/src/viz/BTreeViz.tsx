import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

interface BNode {
  keys: number[]
  children: BNode[]
}

const MAX_KEYS = 3 // order-4 B-tree; real databases use hundreds of keys per node

function insertInto(node: BNode, key: number): { promo?: { key: number; right: BNode } } {
  if (node.children.length === 0) {
    node.keys.push(key)
    node.keys.sort((a, b) => a - b)
  } else {
    let i = node.keys.findIndex((k) => key < k)
    if (i === -1) i = node.keys.length
    const res = insertInto(node.children[i], key)
    if (res.promo) {
      node.keys.splice(i, 0, res.promo.key)
      node.children.splice(i + 1, 0, res.promo.right)
    }
  }
  if (node.keys.length > MAX_KEYS) {
    const mid = 2
    const upKey = node.keys[mid]
    const right: BNode = {
      keys: node.keys.slice(mid + 1),
      children: node.children.length ? node.children.slice(mid + 1) : [],
    }
    node.keys = node.keys.slice(0, mid)
    if (node.children.length) node.children = node.children.slice(0, mid + 1)
    return { promo: { key: upKey, right } }
  }
  return {}
}

function buildTree(keys: number[]): BNode {
  let root: BNode = { keys: [], children: [] }
  for (const k of keys) {
    const res = insertInto(root, k)
    if (res.promo) root = { keys: [res.promo.key], children: [root, res.promo.right] }
  }
  return root
}

interface Placed {
  node: BNode
  x: number
  y: number
  depth: number
  id: string
}

function layout(root: BNode): { placed: Placed[]; edges: { from: Placed; to: Placed }[]; width: number } {
  const placed: Placed[] = []
  const edges: { from: Placed; to: Placed }[] = []
  let leafX = 0

  function nodeWidth(n: BNode) {
    return Math.max(n.keys.length, 1) * 30 + 10
  }

  function place(n: BNode, depth: number, id: string): Placed {
    let x: number
    if (n.children.length === 0) {
      x = leafX + nodeWidth(n) / 2
      leafX += nodeWidth(n) + 18
    } else {
      const kids = n.children.map((c, i) => place(c, depth + 1, `${id}.${i}`))
      x = (kids[0].x + kids[kids.length - 1].x) / 2
      const me: Placed = { node: n, x, y: depth * 72 + 30, depth, id }
      placed.push(me)
      kids.forEach((k) => edges.push({ from: me, to: k }))
      return me
    }
    const me: Placed = { node: n, x, y: depth * 72 + 30, depth, id }
    placed.push(me)
    return me
  }
  place(root, 0, 'n')
  return { placed, edges, width: Math.max(leafX, 200) }
}

function searchPath(root: BNode, key: number): { ids: string[]; found: boolean } {
  const ids: string[] = []
  let node = root
  let id = 'n'
  for (;;) {
    ids.push(id)
    if (node.keys.includes(key)) return { ids, found: true }
    if (node.children.length === 0) return { ids, found: false }
    let i = node.keys.findIndex((k) => key < k)
    if (i === -1) i = node.keys.length
    node = node.children[i]
    id = `${id}.${i}`
  }
}

const INSERT_SEQ = [42, 17, 68, 25, 8, 90, 33, 55, 71, 12, 61, 47, 79, 29]

/** Interactive order-4 B-tree: watch inserts split nodes, then race a search down the levels. */
export function BTreeViz() {
  const [count, setCount] = useState(4)
  const [query, setQuery] = useState('')
  const [probe, setProbe] = useState<{ ids: string[]; found: boolean; key: number } | null>(null)

  const inserted = INSERT_SEQ.slice(0, count)
  const tree = useMemo(() => buildTree(inserted), [inserted])
  const { placed, edges, width } = useMemo(() => layout(tree), [tree])
  const height = (Math.max(...placed.map((p) => p.depth)) + 1) * 72 + 20
  const lastKey = inserted[inserted.length - 1]

  const doSearch = () => {
    const k = Number(query)
    if (Number.isNaN(k)) return
    setProbe({ ...searchPath(tree, k), key: k })
  }

  return (
    <div className="card my-4 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => {
            setProbe(null)
            setCount((c) => Math.min(INSERT_SEQ.length, c + 1))
          }}
          disabled={count >= INSERT_SEQ.length}
          className="rounded-md bg-accent px-3 py-1 font-semibold text-bg disabled:opacity-40"
        >
          insert {count < INSERT_SEQ.length ? INSERT_SEQ[count] : '—'} ▸
        </button>
        <button
          onClick={() => {
            setCount(4)
            setProbe(null)
          }}
          className="rounded-md border border-line px-2.5 py-1 text-muted hover:text-ink"
        >
          reset
        </button>
        <span className="ml-2 flex items-center gap-1.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="key…"
            inputMode="numeric"
            className="w-16 rounded-md border border-line bg-transparent px-2 py-1 font-mono outline-none focus:border-accent"
          />
          <button onClick={doSearch} className="rounded-md border border-accent/50 px-2.5 py-1 font-semibold text-accent hover:bg-accent/10">
            search
          </button>
        </span>
        {probe && (
          <span className="font-mono">
            {probe.found ? (
              <span className="text-good">
                found {probe.key} in {probe.ids.length} node visits
              </span>
            ) : (
              <span className="text-bad">
                {probe.key} absent — proven in {probe.ids.length} visits
              </span>
            )}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: Math.min(width, 640) }} className="w-full">
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.from.x}
              y1={e.from.y + 14}
              x2={e.to.x}
              y2={e.to.y - 14}
              stroke={probe && probe.ids.includes(e.to.id) && probe.ids.includes(e.from.id) ? 'var(--accent)' : 'var(--line)'}
              strokeWidth={probe && probe.ids.includes(e.to.id) ? 2.5 : 1.2}
            />
          ))}
          {placed.map((p) => {
            const onPath = probe?.ids.includes(p.id)
            const pathIdx = probe ? probe.ids.indexOf(p.id) : -1
            const w = Math.max(p.node.keys.length, 1) * 30 + 10
            return (
              <motion.g
                key={`${p.id}-${count}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                <motion.rect
                  x={p.x - w / 2}
                  y={p.y - 15}
                  width={w}
                  height={30}
                  rx={8}
                  fill={onPath ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'var(--panel)'}
                  stroke={onPath ? 'var(--accent)' : 'var(--line)'}
                  strokeWidth={onPath ? 2 : 1}
                  animate={onPath ? { strokeWidth: [1, 2.5, 2] } : {}}
                  transition={{ delay: pathIdx * 0.35 }}
                />
                {p.node.keys.map((k, i) => (
                  <text
                    key={i}
                    x={p.x - w / 2 + 20 + i * 30}
                    y={p.y + 4}
                    fontSize={12}
                    textAnchor="middle"
                    fontFamily="Consolas, monospace"
                    fontWeight={700}
                    fill={probe?.found && probe.key === k && onPath ? 'var(--good)' : k === lastKey ? 'var(--warn)' : 'var(--ink)'}
                  >
                    {k}
                  </text>
                ))}
              </motion.g>
            )
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">
        {inserted.length} keys, height {Math.max(...placed.map((p) => p.depth)) + 1}. Nodes split when they
        overflow {MAX_KEYS} keys — the tree grows <em>upward</em>, staying balanced, so every search costs
        the same few hops. Real B-trees hold hundreds of keys per node: billions of rows in 3–4 levels.
      </p>
    </div>
  )
}
