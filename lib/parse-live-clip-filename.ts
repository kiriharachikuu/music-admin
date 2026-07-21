/**
 * 直播歌切文件名解析工具
 *
 * 文件名格式：歌名-歌手-日期（如 下个路口见-星瞳-2023-08-11）
 * 日期格式为 YYYY-MM-DD 或 YYYY-M-D，从末尾匹配
 * 歌手段通过包含"星瞳"识别，多段用 ＆ 合并
 */

/** 文件名解析结果 */
export interface FilenameParseResult {
  title: string;
  artist: string;
  date: string; // YYYY-MM-DD 格式
}

/** 期望的文件名格式示例 */
export const FILENAME_FORMAT_EXAMPLE = "下个路口见-星瞳-2023-08-11";

/**
 * 校验并归一化日期（YYYY-M-D 或 YYYY-MM-DD → YYYY-MM-DD）
 */
function normalizeDate(raw: string): string | null {
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const month = m.padStart(2, "0");
  const day = d.padStart(2, "0");
  // 校验合法日期
  const date = new Date(`${y}-${month}-${day}`);
  if (isNaN(date.getTime())) return null;
  return `${y}-${month}-${day}`;
}

/**
 * 从文件名中解析歌曲信息
 * 规则：歌名-歌手-日期，日期格式为 YYYY-MM-DD 或 YYYY-M-D
 * 日期中的 - 不会被误当作分隔符
 * 1. 先用正则从末尾匹配完整日期
 * 2. 剩余部分按 - 分割，查找含"星瞳"的段作为歌手（多段用 ＆ 合并）
 * 3. 去除歌手段后，剩余左侧段用 - 连接作为歌名
 */
export function parseFilename(
  filename: string,
): { result: FilenameParseResult | null; error?: string } {
  try {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    if (!nameWithoutExt) {
      return { result: null, error: "文件名为空" };
    }

    // 从末尾匹配日期（支持 YYYY-MM-DD 或 YYYY-M-D）
    const dateMatch = nameWithoutExt.match(/-(\d{4}-\d{1,2}-\d{1,2})$/);
    if (!dateMatch) {
      return {
        result: null,
        error: `文件名末尾未识别到日期（示例：2023-08-11），请手动填写`,
      };
    }
    const normalizedDate = normalizeDate(dateMatch[1]);
    if (!normalizedDate) {
      return {
        result: null,
        error: `文件名末尾未识别到日期（示例：2023-08-11），请手动填写`,
      };
    }

    // 去除日期部分后剩余的字符串
    const remainingStr = nameWithoutExt.slice(
      0,
      nameWithoutExt.length - dateMatch[0].length,
    );
    if (!remainingStr || !remainingStr.includes("-")) {
      return {
        result: null,
        error: "文件名格式不符合规范（歌名-歌手-日期），请手动填写",
      };
    }

    const segments = remainingStr.split("-");
    if (segments.length < 2) {
      return {
        result: null,
        error: "文件名信息不完整，请检查格式（歌名-歌手-日期）",
      };
    }

    // 查找含"星瞳"的段作为歌手
    const artistSegments = segments.filter((s) => s.includes("星瞳"));
    if (artistSegments.length === 0) {
      return {
        result: null,
        error: "文件名未识别到歌手信息（星瞳），请手动填写",
      };
    }
    const artist = artistSegments.join("＆");

    // 去除歌手段后，剩余左侧段用 - 连接作为歌名
    const titleSegments = segments.filter((s) => !s.includes("星瞳"));
    if (titleSegments.length === 0) {
      return { result: null, error: "歌曲名称不能为空" };
    }
    const title = titleSegments.join("-");

    return {
      result: {
        title,
        artist,
        date: normalizedDate,
      },
    };
  } catch {
    return { result: null, error: "文件名解析异常，请手动填写信息" };
  }
}
