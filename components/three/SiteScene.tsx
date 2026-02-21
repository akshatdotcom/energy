"use client";

import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChargerStatus = "charging" | "throttled" | "faulted" | "available";

export interface ChargerData {
  id: string;
  name: string;
  vendor: string;
  model: string;
  max_kw: number;
  status: ChargerStatus;
  position_x: number;
  position_y: number;
  current_kw: number;
  vehicle_id: string | null;
  vehicle_name: string | null;
  soc_pct: number | null;
  departure_time: string | null;
}

interface SiteSceneProps {
  chargers: ChargerData[];
  demandKw: number;
  demandLimitKw: number;
  onChargerClick?: (charger: ChargerData | null) => void;
  selectedCharger: ChargerData | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ChargerStatus, string> = {
  charging: "#10b981",
  throttled: "#f59e0b",
  faulted: "#ef4444",
  available: "#334155",
};

const STATUS_EMISSIVE: Record<ChargerStatus, string> = {
  charging: "#064e3b",
  throttled: "#451a03",
  faulted: "#450a0a",
  available: "#0f172a",
};

const STATUS_LIGHT_INTENSITY: Record<ChargerStatus, number> = {
  charging: 2.5,
  throttled: 1.8,
  faulted: 2.0,
  available: 0,
};

// ── Electrical Panel ──────────────────────────────────────────────────────────

function ElectricalPanel() {
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (glowRef.current) {
      const t = state.clock.elapsedTime;
      (glowRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.3 + Math.sin(t * 1.5) * 0.15;
    }
  });

  return (
    <group position={[-6.5, 0, 0]}>
      {/* Panel body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.8, 2.5, 0.5]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.8}
          roughness={0.2}
          emissive="#0f172a"
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Glow strip */}
      <mesh ref={glowRef} position={[0, 0, 0.26]}>
        <boxGeometry args={[0.1, 2.0, 0.02]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Panel light */}
      <pointLight color="#10b981" intensity={1.5} distance={3} position={[0, 0, 0.5]} />
      {/* Label */}
      <Text
        position={[0, 1.6, 0.3]}
        fontSize={0.18}
        color="#10b981"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        500 kW
      </Text>
      <Text
        position={[0, 1.35, 0.3]}
        fontSize={0.12}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        MAX
      </Text>
      {/* Conduit pipes to charger rows */}
      <mesh position={[0.8, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.8, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ── Animated Electricity Particle ─────────────────────────────────────────────

interface EnergyParticleProps {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  speed: number;
  delay: number;
  color: string;
}

function EnergyParticle({ startX, startZ, endX, endZ, speed, delay, color }: EnergyParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const progressRef = useRef(delay);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    progressRef.current = (progressRef.current + delta * speed) % 1;
    const t = progressRef.current;

    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    const arcY = 0.3;

    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
    const z = (1 - t) * (1 - t) * startZ + 2 * (1 - t) * t * midZ + t * t * endZ;
    const y = 4 * arcY * t * (1 - t) + 0.2;

    meshRef.current.position.set(x, y, z);

    const alpha = Math.sin(t * Math.PI);
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = alpha * 0.9;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.05, 6, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.0}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// ── Energy Cable (charger → vehicle) ─────────────────────────────────────────

interface EnergyCableProps {
  chargerX: number;
  chargerZ: number;
  vehicleX: number;
  vehicleZ: number;
  status: ChargerStatus;
}

function EnergyCable({ chargerX, chargerZ, vehicleX, vehicleZ, status }: EnergyCableProps) {
  const color = STATUS_COLORS[status];

  const points = useMemo(() => [
    new THREE.Vector3(chargerX, 0.75, chargerZ),
    new THREE.Vector3((chargerX + vehicleX) / 2, 0.5, (chargerZ + vehicleZ) / 2),
    new THREE.Vector3(vehicleX, 0.35, vehicleZ),
  ], [chargerX, chargerZ, vehicleX, vehicleZ]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={status === "charging" ? 2 : 1}
      opacity={status === "charging" ? 0.8 : 0.4}
      transparent
    />
  );
}

// ── Charger Station ───────────────────────────────────────────────────────────

interface ChargerStationProps {
  charger: ChargerData;
  isSelected: boolean;
  onClick: (charger: ChargerData) => void;
}

function ChargerStation({ charger, isSelected, onClick }: ChargerStationProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const statusSphereRef = useRef<THREE.Mesh>(null!);
  const selectionRingRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const statusColor = STATUS_COLORS[charger.status];
  const emissiveColor = STATUS_EMISSIVE[charger.status];
  const lightIntensity = STATUS_LIGHT_INTENSITY[charger.status];
  const isActive = charger.status === "charging" || charger.status === "throttled";

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (lightRef.current && isActive) {
      const pulse = charger.status === "throttled"
        ? Math.abs(Math.sin(t * 2))
        : Math.sin(t * 2) * 0.3 + 0.9;
      lightRef.current.intensity = lightIntensity * pulse;
    }

    if (statusSphereRef.current) {
      const mat = statusSphereRef.current.material as THREE.MeshStandardMaterial;
      if (isActive) {
        mat.emissiveIntensity = 0.8 + Math.sin(t * 3 + charger.position_x) * 0.4;
      } else if (charger.status === "faulted") {
        mat.emissiveIntensity = 0.5 + Math.abs(Math.sin(t * 4)) * 0.5;
      }
    }

    if (selectionRingRef.current && isSelected) {
      selectionRingRef.current.rotation.y = t * 1.5;
    }

    if (groupRef.current && hovered) {
      groupRef.current.position.y = Math.sin(t * 2) * 0.02;
    } else if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.1);
    }
  });

  const x = charger.position_x;
  const z = charger.position_y; // DB position_y → 3D z-axis

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => { e.stopPropagation(); onClick(charger); }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <group ref={groupRef}>
        {/* Charger body */}
        <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
          <boxGeometry args={[0.4, 1.5, 0.2]} />
          <meshStandardMaterial
            color={hovered ? "#e2e8f0" : "#cbd5e1"}
            metalness={0.6}
            roughness={0.3}
            emissive={emissiveColor}
            emissiveIntensity={isActive ? 0.4 : 0.1}
          />
        </mesh>

        {/* Screen panel on charger face */}
        <mesh position={[0, 0.85, 0.11]}>
          <boxGeometry args={[0.28, 0.35, 0.01]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={isActive ? 1.5 : charger.status === "faulted" ? 1.2 : 0.2}
            metalness={0}
            roughness={1}
          />
        </mesh>

        {/* Charger base/pedestal */}
        <mesh receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[0.55, 0.08, 0.35]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Status sphere on top */}
        <mesh ref={statusSphereRef} position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={isActive ? 1.2 : charger.status === "faulted" ? 0.8 : 0.1}
            metalness={0}
            roughness={0.5}
          />
        </mesh>

        {/* Point light for active chargers */}
        {isActive && (
          <pointLight
            ref={lightRef}
            color={statusColor}
            intensity={lightIntensity}
            distance={3.5}
            position={[0, 1.0, 0]}
          />
        )}
        {charger.status === "faulted" && (
          <pointLight color="#ef4444" intensity={1.5} distance={2.5} position={[0, 1.0, 0]} />
        )}

        {/* Bay marking ring on ground */}
        <mesh position={[0, -0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.5, 32]} />
          <meshStandardMaterial
            color={statusColor}
            emissive={statusColor}
            emissiveIntensity={isActive ? 0.5 : 0.1}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Selection/hover ring */}
        {(hovered || isSelected) && (
          <mesh ref={selectionRingRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.6, 0.65, 32]} />
            <meshStandardMaterial
              color={isSelected ? "#ffffff" : statusColor}
              emissive={isSelected ? "#ffffff" : statusColor}
              emissiveIntensity={1.5}
              transparent
              opacity={0.8}
            />
          </mesh>
        )}

        {/* Floating charger name label */}
        <Text
          position={[0, 2.0, 0]}
          fontSize={0.14}
          color="#e2e8f0"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {charger.name}
        </Text>
        {/* Active kW label */}
        {isActive && (
          <Text
            position={[0, 1.8, 0]}
            fontSize={0.12}
            color={statusColor}
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            {charger.current_kw} kW
          </Text>
        )}
      </group>
    </group>
  );
}

// ── Vehicle Box ───────────────────────────────────────────────────────────────

interface VehicleBoxProps {
  charger: ChargerData;
  vehicleName: string;
}

function VehicleBox({ charger, vehicleName }: VehicleBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const status = charger.status;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    if (status === "charging") {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.05 + Math.sin(t * 1.5 + charger.position_x) * 0.03;
    }
  });

  const x = charger.position_x;
  const z = charger.position_y;
  // Park vehicle behind charger (offset away from electrical panel)
  const vz = z > 0 ? z + 1.4 : z - 1.4;

  const vehicleColor = status === "throttled" ? "#1e3a5f" : "#0f2744";
  const emissive = status === "charging" ? "#0a3d62" : status === "throttled" ? "#1a2e4a" : "#0a1628";

  return (
    <group position={[x, 0, vz]}>
      {/* Vehicle body (box) */}
      <mesh ref={meshRef} castShadow receiveShadow position={[0, 0.35, 0]}>
        <boxGeometry args={[0.85, 0.7, 1.6]} />
        <meshStandardMaterial
          color={vehicleColor}
          metalness={0.5}
          roughness={0.5}
          emissive={emissive}
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Cab/roof */}
      <mesh castShadow position={[0, 0.8, -0.2]}>
        <boxGeometry args={[0.75, 0.35, 0.9]} />
        <meshStandardMaterial color="#0c1f3a" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Wheels (4 corners) */}
      {([ [-0.45, -0.65], [0.45, -0.65], [-0.45, 0.55], [0.45, 0.55] ] as [number, number][]).map(([wx, wz], i) => (
        <mesh key={i} position={[wx, 0.12, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}

      {/* Front charge port indicator lights */}
      {(status === "charging" || status === "throttled") && (
        <>
          <mesh position={[0.3, 0.5, -0.81]}>
            <boxGeometry args={[0.12, 0.08, 0.02]} />
            <meshStandardMaterial
              color={status === "throttled" ? "#f59e0b" : "#10b981"}
              emissive={status === "throttled" ? "#f59e0b" : "#10b981"}
              emissiveIntensity={1.5}
            />
          </mesh>
          <mesh position={[-0.3, 0.5, -0.81]}>
            <boxGeometry args={[0.12, 0.08, 0.02]} />
            <meshStandardMaterial
              color={status === "throttled" ? "#f59e0b" : "#10b981"}
              emissive={status === "throttled" ? "#f59e0b" : "#10b981"}
              emissiveIntensity={1.5}
            />
          </mesh>
        </>
      )}

      {/* Vehicle name label */}
      <Text
        position={[0, 1.3, 0]}
        fontSize={0.1}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {vehicleName}
      </Text>

      {/* Cable to charger */}
      <EnergyCable
        chargerX={x}
        chargerZ={z}
        vehicleX={x}
        vehicleZ={vz}
        status={status}
      />
    </group>
  );
}

// ── Ground / Grid ─────────────────────────────────────────────────────────────

function GroundGrid() {
  const groundRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!groundRef.current) return;
    (groundRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.03 + Math.sin(state.clock.elapsedTime * 0.3) * 0.01;
  });

  return (
    <group>
      {/* Main ground plane */}
      <mesh ref={groundRef} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.1}
          roughness={0.8}
          emissive="#0f172a"
          emissiveIntensity={0.03}
        />
      </mesh>

      {/* Vertical grid lines */}
      {Array.from({ length: 12 }, (_, i) => i - 5.5).map((xPos) => (
        <mesh key={`gv-${xPos}`} rotation={[-Math.PI / 2, 0, 0]} position={[xPos, -0.04, 0]}>
          <planeGeometry args={[0.012, 16]} />
          <meshStandardMaterial
            color="#1e3a5f"
            emissive="#1e3a5f"
            emissiveIntensity={0.4}
            transparent
            opacity={0.25}
          />
        </mesh>
      ))}

      {/* Horizontal grid lines */}
      {Array.from({ length: 9 }, (_, i) => i - 4).map((zPos) => (
        <mesh key={`gh-${zPos}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, zPos]}>
          <planeGeometry args={[22, 0.012]} />
          <meshStandardMaterial
            color="#1e3a5f"
            emissive="#1e3a5f"
            emissiveIntensity={0.4}
            transparent
            opacity={0.25}
          />
        </mesh>
      ))}

      {/* Bay lane markings (vertical stripes between bays) */}
      {[-3.5, -1.2, 1.2, 3.5].map((xPos) => (
        <mesh key={`lane-${xPos}`} rotation={[-Math.PI / 2, 0, 0]} position={[xPos, -0.038, 0]}>
          <planeGeometry args={[0.06, 8]} />
          <meshStandardMaterial
            color="#334155"
            emissive="#334155"
            emissiveIntensity={0.3}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Particle System (electricity flow from panel to chargers) ─────────────────

interface ParticleSystemProps {
  chargers: ChargerData[];
}

function ParticleSystem({ chargers }: ParticleSystemProps) {
  const activeChargers = chargers.filter(
    (c) => c.status === "charging" || c.status === "throttled"
  );

  // Stable particle config (only recompute when statuses change)
  const statusKey = chargers.map((c) => c.status).join(",");
  const particles = useMemo(() => {
    const result: EnergyParticleProps[] = [];
    activeChargers.forEach((charger, ci) => {
      const color = charger.status === "throttled" ? "#f59e0b" : "#10b981";
      const rowZ = charger.position_y > 0 ? 0.5 : -0.5;
      for (let i = 0; i < 3; i++) {
        result.push({
          startX: -6.0,
          startZ: rowZ,
          endX: charger.position_x,
          endZ: charger.position_y,
          speed: 0.3 + (ci * 0.07 + i * 0.05) % 0.25,
          delay: (ci * 0.33 + i * 0.11) % 1,
          color,
        });
      }
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusKey]);

  return (
    <>
      {particles.map((p, i) => (
        <EnergyParticle key={i} {...p} />
      ))}
    </>
  );
}

// ── 3D Demand Gauge ───────────────────────────────────────────────────────────

interface DemandGauge3DProps {
  demandKw: number;
  demandLimitKw: number;
}

function DemandGauge3D({ demandKw, demandLimitKw }: DemandGauge3DProps) {
  const fillRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const ratio = Math.min(demandKw / demandLimitKw, 1);
  const isNearLimit = ratio > 0.85;
  const gaugeHeight = 2.5;
  const targetScale = Math.max(0.02, ratio);

  useFrame((state) => {
    if (!fillRef.current) return;
    const t = state.clock.elapsedTime;

    // Smooth scale animation
    fillRef.current.scale.y = THREE.MathUtils.lerp(
      fillRef.current.scale.y,
      targetScale,
      0.04
    );
    fillRef.current.position.y = (fillRef.current.scale.y * gaugeHeight) / 2;

    if (isNearLimit) {
      (fillRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.6 + Math.sin(t * 4) * 0.4;
    }
    if (lightRef.current && isNearLimit) {
      lightRef.current.intensity = 1.0 + Math.sin(t * 4) * 0.5;
    }
  });

  const fillColor = ratio > 0.9 ? "#ef4444" : ratio > 0.7 ? "#f59e0b" : "#10b981";

  return (
    <group position={[6.5, 0, 0]}>
      {/* Background tube */}
      <mesh position={[0, gaugeHeight / 2, 0]}>
        <boxGeometry args={[0.4, gaugeHeight, 0.3]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.5}
          roughness={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Wire border frame */}
      <mesh position={[0, gaugeHeight / 2, 0]}>
        <boxGeometry args={[0.44, gaugeHeight + 0.04, 0.34]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} wireframe />
      </mesh>
      {/* Fill bar */}
      <mesh ref={fillRef} position={[0, targetScale * gaugeHeight / 2, 0]} scale={[1, targetScale, 1]}>
        <boxGeometry args={[0.36, gaugeHeight, 0.26]} />
        <meshStandardMaterial
          color={fillColor}
          emissive={fillColor}
          emissiveIntensity={isNearLimit ? 0.8 : 0.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Glow point light */}
      <pointLight
        ref={lightRef}
        color={fillColor}
        intensity={isNearLimit ? 1.5 : 0.8}
        distance={3}
        position={[0, ratio * gaugeHeight, 0]}
      />
      {/* 85% danger threshold line */}
      <mesh position={[0, gaugeHeight * 0.85, 0.16]}>
        <boxGeometry args={[0.5, 0.025, 0.025]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
      </mesh>
      {/* kW label */}
      <Text
        position={[0, gaugeHeight + 0.45, 0]}
        fontSize={0.16}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`${demandKw} kW`}
      </Text>
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.11}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        DEMAND
      </Text>
    </group>
  );
}

// ── Atmospheric Particles ─────────────────────────────────────────────────────

function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 100;

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = Math.random() * 4.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      vel[i] = 0.2 + Math.random() * 0.4;
    }
    return [pos, vel];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const attr = (pointsRef.current.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Gentle drift upward + reset
      let y = attr.getY(i) + velocities[i] * 0.008;
      if (y > 5) {
        y = 0;
        attr.setX(i, (Math.random() - 0.5) * 18);
        attr.setZ(i, (Math.random() - 0.5) * 12);
      }
      attr.setY(i, y + Math.sin(t * velocities[i] + i) * 0.01);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#10b981"
        size={0.045}
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

// ── Main Scene (inside Canvas) ────────────────────────────────────────────────

function Scene({ chargers, demandKw, demandLimitKw, onChargerClick, selectedCharger }: SiteSceneProps) {
  const { gl } = useThree();

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  const activeChargers = chargers.filter(
    (c) => (c.status === "charging" || c.status === "throttled") && c.vehicle_id
  );

  const handleBgClick = useCallback(() => {
    if (onChargerClick) onChargerClick(null);
  }, [onChargerClick]);

  return (
    <>
      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} color="#c7d2fe" />
      <hemisphereLight args={["#1e3a5f", "#030712", 0.5]} />
      <directionalLight
        position={[5, 12, 8]}
        intensity={1.0}
        color="#e2e8f0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-3, 4, -5]} intensity={0.2} color="#10b981" />

      {/* Invisible click-to-deselect plane */}
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={handleBgClick}
        visible={false}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial />
      </mesh>

      {/* Scene elements */}
      <GroundGrid />
      <ElectricalPanel />
      <DemandGauge3D demandKw={demandKw} demandLimitKw={demandLimitKw} />

      {/* Chargers */}
      {chargers.map((charger) => (
        <ChargerStation
          key={charger.id}
          charger={charger}
          isSelected={selectedCharger?.id === charger.id}
          onClick={onChargerClick ?? (() => {})}
        />
      ))}

      {/* Vehicles */}
      {activeChargers.map((charger) => (
        <VehicleBox
          key={`veh-${charger.id}`}
          charger={charger}
          vehicleName={charger.vehicle_name ?? "Vehicle"}
        />
      ))}

      {/* Energy flow particles */}
      <ParticleSystem chargers={chargers} />

      {/* Atmospheric particles */}
      <AmbientParticles />

      {/* Site floor text */}
      <Text
        position={[0, 0.01, -5.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.5}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        OAKLAND DC · BAY AREA
      </Text>
    </>
  );
}

// ── Exported component (Canvas wrapper) ───────────────────────────────────────

export default function SiteScene({
  chargers,
  demandKw,
  demandLimitKw,
  onChargerClick,
  selectedCharger,
}: SiteSceneProps) {
  return (
    <Canvas
      camera={{
        position: [0, 12, 10],
        fov: 50,
        near: 0.1,
        far: 100,
      }}
      shadows
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      style={{ background: "#030712" }}
    >
      <Scene
        chargers={chargers}
        demandKw={demandKw}
        demandLimitKw={demandLimitKw}
        onChargerClick={onChargerClick}
        selectedCharger={selectedCharger}
      />
    </Canvas>
  );
}
