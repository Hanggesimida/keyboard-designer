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
import { CanvasTexture, TextureLoader, type Texture } from "three"
import type { PreviewImageDecal } from "@/modules/design/lib/preview3d/imageDecal"
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
  decal: PreviewImageDecal | null
  legendAtlas: LegendAtlasSpec
  children: ReactNode
}

/**
 * 场景级贴花 + 刻字图集：共享 Texture + 变换矩阵 uniforms。
 * 图片：URL 变化时换贴图；矩阵跟手只写 uniform。
 * 刻字：revision 变化时重烘焙 CanvasTexture。
 */
export function KeycapDecalProvider({
  decal,
  legendAtlas,
  children,
}: KeycapDecalProviderProps) {
  const shared = useMemo(() => createSharedDyeSubUniforms(), [])
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const legendAtlasRef = useRef(legendAtlas)
  legendAtlasRef.current = legendAtlas

  // 纹理加载 / 释放
  useEffect(() => {
    const url = decal?.textureUrl
    if (!url) {
      const prev = shared.uMap.value
      shared.uMap.value = null
      shared.uHasMap.value = 0
      prev?.dispose()
      invalidate()
      return
    }

    let cancelled = false
    let loaded: Texture | null = null
    const loader = new TextureLoader()
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        configureDyeSubTexture(tex)
        const prev = shared.uMap.value
        shared.uMap.value = tex
        shared.uHasMap.value = 1
        loaded = tex
        prev?.dispose()
        invalidate()
      },
      undefined,
      () => {
        if (cancelled) return
        const prev = shared.uMap.value
        shared.uMap.value = null
        shared.uHasMap.value = 0
        prev?.dispose()
        invalidate()
      },
    )

    return () => {
      cancelled = true
      // 仅在本 effect 创建的纹理于卸载时释放；被后一次 effect 接管的不在此 dispose
      if (loaded && shared.uMap.value === loaded) {
        shared.uMap.value = null
        shared.uHasMap.value = 0
        loaded.dispose()
      }
    }
  }, [decal?.textureUrl, invalidate, shared])

  // 矩阵 / 透明度（跟手拖拽）
  useEffect(() => {
    if (!decal) {
      shared.uHasMap.value = shared.uMap.value ? 1 : 0
      shared.uMapOpacity.value = 0
      invalidate()
      return
    }
    writeMatrix3Elements(shared.uImageMatrix.value, decal.matrixElements)
    shared.uMapOpacity.value = decal.opacity
    shared.uHasMap.value = shared.uMap.value ? 1 : 0
    invalidate()
  }, [decal, invalidate, shared])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- legendAtlas 内容由 revision 标识
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
