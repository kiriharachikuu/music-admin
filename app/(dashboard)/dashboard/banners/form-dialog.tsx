"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Music2, X, Search } from "lucide-react";

import { request } from "@/lib/api";
import type { Banner, Song } from "@/lib/types";
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
  bannerFormDefaultValues,
  bannerSchema,
  type BannerFormValues,
} from "./schema";
import { SongSelector } from "./song-selector";
import { resolveMediaUrl } from "@/lib/utils";

// ==================== Banner 新增/编辑表单弹窗 ====================
export interface BannerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Banner | null;
  onSuccess: () => void;
}

export function BannerFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: BannerFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [songSelectorOpen, setSongSelectorOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: bannerFormDefaultValues,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        title: editing.title,
        imageUrl: editing.imageUrl,
        linkUrl: editing.linkUrl || "",
        songId: editing.songId || "",
        adUrl: editing.adUrl || "",
        sort: editing.sort,
        status: editing.status,
      });
      if (editing.songId) {
        void (async () => {
          try {
            const song = await request<Song>({
              method: "GET",
              url: `/admin/songs/${editing.songId}`,
            });
            setSelectedSong(song);
          } catch {
            setSelectedSong(null);
          }
        })();
      } else {
        setSelectedSong(null);
      }
    } else {
      form.reset(bannerFormDefaultValues);
      setSelectedSong(null);
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
                      hint="建议尺寸 1920×500（宽高比 ~ 3.8:1），宽幅横图，支持 JPG/PNG/WebP，≤ 10MB"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="songId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关联歌曲（可选，优先级最高）</FormLabel>
                    <FormControl>
                      <div>
                        {selectedSong ? (
                          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                              {selectedSong.coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={resolveMediaUrl(selectedSong.coverUrl)}
                                  alt={selectedSong.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                                  <Music2 className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-foreground">
                                {selectedSong.title}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {selectedSong.artist}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedSong(null);
                                field.onChange("");
                              }}
                              aria-label="移除关联"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-center gap-2"
                            onClick={() => setSongSelectorOpen(true)}
                          >
                            <Search className="h-4 w-4" />
                            选择歌曲
                          </Button>
                        )}
                        <SongSelector
                          open={songSelectorOpen}
                          onOpenChange={(v) => {
                            setSongSelectorOpen(v);
                            if (!v && !selectedSong && field.value) {
                              void (async () => {
                                try {
                                  const song = await request<Song>({
                                    method: "GET",
                                    url: `/admin/songs/${field.value}`,
                                  });
                                  setSelectedSong(song);
                                } catch {
                                  setSelectedSong(null);
                                }
                              })();
                            }
                          }}
                          onSelect={(song) => {
                            setSelectedSong(song);
                            field.onChange(song.id);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="linkUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>内部跳转链接（可选，优先级最低）</FormLabel>
                      <FormControl>
                        <Input placeholder="/library 或 https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>广告外链（可选，优先级中）</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
