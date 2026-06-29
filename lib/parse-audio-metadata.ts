"use client";

// XingTone - 音频文件元信息解析
// - 用 jsmediatags 解析 ID3v1/ID3v2 标签（标题、歌手、专辑、年份、内嵌封面）
// - 用 HTML5 Audio API 读取时长（秒）
// - 比特率由文件大小与时长估算（kbps）
// - 对缺失/异常字段提供友好提示，供调用方展示并允许手动修正

// jsmediatags 的 @types 未从主入口导出 TagType/PictureType，
// 这里定义与 jsmediatags 回调结构兼容的最小类型，避免类型错误。
interface ID3Picture {
  format: string;
  data: number[];
}
interface ID3Tags {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  track?: string;
  picture?: ID3Picture;
}
interface ID3TagResult {
  type: string;
  tags: ID3Tags;
}
interface ID3Error {
  type: string;
  info: string;
}

/** 音频元信息 */
export interface AudioMetadata {
  /** 歌曲标题 */
  title?: string;
  /** 歌手 */
  artist?: string;
  /** 专辑名（来自 ID3，仅作参考；实际专辑需从系统列表选择） */
  album?: string;
  /** 时长（秒） */
  duration?: number;
  /** 比特率（kbps，估算） */
  bitrate?: number;
  /** 年份 */
  year?: string;
  /** 音轨号 */
  track?: string;
  /** ID3 内嵌封面图（ObjectURL，用完需 revoke） */
  pictureUrl?: string;
}

/** 解析结果：元信息 + 警告提示 */
export interface ParseResult {
  metadata: AudioMetadata;
  /** 缺失/异常字段的友好提示，调用方可逐条展示 */
  warnings: string[];
}

/**
 * 解析音频文件元信息
 * @param file 用户选择的音频文件
 * @returns 元信息 + 警告提示
 */
export async function parseAudioMetadata(
  file: File
): Promise<ParseResult> {
  const warnings: string[] = [];
  const metadata: AudioMetadata = {};

  // 并行解析 ID3 标签与读取时长，互不阻塞
  const [id3Result, durationResult] = await Promise.allSettled([
    parseID3Tags(file),
    readDuration(file),
  ]);

  // 处理 ID3 标签结果
  if (id3Result.status === "fulfilled") {
    Object.assign(metadata, id3Result.value);
  } else {
    warnings.push("无法读取 ID3 标签（可能为非 ID3 格式），请手动核对歌曲信息");
  }

  // 处理时长结果
  if (durationResult.status === "fulfilled") {
    metadata.duration = durationResult.value;
  } else {
    warnings.push("无法自动读取音频时长，请手动填写");
  }

  // 校验缺失字段并给出提示
  if (!metadata.title) {
    warnings.push("未检测到歌曲标题，已默认使用文件名，可手动修改");
    metadata.title = file.name.replace(/\.[^.]+$/, "");
  }
  if (!metadata.artist) {
    warnings.push("未检测到歌手信息，请手动填写");
  }

  // 估算比特率（文件大小 * 8 / 时长 / 1000）
  if (metadata.duration && file.size > 0) {
    metadata.bitrate = Math.round((file.size * 8) / metadata.duration / 1000);
  }

  return { metadata, warnings };
}

/**
 * 用 jsmediatags 解析 ID3 标签
 * 动态 import 以避免 SSR 阶段访问 window
 */
function parseID3Tags(file: File): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    import("jsmediatags")
      .then((mod) => {
        const jsmediatags = mod.default ?? mod;
        jsmediatags.read(file, {
          onSuccess: (tag: ID3TagResult) => {
            const tags = tag.tags;
            const result: AudioMetadata = {
              title: tags.title,
              artist: tags.artist,
              album: tags.album,
              year: tags.year,
              track: tags.track,
            };
            // 内嵌封面图（ID3v2 APIC 帧）
            const picture = tags.picture;
            if (picture?.data?.length && picture.format) {
              try {
                const bytes = new Uint8Array(picture.data);
                const blob = new Blob([bytes], { type: picture.format });
                result.pictureUrl = URL.createObjectURL(blob);
              } catch {
                // 封面解析失败不影响主流程
              }
            }
            resolve(result);
          },
          onError: (error: ID3Error | unknown) => {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    typeof error === "object" &&
                      error !== null &&
                      "info" in error
                      ? String((error as { info: unknown }).info)
                      : "ID3 解析失败"
                  )
            );
          },
        });
      })
      .catch((err) => reject(err));
  });
}

/**
 * 用 HTML5 Audio API 读取音频时长
 * 返回四舍五入的整秒数
 */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      const url = URL.createObjectURL(file);
      audio.src = url;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.removeAttribute("src");
        audio.load();
      };

      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        cleanup();
        if (Number.isFinite(duration) && duration > 0) {
          resolve(Math.round(duration));
        } else {
          reject(new Error("时长无效"));
        }
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error("音频加载失败"));
      };
    } catch (err) {
      reject(err instanceof Error ? err : new Error("读取时长失败"));
    }
  });
}
