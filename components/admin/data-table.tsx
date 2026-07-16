"use client";

// 通用数据表格：列配置 + 分页 + 搜索 + 筛选区 + 选中行高亮 + 多选
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
  key: string;
  title: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  headClassName?: string;
  width?: string | number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  rowKey: (row: T) => string;
  selectedRowKey?: string | null;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  toolbar?: ReactNode;
  emptyText?: string;
  showPagination?: boolean;
  selectable?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  batchActions?: ReactNode;
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
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  batchActions,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showToolbar = !!onSearchChange || !!filters || !!toolbar;
  const colCount = columns.length + (selectable ? 1 : 0);

  const allSelected = data.length > 0 && data.every((row) => selectedRowKeys.includes(rowKey(row)));
  const someSelected = data.some((row) => selectedRowKeys.includes(rowKey(row)));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedRowKeys.filter((k) => !data.some((row) => rowKey(row) === k)));
    } else {
      const currentKeys = data.map(rowKey);
      const merged = Array.from(new Set([...selectedRowKeys, ...currentKeys]));
      onSelectionChange(merged);
    }
  };

  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    if (selectedRowKeys.includes(key)) {
      onSelectionChange(selectedRowKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedRowKeys, key]);
    }
  };

  return (
    <div className="space-y-3">
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

      {selectable && selectedRowKeys.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            已选择 <span className="font-medium text-primary">{selectedRowKeys.length}</span> 项
          </span>
          {batchActions && <div className="flex items-center gap-2">{batchActions}</div>}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer rounded border-border accent-primary-700"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                    onChange={toggleAll}
                    disabled={loading || data.length === 0}
                  />
                </TableHead>
              )}
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
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
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
                  colSpan={colCount}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const key = rowKey(row);
                const selected = selectedRowKey === key || selectedRowKeys.includes(key);
                return (
                  <TableRow
                    key={key}
                    className={cn(
                      selected &&
                        "bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-border accent-primary-700"
                          checked={selectedRowKeys.includes(key)}
                          onChange={() => toggleRow(key)}
                        />
                      </TableCell>
                    )}
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
