"use client"

import {
  useCallback,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react"

export type ResizeEdge = "start" | "end"

interface UseResizableWidthOptions {
  defaultWidth: number
  min: number
  max: number
  storageKey: string
  /** `end`：拖向右侧变宽（左栏）；`start`：拖向左侧变宽（右栏） */
  edge: ResizeEdge
}

function clampWidth(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function readStoredWidth(
  storageKey: string,
  fallback: number,
  min: number,
  max: number,
): number {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (raw == null) return fallback
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return fallback
    return clampWidth(parsed, min, max)
  } catch {
    return fallback
  }
}

function persistWidth(storageKey: string, width: number) {
  try {
    window.localStorage.setItem(storageKey, String(width))
  } catch {
    // 忽略配额/隐私模式写入失败
  }
}

function subscribeToStorage(storageKey: string, onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onStoreChange()
  }
  window.addEventListener("storage", onStorage)
  return () => window.removeEventListener("storage", onStorage)
}

/** 侧栏宽度拖拽：pointer capture + clamp + localStorage。SSR 用默认值，客户端用 useSyncExternalStore 读存储。 */
export function useResizableWidth({
  defaultWidth,
  min,
  max,
  storageKey,
  edge,
}: UseResizableWidthOptions) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToStorage(storageKey, onStoreChange),
    [storageKey],
  )
  const getSnapshot = useCallback(
    () => readStoredWidth(storageKey, defaultWidth, min, max),
    [storageKey, defaultWidth, min, max],
  )
  const getServerSnapshot = useCallback(() => defaultWidth, [defaultWidth])

  const storedWidth = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const width = liveWidth ?? storedWidth
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)

  const commit = useCallback(
    (next: number) => {
      const clamped = clampWidth(next, min, max)
      persistWidth(storageKey, clamped)
      setLiveWidth(clamped)
    },
    [min, max, storageKey],
  )

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = { startX: e.clientX, startW: width }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [width],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const drag = dragRef.current
      if (!drag) return
      const delta = e.clientX - drag.startX
      commit(edge === "end" ? drag.startW + delta : drag.startW - delta)
    },
    [edge, commit],
  )

  const onPointerUp = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  const onDoubleClick = useCallback(() => {
    dragRef.current = null
    commit(defaultWidth)
  }, [commit, defaultWidth])

  return { width, onPointerDown, onPointerMove, onPointerUp, onDoubleClick }
}
