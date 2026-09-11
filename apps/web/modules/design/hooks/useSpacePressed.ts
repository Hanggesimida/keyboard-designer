"use client"

import { useEffect, useState } from "react"
import { useLatestRef } from "@/hooks/useLatestRef"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return target.isContentEditable
}

/** 空格按下（用于平移修饰）。输入框内忽略，避免拦截打字。 */
export function useSpacePressed(disabled = false): boolean {
  const [held, setHeld] = useState(false)
  const disabledRef = useLatestRef(disabled)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabledRef.current) return
      if (e.code !== "Space") return
      if (isEditableTarget(document.activeElement)) return
      e.preventDefault()
      if (e.repeat) return
      setHeld(true)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      setHeld(false)
    }

    const clear = () => setHeld(false)

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", clear)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", clear)
    }
  }, [disabledRef])

  return disabled ? false : held
}
