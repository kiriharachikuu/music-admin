"use client";

// XingTone - 操作日志（运维审计）
// 只读列表：时间 / 用户名 / 操作类型 / 资源 / 资源ID / 详情 / IP
// 按操作类型下拉过滤 + 分页
// 对接 GET /api/admin/logs
import { useCallback, useEffect, useState } from "react";

import { request } from "@/lib/api";
import type { OperationLog, PageResult } from "@/lib/types";
import { formatDateTime } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 操作类型 → 中文文案
const ACTION_LABEL: Record<string, string> = {
  CREATE: "新建",
  UPDATE: "更新",
  DELETE: "删除",
};

// 操作类型 Badge：按操作语义着色（新建-绿 / 更新-紫 / 删除-红）
function ActionBadge({ action }: { action: string }) {
  const label = ACTION_LABEL[action] ?? action;
  if (action === "CREATE") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">{label}</Badge>;
  }
  if (action === "UPDATE") {
    return <Badge className="bg-primary-700 hover:bg-primary-700">{label}</Badge>;
  }
  if (action === "DELETE") {
    return <Badge variant="destructive">{label}</Badge>;
  }
  return <Badge variant="secondary">{label}</Badge>;
}

export default function LogsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<OperationLog>>({
        method: "GET",
        url: "/admin/logs",
        params: {
          page,
          pageSize,
          action: actionFilter !== "ALL" ? actionFilter : undefined,
        },
      });
      setData(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      toast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  // 筛选变化时回到第一页
  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  const columns: DataTableColumn<OperationLog>[] = [
    {
      key: "createdAt",
      title: "时间",
      width: 160,
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "username",
      title: "用户名",
      width: 120,
      render: (row) => (
        <span className="font-medium">{row.username ?? "-"}</span>
      ),
    },
    {
      key: "action",
      title: "操作类型",
      width: 100,
      render: (row) => <ActionBadge action={row.action} />,
    },
    {
      key: "resource",
      title: "资源",
      width: 110,
      render: (row) => row.resource ?? "-",
    },
    {
      key: "resourceId",
      title: "资源ID",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.resourceId ?? "-"}
        </span>
      ),
    },
    {
      key: "detail",
      title: "详情",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.detail ?? "-"}
        </span>
      ),
    },
    {
      key: "ip",
      title: "IP",
      width: 140,
      render: (row) => (
        <span className="text-muted-foreground">{row.ip ?? "-"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="操作日志"
        description="查看后台管理操作的审计记录"
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => row.id}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        emptyText="暂无操作记录"
        filters={
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="操作类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部操作</SelectItem>
              <SelectItem value="CREATE">新建</SelectItem>
              <SelectItem value="UPDATE">更新</SelectItem>
              <SelectItem value="DELETE">删除</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}
