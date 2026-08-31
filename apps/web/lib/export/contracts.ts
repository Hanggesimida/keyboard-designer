export interface TextDescriptor {
  id: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight?: number
  fontStyle?: string
  lines: string[]
  lineHeightRatio: number
  letterSpacing: number
  fill: string
}

export interface PathResult {
  id: string
  pathD: string | null
}

export interface GlobalKeycapStyle {
  color?: string
  bgColor?: string
  topColor?: string
  fontSize?: number
  labelColor?: string
}

export interface KeycapOverride {
  color?: string
  bgColor?: string
  topColor?: string
  labelText?: string
  labelColor?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: number
  fontStyle?: string
  letterSpacing?: number
  lineHeightRatio?: number
  labelOffsetX?: number
  labelOffsetY?: number
  borderColor?: string
  borderHidden?: boolean
}

export interface ExportCanvasElement {
  type: string
  id: string
  x: number
  y: number
  width: number
  height: number
  src?: string
  opacity?: number
  rotation?: number
  clipToKeycapId?: string
  clipToKeycapIds?: string[]
  clipToTopFace?: boolean
  clipToKeycaps?: boolean
}

export interface DesignPayload {
  version?: number
  templateId: string
  artboardBackground?: string
  fontFamily?: string
  globalKeycapStyle?: GlobalKeycapStyle
  layers?: Array<{ id: string; labelsHidden?: boolean }>
  layerKeycapOverrides?: Record<string, Record<string, KeycapOverride>>
  canvasElements?: ExportCanvasElement[]
}

export interface ExportFacade {
  textsToPaths(texts: TextDescriptor[]): Promise<{ results: PathResult[] }>
  generateJig(design: DesignPayload): Promise<Blob>
}
