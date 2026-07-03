"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Music, UploadCloud, X } from "lucide-react";

import { request } from "@/lib/api";
import {
  parseAudioMetadata,
  type AudioMetadata,
} from "@/lib/parse-audio-metadata";
import { formatDuration } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
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
export interface BatchTask {
  file: File;
  progress: number;
  status:
    | "pending"
    | "parsing"
    | "uploading"
    | "creating"
    | "done"
    | "error";
  error?: string;
  /** 解析得到的元信息（用于创建歌曲） */
  metadata?: AudioMetadata;
  /** 解析警告（缺失字段提示） */
  warnings?: string[];
}

// ==================== 批量上传弹窗 ====================
export interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BatchUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchUploadDialogProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);

  // 重置任务列表
  useEffect(() => {
    if (!open) {
      setTasks([]);
      setDragging(false);
      setRunning(false);
    }
  }, [open]);

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

  // 上传一个文件并创建草稿歌曲
  // 流程：解析元信息 → 上传音频 → 创建歌曲（使用解析得到的标题/歌手/时长）
  async function runTask(task: BatchTask, index: number) {
    const update = (patch: Partial<BatchTask>) =>
      setTasks((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...patch } : t))
      );
    try {
      // 1. 解析音频元信息（需求 1：自动读取）
      update({ status: "parsing", progress: 0 });
      let metadata: AudioMetadata = {};
      let warnings: string[] = [];
      try {
        const parsed = await parseAudioMetadata(task.file);
        metadata = parsed.metadata;
        warnings = parsed.warnings;
        update({ metadata, warnings });
      } catch {
        // 解析失败不阻断流程，回退到文件名
        warnings.push("元信息读取失败，使用文件名作为标题");
        update({ warnings });
      }

      // 2. 上传音频文件
      update({ status: "uploading", progress: 0 });
      const formData = new FormData();
      formData.append("file", task.file);
      const uploadRes = await request<{ url: string }>({
        method: "POST",
        url: "/admin/upload?type=audio",
        data: formData,
        // 批量上传音频文件可能较大，覆盖全局 timeout 为 10 分钟
        timeout: 600000,
        onUploadProgress: (e) => {
          if (e.total) {
            update({
              progress: Math.round((e.loaded * 100) / e.total),
            });
          }
        },
      });
      // 3. 创建草稿歌曲，使用解析得到的元信息（缺失则回退）
      const title =
        metadata.title || task.file.name.replace(/\.[^.]+$/, "");
      const artist = metadata.artist || "未知";
      const duration = metadata.duration || 0;
      update({ status: "creating", progress: 100 });
      await request({
        method: "POST",
        url: "/admin/songs",
        data: {
          title,
          artist,
          albumId: null,
          duration,
          fileUrl: uploadRes.url,
          coverUrl: "",
          lyricUrl: "",
          releaseDate: new Date().toISOString().slice(0, 10),
          status: "DRAFT",
          tagIds: [],
        },
      });
      update({ status: "done" });
    } catch (err) {
      update({
        status: "error",
        error: err instanceof Error ? err.message : "上传失败",
      });
    }
  }

  // 开始上传所有任务（顺序执行，避免并发压垮后端）
  async function startUpload() {
    if (tasks.length === 0 || running) return;
    setRunning(true);
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === "done" || tasks[i].status === "error") continue;
      await runTask(tasks[i], i);
    }
    setRunning(false);
    toast({ title: "批量上传完成" });
    onSuccess();
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const errorCount = tasks.filter((t) => t.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量上传歌曲</DialogTitle>
          <DialogDescription>
            拖入多个音频文件，自动读取元信息并创建草稿
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
                : "border-border/60 hover:border-primary-500 hover:bg-accent"
            )}
          >
            <UploadCloud className="h-8 w-8 text-primary-700" />
            <p className="text-sm">
              <span className="font-medium text-primary-700">点击选择</span>
              <span className="text-muted-foreground"> 或拖拽音频文件到此处</span>
            </p>
            <p className="text-xs text-muted-foreground">
              支持多文件，将自动读取元信息（标题/歌手/时长）创建草稿歌曲
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
                              task.status === "parsing") &&
                              "text-muted-foreground"
                          )}
                        >
                          {task.status === "pending" && "等待中"}
                          {task.status === "parsing" && "读取元信息..."}
                          {task.status === "uploading" && `上传中 ${task.progress}%`}
                          {task.status === "creating" && "创建中..."}
                          {task.status === "done" && "完成"}
                          {task.status === "error" &&
                            `失败：${task.error ?? ""}`}
                        </span>
                      </div>
                      {/* 已解析元信息预览（标题/歌手/时长） */}
                      {task.metadata && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {task.metadata.title || "（未识别标题）"} ·{" "}
                          {task.metadata.artist || "未知歌手"} ·{" "}
                          {task.metadata.duration
                            ? formatDuration(task.metadata.duration)
                            : "时长未知"}
                        </p>
                      )}
                      {/* 进度条 primary 渐变 */}
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all",
                            task.status === "error"
                              ? "bg-destructive"
                              : "bg-gradient-to-r from-primary-500 to-primary-700"
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
