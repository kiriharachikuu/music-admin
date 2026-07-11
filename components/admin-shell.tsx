"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Music,
  Disc3,
  ListMusic,
  Image as ImageIcon,
  Users,
  Settings,
  Menu,
  LogOut,
  Sun,
  Moon,
  Smartphone,
  TrendingUp,
  ScrollText,
  Mic,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { clearAuth, getUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 侧边栏菜单项配置
interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  // 精确匹配（仅 pathname === href 时高亮），用于 /dashboard 避免子路由误高亮
  exact?: boolean;
}

const MENU: MenuItem[] = [
  { label: "数据看板", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "歌曲管理", href: "/dashboard/songs", icon: Music },
  { label: "歌手管理", href: "/dashboard/artists", icon: Mic },
  { label: "专辑管理", href: "/dashboard/albums", icon: Disc3 },
  { label: "歌单管理", href: "/dashboard/playlists", icon: ListMusic },
  { label: "Banner 管理", href: "/dashboard/banners", icon: ImageIcon },
  { label: "用户管理", href: "/dashboard/users", icon: Users },
  { label: "排行榜", href: "/dashboard/rankings", icon: TrendingUp },
  { label: "操作日志", href: "/dashboard/logs", icon: ScrollText },
  { label: "App版本", href: "/dashboard/app-versions", icon: Smartphone },
  { label: "系统设置", href: "/dashboard/settings", icon: Settings },
];

// 判断菜单项是否处于激活态
function isActive(item: MenuItem, pathname: string) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

// 侧边栏内容（桌面固定栏与移动端抽屉共用）
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      {/* 品牌 Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo.png"
          alt="XingTone"
          className="h-9 w-9 rounded-xl shadow-md shadow-primary-700/30"
        />
        <div className="leading-tight">
          <div className="text-base font-semibold">XingTone</div>
          <div className="text-xs text-muted-foreground">管理后台</div>
        </div>
      </div>
      {/* 菜单列表 */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {MENU.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? // 选中态：primary-700 实心背景 + 白字
                    "bg-primary-700 text-white shadow-sm shadow-primary-700/30"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      {/* 底部版本信息 */}
      <div className="border-t border-border/60 px-6 py-4 text-xs text-muted-foreground">
        v0.1.0 · XingTone
      </div>
    </div>
  );
}

// 顶部栏
function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUserState] = useState<{ username?: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    setUserState(getUser());
  }, []);

  // 当前页面标题：依据路径匹配菜单项
  const current =
    MENU.find((m) => isActive(m, pathname))?.label || "XingTone管理后台";

  function handleLogout() {
    clearAuth();
    toast({ title: "已退出登录" });
    router.push("/login");
    router.refresh();
  }

  // 头像首字母（无用户名时回退为 A）
  const initial = (user?.username || "A").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:px-8">
      {/* 移动端菜单按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="打开菜单"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold tracking-tight">{current}</h1>

      <div className="ml-auto flex items-center gap-2">
        {/* 主题切换：亮 / 暗互切 */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="切换主题"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {/* mounted 前渲染 Moon，避免 SSR 水合不匹配 */}
          {mounted && theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* 管理员头像 + 操作下拉 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary-700 text-white">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{user?.username || "管理员"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// 管理后台整体外壳：桌面固定侧边栏 + 移动端 Sheet 抽屉 + 顶栏 + 内容区
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* 桌面固定侧边栏（lg 及以上显示） */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/60 bg-card lg:flex">
        <SidebarContent />
      </aside>

      {/* 移动端 Sheet 抽屉（lg 以下显示，点击菜单项自动关闭） */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>导航菜单</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* 主区域：桌面下左侧留出侧边栏宽度 */}
      <div className="lg:pl-64">
        <Topbar onOpenSidebar={() => setOpen(true)} />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
