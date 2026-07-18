"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2, Eye, EyeOff } from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/utils";
import type { LiveClip, LiveSession, PageResult, SongStatus } from "@/lib/types";
import { formatDuration, useDebounced } from "@/lib/admin-utils";
import {
  parseAudioMetadata,
  type AudioMetadata,
} from "@/lib/parse-audio-metadata";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const liveClipSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  artist: z.string().min(1, "请输入歌手"),
  sessionId: z.string().min(1, "请选择所属场次"),
  trackIndex: z.number().int().nonnegative("场次内序号不能为负数"),
  duration: z.number().positive("时长必须大于 0"),
  fileUrl: z.string().min(1, "请上传音频文件"),
  coverUrl: z.string(),
  lyricUrl: z.string(),
  lyricContent: z.string(),
  status: z.enum(["PUBLISHED", "DRAFT"]),
});

type LiveClipFormValues = z.infer<typeof liveClipSchema>;

export default function LiveClipsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<LiveClip[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sessionFilter, setSessionFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const [sessions, setSessions] = useState<LiveSession[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LiveClip | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LiveClip | null>(null);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchStatusTarget, setBatchStatusTarget] = useState<SongStatus | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<LiveClip>>({
        method: "GET",
        url: "/admin/live-clips",
        params: {
          page,
          pageSize,
          keyword: debouncedKeyword || undefined,
          sessionId: sessionFilter !== "ALL" ? sessionFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
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
  }, [page, debouncedKeyword, sessionFilter, statusFilter, toast]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await request<PageResult<LiveSession>>({
        method: "GET",
        url: "/admin/live-sessions",
        params: { page: 1, pageSize: 200 },
      });
      setSessions(res.list ?? []);
    } catch {
      // 选项加载失败不阻塞主流程
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, sessionFilter, statusFilter]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function handleEdit(liveClip: LiveClip) {
    setEditing(liveClip);
    setSelectedRowKey(liveClip.id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({
        method: "DELETE",
        url: `/admin/live-clips/${deleteTarget.id}`,
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
        url: "/admin/live-clips/batch/delete",
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
        url: "/admin/live-clips/batch/status",
        data: { ids: selectedRowKeys, status: batchStatusTarget },
      });
      toast({
        title: batchStatusTarget === "PUBLISHED" ? "已批量发布" : "已批量设为草稿",
      });
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

  const columns: DataTableColumn<LiveClip>[] = [
    {
      key: "title",
      title: "标题",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    { key: "artist", title: "歌手" },
    {
      key: "session",
      title: "所属场次（日期）",
      render: (row) => {
        if (!row.session?.title) return <span className="text-muted-foreground">-</span>;
        const dateStr = row.session?.liveTime
          ? new Date(row.session.liveTime).toLocaleDateString("zh-CN")
          : null;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{row.session.title}</span>
            {dateStr && (
              <span className="text-xs text-muted-foreground">{dateStr}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "trackIndex",
      title: "场次内序号",
      width: 100,
      render: (row) => row.trackIndex,
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
        title="直播歌切管理"
        description="管理直播场次下的歌切片段"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            新增直播歌切
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
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="所属场次" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部场次</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <LiveClipFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditing(null);
            setSelectedRowKey(null);
          }
        }}
        editing={editing}
        sessions={sessions}
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
        title="删除直播歌切"
        description={
          deleteTarget
            ? `确定要删除歌切「${deleteTarget.title}」吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(o) => !o && setBatchDeleteOpen(false)}
        title="批量删除直播歌切"
        description={`确定要删除选中的 ${selectedRowKeys.length} 首歌切吗？此操作不可撤销。`}
        confirmText="批量删除"
        variant="destructive"
        onConfirm={handleBatchDelete}
      />

      <ConfirmDialog
        open={batchStatusTarget !== null}
        onOpenChange={(o) => !o && setBatchStatusTarget(null)}
        title={batchStatusTarget === "PUBLISHED" ? "批量发布歌切" : "批量设为草稿"}
        description={`确定要将选中的 ${selectedRowKeys.length} 首歌切${batchStatusTarget === "PUBLISHED" ? "发布" : "设为草稿"}吗？`}
        confirmText={batchStatusTarget === "PUBLISHED" ? "批量发布" : "批量设为草稿"}
        onConfirm={handleBatchStatus}
      />
    </div>
  );
}

/** 文件名解析结果 */
interface FilenameParseResult {
  title: string;
  artist: string;
  date: string;
}

/** 期望的文件名格式示例 */
const FILENAME_FORMAT_EXAMPLE = "《兔子先生》-星瞳-2024年03月05日星期二";

/**
 * 从文件名中解析歌曲信息
 * 严格格式：《歌曲名称》-歌手名称-日期（YYYY年MM月DD日星期X）
 * 文件扩展名会被自动去除后再解析
 */
function parseFilename(filename: string): { result: FilenameParseResult | null; error?: string } {
  try {
    // 去除文件扩展名
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    if (!nameWithoutExt) {
      return { result: null, error: "文件名为空" };
    }

    // 匹配格式：《歌曲名称》-歌手名称-日期
    const regex = /^(.+?)-(.+?)-(\d{4}年\d{2}月\d{2}日星期[\u4e00-\u9fff])$/;
    const match = nameWithoutExt.match(regex);

    if (!match) {
      return {
        result: null,
        error: `文件名不符合格式要求，正确格式示例：${FILENAME_FORMAT_EXAMPLE}`,
      };
    }

    const [, rawTitle, artist, date] = match;

    // 提取《》内的歌曲名称
    const titleMatch = rawTitle.match(/^《(.+)》$/);
    if (!titleMatch) {
      return {
        result: null,
        error: `歌曲名称须用《》包裹，正确格式示例：${FILENAME_FORMAT_EXAMPLE}`,
      };
    }

    const title = titleMatch[1].trim();
    const trimmedArtist = artist.trim();

    if (!title) {
      return { result: null, error: "歌曲名称不能为空" };
    }
    if (!trimmedArtist) {
      return { result: null, error: "歌手名称不能为空" };
    }

    return {
      result: {
        title,
        artist: trimmedArtist,
        date,
      },
    };
  } catch {
    return { result: null, error: "文件名解析异常，请手动填写信息" };
  }
}

interface LiveClipFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LiveClip | null;
  sessions: LiveSession[];
  onSuccess: () => void;
}

function LiveClipFormDialog({
  open,
  onOpenChange,
  editing,
  sessions,
  onSuccess,
}: LiveClipFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parsedMetadata, setParsedMetadata] = useState<AudioMetadata | null>(null);
  const [filenameError, setFilenameError] = useState<string | null>(null);
  const [parsedDate, setParsedDate] = useState<string | null>(null);

  const form = useForm<LiveClipFormValues>({
    resolver: zodResolver(liveClipSchema),
    defaultValues: {
      title: "",
      artist: "",
      sessionId: "",
      trackIndex: 1,
      duration: 0,
      fileUrl: "",
      coverUrl: "",
      lyricUrl: "",
      lyricContent: "",
      status: "DRAFT",
    },
  });

  useEffect(() => {
    if (!open) return;
    setParsing(false);
    setParseWarnings([]);
    setParsedMetadata(null);
    setFilenameError(null);
    setParsedDate(null);
    if (editing) {
      form.reset({
        title: editing.title,
        artist: editing.artist,
        sessionId: editing.sessionId,
        trackIndex: editing.trackIndex,
        duration: editing.duration,
        fileUrl: editing.fileUrl,
        coverUrl: editing.coverUrl || "",
        lyricUrl: editing.lyricUrl || "",
        lyricContent: "",
        status: editing.status,
      });
    } else {
      form.reset({
        title: "",
        artist: "",
        sessionId: "",
        trackIndex: 1,
        duration: 0,
        fileUrl: "",
        coverUrl: "",
        lyricUrl: "",
        lyricContent: "",
        status: "DRAFT",
      });
    }
  }, [open, editing, form]);

  const durationValue = form.watch("duration");

  // 音频文件选中回调：解析 ID3 元信息 + 文件名自动提取，填充表单
  async function handleAudioFileSelected(file: File) {
    setParsing(true);
    setParseWarnings([]);
    setParsedMetadata(null);
    setFilenameError(null);
    setParsedDate(null);

    let hasFilenameError = false;

    // 1. 文件名解析：提取歌曲名称、歌手、日期
    try {
      const { result: filenameResult, error: filenameErr } = parseFilename(file.name);
      if (filenameResult) {
        form.setValue("title", filenameResult.title);
        form.setValue("artist", filenameResult.artist);
        setParsedDate(filenameResult.date);
      } else if (filenameErr) {
        hasFilenameError = true;
        setFilenameError(filenameErr);
      }
    } catch {
      hasFilenameError = true;
      setFilenameError("文件名解析异常，请手动填写信息");
    }

    // 2. ID3 元信息解析（补充或覆盖文件名解析结果）
    try {
      const { metadata, warnings } = await parseAudioMetadata(file);
      setParsedMetadata(metadata);
      setParseWarnings(warnings);
      // ID3 元信息仅在文件名未解析成功时覆盖对应字段
      if (metadata.title && !form.getValues("title")) {
        form.setValue("title", metadata.title);
      }
      if (metadata.artist && !form.getValues("artist")) {
        form.setValue("artist", metadata.artist);
      }
      if (metadata.duration && metadata.duration > 0) {
        form.setValue("duration", metadata.duration);
      }
      if (metadata.pictureUrl) {
        form.setValue("coverUrl", metadata.pictureUrl);
      }
      if (warnings.length === 0 && !hasFilenameError) {
        toast({ title: "信息解析成功" });
      } else if (warnings.length > 0) {
        toast({
          title: "元信息已读取",
          description: "部分字段缺失，请核对并手动补充",
        });
      }
    } catch (err) {
      toast({
        title: "元信息读取失败",
        description: err instanceof Error ? err.message : "请手动填写歌切信息",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  }

  async function onSubmit(values: LiveClipFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/live-clips/${editing.id}`,
          data: values,
        });
        toast({ title: "保存成功" });
      } else {
        await request({
          method: "POST",
          url: "/admin/live-clips",
          data: values,
        });
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑直播歌切" : "新增直播歌切"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改歌切信息并保存" : "填写歌切信息、上传音频文件后提交"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入歌切标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="artist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>歌手</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入歌手名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所属场次</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择所属场次" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="trackIndex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>场次内序号</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="如 1"
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
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
                      hint="支持 MP3 / WAV / FLAC 等音频格式，文件名格式：《歌曲名称》-歌手-日期"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 元信息解析状态反馈 */}
            {parsing && (
              <div className="flex items-center gap-2 rounded-md border border-primary-500/30 bg-primary-50 p-3 text-sm text-primary-700 dark:bg-primary-900/20">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在读取音频元信息…</span>
              </div>
            )}
            {parsedMetadata && !parsing && (
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                  <span className="font-medium text-foreground">已读取元信息</span>
                  {parsedMetadata.bitrate && (
                    <span>比特率：约 {parsedMetadata.bitrate} kbps</span>
                  )}
                  {parsedMetadata.duration && (
                    <span>时长：{formatDuration(parsedMetadata.duration)}</span>
                  )}
                </div>
                {parseWarnings.length > 0 && (
                  <ul className="space-y-1">
                    {parseWarnings.map((w, i) => (
                      <li key={i} className="text-amber-600 dark:text-amber-400">
                        ⚠ {w}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 文件名解析反馈 */}
            {filenameError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <p className="font-medium">文件名解析失败</p>
                <p className="mt-1 text-xs">{filenameError}</p>
              </div>
            )}

            {/* 解析出的日期信息 */}
            {parsedDate && (
              <FormItem>
                <FormLabel>上传日期（从文件名解析）</FormLabel>
                <FormControl>
                  <Input value={parsedDate} readOnly className="bg-muted/50" />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  此信息从文件名自动提取，仅供参考
                </p>
              </FormItem>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="coverUrl"
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
                        hint="建议 1:1 正方形，可选"
                      />
                    </FormControl>
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
                        hint="支持 .lrc / .txt，可选"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lyricContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>歌词内容（LRC）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="或直接输入 LRC 格式歌词内容，优先级高于歌词文件"
                      rows={6}
                      {...field}
                    />
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
                        <SelectValue placeholder="选择状态" />
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
