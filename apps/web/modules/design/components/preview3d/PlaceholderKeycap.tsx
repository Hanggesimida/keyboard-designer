"use client"

import { useEffect } from "react"
import { useThree, type ThreeEvent } from "@react-three/fiber"
import { PLACEHOLDER_COLOR, PLACEHOLDER_KEY_HEIGHT } from "@/modules/design/lib/preview3d/constants"
import type { PreviewKey } from "@/modules/design/lib/preview3d/types"

/** 与 KeycapMesh 一致：超过此位移视为拖拽，不触发选中 */
const CLICK_DELTA_PX = 5

interface PlaceholderKeycapProps {
  previewKey: PreviewKey
  /** shiftKey 为 true 表示 Shift+点击（追加/切换选中） */
  onSelect?: (shiftKey: boolean) => void
}

/**
 * 缺模占位键帽：消费 PreviewKey。
 * 线框半透明，避免与真模混淆。
 * 原点为底面中心（与 GLB 一致），box 几何中心上移半高。
 * 选中用 emissive，不替换设计色（与 KeycapMesh 一致）。
 */
export function PlaceholderKeycap({ previewKey, onSelect }: PlaceholderKeycapProps) {
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const [sx, sz] = previewKey.sizeU
  const color = previewKey.color || PLACEHOLDER_COLOR
  const selected = previewKey.selected

  useEffect(() => {
    invalidate()
  }, [invalidate, color, selected, sx, sz])

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > CLICK_DELTA_PX) return
    onSelect?.(e.shiftKey)
  }

  return (
    <group position={previewKey.position}>
      <mesh
        position={[0, PLACEHOLDER_KEY_HEIGHT / 2, 0]}
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
      >
        <boxGeometry args={[sx, PLACEHOLDER_KEY_HEIGHT, sz]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0}
          transparent
          opacity={0.55}
          wireframe
          emissive={selected ? "#5b8def" : "#664400"}
          emissiveIntensity={selected ? 0.35 : 0.15}
        />
      </mesh>
    </group>
  )
}
