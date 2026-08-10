"use client";

// XingTone - 搜索同义词管理
// 列表（关键词 / 同义词 / 权重 / 更新时间 / 操作）+ 关键词模糊搜索
// 新增/编辑 Dialog（关键词 / 同义词 / 权重）+ 删除二次确认
// 对接 CRUD /api/admin/search-synonyms
// 列表规模较小（百级别），不分页；写操作仅 ADMIN，查询允许 EDITOR
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search as SearchIcon, Trash2 } from "lucide-react";

import { request } from "@/lib/api";
import { formatDateTime, useDebounced } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SearchSynonym {
  id: string;
  keyword: string;
  synonym: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export default function SearchSynonymsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<SearchSynonym[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SearchSynonym | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SearchSynonym | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<SearchSynonym[]>({
        method: "GET",
        url: "/admin/search-synonyms",
        params: { keyword: debouncedKeyword.trim() || undefined },
      });
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      toast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function handleAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function handleEdit(item: SearchSynonym) {
    setEditing(item);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await request({ method: "DELETE", url: `/admin/search-synonyms/${deleteTarget.id}` });
      toast({ title: "删除成功" });
      setDeleteTarget(null);
      void loadList();
    } catch (err) {
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="搜索同义词"
        description="管理搜索引擎的同义词扩展表。例如将「瞳瞳」映射到「星瞳」，用户在搜索任一关键词时都能命中对方的命中结果。"
        actions={
          <Button
            className="bg-primary-700 text-white hover:bg-primary-600"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            新增同义词
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          {/* 顶部工具栏：关键词搜索 */}
          <div className="flex items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="按关键词搜索..."
                className="pl-9"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>关键词</TableHead>
                <TableHead>同义词</TableHead>
                <TableHead className="w-24">权重</TableHead>
                <TableHead className="w-44">更新时间</TableHead>
                <TableHead className="w-28 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.keyword}</TableCell>
                    <TableCell>{item.synonym}</TableCell>
                    <TableCell>{item.weight}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(item.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(item)}
                          aria-label="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(item)}
                          aria-label="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SynonymFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSuccess={() => {
          setFormOpen(false);
          setEditing(null);
          void loadList();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="删除同义词"
        description={
          deleteTarget
            ? `确定要删除同义词「${deleteTarget.keyword} → ${deleteTarget.synonym}」吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ==================== 同义词新增/编辑表单弹窗 ====================
interface SynonymFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SearchSynonym | null;
  onSuccess: () => void;
}

function SynonymFormDialog({ open, onOpenChange, editing, onSuccess }: SynonymFormDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [synonym, setSynonym] = useState("");
  const [weight, setWeight] = useState<string>("1.0");
  // 表单级别错误（如后端返回「keyword+synonym 唯一约束冲突」）
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setKeyword(editing.keyword);
      setSynonym(editing.synonym);
      setWeight(String(editing.weight));
    } else {
      setKeyword("");
      setSynonym("");
      setWeight("1.0");
    }
    setFormError(null);
  }, [open, editing]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedKeyword = keyword.trim();
    const trimmedSynonym = synonym.trim();
    if (!trimmedKeyword || !trimmedSynonym) {
      setFormError("关键词和同义词均不能为空");
      return;
    }
    const weightNum = Number(weight);
    if (!Number.isFinite(weightNum) || weightNum < 0 || weightNum > 5) {
      setFormError("权重必须是 0~5 之间的数字");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await request({
          method: "PUT",
          url: `/admin/search-synonyms/${editing.id}`,
          data: { keyword: trimmedKeyword, synonym: trimmedSynonym, weight: weightNum },
        });
        toast({ title: "保存成功" });
      } else {
        await request({
          method: "POST",
          url: "/admin/search-synonyms",
          data: { keyword: trimmedKeyword, synonym: trimmedSynonym, weight: weightNum },
        });
        toast({ title: "新增成功" });
      }
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "保存失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑同义词" : "新增同义词"}</DialogTitle>
          <DialogDescription>
            {editing ? "修改同义词映射并保存" : "填写关键词与同义词，建立搜索扩展映射"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="synonym-keyword">关键词</Label>
            <Input
              id="synonym-keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              maxLength={50}
              placeholder="例如：瞳瞳"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="synonym-target">同义词</Label>
            <Input
              id="synonym-target"
              value={synonym}
              onChange={(e) => setSynonym(e.target.value)}
              required
              maxLength={50}
              placeholder="例如：星瞳"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="synonym-weight">权重</Label>
            <Input
              id="synonym-weight"
              type="number"
              step="0.1"
              min={0}
              max={5}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              默认 1.0；权重越高在合并结果中越靠前。范围 0~5。
            </p>
          </div>
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="bg-primary-700 text-white hover:bg-primary-600"
              disabled={submitting}
            >
              {editing ? "保存" : "新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
