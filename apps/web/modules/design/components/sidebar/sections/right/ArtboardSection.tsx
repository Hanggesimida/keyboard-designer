"use client"

import { useEffect, useState } from "react"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { HexColorPicker } from "@/modules/design/components/pickers/HexColorPicker"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"

function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function ArtboardSection() {
  const artboardBackground = useDesignUIStore((s) => s.artboardBackground)
  const setArtboardBackground = useDesignUIStore(
    (s) => s.setArtboardBackground,
  )

  const [hexInput, setHexInput] = useState(artboardBackground)

  useEffect(() => {
    setHexInput(artboardBackground)
  }, [artboardBackground])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHexInput(val)
    if (isValidHex(val)) setArtboardBackground(val)
  }

  const handlePickerChange = (hex: string) => {
    setHexInput(hex)
    setArtboardBackground(hex)
  }

  return (
    <PanelSection title="画板" first collapsible defaultOpen={false}>
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="artboard-bg-hex"
          className="text-[11px] font-normal text-muted-foreground"
        >
          背景色
        </Label>
        <div className="flex items-center gap-2">
          <HexColorPicker
            value={artboardBackground}
            onChange={handlePickerChange}
          />

          <Input
            id="artboard-bg-hex"
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            onBlur={() => {
              if (!isValidHex(hexInput)) setHexInput(artboardBackground)
            }}
            spellCheck={false}
            maxLength={7}
            className="h-7 flex-1 font-mono text-xs"
          />
        </div>
      </div>
    </PanelSection>
  )
}
