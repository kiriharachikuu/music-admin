"use client";

// 通用数据表格：列配置 + 分页 + 搜索 + 筛选区 + 选中行高亮
// 各业务页面传入 columns、data、分页状态与回调即可复用
import { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  // 列唯一标识
  key: string;
  // 表头标题
  title: string;
  // 自定义单元格渲染
  render?: (row: T, index: number) => ReactNode;
  // 单元格类名
  className?: string;
  // 表头类名
  headClassName?: string;
  // 列宽
  width?: string | number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  // 行 key 取值
  rowKey: (row: T) => string;
  // 选中行 id（用于高亮，亮色 primary-50 / 暗色 primary-900/20）
  selectedRowKey?: string | null;
  // 分页
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  // 搜索（受控）
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  // 筛选区（任意 ReactNode，例如 Select）
  filters?: ReactNode;
  // 顶部右侧操作区（如新增按钮）
  toolbar?: ReactNode;
  // 空状态文案
  emptyText?: string;
  // 是否显示分页（默认显示）
  showPagination?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  rowKey,
  selectedRowKey,
  page,
  pageSize,
  total,
  onPageChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = "搜索...",
  filters,
  toolbar,
  emptyText = "暂无数据",
  showPagination = true,
}: DataTableProps<T>) {
  // 总页数（至少 1 页，避免分页器显示 0）
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showToolbar = !!onSearchChange || !!filters || !!toolbar;

  return (
    <div className="space-y-3">
      {/* 顶部工具栏：搜索 + 筛选 + 操作 */}
      {showToolbar && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {onSearchChange && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-8"
                />
              </div>
            )}
            {filters}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* 表格主体 */}
      <div className="rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(col.headClassName)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // 加载骨架：渲染与列数一致的骨架行
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="h-6 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const key = rowKey(row);
                const selected = selectedRowKey === key;
                return (
                  <TableRow
                    key={key}
                    // 选中行背景：亮色 primary-50 / 暗色 primary-900/20
                    className={cn(
                      selected &&
                        "bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(col.className)}
                      >
                        {col.render
                          ? col.render(row, index)
                          : String((row as Record<string, unknown>)[col.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页器 */}
      {showPagination && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            共 {total} 条 · 第 {page} / {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
