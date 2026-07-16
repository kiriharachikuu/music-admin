"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, UploadCloud, Trash2, Eye, EyeOff } from "lucide-react";

import { request } from "@/lib/api";
import type { Album, Artist, PageResult, Song, Tag } from "@/lib/types";
import { useDebounced } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getSongColumns } from "./columns";
import { SongFormDialog } from "./song-form-dialog";
import { BatchUploadDialog } from "./batch-upload-dialog";

export default function SongsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [albumFilter, setAlbumFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchStatusTarget, setBatchStatusTarget] = useState<"PUBLISHED" | "DRAFT" | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Song>>({
        method: "GET",
        url: "/admin/songs",
        params: {
          page,
          pageSize,
          keyword: debouncedKeyword || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          albumId: albumFilter !== "ALL" ? albumFilter : undefined,
        },
      });
      const mapped = (res.list ?? []).map((s) => ({
        ...s,
        tags: s.songTags?.map((st) => st.tag) ?? [],
      }));
      setData(mapped);
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
  }, [page, debouncedKeyword, statusFilter, albumFilter, toast]);

  const loadOptions = useCallback(async () => {
    try {
      const [albumRes, tagRes, artistRes] = await Promise.all([
        request<PageResult<Album>>({
          method: "GET",
          url: "/admin/albums",
          params: { page: 1, pageSize: 200 },
        }),
        request<Tag[]>({ method: "GET", url: "/admin/tags" }),
        request<PageResult<Artist>>({
          method: "GET",
          url: "/admin/artists",
          params: { page: 1, pageSize: 200 },
        }),
      ]);
      setAlbums(albumRes.list ?? []);
      setTags(tagRes ?? []);
      setArtists(artistRes.list ?? []);
    } catch {
      // 选项加载失败不阻塞主流程
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, statusFilter, albumFilter]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function handleEdit(song: Song) {
    setEditing(song);
    setSelectedRowKey(song.id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({
        method: "DELETE",
        url: `/admin/songs/${deleteTarget.id}`,
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

  async function handleBatchDelete() {
    if (selectedRowKeys.length === 0) return;
    try {
      await request({
        method: "POST",
        url: "/admin/songs/batch/delete",
        data: { ids: selectedRowKeys },
      });
      toast({ title: "批量删除成功" });
      setBatchDeleteOpen(false);
      setSelectedRowKeys([]);
      void loadList();
    } catch (err) {
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  async function handleBatchStatus() {
    if (!batchStatusTarget || selectedRowKeys.length === 0) return;
    try {
      await request({
        method: "POST",
        url: "/admin/songs/batch/status",
        data: { ids: selectedRowKeys, status: batchStatusTarget },
      });
      toast({ title: batchStatusTarget === "PUBLISHED" ? "已批量发布" : "已批量设为草稿" });
      setBatchStatusTarget(null);
      setSelectedRowKeys([]);
      void loadList();
    } catch (err) {
      toast({
        title: "操作失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  const columns = getSongColumns({
    onEdit: handleEdit,
    onDelete: (song) => setDeleteTarget(song),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="歌曲管理"
        description="维护平台所有歌曲信息"
        actions={
          <>
            <Button variant="outline" onClick={() => setBatchOpen(true)}>
              <UploadCloud className="h-4 w-4" />
              批量上传
            </Button>
            <Button
              className="bg-primary-700 text-white hover:bg-primary-600"
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4" />
              新增歌曲
            </Button>
          </>
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
        searchPlaceholder="搜索标题 / 歌手"
        selectable
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        batchActions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchStatusTarget("PUBLISHED")}
            >
              <Eye className="h-3.5 w-3.5" />
              批量发布
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchStatusTarget("DRAFT")}
            >
              <EyeOff className="h-3.5 w-3.5" />
              批量设为草稿
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setBatchDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              批量删除
            </Button>
          </>
        }
        filters={
          <>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="PUBLISHED">已发布</SelectItem>
                <SelectItem value="DRAFT">草稿</SelectItem>
              </SelectContent>
            </Select>
            <Select value={albumFilter} onValueChange={setAlbumFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="专辑" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部专辑</SelectItem>
                {albums.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <SongFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditing(null);
            setSelectedRowKey(null);
          }
        }}
        editing={editing}
        albums={albums}
        tags={tags}
        artists={artists}
        onSuccess={() => {
          setFormOpen(false);
          setEditing(null);
          setSelectedRowKey(null);
          void loadList();
        }}
      />

      <BatchUploadDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onSuccess={() => void loadList()}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="删除歌曲"
        description={
          deleteTarget
            ? `确定要删除歌曲「${deleteTarget.title}」吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(o) => !o && setBatchDeleteOpen(false)}
        title="批量删除歌曲"
        description={`确定要删除选中的 ${selectedRowKeys.length} 首歌曲吗？此操作不可撤销。`}
        confirmText="批量删除"
        variant="destructive"
        onConfirm={handleBatchDelete}
      />

      <ConfirmDialog
        open={batchStatusTarget !== null}
        onOpenChange={(o) => !o && setBatchStatusTarget(null)}
        title={batchStatusTarget === "PUBLISHED" ? "批量发布歌曲" : "批量设为草稿"}
        description={`确定要将选中的 ${selectedRowKeys.length} 首歌曲${batchStatusTarget === "PUBLISHED" ? "发布" : "设为草稿"}吗？`}
        confirmText={batchStatusTarget === "PUBLISHED" ? "批量发布" : "批量设为草稿"}
        onConfirm={handleBatchStatus}
      />
    </div>
  );
}
