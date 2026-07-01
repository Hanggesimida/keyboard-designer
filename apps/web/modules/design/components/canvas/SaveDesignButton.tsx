"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { useCreateDesign, useUpdateDesign, useDesign } from "@/hooks/queries/designs/useDesigns"
import { useUserStore } from "@/store/userStore"
import type { DesignData } from "@/lib/api/designs"
import type { ExportCanvasElement } from "@/modules/design/lib/design/exportArtboard"

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

  return {
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
  }
}

export function SaveDesignButton() {
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
        title="管理员审阅模式，不可保存"
        disabled
        className="text-muted-foreground/40"
      >
        <CloudOff className="size-3.5" />
        只读
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
  const { data: currentDesign } = useDesign(designId)

  const isSaving = isCreating || isUpdating

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
        title="请先登录后再保存设计"
        disabled
        className="text-muted-foreground/40"
      >
        <CloudOff className="size-3.5" />
        保存
      </Button>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        title={designId ? "保存设计 (Ctrl+S)" : "另存为新设计"}
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
        {saveSuccess ? "已保存" : "保存"}
      </Button>

      {designId && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="重命名设计"
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
            <DialogTitle>保存设计方案</DialogTitle>
            <DialogDescription>
              请为此键盘设计方案起一个名称，便于后续查找。
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
              placeholder="例如：无题键盘方案 1"
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
              取消
            </Button>
            <Button
              disabled={!nameInput.trim() || isSaving}
              onClick={(e) => {
                e.preventDefault()
                handleCreate()
              }}
            >
              {isSaving ? "保存中..." : "确认保存"}
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
            <DialogTitle>重命名设计方案</DialogTitle>
            <DialogDescription>
              为此键盘设计方案输入新名称。
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
              placeholder="请输入设计名称"
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
              取消
            </Button>
            <Button
              disabled={!renameInput.trim() || isSaving}
              onClick={(e) => {
                e.preventDefault()
                handleRename()
              }}
            >
              {isSaving ? "保存中..." : "确认重命名"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
