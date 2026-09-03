"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { useThree } from "@react-three/fiber"
import { CanvasTexture, type Texture } from "three"
import type { ImageProjectionAtlasSpec } from "@/modules/design/lib/design/imageProjection"
import { bakeImageProjectionAtlas } from "@/modules/design/lib/preview3d/bakeImageProjectionAtlas"
import type { LegendAtlasSpec } from "@/modules/design/lib/preview3d/types"
import { bakeLegendAtlas } from "@/modules/design/lib/preview3d/legendAtlas"
import {
  configureDyeSubTexture,
  configureLegendTexture,
  createSharedDyeSubUniforms,
  writeMatrix3Elements,
  type SharedDyeSubUniforms,
} from "@/modules/design/lib/preview3d/keycapDyeSubMaterial"

const KeycapDecalContext = createContext<SharedDyeSubUniforms | null>(null)

export function useSharedDyeSubUniforms(): SharedDyeSubUniforms {
  const ctx = useContext(KeycapDecalContext)
  if (!ctx) {
    throw new Error("useSharedDyeSubUniforms 必须在 KeycapDecalProvider 内使用")
  }
  return ctx
}

interface KeycapDecalProviderProps {
  imageAtlas: ImageProjectionAtlasSpec
  legendAtlas: LegendAtlasSpec
  children: ReactNode
}

/**
 * 场景级图片投影 + 刻字图集：共享 Texture + 变换矩阵 uniforms。
 * 图片：按 2D 规则烘焙为单张透明 CanvasTexture。
 * 刻字：revision 变化时重烘焙 CanvasTexture。
 */
export function KeycapDecalProvider({
  imageAtlas,
  legendAtlas,
  children,
}: KeycapDecalProviderProps) {
  const shared = useMemo(() => createSharedDyeSubUniforms(), [])
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const imageAtlasRef = useRef(imageAtlas)
  const legendAtlasRef = useRef(legendAtlas)

  useEffect(() => {
    imageAtlasRef.current = imageAtlas
  }, [imageAtlas])

  useEffect(() => {
    legendAtlasRef.current = legendAtlas
  }, [legendAtlas])

  useEffect(() => {
    let cancelled = false
    let created: Texture | null = null
    const canvas = document.createElement("canvas")
    const spec = imageAtlasRef.current

    writeMatrix3Elements(shared.uImageMatrix.value, spec.matrixElements)

    const applyTexture = (texture: Texture | null) => {
      if (cancelled) {
        texture?.dispose()
        return
      }
      const previous = shared.uMap.value
      shared.uMap.value = texture
      shared.uHasMap.value = texture ? 1 : 0
      previous?.dispose()
      invalidate()
    }

    if (spec.items.length === 0) {
      applyTexture(null)
      return
    }

    void bakeImageProjectionAtlas(canvas, spec)
      .then(() => {
        if (cancelled) return
        const texture = new CanvasTexture(canvas)
        configureDyeSubTexture(texture)
        texture.anisotropy = Math.max(
          1,
          Math.min(gl.capabilities.getMaxAnisotropy(), 16),
        )
        texture.needsUpdate = true
        created = texture
        applyTexture(texture)
      })
      .catch(() => applyTexture(null))

    return () => {
      cancelled = true
      if (created && shared.uMap.value === created) {
        shared.uMap.value = null
        shared.uHasMap.value = 0
        created.dispose()
      }
    }
    // spec 内容由 revision 完整标识
  }, [gl, imageAtlas.revision, invalidate, shared])

  useEffect(() => {
    let cancelled = false
    const canvas = document.createElement("canvas")
    const spec = legendAtlasRef.current

    writeMatrix3Elements(shared.uLegendMatrix.value, spec.matrixElements)

    const applyTexture = (tex: Texture | null, hasLegend: boolean) => {
      if (cancelled) {
        tex?.dispose()
        return
      }
      const prev = shared.uLegendMap.value
      shared.uLegendMap.value = tex
      shared.uHasLegend.value = hasLegend ? 1 : 0
      prev?.dispose()
      invalidate()
    }

    if (spec.items.length === 0) {
      applyTexture(null, false)
      return
    }

    void bakeLegendAtlas(canvas, spec).then(() => {
      if (cancelled) return
      const tex = new CanvasTexture(canvas)
      configureLegendTexture(tex, gl.capabilities.getMaxAnisotropy())
      tex.needsUpdate = true
      applyTexture(tex, true)
    })

    return () => {
      cancelled = true
    }
    // 仅 revision 变化时重烘焙；选择态等不会改 revision
  }, [gl, invalidate, legendAtlas.revision, shared])

  useEffect(() => {
    return () => {
      shared.uMap.value?.dispose()
      shared.uMap.value = null
      shared.uHasMap.value = 0
      shared.uLegendMap.value?.dispose()
      shared.uLegendMap.value = null
      shared.uHasLegend.value = 0
    }
  }, [shared])

  return (
    <KeycapDecalContext.Provider value={shared}>
      {children}
    </KeycapDecalContext.Provider>
  )
}
