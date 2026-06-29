import { AdminShell } from "@/components/admin-shell";

// (dashboard) 路由组布局：所有受保护页面共享侧边栏 + 顶栏外壳
// 登录态由 middleware.ts 在路由层强制校验
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
