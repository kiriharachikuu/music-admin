"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X, User } from "lucide-react";

import { request } from "@/lib/api";
import type { Artist, PageResult } from "@/lib/types";
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
import { cn, resolveMediaUrl } from "@/lib/utils";

export interface ArtistSelectorProps {
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  artists?: Artist[];
}

export function ArtistSelector({
  selectedIds,
  onSelectedChange,
  artists: initialArtists = [],
}: ArtistSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Artist[]>(initialArtists);
  const [total, setTotal] = useState(initialArtists.length);

  const debouncedKeyword = useDebounced(searchKeyword, 300);

  const loadArtists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<Artist>>({
        method: "GET",
        url: "/admin/artists",
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
      void loadArtists();
    }
  }, [open, loadArtists]);

  const selectedArtists = list.filter((a) => selectedIds.includes(a.id));

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
          <span className="text-sm font-medium">歌手</span>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            选择歌手
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 min-h-[42px]">
          {selectedArtists.length === 0 ? (
            <span className="text-sm text-muted-foreground">请选择歌手</span>
          ) : (
            selectedArtists.map((artist) => (
              <span
                key={artist.id}
                className="flex items-center gap-1.5 rounded-md bg-primary-50 px-2.5 py-1 text-sm text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                  {artist.avatar ? (
                    <img
                      src={resolveMediaUrl(artist.avatar)}
                      alt={artist.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                {artist.name}
                <button
                  type="button"
                  onClick={() => toggleSelect(artist.id)}
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
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>选择歌手</DialogTitle>
            <DialogDescription>
              已选择 {selectedIds.length} 位歌手
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索歌手名称"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="mt-4 max-h-[50vh] overflow-y-auto">
            {list.map((artist) => (
              <div
                key={artist.id}
                onClick={() => toggleSelect(artist.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md p-3 transition-colors",
                  selectedIds.includes(artist.id)
                    ? "bg-primary-50 dark:bg-primary-900/20"
                    : "hover:bg-muted"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  selectedIds.includes(artist.id)
                    ? "bg-primary-100 dark:bg-primary-800"
                    : "bg-muted"
                )}>
                  {artist.avatar ? (
                    <img
                      src={resolveMediaUrl(artist.avatar)}
                      alt={artist.name}
                      className="h-full w-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <User className={cn(
                      "h-5 w-5",
                      selectedIds.includes(artist.id)
                        ? "text-primary-700 dark:text-primary-300"
                        : "text-muted-foreground"
                    )} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    selectedIds.includes(artist.id)
                      ? "text-primary-700 dark:text-primary-300"
                      : ""
                  )}>
                    {artist.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {artist.representativeWorks || "暂无代表作"}
                  </p>
                </div>
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  selectedIds.includes(artist.id)
                    ? "bg-primary-700 text-white"
                    : "border-2 border-muted-foreground/30"
                )}>
                  {selectedIds.includes(artist.id) && (
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
                <User className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchKeyword ? "未找到匹配的歌手" : "暂无歌手"}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}