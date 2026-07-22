import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

const FRUITS = ['fig', 'kiwi', 'plum', 'pear', 'lime', 'date', 'apple', 'mango']
const TARGET = 'mango' // worst case for the list: last element
const TARGET_BUCKET = 5 // pretend hash("mango") % 8

function ListLane({ active, onDone }: { active: boolean; onDone: (steps: number) => void }) {
  const cursor = useRef(-1)
  const t = useRef(0)
  const meshes = useRef<(THREE.Mesh | null)[]>([])

  useFrame((_, delta) => {
    if (!active) {
      cursor.current = -1
      t.current = 0
    } else if (cursor.current < FRUITS.indexOf(TARGET)) {
      t.current += delta
      if (t.current > 0.35) {
        t.current = 0
        cursor.current += 1
        if (cursor.current === FRUITS.indexOf(TARGET)) onDone(cursor.current + 1)
      }
    }
    meshes.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshStandardMaterial
      const isCursor = i === cursor.current
      const found = isCursor && FRUITS[i] === TARGET
      mat.emissiveIntensity = THREE.MathUtils.lerp(
        mat.emissiveIntensity,
        found ? 0.9 : isCursor ? 0.6 : i < cursor.current ? 0.05 : 0.18,
        0.2,
      )
      mat.emissive.set(found ? '#34d399' : isCursor ? '#fbbf24' : '#22d3ee')
    })
  })

  return (
    <group position={[0, 1.6, 0]}>
      <Html position={[-8.6, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', fontFamily: 'Consolas, monospace', whiteSpace: 'nowrap' }}>
          list — scan
        </div>
      </Html>
      {FRUITS.map((f, i) => (
        <group key={f} position={[i * 1.55 - 5.4, 0, 0]}>
          <mesh ref={(el) => void (meshes.current[i] = el)}>
            <boxGeometry args={[1.3, 1, 1]} />
            <meshStandardMaterial color="#155e75" emissive="#22d3ee" emissiveIntensity={0.18} roughness={0.4} />
          </mesh>
          <Html position={[0, -0.95, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{ fontSize: 9.5, color: 'rgba(148,163,184,0.9)', fontFamily: 'Consolas, monospace' }}>
              [{i}] {f}
            </div>
          </Html>
        </group>
      ))}
    </group>
  )
}

function DictLane({ active, onDone }: { active: boolean; onDone: (steps: number) => void }) {
  const progress = useRef(0)
  const fired = useRef(false)
  const arrow = useRef<THREE.Mesh>(null)
  const buckets = useRef<(THREE.Mesh | null)[]>([])

  const start = new THREE.Vector3(-6.8, -1.4, 1.6)
  const end = new THREE.Vector3(TARGET_BUCKET * 1.55 - 5.4, -1.6, 0)

  useFrame((_, delta) => {
    if (!active) {
      progress.current = 0
      fired.current = false
    } else if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta * 1.6)
      if (progress.current >= 1 && !fired.current) {
        fired.current = true
        onDone(1)
      }
    }
    if (arrow.current) {
      const p = progress.current
      arrow.current.visible = active
      arrow.current.position.lerpVectors(start, end, p)
      arrow.current.position.y += Math.sin(p * Math.PI) * 1.6
    }
    buckets.current.forEach((m, i) => {
      if (!m) return
      const mat = m.material as THREE.MeshStandardMaterial
      const hit = active && fired.current && i === TARGET_BUCKET
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, hit ? 0.9 : 0.15, 0.2)
      mat.emissive.set(hit ? '#34d399' : '#a78bfa')
    })
  })

  return (
    <group position={[0, -1.6, 0]}>
      <Html position={[-8.6, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'Consolas, monospace', whiteSpace: 'nowrap' }}>
          dict — hash jump
        </div>
      </Html>
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i} position={[i * 1.55 - 5.4, 0, 0]}>
          <mesh ref={(el) => void (buckets.current[i] = el)}>
            <boxGeometry args={[1.3, 1, 1]} />
            <meshStandardMaterial color="#4c1d95" emissive="#a78bfa" emissiveIntensity={0.15} roughness={0.4} />
          </mesh>
          <Html position={[0, -0.95, 0]} center style={{ pointerEvents: 'none' }}>
            <div style={{ fontSize: 9.5, color: 'rgba(148,163,184,0.9)', fontFamily: 'Consolas, monospace' }}>
              b{i}
              {i === TARGET_BUCKET ? ' ·mango' : ''}
            </div>
          </Html>
        </group>
      ))}
      <mesh ref={arrow} visible={false}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

/** list O(n) scan vs dict O(1) hash lookup, raced side by side. */
export function CollectionsViz() {
  const [running, setRunning] = useState(false)
  const [listSteps, setListSteps] = useState<number | null>(null)
  const [dictSteps, setDictSteps] = useState<number | null>(null)

  return (
    <VizCanvas
      height={360}
      camera={[0, 1.5, 12.5]}
      caption={
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setListSteps(null)
              setDictSteps(null)
              setRunning(false)
              requestAnimationFrame(() => setRunning(true))
            }}
            className="rounded-md bg-accent px-3 py-1 font-semibold text-bg"
          >
            find “{TARGET}” ▸
          </button>
          <span className="font-mono text-[11px]">
            list: {listSteps === null ? '—' : `${listSteps} comparisons`} · dict:{' '}
            {dictSteps === null ? '—' : `${dictSteps} hash + 1 look`}
          </span>
          <span className="min-w-0 flex-1">
            The list checks boxes one by one — cost grows with length, O(n). The dict computes
            hash(key) and jumps straight to the bucket — O(1) no matter how big it gets.
          </span>
        </div>
      }
    >
      <ListLane active={running} onDone={setListSteps} />
      <DictLane active={running} onDone={setDictSteps} />
      <gridHelper args={[30, 16, '#334155', '#1e293b']} position={[0, -3.4, 0]} />
    </VizCanvas>
  )
}
