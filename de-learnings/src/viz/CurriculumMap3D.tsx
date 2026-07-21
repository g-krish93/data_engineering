import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Float, Html, Line, Stars } from '@react-three/drei'
import type { PhaseMeta } from '../curriculum'
import { phases, phaseProgress } from '../curriculum'
import { useProgressStore } from '../app/stores'
import { VizCanvas } from './VizCanvas'

type PhaseStatus = 'complete' | 'active' | 'ready' | 'planned'

function helixPoint(i: number): [number, number, number] {
  const angle = 2.4 - i * 0.82
  const r = 6.8
  return [Math.cos(angle) * r, i * 1.02 - 4.1, Math.sin(angle) * r]
}

function PhaseNode({
  phase,
  position,
  status,
  done,
  total,
}: {
  phase: PhaseMeta
  position: [number, number, number]
  status: PhaseStatus
  done: number
  total: number
}) {
  const [hover, setHover] = useState(false)
  const mesh = useRef<THREE.Mesh>(null)
  const radius = 0.5 + phase.weeks * 0.035

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const pulse = status === 'active' ? 1 + Math.sin(clock.getElapsedTime() * 2.4) * 0.06 : 1
    mesh.current.scale.setScalar(hover ? pulse * 1.18 : pulse)
  })

  const dim = status === 'planned'
  return (
    <Float speed={1.2} rotationIntensity={0} floatIntensity={0.35}>
      <group position={position}>
        <mesh
          ref={mesh}
          onClick={(e) => {
            e.stopPropagation()
            window.location.hash = `#/phase/${phase.number}`
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHover(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHover(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <icosahedronGeometry args={[radius, 2]} />
          <meshStandardMaterial
            color={phase.color}
            emissive={phase.color}
            emissiveIntensity={status === 'active' ? 0.65 : status === 'complete' ? 0.45 : hover ? 0.5 : dim ? 0.08 : 0.25}
            roughness={0.3}
            transparent
            opacity={dim ? 0.45 : 1}
            wireframe={dim && !hover}
          />
        </mesh>
        {status === 'complete' && (
          <mesh rotation={[Math.PI / 2.6, 0, 0]}>
            <torusGeometry args={[radius + 0.32, 0.045, 12, 48]} />
            <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.7} />
          </mesh>
        )}
        <Html position={[0, -radius - 0.55, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              fontFamily: 'Consolas, monospace',
              letterSpacing: '0.1em',
              color: dim ? 'rgba(148,163,184,0.7)' : phase.color,
              whiteSpace: 'nowrap',
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            P{phase.number}
          </div>
        </Html>
        {hover && (
          <Html position={[0, radius + 0.7, 0]} center style={{ pointerEvents: 'none', zIndex: 20 }}>
            <div
              style={{
                width: 250,
                background: 'rgba(8,12,24,0.94)',
                border: `1px solid ${phase.color}`,
                borderRadius: 12,
                padding: '10px 12px',
                color: '#e8edf8',
                fontSize: 12,
                lineHeight: 1.5,
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                Phase {phase.number} — {phase.title}
              </div>
              <div style={{ color: '#8e97ad', marginTop: 2 }}>{phase.tagline}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 10, color: '#8e97ad', fontSize: 11 }}>
                <span>~{phase.weeks} wk</span>
                <span>
                  {done}/{total} lessons done
                </span>
                {phase.project && <span style={{ color: phase.color }}>{phase.project.code}</span>}
              </div>
              <div style={{ marginTop: 6, color: phase.color, fontWeight: 600, fontSize: 11 }}>
                click to open →
              </div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  )
}

/** The home-screen centerpiece: the whole curriculum as an ascending journey. */
export function CurriculumMap3D({ height = 520 }: { height?: number }) {
  const doneMap = useProgressStore((s) => s.done)

  const pathPoints = useMemo(() => {
    const pts = phases.map((_, i) => new THREE.Vector3(...helixPoint(i)))
    const curve = new THREE.CatmullRomCurve3(pts)
    return curve.getPoints(140).map((v) => [v.x, v.y, v.z] as [number, number, number])
  }, [])

  return (
    <VizCanvas height={height} camera={[0, 3.5, 17]} fov={50} autoRotate>
      <Stars radius={60} depth={30} count={2400} factor={3.2} saturation={0.4} fade speed={0.6} />
      <Line points={pathPoints} color="#475569" lineWidth={1.5} transparent opacity={0.65} dashed dashSize={0.35} gapSize={0.18} />
      {phases.map((phase, i) => {
        const prog = phaseProgress(phase, doneMap)
        const status: PhaseStatus =
          prog.total > 0 && prog.done === prog.total
            ? 'complete'
            : prog.done > 0
              ? 'active'
              : prog.authored > 0
                ? 'ready'
                : 'planned'
        return (
          <PhaseNode
            key={phase.number}
            phase={phase}
            position={helixPoint(i)}
            status={status}
            done={prog.done}
            total={prog.total}
          />
        )
      })}
    </VizCanvas>
  )
}
