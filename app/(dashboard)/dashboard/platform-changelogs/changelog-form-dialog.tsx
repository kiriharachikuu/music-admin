"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { request } from "@/lib/api";
import type { PlatformChangelog } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { changelogFormDefaultValues, changelogFormSchema, STATUS_OPTIONS, type ChangelogFormValues } from "./schema";

export interface ChangelogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PlatformChangelog | null;
  onSuccess: () => void;
}

export function ChangelogFormDialog({ open, onOpenChange, editing, onSuccess }: ChangelogFormDialogProps) {
  const { toast } = useToast();
  const form = useForm<ChangelogFormValues>({
    resolver: zodResolver(changelogFormSchema),
    defaultValues: changelogFormDefaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        version: editing.version,
        versionCode: editing.versionCode,
        title: editing.title ?? "",
        content: JSON.stringify(editing.content, null, 2),
        status: (editing.status as "draft" | "published") ?? "published",
        releaseDate: editing.releaseDate ? editing.releaseDate.slice(0, 10) : "",
      });
    } else {
      form.reset(changelogFormDefaultValues);
    }
  }, [open, editing, form]);

  const submitting = form.formState.isSubmitting;

  const previewCount = useMemo(() => {
    const v = form.watch("content");
    try {
      const arr = JSON.parse(v || "[]");
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  }, [form.watch("content")]);

  async function onSubmit(values: ChangelogFormValues) {
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/platform-changelogs/${editing.id}`,
          data: values,
        });
        toast({ title: "更新成功" });
      } else {
        await request({
          method: "POST",
          url: "/admin/platform-changelogs",
          data: values,
        });
        toast({ title: "创建成功" });
      }
      onSuccess();
    } catch (err) {
      toast({
        title: "保存失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑平台版本" : "新增平台版本"}</DialogTitle>
          <DialogDescription>内容将自动出现在前端 /about/changelog 页</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>版本号</FormLabel>
                    <FormControl>
                      <Input placeholder="如 1.4.4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="versionCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>版本码</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="递增整数"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题（可选）</FormLabel>
                  <FormControl>
                    <Input placeholder="如：平台功能扩展与播放体验优化" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>发布日期（可选）</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>更新内容（JSON 字符串数组）· {previewCount} 条</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={8}
                      placeholder='["新增 xxx", "优化 xxx", "修复 xxx"]'
                      className="font-mono text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
