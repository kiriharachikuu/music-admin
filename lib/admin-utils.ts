// XingTone管理后台 - 通用工具函数
// 各业务页面共享，避免重复实现

/** 秒数格式化为 mm:ss */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** 数字千分位格式化 */
export function formatNumber(n: number): string {
  return n.toLocaleString("zh-CN");
}

/** 播放量友好显示：1.2万 */
export function formatPlays(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return formatNumber(n);
}

/** ISO 时间字符串格式化为 YYYY-MM-DD */
export function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO 时间字符串格式化为 YYYY-MM-DD HH:mm */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDate(iso)} ${hh}:${mm}`;
}

/** 把 ISO 日期转为 input[type=date] 需要的 YYYY-MM-DD */
export function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  return formatDate(iso);
}

/** 简单 debounce hook，返回带 debounce 的值 */
import { useEffect, useState } from "react";
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** 文件大小格式化：字节 → KB/MB/GB */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
