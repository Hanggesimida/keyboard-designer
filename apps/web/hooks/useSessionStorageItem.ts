import { useSyncExternalStore } from "react"

function subscribe() {
  return () => {}
}

/** 读取 sessionStorage；服务端快照为空，水合后切到客户端值。 */
export function useSessionStorageItem(key: string): string {
  return useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem(key) ?? "",
    () => "",
  )
}
