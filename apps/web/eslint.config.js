import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    files: ["**/preview3d/**/*.{ts,tsx}"],
    rules: {
      // R3F / Three.js 的 attach、args、position 等不是 DOM 属性
      "react/no-unknown-property": "off",
      // 在 effect / 指针回调里改 uniform、材质、cursor 是 Three.js 常规用法
      "react-hooks/immutability": "off",
    },
  },
]
