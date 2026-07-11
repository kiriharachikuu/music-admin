"use client";

// XingTone - 歌曲管理
// 列表（封面/标题/歌手/专辑/时长/播放量/状态/操作）+ 搜索 + 状态/专辑筛选 + 分页
// 新增/编辑 Dialog 表单 + 标签多选 + 批量上传 + 删除二次确认
// 对接 CRUD /api/admin/songs，标签 /api/admin/tags，专辑 /api/admin/albums
import { useCallback, useEffect, useState } from "react";
import { Plus, UploadCloud } from "lucide-react";

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

  // 列表数据
  const [data, setData] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [albumFilter, setAlbumFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  // 关联数据
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);

  // 弹窗状态
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Song | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  // 搜索 debounce
  const debouncedKeyword = useDebounced(keyword, 300);

  // 加载列表
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
      // 后端返回 songTags 关联表，映射为前端期望的 tags 数组
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

  // 加载专辑与标签（下拉/多选用）
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

  // 搜索/筛选变化时回到第一页
  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, statusFilter, albumFilter]);

  // 打开新增弹窗
  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  // 打开编辑弹窗
  function handleEdit(song: Song) {
    setEditing(song);
    setSelectedRowKey(song.id);
    setFormOpen(true);
  }

  // 删除确认
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({
        method: "DELETE",
        url: `/admin/songs/${deleteTarget.id}`,
      });
      toast({ title: "删除成功" });
      setDeleteTarget(null);
      // 删除后若当前页空了，回退一页
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

  // 表格列定义
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

      {/* 新增/编辑弹窗：始终挂载，仅用 open 控制开关，避免条件挂载与受控 open 叠加导致的生命周期异常 */}
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

      {/* 批量上传弹窗 */}
      <BatchUploadDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onSuccess={() => void loadList()}
      />

      {/* 删除二次确认 */}
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
    </div>
  );
}
