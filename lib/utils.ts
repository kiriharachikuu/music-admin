import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 将后端返回的相对路径（如 /uploads/...）解析为可访问的绝对 URL
 * - 空值返回空字符串
 * - 已是绝对 URL（http/https）直接返回
 * - /uploads/ 开头的路径拼接后端 origin（从 NEXT_PUBLIC_API_BASE 提取）
 * - 其他相对路径（如 /icons/logo.png）原样返回（admin 自身静态资源）
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads/")) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
    // 从 https://api.example.com/api 提取 https://api.example.com
    const origin = apiBase.replace(/\/api\/?$/, "");
    return `${origin}${url}`;
  }
  return url;
}
