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

export type Role = "USER" | "ADMIN";
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

/** 看板统计 */
export interface StatsData {
  totalUsers: number;
  totalSongs: number;
  todayPlays: number;
  totalPlaylists: number;
  playTrend: { date: string; plays: number }[];
  topSongs: {
    id: string;
    title: string;
    artist: string;
    coverUrl?: string | null;
    plays: number;
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
  storageType?: "local" | "s3";
  s3Endpoint?: string;
  s3Bucket?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Region?: string;
  s3PublicDomain?: string;
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
  status: string;
  downloadCount: number;
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
