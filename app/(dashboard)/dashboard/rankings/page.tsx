"use client";

// XingTone 管理后台 - 排行榜（只读）
// 展示 4 个榜单（飙升/新歌/热歌/原创）+ 维度切换（播放量/收藏量）
// 调用 GET /api/rankings?by=play|favorite
import { useEffect, useState } from "react";
import { Music } from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl, cn } from "@/lib/utils";
import { formatPlays } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";

/** 排行榜歌曲（后端 Song 模型字段子集，含 favoriteCount） */
interface RankingSong {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  plays: number;
  favoriteCount: number;
}

/** 后端排行榜聚合数据（字段名 soaring/newSongs） */
interface RankingsResponse {
  soaring: RankingSong[];
  newSongs: RankingSong[];
  hot: RankingSong[];
  original: RankingSong[];
}

/** 前端榜单 Tab key */
type RankingTab = "soar" | "new" | "hot" | "original";

/** 榜单 Tab 配置：field 对应 RankingsResponse 的字段 */
const TABS: {
  key: RankingTab;
  label: string;
  field: keyof RankingsResponse;
  desc: string;
}[] = [
  {
    key: "soar",
    label: "飙升榜",
    field: "soaring",
    desc: "近 30 天上升最快的好歌",
  },
  { key: "new", label: "新歌榜", field: "newSongs", desc: "最新上架单曲" },
  { key: "hot", label: "热歌榜", field: "hot", desc: "本周播放冠军" },
  { key: "original", label: "原创榜", field: "original", desc: "独立音乐人之选" },
];

/** 维度切换配置 */
const DIMENSIONS: { key: "play" | "favorite"; label: string }[] = [
  { key: "play", label: "播放量" },
  { key: "favorite", label: "收藏量" },
];

export default function RankingsAdminPage() {
  const { toast } = useToast();
  // 维度：播放量（默认）/ 收藏量
  const [dimension, setDimension] = useState<"play" | "favorite">("play");
  const [active, setActive] = useState<RankingTab>("soar");
  const [data, setData] = useState<RankingsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // 拉取榜单数据：维度变化时重新请求
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await request<RankingsResponse>({
          method: "GET",
          url: "/rankings",
          params: { by: dimension },
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "加载失败",
            description: err instanceof Error ? err.message : "请稍后重试",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [dimension, toast]);

  const currentTab = TABS.find((t) => t.key === active)!;
  const songs = data ? data[currentTab.field] ?? [] : [];

  // 列定义：封面 / 标题 / 歌手 / 播放量 / 收藏量
  // 当前维度对应的列高亮显示（font-medium + text-foreground）
  const columns: DataTableColumn<RankingSong>[] = [
    {
      key: "cover",
      title: "封面",
      width: 64,
      render: (row) => (
        <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
          {row.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(row.coverUrl)}
              alt={row.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Music className="h-4 w-4" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "title",
      title: "标题",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "artist",
      title: "歌手",
      render: (row) => (
        <span className="text-muted-foreground">{row.artist}</span>
      ),
    },
    {
      key: "plays",
      title: "播放量",
      width: 120,
      render: (row) => (
        <span
          className={cn(
            dimension === "play"
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          {formatPlays(row.plays)}
        </span>
      ),
    },
    {
      key: "favoriteCount",
      title: "收藏量",
      width: 120,
      render: (row) => (
        <span
          className={cn(
            dimension === "favorite"
              ? "font-medium text-foreground"
              : "text-muted-foreground"
          )}
        >
          {formatPlays(row.favoriteCount ?? 0)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="排行榜"
        description="查看各榜单歌曲排行（只读）"
        actions={
          /* 维度切换：圆角分段（播放量 / 收藏量） */
          <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
            {DIMENSIONS.map((d) => {
              const isActive = dimension === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDimension(d.key)}
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-700 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* 榜单 Tab：下划线式 */}
      <div className="flex items-center gap-6 border-b border-border">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                "relative shrink-0 pb-3 pt-1 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary-700"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {/* 选中下划线 */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-700" />
              )}
            </button>
          );
        })}
        <span className="ml-auto pb-3 text-xs text-muted-foreground">
          {currentTab.desc} · 共 {songs.length} 首
        </span>
      </div>

      {/* 榜单表格（只读） */}
      <DataTable
        columns={columns}
        data={songs}
        loading={loading}
        rowKey={(row) => row.id}
        page={1}
        pageSize={50}
        total={songs.length}
        onPageChange={() => {}}
        showPagination={false}
        emptyText="该榜单暂无数据"
      />
    </div>
  );
}
