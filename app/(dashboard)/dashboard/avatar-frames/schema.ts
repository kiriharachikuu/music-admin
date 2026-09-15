import { z } from "zod";

// 头像框表单校验
export const avatarFrameSchema = z.object({
  name: z.string().min(1, "请输入名称"),
  imageUrl: z.string().min(1, "请上传框图"),
  sort: z.number().int("排序需为整数").min(0, "排序需 ≥ 0"),
  status: z.enum(["VISIBLE", "HIDDEN"]),
});

export type AvatarFrameFormValues = z.infer<typeof avatarFrameSchema>;

// 表单默认值
export const avatarFrameFormDefaultValues: AvatarFrameFormValues = {
  name: "",
  imageUrl: "",
  sort: 0,
  status: "VISIBLE",
};
