import { useRef, type MutableRefObject } from "react"

/**
 * 在稳定回调里读取最新值，避免把频繁变化的值放进依赖。
 * 赋值发生在 render 中，保证同一次提交后的事件处理器能读到最新值。
 */
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value)
  // eslint-disable-next-line react-hooks/refs -- 有意在 render 中同步 latest ref
  ref.current = value
  return ref
}
