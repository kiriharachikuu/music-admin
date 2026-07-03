"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { request } from "@/lib/api";
import type { Album, Song, Tag } from "@/lib/types";
import {
  parseAudioMetadata,
  type AudioMetadata,
} from "@/lib/parse-audio-metadata";
import { formatDuration } from "@/lib/admin-utils";
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
  getDefaultSongFormValues,
  NO_ALBUM,
  songSchema,
  type SongFormValues,
} from "./schema";
import {
  CoverField,
  LyricEditorEntry,
  MetadataParseStatus,
  TagSelector,
} from "./song-form-fields";
import { LyricEditorDialog } from "./lyric-editor-dialog";

// ==================== 歌曲新增/编辑表单弹窗 ====================
export interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Song | null;
  albums: Album[];
  tags: Tag[];
  onSuccess: () => void;
}

export function SongFormDialog({
  open,
  onOpenChange,
  editing,
  albums,
  tags,
  onSuccess,
}: SongFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  // 选中的标签 id 数组
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  // 音频元信息解析状态
  const [parsing, setParsing] = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parsedMetadata, setParsedMetadata] = useState<AudioMetadata | null>(
    null
  );
  // 歌词在线编辑弹窗
  const [lyricEditorOpen, setLyricEditorOpen] = useState(false);

  const form = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    defaultValues: getDefaultSongFormValues(),
  });

  // 打开时根据 editing 回显
  useEffect(() => {
    if (!open) return;
    // 重置解析状态
    setParsing(false);
    setParseWarnings([]);
    setParsedMetadata(null);
    if (editing) {
      form.reset({
        title: editing.title,
        artist: editing.artist,
        albumId: editing.albumId || NO_ALBUM,
        duration: editing.duration,
        fileUrl: editing.fileUrl,
        coverUrl: editing.coverUrl || "",
        lyricUrl: editing.lyricUrl || "",
        releaseDate: editing.releaseDate?.slice(0, 10) || "",
        status: editing.status,
      });
      setSelectedTagIds(editing.tags?.map((t) => t.id) ?? []);
    } else {
      form.reset(getDefaultSongFormValues());
      setSelectedTagIds([]);
    }
  }, [open, editing, form]);

  // 当前选中的专辑（用于封面同步）
  const albumIdValue = form.watch("albumId");
  const selectedAlbum = useMemo(
    () =>
      albumIdValue && albumIdValue !== NO_ALBUM
        ? albums.find((a) => a.id === albumIdValue) ?? null
        : null,
    [albumIdValue, albums]
  );

  // 专辑变化时自动同步封面（需求 3：图片同步功能）
  // 仅在新增模式或未手动指定封面时同步，避免覆盖编辑场景的既有值
  useEffect(() => {
    if (!open) return;
    if (selectedAlbum?.cover) {
      form.setValue("coverUrl", selectedAlbum.cover);
    } else if (albumIdValue === NO_ALBUM && !editing) {
      // 未选专辑且为新增时清空封面
      form.setValue("coverUrl", "");
    }
  }, [selectedAlbum, albumIdValue, open, editing, form]);

  // 音频文件选中回调：解析 ID3 元信息并自动填充表单（需求 1 + 4 + 5）
  async function handleAudioFileSelected(file: File) {
    setParsing(true);
    setParseWarnings([]);
    setParsedMetadata(null);
    try {
      const { metadata, warnings } = await parseAudioMetadata(file);
      setParsedMetadata(metadata);
      setParseWarnings(warnings);
      // 自动填充：标题、歌手、时长
      if (metadata.title) form.setValue("title", metadata.title);
      if (metadata.artist) form.setValue("artist", metadata.artist);
      if (metadata.duration && metadata.duration > 0) {
        form.setValue("duration", metadata.duration);
      }
      if (warnings.length === 0) {
        toast({ title: "元信息读取成功" });
      } else {
        toast({
          title: "元信息已读取",
          description: "部分字段缺失，请核对并手动补充",
        });
      }
    } catch (err) {
      toast({
        title: "元信息读取失败",
        description: err instanceof Error ? err.message : "请手动填写歌曲信息",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  }

  async function onSubmit(values: SongFormValues) {
    setSubmitting(true);
    try {
      // 哨兵值转 null，并组装 tagIds
      const payload = {
        ...values,
        albumId: values.albumId === NO_ALBUM ? null : values.albumId,
        tagIds: selectedTagIds,
      };
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/songs/${editing.id}`,
          data: payload,
        });
        toast({ title: "保存成功" });
      } else {
        await request({ method: "POST", url: "/admin/songs", data: payload });
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

  // 标签多选切换
  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  // 实时预览时长
  const durationValue = form.watch("duration");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑歌曲" : "新增歌曲"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "修改歌曲信息并保存"
                : "填写歌曲信息、上传音频文件后提交"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>标题</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入歌曲标题" {...field} />
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
                      <FormControl>
                        <Input placeholder="请输入歌手" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="albumId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>专辑</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择专辑（可选）" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_ALBUM}>无专辑</SelectItem>
                          {albums.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                          <SelectItem value="PUBLISHED">已发布</SelectItem>
                          <SelectItem value="DRAFT">草稿</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 音频文件上传 + 自动读取元信息（需求 1 + 5） */}
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
                        hint="支持 MP3 / WAV / FLAC 等音频格式，上传后自动读取元信息"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 元信息解析状态反馈（需求 5：加载状态 + 需求 4：数据验证提示） */}
              <MetadataParseStatus
                parsing={parsing}
                parsedMetadata={parsedMetadata}
                parseWarnings={parseWarnings}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 封面同步自所选专辑（需求 3：图片同步功能，不再单独上传） */}
                <CoverField
                  control={form.control}
                  selectedAlbum={selectedAlbum}
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
                          hint="支持 .lrc / .txt"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 歌词在线编辑入口（仅编辑模式可用） */}
              {editing && (
                <LyricEditorEntry onOpen={() => setLyricEditorOpen(true)} />
              )}

              {/* 标签多选 */}
              <TagSelector
                tags={tags}
                selectedTagIds={selectedTagIds}
                onToggle={toggleTag}
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
      {/* 歌词在线编辑弹窗（仅编辑模式） */}
      {editing && (
        <LyricEditorDialog
          open={lyricEditorOpen}
          onOpenChange={setLyricEditorOpen}
          songId={editing.id}
          songTitle={editing.title}
        />
      )}
    </>
  );
}
