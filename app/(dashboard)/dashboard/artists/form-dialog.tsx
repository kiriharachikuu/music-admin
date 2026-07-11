"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { request } from "@/lib/api";
import type { Artist } from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";

import {
  artistSchema,
  getDefaultArtistFormValues,
  type ArtistFormValues,
} from "./schema";

export interface ArtistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Artist | null;
  onSuccess: () => void;
}

export function ArtistFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: ArtistFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ArtistFormValues>({
    resolver: zodResolver(artistSchema),
    defaultValues: getDefaultArtistFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        avatar: editing.avatar || "",
        bio: editing.bio || "",
        representativeWorks: editing.representativeWorks || "",
      });
    } else {
      form.reset(getDefaultArtistFormValues());
    }
  }, [open, editing, form]);

  async function onSubmit(values: ArtistFormValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/artists/${editing.id}`,
          data: values,
        });
        toast({ title: "保存成功" });
      } else {
        await request({ method: "POST", url: "/admin/artists", data: values });
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
          <DialogTitle>{editing ? "编辑歌手" : "新增歌手"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改歌手信息并保存" : "填写歌手信息"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>歌手名称</FormLabel>
                  <FormControl>
                    <Input placeholder="请输入歌手名称" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>头像</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      type="image"
                      accept="image/*"
                      preview="image"
                      hint="支持 JPG/PNG/WebP，≤ 5MB"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>简介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入歌手简介"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="representativeWorks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>代表作品</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入代表作品，用逗号分隔"
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