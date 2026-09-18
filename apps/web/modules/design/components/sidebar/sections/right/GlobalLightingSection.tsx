"use client"

import { useTranslations } from "next-intl"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { HexColorPicker } from "@/modules/design/components/pickers/HexColorPicker"
import {
  BACKLIGHT_MODES,
  LIGHTING_DIRECTIONS,
  LIGHTING_EFFECT_MODES,
  isAnimatedLightingMode,
  lightingUsesBaseColor,
  lightingUsesDirection,
  type BacklightMode,
  type BacklightSettings,
  type LightingChannelId,
  type LightingChannelSettings,
  type LightingDirection,
  type LightingEnvironment,
} from "@/modules/design/lib/design/lighting"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"

interface LightingChannelEditorProps {
  channel: LightingChannelId
  settings: LightingChannelSettings | BacklightSettings
  onChange: (
    channel: LightingChannelId,
    patch: Partial<BacklightSettings>,
  ) => void
  modes: readonly BacklightMode[]
}

function LightingChannelEditor({
  channel,
  settings,
  onChange,
  modes,
}: LightingChannelEditorProps) {
  const t = useTranslations("Design.inspector")
  const percentage = Math.round(settings.intensity * 100)
  const speedPercentage = Math.round(settings.speed * 100)
  const inputId = `lighting-${channel}`
  const mode = settings.mode
  const direction = settings.direction ?? "ltr"
  const showColor = lightingUsesBaseColor(mode)
  const showSpeed = isAnimatedLightingMode(mode)
  const showDirection = lightingUsesDirection(mode)
  const hintKey =
    mode === "onPress" || isAnimatedLightingMode(mode)
      ? (`lighting.${mode}Hint` as const)
      : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={inputId}
          className="cursor-pointer text-[11px] font-medium text-sidebar-foreground"
        >
          {t(`lighting.${channel}`)}
        </Label>
        <Switch
          id={inputId}
          size="sm"
          checked={settings.enabled}
          onCheckedChange={(checked) => onChange(channel, { enabled: checked })}
        />
      </div>

      <div
        className={`flex flex-col gap-2 ${
          settings.enabled ? "" : "pointer-events-none opacity-50"
        }`}
        aria-disabled={!settings.enabled}
      >
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] text-muted-foreground">
            {t("lighting.mode")}
          </Label>
          <Select
            value={mode}
            disabled={!settings.enabled}
            onValueChange={(value) => {
              if (modes.includes(value as BacklightMode)) {
                onChange(channel, { mode: value as BacklightMode })
              }
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs shadow-none">
              <SelectValue>{t(`lighting.modes.${mode}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {modes.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`lighting.modes.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hintKey ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t(hintKey)}
            </p>
          ) : null}
        </div>

        {showColor ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-[72px]">{t("lighting.color")}</span>
            <HexColorPicker
              value={settings.color}
              allowGradient={false}
              onChange={(color) => onChange(channel, { color })}
            />
          </div>
        ) : null}

        <div className="grid grid-cols-[72px_1fr_32px] items-center gap-2 text-[11px] text-muted-foreground">
          <span>{t("lighting.intensity")}</span>
          <Slider
            value={[percentage]}
            min={0}
            max={100}
            step={1}
            disabled={!settings.enabled}
            aria-label={t("lighting.intensity")}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value
              if (typeof next === "number") {
                onChange(channel, { intensity: next / 100 })
              }
            }}
          />
          <span className="text-right tabular-nums">{percentage}%</span>
        </div>

        {showSpeed ? (
          <div className="grid grid-cols-[72px_1fr_32px] items-center gap-2 text-[11px] text-muted-foreground">
            <span>{t("lighting.speed")}</span>
            <Slider
              value={[speedPercentage]}
              min={0}
              max={100}
              step={1}
              disabled={!settings.enabled}
              aria-label={t("lighting.speed")}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value
                if (typeof next === "number") {
                  onChange(channel, { speed: next / 100 })
                }
              }}
            />
            <span className="text-right tabular-nums">{speedPercentage}%</span>
          </div>
        ) : null}

        {showDirection ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] text-muted-foreground">
              {t("lighting.direction")}
            </Label>
            <Select
              value={direction}
              disabled={!settings.enabled}
              onValueChange={(value) => {
                if (LIGHTING_DIRECTIONS.includes(value as LightingDirection)) {
                  onChange(channel, { direction: value as LightingDirection })
                }
              }}
            >
              <SelectTrigger size="sm" className="h-8 w-full text-xs shadow-none">
                <SelectValue>
                  {t(`lighting.directions.${direction}`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LIGHTING_DIRECTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`lighting.directions.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function GlobalLightingSection() {
  const t = useTranslations("Design.inspector")
  const lighting = useDesignUIStore((state) => state.lightingSettings)
  const setEnvironment = useDesignUIStore(
    (state) => state.setLightingEnvironment,
  )
  const updateChannel = useDesignUIStore(
    (state) => state.updateLightingChannel,
  )

  return (
    <PanelSection title={t("lighting.title")} collapsible>
      <div className="flex flex-col gap-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("lighting.hint")}
        </p>

        <div className="flex flex-col gap-2">
          <Label className="text-[11px] font-medium text-sidebar-foreground">
            {t("lighting.environment")}
          </Label>
          <Select
            value={lighting.environment}
            onValueChange={(value) => {
              if (value === "studio" || value === "dark") {
                setEnvironment(value as LightingEnvironment)
              }
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-xs shadow-none">
              <SelectValue>
                {t(`lighting.environments.${lighting.environment}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="studio">
                {t("lighting.environments.studio")}
              </SelectItem>
              <SelectItem value="dark">
                {t("lighting.environments.dark")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <LightingChannelEditor
          channel="underglow"
          settings={lighting.underglow}
          onChange={updateChannel}
          modes={LIGHTING_EFFECT_MODES}
        />
        <LightingChannelEditor
          channel="backlight"
          settings={lighting.backlight}
          onChange={updateChannel}
          modes={BACKLIGHT_MODES}
        />
      </div>
    </PanelSection>
  )
}
