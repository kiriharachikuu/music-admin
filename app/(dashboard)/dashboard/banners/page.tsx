"use client";

// XingTone - Banner 管理
// 列表（图片预览/标题/链接/排序/状态/操作）+ 分页
// 排序：上下移动按钮调整 sort
// 上下架：Switch 切换 status VISIBLE/HIDDEN
// 新增/编辑 Dialog（标题/图片上传/链接/排序/状态）+ 删除二次确认
// 对接 CRUD /api/admin/banners，排序 /api/admin/banners/:id/sort
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/utils";
import type { Banner, BannerStatus, PageResult } from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Banner 表单校验
// 注：linkUrl 直接用 z.string()，默认值在 useForm defaultValues 中提供
// （zod 4 + react-hook-form 对 .optional().default() 的输入/输出类型推断存在不兼容）
const bannerSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  imageUrl: z.string().min(1, "请上传图片"),
  linkUrl: z.string(),
  sort: z.number().int("排序需为整数").min(0, "排序需 ≥ 0"),
  status: z.enum(["VISIBLE", "HIDDEN"]),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

export default function BannersPage() {
  const { toast } = useToast();

  const [data, setData] = useState<Banner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20; // Banner 通常不多，单页多放些
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  // 正在切换状态的 banner id（用于禁用 Switch）
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // 正在排序的 banner id
  const [movingId, setMovingId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Banner>>({
        method: "GET",
        url: "/admin/banners",
        params: { page, pageSize },
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
  }, [page, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function handleEdit(banner: Banner) {
    setEditing(banner);
    setSelectedRowKey(banner.id);
    setFormOpen(true);
  }

  // 上下架切换
  async function handleToggleStatus(banner: Banner) {
    const next: BannerStatus = banner.status === "VISIBLE" ? "HIDDEN" : "VISIBLE";
    setTogglingId(banner.id);
    try {
      await request({
        method: "PUT",
        url: `/admin/banners/${banner.id}`,
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
  async function handleMove(banner: Banner, direction: "up" | "down") {
    setMovingId(banner.id);
    try {
      await request({
        method: "PUT",
        url: `/admin/banners/${banner.id}/sort`,
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
        url: `/admin/banners/${deleteTarget.id}`,
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

  const columns: DataTableColumn<Banner>[] = [
    {
      key: "preview",
      title: "预览",
      width: 120,
      render: (row) => (
        <div className="h-10 w-20 overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
          src={resolveMediaUrl(row.imageUrl)}
          alt={row.title}
          className="h-full w-full object-cover"
        />
        </div>
      ),
    },
    { key: "title", title: "标题", render: (row) => <span className="font-medium">{row.title}</span> },
    {
      key: "linkUrl",
      title: "链接",
      render: (row) =>
        row.linkUrl ? (
          <a
            href={row.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-primary-700 hover:underline"
          >
            {row.linkUrl}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
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
        title="Banner 管理"
        description="首页轮播图配置，支持排序与上下架"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            新增 Banner
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

      <BannerFormDialog
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
        title="删除 Banner"
        description={
          deleteTarget
            ? `确定要删除 Banner「${deleteTarget.title}」吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ==================== Banner 新增/编辑表单弹窗 ====================
interface BannerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Banner | null;
  onSuccess: () => void;
}

function BannerFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: BannerFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: "",
      imageUrl: "",
      linkUrl: "",
      sort: 0,
      status: "VISIBLE",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        title: editing.title,
        imageUrl: editing.imageUrl,
        linkUrl: editing.linkUrl || "",
        sort: editing.sort,
        status: editing.status,
      });
    } else {
      form.reset({
        title: "",
        imageUrl: "",
        linkUrl: "",
        sort: 0,
        status: "VISIBLE",
      });
    }
  }, [open, editing, form]);

  async function onSubmit(values: BannerFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/banners/${editing.id}`,
          data: values,
        });
        toast({ title: "保存成功" });
      } else {
        await request({ method: "POST", url: "/admin/banners", data: values });
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
          <DialogTitle>{editing ? "编辑 Banner" : "新增 Banner"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改 Banner 信息并保存" : "填写 Banner 信息并上传图片"}
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
                    <Input placeholder="请输入 Banner 标题" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 图片上传：拖拽 + 预览 */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>图片</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      type="image"
                      accept="image/*"
                      preview="image"
                      hint="建议宽幅横图，拖拽或点击上传"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>链接（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>排序</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="数值越小越靠前"
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
                        <SelectItem value="VISIBLE">上架</SelectItem>
                        <SelectItem value="HIDDEN">下架</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
