"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"

interface Preview3DErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
}

interface Preview3DErrorBoundaryState {
  error: Error | null
}

function Preview3DErrorFallback({
  error,
  onRetry,
}: {
  error: Error
  onRetry: () => void
}) {
  const t = useTranslations("Design.preview3d")

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="text-sm text-foreground">{t("loadFailed")}</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {error.message || t("webglError")}
      </p>
      <Button type="button" variant="outline" size="xs" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  )
}

/** 捕获 3D 预览渲染/WebGL 错误，避免拖垮整个设计器 */
export class Preview3DErrorBoundary extends Component<
  Preview3DErrorBoundaryProps,
  Preview3DErrorBoundaryState
> {
  state: Preview3DErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): Preview3DErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Preview3D] 渲染失败:", error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ error: null })
    this.props.onRetry?.()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <Preview3DErrorFallback error={error} onRetry={this.handleRetry} />
    )
  }
}
