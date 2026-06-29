"use client";

// XingTone - 歌单管理
// 列表（封面/名称/创建者/歌曲数/播放量/公开/操作）+ 搜索 + 分页
// 编辑：基础信息 Dialog（名称/描述/封面/公开）
// 管理歌曲 Dialog：添加/移除歌曲 + 上下移动排序
// 对接 CRUD /api/admin/playlists，歌单歌曲 /api/admin/playlists/:id/songs
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDown,
  ArrowUp,
  ListMusic,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { request } from "@/lib/api";
import type { PageResult, Playlist, Song } from "@/lib/types";
import { formatPlays, useDebounced } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FileUpload } from "@/components/admin/file-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

// 歌单基础信息表单校验
// 注：description / cover 直接用 z.string()，默认值在 useForm defaultValues 中提供
// （zod 4 + react-hook-form 对 .optional().default() 的输入/输出类型推断存在不兼容）
const playlistSchema = z.object({
  name: z.string().min(1, "请输入歌单名称"),
  description: z.string(),
  cover: z.string(),
  isPublic: z.boolean(),
});

type PlaylistFormValues = z.infer<typeof playlistSchema>;

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
              src={row.cover}
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

      {formOpen && (
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
      )}

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

// ==================== 歌单基础信息编辑弹窗 ====================
interface PlaylistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Playlist | null;
  onSuccess: () => void;
}

function PlaylistFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: PlaylistFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      name: "",
      description: "",
      cover: "",
      isPublic: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        description: editing.description || "",
        cover: editing.cover || "",
        isPublic: editing.isPublic,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        cover: "",
        isPublic: true,
      });
    }
  }, [open, editing, form]);

  async function onSubmit(values: PlaylistFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/playlists/${editing.id}`,
          data: values,
        });
        toast({ title: "保存成功" });
      } else {
        await request({ method: "POST", url: "/admin/playlists", data: values });
        toast({ title: "新增成功" });
      }
      onSuccess();
    } catch (err) {
      toast({
        title: "保存失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑歌单" : "新增歌单"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>歌单名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入歌单名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>封面图片</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      type="image"
                      accept="image/*"
                      preview="image"
                      hint="建议 1:1 正方形，拖拽或点击上传"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入歌单描述（可选）"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 公开开关：开启态 primary-700 */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between rounded-md border border-input p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="m-0">公开歌单</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        开启后所有用户可见
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="bg-primary-700 text-white hover:bg-primary-600"
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "保存" : "新增"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== 歌单内歌曲管理弹窗 ====================
interface PlaylistSongsDialogProps {
  open: boolean;
  playlist: Playlist;
  onOpenChange: (open: boolean) => void;
}

function PlaylistSongsDialog({
  open,
  playlist,
  onOpenChange,
}: PlaylistSongsDialogProps) {
  const { toast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 添加歌曲搜索
  const [addKeyword, setAddKeyword] = useState("");
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedAddKeyword = useDebounced(addKeyword, 300);

  // 加载歌单内歌曲
  const loadPlaylistSongs = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await request<Playlist>({
        method: "GET",
        url: `/admin/playlists/${playlist.id}`,
      });
      setSongs(detail.songs ?? []);
    } catch (err) {
      toast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [playlist.id, toast]);

  // 搜索全量歌曲（排除已在歌单内的）
  const loadAllSongs = useCallback(async () => {
    setSearchLoading(true);
    try {
      const res = await request<PageResult<Song>>({
        method: "GET",
        url: "/admin/songs",
        params: {
          page: 1,
          pageSize: 20,
          keyword: debouncedAddKeyword || undefined,
        },
      });
      setAllSongs(res.list ?? []);
    } catch {
      setAllSongs([]);
    } finally {
      setSearchLoading(false);
    }
  }, [debouncedAddKeyword]);

  useEffect(() => {
    if (open) void loadPlaylistSongs();
  }, [open, loadPlaylistSongs]);

  useEffect(() => {
    if (open) void loadAllSongs();
  }, [open, loadAllSongs]);

  // 已在歌单内的歌曲 id 集合
  const existIds = useMemo(() => new Set(songs.map((s) => s.id)), [songs]);

  // 添加歌曲到歌单（本地）
  function handleAdd(song: Song) {
    if (existIds.has(song.id)) return;
    setSongs((prev) => [...prev, song]);
  }
  // 从歌单移除（本地）
  function handleRemove(songId: string) {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
  }
  // 上移/下移（本地排序）
  function move(index: number, direction: "up" | "down") {
    setSongs((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // 整体提交：用 songIds 顺序覆盖歌单内歌曲
  async function handleSave() {
    setSaving(true);
    try {
      await request({
        method: "PUT",
        url: `/admin/playlists/${playlist.id}/songs`,
        data: { songIds: songs.map((s) => s.id) },
      });
      toast({ title: "保存成功" });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "保存失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>管理歌曲 - {playlist.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* 添加歌曲区 */}
          <div className="space-y-2">
            <Label>添加歌曲</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={addKeyword}
                onChange={(e) => setAddKeyword(e.target.value)}
                placeholder="搜索歌曲标题 / 歌手"
                className="pl-8"
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/60">
              {searchLoading ? (
                <div className="p-3">
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : allSongs.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  暂无搜索结果
                </p>
              ) : (
                allSongs.map((song) => {
                  const added = existIds.has(song.id);
                  return (
                    <div
                      key={song.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {song.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {song.artist}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? "secondary" : "default"}
                        className={
                          added
                            ? ""
                            : "bg-primary-700 text-white hover:bg-primary-600"
                        }
                        disabled={added}
                        onClick={() => handleAdd(song)}
                      >
                        {added ? "已添加" : <><Plus className="h-3 w-3" />添加</>}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 当前歌单歌曲列表（可排序、可移除） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>歌单内歌曲（{songs.length}）</Label>
              <span className="text-xs text-muted-foreground">
                可上下移动调整顺序
              </span>
            </div>
            {loading ? (
              <div className="space-y-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : songs.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                歌单暂无歌曲，请从上方添加
              </div>
            ) : (
              <div className="space-y-1">
                {songs.map((song, index) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {song.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {song.artist}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => move(index, "up")}
                        disabled={index === 0}
                        aria-label="上移"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => move(index, "down")}
                        disabled={index === songs.length - 1}
                        aria-label="下移"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(song.id)}
                        aria-label="移除"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
