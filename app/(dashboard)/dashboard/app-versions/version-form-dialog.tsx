"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { request } from "@/lib/api";
import type { AppVersion } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import {
  appVersionFormDefaultValues,
  appVersionSchema,
  CHANNEL_OPTIONS,
  PLATFORM_OPTIONS,
  STATUS_OPTIONS,
  type AppVersionFormValues,
} from "./schema";

// ==================== 版本新增/编辑弹窗 ====================
export interface VersionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AppVersion | null;
  onSuccess: () => void;
}

export function VersionFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: VersionFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AppVersionFormValues>({
    resolver: zodResolver(appVersionSchema),
    defaultValues: appVersionFormDefaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        versionCode: editing.versionCode,
        versionName: editing.versionName,
        title: editing.title ?? "",
        content: editing.content ?? "",
        downloadUrl: editing.downloadUrl,
        fileSize: editing.fileSize,
        md5: editing.md5 ?? "",
        forceUpdate: editing.forceUpdate,
        minVersionCode: editing.minVersionCode,
        channel: editing.channel as "stable" | "beta",
        platform: editing.platform as "android" | "ios" | "desktop",
        status: editing.status as "draft" | "published" | "deprecated",
      });
    } else {
      form.reset(appVersionFormDefaultValues);
    }
  }, [open, editing, form]);

  async function onSubmit(values: AppVersionFormValues) {
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
      onSuccess();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onSubmit={form.handleSubmit(onSubmit)}
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
  );
}
