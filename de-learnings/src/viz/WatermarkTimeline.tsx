import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

export interface TimedEvent {
  /** Event-time position along the axis, 0 (oldest) to 1 (newest). */
  t: number
  label?: string
  /** A late arrival: it only shows up after the watermark has already passed its event-time. */
  late?: boolean
}

interface WatermarkTimelineProps {
  events?: TimedEvent[]
  caption?: ReactNode
  height?: number
}

const DEFAULT_EVENTS: TimedEvent[] = [
  { t: 0.1 }, { t: 0.22 }, { t: 0.3 }, { t: 0.44 },
  { t: 0.52 }, { t: 0.6, late: true, label: 'late!' }, { t: 0.7 }, { t: 0.82 },
  { t: 0.34, late: true, label: 'late!' }, { t: 0.9 },
]

const X0 = -8
const X1 = 8
const xOf = (t: number) => X0 + t * (X1 - X0)

const ON_TIME = new THREE.Color('#34d399')
const PENDING = new THREE.Color('#475569')
const LATE = new THREE.Color('#f43f5e')

function Scene({ events }: { events: TimedEvent[] }) {
  const dots = useRef<(THREE.Mesh | null)[]>([])
  const wm = useRef<THREE.Group>(null)
  const tag = useRef<HTMLDivElement>(null)
  const color = useMemo(() => new THREE.Color(), [])

  useFrame(({ clock }) => {
    // Watermark sweeps event-time left -> right over ~7s, then loops.
    const w = (clock.getElapsedTime() % 7) / 7
    if (wm.current) wm.current.position.x = xOf(w)
    events.forEach((e, i) => {
      const mesh = dots.current[i]
      if (!mesh) return
      const mat = mesh.material as THREE.MeshStandardMaterial
      const passed = w > e.t
      if (e.late) {
        // Late events only appear after the watermark has moved past their event-time.
        const appear = w > e.t + 0.06
        const s = THREE.MathUtils.lerp(mesh.scale.x, appear ? 1 : 0.001, 0.2)
        mesh.scale.setScalar(s)
        color.copy(LATE)
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, appear ? 0.9 : 0, 0.15)
      } else {
        mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1, 0.2))
        color.copy(passed ? ON_TIME : PENDING)
        mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, passed ? 0.6 : 0.15, 0.12)
      }
      mat.color.lerp(color, 0.15)
      mat.emissive.lerp(color, 0.15)
    })
    if (tag.current) tag.current.textContent = 'watermark: ' + (w * 100).toFixed(0) + '%'
  })

  return (
    <>
      {/* time axis */}
      <Line points={[[X0, -1.4, 0], [X1, -1.4, 0]]} color="#334155" lineWidth={2} />
      <Html position={[X1 + 0.3, -1.4, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, color: 'rgba(148,163,184,0.9)', whiteSpace: 'nowrap' }}>event time →</div>
      </Html>

      {/* event dots */}
      {events.map((e, i) => (
        <group key={i} position={[xOf(e.t), 0, 0]}>
          <mesh ref={(m) => (dots.current[i] = m)}>
            <sphereGeometry args={[0.32, 20, 20]} />
            <meshStandardMaterial color={PENDING} emissive={PENDING} emissiveIntensity={0.15} roughness={0.3} />
          </mesh>
          {/* stem to axis */}
          <Line points={[[0, 0, 0], [0, -1.4, 0]]} color="#1e293b" lineWidth={1} />
          {e.label && (
            <Html position={[0, 0.55, 0]} center style={{ pointerEvents: 'none' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: '#f43f5e', whiteSpace: 'nowrap' }}>{e.label}</div>
            </Html>
          )}
        </group>
      ))}

      {/* the moving watermark */}
      <group ref={wm}>
        <Line points={[[0, -1.7, 0], [0, 2, 0]]} color="#38bdf8" lineWidth={3} />
        <mesh position={[0, 2.15, 0]}>
          <coneGeometry args={[0.18, 0.35, 4]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
        </mesh>
        <Html position={[0, -2.15, 0]} center style={{ pointerEvents: 'none' }}>
          <div ref={tag} style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>watermark</div>
        </Html>
      </group>
    </>
  )
}

/**
 * A watermark sweeping across event time: on-time events turn green as it
 * passes, late arrivals (past the watermark) flash red — the incremental-load
 * and late-data story in one scene. Reusable: pass your own `events`.
 */
export function WatermarkTimeline({ events = DEFAULT_EVENTS, caption, height = 400 }: WatermarkTimelineProps) {
  return (
    <VizCanvas
      height={height}
      camera={[0, 0.4, 15]}
      caption={
        caption ?? (
          <>
            The <span style={{ color: '#38bdf8' }}>watermark</span> is the pipeline&apos;s claim: &quot;I have seen every
            event up to here.&quot; As it advances, <span style={{ color: '#34d399' }}>on-time</span> events are included;
            a <span style={{ color: '#f43f5e' }}>late</span> arrival — one that shows up after the watermark passed its
            event-time — is the problem incremental pipelines must decide how to handle (drop, dead-letter, or reprocess).
          </>
        )
      }
    >
      <Scene events={events} />
    </VizCanvas>
  )
}
