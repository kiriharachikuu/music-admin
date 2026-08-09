"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { request } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ArtistOption {
  id: string;
  name: string;
  avatar?: string | null;
  songCount: number;
}

interface Props {
  value: string;
  /** name 为输入/选中的名字；artistId 仅在从列表选中已有歌手时有值 */
  onChange: (name: string, artistId?: string) => void;
  /** 初始预取用的关键词（如所在分组的建议规范名） */
  seed?: string;
  placeholder?: string;
  className?: string;
}

/**
 * 可搜索的歌手输入框：拉现有歌手列表，按匹配度排序（最适配在前），
 * 既能选已有歌手（带回 artistId），也能直接输入新名字。
 */
export function ArtistCombobox({ value, onChange, seed, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const fetchOptions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await request<{ list: ArtistOption[] }>({
        method: "GET",
        url: "/admin/artist-merge/artists",
        params: { q: q || undefined, limit: 20 },
      });
      setOptions(res.list ?? []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 防抖搜索
  useEffect(() => {
    if (!open) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void fetchOptions(value || seed || ""), 200);
    return () => clearTimeout(timer.current);
  }, [value, seed, open, fetchOptions]);

  // 点击外部关闭
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          className="h-8 pr-7"
        />
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {loading ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">搜索中…</div>
          ) : options.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              无匹配歌手 · 将作为<b className="text-foreground">新歌手</b>创建
            </div>
          ) : (
            options.map((o) => {
              const selected = o.name === value;
              return (
                <button
                  key={o.id}
                  type="button"
                  // 用 mousedown 抢在 input blur 之前，保证点击生效
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(o.name, o.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                    selected && "bg-accent/60",
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                    <span className="truncate">{o.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{o.songCount} 首</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
