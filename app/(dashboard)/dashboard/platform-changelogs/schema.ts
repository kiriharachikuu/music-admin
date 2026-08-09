import { z } from "zod";

export const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
] as const;

export const changelogFormSchema = z.object({
  version: z.string().min(1, "请输入版本号"),
  versionCode: z.number().int().min(1, "请输入版本码"),
  title: z.string().optional(),
  content: z
    .string()
    .min(1, "请输入更新内容")
    .refine(
      (v) => {
        try {
          const arr = JSON.parse(v);
          return Array.isArray(arr) && arr.every((x) => typeof x === "string");
        } catch {
          return false;
        }
      },
      { message: "更新内容必须是字符串数组 JSON，例如 [\"新增 xxx\"]" }
    ),
  status: z.enum(["draft", "published"]),
  releaseDate: z.string().optional(),
});

export type ChangelogFormValues = z.infer<typeof changelogFormSchema>;

export const changelogFormDefaultValues: ChangelogFormValues = {
  version: "",
  versionCode: 1,
  title: "",
  content: "[]",
  status: "published",
  releaseDate: "",
};
