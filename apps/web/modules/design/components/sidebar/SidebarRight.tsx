"use client"

import { PanelChrome } from "./panel-chrome"
import { ArtboardSection } from "./sections/right/ArtboardSection"
import { GlobalKeycapSection } from "./sections/right/GlobalKeycapSection"
import { KeycapInspectorSection } from "./sections/right/KeycapInspectorSection"

export function DesignSidebarRight() {
  return (
    <PanelChrome side="right">
      <ArtboardSection />
      <GlobalKeycapSection />
      <KeycapInspectorSection />
    </PanelChrome>
  )
}
