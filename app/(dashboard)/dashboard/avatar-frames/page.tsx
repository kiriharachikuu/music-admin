"use client";

// XingTone - 头像框管理
// 列表（佩戴效果预览/名称/佩戴人数/排序/状态/操作）+ 分页
// 排序：上下移动按钮调整 sort
// 上下架：Switch 切换 status VISIBLE/HIDDEN
// 新增/编辑 Dialog（名称/框图上传/排序/状态）+ 删除二次确认
// 对接 CRUD /api/admin/avatar-frames，排序 /api/admin/avatar-frames/:id/sort
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/utils";
import type { AvatarFrame, AvatarFrameStatus, PageResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { AvatarFrameFormDialog } from "./form-dialog";

/** 佩戴效果预览：圆形底像 + 框图叠加（与客户端渲染方式一致） */
function FramePreview({ frame }: { frame: AvatarFrame }) {
  return (
    <div className="relative h-14 w-14">
      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-muted">
        <UserRound className="h-7 w-7 text-muted-foreground/50" />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveMediaUrl(frame.imageUrl)}
        alt={frame.name}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[116%] w-[116%] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
    </div>
  );
}

export default function AvatarFramesPage() {
  const { toast } = useToast();

  const [data, setData] = useState<AvatarFrame[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20; // 头像框通常不多，单页多放些
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  // 正在切换状态的 frame id（用于禁用 Switch）
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // 正在排序的 frame id
  const [movingId, setMovingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AvatarFrame | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AvatarFrame | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<AvatarFrame> | AvatarFrame[]>({
        method: "GET",
        url: "/admin/avatar-frames",
        params: { page, limit: pageSize },
      });
      if (Array.isArray(res)) {
        setData(res);
        setTotal(res.length);
      } else {
        setData(res.list ?? []);
        setTotal(res.total ?? 0);
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
  }, [page, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function handleEdit(frame: AvatarFrame) {
    setEditing(frame);
    setSelectedRowKey(frame.id);
    setFormOpen(true);
  }

  // 上下架切换
  async function handleToggleStatus(frame: AvatarFrame) {
    const next: AvatarFrameStatus =
      frame.status === "VISIBLE" ? "HIDDEN" : "VISIBLE";
    setTogglingId(frame.id);
    try {
      await request({
        method: "PUT",
        url: `/admin/avatar-frames/${frame.id}`,
        data: { status: next },
      });
      toast({ title: next === "VISIBLE" ? "已上架" : "已下架" });
      void loadList();
    } catch (err) {
      toast({
        title: "操作失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  }

  // 上下移动排序
  async function handleMove(frame: AvatarFrame, direction: "up" | "down") {
    setMovingId(frame.id);
    try {
      await request({
        method: "PUT",
        url: `/admin/avatar-frames/${frame.id}/sort`,
        data: { direction },
      });
      void loadList();
    } catch (err) {
      toast({
        title: "排序失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setMovingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({
        method: "DELETE",
        url: `/admin/avatar-frames/${deleteTarget.id}`,
      });
      toast({ title: "删除成功，已佩戴用户将自动摘除该头像框" });
      setDeleteTarget(null);
      if (data.length === 1 && page > 1) setPage(page - 1);
      else void loadList();
    } catch (err) {
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  const columns: DataTableColumn<AvatarFrame>[] = [
    {
      key: "preview",
      title: "预览",
      width: 90,
      render: (row) => <FramePreview frame={row} />,
    },
    {
      key: "name",
      title: "名称",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "users",
      title: "佩戴人数",
      width: 100,
      render: (row) => <span>{row._count?.users ?? 0}</span>,
    },
    {
      key: "sort",
      title: "排序",
      width: 100,
      render: (row) => (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{row.sort}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleMove(row, "up")}
            disabled={movingId === row.id}
            aria-label="上移"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleMove(row, "down")}
            disabled={movingId === row.id}
            aria-label="下移"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 110,
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* 上下架 Switch：开启态 primary-700 */}
          <Switch
            checked={row.status === "VISIBLE"}
            onCheckedChange={() => handleToggleStatus(row)}
            disabled={togglingId === row.id}
          />
          {row.status === "VISIBLE" ? (
            <Badge className="bg-primary-700 hover:bg-primary-700">上架</Badge>
          ) : (
            <Badge variant="secondary">下架</Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 120,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleEdit(row)}
            aria-label="编辑"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
            aria-label="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="头像框管理"
        description="用户头像挂件素材配置，佩戴后多端同步显示"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            新增头像框
          </Button>
        }
      />

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
        showPagination={total > pageSize}
      />

      <AvatarFrameFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditing(null);
            setSelectedRowKey(null);
          }
        }}
        editing={editing}
        onSuccess={() => {
          setFormOpen(false);
          setEditing(null);
          setSelectedRowKey(null);
          void loadList();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="删除头像框"
        description={
          deleteTarget
            ? `确定要删除头像框「${deleteTarget.name}」吗？当前佩戴人数 ${deleteTarget._count?.users ?? 0}，删除后这些用户将自动摘除，此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
