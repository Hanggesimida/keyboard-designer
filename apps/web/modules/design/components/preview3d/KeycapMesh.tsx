"use client"

import { useEffect, useMemo, useRef } from "react"
import { useGLTF } from "@react-three/drei"
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { MathUtils, type Mesh } from "three"
import { KEYCAP_PRESS_TRAVEL_U } from "@/modules/design/lib/preview3d/constants"
import {
  KEYCAP_MATERIAL_NAME,
  KEYCAP_MODEL_PATHS,
  MODEL_SCALE,
} from "@/modules/design/lib/preview3d/modelContract"
import {
  createKeycapDyeSubMaterial,
  syncDyeSubAppearance,
} from "@/modules/design/lib/preview3d/keycapDyeSubMaterial"
import type { PreviewKey } from "@/modules/design/lib/preview3d/types"
import { useSharedDyeSubUniforms } from "./KeycapDecalProvider"

/** 超过此像素位移视为拖拽（旋转相机），不触发选中 */
const CLICK_DELTA_PX = 5

interface KeycapMeshProps {
  previewKey: PreviewKey
  modelPath: string
  /** shiftKey 为 true 表示 Shift+点击（追加/切换选中） */
  onSelect?: (shiftKey: boolean) => void
}

/** 鸭子类型：避免直接依赖 three 类型包 */
type MeshLike = {
  isMesh?: boolean
  name?: string
  material?: { name?: string } | Array<{ name?: string }>
  geometry?: {
    getAttribute: (name: string) => unknown
  }
}

type SceneLike = {
  traverse: (cb: (obj: MeshLike) => void) => void
}

/**
 * 开发环境校验：恰好 1 个 Mesh，且带 POSITION。
 * 不符合时 console.warn，不抛错。
 */
function validateKeycapModelMesh(scene: SceneLike, path: string): void {
  if (process.env.NODE_ENV !== "development") return

  const meshes: MeshLike[] = []
  scene.traverse((obj) => {
    if (obj.isMesh) meshes.push(obj)
  })

  if (meshes.length !== 1) {
    console.warn(
      `[Preview3D] 模型契约异常 (${path}): 期望 1 个 mesh，实际 ${meshes.length}`,
    )
    return
  }

  const mesh = meshes[0]!
  const pos = mesh.geometry?.getAttribute("position")
  if (!pos) {
    console.warn(
      `[Preview3D] 模型契约异常 (${path}): mesh 缺少有效 POSITION`,
    )
  }

  const mat = mesh.material
  const matName = Array.isArray(mat) ? mat[0]?.name : mat?.name
  if (matName && matName !== KEYCAP_MATERIAL_NAME) {
    console.warn(
      `[Preview3D] 模型契约异常 (${path}): 期望材质名 "${KEYCAP_MATERIAL_NAME}"，实际 "${matName}"`,
    )
  }
}

function findKeycapGeometry(scene: SceneLike) {
  let geometry: MeshLike["geometry"] | null = null
  scene.traverse((obj) => {
    if (geometry) return
    if (obj.isMesh && obj.geometry) geometry = obj.geometry
  })
  return geometry
}

/**
 * 真实 GLB 键帽：共享 drei 缓存的 geometry，声明式材质由 R3F 管理生命周期。
 * 不克隆 / dispose GLTF 共享 geometry。
 * 贴花通过场景级 SharedDyeSubUniforms 世界空间采样。
 */
export function KeycapMesh({ previewKey, modelPath, onSelect }: KeycapMeshProps) {
  const { scene } = useGLTF(modelPath)
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const validatedRef = useRef<string | null>(null)
  const meshRef = useRef<Mesh>(null)
  const shared = useSharedDyeSubUniforms()
  const [x, y, z] = previewKey.position
  const targetY = previewKey.pressed ? y - KEYCAP_PRESS_TRAVEL_U : y

  const geometry = findKeycapGeometry(scene as SceneLike)

  const material = useMemo(
    () =>
      createKeycapDyeSubMaterial({
        shared,
        color: previewKey.color,
        selected: previewKey.selected,
      }),
    // shared 稳定；首帧用当前色/选中态，后续用 effect 同步
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 材质实例按键生命周期创建一次
    [shared],
  )

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  useEffect(() => {
    if (validatedRef.current === modelPath) return
    validatedRef.current = modelPath
    validateKeycapModelMesh(scene as SceneLike, modelPath)
  }, [modelPath, scene])

  useEffect(() => {
    syncDyeSubAppearance(material, {
      color: previewKey.color,
      selected: previewKey.selected,
    })
    invalidate()
  }, [geometry, invalidate, material, previewKey.color, previewKey.selected])

  useEffect(() => {
    invalidate()
  }, [invalidate, targetY])

  useFrame((_state, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const damping = previewKey.pressed ? 34 : 22
    const nextY = MathUtils.damp(mesh.position.y, targetY, damping, delta)
    if (Math.abs(nextY - targetY) < 0.0005) {
      mesh.position.y = targetY
      return
    }
    mesh.position.y = nextY
    invalidate()
  })

  if (!geometry) return null

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > CLICK_DELTA_PX) return
    onSelect?.(e.shiftKey)
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry as never}
      material={material as never}
      position={[x, y, z]}
      scale={MODEL_SCALE}
      castShadow
      receiveShadow
      onClick={onSelect ? handleClick : undefined}
      onPointerOver={
        onSelect
          ? (e) => {
              e.stopPropagation()
              gl.domElement.style.cursor = "pointer"
            }
          : undefined
      }
      onPointerOut={
        onSelect
          ? () => {
              gl.domElement.style.cursor = "auto"
            }
          : undefined
      }
    />
  )
}

for (const path of KEYCAP_MODEL_PATHS) {
  useGLTF.preload(path)
}
