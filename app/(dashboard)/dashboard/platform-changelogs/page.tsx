"use client";

// XingTone 管理后台 - 平台 Web 端更新日志
// 对接 CRUD /api/admin/platform-changelogs
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { request } from "@/lib/api";
import type { PlatformChangelog, PageResult } from "@/lib/types";
import { formatDateTime } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { STATUS_OPTIONS } from "./schema";
import { ChangelogFormDialog } from "./changelog-form-dialog";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "已发布", variant: "default" },
  draft: { label: "草稿", variant: "secondary" },
};

export default function PlatformChangelogsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<PlatformChangelog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformChangelog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlatformChangelog | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<PlatformChangelog>>({
        method: "GET",
        url: "/admin/platform-changelogs",
        params: {
          page,
          pageSize,
          status: filterStatus || undefined,
        },
      });
      const list = res.list ?? [];
      setData(list);
      setTotal(res.total ?? 0);
      if (list.length === 0 && page > 1) setPage(page - 1);
    } catch (err) {
      toast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(item: PlatformChangelog) {
    setEditing(item);
    setSelectedRowKey(item.id);
    setFormOpen(true);
  }

  async function handleDelete(item: PlatformChangelog) {
    try {
      await request({
        method: "DELETE",
        url: `/admin/platform-changelogs/${item.id}`,
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

  const columns: DataTableColumn<PlatformChangelog>[] = [
    {
      key: "versionCode",
      title: "版本码",
      width: 100,
      render: (r) => <span className="font-mono">{r.versionCode}</span>,
    },
    {
      key: "version",
      title: "版本号",
      width: 120,
      render: (r) => <span className="font-medium">{r.version}</span>,
    },
    {
      key: "title",
      title: "标题",
      render: (r) => (
        <div>
          <div className="font-medium">{r.title ?? "—"}</div>
          {r.content.length > 0 && (
            <div className="line-clamp-2 text-xs text-muted-foreground">
              {r.content[0]}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "contentCount",
      title: "条目数",
      width: 100,
      render: (r) => <span className="text-muted-foreground">{r.content.length}</span>,
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (r) => {
        const conf = STATUS_LABELS[r.status] ?? { label: r.status, variant: "outline" as const };
        return <Badge variant={conf.variant}>{conf.label}</Badge>;
      },
    },
    {
      key: "releaseDate",
      title: "发布日期",
      width: 180,
      render: (r) => formatDateTime(r.releaseDate),
    },
    {
      key: "actions",
      title: "操作",
      width: 160,
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(r)}
            className="h-8 gap-1 text-primary-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(r)}
            className="h-8 gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="平台更新日志"
          description="管理 Web 平台版本号与更新内容（前端 /about/changelog 将自动同步）"
        />
        <div className="flex items-center gap-2">
          <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} className="h-9 gap-1.5">
            <Plus className="h-4 w-4" />
            新增版本
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => row.id}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        emptyText="暂无平台更新日志"
      />

      <ChangelogFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSuccess={() => {
          setFormOpen(false);
          setSelectedRowKey(null);
          void loadList();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="删除平台更新日志"
        description={deleteTarget ? `确定要删除版本 ${deleteTarget.version} 吗？此操作不可恢复。` : ""}
        confirmText="删除"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
