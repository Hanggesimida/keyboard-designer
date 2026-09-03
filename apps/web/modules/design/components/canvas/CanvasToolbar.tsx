"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Undo2, Redo2, RotateCcw, FileImage, FileCode2, FileJson2, FolderOpen, Wrench, Boxes, AlertTriangle } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
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
import { normalizeDesignColorFields } from "@/modules/design/lib/design/normalizeKeycapColors"
import { generateJig } from "@/lib/export"
import { ApiError } from "@/lib/api/request"
import {
  DESIGN_EXPORTED_EVENT,
  NOSAVE_HINT_DISMISSED_KEY,
} from "@/modules/design/lib/session-events"

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

const IMPORT_ERROR_KEYS = ["parseFailed", "notExportedFile", "incompatible", "invalidFormat"] as const

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

function NoSaveHint() {
  const t = useTranslations("Design.toolbar")
  const tCommon = useTranslations("Common")
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.localStorage.getItem(NOSAVE_HINT_DISMISSED_KEY) === "1") return
    setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-background/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
      <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
      <span>{t("noSaveHint")}</span>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="h-auto px-1.5 py-0 text-[11px] text-foreground hover:bg-amber-500/10"
        onClick={(e) => {
          e.stopPropagation()
          window.localStorage.setItem(NOSAVE_HINT_DISMISSED_KEY, "1")
          setVisible(false)
        }}
      >
        {tCommon("gotIt")}
      </Button>
    </div>
  )
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
  const t = useTranslations("Design")
  const tCommon = useTranslations("Common")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<ImportPayload | null>(null)
  const [exporting, setExporting] = useState<ExportingFormat>(null)
  const show3dPreview = useDesignUIStore((s) => s.show3dPreview)
  const toggleShow3dPreview = useDesignUIStore((s) => s.toggleShow3dPreview)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const result = await parseImportJson(file)
    if (!result.ok) {
      setErrorMsg(
        (IMPORT_ERROR_KEYS as readonly string[]).includes(result.error)
          ? t(`errors.${result.error as (typeof IMPORT_ERROR_KEYS)[number]}`)
          : result.error,
      )
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

  const handleExportJson = (e: React.MouseEvent) => {
    e.stopPropagation()
    exportArtboardJson()
    window.dispatchEvent(new Event(DESIGN_EXPORTED_EVENT))
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
          : t("toolbar.jigError")
      setErrorMsg(
        err instanceof ApiError ? t("toolbar.jigErrorWithMsg", { msg }) : msg,
      )
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 flex flex-col items-center gap-2">
      <div className="flex items-center select-none rounded-lg border border-border bg-popover/80 px-2 py-0.5 backdrop-blur-sm [&_button:not(:disabled)]:cursor-pointer">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title={t("toolbar.undo")}
        disabled={!canUndo}
        onClick={(e) => { e.stopPropagation(); onUndo() }}
      >
        <Undo2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        title={t("toolbar.redo")}
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
        title={show3dPreview ? t("toolbar.hide3d") : t("toolbar.show3d")}
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
            title={t("toolbar.resetLayout")}
            className="hover:text-destructive"
            onClick={(e) => e.stopPropagation()}
          >
            <RotateCcw />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("toolbar.resetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("toolbar.resetBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onReset}>
              {t("toolbar.confirmReset")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ToolbarSeparator />

      <Button
        type="button"
        variant="ghost"
        size="xs"
        title={t("toolbar.exportPng")}
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
        title={t("toolbar.exportSvg")}
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
        title={t("toolbar.exportJson")}
        onClick={handleExportJson}
      >
        <FileJson2 className="size-3.5" />
        JSON
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="xs"
        title={t("toolbar.importJson")}
        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
      >
        <FolderOpen className="size-3.5" />
        {t("toolbar.import")}
      </Button>

      <ToolbarSeparator />

      <Button
        type="button"
        variant="ghost"
        size="xs"
        title={t("toolbar.jigTitle")}
        disabled={exporting !== null}
        onClick={handleGenerateJig}
      >
        {exporting === "jig" ? <Spinner className="size-3.5" /> : <Wrench className="size-3.5" />}
        {t("toolbar.jig")}
      </Button>

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
            <AlertDialogTitle>{t("toolbar.importFailed")}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {errorMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorMsg(null)}>{tCommon("confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => { if (!open) setPendingImport(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("toolbar.importConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("toolbar.importConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingImport(null)}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImport) {
                  applyImportData(pendingImport)
                  onAfterImport()
                  setPendingImport(null)
                }
              }}
            >
              {t("toolbar.confirmImport")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
      <NoSaveHint />
    </div>
  )
}
