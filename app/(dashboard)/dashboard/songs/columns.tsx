"use client";

import { Pencil, Trash2 } from "lucide-react";

import type { Song } from "@/lib/types";
import { formatDuration, formatPlays } from "@/lib/admin-utils";
import { type DataTableColumn } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolveMediaUrl } from "@/lib/utils";

export interface SongColumnsOptions {
  onEdit: (song: Song) => void;
  onDelete: (song: Song) => void;
}

// 歌曲列表表格列定义
export function getSongColumns(options: SongColumnsOptions): DataTableColumn<Song>[] {
  const { onEdit, onDelete } = options;
  return [
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
      width: 120,
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
