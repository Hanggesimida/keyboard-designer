"use client"

import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"
import { CanvasImagesSection } from "./CanvasImagesSection"
import { KeycapLayersSection } from "./KeycapLayersSection"

export function LayersSection() {
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const layers = useDesignUIStore((s) => s.layers)

  const isEmpty = canvasElements.length === 0 && layers.length === 0

  return (
    <TooltipProvider delayDuration={300}>
      <PanelSection title="图层">
        {isEmpty && (
          <p className="py-2 text-center text-[11px] text-muted-foreground">
            暂无图层
          </p>
        )}
        <div className="flex flex-col gap-2">
          <CanvasImagesSection />
          <KeycapLayersSection />
        </div>
      </PanelSection>
    </TooltipProvider>
  )
}
