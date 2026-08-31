"use client"

import { useEffect, useRef } from "react"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"

/**
 * 进入设计器时从本地空白设计开始；离开时重置 store，避免状态残留。
 */
export function useLoadDesignFromUrl() {
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    useDesignUIStore.getState().resetAll()
    useDesignUIStore.temporal.getState().clear()
  }, [])

  useEffect(() => {
    return () => {
      useDesignUIStore.getState().resetAll()
      useDesignUIStore.temporal.getState().clear()
    }
  }, [])
}
