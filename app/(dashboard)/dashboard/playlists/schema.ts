import { z } from "zod";

// 歌单基础信息表单校验
// 注：description / cover 直接用 z.string()，默认值在 useForm defaultValues 中提供
// （zod 4 + react-hook-form 对 .optional().default() 的输入/输出类型推断存在不兼容）
export const playlistSchema = z.object({
  name: z.string().min(1, "请输入歌单名称"),
  description: z.string(),
  cover: z.string(),
  isPublic: z.boolean(),
  isSystem: z.boolean(),
});

export type PlaylistFormValues = z.infer<typeof playlistSchema>;

// 表单默认值
export const playlistFormDefaultValues: PlaylistFormValues = {
  name: "",
  description: "",
  cover: "",
  isPublic: true,
  isSystem: false,
};
