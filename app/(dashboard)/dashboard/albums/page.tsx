"use client";

// XingTone - 专辑管理
// 列表（封面/名称/艺术家/歌曲数/发行日期/操作）+ 搜索 + 分页
// 新增/编辑 Dialog 表单（名称/艺术家/描述/发行日期/封面上传）+ 删除二次确认
// 对接 CRUD /api/admin/albums
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { request } from "@/lib/api";
import type { Album, PageResult } from "@/lib/types";
import { formatDate, useDebounced } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FileUpload } from "@/components/admin/file-upload";
import { Button } from "@/components/ui/button";
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

// 专辑表单校验规则
// 注：cover / description 直接用 z.string()，默认值在 useForm defaultValues 中提供
// （zod 4 + react-hook-form 对 .optional().default() 的输入/输出类型推断存在不兼容）
const albumSchema = z.object({
  name: z.string().min(1, "请输入专辑名称"),
  artist: z.string().min(1, "请输入艺术家"),
  cover: z.string(),
  description: z.string(),
  releaseDate: z.string().min(1, "请选择发行日期"),
});

type AlbumFormValues = z.infer<typeof albumSchema>;

export default function AlbumsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<Album[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Album | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Album>>({
        method: "GET",
        url: "/admin/albums",
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

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function handleEdit(album: Album) {
    setEditing(album);
    setSelectedRowKey(album.id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({ method: "DELETE", url: `/admin/albums/${deleteTarget.id}` });
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

  const columns: DataTableColumn<Album>[] = [
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
    { key: "artist", title: "艺术家" },
    { key: "songCount", title: "歌曲数", width: 90, render: (row) => row.songCount },
    {
      key: "releaseDate",
      title: "发行日期",
      width: 120,
      render: (row) => (
        <span className="text-muted-foreground">{formatDate(row.releaseDate)}</span>
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
        title="专辑管理"
        description="管理专辑信息与封面"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            新增专辑
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
        searchPlaceholder="搜索专辑名 / 艺术家"
      />

      {formOpen && (
        <AlbumFormDialog
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="删除专辑"
        description={
          deleteTarget
            ? `确定要删除专辑「${deleteTarget.name}」吗？专辑下歌曲将变为无专辑状态，此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ==================== 专辑新增/编辑表单弹窗 ====================
interface AlbumFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Album | null;
  onSuccess: () => void;
}

function AlbumFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: AlbumFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AlbumFormValues>({
    resolver: zodResolver(albumSchema),
    defaultValues: {
      name: "",
      artist: "",
      cover: "",
      description: "",
      releaseDate: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        artist: editing.artist,
        cover: editing.cover || "",
        description: editing.description || "",
        releaseDate: editing.releaseDate?.slice(0, 10) || "",
      });
    } else {
      form.reset({
        name: "",
        artist: "",
        cover: "",
        description: "",
        releaseDate: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open, editing, form]);

  async function onSubmit(values: AlbumFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/albums/${editing.id}`,
          data: values,
        });
        toast({ title: "保存成功" });
      } else {
        await request({ method: "POST", url: "/admin/albums", data: values });
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
          <DialogTitle>{editing ? "编辑专辑" : "新增专辑"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>专辑名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入专辑名称" {...field} />
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
                    <FormLabel>艺术家</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入艺术家" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* 封面上传：拖拽 + 预览 */}
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
                      placeholder="请输入专辑描述（可选）"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
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
