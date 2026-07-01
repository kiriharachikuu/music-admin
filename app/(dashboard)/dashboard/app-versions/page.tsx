"use client";

// XingTone - App版本管理
// 列表（版本号/版本名称/平台/渠道/强制更新/状态/下载量/操作）+ 分页
// 新增/编辑 Dialog 表单 + 删除二次确认
// 对接 CRUD /api/admin/app-versions
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Download,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { request } from "@/lib/api";
import type { AppVersion, PageResult } from "@/lib/types";
import { formatDateTime, formatFileSize } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
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
import { Switch } from "@/components/ui/switch";

// 版本表单校验
const appVersionSchema = z.object({
  versionCode: z.number().int("版本号需为整数").min(1, "版本号需 ≥ 1"),
  versionName: z.string().min(1, "请输入版本名称"),
  title: z.string().optional(),
  content: z.string().optional(),
  downloadUrl: z.string().min(1, "请输入下载地址"),
  fileSize: z.number().int("文件大小需为整数").min(0, "文件大小需 ≥ 0"),
  md5: z.string().optional(),
  forceUpdate: z.boolean(),
  minVersionCode: z.number().int("最低版本需为整数").min(0, "最低版本需 ≥ 0"),
  channel: z.enum(["stable", "beta"]),
  platform: z.enum(["android", "ios", "desktop"]),
  status: z.enum(["draft", "published", "deprecated"]),
});

type AppVersionFormValues = z.infer<typeof appVersionSchema>;

const CHANNEL_OPTIONS = [
  { value: "stable", label: "正式版" },
  { value: "beta", label: "测试版" },
] as const;

const PLATFORM_OPTIONS = [
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "desktop", label: "桌面端" },
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "deprecated", label: "已废弃" },
] as const;

export default function AppVersionsPage() {
  const { toast } = useToast();

  const [data, setData] = useState<AppVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  const [filterChannel, setFilterChannel] = useState<string>("");
  const [filterPlatform, setFilterPlatform] = useState<string>("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppVersion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppVersion | null>(null);

  const form = useForm<AppVersionFormValues>({
    resolver: zodResolver(appVersionSchema),
    defaultValues: {
      versionCode: 1,
      versionName: "",
      title: "",
      content: "",
      downloadUrl: "",
      fileSize: 0,
      md5: "",
      forceUpdate: false,
      minVersionCode: 0,
      channel: "stable",
      platform: "android",
      status: "published",
    },
  });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<AppVersion>>({
        method: "GET",
        url: "/admin/app-versions",
        params: {
          page,
          pageSize,
          channel: filterChannel || undefined,
          platform: filterPlatform || undefined,
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
  }, [page, filterChannel, filterPlatform, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function handleAdd() {
    setEditing(null);
    form.reset({
      versionCode: 1,
      versionName: "",
      title: "",
      content: "",
      downloadUrl: "",
      fileSize: 0,
      md5: "",
      forceUpdate: false,
      minVersionCode: 0,
      channel: "stable",
      platform: "android",
      status: "published",
    });
    setFormOpen(true);
  }

  function handleEdit(item: AppVersion) {
    setEditing(item);
    setSelectedRowKey(item.id);
    form.reset({
      versionCode: item.versionCode,
      versionName: item.versionName,
      title: item.title ?? "",
      content: item.content ?? "",
      downloadUrl: item.downloadUrl,
      fileSize: item.fileSize,
      md5: item.md5 ?? "",
      forceUpdate: item.forceUpdate,
      minVersionCode: item.minVersionCode,
      channel: item.channel as "stable" | "beta",
      platform: item.platform as "android" | "ios" | "desktop",
      status: item.status as "draft" | "published" | "deprecated",
    });
    setFormOpen(true);
  }

  async function handleSubmit(values: AppVersionFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/app-versions/${editing.id}`,
          data: values,
        });
        toast({ title: "保存成功" });
      } else {
        await request({
          method: "POST",
          url: "/admin/app-versions",
          data: values,
        });
        toast({ title: "创建成功" });
      }
      setFormOpen(false);
      void loadList();
    } catch (err) {
      toast({
        title: editing ? "保存失败" : "创建失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: AppVersion) {
    try {
      await request({
        method: "DELETE",
        url: `/admin/app-versions/${item.id}`,
      });
      toast({ title: "删除成功" });
      setDeleteTarget(null);
      void loadList();
    } catch (err) {
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  const columns: DataTableColumn<AppVersion>[] = [
    {
      key: "versionCode",
      title: "版本号",
      width: 100,
      render: (r) => <span className="font-mono">{r.versionCode}</span>,
    },
    {
      key: "versionName",
      title: "版本名称",
      render: (r) => (
        <div>
          <div className="font-medium">{r.versionName}</div>
          {r.title && (
            <div className="text-xs text-muted-foreground">{r.title}</div>
          )}
        </div>
      ),
    },
    {
      key: "platform",
      title: "平台",
      width: 100,
      render: (r) => {
        const opt = PLATFORM_OPTIONS.find((o) => o.value === r.platform);
        return <Badge variant="outline">{opt?.label ?? r.platform}</Badge>;
      },
    },
    {
      key: "channel",
      title: "渠道",
      width: 100,
      render: (r) => {
        const opt = CHANNEL_OPTIONS.find((o) => o.value === r.channel);
        return (
          <Badge variant={r.channel === "stable" ? "default" : "secondary"}>
            {opt?.label ?? r.channel}
          </Badge>
        );
      },
    },
    {
      key: "forceUpdate",
      title: "强制更新",
      width: 100,
      render: (r) =>
        r.forceUpdate ? (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            强制
          </Badge>
        ) : (
          <span className="text-muted-foreground">否</span>
        ),
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (r) => {
        const opt = STATUS_OPTIONS.find((o) => o.value === r.status);
        let variant: "default" | "secondary" | "outline" = "default";
        if (r.status === "draft") variant = "secondary";
        if (r.status === "deprecated") variant = "outline";
        return <Badge variant={variant}>{opt?.label ?? r.status}</Badge>;
      },
    },
    {
      key: "fileSize",
      title: "文件大小",
      width: 120,
      render: (r) => formatFileSize(r.fileSize),
    },
    {
      key: "downloadCount",
      title: "下载量",
      width: 100,
      render: (r) => r.downloadCount.toLocaleString(),
    },
    {
      key: "createdAt",
      title: "发布时间",
      width: 180,
      render: (r) => formatDateTime(r.createdAt),
    },
    {
      key: "actions",
      title: "操作",
      width: 160,
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(r.downloadUrl, "_blank")}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteTarget(r)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="App 版本管理"
        description="管理 Android/iOS/桌面端应用版本发布与更新"
        actions={
          <Button onClick={handleAdd} className="bg-primary-700 text-white hover:bg-primary-600">
            <Plus className="mr-2 h-4 w-4" />
            发布新版本
          </Button>
        }
      />

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">平台：</span>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {PLATFORM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">渠道：</span>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {CHANNEL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
        emptyText="暂无版本记录"
      />

      {/* 新增/编辑 Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑版本" : "发布新版本"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "修改应用版本信息，保存后立即生效"
                : "发布新的应用版本，用户端将收到更新提示"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="versionCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>版本号 *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="versionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>版本名称 *</FormLabel>
                      <FormControl>
                        <Input placeholder="如 1.2.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>更新标题</FormLabel>
                    <FormControl>
                      <Input placeholder="如 重磅更新来袭" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>更新内容</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="每行一条更新内容，或使用 JSON 数组格式"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>平台</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLATFORM_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
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
                  name="channel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>发布渠道</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CHANNEL_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>状态</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
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
                  name="minVersionCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>最低兼容版本</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="downloadUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>下载地址 *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://.../app-release.apk"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fileSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>文件大小 (字节)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="md5"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MD5 校验</FormLabel>
                      <FormControl>
                        <Input placeholder="可选，用于文件完整性校验" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="forceUpdate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/60 p-4">
                    <div className="space-y-0.5">
                      <FormLabel>强制更新</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        开启后，低于此版本的用户必须更新才能继续使用
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormOpen(false)}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="bg-primary-700 text-white hover:bg-primary-600"
                  disabled={submitting}
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editing ? "保存" : "发布"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="确认删除"
        description={`确定要删除版本 ${deleteTarget?.versionName} (${deleteTarget?.versionCode}) 吗？此操作不可撤销。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
