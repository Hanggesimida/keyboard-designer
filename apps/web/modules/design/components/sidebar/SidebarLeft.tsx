"use client"

import { PanelChrome } from "./panel-chrome"
import { TemplateSection } from "./sections/left/TemplateSection"
import { LayersSection } from "./sections/left/LayersSection"
import { AssetSection } from "./sections/left/AssetSection"
import { DesignListSection } from "./sections/left/DesignListSection"

export function DesignSidebarLeft() {
  return (
    <PanelChrome side="left">
      <DesignListSection />
      <TemplateSection />
      <AssetSection />
      <LayersSection />
    </PanelChrome>
  )
}
