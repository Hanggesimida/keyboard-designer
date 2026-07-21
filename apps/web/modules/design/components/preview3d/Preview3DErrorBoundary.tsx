"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@workspace/ui/components/button"

interface Preview3DErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
}

interface Preview3DErrorBoundaryState {
  error: Error | null
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
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-foreground">3D 预览加载失败</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {error.message || "WebGL 上下文异常，请重试或关闭预览。"}
        </p>
        <Button type="button" variant="outline" size="xs" onClick={this.handleRetry}>
          重试
        </Button>
      </div>
    )
  }
}
