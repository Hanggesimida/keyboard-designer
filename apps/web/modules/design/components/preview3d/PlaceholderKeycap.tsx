"use client"

import { useEffect } from "react"
import { useThree } from "@react-three/fiber"
import { PLACEHOLDER_COLOR, PLACEHOLDER_KEY_HEIGHT } from "@/modules/design/lib/preview3d/constants"
import type { PreviewKey } from "@/modules/design/lib/preview3d/types"

interface PlaceholderKeycapProps {
  previewKey: PreviewKey
}

/**
 * 占位键帽：消费 PreviewKey。
 * 原点为底面中心（与 GLB 一致），box 几何中心上移半高。
 * 选中用 emissive，不替换设计色（与 KeycapMesh 一致）。
 */
export function PlaceholderKeycap({ previewKey }: PlaceholderKeycapProps) {
  const invalidate = useThree((s) => s.invalidate)
  const [sx, sz] = previewKey.sizeU
  const color = previewKey.color || PLACEHOLDER_COLOR
  const selected = previewKey.selected

  useEffect(() => {
    invalidate()
  }, [invalidate, color, selected, sx, sz])

  return (
    <group position={previewKey.position}>
      <mesh position={[0, PLACEHOLDER_KEY_HEIGHT / 2, 0]}>
        <boxGeometry args={[sx, PLACEHOLDER_KEY_HEIGHT, sz]} />
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.05}
          emissive={selected ? "#5b8def" : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
        />
      </mesh>
    </group>
  )
}
