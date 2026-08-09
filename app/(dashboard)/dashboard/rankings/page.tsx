"use client";

// XingTone 管理后台 - 排行榜（只读，与前端 /rankings 同步）
// 展示 3 个榜单：飙升 / 新歌 / 热歌
// 对接 GET /api/rankings（与前端 /rankings 同一接口）
import { useEffect, useState } from "react";
import { Music } from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl, cn } from "@/lib/utils";
import { formatPlays } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";

/** 排行榜单条记录（后端 Song 字段子集，与前端 /rankings 一致） */
interface RankingSong {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string | null;
  plays: number;
  favoriteCount: number;
  releaseDate: string;
  album?: { name: string } | null;
}

/** 后端 /api/rankings 响应结构（与前端 RankingsData 一致） */
interface RankingsResponse {
  soar: RankingSong[];
  new: RankingSong[];
  hot: RankingSong[];
}

/** 前端榜单 Tab key */
type RankingTab = "soar" | "new" | "hot";

/** 榜单 Tab 配置：与前端 /rankings 保持一致 */
const TABS: {
  key: RankingTab;
  label: string;
  field: keyof RankingsResponse;
  desc: string;
}[] = [
  { key: "soar", label: "飙升榜", field: "soar", desc: "近 7 天播放增长最快" },
  { key: "new", label: "新歌榜", field: "new", desc: "官方系统歌单人工推荐" },
  { key: "hot", label: "热歌榜", field: "hot", desc: "近 7 天播放量冠军" },
];

export default function RankingsAdminPage() {
  const { toast } = useToast();
  const [active, setActive] = useState<RankingTab>("soar");
  const [data, setData] = useState<RankingsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await request<RankingsResponse>({
          method: "GET",
          url: "/rankings",
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
  }, [toast]);

  const currentTab = TABS.find((t) => t.key === active)!;
  const songs = data ? data[currentTab.field] ?? [] : [];

  const columns: DataTableColumn<RankingSong>[] = [
    {
      key: "rank",
      title: "#",
      width: 56,
      render: (_row, index) => (
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold",
            index < 3
              ? "bg-primary-700 text-white"
              : "bg-muted text-muted-foreground"
          )}
        >
          {index + 1}
        </span>
      ),
    },
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
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title}</p>
          {row.album?.name && (
            <p className="truncate text-xs text-muted-foreground">
              《{row.album.name}》
            </p>
          )}
        </div>
      ),
    },
    {
      key: "artist",
      title: "歌手",
      width: 160,
      render: (row) => (
        <span className="text-muted-foreground">{row.artist}</span>
      ),
    },
    {
      key: "plays",
      title: "播放量",
      width: 120,
      render: (row) => (
        <span className="font-medium">{formatPlays(row.plays ?? 0)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="排行榜"
        description="查看各榜单歌曲排行（与前端 /rankings 同步，只读）"
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
