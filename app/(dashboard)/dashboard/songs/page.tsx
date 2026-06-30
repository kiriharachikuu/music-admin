"use client";

// XingTone - 歌曲管理
// 列表（封面/标题/歌手/专辑/时长/播放量/状态/操作）+ 搜索 + 状态/专辑筛选 + 分页
// 新增/编辑 Dialog 表单 + 标签多选 + 批量上传 + 删除二次确认
// 对接 CRUD /api/admin/songs，标签 /api/admin/tags，专辑 /api/admin/albums
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Disc3,
  Info,
  Loader2,
  Music,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { request } from "@/lib/api";
import type { Album, PageResult, Song, Tag } from "@/lib/types";
import {
  parseAudioMetadata,
  type AudioMetadata,
} from "@/lib/parse-audio-metadata";
import {
  formatDuration,
  formatPlays,
  useDebounced,
} from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FileUpload } from "@/components/admin/file-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// "无专辑"哨兵值，提交时转 null
const NO_ALBUM = "__none__";

// 歌曲表单校验规则
// 注：coverUrl / lyricUrl 直接用 z.string()，默认值在 useForm defaultValues 中提供
// （zod 4 + react-hook-form 对 .optional().default() 的输入/输出类型推断存在不兼容）
const songSchema = z.object({
  title: z.string().min(1, "请输入歌曲标题"),
  artist: z.string().min(1, "请输入歌手"),
  albumId: z.string(),
  duration: z.number().int("时长需为整数").min(1, "时长需大于 0"),
  fileUrl: z.string().min(1, "请上传音频文件"),
  coverUrl: z.string(),
  lyricUrl: z.string(),
  releaseDate: z.string().min(1, "请选择发行日期"),
  status: z.enum(["PUBLISHED", "DRAFT"]),
});

type SongFormValues = z.infer<typeof songSchema>;

// 批量上传任务状态
interface BatchTask {
  file: File;
  progress: number;
  status:
    | "pending"
    | "parsing"
    | "uploading"
    | "creating"
    | "done"
    | "error";
  error?: string;
  /** 解析得到的元信息（用于创建歌曲） */
  metadata?: AudioMetadata;
  /** 解析警告（缺失字段提示） */
  warnings?: string[];
}

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
      const [albumRes, tagRes] = await Promise.all([
        request<PageResult<Album>>({
          method: "GET",
          url: "/admin/albums",
          params: { page: 1, pageSize: 200 },
        }),
        request<Tag[]>({ method: "GET", url: "/admin/tags" }),
      ]);
      setAlbums(albumRes.list ?? []);
      setTags(tagRes ?? []);
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
  const columns: DataTableColumn<Song>[] = [
    {
      key: "cover",
      title: "封面",
      width: 64,
      render: (row) => (
        <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
          {row.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.coverUrl}
              alt={row.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ),
    },
    { key: "title", title: "标题", render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "artist", title: "歌手" },
    {
      key: "album",
      title: "专辑",
      render: (row) => row.album?.name || <span className="text-muted-foreground">-</span>,
    },
    {
      key: "duration",
      title: "时长",
      width: 80,
      render: (row) => (
        <span className="text-muted-foreground">{formatDuration(row.duration)}</span>
      ),
    },
    {
      key: "plays",
      title: "播放量",
      width: 100,
      render: (row) => formatPlays(row.plays),
    },
    {
      key: "status",
      title: "状态",
      width: 90,
      render: (row) =>
        row.status === "PUBLISHED" ? (
          <Badge className="bg-primary-700 hover:bg-primary-700">已发布</Badge>
        ) : (
          <Badge variant="secondary">草稿</Badge>
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

// ==================== 歌曲新增/编辑表单弹窗 ====================
interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Song | null;
  albums: Album[];
  tags: Tag[];
  onSuccess: () => void;
}

function SongFormDialog({
  open,
  onOpenChange,
  editing,
  albums,
  tags,
  onSuccess,
}: SongFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  // 选中的标签 id 数组
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // 音频元信息解析状态
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parsedMetadata, setParsedMetadata] = useState<AudioMetadata | null>(
    null
  );

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    defaultValues: {
      title: "",
      artist: "",
      albumId: NO_ALBUM,
      duration: 0,
      fileUrl: "",
      coverUrl: "",
      lyricUrl: "",
      releaseDate: new Date().toISOString().slice(0, 10),
      status: "PUBLISHED",
    },
  });

  // 打开时根据 editing 回显
  useEffect(() => {
    if (!open) return;
    // 重置解析状态
    setParsing(false);
    setParseWarnings([]);
    setParsedMetadata(null);
    if (editing) {
      form.reset({
        title: editing.title,
        artist: editing.artist,
        albumId: editing.albumId || NO_ALBUM,
        duration: editing.duration,
        fileUrl: editing.fileUrl,
        coverUrl: editing.coverUrl || "",
        lyricUrl: editing.lyricUrl || "",
        releaseDate: editing.releaseDate?.slice(0, 10) || "",
        status: editing.status,
      });
      setSelectedTagIds(editing.tags?.map((t) => t.id) ?? []);
    } else {
      form.reset({
        title: "",
        artist: "",
        albumId: NO_ALBUM,
        duration: 0,
        fileUrl: "",
        coverUrl: "",
        lyricUrl: "",
        releaseDate: new Date().toISOString().slice(0, 10),
        status: "PUBLISHED",
      });
      setSelectedTagIds([]);
    }
  }, [open, editing, form]);

  // 当前选中的专辑（用于封面同步）
  const albumIdValue = form.watch("albumId");
  const selectedAlbum = useMemo(
    () =>
      albumIdValue && albumIdValue !== NO_ALBUM
        ? albums.find((a) => a.id === albumIdValue) ?? null
        : null,
    [albumIdValue, albums]
  );

  // 专辑变化时自动同步封面（需求 3：图片同步功能）
  // 仅在新增模式或未手动指定封面时同步，避免覆盖编辑场景的既有值
  useEffect(() => {
    if (!open) return;
    if (selectedAlbum?.cover) {
      form.setValue("coverUrl", selectedAlbum.cover);
    } else if (albumIdValue === NO_ALBUM && !editing) {
      // 未选专辑且为新增时清空封面
      form.setValue("coverUrl", "");
    }
  }, [selectedAlbum, albumIdValue, open, editing, form]);

  // 音频文件选中回调：解析 ID3 元信息并自动填充表单（需求 1 + 4 + 5）
  async function handleAudioFileSelected(file: File) {
    setParsing(true);
    setParseWarnings([]);
    setParsedMetadata(null);
    try {
      const { metadata, warnings } = await parseAudioMetadata(file);
      setParsedMetadata(metadata);
      setParseWarnings(warnings);
      // 自动填充：标题、歌手、时长
      if (metadata.title) form.setValue("title", metadata.title);
      if (metadata.artist) form.setValue("artist", metadata.artist);
      if (metadata.duration && metadata.duration > 0) {
        form.setValue("duration", metadata.duration);
      }
      if (warnings.length === 0) {
        toast({ title: "元信息读取成功" });
      } else {
        toast({
          title: "元信息已读取",
          description: "部分字段缺失，请核对并手动补充",
        });
      }
    } catch (err) {
      toast({
        title: "元信息读取失败",
        description: err instanceof Error ? err.message : "请手动填写歌曲信息",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  }

  async function onSubmit(values: SongFormValues) {
    setSubmitting(true);
    try {
      // 哨兵值转 null，并组装 tagIds
      const payload = {
        ...values,
        albumId: values.albumId === NO_ALBUM ? null : values.albumId,
        tagIds: selectedTagIds,
      };
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/songs/${editing.id}`,
          data: payload,
        });
        toast({ title: "保存成功" });
      } else {
        await request({ method: "POST", url: "/admin/songs", data: payload });
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

  // 标签多选切换
  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  // 实时预览时长
  const durationValue = form.watch("duration");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑歌曲" : "新增歌曲"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "修改歌曲信息并保存"
              : "填写歌曲信息、上传音频文件后提交"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入歌曲标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>歌手</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入歌手" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="albumId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>专辑</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择专辑（可选）" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ALBUM}>无专辑</SelectItem>
                        {albums.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>时长（秒）</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="如 240"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      约 {formatDuration(Number(durationValue) || 0)}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="releaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>发行日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>状态</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PUBLISHED">已发布</SelectItem>
                        <SelectItem value="DRAFT">草稿</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 音频文件上传 + 自动读取元信息（需求 1 + 5） */}
            <FormField
              control={form.control}
              name="fileUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>音频文件</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      onFileSelected={handleAudioFileSelected}
                      type="audio"
                      accept="audio/*"
                      preview="audio"
                      hint="支持 MP3 / WAV / FLAC 等音频格式，上传后自动读取元信息"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 元信息解析状态反馈（需求 5：加载状态 + 需求 4：数据验证提示） */}
            {parsing && (
              <div className="flex items-center gap-2 rounded-md border border-primary-500/30 bg-primary-50 p-3 text-sm text-primary-700 dark:bg-primary-900/20">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在读取音频元信息…</span>
              </div>
            )}

            {!parsing && parsedMetadata && (
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                  <span className="font-medium text-foreground">已读取元信息</span>
                  {parsedMetadata.bitrate && (
                    <span>比特率：约 {parsedMetadata.bitrate} kbps</span>
                  )}
                  {parsedMetadata.duration && (
                    <span>时长：{formatDuration(parsedMetadata.duration)}</span>
                  )}
                  {parsedMetadata.year && <span>年份：{parsedMetadata.year}</span>}
                  {parsedMetadata.track && (
                    <span>音轨：{parsedMetadata.track}</span>
                  )}
                </div>
                {parseWarnings.length > 0 && (
                  <ul className="space-y-1">
                    {parseWarnings.map((w, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400"
                      >
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* 封面同步自所选专辑（需求 3：图片同步功能，不再单独上传） */}
              <FormField
                control={form.control}
                name="coverUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>封面图片</FormLabel>
                    <div className="flex items-center gap-3 rounded-md border border-input p-3">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {field.value ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={field.value}
                            alt="专辑封面"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Disc3 className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="flex items-start gap-1 text-xs text-muted-foreground">
                          <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary-700" />
                          <span>
                            封面将自动同步自所选专辑，无需单独上传，以节省存储空间
                          </span>
                        </p>
                        {selectedAlbum ? (
                          <p className="text-xs font-medium text-primary-700">
                            当前专辑：{selectedAlbum.name}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            请先选择专辑以同步封面
                          </p>
                        )}
                      </div>
                      {/* 隐藏字段保留 coverUrl 值供表单提交 */}
                      <input type="hidden" {...field} />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lyricUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>歌词文件</FormLabel>
                    <FormControl>
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                        type="lyric"
                        accept=".lrc,.txt"
                        preview="file"
                        hint="支持 .lrc / .txt"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 标签多选：chip 切换（不依赖 react-hook-form 字段，使用普通 div+Label） */}
            <div className="space-y-2">
              <Label>标签</Label>
              <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 min-h-[42px]">
                {tags.length === 0 && (
                  <span className="text-sm text-muted-foreground">暂无标签</span>
                )}
                {tags.map((tag) => {
                  const active = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        active
                          ? "bg-primary-700 text-white"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

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

// ==================== 批量上传弹窗 ====================
interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function BatchUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchUploadDialogProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);

  // 重置任务列表
  useEffect(() => {
    if (!open) {
      setTasks([]);
      setDragging(false);
      setRunning(false);
    }
  }, [open]);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("audio/"));
    if (arr.length === 0) return;
    setTasks((prev) => [
      ...prev,
      ...arr.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      })),
    ]);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  // 上传一个文件并创建草稿歌曲
  // 流程：解析元信息 → 上传音频 → 创建歌曲（使用解析得到的标题/歌手/时长）
  async function runTask(task: BatchTask, index: number) {
    const update = (patch: Partial<BatchTask>) =>
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...patch } : t))
      );
    try {
      // 1. 解析音频元信息（需求 1：自动读取）
      update({ status: "parsing", progress: 0 });
      let metadata: AudioMetadata = {};
      let warnings: string[] = [];
      try {
        const parsed = await parseAudioMetadata(task.file);
        metadata = parsed.metadata;
        warnings = parsed.warnings;
        update({ metadata, warnings });
      } catch {
        // 解析失败不阻断流程，回退到文件名
        warnings.push("元信息读取失败，使用文件名作为标题");
        update({ warnings });
      }

      // 2. 上传音频文件
      update({ status: "uploading", progress: 0 });
      const formData = new FormData();
      formData.append("file", task.file);
      const uploadRes = await request<{ url: string }>({
        method: "POST",
        url: "/admin/upload?type=audio",
        data: formData,
        onUploadProgress: (e) => {
          if (e.total) {
            update({
              progress: Math.round((e.loaded * 100) / e.total),
            });
          }
        },
      });
      // 3. 创建草稿歌曲，使用解析得到的元信息（缺失则回退）
      const title =
        metadata.title || task.file.name.replace(/\.[^.]+$/, "");
      const artist = metadata.artist || "未知";
      const duration = metadata.duration || 0;
      update({ status: "creating", progress: 100 });
      await request({
        method: "POST",
        url: "/admin/songs",
        data: {
          title,
          artist,
          albumId: null,
          duration,
          fileUrl: uploadRes.url,
          coverUrl: "",
          lyricUrl: "",
          releaseDate: new Date().toISOString().slice(0, 10),
          status: "DRAFT",
          tagIds: [],
        },
      });
      update({ status: "done" });
    } catch (err) {
      update({
        status: "error",
        error: err instanceof Error ? err.message : "上传失败",
      });
    }
  }

  // 开始上传所有任务（顺序执行，避免并发压垮后端）
  async function startUpload() {
    if (tasks.length === 0 || running) return;
    setRunning(true);
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === "done" || tasks[i].status === "error") continue;
      await runTask(tasks[i], i);
    }
    setRunning(false);
    toast({ title: "批量上传完成" });
    onSuccess();
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const errorCount = tasks.filter((t) => t.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量上传歌曲</DialogTitle>
          <DialogDescription>
            拖入多个音频文件，自动读取元信息并创建草稿
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 拖拽区 */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragging
                ? "border-primary-700 bg-primary-50 dark:bg-primary-900/20"
                : "border-border/60 hover:border-primary-500 hover:bg-accent"
            )}
          >
            <UploadCloud className="h-8 w-8 text-primary-700" />
            <p className="text-sm">
              <span className="font-medium text-primary-700">点击选择</span>
              <span className="text-muted-foreground"> 或拖拽音频文件到此处</span>
            </p>
            <p className="text-xs text-muted-foreground">
              支持多文件，将自动读取元信息（标题/歌手/时长）创建草稿歌曲
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* 任务列表 */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>共 {tasks.length} 个文件</span>
                <span>
                  成功 {doneCount} · 失败 {errorCount}
                </span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {tasks.map((task, index) => (
                  <div
                    key={`${task.file.name}-${index}`}
                    className="flex items-center gap-3 rounded-md border border-border/60 p-2"
                  >
                    <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm">{task.file.name}</p>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            task.status === "done" && "text-emerald-600",
                            task.status === "error" && "text-destructive",
                            (task.status === "uploading" ||
                              task.status === "creating" ||
                              task.status === "pending" ||
                              task.status === "parsing") &&
                              "text-muted-foreground"
                          )}
                        >
                          {task.status === "pending" && "等待中"}
                          {task.status === "parsing" && "读取元信息..."}
                          {task.status === "uploading" && `上传中 ${task.progress}%`}
                          {task.status === "creating" && "创建中..."}
                          {task.status === "done" && "完成"}
                          {task.status === "error" &&
                            `失败：${task.error ?? ""}`}
                        </span>
                      </div>
                      {/* 已解析元信息预览（标题/歌手/时长） */}
                      {task.metadata && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {task.metadata.title || "（未识别标题）"} ·{" "}
                          {task.metadata.artist || "未知歌手"} ·{" "}
                          {task.metadata.duration
                            ? formatDuration(task.metadata.duration)
                            : "时长未知"}
                        </p>
                      )}
                      {/* 进度条 primary 渐变 */}
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all",
                            task.status === "error"
                              ? "bg-destructive"
                              : "bg-gradient-to-r from-primary-500 to-primary-700"
                          )}
                          style={{
                            width: `${
                              task.status === "done" ? 100 : task.progress
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    {!running && task.status !== "done" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeTask(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            关闭
          </Button>
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={startUpload}
            disabled={tasks.length === 0 || running}
          >
            {running && <Loader2 className="h-4 w-4 animate-spin" />}
            {running ? "上传中..." : "开始上传"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
