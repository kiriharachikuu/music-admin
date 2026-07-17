"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2, Eye, EyeOff } from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/utils";
import type { Artist, LiveSession, PageResult, SongStatus } from "@/lib/types";
import { formatDate, useDebounced } from "@/lib/admin-utils";
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

const liveSessionSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  artist: z.string().min(1, "请选择歌手"),
  liveTime: z.string().min(1, "请选择直播时间"),
  cover: z.string(),
  description: z.string(),
  status: z.enum(["PUBLISHED", "DRAFT"]),
});

type LiveSessionFormValues = z.infer<typeof liveSessionSchema>;

export default function LiveSessionsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<LiveSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LiveSession | null>(null);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchStatusTarget, setBatchStatusTarget] = useState<SongStatus | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<LiveSession>>({
        method: "GET",
        url: "/admin/live-sessions",
        params: {
          page,
          pageSize,
          keyword: debouncedKeyword || undefined,
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
  }, [page, debouncedKeyword, statusFilter, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword, statusFilter]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function handleEdit(liveSession: LiveSession) {
    setEditing(liveSession);
    setSelectedRowKey(liveSession.id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({
        method: "DELETE",
        url: `/admin/live-sessions/${deleteTarget.id}`,
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
        url: "/admin/live-sessions/batch/delete",
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
        url: "/admin/live-sessions/batch/status",
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

  const columns: DataTableColumn<LiveSession>[] = [
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
              alt={row.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      ),
    },
    {
      key: "title",
      title: "标题",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    { key: "artist", title: "歌手" },
    {
      key: "songCount",
      title: "歌切数量",
      width: 100,
      render: (row) => row.songCount,
    },
    {
      key: "liveTime",
      title: "直播时间",
      width: 120,
      render: (row) => (
        <span className="text-muted-foreground">{formatDate(row.liveTime)}</span>
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
        title="直播场次管理"
        description="管理直播场次信息与歌切"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            新增直播场次
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
        }
      />

      <LiveSessionFormDialog
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
        title="删除直播场次"
        description={
          deleteTarget
            ? `确定要删除直播场次「${deleteTarget.title}」吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={(o) => !o && setBatchDeleteOpen(false)}
        title="批量删除直播场次"
        description={`确定要删除选中的 ${selectedRowKeys.length} 场直播吗？此操作不可撤销。`}
        confirmText="批量删除"
        variant="destructive"
        onConfirm={handleBatchDelete}
      />

      <ConfirmDialog
        open={batchStatusTarget !== null}
        onOpenChange={(o) => !o && setBatchStatusTarget(null)}
        title={batchStatusTarget === "PUBLISHED" ? "批量发布直播场次" : "批量设为草稿"}
        description={`确定要将选中的 ${selectedRowKeys.length} 场直播${batchStatusTarget === "PUBLISHED" ? "发布" : "设为草稿"}吗？`}
        confirmText={batchStatusTarget === "PUBLISHED" ? "批量发布" : "批量设为草稿"}
        onConfirm={handleBatchStatus}
      />
    </div>
  );
}

interface LiveSessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LiveSession | null;
  onSuccess: () => void;
}

function LiveSessionFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: LiveSessionFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);

  const form = useForm<LiveSessionFormValues>({
    resolver: zodResolver(liveSessionSchema),
    defaultValues: {
      title: "",
      artist: "",
      liveTime: "",
      cover: "",
      description: "",
      status: "DRAFT",
    },
  });

  // 加载歌手列表
  const loadArtists = useCallback(async () => {
    setLoadingArtists(true);
    try {
      const res = await request<PageResult<Artist>>({
        method: "GET",
        url: "/admin/artists",
        params: { pageSize: 200 },
      });
      setArtists(res.list ?? []);
    } catch {
      // 静默失败，不影响表单使用
    } finally {
      setLoadingArtists(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadArtists();
    }
  }, [open, loadArtists]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        title: editing.title,
        artist: editing.artist || "",
        liveTime: editing.liveTime?.slice(0, 16) || "",
        cover: editing.cover || "",
        description: editing.description || "",
        status: editing.status,
      });
    } else {
      form.reset({
        title: "",
        artist: "",
        liveTime: new Date().toISOString().slice(0, 16),
        cover: "",
        description: "",
        status: "DRAFT",
      });
    }
  }, [open, editing, form]);

  async function onSubmit(values: LiveSessionFormValues) {
    setSubmitting(true);
    try {
      // 将 datetime-local 格式转换为完整的 ISO-8601 格式
      const liveTimeISO = values.liveTime.includes(":00")
        ? values.liveTime
        : `${values.liveTime}:00`;

      const payload = {
        ...values,
        liveTime: liveTimeISO,
      };
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/live-sessions/${editing.id}`,
          data: payload,
        });
        toast({ title: "保存成功" });
      } else {
        await request({
          method: "POST",
          url: "/admin/live-sessions",
          data: payload,
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "编辑直播场次" : "新增直播场次"}
          </DialogTitle>
          <DialogDescription>
            {editing ? "修改直播场次信息并保存" : "填写直播场次信息并上传封面"}
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
                    <Input placeholder="请输入直播场次标题" {...field} />
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingArtists}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingArtists ? "加载歌手列表..." : "请选择歌手"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {artists.map((artist) => (
                        <SelectItem key={artist.id} value={artist.name}>
                          {artist.name}
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
              name="liveTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>直播时间</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                      placeholder="请输入直播场次描述（可选）"
                      rows={4}
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
