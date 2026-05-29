// ─── 两个 ImageElement 组件共用的 SVG 图标 ───────────────────────────────────
// CanvasImageElement 使用 size = 14 / zoom（保持屏幕像素恒定）
// KeycapEditorImageElement 使用 size = CTRL_ICON（固定 12px）

interface IconProps { size: number }

export function ResetRotationIcon({ size }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6a4 4 0 1 0 .8-2.4" />
      <path d="M2 2v2.5h2.5" />
    </svg>
  )
}

export function RestoreAspectIcon({ size }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4.5V1h3.5" />
      <path d="M1 1l3 3" />
      <path d="M11 7.5V11H7.5" />
      <path d="M11 11l-3-3" />
    </svg>
  )
}

export function LockAspectIcon({ size, locked }: IconProps & { locked: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
      {locked ? (
        <>
          <rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor" stroke="none" opacity={0.25} />
          <rect x="2" y="5.5" width="8" height="5.5" rx="1" />
          <path d="M4 5.5V3.5a2 2 0 0 1 4 0v2" />
        </>
      ) : (
        <>
          <rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor" stroke="none" opacity={0.15} />
          <rect x="2" y="5.5" width="8" height="5.5" rx="1" />
          <path d="M4 5.5V3.5a2 2 0 0 1 4 0" />
        </>
      )}
    </svg>
  )
}
