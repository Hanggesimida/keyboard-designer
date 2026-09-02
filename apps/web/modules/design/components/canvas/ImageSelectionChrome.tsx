"use client"

import type { CSSProperties, ReactNode } from "react"
import { useTranslations } from "next-intl"
import { type ResizeCorner, type ResizeEdge } from "./imageElementUtils"
import { ResetRotationIcon, RestoreAspectIcon, LockAspectIcon } from "./ImageControlIcons"

const BORDER = "var(--design-selection-border)"
const SURFACE = "#ffffff"
const ON = "#ffffff"

/** 屏幕像素尺寸（不受画布 zoom 影响，放大不糊） */
const C = {
  handle: 7,
  edgeLong: 14,
  rotateLine: 22,
  rotateR: 5,
  btn: 24,
  icon: 14,
  stroke: 1,
  selStroke: 1.5,
  gap: 4,
  radius: 4,
  font: 10,
} as const

const CORNERS: ResizeCorner[] = ["se", "sw", "ne", "nw"]
const EDGES: ResizeEdge[] = ["n", "s", "e", "w"]

function stop(e: React.SyntheticEvent) {
  e.stopPropagation()
}

function chromeBtn(active = false, disabled = false): CSSProperties {
  return {
    width: C.btn,
    height: C.btn,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    background: active ? BORDER : SURFACE,
    border: `${C.stroke}px solid ${BORDER}`,
    borderRadius: C.radius,
    cursor: disabled ? "not-allowed" : "pointer",
    color: active ? ON : BORDER,
    pointerEvents: "auto",
    flexShrink: 0,
    opacity: disabled ? 0.6 : 1,
  }
}

function textBtn(active = false, disabled = false): CSSProperties {
  return {
    ...chromeBtn(active, disabled),
    width: "auto",
    gap: C.gap,
    padding: `0 ${6}px`,
    fontSize: C.font,
    lineHeight: 1,
  }
}

export interface ImageSelectionChromeProps {
  zoom: number
  width: number
  height: number
  rotation: number
  hasKeycapClip: boolean
  hasExplicitKeycapRestriction: boolean
  clipToKeycapIdsCount: number
  isClippedToAllKeycaps: boolean
  selectedKeycapCount: number
  lockAspect: boolean
  naturalSize: { w: number; h: number } | null
  onToggleLockAspect: () => void
  onRestoreAspect: () => void
  onResetRotation: () => void
  onToggleClipToKeycaps: () => void
  onRestrictToSelectedKeycaps?: () => void
  onClearKeycapRestriction?: () => void
  onResizePointerDown: (handle: ResizeCorner | ResizeEdge, e: React.PointerEvent) => void
  onResizePointerMove: (e: React.PointerEvent) => void
  onResizePointerUp: () => void
  onRotatePointerDown: (e: React.PointerEvent) => void
  onRotatePointerMove: (e: React.PointerEvent) => void
  onRotatePointerUp: () => void
}

/**
 * 选中态控件：在父级 scale(zoom) 内先用 scale(1/zoom) 回到屏幕像素，
 * 再以固定 px 绘制按钮/手柄，避免 `/zoom` 超细分后被放大糊掉。
 */
export function ImageSelectionChrome({
  zoom,
  width,
  height,
  rotation,
  hasKeycapClip,
  hasExplicitKeycapRestriction,
  clipToKeycapIdsCount,
  isClippedToAllKeycaps,
  selectedKeycapCount,
  lockAspect,
  naturalSize,
  onToggleLockAspect,
  onRestoreAspect,
  onResetRotation,
  onToggleClipToKeycaps,
  onRestrictToSelectedKeycaps,
  onClearKeycapRestriction,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onRotatePointerDown,
  onRotatePointerMove,
  onRotatePointerUp,
}: ImageSelectionChromeProps) {
  const t = useTranslations("Design.imageChrome")
  const inv = 1 / zoom

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: width * zoom,
        height: height * zoom,
        transform: `scale(${inv})`,
        transformOrigin: "0 0",
        pointerEvents: "none",
      }}
    >
      {/* 选中框 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `${C.selStroke}px solid ${BORDER}`,
          pointerEvents: "none",
        }}
      />

      {/* 顶部工具栏 */}
      <div
        style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: C.handle / 2 + 2,
          display: "flex",
          alignItems: "center",
          gap: C.gap,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {!hasKeycapClip && (
          hasExplicitKeycapRestriction ? (
            <button
              type="button"
              onPointerDown={stop}
              onMouseDown={stop}
              onClick={(e) => { stop(e); onClearKeycapRestriction?.() }}
              title={t("clearBinding")}
              style={textBtn(true)}
            >
              <span>{t("boundKeys", { count: clipToKeycapIdsCount })}</span>
              <span style={{ opacity: 0.8 }}>✕</span>
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={stop}
              onMouseDown={stop}
              onClick={(e) => { stop(e); onRestrictToSelectedKeycaps?.() }}
              disabled={selectedKeycapCount === 0}
              title={
                selectedKeycapCount > 0
                  ? t("bindSelected", { count: selectedKeycapCount })
                  : t("bindNeedSelection")
              }
              style={{
                ...textBtn(false, selectedKeycapCount === 0),
                background: selectedKeycapCount > 0
                  ? SURFACE
                  : "color-mix(in oklch, var(--muted) 50%, transparent)",
                color: selectedKeycapCount > 0 ? BORDER : "var(--muted-foreground)",
              }}
            >
              {selectedKeycapCount > 0
                ? t("bindToSelectedCount", { count: selectedKeycapCount })
                : t("bindToSelected")}
            </button>
          )
        )}

        {!hasKeycapClip && !hasExplicitKeycapRestriction && (
          <button
            type="button"
            onPointerDown={stop}
            onMouseDown={stop}
            onClick={(e) => { stop(e); onToggleClipToKeycaps() }}
            title={isClippedToAllKeycaps ? t("clippedToKeycaps") : t("freeOverlay")}
            style={chromeBtn(isClippedToAllKeycaps)}
          >
            <ClipGridIcon active={isClippedToAllKeycaps} />
          </button>
        )}

        {!hasKeycapClip && !hasExplicitKeycapRestriction && (
          <div style={{ width: 1, height: 14, background: BORDER, opacity: 0.3, flexShrink: 0 }} />
        )}

        {!hasKeycapClip && rotation !== 0 && (
          <button
            type="button"
            onPointerDown={stop}
            onMouseDown={stop}
            onClick={(e) => { stop(e); onResetRotation() }}
            title={t("resetRotation")}
            style={chromeBtn()}
          >
            <ResetRotationIcon size={C.icon} />
          </button>
        )}

        {naturalSize && (
          <button
            type="button"
            onPointerDown={stop}
            onMouseDown={stop}
            onClick={(e) => { stop(e); onRestoreAspect() }}
            title={t("resetAspect")}
            style={chromeBtn()}
          >
            <RestoreAspectIcon size={C.icon} />
          </button>
        )}

        <button
          type="button"
          onPointerDown={stop}
          onMouseDown={stop}
          onClick={(e) => { stop(e); onToggleLockAspect() }}
          title={lockAspect ? t("uniformScale") : t("freeScale")}
          style={chromeBtn(lockAspect)}
        >
          <LockAspectIcon size={C.icon} locked={lockAspect} />
        </button>
      </div>

      {/* 旋转手柄 */}
      {!hasKeycapClip && (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: `calc(100% + ${C.handle / 2}px)`,
              width: 1,
              height: C.rotateLine,
              background: BORDER,
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          />
          <Handle
            title={t("dragRotate")}
            onPointerDown={onRotatePointerDown}
            onPointerMove={onRotatePointerMove}
            onPointerUp={onRotatePointerUp}
            style={{
              left: "50%",
              top: `calc(100% + ${C.handle / 2 + C.rotateLine + C.rotateR}px)`,
              width: C.rotateR * 2,
              height: C.rotateR * 2,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              cursor: "grab",
            }}
          />
        </>
      )}

      {/* 角点 */}
      {CORNERS.map((corner) => (
        <Handle
          key={corner}
          onPointerDown={(e) => onResizePointerDown(corner, e)}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          style={{
            width: C.handle,
            height: C.handle,
            borderRadius: 1,
            cursor: corner === "se" || corner === "nw" ? "nwse-resize" : "nesw-resize",
            ...(corner === "se" && { right: -C.handle / 2, bottom: -C.handle / 2 }),
            ...(corner === "sw" && { left: -C.handle / 2, bottom: -C.handle / 2 }),
            ...(corner === "ne" && { right: -C.handle / 2, top: -C.handle / 2 }),
            ...(corner === "nw" && { left: -C.handle / 2, top: -C.handle / 2 }),
          }}
        />
      ))}

      {/* 边中点 */}
      {EDGES.map((edge) => {
        const horizontal = edge === "e" || edge === "w"
        return (
          <Handle
            key={edge}
            onPointerDown={(e) => onResizePointerDown(edge, e)}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            style={{
              width: horizontal ? C.handle : C.edgeLong,
              height: horizontal ? C.edgeLong : C.handle,
              borderRadius: C.handle / 2,
              cursor: horizontal ? "ew-resize" : "ns-resize",
              ...(edge === "n" && { top: -C.handle / 2, left: "50%", transform: "translateX(-50%)" }),
              ...(edge === "s" && { bottom: -C.handle / 2, left: "50%", transform: "translateX(-50%)" }),
              ...(edge === "e" && { right: -C.handle / 2, top: "50%", transform: "translateY(-50%)" }),
              ...(edge === "w" && { left: -C.handle / 2, top: "50%", transform: "translateY(-50%)" }),
            }}
          />
        )
      })}
    </div>
  )
}

function Handle({
  style,
  title,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  style: CSSProperties
  title?: string
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: () => void
}) {
  return (
    <div
      title={title}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "absolute",
        background: SURFACE,
        border: `${C.stroke}px solid ${BORDER}`,
        pointerEvents: "auto",
        ...style,
      }}
    />
  )
}

function ClipGridIcon({ active }: { active: boolean }) {
  const fill = active ? "currentColor" : "none"
  const opacity = active ? 0.3 : 1
  return (
    <svg viewBox="0 0 12 12" width={C.icon} height={C.icon} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="4.2" height="4.2" rx="0.8" fill={fill} opacity={opacity} />
      <rect x="6.8" y="1" width="4.2" height="4.2" rx="0.8" fill={fill} opacity={opacity} />
      <rect x="1" y="6.8" width="4.2" height="4.2" rx="0.8" fill={fill} opacity={opacity} />
      <rect x="6.8" y="6.8" width="4.2" height="4.2" rx="0.8" fill={fill} opacity={opacity} />
    </svg>
  )
}

/** 裁切占位轮廓（同样以屏幕像素描边） */
export function ClippedImagePlaceholder({ zoom, children }: { zoom: number; children?: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `calc(100% * ${zoom})`,
          height: `calc(100% * ${zoom})`,
          transform: `scale(${1 / zoom})`,
          transformOrigin: "0 0",
          border: `${C.selStroke}px dashed color-mix(in oklch, ${BORDER} 70%, transparent)`,
          borderRadius: 2,
          boxSizing: "border-box",
        }}
      />
      {children}
    </div>
  )
}
