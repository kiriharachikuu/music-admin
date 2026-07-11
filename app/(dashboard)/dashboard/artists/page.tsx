"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, User } from "lucide-react";

import { request } from "@/lib/api";
import type { Artist, PageResult } from "@/lib/types";
import { useDebounced } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn, resolveMediaUrl } from "@/lib/utils";

import { ArtistFormDialog } from "./form-dialog";

export default function ArtistsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<Artist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Artist | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Artist>>({
        method: "GET",
        url: "/admin/artists",
        params: {
          page,
          pageSize,
          keyword: debouncedKeyword || undefined,
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
  }, [page, debouncedKeyword, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEdit(artist: Artist) {
    setEditing(artist);
    setSelectedRowKey(artist.id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({
        method: "DELETE",
        url: `/admin/artists/${deleteTarget.id}`,
      });
      toast({ title: "删除成功" });
      setDeleteTarget(null);
      if (data.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        void loadList();
      }
    } catch (err) {
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  const columns = [
    {
      title: "头像",
      key: "avatar",
      width: 80,
      render: (artist: Artist) => (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          {artist.avatar ? (
            <img
              src={resolveMediaUrl(artist.avatar)}
              alt={artist.name}
              className="h-full w-full rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      title: "歌手名称",
      key: "name",
      render: (artist: Artist) => (
        <span className="font-medium">{artist.name}</span>
      ),
    },
    {
      title: "简介",
      key: "bio",
      ellipsis: true,
      render: (artist: Artist) => (
        <span className="text-sm text-muted-foreground">
          {artist.bio || "-"}
        </span>
      ),
    },
    {
      title: "代表作品",
      key: "representativeWorks",
      ellipsis: true,
      render: (artist: Artist) => (
        <span className="text-sm text-muted-foreground">
          {artist.representativeWorks || "-"}
        </span>
      ),
    },
    {
      title: "创建时间",
      key: "createdAt",
      width: 160,
      render: (artist: Artist) => (
        <span className="text-sm text-muted-foreground">
          {new Date(artist.createdAt).toLocaleString("zh-CN")}
        </span>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (artist: Artist) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(artist)}
          >
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setDeleteTarget(artist)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="歌手管理"
        description="维护平台所有歌手信息"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            新增歌手
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
        searchPlaceholder="搜索歌手名称"
      />

      <ArtistFormDialog
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
        title="删除歌手"
        description={
          deleteTarget
            ? `确定要删除歌手「${deleteTarget.name}」吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}