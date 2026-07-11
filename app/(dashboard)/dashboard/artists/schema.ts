"use client";

import { z } from "zod";

export const artistSchema = z.object({
  name: z.string().min(1, "歌手名称不能为空"),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  representativeWorks: z.string().optional(),
});

export type ArtistFormValues = z.infer<typeof artistSchema>;

export function getDefaultArtistFormValues(): ArtistFormValues {
  return {
    name: "",
    avatar: "",
    bio: "",
    representativeWorks: "",
  };
}