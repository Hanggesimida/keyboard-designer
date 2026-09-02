"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { Save, Cloud, CloudOff, Pencil } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { useCreateDesign, useUpdateDesign, useDesign, useUploadDesignThumbnail } from "@/hooks/queries/designs/useDesigns"
import { useUserStore } from "@/store/userStore"
import type { DesignData } from "@/lib/api/designs"
import type { ExportArtboardParams, ExportCanvasElement } from "@/modules/design/lib/design/exportArtboard"
import { generateThumbnailBlob } from "@/modules/design/lib/design/exportArtboard"
import { normalizeDesignColorFields } from "@/modules/design/lib/design/normalizeKeycapColors"

interface SaveDesignButtonProps {
  getExportParams: () => ExportArtboardParams
}

/** 从 store 当前状态提取可持久化的设计数据（内联 src，自包含） */
function extractDesignData(): DesignData {
  const {
    templateId,
    layers,
    artboardBackground,
    fontFamily,
    fontWeight,
    fontStyle,
    globalKeycapStyle,
    layerKeycapOverrides,
    canvasElements,
    assetMap,
  } = useDesignUIStore.getState()

  const exportElements: ExportCanvasElement[] = canvasElements.map((el) => {
    const { assetId, ...rest } = el
    return { ...rest, src: assetMap[assetId] ?? "" }
  })

  return normalizeDesignColorFields({
    version: 1,
    templateId,
    layers,
    artboardBackground,
    fontFamily,
    fontWeight,
    fontStyle,
    globalKeycapStyle,
    layerKeycapOverrides,
    canvasElements: exportElements,
  })
}

export function SaveDesignButton({ getExportParams }: SaveDesignButtonProps) {
  const t = useTranslations("Design.save")
  const tCommon = useTranslations("Common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const designId = searchParams.get("id")
  const fromAdmin = searchParams.get("from") === "admin"

  const accessToken = useUserStore((s) => s.accessToken)

  // 管理员审阅模式：显示只读提示，不允许保存
  if (fromAdmin) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        title={t("adminReadonlyTitle")}
        disabled
        className="text-muted-foreground/40"
      >
        <CloudOff className="size-3.5" />
        {t("readonly")}
      </Button>
    )
  }
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameInput, setRenameInput] = useState("")

  const { mutate: createDesign, isPending: isCreating } = useCreateDesign()
  const { mutate: updateDesign, isPending: isUpdating } = useUpdateDesign()
  const { mutate: uploadThumbnail } = useUploadDesignThumbnail()
  const { data: currentDesign } = useDesign(designId)

  const isSaving = isCreating || isUpdating

  async function saveThumbnail(id: string) {
    try {
      const blob = await generateThumbnailBlob(getExportParams())
      if (blob) uploadThumbnail({ id, blob })
    } catch (err) {
      console.error("[SaveDesignButton] 缩略图生成/上传失败:", err)
    }
  }

  function handleSaveClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!accessToken) return
    if (designId) {
      handleUpdate()
    } else {
      setNameInput("")
      setNameDialogOpen(true)
    }
  }

  function handleRenameClick(e: React.MouseEvent) {
    e.stopPropagation()
    setRenameInput(currentDesign?.name ?? "")
    setRenameDialogOpen(true)
  }

  function handleUpdate() {
    if (!designId) return
    updateDesign(
      { id: designId, payload: { data: extractDesignData() } },
      {
        onSuccess: () => {
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 2000)
          void saveThumbnail(designId)
        },
      },
    )
  }

  function handleRename() {
    const trimmedName = renameInput.trim()
    if (!trimmedName || !designId) return
    updateDesign(
      { id: designId, payload: { name: trimmedName } },
      {
        onSuccess: () => {
          setRenameDialogOpen(false)
        },
      },
    )
  }

  function handleCreate() {
    const trimmedName = nameInput.trim()
    if (!trimmedName) return

    createDesign(
      { name: trimmedName, data: extractDesignData() },
      {
        onSuccess: (design) => {
          setNameDialogOpen(false)
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 2000)
          void saveThumbnail(design.id)
          // 将设计 ID 写入 URL，后续保存直接走更新逻辑
          const params = new URLSearchParams(searchParams.toString())
          params.set("id", design.id)
          router.replace(`/design?${params.toString()}`)
        },
      },
    )
  }

  if (!accessToken) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        title={t("loginToSave")}
        disabled
        className="text-muted-foreground/40"
      >
        <CloudOff className="size-3.5" />
        {t("save")}
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        title={designId ? t("saveTitle") : t("saveAsNew")}
        disabled={isSaving}
        onClick={handleSaveClick}
        className={saveSuccess ? "text-primary" : undefined}
      >
        {isSaving ? (
          <Spinner className="size-3.5" />
        ) : saveSuccess ? (
          <Cloud className="size-3.5" />
        ) : (
          <Save className="size-3.5" />
        )}
        {saveSuccess ? t("saved") : t("save")}
      </Button>

      {designId && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title={t("rename")}
          disabled={isSaving}
          onClick={handleRenameClick}
        >
          <Pencil className="size-3.5" />
        </Button>
      )}

      {/* 命名弹窗（首次保存） */}
      <Dialog
        open={nameDialogOpen}
        onOpenChange={(open) => !isSaving && setNameDialogOpen(open)}
      >
        <DialogContent showCloseButton={false} onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialogBody")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-2">
            <Input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
              }}
              placeholder={t("placeholder")}
              maxLength={100}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => setNameDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              disabled={!nameInput.trim() || isSaving}
              onClick={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              {isSaving ? t("saving") : t("confirmSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重命名弹窗（已保存设计改名） */}
      <Dialog
        open={renameDialogOpen}
        onOpenChange={(open) => !isSaving && setRenameDialogOpen(open)}
      >
        <DialogContent showCloseButton={false} onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("renameTitle")}</DialogTitle>
            <DialogDescription>
              {t("renameBody")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-1 py-2">
            <Input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename()
              }}
              placeholder={t("renamePlaceholder")}
              maxLength={100}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => setRenameDialogOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              disabled={!renameInput.trim() || isSaving}
              onClick={(e) => {
                e.preventDefault()
                handleRename()
              }}
            >
              {isSaving ? t("saving") : t("confirmRename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
