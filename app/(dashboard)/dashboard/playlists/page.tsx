"use client";

// XingTone - 歌单管理
// 列表（封面/名称/创建者/歌曲数/播放量/公开/操作）+ 搜索 + 分页
// 编辑：基础信息 Dialog（名称/描述/封面/公开）
// 管理歌曲 Dialog：添加/移除歌曲 + 上下移动排序
// 对接 CRUD /api/admin/playlists，歌单歌曲 /api/admin/playlists/:id/songs
import { useCallback, useEffect, useState } from "react";
import {
  ListMusic,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/utils";
import type { PageResult, Playlist } from "@/lib/types";
import { formatPlays, useDebounced } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { PlaylistFormDialog, PlaylistSongsDialog } from "./form-dialog";

export default function PlaylistsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<Playlist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Playlist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
  // 管理歌曲弹窗目标
  const [songsTarget, setSongsTarget] = useState<Playlist | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Playlist>>({
        method: "GET",
        url: "/admin/playlists",
        params: { page, pageSize, keyword: debouncedKeyword || undefined },
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
  }, [page, debouncedKeyword, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword]);

  function handleEdit(playlist: Playlist) {
    setEditing(playlist);
    setSelectedRowKey(playlist.id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({
        method: "DELETE",
        url: `/admin/playlists/${deleteTarget.id}`,
      });
      toast({ title: "删除成功" });
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

  const columns: DataTableColumn<Playlist>[] = [
    {
      key: "cover",
      title: "封面",
      width: 64,
      render: (row) => (
        <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
          {row.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(row.cover)}
              alt={row.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ),
    },
    { key: "name", title: "名称", render: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: "user",
      title: "创建者",
      render: (row) => row.user?.username || <span className="text-muted-foreground">-</span>,
    },
    { key: "songCount", title: "歌曲数", width: 90, render: (row) => row.songCount ?? 0 },
    {
      key: "playCount",
      title: "播放量",
      width: 100,
      render: (row) => formatPlays(row.playCount),
    },
    {
      key: "isPublic",
      title: "公开",
      width: 80,
      render: (row) =>
        row.isPublic ? (
          <Badge className="bg-primary-700 hover:bg-primary-700">公开</Badge>
        ) : (
          <Badge variant="secondary">私有</Badge>
        ),
    },
    {
      key: "isSystem",
      title: "类型",
      width: 90,
      render: (row) =>
        row.isSystem ? (
          <Badge className="bg-amber-500 hover:bg-amber-500">系统</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">用户</span>
        ),
    },
    {
      key: "actions",
      title: "操作",
      width: 180,
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
            className="h-8 w-8"
            onClick={() => {
              setSelectedRowKey(row.id);
              setSongsTarget(row);
            }}
            aria-label="管理歌曲"
            title="管理歌曲"
          >
            <ListMusic className="h-4 w-4" />
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
        title="歌单管理"
        description="管理用户歌单与歌单内歌曲"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            新增歌单
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
        searchValue={keyword}
        onSearchChange={setKeyword}
        searchPlaceholder="搜索歌单名 / 创建者"
      />

      <PlaylistFormDialog
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

      {/* 管理歌曲弹窗 */}
      {songsTarget && (
        <PlaylistSongsDialog
          open={!!songsTarget}
          playlist={songsTarget}
          onOpenChange={(o) => {
            if (!o) {
              setSongsTarget(null);
              setSelectedRowKey(null);
              void loadList();
            }
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="删除歌单"
        description={
          deleteTarget
            ? `确定要删除歌单「${deleteTarget.name}」吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
