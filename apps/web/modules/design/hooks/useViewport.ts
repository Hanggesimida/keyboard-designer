"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface Viewport {
  x: number
  y: number
  zoom: number
}

interface UseViewportParams {
  containerRef: React.RefObject<HTMLDivElement | null>
  artW: number
  artH: number
  minZoom?: number
  maxZoom?: number
}

function calcFitViewport(containerW: number, containerH: number, artW: number, artH: number): Viewport {
  const zoom = Math.min(containerW / artW, containerH / artH) * 0.88
  const x = (containerW - artW * zoom) / 2
  const y = (containerH - artH * zoom) / 2
  return { x, y, zoom }
}

export function useViewport({
  containerRef,
  artW,
  artH,
  minZoom = 0.05,
  maxZoom = 8,
}: UseViewportParams) {
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const fittedRef = useRef(false)

  const fitToScreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setViewport(calcFitViewport(el.clientWidth, el.clientHeight, artW, artH))
  }, [artH, artW, containerRef])

  const zoomAt = useCallback(
    (anchorX: number, anchorY: number, zoomFactor: number) => {
      setViewport((prev) => {
        const newZoom = Math.min(maxZoom, Math.max(minZoom, prev.zoom * zoomFactor))
        const ratio = newZoom / prev.zoom
        return {
          zoom: newZoom,
          x: anchorX - (anchorX - prev.x) * ratio,
          y: anchorY - (anchorY - prev.y) * ratio,
        }
      })
    },
    [maxZoom, minZoom],
  )

  const setZoom = useCallback(
    (nextZoom: number, anchorX: number, anchorY: number) => {
      setViewport((prev) => {
        const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom))
        const ratio = clamped / prev.zoom
        return {
          zoom: clamped,
          x: anchorX - (anchorX - prev.x) * ratio,
          y: anchorY - (anchorY - prev.y) * ratio,
        }
      })
    },
    [maxZoom, minZoom],
  )

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      if (fittedRef.current) return
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return
      setViewport(calcFitViewport(width, height, artW, artH))
      fittedRef.current = true
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [artH, artW, containerRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const zoomFactor =
        e.deltaMode === 1 ? (e.deltaY > 0 ? 1 / 1.12 : 1.12) : Math.pow(0.999, e.deltaY)

      zoomAt(mouseX, mouseY, zoomFactor)
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [containerRef, zoomAt])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault()
        fitToScreen()
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault()
        const el = containerRef.current
        if (!el) return
        const cx = el.clientWidth / 2
        const cy = el.clientHeight / 2
        setZoom(1, cx, cy)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [containerRef, fitToScreen, setZoom])

  return {
    viewport,
    fitToScreen,
    zoomAt,
    panBy,
    setZoom,
  }
}
