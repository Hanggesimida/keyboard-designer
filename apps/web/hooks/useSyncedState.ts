import { useState } from "react"

/**
 * 外部 value 变化时同步本地可编辑 state，替代 effect 里的 setState。
 */
export function useSyncedState<T>(value: T) {
  const [state, setState] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) {
    setPrev(value)
    setState(value)
  }
  return [state, setState] as const
}
