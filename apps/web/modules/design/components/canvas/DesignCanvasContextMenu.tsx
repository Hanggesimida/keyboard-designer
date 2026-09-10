"use client"

import { useRef, type ChangeEvent } from "react"
import { useTranslations } from "next-intl"
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  ArrowDown,
  ArrowUp,
  Boxes,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Crop,
  ImagePlus,
  Info,
  Layers3,
  Link2,
  Lock,
  Maximize2,
  Paintbrush,
  Redo2,
  RotateCcw,
  Rows3,
  Scaling,
  Spline,
  Trash2,
  Undo2,
  Unlink2,
  X,
} from "lucide-react"
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@workspace/ui/components/context-menu"
import type { useDesignCanvasContextMenu } from "@/modules/design/hooks/useDesignCanvasContextMenu"

type ContextMenuController = ReturnType<typeof useDesignCanvasContextMenu>

interface DesignCanvasContextMenuProps {
  controller: ContextMenuController
  onFitToScreen: () => void
}

function SelectionSubmenu({
  controller,
}: {
  controller: ContextMenuController
}) {
  const t = useTranslations("Design.contextMenu")
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Rows3 />
        {t("expandSelection")}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        <ContextMenuItem onClick={() => controller.expandSelection("row")}>
          {t("selectSameRow")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => controller.expandSelection("size")}>
          {t("selectSameSize")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={controller.selectAllKeycaps}>
          {t("selectAllKeycaps")}
        </ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}

function KeycapMenu({ controller }: { controller: ContextMenuController }) {
  const t = useTranslations("Design.contextMenu")
  const isMulti = controller.selectedKeycapIds.length > 1

  return (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel>
          {isMulti
            ? t("selectedKeycaps", { count: controller.selectedKeycapIds.length })
            : t("keycap")}
        </ContextMenuLabel>
        <ContextMenuItem
          disabled={controller.keycapActionsDisabled}
          onClick={controller.beginStyleTransfer}
        >
          <Paintbrush />
          {t("reuseStyle")}
        </ContextMenuItem>
        {!isMulti && (
          <ContextMenuItem
            disabled={controller.keycapActionsDisabled}
            onClick={controller.copyKeycapStyle}
          >
            <Copy />
            {t("copyStyle")}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          disabled={
            controller.keycapActionsDisabled ||
            !controller.hasKeycapStyleClipboard
          }
          onClick={controller.pasteKeycapStyle}
        >
          <ClipboardPaste />
          {isMulti ? t("pasteStyleToSelected") : t("pasteStyle")}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={
            controller.keycapActionsDisabled ||
            !controller.hasSelectedKeycapOverrides
          }
          onClick={controller.resetSelectedKeycaps}
        >
          <RotateCcw />
          {isMulti ? t("resetSelectedStyles") : t("resetKeycapStyle")}
        </ContextMenuItem>
      </ContextMenuGroup>

      {isMulti && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={!controller.selectedElementId}
            onClick={controller.bindSelectedImageToKeycaps}
          >
            <Link2 />
            {t("bindCurrentImage")}
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />
      <SelectionSubmenu controller={controller} />
      <ContextMenuItem onClick={controller.clearSelection}>
        <X />
        {t("clearSelection")}
      </ContextMenuItem>
    </>
  )
}

function ImageMenu({ controller }: { controller: ContextMenuController }) {
  const t = useTranslations("Design.contextMenu")
  const image = controller.targetImage
  if (!image) return null

  const atTop = controller.targetImageIndex === controller.canvasElementCount - 1
  const atBottom = controller.targetImageIndex === 0
  const hasBinding =
    !!image.clipToKeycapId || !!image.clipToKeycapIds?.length

  return (
    <>
      <ContextMenuGroup>
        <ContextMenuLabel>{image.isSvg ? t("svg") : t("image")}</ContextMenuLabel>
        <ContextMenuItem onClick={controller.copyImage}>
          <Copy />
          {t("copy")}
        </ContextMenuItem>
        <ContextMenuItem onClick={controller.duplicateImage}>
          <CopyPlus />
          {t("duplicate")}
        </ContextMenuItem>
      </ContextMenuGroup>

      <ContextMenuSeparator />
      <ContextMenuCheckboxItem
        checked={image.locked}
        onClick={() => controller.updateTargetImage({ locked: !image.locked })}
      >
        <Lock />
        {t("lockPosition")}
      </ContextMenuCheckboxItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Layers3 />
          {t("layerOrder")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem
            disabled={atTop}
            onClick={() => controller.reorderTargetImage("up")}
          >
            <ArrowUp />
            {t("moveUp")}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={atBottom}
            onClick={() => controller.reorderTargetImage("down")}
          >
            <ArrowDown />
            {t("moveDown")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={atTop}
            onClick={() => controller.reorderTargetImage("front")}
          >
            {t("bringToFront")}
          </ContextMenuItem>
          <ContextMenuItem
            disabled={atBottom}
            onClick={() => controller.reorderTargetImage("back")}
          >
            {t("sendToBack")}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Crop />
          {t("clipMode")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuRadioGroup value={controller.imageClipMode}>
            <ContextMenuRadioItem
              value="free"
              onClick={() => controller.setImageClipMode("free")}
            >
              {t("freeImage")}
            </ContextMenuRadioItem>
            <ContextMenuRadioItem
              value="all"
              onClick={() => controller.setImageClipMode("all")}
            >
              {t("clipAllKeycaps")}
            </ContextMenuRadioItem>
            <ContextMenuRadioItem
              value="selected"
              disabled={controller.selectedKeycapIds.length === 0}
              onClick={() => controller.setImageClipMode("selected")}
            >
              {t("bindSelectedKeycaps")}
            </ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          {hasBinding && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => controller.setImageClipMode("free")}
              >
                <Unlink2 />
                {t("clearBinding")}
              </ContextMenuItem>
            </>
          )}
          <ContextMenuSeparator />
          <ContextMenuCheckboxItem
            checked={!!image.clipToTopFace}
            disabled={controller.imageClipMode === "free"}
            onClick={() =>
              controller.updateTargetImage({
                clipToTopFace: !image.clipToTopFace,
              })
            }
          >
            {t("clipTopFace")}
          </ContextMenuCheckboxItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Scaling />
          {t("transform")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem
            disabled={(image.rotation ?? 0) === 0}
            onClick={() => controller.updateTargetImage({ rotation: 0 })}
          >
            <RotateCcw />
            {t("resetRotation")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void controller.restoreImageAspect()}>
            <Maximize2 />
            {t("restoreAspect")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => controller.centerTargetImage("horizontal")}
          >
            <AlignCenterHorizontal />
            {t("centerHorizontal")}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => controller.centerTargetImage("vertical")}
          >
            <AlignCenterVertical />
            {t("centerVertical")}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Info />
          {t("imageInfo")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem disabled>
            {t("dimensions", {
              width: Math.round(image.width),
              height: Math.round(image.height),
            })}
          </ContextMenuItem>
          <ContextMenuItem disabled>
            {t("rotation", { value: Math.round(image.rotation ?? 0) })}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator />
      <ContextMenuItem
        variant="destructive"
        onClick={controller.removeTargetImage}
      >
        <Trash2 />
        {t("delete")}
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  )
}

function BlankMenu({
  controller,
  onFitToScreen,
  onUpload,
}: DesignCanvasContextMenuProps & {
  onUpload: (kind: "image" | "svg") => void
}) {
  const t = useTranslations("Design.contextMenu")
  const hasSelection =
    controller.selectedKeycapIds.length > 0 || !!controller.selectedElementId

  return (
    <>
      <ContextMenuItem
        disabled={!controller.hasImageClipboard}
        onClick={controller.pasteImage}
      >
        <ClipboardPaste />
        {t("pasteImage")}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onUpload("image")}>
        <ImagePlus />
        {t("uploadImage")}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onUpload("svg")}>
        <Spline />
        {t("uploadSvg")}
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem onClick={controller.selectAllKeycaps}>
        <Rows3 />
        {t("selectAllKeycaps")}
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!hasSelection}
        onClick={controller.clearSelection}
      >
        <X />
        {t("clearSelection")}
      </ContextMenuItem>
      <ContextMenuItem onClick={onFitToScreen}>
        <Maximize2 />
        {t("fitToScreen")}
        <ContextMenuShortcut>Ctrl+0</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={!controller.canUndo}
        onClick={() => controller.undo()}
      >
        <Undo2 />
        {t("undo")}
        <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!controller.canRedo}
        onClick={() => controller.redo()}
      >
        <Redo2 />
        {t("redo")}
        <ContextMenuShortcut>Ctrl+Y</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onClick={controller.toggleShow3dPreview}>
        <Boxes />
        {controller.show3dPreview ? t("hide3d") : t("show3d")}
      </ContextMenuItem>
    </>
  )
}

export function DesignCanvasContextMenu({
  controller,
  onFitToScreen,
}: DesignCanvasContextMenuProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const svgInputRef = useRef<HTMLInputElement>(null)
  const uploadPointRef = useRef(controller.target.point)

  const openUpload = (kind: "image" | "svg") => {
    uploadPointRef.current = controller.target.point
    const input = kind === "svg" ? svgInputRef.current : imageInputRef.current
    input?.click()
  }

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    void controller.addImageFilesAt(files, uploadPointRef.current)
  }

  return (
    <>
      <ContextMenuContent className="min-w-52">
        {controller.target.type === "keycap" ? (
          <KeycapMenu controller={controller} />
        ) : controller.target.type === "image" ? (
          <ImageMenu controller={controller} />
        ) : (
          <BlankMenu
            controller={controller}
            onFitToScreen={onFitToScreen}
            onUpload={openUpload}
          />
        )}
      </ContextMenuContent>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUploadChange}
      />
      <input
        ref={svgInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        multiple
        className="hidden"
        onChange={handleUploadChange}
      />
    </>
  )
}
