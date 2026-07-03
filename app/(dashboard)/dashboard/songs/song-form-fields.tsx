"use client";

import type { Control } from "react-hook-form";
import { AlertCircle, Disc3, FileText, Info, Loader2 } from "lucide-react";

import type { Album, Tag } from "@/lib/types";
import type { AudioMetadata } from "@/lib/parse-audio-metadata";
import { formatDuration } from "@/lib/admin-utils";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { cn, resolveMediaUrl } from "@/lib/utils";

import type { SongFormValues } from "./schema";

// 元信息解析状态反馈（加载状态 + 数据验证提示）
export function MetadataParseStatus({
  parsing,
  parsedMetadata,
  parseWarnings,
}: {
  parsing: boolean;
  parsedMetadata: AudioMetadata | null;
  parseWarnings: string[];
}) {
  if (parsing) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary-500/30 bg-primary-50 p-3 text-sm text-primary-700 dark:bg-primary-900/20">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>正在读取音频元信息…</span>
      </div>
    );
  }
  if (!parsedMetadata) return null;
  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        <span className="font-medium text-foreground">已读取元信息</span>
        {parsedMetadata.bitrate && (
          <span>比特率：约 {parsedMetadata.bitrate} kbps</span>
        )}
        {parsedMetadata.duration && (
          <span>时长：{formatDuration(parsedMetadata.duration)}</span>
        )}
        {parsedMetadata.year && <span>年份：{parsedMetadata.year}</span>}
        {parsedMetadata.track && (
          <span>音轨：{parsedMetadata.track}</span>
        )}
      </div>
      {parseWarnings.length > 0 && (
        <ul className="space-y-1">
          {parseWarnings.map((w, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 封面字段（封面同步自所选专辑，不再单独上传）
export function CoverField({
  control,
  selectedAlbum,
}: {
  control: Control<SongFormValues>;
  selectedAlbum: Album | null;
}) {
  return (
    <FormField
      control={control}
      name="coverUrl"
      render={({ field }) => (
        <FormItem>
          <FormLabel>封面图片</FormLabel>
          <div className="flex items-center gap-3 rounded-md border border-input p-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {field.value ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(field.value)}
                  alt="专辑封面"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Disc3 className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="flex items-start gap-1 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary-700" />
                <span>
                  封面将自动同步自所选专辑，无需单独上传，以节省存储空间
                </span>
              </p>
              {selectedAlbum ? (
                <p className="text-xs font-medium text-primary-700">
                  当前专辑：{selectedAlbum.name}
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  请先选择专辑以同步封面
                </p>
              )}
            </div>
            {/* 隐藏字段保留 coverUrl 值供表单提交 */}
            <input type="hidden" {...field} />
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// 歌词在线编辑入口（仅编辑模式可用）
export function LyricEditorEntry({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="space-y-2">
      <Label>歌词在线编辑</Label>
      <div className="flex items-center gap-3 rounded-md border border-input p-3">
        <FileText className="h-5 w-5 text-primary-700 shrink-0" />
        <p className="flex-1 text-xs text-muted-foreground">
          可直接编辑 LRC 歌词文本，保存后优先于文件方式使用
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
        >
          <FileText className="h-4 w-4" />
          打开编辑器
        </Button>
      </div>
    </div>
  );
}

// 标签多选：chip 切换（不依赖 react-hook-form 字段，使用普通 div+Label）
export function TagSelector({
  tags,
  selectedTagIds,
  onToggle,
}: {
  tags: Tag[];
  selectedTagIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>标签</Label>
      <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 min-h-[42px]">
        {tags.length === 0 && (
          <span className="text-sm text-muted-foreground">暂无标签</span>
        )}
        {tags.map((tag) => {
          const active = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary-700 text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              )}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
