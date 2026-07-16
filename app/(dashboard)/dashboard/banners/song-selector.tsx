"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Music2, X, Loader2 } from "lucide-react";

import { request } from "@/lib/api";
import type { PageResult, Song } from "@/lib/types";
import { useDebounced, formatDuration } from "@/lib/admin-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveMediaUrl } from "@/lib/utils";

export interface SongSelectorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (song: Song) => void;
}

export function SongSelector({ open, onOpenChange, onSelect }: SongSelectorProps) {
  const [keyword, setKeyword] = useState("");
  const debounced = useDebounced(keyword, 300);
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Song>>({
        method: "GET",
        url: "/admin/songs",
        params: {
          page,
          pageSize,
          keyword: debounced || undefined,
          status: "PUBLISHED",
        },
      });
      setSongs(res.list ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, debounced]);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>选择歌曲</DialogTitle>
          <DialogDescription>搜索并选择要关联到 Banner 的歌曲</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索歌曲标题或歌手..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary-700" />
              </div>
            ) : songs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Music2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {debounced ? "没有找到匹配的歌曲" : "暂无歌曲"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {songs.map((song) => (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => {
                      onSelect(song);
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-primary-700/5"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {song.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(song.coverUrl)}
                          alt={song.title}
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
                        {song.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {song.artist}
                        {song.album?.name ? ` · ${song.album.name}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDuration(song.duration)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">
                共 {total} 首歌曲
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= total}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
