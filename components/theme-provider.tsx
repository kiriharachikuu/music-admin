"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// 主题提供者：包装 next-themes，默认暗色，支持跟随系统
// 通过 React.ComponentProps 推断 props 类型，避免依赖 next-thenes 具体导出路径
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
