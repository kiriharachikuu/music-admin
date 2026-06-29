import { redirect } from "next/navigation";

// 根路由：直接重定向到看板
// 未登录用户会被 middleware 拦截重定向到 /login
export default function Home() {
  redirect("/dashboard");
}
