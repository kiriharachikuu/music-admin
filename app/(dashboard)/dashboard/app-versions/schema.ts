import { z } from "zod";

export const appVersionSchema = z.object({
  versionCode: z.number().int("版本号需为整数").min(1, "版本号需 ≥ 1"),
  versionName: z.string().min(1, "请输入版本名称"),
  title: z.string().nullish(),
  content: z.string().nullish(),
  downloadUrl: z.string().nullish(),
  fileSize: z.number().int("文件大小需为整数").min(0, "文件大小需 ≥ 0"),
  md5: z.string().nullish(),
  forceUpdate: z.boolean(),
  minVersionCode: z.number().int("最低版本需为整数").min(0, "最低版本需 ≥ 0"),
  channel: z.enum(["stable", "beta"]),
  platform: z.enum(["android", "windows", "ios"]),
  variant: z.enum(["full", "setup", "portable"]),
  status: z.enum(["draft", "published", "deprecated"]),
}).superRefine((data, ctx) => {
  // PC 客户端按语义化版本号（semver）比较 versionName，
  // Windows 平台若填入非 semver 格式会导致 /update/pc 解析失败、检测不到更新，故发布前强校验
  if (data.platform === "windows") {
    const v = (data.versionName ?? "").trim();
    // 与后端 semver.util.ts 解析规则一致：可选 v 前缀、1~3 段数字、可选预发布后缀
    if (!/^v?\d+(?:\.\d+){0,2}(?:-[\w.-]+)?$/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["versionName"],
        message: "Windows 版本名称需为语义化版本号（如 1.2.0）",
      });
    }
  }
});

export type AppVersionFormValues = z.infer<typeof appVersionSchema>;

// 表单默认值
export const appVersionFormDefaultValues: AppVersionFormValues = {
  versionCode: 1,
  versionName: "",
  title: "",
  content: "",
  downloadUrl: "",
  fileSize: 0,
  md5: "",
  forceUpdate: false,
  minVersionCode: 0,
  channel: "stable",
  platform: "android",
  variant: "full",
  status: "published",
};

export const CHANNEL_OPTIONS = [
  { value: "stable", label: "正式版" },
  { value: "beta", label: "测试版" },
] as const;

export const PLATFORM_OPTIONS = [
  { value: "android", label: "Android" },
  { value: "windows", label: "Windows" },
  { value: "ios", label: "iOS" },
] as const;

export const VARIANT_OPTIONS = [
  { value: "full", label: "完整包 (APK)" },
  { value: "setup", label: "安装版 (Setup)" },
  { value: "portable", label: "便携版 (Portable)" },
] as const;

export const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "deprecated", label: "已废弃" },
] as const;
