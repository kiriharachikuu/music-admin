"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Music2 } from "lucide-react";

import api from "@/lib/api";
import { setToken, setUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// 登录表单校验规则
const loginSchema = z.object({
  username: z.string().min(1, { message: "请输入用户名" }),
  password: z
    .string()
    .min(1, { message: "请输入密码" })
    .min(6, { message: "密码至少 6 位" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// 后端登录接口返回数据
interface LoginResult {
  token: string;
  user?: {
    id?: string | number;
    username?: string;
    role?: string;
    avatar?: string;
  };
}

function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setSubmitting(true);
    try {
      // api 响应拦截器已解包 { code, data, message }，此处直接拿到业务数据
      const data = await api.post<unknown, LoginResult>("/auth/login", values);
      setToken(data.token);
      if (data.user) setUser(data.user);
      toast({ title: "登录成功", description: "欢迎回到XingTone管理后台" });
      // 支持 middleware 透传的来源路径，默认跳转看板
      const from = searchParams.get("from") || "/dashboard";
      router.push(from);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录失败，请重试";
      toast({
        title: "登录失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/60 shadow-2xl shadow-primary-700/10">
      <CardHeader className="space-y-3 text-center">
        {/* 品牌徽标：星瞳紫圆角图标 */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700 text-white shadow-lg shadow-primary-700/30">
          <Music2 className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          XingTone管理后台
        </CardTitle>
        <CardDescription>请使用管理员账号登录</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入用户名"
                      autoComplete="username"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 登录按钮：primary-700 实心，hover/active 走色阶 */}
            <Button
              type="submit"
              className="w-full bg-primary-700 text-white hover:bg-primary-600 active:bg-primary-800"
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "登录中..." : "登录"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* 背景星瞳紫光晕装饰（纯视觉，不抢占注意力） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-700/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl"
      />
      {/* useSearchParams 需 Suspense 包裹，避免静态生成时报错 */}
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
