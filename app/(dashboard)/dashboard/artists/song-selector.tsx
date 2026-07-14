"use client";

import { useCallback, useEffect, useState } from "react";
import { Disc3, Search, X } from "lucide-react";

import { request } from "@/lib/api";
import type { PageResult, Song } from "@/lib/types";
import { useDebounced } from "@/lib/admin-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SongSelectorProps {
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  songs?: Song[];
}

export function SongSelector({
  selectedIds,
  onSelectedChange,
  songs: initialSongs = [],
}: SongSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Song[]>(initialSongs);
  const [total, setTotal] = useState(initialSongs.length);

  const debouncedKeyword = useDebounced(searchKeyword, 300);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Song>>({
        method: "GET",
        url: "/admin/songs",
        params: {
          page,
          pageSize: 20,
          keyword: debouncedKeyword || undefined,
        },
      });
      if (page === 1) {
        setList(res.list ?? []);
      } else {
        setList((prev) => [...prev, ...(res.list ?? [])]);
      }
      setTotal(res.total ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword]);

  useEffect(() => {
    if (open) {
      void loadSongs();
    }
  }, [open, loadSongs]);

  const selectedSongs = list.filter((s) => selectedIds.includes(s.id));

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      onSelectedChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectedChange([...selectedIds, id]);
    }
  }

  function handleLoadMore() {
    if (!loading && list.length < total) {
      setPage((p) => p + 1);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">关联作品</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            选择歌曲
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 min-h-[42px]">
          {selectedSongs.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              尚未选择任何歌曲
            </span>
          ) : (
            selectedSongs.map((song) => (
              <span
                key={song.id}
                className="flex items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-1 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
              >
                <Disc3 className="h-3.5 w-3.5" />
                <span className="max-w-[180px] truncate">{song.title}</span>
                {song.artist && (
                  <span className="text-xs text-muted-foreground">
                    — {song.artist}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleSelect(song.id)}
                  className="ml-0.5 rounded hover:bg-primary-200/50 dark:hover:bg-primary-800/50"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>选择歌曲</DialogTitle>
            <DialogDescription>
              已选择 {selectedIds.length} 首歌曲
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索歌曲名称或歌手"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="mt-4 max-h-[50vh] overflow-y-auto">
            {list.map((song) => (
              <div
                key={song.id}
                onClick={() => toggleSelect(song.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md p-3 transition-colors",
                  selectedIds.includes(song.id)
                    ? "bg-primary-50 dark:bg-primary-900/20"
                    : "hover:bg-muted"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                    selectedIds.includes(song.id)
                      ? "bg-primary-100 dark:bg-primary-800"
                      : "bg-muted"
                  )}
                >
                  <Disc3
                    className={cn(
                      "h-5 w-5",
                      selectedIds.includes(song.id)
                        ? "text-primary-700 dark:text-primary-300"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium",
                      selectedIds.includes(song.id)
                        ? "text-primary-700 dark:text-primary-300"
                        : ""
                    )}
                  >
                    {song.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {song.artist || "未知歌手"}
                    {song.album?.name ? ` · ${song.album.name}` : ""}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full",
                    selectedIds.includes(song.id)
                      ? "bg-primary-700 text-white"
                      : "border-2 border-muted-foreground/30"
                  )}
                >
                  {selectedIds.includes(song.id) && (
                    <span className="text-xs font-bold">✓</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-center py-4">
                <span className="text-sm text-muted-foreground">加载中...</span>
              </div>
            )}
            {!loading && list.length < total && (
              <div className="flex justify-center py-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                >
                  加载更多
                </Button>
              </div>
            )}
            {!loading && list.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Disc3 className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchKeyword ? "未找到匹配的歌曲" : "暂无歌曲"}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
