"use client";

// 文件上传组件：拖拽 + 进度 + 预览
// 对接 POST /api/admin/upload（multipart/form-data，返回 { url }）
// 支持图片预览与音频文件预览，可受控使用 value + onChange
import { useCallback, useRef, useState } from "react";
import { FileAudio, File as FileIcon, Image as ImageIcon, Loader2, UploadCloud, X } from "lucide-react";
import { request } from "@/lib/api";
import type { UploadResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      // 通知父组件选中的文件（上传前），供解析元信息
      onFileSelected?.(files[0]);
      void upload(files[0]);
    },
    [upload, onFileSelected]
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
              src={value}
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
            <audio controls src={value} className="h-8 w-full" />
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
