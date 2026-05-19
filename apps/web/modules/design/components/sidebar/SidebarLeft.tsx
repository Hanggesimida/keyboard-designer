"use client"

import { PanelChrome } from "./panel-chrome"
import { TemplateSection } from "./sections/left/TemplateSection"
import { LayersSection } from "./sections/left/LayersSection"
import { AssetSection } from "./sections/left/AssetSection"

export function DesignSidebarLeft() {
  return (
    <PanelChrome side="left">
      <TemplateSection />
      <AssetSection />
      <LayersSection />
    </PanelChrome>
  )
}
