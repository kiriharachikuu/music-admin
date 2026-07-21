"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Music, UploadCloud, X, CheckCircle2, AlertCircle } from "lucide-react";

import { request } from "@/lib/api";
import { parseFilename, type FilenameParseResult } from "@/lib/parse-live-clip-filename";
import {
  parseAudioMetadata,
  type AudioMetadata,
} from "@/lib/parse-audio-metadata";
import { formatDuration } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import type { Artist, LiveSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// 批量上传任务状态
interface BatchTask {
  file: File;
  progress: number;
  status:
    | "pending"
    | "parsing"
    | "uploading"
    | "matching"
    | "creating"
    | "done"
    | "error";
  error?: string;
  /** 文件名解析结果 */
  parsedFilename?: FilenameParseResult | null;
  filenameError?: string;
  /** 音频元信息 */
  metadata?: AudioMetadata;
  warnings?: string[];
  /** 匹配/创建的场次信息 */
  sessionId?: string;
  sessionName?: string;
  sessionCreated?: boolean;
  /** 歌手处理信息 */
  artistInfo?: string;
}

// ==================== 批量上传弹窗 ====================
export interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: LiveSession[];
  artists: Artist[];
  onSessionsChange: (sessions: LiveSession[]) => void;
  onArtistsChange: (artists: Artist[]) => void;
  onSuccess: () => void;
}

export function BatchUploadDialog({
  open,
  onOpenChange,
  sessions,
  artists,
  onSessionsChange,
  onArtistsChange,
  onSuccess,
}: BatchUploadDialogProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);

  // 使用 ref 维护最新的 sessions/artists 列表，避免闭包过期
  const sessionsRef = useRef<LiveSession[]>(sessions);
  const artistsRef = useRef<Artist[]>(artists);
  // 每个场次的 trackIndex 自增计数器
  const trackIndexMap = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);
  useEffect(() => {
    artistsRef.current = artists;
  }, [artists]);

  // 重置任务列表
  useEffect(() => {
    if (!open) {
      setTasks([]);
      setDragging(false);
      setRunning(false);
      trackIndexMap.current.clear();
    } else {
      // 打开时同步最新 sessions/artists
      sessionsRef.current = sessions;
      artistsRef.current = artists;
    }
  }, [open, sessions, artists]);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("audio/"));
    if (arr.length === 0) return;
    setTasks((prev) => [
      ...prev,
      ...arr.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      })),
    ]);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * 匹配或创建直播场次（按日期匹配）
   * 同一日期的多个文件共享同一个场次
   */
  async function matchOrCreateSession(
    date: string,
    artist: string,
  ): Promise<{ session: LiveSession; created: boolean }> {
    // 1. 在本地缓存中匹配（含已创建的新场次）
    const matched = sessionsRef.current.find(
      (s) => s.liveTime?.slice(0, 10) === date,
    );
    if (matched) {
      return { session: matched, created: false };
    }

    // 2. 无匹配 → 自动创建新场次
    const newSession = await request<LiveSession>({
      method: "POST",
      url: "/admin/live-sessions",
      data: {
        title: `${date} 直播歌曲合集`,
        artist,
        liveTime: `${date}T20:00:00.000Z`,
        status: "DRAFT",
      },
    });
    // 更新本地缓存 + 通知父组件
    sessionsRef.current = [newSession, ...sessionsRef.current];
    onSessionsChange(sessionsRef.current);
    return { session: newSession, created: true };
  }

  /**
   * 自动创建不存在的歌手
   * 返回处理信息描述
   */
  async function ensureArtists(
    artistNames: string[],
  ): Promise<{ info: string; created: Artist[] }> {
    const existingNames: string[] = [];
    const newNames: string[] = [];

    for (const name of artistNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      if (artistsRef.current.some((a) => a.name === trimmed)) {
        existingNames.push(trimmed);
      } else {
        newNames.push(trimmed);
      }
    }

    // 创建不存在的歌手
    const createdArtists: Artist[] = [];
    for (const name of newNames) {
      try {
        const newArtist = await request<Artist>({
          method: "POST",
          url: "/admin/artists",
          data: { name },
        });
        createdArtists.push(newArtist);
      } catch {
        // 创建失败不阻断流程
      }
    }

    if (createdArtists.length > 0) {
      artistsRef.current = [...createdArtists, ...artistsRef.current];
      onArtistsChange(artistsRef.current);
    }

    // 汇总歌手处理信息
    const parts: string[] = [];
    if (existingNames.length > 0) {
      parts.push(`${existingNames.join("、")}（已有）`);
    }
    if (createdArtists.length > 0) {
      parts.push(`${createdArtists.map((a) => a.name).join("、")}（新建）`);
    }
    const failedNames = newNames.filter(
      (n) => !createdArtists.some((a) => a.name === n),
    );
    if (failedNames.length > 0) {
      parts.push(`${failedNames.join("、")}（创建失败）`);
    }

    return { info: parts.length > 0 ? parts.join("、") : "", created: createdArtists };
  }

  // 处理单个文件
  // 流程：解析文件名+元信息 → 上传音频 → 匹配/创建场次+歌手 → 创建歌切
  // 返回 "done" | "error" 用于统计
  async function runTask(task: BatchTask, index: number): Promise<"done" | "error"> {
    const update = (patch: Partial<BatchTask>) =>
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
      );

    try {
      // 1. 解析文件名
      let parsedResult: FilenameParseResult | null = null;
      const { result: parseRes, error: filenameErr } = parseFilename(task.file.name);
      if (parseRes) {
        parsedResult = parseRes;
        update({ parsedFilename: parseRes });
      } else {
        update({ filenameError: filenameErr });
        throw new Error(filenameErr || "文件名解析失败");
      }

      // 2. 解析音频元信息（补充时长）
      update({ status: "parsing", progress: 0 });
      let metadata: AudioMetadata = {};
      try {
        const parsed = await parseAudioMetadata(task.file);
        metadata = parsed.metadata;
        update({ metadata, warnings: parsed.warnings });
      } catch {
        // 元信息解析失败不阻断流程
      }

      // 3. 上传音频文件
      update({ status: "uploading", progress: 0 });
      const formData = new FormData();
      formData.append("file", task.file);
      const uploadRes = await request<{ url: string }>({
        method: "POST",
        url: "/admin/upload?type=audio",
        data: formData,
        timeout: 600000,
        onUploadProgress: (e) => {
          if (e.total) {
            update({ progress: Math.round((e.loaded * 100) / e.total) });
          }
        },
      });

      // 4. 匹配/创建场次 + 自动创建歌手
      update({ status: "matching", progress: 100 });
      const { session, created: sessionCreated } = await matchOrCreateSession(
        parsedResult.date,
        parsedResult.artist,
      );

      const artistNames = parsedResult.artist.split("＆");
      const { info: artistInfo } = await ensureArtists(artistNames);

      // 获取/自增 trackIndex
      const sessionId = session.id;
      const nextIndex = (trackIndexMap.current.get(sessionId) ?? 0) + 1;
      trackIndexMap.current.set(sessionId, nextIndex);

      update({
        sessionId,
        sessionName: session.title,
        sessionCreated,
        artistInfo,
      });

      // 5. 创建歌切
      update({ status: "creating" });
      await request({
        method: "POST",
        url: "/admin/live-clips",
        data: {
          title: parsedResult.title,
          artist: parsedResult.artist,
          sessionId,
          trackIndex: nextIndex,
          duration: metadata.duration || 0,
          fileUrl: uploadRes.url,
          coverUrl: metadata.pictureUrl || "",
          lyricContent: "",
          status: "DRAFT",
        },
      });

      update({ status: "done" });
      return "done";
    } catch (err) {
      update({
        status: "error",
        error: err instanceof Error ? err.message : "处理失败",
      });
      return "error";
    }
  }

  // 开始上传所有任务（顺序执行，避免并发压垮后端）
  async function startUpload() {
    if (tasks.length === 0 || running) return;
    setRunning(true);
    trackIndexMap.current.clear();

    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === "done" || tasks[i].status === "error") continue;
      const result = await runTask(tasks[i], i);
      if (result === "done") successCount++;
      else failCount++;
    }
    setRunning(false);
    if (failCount === 0) {
      toast({ title: `批量上传完成，共 ${successCount} 首歌切` });
    } else {
      toast({
        title: "批量上传完成",
        description: `成功 ${successCount} 首，失败 ${failCount} 首`,
        variant: "destructive",
      });
    }
    onSuccess();
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const errorCount = tasks.filter((t) => t.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量上传直播歌切</DialogTitle>
          <DialogDescription>
            拖入多个音频文件，自动识别文件名（歌名-歌手-日期）并创建草稿歌切
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 拖拽区 */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragging
                ? "border-primary-700 bg-primary-50 dark:bg-primary-900/20"
                : "border-border/60 hover:border-primary-500 hover:bg-accent",
            )}
          >
            <UploadCloud className="h-8 w-8 text-primary-700" />
            <p className="text-sm">
              <span className="font-medium text-primary-700">点击选择</span>
              <span className="text-muted-foreground"> 或拖拽音频文件到此处</span>
            </p>
            <p className="text-xs text-muted-foreground">
              文件名格式：歌名-歌手-日期（如 下个路口见-星瞳-2023-08-11），自动识别并创建合集
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* 任务列表 */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>共 {tasks.length} 个文件</span>
                <span>
                  成功 {doneCount} · 失败 {errorCount}
                </span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {tasks.map((task, index) => (
                  <div
                    key={`${task.file.name}-${index}`}
                    className="flex items-center gap-3 rounded-md border border-border/60 p-2"
                  >
                    <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm">{task.file.name}</p>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            task.status === "done" && "text-emerald-600",
                            task.status === "error" && "text-destructive",
                            (task.status === "uploading" ||
                              task.status === "creating" ||
                              task.status === "pending" ||
                              task.status === "parsing" ||
                              task.status === "matching") &&
                              "text-muted-foreground",
                          )}
                        >
                          {task.status === "pending" && "等待中"}
                          {task.status === "parsing" && "解析文件名..."}
                          {task.status === "uploading" &&
                            `上传中 ${task.progress}%`}
                          {task.status === "matching" && "匹配场次..."}
                          {task.status === "creating" && "创建中..."}
                          {task.status === "done" && "完成"}
                          {task.status === "error" &&
                            `失败：${task.error ?? ""}`}
                        </span>
                      </div>
                      {/* 已解析信息预览 */}
                      {task.parsedFilename && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {task.parsedFilename.title} ·{" "}
                          {task.parsedFilename.artist} ·{" "}
                          {task.parsedFilename.date}
                          {task.metadata?.duration
                            ? ` · ${formatDuration(task.metadata.duration)}`
                            : ""}
                        </p>
                      )}
                      {/* 场次匹配信息 */}
                      {task.sessionName && (
                        <p
                          className={cn(
                            "mt-0.5 truncate text-xs",
                            task.sessionCreated
                              ? "text-green-600 dark:text-green-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {task.sessionCreated ? "✓ " : ""}
                          场次：{task.sessionName}
                        </p>
                      )}
                      {/* 文件名解析错误 */}
                      {task.filenameError && (
                        <p className="mt-0.5 truncate text-xs text-destructive">
                          ⚠ {task.filenameError}
                        </p>
                      )}
                      {/* 进度条 */}
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all",
                            task.status === "error"
                              ? "bg-destructive"
                              : task.status === "done"
                                ? "bg-emerald-500"
                                : "bg-gradient-to-r from-primary-500 to-primary-700",
                          )}
                          style={{
                            width: `${
                              task.status === "done" ? 100 : task.progress
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    {!running && task.status !== "done" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeTask(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {task.status === "done" && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    {task.status === "error" && (
                      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            关闭
          </Button>
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={startUpload}
            disabled={tasks.length === 0 || running}
          >
            {running && <Loader2 className="h-4 w-4 animate-spin" />}
            {running ? "上传中..." : "开始上传"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
