"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UsePanInteractionParams {
  onPanBy: (dx: number, dy: number) => void
  /** 禁用所有平移交互，模态框打开时传 true */
  disabled?: boolean
}

export function usePanInteraction({ onPanBy, disabled = false }: UsePanInteractionParams) {
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const isSpacePressedRef = useRef(false)
  const panFromSpaceLeftRef = useRef(false)

  if (disabled) {
    if (isSpacePressed) setIsSpacePressed(false)
    if (isPanning) setIsPanning(false)
  }

  useEffect(() => {
    if (disabled) {
      isSpacePressedRef.current = false
      dragging.current = false
      panFromSpaceLeftRef.current = false
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isSpacePressedRef.current) return
      const tag = document.activeElement?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      e.preventDefault()
      isSpacePressedRef.current = true
      setIsSpacePressed(true)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return
      isSpacePressedRef.current = false
      setIsSpacePressed(false)
      if (panFromSpaceLeftRef.current && dragging.current) {
        dragging.current = false
        panFromSpaceLeftRef.current = false
        setIsPanning(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
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
  }, [disabled])

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      onPanBy(dx, dy)
    },
    [onPanBy],
  )

  const endPan = useCallback(() => {
    dragging.current = false
    panFromSpaceLeftRef.current = false
    setIsPanning(false)
  }, [])

  return {
    isSpacePressed,
    isPanning,
    onMouseDown,
    onMouseMove,
    onMouseUp: endPan,
    onMouseLeave: endPan,
  }
}
