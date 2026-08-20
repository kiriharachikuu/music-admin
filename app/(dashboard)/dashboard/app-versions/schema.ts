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
