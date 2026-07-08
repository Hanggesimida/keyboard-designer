// ─── 两个 ImageElement 组件共用的 SVG 图标 ───────────────────────────────────
// 尺寸由调用方以屏幕像素传入；选中控件已用反 scale 脱离画布 zoom。

interface IconProps { size: number }

export function ResetRotationIcon({ size }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.2 6a3.8 3.8 0 1 0 .85-2.4" />
      <path d="M2.2 2.2v2.4H4.6" />
    </svg>
  )
}

export function RestoreAspectIcon({ size }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 4.2V1.5H4.2" />
      <path d="M1.5 1.5l3.2 3.2" />
      <path d="M10.5 7.8V10.5H7.8" />
      <path d="M10.5 10.5L7.3 7.3" />
    </svg>
  )
}

export function LockAspectIcon({ size, locked }: IconProps & { locked: boolean }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      {locked ? (
        <>
          <rect x="2.2" y="5.2" width="7.6" height="5.2" rx="1.2" fill="currentColor" stroke="none" opacity={0.2} />
          <rect x="2.2" y="5.2" width="7.6" height="5.2" rx="1.2" />
          <path d="M4.1 5.2V3.6a1.9 1.9 0 0 1 3.8 0V5.2" />
          <circle cx="6" cy="7.7" r="0.7" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <rect x="2.2" y="5.2" width="7.6" height="5.2" rx="1.2" fill="currentColor" stroke="none" opacity={0.12} />
          <rect x="2.2" y="5.2" width="7.6" height="5.2" rx="1.2" />
          <path d="M4.1 5.2V3.6a1.9 1.9 0 0 1 3.8 0" />
        </>
      )}
    </svg>
  )
}
