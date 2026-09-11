"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLatestRef } from "@/hooks/useLatestRef"
import { useSpacePressed } from "@/modules/design/hooks/useSpacePressed"

interface UsePanInteractionParams {
  onPanBy: (dx: number, dy: number) => void
  /** 禁用所有平移交互，模态框打开时传 true */
  disabled?: boolean
}

export function usePanInteraction({ onPanBy, disabled = false }: UsePanInteractionParams) {
  const isSpacePressed = useSpacePressed(disabled)
  const isSpacePressedRef = useLatestRef(isSpacePressed)
  const [isPanning, setIsPanning] = useState(false)
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const panFromSpaceLeftRef = useRef(false)

  useEffect(() => {
    if (!disabled) return
    dragging.current = false
    panFromSpaceLeftRef.current = false
  }, [disabled])

  useEffect(() => {
    if (disabled) return

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      if (!panFromSpaceLeftRef.current || !dragging.current) return
      dragging.current = false
      panFromSpaceLeftRef.current = false
      setIsPanning(false)
    }

    window.addEventListener("keyup", handleKeyUp)
    return () => window.removeEventListener("keyup", handleKeyUp)
  }, [disabled])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    const isMiddleClick = e.button === 1
    const isLeftClickWithSpace = e.button === 0 && isSpacePressedRef.current
    if (!isMiddleClick && !isLeftClickWithSpace) return

    dragging.current = true
    panFromSpaceLeftRef.current = isLeftClickWithSpace
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setIsPanning(true)
    e.preventDefault()
  }, [disabled, isSpacePressedRef])

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || !dragging.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      onPanBy(dx, dy)
    },
    [disabled, onPanBy],
  )

  const endPan = useCallback(() => {
    dragging.current = false
    panFromSpaceLeftRef.current = false
    setIsPanning(false)
  }, [])

  return {
    isSpacePressed,
    isPanning: disabled ? false : isPanning,
    onMouseDown,
    onMouseMove,
    onMouseUp: endPan,
    onMouseLeave: endPan,
  }
}
