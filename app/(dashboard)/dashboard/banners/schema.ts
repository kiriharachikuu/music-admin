import { z } from "zod";

// Banner 表单校验
// 注：linkUrl/songId/adUrl 直接用 z.string()，默认值在 useForm defaultValues 中提供
// （zod 4 + react-hook-form 对 .optional().default() 的输入/输出类型推断存在不兼容）
export const bannerSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  imageUrl: z.string().min(1, "请上传图片"),
  linkUrl: z.string(),
  songId: z.string(),
  adUrl: z.string(),
  sort: z.number().int("排序需为整数").min(0, "排序需 ≥ 0"),
  status: z.enum(["VISIBLE", "HIDDEN"]),
});

export type BannerFormValues = z.infer<typeof bannerSchema>;

// 表单默认值
export const bannerFormDefaultValues: BannerFormValues = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  songId: "",
  adUrl: "",
  sort: 0,
  status: "VISIBLE",
};
