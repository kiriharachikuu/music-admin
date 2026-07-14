import { z } from "zod";

// "无专辑"哨兵值，提交时转 null
export const NO_ALBUM = "__none__";

// 歌曲表单校验规则
// 注：coverUrl / lyricUrl 直接用 z.string()，默认值在 useForm defaultValues 中提供
// （zod 4 + react-hook-form 对 .optional().default() 的输入/输出类型推断存在不兼容）
export const songSchema = z.object({
  title: z.string().min(1, "请输入歌曲标题"),
  artist: z.string().optional(),
  albumId: z.string(),
  duration: z.number().int("时长需为整数").min(1, "时长需大于 0"),
  fileUrl: z.string().min(1, "请上传音频文件"),
  coverUrl: z.string(),
  lyricUrl: z.string(),
  releaseDate: z.string().min(1, "请选择发行日期"),
  status: z.enum(["PUBLISHED", "DRAFT"]),
});

export type SongFormValues = z.infer<typeof songSchema>;

// 空白表单默认值：每次调用返回新对象，releaseDate 取调用时的当前日期
export function getDefaultSongFormValues(): SongFormValues {
  return {
    title: "",
    artist: "",
    albumId: NO_ALBUM,
    duration: 0,
    fileUrl: "",
    coverUrl: "",
    lyricUrl: "",
    releaseDate: new Date().toISOString().slice(0, 10),
    status: "PUBLISHED",
  };
}
