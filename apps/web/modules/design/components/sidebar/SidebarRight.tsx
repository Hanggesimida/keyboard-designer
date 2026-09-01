"use client"

import { PanelChrome } from "./panel-chrome"
import { KeycapInfoSection } from "./sections/right/KeycapInfoSection"
import { GlobalKeycapSection } from "./sections/right/GlobalKeycapSection"
import { KeycapInspectorSection } from "./sections/right/KeycapInspectorSection"

export function DesignSidebarRight() {
  return (
    <PanelChrome side="right">
      <KeycapInfoSection />
      <GlobalKeycapSection />
      <KeycapInspectorSection />
    </PanelChrome>
  )
}
