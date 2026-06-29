// 指标卡片：标题 + 大号数值 + 图标 + 可选趋势
// 用于数据看板顶部 4 个核心指标
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  // 趋势百分比，正数绿色上升，负数红色下降
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  loading,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="truncate text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              // 数值大号高亮 primary-700
              <p className="truncate text-3xl font-bold text-primary-700">
                {value}
              </p>
            )}
            {typeof trend === "number" && !loading && (
              <div className="flex items-center gap-1 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    trend >= 0 ? "text-emerald-600" : "text-destructive"
                  )}
                >
                  {trend >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(trend)}%
                </span>
                {trendLabel && (
                  <span className="text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          {/* 图标圆角徽标，primary-100 亮 / primary-900/30 暗 */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/30">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
