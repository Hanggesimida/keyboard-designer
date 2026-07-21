"use client"

import { useEffect, useRef } from "react"
import { useGLTF } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import {
  KEYCAP_MODEL_PATHS,
  MODEL_SCALE,
} from "@/modules/design/lib/preview3d/modelContract"
import type { PreviewKey } from "@/modules/design/lib/preview3d/types"

interface KeycapMeshProps {
  previewKey: PreviewKey
  modelPath: string
}

/** 鸭子类型：避免直接依赖 three 类型包 */
type MeshLike = {
  isMesh?: boolean
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
 */
export function KeycapMesh({ previewKey, modelPath }: KeycapMeshProps) {
  const { scene } = useGLTF(modelPath)
  const invalidate = useThree((s) => s.invalidate)
  const validatedRef = useRef<string | null>(null)

  const geometry = findKeycapGeometry(scene as SceneLike)

  useEffect(() => {
    if (validatedRef.current === modelPath) return
    validatedRef.current = modelPath
    validateKeycapModelMesh(scene as SceneLike, modelPath)
  }, [modelPath, scene])

  useEffect(() => {
    invalidate()
  }, [geometry, invalidate, previewKey.color, previewKey.selected])

  if (!geometry) return null

  const color = previewKey.color
  const selected = previewKey.selected

  return (
    <mesh
      geometry={geometry as never}
      position={previewKey.position}
      scale={MODEL_SCALE}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.05}
        emissive={selected ? "#5b8def" : "#000000"}
        emissiveIntensity={selected ? 0.35 : 0}
      />
    </mesh>
  )
}

for (const path of KEYCAP_MODEL_PATHS) {
  useGLTF.preload(path)
}
