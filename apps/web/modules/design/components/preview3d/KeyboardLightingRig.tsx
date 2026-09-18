"use client"

import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  LinearFilter,
  MathUtils,
  Object3D,
  type InstancedMesh,
  type MeshBasicMaterial,
} from "three"
import {
  isAnimatedLightingMode,
  type BacklightSettings,
  type LightingChannelSettings,
  type LightingSettings,
} from "@/modules/design/lib/design/lighting"
import {
  sampleLightingEffect,
  type LightingEffectSample,
} from "@/modules/design/lib/design/lightingEffects"
import type { Vec3 } from "@/modules/design/lib/preview3d/layoutToWorld"
import type { PreviewKey } from "@/modules/design/lib/preview3d/types"

const UNDERGLOW_CORE_WIDTH_U = 1.35
const UNDERGLOW_BLOOM_WIDTH_U = 3.4
const UNDERGLOW_STRIP_OVERHANG_U = 0.85
const UNDERGLOW_OUTWARD_U = 0.22
/** 灯珠相对键帽底面中心，沿 +Z（朝使用者）偏移的比例。 */
const BACKLIGHT_SOUTH_OFFSET = 0.18
const BACKLIGHT_CORE_SCALE = 1.5
const BACKLIGHT_BLOOM_SCALE = 2.45
/** 相对键帽底面中心沿 -Y 微微下沉，避免光斑与底面重合。 */
const BACKLIGHT_Y_U = -0.03
const BACKLIGHT_ON_DAMPING = 18
const BACKLIGHT_OFF_DAMPING = 3.2
const BACKLIGHT_SETTLE = 0.004
/** 叠加发光在 intensity=1 时的颜色增益，让 100% 明显更亮。 */
const BACKLIGHT_INTENSITY_GAIN = 2.7
const UNDERGLOW_EDGE_COUNT = 4

function configureGlowTexture(texture: CanvasTexture): CanvasTexture {
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function createGlowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext("2d")
  if (!context) return configureGlowTexture(new CanvasTexture(canvas))

  const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128)
  gradient.addColorStop(0, "rgba(255,255,255,0.95)")
  gradient.addColorStop(0.22, "rgba(255,255,255,0.52)")
  gradient.addColorStop(0.55, "rgba(255,255,255,0.16)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)

  return configureGlowTexture(new CanvasTexture(canvas))
}

function createStripGlowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 64
  const context = canvas.getContext("2d")
  if (!context) return configureGlowTexture(new CanvasTexture(canvas))

  const across = context.createLinearGradient(0, 0, 0, 64)
  across.addColorStop(0, "rgba(255,255,255,0)")
  across.addColorStop(0.22, "rgba(255,255,255,0.12)")
  across.addColorStop(0.42, "rgba(255,255,255,0.42)")
  across.addColorStop(0.5, "rgba(255,255,255,0.7)")
  across.addColorStop(0.58, "rgba(255,255,255,0.42)")
  across.addColorStop(0.78, "rgba(255,255,255,0.12)")
  across.addColorStop(1, "rgba(255,255,255,0)")
  context.fillStyle = across
  context.fillRect(0, 0, 256, 64)

  context.globalCompositeOperation = "destination-in"
  const along = context.createLinearGradient(0, 0, 256, 0)
  along.addColorStop(0, "rgba(0,0,0,0)")
  along.addColorStop(0.16, "rgba(0,0,0,1)")
  along.addColorStop(0.84, "rgba(0,0,0,1)")
  along.addColorStop(1, "rgba(0,0,0,0)")
  context.fillStyle = along
  context.fillRect(0, 0, 256, 64)

  return configureGlowTexture(new CanvasTexture(canvas))
}

interface GlowStripProps {
  position: Vec3
  length: number
  width: number
  rotationY?: number
  color: string
  opacity: number
  texture: CanvasTexture
  materialRef?: (material: MeshBasicMaterial | null) => void
}

function GlowStrip({
  position,
  length,
  width,
  rotationY = 0,
  color,
  opacity,
  texture,
  materialRef,
}: GlowStripProps) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
        <planeGeometry args={[length, width]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          color={color}
          opacity={opacity}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function UnderglowHalo({
  center,
  edgeX,
  edgeZ,
  stripY,
  stripLengthX,
  stripLengthZ,
  underglow,
  texture,
}: {
  center: Vec3
  edgeX: number
  edgeZ: number
  stripY: number
  stripLengthX: number
  stripLengthZ: number
  underglow: LightingChannelSettings
  texture: CanvasTexture
}) {
  const invalidate = useThree((state) => state.invalidate)
  const bloomMaterials = useRef<(MeshBasicMaterial | null)[]>(
    Array.from({ length: UNDERGLOW_EDGE_COUNT }, () => null),
  )
  const coreMaterials = useRef<(MeshBasicMaterial | null)[]>(
    Array.from({ length: UNDERGLOW_EDGE_COUNT }, () => null),
  )
  const sample = useMemo<LightingEffectSample>(
    () => ({ r: 1, g: 1, b: 1, amount: 1 }),
    [],
  )
  const baseColor = useMemo(
    () => new Color(underglow.color),
    [underglow.color],
  )

  const edges = [
    {
      position: [
        center[0],
        stripY,
        center[2] - edgeZ - UNDERGLOW_OUTWARD_U,
      ] as Vec3,
      length: stripLengthX,
      rotationY: 0,
      u: 0.15,
      v: 0,
    },
    {
      position: [
        center[0],
        stripY,
        center[2] + edgeZ + UNDERGLOW_OUTWARD_U,
      ] as Vec3,
      length: stripLengthX,
      rotationY: 0,
      u: 0.65,
      v: 1,
    },
    {
      position: [
        center[0] - edgeX - UNDERGLOW_OUTWARD_U,
        stripY,
        center[2],
      ] as Vec3,
      length: stripLengthZ,
      rotationY: Math.PI / 2,
      u: 0,
      v: 0.5,
    },
    {
      position: [
        center[0] + edgeX + UNDERGLOW_OUTWARD_U,
        stripY,
        center[2],
      ] as Vec3,
      length: stripLengthZ,
      rotationY: Math.PI / 2,
      u: 1,
      v: 0.5,
    },
  ]

  useLayoutEffect(() => {
    invalidate()
  }, [invalidate, underglow])

  useFrame((state) => {
    const animated = isAnimatedLightingMode(underglow.mode)
    edges.forEach((edge, index) => {
      sampleLightingEffect(sample, underglow.mode, {
        timeSec: state.clock.elapsedTime,
        speed: underglow.speed,
        baseColor,
        u: edge.u,
        v: edge.v,
        direction: underglow.direction,
      })
      const bloom = bloomMaterials.current[index]
      const core = coreMaterials.current[index]
      if (bloom) {
        bloom.color.setRGB(sample.r, sample.g, sample.b)
        bloom.opacity = 0.48 * underglow.intensity * sample.amount
      }
      if (core) {
        core.color.setRGB(sample.r, sample.g, sample.b)
        core.opacity = 0.88 * underglow.intensity * sample.amount
      }
    })
    if (animated) invalidate()
  })

  return (
    <>
      {edges.map((edge, index) => (
        <group key={index}>
          <GlowStrip
            position={edge.position}
            length={edge.length}
            width={UNDERGLOW_BLOOM_WIDTH_U}
            rotationY={edge.rotationY}
            color={underglow.color}
            opacity={0.48 * underglow.intensity}
            texture={texture}
            materialRef={(material) => {
              bloomMaterials.current[index] = material
            }}
          />
          <GlowStrip
            position={edge.position}
            length={edge.length}
            width={UNDERGLOW_CORE_WIDTH_U}
            rotationY={edge.rotationY}
            color={underglow.color}
            opacity={0.88 * underglow.intensity}
            texture={texture}
            materialRef={(material) => {
              coreMaterials.current[index] = material
            }}
          />
        </group>
      ))}
    </>
  )
}

function writeKeyLightInstances(
  mesh: InstancedMesh,
  keys: readonly PreviewKey[],
  brightness: ReadonlyMap<string, number>,
  samples: ReadonlyMap<string, LightingEffectSample>,
  scale: number,
  intensity: number,
  helper: Object3D,
  colorHelper: Color,
) {
  keys.forEach((key, index) => {
    const amount = brightness.get(key.id) ?? 0
    const sample = samples.get(key.id)
    const south = key.sizeU[1] * BACKLIGHT_SOUTH_OFFSET
    const yaw = key.rotationYRad
    const glow = scale * (0.82 + 0.18 * amount)
    helper.position.set(
      key.position[0] + Math.sin(yaw) * south,
      key.position[1] + BACKLIGHT_Y_U,
      key.position[2] + Math.cos(yaw) * south,
    )
    helper.rotation.set(-Math.PI / 2, 0, 0)
    helper.scale.set(key.sizeU[0] * glow, key.sizeU[1] * glow, 1)
    helper.updateMatrix()
    mesh.setMatrixAt(index, helper.matrix)
    if (sample) {
      colorHelper.setRGB(sample.r, sample.g, sample.b)
    } else {
      colorHelper.setRGB(1, 1, 1)
    }
    colorHelper.multiplyScalar(
      amount * (0.4 + BACKLIGHT_INTENSITY_GAIN * intensity),
    )
    mesh.setColorAt(index, colorHelper)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

function KeycapBacklight({
  keys,
  backlight,
  glowTexture,
}: {
  keys: readonly PreviewKey[]
  backlight: BacklightSettings
  glowTexture: CanvasTexture
}) {
  const invalidate = useThree((state) => state.invalidate)
  const coreMeshRef = useRef<InstancedMesh>(null)
  const bloomMeshRef = useRef<InstancedMesh>(null)
  const transformHelper = useMemo(() => new Object3D(), [])
  const colorHelper = useMemo(() => new Color(), [])
  const sampleHelper = useMemo<LightingEffectSample>(
    () => ({ r: 1, g: 1, b: 1, amount: 1 }),
    [],
  )
  const baseColor = useMemo(
    () => new Color(backlight.color),
    [backlight.color],
  )
  const brightnessRef = useRef(new Map<string, number>())
  const samplesRef = useRef(new Map<string, LightingEffectSample>())
  const visibleKeys = useMemo(
    () => keys.filter((key) => key.visible),
    [keys],
  )
  const keyBounds = useMemo(() => {
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    visibleKeys.forEach((key) => {
      minX = Math.min(minX, key.position[0])
      maxX = Math.max(maxX, key.position[0])
      minZ = Math.min(minZ, key.position[2])
      maxZ = Math.max(maxZ, key.position[2])
    })
    return {
      minX,
      minZ,
      spanX: Math.max(maxX - minX, 0.0001),
      spanZ: Math.max(maxZ - minZ, 0.0001),
    }
  }, [visibleKeys])

  useLayoutEffect(() => {
    invalidate()
  }, [backlight, invalidate, visibleKeys])

  useFrame((state, delta) => {
    const coreMesh = coreMeshRef.current
    const bloomMesh = bloomMeshRef.current
    if (!coreMesh || !bloomMesh) return

    const onPress = backlight.mode === "onPress"
    const animated = isAnimatedLightingMode(backlight.mode)
    const brightness = brightnessRef.current
    const samples = samplesRef.current
    const visible = new Set(visibleKeys.map((key) => key.id))
    for (const keyId of brightness.keys()) {
      if (!visible.has(keyId)) brightness.delete(keyId)
    }
    for (const keyId of samples.keys()) {
      if (!visible.has(keyId)) samples.delete(keyId)
    }

    let needsFrame = animated
    visibleKeys.forEach((key) => {
      sampleLightingEffect(sampleHelper, backlight.mode, {
        timeSec: state.clock.elapsedTime,
        speed: backlight.speed,
        baseColor,
        u: (key.position[0] - keyBounds.minX) / keyBounds.spanX,
        v: (key.position[2] - keyBounds.minZ) / keyBounds.spanZ,
        direction: backlight.direction,
      })
      let stored = samples.get(key.id)
      if (!stored) {
        stored = { r: sampleHelper.r, g: sampleHelper.g, b: sampleHelper.b, amount: sampleHelper.amount }
        samples.set(key.id, stored)
      } else {
        stored.r = sampleHelper.r
        stored.g = sampleHelper.g
        stored.b = sampleHelper.b
        stored.amount = sampleHelper.amount
      }

      const target = onPress
        ? key.pressed
          ? 1
          : 0
        : sampleHelper.amount
      const current = brightness.get(key.id) ?? (onPress ? 0 : target)
      if (onPress) {
        const damping =
          target >= current ? BACKLIGHT_ON_DAMPING : BACKLIGHT_OFF_DAMPING
        let next = MathUtils.damp(current, target, damping, delta)
        if (Math.abs(next - target) < BACKLIGHT_SETTLE) next = target
        else needsFrame = true
        brightness.set(key.id, next)
      } else {
        brightness.set(key.id, target)
      }
    })

    writeKeyLightInstances(
      coreMesh,
      visibleKeys,
      brightness,
      samples,
      BACKLIGHT_CORE_SCALE,
      backlight.intensity,
      transformHelper,
      colorHelper,
    )
    writeKeyLightInstances(
      bloomMesh,
      visibleKeys,
      brightness,
      samples,
      BACKLIGHT_BLOOM_SCALE,
      backlight.intensity,
      transformHelper,
      colorHelper,
    )

    if (needsFrame) invalidate()
  })

  if (visibleKeys.length === 0) return null

  return (
    <>
      <instancedMesh
        ref={coreMeshRef}
        args={[undefined, undefined, visibleKeys.length]}
        frustumCulled={false}
        renderOrder={2}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          color="#ffffff"
          opacity={0.95}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={bloomMeshRef}
        args={[undefined, undefined, visibleKeys.length]}
        frustumCulled={false}
        renderOrder={1}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          color="#ffffff"
          opacity={0.72}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}

interface KeyboardLightingRigProps {
  settings: LightingSettings
  keys: readonly PreviewKey[]
  center: Vec3
  extents: {
    width: number
    depth: number
  }
  floorY: number
}

/** 底光与键帽背光；动态灯效会按需持续请求渲染帧。 */
export function KeyboardLightingRig({
  settings,
  keys,
  center,
  extents,
  floorY,
}: KeyboardLightingRigProps) {
  const invalidate = useThree((state) => state.invalidate)
  const glowTexture = useMemo(createGlowTexture, [])
  const stripGlowTexture = useMemo(createStripGlowTexture, [])
  const { underglow, backlight } = settings
  const stripY = floorY + 0.004
  const stripLengthX = extents.width + UNDERGLOW_STRIP_OVERHANG_U * 2
  const stripLengthZ = extents.depth + UNDERGLOW_STRIP_OVERHANG_U * 2
  const edgeX = extents.width / 2
  const edgeZ = extents.depth / 2

  useEffect(
    () => () => {
      glowTexture.dispose()
      stripGlowTexture.dispose()
    },
    [glowTexture, stripGlowTexture],
  )

  useEffect(() => {
    invalidate()
  }, [invalidate, settings])

  return (
    <>
      {underglow.enabled && underglow.intensity > 0 ? (
        <UnderglowHalo
          center={center}
          edgeX={edgeX}
          edgeZ={edgeZ}
          stripY={stripY}
          stripLengthX={stripLengthX}
          stripLengthZ={stripLengthZ}
          underglow={underglow}
          texture={stripGlowTexture}
        />
      ) : null}

      {backlight.enabled && backlight.intensity > 0 ? (
        <KeycapBacklight
          keys={keys}
          backlight={backlight}
          glowTexture={glowTexture}
        />
      ) : null}
    </>
  )
}
