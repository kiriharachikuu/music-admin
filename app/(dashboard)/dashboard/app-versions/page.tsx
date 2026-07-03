"use client";

// XingTone - App版本管理
// 列表（版本号/版本名称/平台/渠道/强制更新/状态/下载量/操作）+ 分页
// 新增/编辑 Dialog 表单 + 删除二次确认
// 对接 CRUD /api/admin/app-versions
import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { request } from "@/lib/api";
import type { AppVersion, PageResult } from "@/lib/types";
import { formatDateTime, formatFileSize } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { CHANNEL_OPTIONS, PLATFORM_OPTIONS, STATUS_OPTIONS } from "./schema";
import { VersionFormDialog } from "./version-form-dialog";

export default function AppVersionsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<AppVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const [filterChannel, setFilterChannel] = useState<string>("");
  const [filterPlatform, setFilterPlatform] = useState<string>("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppVersion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppVersion | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<AppVersion>>({
        method: "GET",
        url: "/admin/app-versions",
        params: {
          page,
          pageSize,
          channel: filterChannel || undefined,
          platform: filterPlatform || undefined,
        },
      });
      const list = res.list ?? [];
      setData(list);
      setTotal(res.total ?? 0);
      // 删除当前页最后一项后可能停留在空页：若当前页为空且非首页，回退一页触发 effect 自动 refetch
      if (list.length === 0 && page > 1) {
        setPage(page - 1);
      }
    } catch (err) {
      toast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, filterChannel, filterPlatform, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(item: AppVersion) {
    setEditing(item);
    setSelectedRowKey(item.id);
    setFormOpen(true);
  }

  async function handleDelete(item: AppVersion) {
    try {
      await request({
        method: "DELETE",
        url: `/admin/app-versions/${item.id}`,
      });
      toast({ title: "删除成功" });
      setDeleteTarget(null);
      void loadList();
    } catch (err) {
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  const columns: DataTableColumn<AppVersion>[] = [
    {
      key: "versionCode",
      title: "版本号",
      width: 100,
      render: (r) => <span className="font-mono">{r.versionCode}</span>,
    },
    {
      key: "versionName",
      title: "版本名称",
      render: (r) => (
        <div>
          <div className="font-medium">{r.versionName}</div>
          {r.title && (
            <div className="text-xs text-muted-foreground">{r.title}</div>
          )}
        </div>
      ),
    },
    {
      key: "platform",
      title: "平台",
      width: 100,
      render: (r) => {
        const opt = PLATFORM_OPTIONS.find((o) => o.value === r.platform);
        return <Badge variant="outline">{opt?.label ?? r.platform}</Badge>;
      },
    },
    {
      key: "channel",
      title: "渠道",
      width: 100,
      render: (r) => {
        const opt = CHANNEL_OPTIONS.find((o) => o.value === r.channel);
        return (
          <Badge variant={r.channel === "stable" ? "default" : "secondary"}>
            {opt?.label ?? r.channel}
          </Badge>
        );
      },
    },
    {
      key: "forceUpdate",
      title: "强制更新",
      width: 100,
      render: (r) =>
        r.forceUpdate ? (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            强制
          </Badge>
        ) : (
          <span className="text-muted-foreground">否</span>
        ),
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (r) => {
        const opt = STATUS_OPTIONS.find((o) => o.value === r.status);
        let variant: "default" | "secondary" | "outline" = "default";
        if (r.status === "draft") variant = "secondary";
        if (r.status === "deprecated") variant = "outline";
        return <Badge variant={variant}>{opt?.label ?? r.status}</Badge>;
      },
    },
    {
      key: "fileSize",
      title: "文件大小",
      width: 120,
      render: (r) => formatFileSize(r.fileSize),
    },
    {
      key: "downloadCount",
      title: "下载量",
      width: 100,
      render: (r) => r.downloadCount.toLocaleString(),
    },
    {
      key: "createdAt",
      title: "发布时间",
      width: 180,
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: "actions",
      title: "操作",
      width: 160,
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(r.downloadUrl, "_blank")}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="App 版本管理"
        description="管理 Android/iOS/桌面端应用版本发布与更新"
        actions={
          <Button onClick={handleAdd} className="bg-primary-700 text-white hover:bg-primary-600">
            <Plus className="mr-2 h-4 w-4" />
            发布新版本
          </Button>
        }
      />

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">平台：</span>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {PLATFORM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">渠道：</span>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {CHANNEL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => row.id}
        selectedRowKey={selectedRowKey}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        emptyText="暂无版本记录"
      />

      {/* 新增/编辑 Dialog */}
      <VersionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSuccess={() => {
          setFormOpen(false);
          void loadList();
        }}
      />

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="确认删除"
        description={`确定要删除版本 ${deleteTarget?.versionName} (${deleteTarget?.versionCode}) 吗？此操作不可撤销。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
