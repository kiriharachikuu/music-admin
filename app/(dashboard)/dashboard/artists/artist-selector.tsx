"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X, User, Plus } from "lucide-react";

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
  /** 新歌手名字 (无歌手主页, 仅在歌曲信息署名), 提交时作为 artistNames */
  newNames?: string[];
  onNewNamesChange?: (names: string[]) => void;
  artists?: Artist[];
}

export function ArtistSelector({
  selectedIds,
  onSelectedChange,
  newNames = [],
  onNewNamesChange,
  artists: initialArtists = [],
}: ArtistSelectorProps) {
  const [newNameInput, setNewNameInput] = useState("");
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

  // 已选歌手预览：合并当前列表和初始列表中的已选项，确保分页/搜索后已选项仍可见
  const selectedArtists = [
    ...list.filter((a) => selectedIds.includes(a.id)),
    ...initialArtists.filter(
      (a) => selectedIds.includes(a.id) && !list.some((l) => l.id === a.id)
    ),
  ];

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      onSelectedChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectedChange([...selectedIds, id]);
    }
  }

  // 添加仅署名的新歌手名: 去空、去重 (名字间及与已选歌手间)
  function addNewName(raw?: string) {
    const name = (raw ?? newNameInput).trim();
    if (!name) return;
    const lower = name.toLowerCase();
    const dupName =
      newNames.some((n) => n.toLowerCase() === lower) ||
      selectedArtists.some((a) => a.name.toLowerCase() === lower);
    if (!dupName) {
      onNewNamesChange?.([...newNames, name]);
    }
    setNewNameInput("");
  }

  function removeNewName(name: string) {
    onNewNamesChange?.(newNames.filter((n) => n !== name));
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            选择已有歌手
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 rounded-md border border-input p-3 min-h-[42px]">
          {selectedArtists.map((artist) => (
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
          ))}
          {newNames.map((name) => (
            <span
              key={name}
              title="仅署名歌手, 无公开主页"
              className="flex items-center gap-1.5 rounded-md border border-dashed border-amber-400 bg-amber-50 px-2.5 py-1 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            >
              <User className="h-3 w-3" />
              {name}
              <button
                type="button"
                onClick={() => removeNewName(name)}
                className="ml-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedArtists.length === 0 && newNames.length === 0 && (
            <span className="text-sm text-muted-foreground">请选择歌手</span>
          )}
        </div>
        {/* 直接输入新歌手名: 自动建为无主页的虚拟歌手, 只在歌曲信息显示名字 */}
        <div className="flex gap-2">
          <Input
            value={newNameInput}
            onChange={(e) => setNewNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNewName();
              }
            }}
            placeholder="输入新歌手名字（无歌手页，仅显示名字）"
            className="h-9 flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addNewName()}
            disabled={!newNameInput.trim()}
          >
            <Plus className="h-4 w-4" />
            添加
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden">
          <DialogHeader>
            <DialogTitle>选择已有歌手</DialogTitle>
            <DialogDescription>
              已选择 {selectedIds.length} 位歌手{newNames.length > 0 ? `，${newNames.length} 个新名字` : ""}；新名字可直接在下方输入框添加
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
                    "flex items-center gap-1.5 font-medium",
                    selectedIds.includes(artist.id)
                      ? "text-primary-700 dark:text-primary-300"
                      : ""
                  )}>
                    <span className="truncate">{artist.name}</span>
                    {artist.hasHomepage === false && (
                      <span className="shrink-0 rounded border border-amber-400 px-1 text-[10px] font-normal leading-4 text-amber-600 dark:text-amber-400">
                        仅署名
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {artist.hasHomepage === false
                      ? "无歌手页，仅在歌曲信息显示名字"
                      : artist.representativeWorks || "暂无代表作"}
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
                <User className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchKeyword ? "未找到匹配的歌手" : "暂无歌手"}
                </p>
                {searchKeyword.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => addNewName(searchKeyword)}
                  >
                    <Plus className="h-4 w-4" />
                    将「{searchKeyword.trim()}」作为新歌手名添加
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}