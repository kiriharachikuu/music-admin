"use client";

import { z } from "zod";

export const artistSchema = z.object({
  name: z.string().min(1, "歌手名称不能为空"),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  representativeWorks: z.string().optional(),
  /** 是否拥有公开歌手主页: false=仅署名虚拟歌手; 打开即"转正" */
  hasHomepage: z.boolean(),
});

export type ArtistFormValues = z.infer<typeof artistSchema>;

export function getDefaultArtistFormValues(): ArtistFormValues {
  return {
    name: "",
    avatar: "",
    bio: "",
    representativeWorks: "",
    hasHomepage: true,
  };
}