"use client"

import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
  type RefObject,
} from "react"
import {
  useDesignUIStore,
  useTemporalDesignStore,
  type CanvasImageElement,
} from "@/modules/design/store/designUiStore"
import type { Viewport } from "@/modules/design/hooks/useViewport"
import type { KeyDef } from "@/modules/design/types/design"
import { createKeycapStyleTransferPatch } from "@/modules/design/lib/keycap-inspector/keycapStyleTransfer"
import {
  centerImageOnArtboard,
  clientPointToArtboard,
  createImageElementCopy,
  expandKeycapSelection,
  type CanvasContextTarget,
  type CanvasPoint,
  type ImageElementClipboard,
  type KeycapSelectionExpansion,
  type KeycapStyleClipboard,
} from "@/modules/design/lib/design/canvasContextMenu"
import {
  readCanvasImageFile,
  readImageDimensions,
} from "@/modules/design/lib/design/canvasImageFile"

interface UseDesignCanvasContextMenuParams {
  containerRef: RefObject<HTMLDivElement | null>
  viewport: Viewport
  keys: KeyDef[]
  artW: number
  artH: number
  artPad: number
  disabled?: boolean
}

export function useDesignCanvasContextMenu({
  containerRef,
  viewport,
  keys,
  artW,
  artH,
  artPad,
  disabled = false,
}: UseDesignCanvasContextMenuParams) {
  const [target, setTarget] = useState<CanvasContextTarget>({
    type: "blank",
    point: { x: 0, y: 0 },
  })
  const [keycapStyleClipboard, setKeycapStyleClipboard] =
    useState<KeycapStyleClipboard | null>(null)
  const [imageClipboard, setImageClipboard] =
    useState<ImageElementClipboard | null>(null)

  const selectedKeycapIds = useDesignUIStore((state) => state.selectedKeycapIds)
  const selectedElementId = useDesignUIStore((state) => state.selectedElementId)
  const activeLayerId = useDesignUIStore((state) => state.activeLayerId)
  const layers = useDesignUIStore((state) => state.layers)
  const layerKeycapOverrides = useDesignUIStore(
    (state) => state.layerKeycapOverrides,
  )
  const canvasElements = useDesignUIStore((state) => state.canvasElements)
  const show3dPreview = useDesignUIStore((state) => state.show3dPreview)
  const pastCount = useTemporalDesignStore((state) => state.pastStates.length)
  const futureCount = useTemporalDesignStore((state) => state.futureStates.length)

  const activeLayer = layers.find((layer) => layer.id === activeLayerId) ?? null
  const keycapActionsDisabled =
    !activeLayer || activeLayer.locked || !activeLayer.visible
  const targetImage =
    target.type === "image"
      ? (canvasElements.find((element) => element.id === target.elementId) ?? null)
      : null
  const targetImageIndex = targetImage
    ? canvasElements.findIndex((element) => element.id === targetImage.id)
    : -1
  const hasSelectedKeycapOverrides =
    !!activeLayerId &&
    selectedKeycapIds.some(
      (keycapId) =>
        Object.keys(
          layerKeycapOverrides[activeLayerId]?.[keycapId] ?? {},
        ).length > 0,
    )

  const handleContextMenuCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (disabled) {
        event.preventDefault()
        return
      }

      const container = containerRef.current
      const eventTarget = event.target
      if (!container || !(eventTarget instanceof Element)) return

      const point = clientPointToArtboard(
        event.clientX,
        event.clientY,
        container.getBoundingClientRect(),
        viewport,
      )
      const imageNode = eventTarget.closest<HTMLElement>(
        "[data-canvas-element-id]",
      )
      if (imageNode) {
        const elementId = imageNode.dataset.canvasElementId
        if (!elementId) return
        const state = useDesignUIStore.getState()
        if (state.selectedElementId !== elementId) {
          state.setSelectedElementId(elementId, { additive: true })
        }
        setTarget({ type: "image", elementId, point })
        return
      }

      const keycapNode = eventTarget.closest<SVGElement>("[data-keycap-id]")
      const layerNode = keycapNode?.closest<SVGElement>("[data-layer-id]")
      const keycapId = keycapNode?.dataset.keycapId
      const layerId = layerNode?.dataset.layerId
      if (keycapId && layerId) {
        const state = useDesignUIStore.getState()
        const belongsToCurrentSelection =
          state.activeLayerId === layerId &&
          state.selectedKeycapIds.includes(keycapId)
        if (!belongsToCurrentSelection) {
          state.setActiveLayer(layerId)
          state.setSelectedKeycapIds([keycapId], { additive: true })
        }
        setTarget({ type: "keycap", keycapId, layerId, point })
        return
      }

      setTarget({ type: "blank", point })
    },
    [containerRef, disabled, viewport],
  )

  const addImageFilesAt = useCallback(
    async (files: readonly File[], point: CanvasPoint) => {
      const imageFiles = files.filter(
        (file) =>
          file.type.startsWith("image/") ||
          file.name.toLowerCase().endsWith(".svg"),
      )
      for (const [index, file] of imageFiles.entries()) {
        const data = await readCanvasImageFile(file)
        if (!data) continue
        const maxWidth = Math.max(20, artW - artPad * 2)
        const width = Math.min(data.width, maxWidth)
        const height = Math.round((width / data.width) * data.height)
        const assetId = useDesignUIStore.getState().addAsset(data.src)
        const source: ImageElementClipboard = {
          type: "image",
          assetId,
          x: 0,
          y: 0,
          width,
          height,
          opacity: 1,
          locked: false,
          isSvg: data.isSvg || undefined,
        }
        useDesignUIStore
          .getState()
          .addCanvasElement(
            createImageElementCopy(source, artW, artH, {
              x: point.x + index * 12,
              y: point.y + index * 12,
            }),
          )
      }
    },
    [artH, artPad, artW],
  )

  const copyKeycapStyle = useCallback(() => {
    if (target.type !== "keycap" || selectedKeycapIds.length !== 1) return
    const sourceKey = keys.find((key) => key.keyId === target.keycapId)
    if (!sourceKey) return
    const state = useDesignUIStore.getState()
    setKeycapStyleClipboard(
      createKeycapStyleTransferPatch({
        sourceKey,
        keys,
        override:
          state.layerKeycapOverrides[target.layerId]?.[target.keycapId],
        globalStyle: state.globalKeycapStyle,
        globalFontFamily: state.fontFamily,
        globalFontWeight: state.fontWeight,
        globalFontStyle: state.fontStyle,
      }),
    )
  }, [keys, selectedKeycapIds.length, target])

  const pasteKeycapStyle = useCallback(() => {
    if (!keycapStyleClipboard || !activeLayerId || keycapActionsDisabled) return
    useDesignUIStore
      .getState()
      .setMultipleKeycapOverrides(
        activeLayerId,
        selectedKeycapIds,
        keycapStyleClipboard,
      )
  }, [
    activeLayerId,
    keycapActionsDisabled,
    keycapStyleClipboard,
    selectedKeycapIds,
  ])

  const beginStyleTransfer = useCallback(() => {
    if (!activeLayerId || keycapActionsDisabled) return
    useDesignUIStore.getState().beginKeycapStyleTransfer({
      targetLayerId: activeLayerId,
      targetKeycapIds: selectedKeycapIds,
    })
  }, [activeLayerId, keycapActionsDisabled, selectedKeycapIds])

  const resetSelectedKeycaps = useCallback(() => {
    if (!activeLayerId || keycapActionsDisabled) return
    useDesignUIStore
      .getState()
      .clearMultipleKeycapOverrides(activeLayerId, selectedKeycapIds)
  }, [activeLayerId, keycapActionsDisabled, selectedKeycapIds])

  const expandSelection = useCallback(
    (mode: KeycapSelectionExpansion) => {
      if (target.type !== "keycap") return
      const next = expandKeycapSelection(
        keys,
        selectedKeycapIds,
        target.keycapId,
        mode,
      )
      useDesignUIStore
        .getState()
        .setSelectedKeycapIds(next, { additive: true })
    },
    [keys, selectedKeycapIds, target],
  )

  const selectAllKeycaps = useCallback(() => {
    useDesignUIStore
      .getState()
      .setSelectedKeycapIds(keys.map((key) => key.keyId))
  }, [keys])

  const bindSelectedImageToKeycaps = useCallback(() => {
    if (!selectedElementId || selectedKeycapIds.length === 0) return
    useDesignUIStore
      .getState()
      .setElementKeycapRestriction(selectedElementId, selectedKeycapIds)
  }, [selectedElementId, selectedKeycapIds])

  const withTargetImage = useCallback(
    (action: (image: CanvasImageElement) => void) => {
      if (!targetImage) return
      action(targetImage)
    },
    [targetImage],
  )

  const copyImage = useCallback(() => {
    withTargetImage((image) => {
      const { id: _id, ...snapshot } = image
      void _id
      setImageClipboard(snapshot)
    })
  }, [withTargetImage])

  const duplicateImage = useCallback(() => {
    withTargetImage((image) => {
      useDesignUIStore
        .getState()
        .addCanvasElement(createImageElementCopy(image, artW, artH))
    })
  }, [artH, artW, withTargetImage])

  const pasteImage = useCallback(() => {
    if (!imageClipboard) return
    useDesignUIStore
      .getState()
      .addCanvasElement(
        createImageElementCopy(imageClipboard, artW, artH, target.point),
      )
  }, [artH, artW, imageClipboard, target.point])

  const updateTargetImage = useCallback(
    (patch: Partial<Omit<CanvasImageElement, "id" | "type">>) => {
      if (!targetImage) return
      useDesignUIStore.getState().updateCanvasElement(targetImage.id, patch)
    },
    [targetImage],
  )

  const setImageClipMode = useCallback(
    (mode: "free" | "all" | "selected") => {
      if (!targetImage) return
      if (mode === "free") {
        updateTargetImage({
          clipToKeycaps: false,
          clipToKeycapId: undefined,
          clipToKeycapIds: undefined,
          clipToTopFace: undefined,
        })
      } else if (mode === "all") {
        updateTargetImage({
          clipToKeycaps: true,
          clipToKeycapId: undefined,
          clipToKeycapIds: undefined,
        })
      } else if (selectedKeycapIds.length > 0) {
        updateTargetImage({
          clipToKeycaps: true,
          clipToKeycapId: undefined,
          clipToKeycapIds: selectedKeycapIds,
        })
      }
    },
    [selectedKeycapIds, targetImage, updateTargetImage],
  )

  const restoreImageAspect = useCallback(async () => {
    if (!targetImage) return
    const src = useDesignUIStore.getState().assetMap[targetImage.assetId]
    if (!src) return
    const dimensions = await readImageDimensions(src)
    if (!dimensions) return
    useDesignUIStore.getState().updateCanvasElement(targetImage.id, {
      height: Math.round(
        targetImage.width * (dimensions.height / dimensions.width),
      ),
    })
  }, [targetImage])

  const centerTargetImage = useCallback(
    (axis: "horizontal" | "vertical") => {
      withTargetImage((image) => {
        useDesignUIStore
          .getState()
          .updateCanvasElement(
            image.id,
            centerImageOnArtboard(image, artW, artH, axis),
          )
      })
    },
    [artH, artW, withTargetImage],
  )

  const imageClipMode = useMemo(() => {
    if (!targetImage) return "free" as const
    if (
      targetImage.clipToKeycapIds?.length ||
      (targetImage.clipToKeycapId && targetImage.clipToKeycaps !== false)
    ) {
      return "selected" as const
    }
    return targetImage.clipToKeycaps ? ("all" as const) : ("free" as const)
  }, [targetImage])

  return {
    target,
    handleContextMenuCapture,
    addImageFilesAt,
    selectedKeycapIds,
    selectedElementId,
    targetImage,
    targetImageIndex,
    canvasElementCount: canvasElements.length,
    imageClipMode,
    keycapActionsDisabled,
    hasSelectedKeycapOverrides,
    hasKeycapStyleClipboard: keycapStyleClipboard !== null,
    hasImageClipboard: imageClipboard !== null,
    canUndo: pastCount > 0,
    canRedo: futureCount > 0,
    show3dPreview,
    copyKeycapStyle,
    pasteKeycapStyle,
    beginStyleTransfer,
    resetSelectedKeycaps,
    expandSelection,
    selectAllKeycaps,
    clearSelection: useDesignUIStore.getState().clearSelection,
    bindSelectedImageToKeycaps,
    copyImage,
    duplicateImage,
    pasteImage,
    updateTargetImage,
    setImageClipMode,
    restoreImageAspect,
    centerTargetImage,
    removeTargetImage: () =>
      targetImage &&
      useDesignUIStore.getState().removeCanvasElement(targetImage.id),
    reorderTargetImage: (
      direction: "up" | "down" | "front" | "back",
    ) =>
      targetImage &&
      useDesignUIStore
        .getState()
        .reorderCanvasElement(targetImage.id, direction),
    undo: useDesignUIStore.temporal.getState().undo,
    redo: useDesignUIStore.temporal.getState().redo,
    toggleShow3dPreview: useDesignUIStore.getState().toggleShow3dPreview,
  }
}
