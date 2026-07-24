"use client";

import { Pencil, Trash2, Copy, Check, RefreshCw } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

import type { Song } from "@/lib/types";
import { formatDuration, formatPlays } from "@/lib/admin-utils";
import { type DataTableColumn } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveMediaUrl } from "@/lib/utils";
import { request } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface SongColumnsOptions {
  onEdit: (song: Song) => void;
  onDelete: (song: Song) => void;
  onRefresh?: () => void;
}

function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="flex items-center gap-1.5">
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
        {id.slice(0, 8)}…
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCopy}
        title="复制完整 ID"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

// 歌曲列表表格列定义
export function getSongColumns(options: SongColumnsOptions): DataTableColumn<Song>[] {
  const { onEdit, onDelete, onRefresh } = options;
  return [
    {
      key: "id",
      title: "ID",
      width: 120,
      render: (row) => <CopyableId id={row.id} />,
    },
    {
      key: "cover",
      title: "封面",
      width: 64,
      render: (row) => (
        <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
          {row.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(row.coverUrl)}
              alt={row.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      ),
    },
    { key: "title", title: "标题", render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "artist", title: "歌手" },
    {
      key: "album",
      title: "专辑",
      render: (row) => row.album?.name || <span className="text-muted-foreground">-</span>,
    },
    {
      key: "duration",
      title: "时长",
      width: 80,
      render: (row) => (
        <span className="text-muted-foreground">{formatDuration(row.duration)}</span>
      ),
    },
    {
      key: "plays",
      title: "播放量",
      width: 100,
      render: (row) => formatPlays(row.plays),
    },
    {
      key: "quality",
      title: "音质",
      width: 130,
      render: (row) => <QualityStatus song={row} onRefresh={onRefresh} />,
    },
    {
      key: "status",
      title: "状态",
      width: 90,
      render: (row) =>
        row.status === "PUBLISHED" ? (
          <Badge className="bg-primary-700 hover:bg-primary-700">已发布</Badge>
        ) : (
          <Badge variant="secondary">草稿</Badge>
        ),
    },
    {
      key: "actions",
      title: "操作",
      width: 160,
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(row)}
            aria-label="编辑"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(row)}
            aria-label="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}

/** 音质状态指示器 + 转码按钮 */
function QualityStatus({ song, onRefresh }: { song: Song; onRefresh?: () => void }) {
  const { toast } = useToast();
  const [transcoding, setTranscoding] = useState(false);
  const qualities = song.qualities ?? [];
  const qualityCount = qualities.length;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 转码中轮询刷新
  useEffect(() => {
    if (!transcoding) return;
    pollRef.current = setInterval(() => {
      onRefresh?.();
    }, 3000);
    // 5 分钟超时保护
    timeoutRef.current = setTimeout(() => {
      setTranscoding(false);
      toast({ title: "转码超时，请稍后刷新查看", variant: "destructive" });
    }, 300000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [transcoding, onRefresh, toast]);

  // 转码完成后 qualities 会更新，检测到 3 个音质则停止轮询
  useEffect(() => {
    if (transcoding && qualityCount === 3) {
      setTranscoding(false);
      toast({ title: `转码完成：${song.title}` });
    }
  }, [transcoding, qualityCount, song.title, toast]);

  const handleTranscode = useCallback(async () => {
    setTranscoding(true);
    try {
      await request({
        method: "POST",
        url: `/admin/songs/${song.id}/transcode`,
      });
      toast({ title: `转码任务已启动：${song.title}` });
    } catch (err) {
      setTranscoding(false);
      toast({
        title: "转码失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }, [song.id, song.title, toast]);

  if (qualityCount === 3) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 text-[10px]">
          高/中/低
        </Badge>
      </div>
    );
  }

  if (qualityCount > 0) {
    const QUALITY_LABELS: Record<string, string> = { HIGH: "高", MEDIUM: "中", LOW: "低" };
    const levels = qualities.map((q) => QUALITY_LABELS[q.quality] ?? q.quality).join("/");
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="border-amber-500/50 text-amber-600 text-[10px]">
          {levels}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleTranscode}
          disabled={transcoding}
          title="重新转码"
        >
          <RefreshCw className={`h-3 w-3 ${transcoding ? "animate-spin" : ""}`} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="secondary" className="text-[10px]">
        未转码
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleTranscode}
        disabled={transcoding}
        title="开始转码"
      >
        <RefreshCw className={`h-3 w-3 ${transcoding ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}
