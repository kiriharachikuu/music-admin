import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// XingTone管理后台 路由守卫（middleware）
// - 未登录访问受保护页面 → 重定向到 /login
// - 已登录访问 /login → 重定向到 /dashboard
// 通过读取 cookie 中的 token 判断登录态（与 lib/auth.ts 的 TOKEN_KEY 保持一致）

const TOKEN_KEY = "xt_admin_token";

// 无需登录即可访问的路径
const PUBLIC_PATHS = ["/login"];
// 无需登录的路径前缀（静态资源 / 接口代理等）
const PUBLIC_PREFIXES = ["/_next", "/favicon", "/icons", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_KEY)?.value;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // 已登录访问登录页 → 直接进看板
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 未登录访问受保护页面 → 跳登录页并记录来源
  if (!isPublic && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 排除 Next 内部静态资源与图标
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
