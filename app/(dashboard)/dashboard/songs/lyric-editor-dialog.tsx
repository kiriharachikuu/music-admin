"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText, Loader2, Trash2 } from "lucide-react";

import { request } from "@/lib/api";
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
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ==================== 歌词在线编辑弹窗 ====================
export interface LyricEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string | null;
  songTitle: string;
}

/** 校验 LRC 时间标签格式：[mm:ss.xx] / [mm:ss.xxx] / [mm:ss] */
const LRC_TIME_TAG_RE = /\[(\d{1,2}):(\d{1,2})(?:\.\d{1,3})?\]/g;

export function LyricEditorDialog({
  open,
  onOpenChange,
  songId,
  songTitle,
}: LyricEditorDialogProps) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // 删除歌词二次确认弹窗开关
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // 打开时拉取当前歌词内容
  useEffect(() => {
    if (!open || !songId) return;
    setLoading(true);
    setContent("");
    request<{ content: string }>({
      method: "GET",
      url: `/admin/songs/${songId}/lyric`,
    })
      .then((res) => setContent(res.content || ""))
      .catch(() => setContent(""))
      .finally(() => setLoading(false));
  }, [open, songId]);

  // LRC 语法校验：统计有效时间标签行数
  const validation = useMemo(() => {
    if (!content.trim()) return { validLines: 0, totalLines: 0, isValid: true };
    const lines = content.split("\n").filter((l) => l.trim());
    let validLines = 0;
    for (const line of lines) {
      LRC_TIME_TAG_RE.lastIndex = 0;
      if (LRC_TIME_TAG_RE.test(line)) validLines++;
    }
    return {
      validLines,
      totalLines: lines.length,
      isValid: validLines > 0 || lines.length === 0,
    };
  }, [content]);

  async function handleSave() {
    if (!songId) return;
    setSaving(true);
    try {
      await request({
        method: "POST",
        url: `/admin/songs/${songId}/lyric`,
        data: { content },
      });
      toast({ title: "歌词保存成功" });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "保存失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!songId) return;
    setSaving(true);
    try {
      await request({
        method: "DELETE",
        url: `/admin/songs/${songId}/lyric`,
      });
      toast({ title: "歌词已删除" });
      setContent("");
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-700" />
            歌词编辑 - {songTitle}
          </DialogTitle>
          <DialogDescription>
            在线编辑 LRC 歌词，支持 [mm:ss.xx] 时间标签格式
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* 校验状态条 */}
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                validation.isValid
                  ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              )}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {content.trim()
                  ? `已识别 ${validation.validLines}/${validation.totalLines} 行时间标签` +
                    (validation.validLines === 0
                      ? " · 提示：每行需以 [mm:ss.xx] 开头"
                      : " · 格式正确")
                  : "暂无歌词内容"}
              </span>
            </div>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`[ti:歌曲名]\n[ar:歌手]\n[00:00.00]第一句歌词\n[00:05.50]第二句歌词\n...`}
              className="min-h-[300px] resize-y font-mono text-sm"
            />

            <p className="text-xs text-muted-foreground">
              格式说明：每行以 [mm:ss.xx] 时间标签开头，如 [01:23.45] 表示 1 分 23.45 秒。支持 [ti:标题] [ar:歌手] [al:专辑] 元信息标签。
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={saving || loading || !content.trim()}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Trash2 className="h-4 w-4" />
            删除歌词
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-primary-700 text-white hover:bg-primary-600"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      {/* 删除歌词二次确认：避免误删，统一使用项目内 ConfirmDialog 保持风格一致 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除歌词"
        description="此操作不可恢复，确定删除该歌曲的歌词吗？"
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
