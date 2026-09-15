"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { request } from "@/lib/api";
import type { AvatarFrame } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/admin/file-upload";
import { Button } from "@/components/ui/button";
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

import {
  avatarFrameFormDefaultValues,
  avatarFrameSchema,
  type AvatarFrameFormValues,
} from "./schema";

// ==================== 头像框 新增/编辑表单弹窗 ====================
export interface AvatarFrameFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AvatarFrame | null;
  onSuccess: () => void;
}

export function AvatarFrameFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: AvatarFrameFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AvatarFrameFormValues>({
    resolver: zodResolver(avatarFrameSchema),
    defaultValues: avatarFrameFormDefaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        imageUrl: editing.imageUrl,
        sort: editing.sort,
        status: editing.status,
      });
    } else {
      form.reset(avatarFrameFormDefaultValues);
    }
  }, [open, editing, form]);

  async function onSubmit(values: AvatarFrameFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/avatar-frames/${editing.id}`,
          data: values,
        });
        toast({ title: "保存成功" });
      } else {
        await request({
          method: "POST",
          url: "/admin/avatar-frames",
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑头像框" : "新增头像框"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "修改头像框信息并保存，改动对所有佩戴用户即时生效"
              : "上传环形透明 PNG 框图，用户佩戴后叠加显示在头像上层"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入头像框名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 框图上传：拖拽 + 预览 */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>框图</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      type="image"
                      accept="image/*"
                      preview="image"
                      hint="建议 512×512 方形 PNG，中心透明、环形装饰，≤ 10MB"
                    />
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
