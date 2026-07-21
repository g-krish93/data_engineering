import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Float, Html } from '@react-three/drei'
import { VizCanvas } from './VizCanvas'

const RAW = new THREE.Color('#fbbf24')
const CLEAN = new THREE.Color('#22d3ee')
const STORED = new THREE.Color('#a78bfa')

interface StationInfo {
  label: string
  blurb: string
}

interface DataJourneyProps {
  height?: number
  source?: StationInfo
  transform?: StationInfo
  warehouse?: StationInfo
  caption?: React.ReactNode
}

const N = 60

function Particles({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const offsets = useMemo(() => Array.from({ length: N }, () => Math.random()), [])
  const color = useMemo(() => new THREE.Color(), [])

  useLayoutEffect(() => {
    if (!mesh.current) return
    for (let i = 0; i < N; i++) mesh.current.setColorAt(i, RAW)
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  }, [])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t0 = clock.getElapsedTime() * 0.07
    for (let i = 0; i < N; i++) {
      const t = (t0 + offsets[i]) % 1
      const p = curve.getPointAt(t)
      dummy.position.copy(p)
      // small jitter so the stream has body
      dummy.position.y += Math.sin(i * 37.7 + t * 20) * 0.14
      dummy.position.z += Math.cos(i * 91.3) * 0.22
      const s = 0.16 + 0.05 * Math.sin(i * 13.1)
      dummy.scale.setScalar(s)
      dummy.rotation.set(t * 6 + i, t * 4, 0)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
      // raw -> clean at the transform gate (t≈0.5), clean -> stored on arrival
      if (t < 0.42) color.copy(RAW)
      else if (t < 0.55) color.copy(RAW).lerp(CLEAN, (t - 0.42) / 0.13)
      else if (t < 0.88) color.copy(CLEAN)
      else color.copy(CLEAN).lerp(STORED, (t - 0.88) / 0.12)
      mesh.current.setColorAt(i, color)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.35} metalness={0.15} />
    </instancedMesh>
  )
}

function Station({
  position,
  info,
  children,
  labelColor,
}: {
  position: [number, number, number]
  info: StationInfo
  children: React.ReactNode
  labelColor: string
}) {
  const [hover, setHover] = useState(false)
  return (
    <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.4}>
      <group
        position={position}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
      >
        {children}
        <Html position={[0, 2.1, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              whiteSpace: 'nowrap',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: labelColor,
              textShadow: '0 1px 8px rgba(0,0,0,0.45)',
            }}
          >
            {info.label}
          </div>
        </Html>
        {hover && (
          <Html position={[0, -2.2, 0]} center style={{ pointerEvents: 'none' }}>
            <div
              style={{
                width: 220,
                fontSize: 12,
                lineHeight: 1.5,
                background: 'rgba(10,14,26,0.92)',
                color: '#e8edf8',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                padding: '8px 10px',
              }}
            >
              {info.blurb}
            </div>
          </Html>
        )}
      </group>
    </Float>
  )
}

/**
 * The signature "what data engineering is" scene: raw records stream out of a
 * source system, get cleaned at the transform gate, and land in a columnar
 * warehouse. Hover the stations.
 */
export function DataJourney({
  height = 400,
  source = { label: 'SOURCES', blurb: 'Operational systems constantly producing raw records: app databases, APIs, event streams, files.' },
  transform = { label: 'PIPELINE', blurb: 'Automated steps that validate, clean, and reshape raw records — on a schedule, with retries, without human hands.' },
  warehouse = { label: 'WAREHOUSE', blurb: 'Analytical storage organized by column, built to answer big questions over history in seconds.' },
  caption,
}: DataJourneyProps) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-8.5, 0.2, 0),
        new THREE.Vector3(-4.5, 0.9, 0.4),
        new THREE.Vector3(0, 0.4, 0),
        new THREE.Vector3(4.5, 0.9, -0.4),
        new THREE.Vector3(8.5, 0.3, 0),
      ]),
    [],
  )

  return (
    <VizCanvas height={height} camera={[0, 5.5, 15]} caption={caption}>
      {/* source: a database cylinder */}
      <Station position={[-8.5, 0, 0]} info={source} labelColor="#fbbf24">
        <mesh>
          <cylinderGeometry args={[1.05, 1.05, 1.9, 32]} />
          <meshStandardMaterial color="#b45309" roughness={0.4} emissive="#fbbf24" emissiveIntensity={0.18} />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[1.05, 1.05, 0.12, 32]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.3} />
        </mesh>
      </Station>

      {/* transform gate */}
      <Station position={[0, 0.4, 0]} info={transform} labelColor="#22d3ee">
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[1.5, 0.16, 16, 64]} />
          <meshStandardMaterial color="#0e7490" emissive="#22d3ee" emissiveIntensity={0.5} roughness={0.25} />
        </mesh>
      </Station>

      {/* warehouse: columnar bars */}
      <Station position={[8.5, 0, 0]} info={warehouse} labelColor="#a78bfa">
        {[-0.8, 0, 0.8].map((x, i) => (
          <mesh key={i} position={[x, [0.3, 0.75, 0.5][i], 0]}>
            <boxGeometry args={[0.6, [1.6, 2.5, 2.0][i], 0.6]} />
            <meshStandardMaterial
              color="#6d28d9"
              emissive="#a78bfa"
              emissiveIntensity={0.22}
              roughness={0.35}
            />
          </mesh>
        ))}
      </Station>

      <Particles curve={curve} />

      {/* ground grid for depth */}
      <gridHelper args={[46, 26, '#334155', '#1e293b']} position={[0, -2.4, 0]} />
    </VizCanvas>
  )
}
