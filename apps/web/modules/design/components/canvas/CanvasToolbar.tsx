"use client"

import { useRef, useState } from "react"
import { Undo2, Redo2, RotateCcw, FileImage, FileCode2, FileJson2, FolderOpen, Wrench } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import type { ExportArtboardParams } from "@/modules/design/lib/design/exportArtboard"
import {
  exportArtboardJson,
  exportArtboardPng,
  exportArtboardSvg,
  parseImportJson,
  applyImportData,
  type ImportPayload,
} from "@/modules/design/lib/design/exportArtboard"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"

interface CanvasToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  getExportParams: () => ExportArtboardParams
  onAfterImport: () => void
}

type ExportingFormat = "png" | "svg" | "jig" | null

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function CanvasToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  getExportParams,
  onAfterImport,
}: CanvasToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<ImportPayload | null>(null)
  const [exporting, setExporting] = useState<ExportingFormat>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const result = await parseImportJson(file)
    if (!result.ok) {
      setErrorMsg(result.error)
    } else {
      setPendingImport(result.data)
    }
  }

  const handleExportPng = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (exporting) return
    setExporting("png")
    try {
      await exportArtboardPng(getExportParams())
    } finally {
      setExporting(null)
    }
  }

  const handleExportSvg = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (exporting) return
    setExporting("svg")
    try {
      await exportArtboardSvg(getExportParams())
    } finally {
      setExporting(null)
    }
  }

  const handleGenerateJig = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (exporting) return
    setExporting("jig")
    try {
      const {
        templateId,
        artboardBackground,
        fontFamily,
        globalKeycapStyle,
        layers,
        layerKeycapOverrides,
        canvasElements,
        assetMap,
      } = useDesignUIStore.getState()

      // 将运行时格式（assetId 引用）转为服务端所需格式（内联 src）
      const resolvedElements = canvasElements.map((el) => {
        const { assetId, ...rest } = el
        return { ...rest, src: assetMap[assetId] ?? "" }
      })

      const design = {
        version: 1,
        templateId,
        artboardBackground,
        fontFamily,
        globalKeycapStyle,
        layers,
        layerKeycapOverrides,
        canvasElements: resolvedElements,
      }

      const res = await fetch("/api/generate-jig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "未知错误" }))
        console.error("[CanvasToolbar] 治具 SVG 生成失败:", err)
        setErrorMsg(`治具 SVG 生成失败：${err.error ?? res.statusText}`)
        return
      }

      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, "0")
      const ts =
        `${now.getFullYear()}-` +
        `${pad(now.getMonth() + 1)}-` +
        `${pad(now.getDate())}-` +
        `${pad(now.getHours())}` +
        `${pad(now.getMinutes())}` +
        `${pad(now.getSeconds())}`
      const filename = `jig-${templateId ?? "custom"}-${ts}.svg`

      const blob = await res.blob()
      triggerBlobDownload(blob, filename)
    } catch (err) {
      console.error("[CanvasToolbar] 治具 SVG 生成异常:", err)
      setErrorMsg("治具 SVG 生成时发生错误，请检查控制台。")
    } finally {
      setExporting(null)
    }
  }

  const btnBase =
    "flex items-center justify-center gap-1 rounded px-1 py-0.5 transition-colors text-white/40 hover:bg-white/10 hover:text-white/70 disabled:opacity-40 disabled:cursor-not-allowed"

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 select-none rounded bg-black/30 px-2 py-0.5 backdrop-blur-sm">
      <button
        type="button"
        title="撤销 (Ctrl+Z)"
        disabled={!canUndo}
        onClick={(e) => { e.stopPropagation(); onUndo() }}
        className="flex items-center justify-center rounded p-0.5 transition-colors disabled:opacity-25 enabled:hover:bg-white/10 enabled:hover:text-white/70 text-white/40"
      >
        <Undo2 className="size-3.5" />
      </button>
      <button
        type="button"
        title="重做 (Ctrl+Y)"
        disabled={!canRedo}
        onClick={(e) => { e.stopPropagation(); onRedo() }}
        className="flex items-center justify-center rounded p-0.5 transition-colors disabled:opacity-25 enabled:hover:bg-white/10 enabled:hover:text-white/70 text-white/40"
      >
        <Redo2 className="size-3.5" />
      </button>

      <span className="mx-0.5 h-3 w-px bg-white/15" />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            title="重置为原始布局"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center rounded p-0.5 transition-colors text-white/40 hover:bg-white/10 hover:text-orange-400/80"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重置为原始布局？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将清除所有键帽覆盖样式、全局样式修改、画板背景及画布图片，恢复到初始默认状态。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onReset}>
              确认重置
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <span className="mx-0.5 h-3 w-px bg-white/15" />

      <button
        type="button"
        title="导出 PNG"
        disabled={exporting !== null}
        onClick={handleExportPng}
        className={btnBase}
      >
        {exporting === "png" ? <Spinner className="size-3.5" /> : <FileImage className="size-3.5" />}
        <span className="text-[11px] leading-none">PNG</span>
      </button>

      <button
        type="button"
        title="导出 SVG（字体转曲）"
        disabled={exporting !== null}
        onClick={handleExportSvg}
        className={btnBase}
      >
        {exporting === "svg" ? <Spinner className="size-3.5" /> : <FileCode2 className="size-3.5" />}
        <span className="text-[11px] leading-none">SVG</span>
      </button>

      <button
        type="button"
        title="导出 JSON"
        onClick={(e) => { e.stopPropagation(); exportArtboardJson() }}
        className={btnBase}
      >
        <FileJson2 className="size-3.5" />
        <span className="text-[11px] leading-none">JSON</span>
      </button>

      <span className="mx-0.5 h-3 w-px bg-white/15" />

      <button
        type="button"
        title="导入 JSON"
        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
        className={btnBase}
      >
        <FolderOpen className="size-3.5" />
        <span className="text-[11px] leading-none">导入</span>
      </button>

      <span className="mx-0.5 h-3 w-px bg-white/15" />

      <button
        type="button"
        title="生成治具 SVG（字体转曲）"
        disabled={exporting !== null}
        onClick={handleGenerateJig}
        className={`${btnBase} hover:text-sky-400/80`}
      >
        {exporting === "jig" ? <Spinner className="size-3.5" /> : <Wrench className="size-3.5" />}
        <span className="text-[11px] leading-none">治具</span>
      </button>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 导入格式错误提示对话框 */}
      <AlertDialog
        open={errorMsg !== null}
        onOpenChange={(open) => { if (!open) setErrorMsg(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>导入失败</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {errorMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorMsg(null)}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 导入前确认对话框 */}
      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => { if (!open) setPendingImport(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>导入设计方案？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将覆盖当前所有设计数据（键帽样式、图层设置与画布图片），且无法通过撤销还原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingImport(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImport) {
                  applyImportData(pendingImport)
                  onAfterImport()
                  setPendingImport(null)
                }
              }}
            >
              确认导入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
