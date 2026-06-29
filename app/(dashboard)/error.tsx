"use client";

// 捕获 dashboard 路由组下的客户端渲染错误，显示详细信息便于定位
import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 将错误输出到控制台，便于开发者定位
    console.error("[Dashboard Error Boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">页面渲染出错</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "发生未知错误"}
        </p>
      </div>
      {/* 展示错误堆栈，便于定位根因 */}
      {error.stack && (
        <pre className="max-h-48 w-full max-w-2xl overflow-auto rounded-lg border border-border/60 bg-muted/40 p-3 text-left text-xs text-muted-foreground">
          {error.stack}
        </pre>
      )}
      {error.digest && (
        <p className="text-xs text-muted-foreground">digest: {error.digest}</p>
      )}
      <Button onClick={reset} className="mt-2">
        <RotateCcw className="h-4 w-4" />
        重试
      </Button>
    </div>
  );
}
