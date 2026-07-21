"use client"

import { useRef, useState } from "react"
import { Undo2, Redo2, RotateCcw, FileImage, FileCode2, FileJson2, FolderOpen, Wrench, Boxes } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { Spinner } from "@workspace/ui/components/spinner"
import { SaveDesignButton } from "./SaveDesignButton"
import { OrderButton } from "./OrderButton"
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
import { normalizeDesignColorFields } from "@/modules/design/lib/design/normalizeKeycapColors"
import { useUserStore } from "@/store/userStore"
import { generateJig } from "@/lib/api/export"
import { ApiError } from "@/lib/api/request"

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

function ToolbarSeparator() {
  return <Separator orientation="vertical" />
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
  const isAdmin = useUserStore((s) => s.user?.role === "ADMIN")
  const show3dPreview = useDesignUIStore((s) => s.show3dPreview)
  const toggleShow3dPreview = useDesignUIStore((s) => s.toggleShow3dPreview)

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

      const resolvedElements = canvasElements.map((el) => {
        const { assetId, ...rest } = el
        return { ...rest, src: assetMap[assetId] ?? "" }
      })

      const design = normalizeDesignColorFields({
        version: 1,
        templateId,
        artboardBackground,
        fontFamily,
        globalKeycapStyle,
        layers,
        layerKeycapOverrides,
        canvasElements: resolvedElements,
      })

      const blob = await generateJig(design)

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

      triggerBlobDownload(blob, filename)
    } catch (err) {
      console.error("[CanvasToolbar] 治具 SVG 生成异常:", err)
      const msg =
        err instanceof ApiError
          ? err.message
          : "治具 SVG 生成时发生错误，请检查控制台。"
      setErrorMsg(
        err instanceof ApiError ? `治具 SVG 生成失败：${msg}` : msg,
      )
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 flex items-center select-none rounded-lg border border-border bg-popover/80 px-2 py-0.5 backdrop-blur-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="撤销 (Ctrl+Z)"
        disabled={!canUndo}
        onClick={(e) => { e.stopPropagation(); onUndo() }}
      >
        <Undo2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title="重做 (Ctrl+Y)"
        disabled={!canRedo}
        onClick={(e) => { e.stopPropagation(); onRedo() }}
      >
        <Redo2 />
      </Button>

      <ToolbarSeparator />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title={show3dPreview ? "关闭 3D 预览" : "显示 3D 预览"}
        className={show3dPreview ? "text-foreground bg-accent" : undefined}
        onClick={(e) => {
          e.stopPropagation()
          toggleShow3dPreview()
        }}
      >
        <Boxes />
      </Button>

      <ToolbarSeparator />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="重置为原始布局"
            className="hover:text-destructive"
            onClick={(e) => e.stopPropagation()}
          >
            <RotateCcw />
          </Button>
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

      {isAdmin && (
        <>
          <ToolbarSeparator />

          <Button
            type="button"
            variant="ghost"
            size="xs"
            title="导出 PNG"
            disabled={exporting !== null}
            onClick={handleExportPng}
          >
            {exporting === "png" ? <Spinner className="size-3.5" /> : <FileImage className="size-3.5" />}
            PNG
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            title="导出 SVG（字体转曲）"
            disabled={exporting !== null}
            onClick={handleExportSvg}
          >
            {exporting === "svg" ? <Spinner className="size-3.5" /> : <FileCode2 className="size-3.5" />}
            SVG
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            title="导出 JSON"
            onClick={(e) => { e.stopPropagation(); exportArtboardJson() }}
          >
            <FileJson2 className="size-3.5" />
            JSON
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            title="导入 JSON"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
          >
            <FolderOpen className="size-3.5" />
            导入
          </Button>
        </>
      )}

      <ToolbarSeparator />

      <SaveDesignButton getExportParams={getExportParams} />

      <ToolbarSeparator />

      <OrderButton />

      {isAdmin && (
        <>
          <ToolbarSeparator />

          <Button
            type="button"
            variant="ghost"
            size="xs"
            title="生成治具 SVG（字体转曲）"
            disabled={exporting !== null}
            className="hover:text-chart-2"
            onClick={handleGenerateJig}
          >
            {exporting === "jig" ? <Spinner className="size-3.5" /> : <Wrench className="size-3.5" />}
            治具
          </Button>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

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
