// XingTone管理后台 登录态管理
// JWT 同时写入 cookie（供 middleware 服务端读取）与 localStorage（供客户端快速读取）
// 所有方法仅在浏览器环境可用，SSR 时安全返回 null

export const TOKEN_KEY = "xt_admin_token";
export const USER_KEY = "xt_admin_user";

// cookie 有效期：7 天（单位：秒）
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/** 是否处于浏览器环境 */
const isBrowser = () => typeof window !== "undefined";

/** 写入 cookie（path=/，指定 max-age） */
function setCookie(name: string, value: string, maxAge: number) {
  if (!isBrowser()) return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** 读取 cookie 值 */
function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

/** 删除 cookie */
function deleteCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

/** 存储 JWT token（cookie + localStorage 双写） */
export function setToken(token: string) {
  if (!isBrowser()) return;
  setCookie(TOKEN_KEY, token, COOKIE_MAX_AGE);
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 忽略 localStorage 不可用的情况
  }
}

/** 读取 JWT token（优先 cookie，回退 localStorage） */
export function getToken(): string | null {
  if (!isBrowser()) return null;
  const fromCookie = getCookie(TOKEN_KEY);
  if (fromCookie) return fromCookie;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 清除 JWT token */
export function removeToken() {
  if (!isBrowser()) return;
  deleteCookie(TOKEN_KEY);
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // 忽略
  }
}

/** 是否已登录 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/** 存储当前登录用户信息（仅 localStorage） */
export function setUser<T = unknown>(user: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // 忽略
  }
}

/** 读取当前登录用户信息 */
export function getUser<T = unknown>(): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 退出登录：清除 token + 用户信息 */
export function clearAuth() {
  removeToken();
  if (isBrowser()) {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // 忽略
    }
  }
}
