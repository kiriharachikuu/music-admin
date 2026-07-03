"use client";

// 文件上传组件：拖拽 + 进度 + 预览
// 对接 POST /api/admin/upload（multipart/form-data，返回 { url }）
// 支持图片预览与音频文件预览，可受控使用 value + onChange
import { useCallback, useRef, useState } from "react";
import { FileAudio, File as FileIcon, Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { request } from "@/lib/api";
import type { UploadResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn, resolveMediaUrl } from "@/lib/utils";

// 校验文件类型是否符合 accept 规则（支持扩展名 .png / 通配 image/* / 精确 MIME）
function isFileTypeAllowed(file: File, accept: string): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  for (const token of tokens) {
    if (token.startsWith(".")) {
      // 扩展名匹配，如 .png
      if (name.endsWith(token)) return true;
    } else if (token.endsWith("/*")) {
      // 通配 MIME 匹配，如 image/*
      if (mime.startsWith(token.slice(0, -1))) return true;
    } else {
      // 精确 MIME 匹配，如 image/png
      if (mime === token) return true;
    }
  }
  return false;
}

// 字节数格式化为可读字符串
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

// 单次拖拽/选择上传的文件数量上限
const MAX_UPLOAD_FILES = 20;
// 默认单文件大小上限：50MB（调用方可通过 maxSize prop 覆盖）
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

export interface FileUploadProps {
  // 已上传文件 URL（受控）
  value?: string;
  // URL 变化回调
  onChange?: (url: string) => void;
  // 接受的文件类型，默认图片
  accept?: string;
  // 上传类型，传给后端 type 字段
  type?: "image" | "audio" | "lyric";
  // 预览类型：图片显示缩略图，音频显示播放器，文件显示通用文件卡
  preview?: "image" | "audio" | "file";
  // 自定义类名
  className?: string;
  // 占位提示文案
  hint?: string;
  // 单文件大小上限（字节），默认 50MB
  maxSize?: number;
  // 是否禁用
  disabled?: boolean;
  // 选中文件时回调（上传前触发），供父组件解析元信息
  onFileSelected?: (file: File) => void;
}

export function FileUpload({
  value,
  onChange,
  accept = "image/*",
  type = "image",
  preview = "image",
  className,
  hint,
  disabled,
  onFileSelected,
  maxSize,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);
      setProgress(0);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const data = await request<UploadResult>({
          method: "POST",
          url: `/admin/upload?type=${type}`,
          data: formData,
          // 文件上传可能较大，覆盖全局 timeout 为 5 分钟
          timeout: 300000,
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((e.loaded * 100) / e.total));
            }
          },
        });
        onChange?.(data.url);
        toast({ title: "上传成功" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "上传失败";
        toast({ title: "上传失败", description: message, variant: "destructive" });
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [onChange, type, toast]
  );

  const limit = maxSize ?? DEFAULT_MAX_SIZE;
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      let arr = Array.from(files);
      // 批量上传数量上限：单次最多 20 个，超过只取前 20 个
      if (arr.length > MAX_UPLOAD_FILES) {
        toast({
          title: "单次最多上传 20 个文件",
          description: "已只取前 20 个",
        });
        arr = arr.slice(0, MAX_UPLOAD_FILES);
      }
      // 逐个校验类型与大小：不合规的文件提示并跳过，找到第一个合法文件后上传
      for (const file of arr) {
        if (!isFileTypeAllowed(file, accept)) {
          toast({
            title: "文件类型不支持",
            description: `${file.name} 不在允许的类型范围内`,
            variant: "destructive",
          });
          continue;
        }
        if (file.size > limit) {
          toast({
            title: "文件过大",
            description: `${file.name} 超过 ${formatBytes(limit)} 限制`,
            variant: "destructive",
          });
          continue;
        }
        // 通知父组件选中的文件（上传前），供解析元信息
        onFileSelected?.(file);
        void upload(file);
        return;
      }
    },
    [upload, onFileSelected, toast, accept, limit]
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  // 已有值时显示预览
  if (value && !uploading) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {preview === "image" ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(value)}
              alt="预览"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : preview === "audio" ? (
          <div className="flex h-20 w-44 shrink-0 flex-col justify-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileAudio className="h-4 w-4 text-primary-700" />
              <span className="truncate">音频文件</span>
            </div>
            <audio controls src={resolveMediaUrl(value)} className="h-8 w-full" />
          </div>
        ) : (
          <div className="flex h-20 w-44 shrink-0 flex-col justify-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileIcon className="h-4 w-4 text-primary-700" />
              <span className="truncate">已上传文件</span>
            </div>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs text-primary-700 hover:underline"
            >
              查看文件
            </a>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="text-xs text-primary-700 hover:underline disabled:opacity-50"
          >
            重新上传
          </button>
          <button
            type="button"
            onClick={() => onChange?.("")}
            disabled={disabled}
            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            移除
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragging
          ? "border-primary-700 bg-primary-50 dark:bg-primary-900/20"
          : "border-border/60 hover:border-primary-500 hover:bg-accent",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {uploading ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary-700" />
          <p className="text-sm text-muted-foreground">上传中 {progress}%</p>
          {/* 进度条 primary 渐变 */}
          <div className="h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <>
          {preview === "image" ? (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          ) : preview === "audio" ? (
            <FileAudio className="h-6 w-6 text-muted-foreground" />
          ) : (
            <FileIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <UploadCloud className="h-5 w-5 text-primary-700" />
          <p className="text-sm">
            <span className="font-medium text-primary-700">点击上传</span>
            <span className="text-muted-foreground"> 或拖拽到此处</span>
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
}
