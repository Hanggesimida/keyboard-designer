"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import { useThree } from "@react-three/fiber"
import { TextureLoader, type Texture } from "three"
import type { PreviewImageDecal } from "@/modules/design/lib/preview3d/imageDecal"
import {
  configureDyeSubTexture,
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
  children: ReactNode
}

/**
 * 场景级贴花：共享 Texture + 变换矩阵 uniforms。
 * 变换更新只写 matrix，不重建纹理；URL 变化时替换并 dispose 旧贴图。
 */
export function KeycapDecalProvider({
  decal,
  children,
}: KeycapDecalProviderProps) {
  const shared = useMemo(() => createSharedDyeSubUniforms(), [])
  const invalidate = useThree((s) => s.invalidate)

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
    return () => {
      shared.uMap.value?.dispose()
      shared.uMap.value = null
      shared.uHasMap.value = 0
    }
  }, [shared])

  return (
    <KeycapDecalContext.Provider value={shared}>
      {children}
    </KeycapDecalContext.Provider>
  )
}
