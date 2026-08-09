"use client";

// XingTone - 数据看板
// 顶部 4 个核心指标卡片 + 七日播放趋势 AreaChart + 热门歌曲 Top10 排行
// 对接 GET /api/admin/stats
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ListMusic,
  Music,
  Play,
  Users,
  Tag,
  Upload,
  Image as ImageIcon,
  Rocket,
  ArrowRight,
  Radio,
  Scissors,
  Heart,
} from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/utils";
import type { StatsData, AppVersion, PlatformChangelog } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// 数字千分位格式化（容错：null/undefined/NaN 视作 0）
function formatNumber(n: unknown): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return v.toLocaleString("zh-CN");
}

// 时长秒数格式化为 mm:ss
function formatPlays(n: unknown): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  return formatNumber(v);
}

// 收藏数格式化
function formatFavorites(n: unknown): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  return formatNumber(v);
}

// 图表 Tooltip 自定义渲染
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs shadow-md">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-primary-700">
        播放量：{formatNumber(payload[0].value)}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestAppVersion, setLatestAppVersion] = useState<AppVersion | null>(null);
  const [latestPlatform, setLatestPlatform] = useState<PlatformChangelog | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await request<StatsData>({
          method: "GET",
          url: "/admin/stats",
        });
        if (!cancelled) setStats(data);
      } catch {
        // 接口未实现时静默失败，保留空态
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // 获取最新已发布的 Android App 版本
    async function loadAppVersion() {
      try {
        const res = await request<{ list: AppVersion[] }>({
          method: "GET",
          url: "/admin/app-versions",
          params: { limit: 1, status: "published" },
        });
        if (!cancelled && res.list?.length > 0) {
          setLatestAppVersion(res.list[0]);
        }
      } catch {
        // 静默失败
      }
    }

    // 获取最新已发布的平台 Web 版本
    async function loadPlatformVersion() {
      try {
        const list = await request<PlatformChangelog[]>({
          method: "GET",
          url: "/admin/platform-changelogs",
          params: { limit: 1, status: "published" },
        });
        if (!cancelled && Array.isArray(list) && list.length > 0) {
          setLatestPlatform(list[0]);
        }
      } catch {
        // 静默失败
      }
    }

    void load();
    void loadAppVersion();
    void loadPlatformVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  // 热门歌曲 Top10 中最大播放量，用于进度条占比计算
  const maxPlays = useMemo(() => {
    if (!stats?.topSongs?.length) return 1;
    return Math.max(...stats.topSongs.map((s) => s.plays), 1);
  }, [stats]);

  // 热门歌切 Top10 中最大收藏数，用于进度条占比计算
  const maxFavorites = useMemo(() => {
    if (!stats?.topClips?.length) return 1;
    return Math.max(...stats.topClips.map((c) => c.favoriteCount), 1);
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="数据看板"
          description="XingTone平台核心运营指标一览"
        />
        {/* 区分 App 客户端与 Web 平台两个版本徽标 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {latestAppVersion && (
            <div className="flex items-center gap-2 rounded-lg border border-primary-500/20 bg-primary-500/5 px-3 py-1.5">
              <Tag className="h-4 w-4 text-primary-700" />
              <span className="text-xs text-foreground/60">Android 客户端</span>
              <span className="text-sm font-semibold text-primary-700">
                v{latestAppVersion.versionName}
              </span>
              <span className="text-xs text-foreground/40">
                ({latestAppVersion.versionCode})
              </span>
            </div>
          )}
          {latestPlatform && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
              <Tag className="h-4 w-4 text-emerald-700" />
              <span className="text-xs text-foreground/60">Web 平台</span>
              <span className="text-sm font-semibold text-emerald-700">
                v{latestPlatform.version}
              </span>
              <span className="text-xs text-foreground/40">
                ({latestPlatform.versionCode})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 顶部核心指标卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="总用户数"
          value={formatNumber(stats?.totalUsers)}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="歌曲总数"
          value={formatNumber(stats?.totalSongs)}
          icon={Music}
          loading={loading}
        />
        <StatCard
          title="歌切总数"
          value={formatNumber(stats?.totalLiveClips)}
          icon={Scissors}
          loading={loading}
        />
        <StatCard
          title="直播场次"
          value={formatNumber(stats?.totalLiveSessions)}
          icon={Radio}
          loading={loading}
        />
        <StatCard
          title="今日播放量"
          value={formatNumber(stats?.todayPlays)}
          icon={Play}
          loading={loading}
        />
        <StatCard
          title="歌单总数"
          value={formatNumber(stats?.totalPlaylists)}
          icon={ListMusic}
          loading={loading}
        />
      </div>

      {/* 快捷操作入口：上传歌曲 / 添加横幅 / 发布版本 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(
          [
            {
              href: "/dashboard/songs",
              icon: Upload,
              title: "上传歌曲",
              desc: "新增音频并填写元数据",
            },
            {
              href: "/dashboard/banners",
              icon: ImageIcon,
              title: "添加横幅",
              desc: "配置首页轮播 Banner",
            },
            {
              href: "/dashboard/app-versions",
              icon: Rocket,
              title: "发布版本",
              desc: "发布新版本并推送更新",
            },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary-500/40 hover:shadow-md hover:shadow-primary-700/5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-700/10 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.desc}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary-700" />
            </Link>
          );
        })}
      </div>

      {/* 七日播放趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle>七日播放趋势</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.playTrend ?? []}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <defs>
                    {/* primary 渐变填充：from primary-500/30 to primary-700/60 */}
                    <linearGradient
                      id="playTrendGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#A855F7"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="#8B00FF"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    // 仅显示月-日
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="plays"
                    stroke="#8B00FF"
                    strokeWidth={2}
                    fill="url(#playTrendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 热门歌曲排行 Top10 */}
      <Card>
        <CardHeader>
          <CardTitle>热门歌曲排行 Top 10</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : !stats?.topSongs?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              暂无数据
            </p>
          ) : (
            stats.topSongs.map((song, index) => {
              // 进度条占比 = 当前播放量 / 最大播放量
              const percent = Math.round((song.plays / maxPlays) * 100);
              return (
                <div
                  key={song.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50"
                >
                  {/* 排名：前 3 名 primary 强调 */}
                  <span
                    className={
                      index < 3
                        ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-700 text-xs font-bold text-white"
                        : "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground"
                    }
                  >
                    {index + 1}
                  </span>
                  {/* 封面 */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {song.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                src={resolveMediaUrl(song.coverUrl)}
                alt={song.title}
                className="h-full w-full object-cover"
              />
                    )}
                  </div>
                  {/* 歌名 + 歌手 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{song.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {song.artist}
                    </p>
                  </div>
                  {/* 播放量 + 进度条 primary 渐变 */}
                  <div className="flex w-32 shrink-0 flex-col items-end gap-1 sm:w-48">
                    <span className="text-xs font-medium text-primary-700">
                      {formatPlays(song.plays)}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* 热门歌切排行 Top10（按收藏数排序） */}
      <Card>
        <CardHeader>
          <CardTitle>热门歌切排行 Top 10</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))
          ) : !stats?.topClips?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              暂无数据
            </p>
          ) : (
            stats.topClips.map((clip, index) => {
              const percent = Math.round(
                (clip.favoriteCount / maxFavorites) * 100,
              );
              return (
                <div
                  key={clip.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50"
                >
                  <span
                    className={
                      index < 3
                        ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-700 text-xs font-bold text-white"
                        : "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground"
                    }
                  >
                    {index + 1}
                  </span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {clip.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveMediaUrl(clip.coverUrl)}
                        alt={clip.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{clip.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {clip.artist}
                    </p>
                  </div>
                  <div className="flex w-32 shrink-0 flex-col items-end gap-1 sm:w-48">
                    <span className="flex items-center gap-0.5 text-xs font-medium text-primary-700">
                      <Heart className="h-3 w-3" />
                      {formatFavorites(clip.favoriteCount)}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
