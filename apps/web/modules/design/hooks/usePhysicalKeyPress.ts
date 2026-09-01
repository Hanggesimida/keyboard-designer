"use client"

import { useEffect } from "react"
import { getLayoutData } from "@/modules/design/data/layouts"
import { codeToKeyId } from "@/modules/design/lib/design/physicalKeyMap"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return target.isContentEditable
}

function layoutHasKey(templateId: string, keyId: string): boolean {
  const layout = getLayoutData(templateId)
  return layout.rows.some((row) => row.keys.some((k) => k.keyId === keyId))
}

/** 真实键盘按下时写入 pressedKeyIds；输入框与键帽编辑弹窗内忽略。 */
export function usePhysicalKeyPress() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (isEditableTarget(e.target)) return
      const { keycapEditTarget, templateId, pressKeycap } =
        useDesignUIStore.getState()
      if (keycapEditTarget) return
      const keyId = codeToKeyId(e.code)
      if (!keyId || !layoutHasKey(templateId, keyId)) return
      pressKeycap(keyId)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const keyId = codeToKeyId(e.code)
      if (!keyId) return
      useDesignUIStore.getState().releaseKeycap(keyId)
    }

    const clear = () => {
      useDesignUIStore.getState().clearPressedKeycaps()
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") clear()
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", clear)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", clear)
      document.removeEventListener("visibilitychange", onVisibility)
      clear()
    }
  }, [])
}
