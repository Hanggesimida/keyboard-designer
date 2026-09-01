"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { HexColorPicker } from "@/modules/design/components/pickers/HexColorPicker"

function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

interface HexColorFieldProps {
  id: string
  label: string
  value: string
  onChange: (hex: string) => void
}

export function HexColorField({ id, label, value, onChange }: HexColorFieldProps) {
  const [hexInput, setHexInput] = useState(value)

  useEffect(() => {
    setHexInput(value)
  }, [value])

  const handleHexChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHexInput(val)
    if (isValidHex(val)) onChange(val)
  }

  const handlePickerChange = (hex: string) => {
    setHexInput(hex)
    onChange(hex)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={id}
        className="text-[11px] font-normal text-muted-foreground"
      >
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <HexColorPicker value={value} onChange={handlePickerChange} />
        <Input
          id={id}
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={() => {
            if (!isValidHex(hexInput)) setHexInput(value)
          }}
          spellCheck={false}
          maxLength={7}
          className="h-7 flex-1 font-mono text-xs"
        />
      </div>
    </div>
  )
}
