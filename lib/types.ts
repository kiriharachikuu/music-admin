// XingTone管理后台 - 公共数据类型定义
// 与后端 { code, data, message } 响应解包后的业务数据结构对齐

/** 通用分页查询参数 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

/** 通用分页返回结构（后端 list + total + page + limit） */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/** 文件上传返回结构 */
export interface UploadResult {
  url: string;
}

// ============ 业务实体类型（与 Prisma schema 对齐） ============

export type Role = "USER" | "ADMIN" | "EDITOR";
export type SongStatus = "PUBLISHED" | "DRAFT";
export type BannerStatus = "VISIBLE" | "HIDDEN";

/** 用户 */
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  /** 最近登录时间 */
  lastLoginAt?: string | null;
  /** 累计登录次数 */
  loginCount?: number;
  /** 关联统计：与后端 _count 结构对齐（收藏数 / 歌单数 / 播放历史数） */
  _count?: {
    favorites: number;
    playlists: number;
    playHistories: number;
  };
}

/** 标签 */
export interface Tag {
  id: string;
  name: string;
}

/** 歌手 */
export interface Artist {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  representativeWorks?: string | null;
  createdAt: string;
  updatedAt: string;
  songArtists?: { artist?: Artist; song?: { id: string; title: string } }[];
}

/** 歌曲（含关联字段，用于编辑回显） */
export interface Song {
  id: string;
  title: string;
  artist: string;
  albumId?: string | null;
  album?: { id: string; name: string } | null;
  duration: number;
  fileUrl: string;
  coverUrl?: string | null;
  lyricUrl?: string | null;
  /** 歌词正文（LRC 文本），优先于 lyricUrl */
  lyricContent?: string | null;
  releaseDate: string;
  plays: number;
  status: SongStatus;
  /** 后端返回的关联表结构，前端映射为 tags */
  songTags?: { tag: Tag }[];
  tags?: Tag[];
  /** 后端返回的关联表结构，前端映射为 artists */
  songArtists?: { artist: Artist }[];
  artists?: Artist[];
  /** 音质版本列表（后端原始关联字段名） */
  songQualities?: { quality: string; bitrate: number; fileUrl: string; fileSize: number }[];
  /** 前端映射后的音质列表 */
  qualities?: { quality: string; bitrate: number; fileUrl: string; fileSize: number }[];
  createdAt: string;
  updatedAt: string;
}

/** 专辑 */
export interface Album {
  id: string;
  name: string;
  artist: string;
  cover?: string | null;
  description?: string | null;
  releaseDate: string;
  songCount: number;
  /** 后端返回的关联表结构，前端映射为 artists */
  albumArtists?: { artist: Artist }[];
  artists?: Artist[];
  createdAt: string;
  updatedAt: string;
}

/** 歌单 */
export interface Playlist {
  id: string;
  name: string;
  cover?: string | null;
  description?: string | null;
  userId: string;
  user?: { id: string; username: string; avatar?: string | null } | null;
  isPublic: boolean;
  /** 系统歌单标记：官方运营歌单 */
  isSystem?: boolean;
  playCount: number;
  songCount?: number;
  songs?: Song[];
  createdAt: string;
  updatedAt: string;
}

/** Banner */
export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  /** 关联歌曲 ID：点击优先播放（优先级最高） */
  songId?: string | null;
  /** 广告外链：点击打开新窗口（优先级中） */
  adUrl?: string | null;
  sort: number;
  status: BannerStatus;
  createdAt: string;
  updatedAt: string;
}

/** 直播片段 */
export interface LiveClip {
  id: string;
  title: string;
  artist: string;
  sessionId: string;
  /** 所属场次信息（含直播时间，用于区分同歌不同场次） */
  session?: { id: string; title: string; liveTime?: string };
  trackIndex: number;
  duration: number;
  fileUrl: string;
  coverUrl?: string | null;
  lyricUrl?: string | null;
  lyricContent?: string | null;
  status: SongStatus;
  /** 后端返回的关联表结构，前端可映射为 artists */
  liveClipArtists?: { artist: { id: string; name: string }; sort: number }[];
  createdAt: string;
  updatedAt: string;
}

/** 直播场次 */
export interface LiveSession {
  id: string;
  title: string;
  artist: string;
  cover?: string | null;
  description?: string | null;
  liveTime: string;
  songCount: number;
  /** 场次编号 */
  sessionNumber?: number | null;
  status: SongStatus;
  /** 后端返回的关联表结构，前端可映射为 artists */
  liveSessionArtists?: { artist: { id: string; name: string }; sort: number }[];
  createdAt: string;
  updatedAt: string;
}

/** 直播场次详情（含片段列表） */
export interface LiveSessionDetail extends LiveSession {
  clips: LiveClip[];
}

/** 看板统计 */
export interface StatsData {
  totalUsers: number;
  totalSongs: number;
  totalPlaylists: number;
  totalLiveClips: number;
  totalLiveSessions: number;
  todayPlays: number;
  playTrend: { date: string; plays: number }[];
  topSongs: {
    id: string;
    title: string;
    artist: string;
    coverUrl?: string | null;
    plays: number;
  }[];
  topClips: {
    id: string;
    title: string;
    artist: string;
    coverUrl?: string | null;
    favoriteCount: number;
  }[];
}

/** 系统设置（key-value 平铺为对象） */
export interface SystemSettings {
  siteTitle?: string;
  logoUrl?: string;
  icp?: string;
  copyright?: string;
  seoKeywords?: string;
  seoDescription?: string;
  storageType?: "local" | "s3" | "cos";
  bucket?: string;
  region?: string;
  secretId?: string;
  secretKey?: string;
  sessionToken?: string;
  endpoint?: string;
  publicDomain?: string;
  allowRegister?: boolean;
  defaultQuality?: "standard" | "high" | "lossless";
  [key: string]: unknown;
}

/** App版本 */
export interface AppVersion {
  id: string;
  versionCode: number;
  versionName: string;
  title?: string | null;
  content?: string | null;
  downloadUrl: string;
  fileSize: number;
  md5?: string | null;
  forceUpdate: boolean;
  minVersionCode: number;
  channel: string;
  platform: string;
  /** 发布形态：full(APK完整包) / setup(Win安装版) / portable(Win便携版) */
  variant: string;
  status: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 平台 Web 端更新日志（与后端 PlatformChangelog 模型对齐） */
export interface PlatformChangelog {
  id: string;
  version: string;
  versionCode: number;
  releaseDate: string;
  title?: string | null;
  /** 已解析的更新内容数组 */
  content: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

/** 操作类型（与后端拦截器推断的 action 值对齐） */
export type OperationAction = "CREATE" | "UPDATE" | "DELETE";

/** 操作日志（与 Prisma OperationLog 模型对齐） */
export interface OperationLog {
  id: string;
  userId?: string | null;
  username?: string | null;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  detail?: string | null;
  ip?: string | null;
  createdAt: string;
}

/** 存储迁移进度 */
export type MigrationStatus = "idle" | "running" | "completed" | "failed";
export interface MigrationProgress {
  status: MigrationStatus;
  total: number;
  processed: number;
  migrated: number;
  failed: number;
  skipped: number;
  dbUpdated: number;
  logs: string[];
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

/** 转码任务状态 */
export type TranscodingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

/** 转码任务 */
export interface TranscodingJob {
  id: string;
  status: TranscodingStatus;
  totalSongs: number;
  completedSongs: number;
  failedSongs: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: TranscodingJobItem[];
}

/** 转码任务项（单首歌曲） */
export interface TranscodingJobItem {
  id: string;
  jobId: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  status: TranscodingStatus;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}
