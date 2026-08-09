"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitMerge, RefreshCw, Trash2, Undo2, FlaskConical, Sparkles, EyeOff } from "lucide-react";

import { request } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArtistCombobox } from "./artist-combobox";

// ===== 类型（对应后端返回） =====
interface MemberStat {
  name: string;
  key: string;
  clips: number;
  songs: number;
  sessions: number;
  albums: number;
  artistId?: string;
}
interface Cluster {
  canonical: string;
  canonicalArtistId?: string;
  members: MemberStat[];
  totalClips: number;
  totalSongs: number;
  why: string;
}
interface PreviewResult {
  canonicalName: string;
  aliases: string[];
  summary: {
    clips: number;
    sessions: number;
    albums: number;
    songs: number;
    aliasesToRegister: number;
    artistRowsMerged: number;
  };
  detail: { type: string; old: string; next: string }[];
}
interface AliasRow {
  id: string;
  alias: string;
  canonical: string;
  source: string;
  createdAt: string;
}
interface LogRow {
  id: string;
  canonicalName: string;
  aliases: string[];
  kind?: string;
  batchId?: string | null;
  clipCount: number;
  songCount: number;
  operatorName?: string;
  createdAt: string;
  reverted: boolean;
}

const norm = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

export default function ArtistMergePage() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <PageHeader
        title="歌手合并"
        description="把同一歌手的不同文件名写法合并为一个规范歌手。自动识别只给建议，需人工确认；每次合并可撤销。"
      />
      <Tabs defaultValue="scan">
        <TabsList>
          <TabsTrigger value="scan">自动扫描建议</TabsTrigger>
          <TabsTrigger value="alias">别名管理</TabsTrigger>
          <TabsTrigger value="shell">空壳清理</TabsTrigger>
          <TabsTrigger value="history">合并历史</TabsTrigger>
        </TabsList>
        <TabsContent value="scan" className="mt-4">
          <ScanTab toast={toast} />
        </TabsContent>
        <TabsContent value="alias" className="mt-4">
          <AliasTab toast={toast} />
        </TabsContent>
        <TabsContent value="shell" className="mt-4">
          <ShellCleanTab toast={toast} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============ 空壳清理 ============ */
interface ShellPlan {
  canonicalName: string;
  canonicalArtistId?: string;
  aliases: string[];
  targetSongs: number;
  targetClips: number;
  shellCount: number;
}
function ShellCleanTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [auto, setAuto] = useState<ShellPlan[]>([]);
  const [manual, setManual] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [mode, setMode] = useState<"hide" | "delete">("hide");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ auto: ShellPlan[]; manual: Cluster[] }>({
        method: "GET",
        url: "/admin/artist-merge/auto-clean/preview",
      });
      setAuto(res.auto ?? []);
      setManual(res.manual ?? []);
    } catch (err) {
      toast({ title: "扫描失败", description: msg(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => void load(), [load]);

  async function apply() {
    if (!auto.length) return;
    if (mode === "delete" && !window.confirm(`将把 ${auto.length} 组空壳歌手【彻底删除】并入有歌的歌手。仍可在"合并历史"里撤销。确定继续？`)) return;
    setApplying(true);
    try {
      const res = await request<{ mergedCount: number; batchId: string }>({
        method: "POST",
        url: "/admin/artist-merge/auto-clean/apply",
        data: { mode },
      });
      toast({
        title: "自动清理完成",
        description: `合并 ${res.mergedCount} 组空壳（${mode === "delete" ? "已彻底删除" : "已隐藏"}），可在"合并历史"整批撤销`,
      });
      void load();
    } catch (err) {
      toast({ title: "执行失败", description: msg(err), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              把"名字相似、只有一个有歌、其余是空壳"的重复歌手，<b className="text-foreground">自动把空壳并入有歌的那个</b>（有歌优先）。
              拿不准的（多个都有歌）不会自动处理，留到"自动扫描建议"里人工确认。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span>空壳处理方式：</span>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" checked={mode === "hide"} onChange={() => setMode("hide")} />
                <EyeOff className="h-3.5 w-3.5" /> 隐藏（可恢复）
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input type="radio" checked={mode === "delete"} onChange={() => setMode("delete")} />
                <Trash2 className="h-3.5 w-3.5" /> 彻底删除
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> 重新扫描
              </Button>
              <Button size="sm" onClick={() => void apply()} disabled={applying || auto.length === 0}>
                <Sparkles className="h-4 w-4" /> {applying ? "处理中…" : `一键清理 ${auto.length} 组`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">扫描中…</p>
      ) : (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">
              可自动清理 <span className="text-primary">{auto.length}</span> 组
            </p>
            {auto.length === 0 ? (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                没有可自动清理的空壳 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {auto.map((p, i) => (
                  <Card key={i}>
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge className="gap-1"><GitMerge className="h-3 w-3" />{p.canonicalName}</Badge>
                        <span className="text-xs text-muted-foreground">（{p.targetSongs} 首歌 · {p.targetClips} 歌切）</span>
                        <span className="text-muted-foreground">←</span>
                        {p.aliases.map((a) => (
                          <span key={a} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground line-through">{a}</span>
                        ))}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.shellCount} 个空壳</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {manual.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">
                需人工确认 <span className="text-amber-600">{manual.length}</span> 组
                <span className="ml-2 text-xs font-normal text-muted-foreground">（多个都有歌，可能是不同的人 → 去"自动扫描建议"里处理）</span>
              </p>
              <div className="space-y-1.5">
                {manual.slice(0, 20).map((c, i) => (
                  <div key={i} className="flex flex-wrap gap-1.5 rounded-md border px-3 py-2 text-xs">
                    {c.members.map((m) => (
                      <span key={m.name} className="rounded bg-muted px-2 py-0.5">
                        {m.name}
                        <span className="ml-1 text-muted-foreground">({m.songs}/{m.clips})</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============ 自动扫描建议 ============ */
function ScanTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  // 每组的本地编辑态：规范名 + 选中的已有歌手 id + 被排除的成员名集合
  const [edits, setEdits] = useState<
    Record<number, { canonical: string; canonicalArtistId?: string; excluded: Set<string> }>
  >({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ clusters: Cluster[] }>({ method: "GET", url: "/admin/artist-merge/scan" });
      setClusters(res.clusters ?? []);
      const init: Record<number, { canonical: string; canonicalArtistId?: string; excluded: Set<string> }> = {};
      (res.clusters ?? []).forEach(
        (c, i) => (init[i] = { canonical: c.canonical, canonicalArtistId: c.canonicalArtistId, excluded: new Set() }),
      );
      setEdits(init);
    } catch (err) {
      toast({ title: "扫描失败", description: msg(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleMember(idx: number, name: string, canonical: string) {
    if (norm(name) === norm(canonical)) {
      toast({ title: "规范名成员不能排除", description: "请先修改规范名" });
      return;
    }
    setEdits((prev) => {
      const cur = prev[idx] ?? { canonical, excluded: new Set<string>() };
      const ex = new Set(cur.excluded);
      ex.has(name) ? ex.delete(name) : ex.add(name);
      return { ...prev, [idx]: { ...cur, excluded: ex } };
    });
  }
  function setCanon(idx: number, v: string, artistId?: string) {
    setEdits((prev) => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? { excluded: new Set() }), canonical: v, canonicalArtistId: artistId },
    }));
  }

  function buildPayload(idx: number) {
    const c = clusters[idx];
    const e = edits[idx] ?? { canonical: c.canonical, excluded: new Set<string>() };
    const canonicalName = e.canonical.trim();
    const aliases = c.members
      .map((m) => m.name)
      .filter((n) => !e.excluded.has(n) && norm(n) !== norm(canonicalName));
    // 优先用下拉选中的歌手 id；否则回退到与规范名同名的成员歌手行
    const matchRow = c.members.find((m) => norm(m.name) === norm(canonicalName) && m.artistId);
    return { canonicalName, canonicalArtistId: e.canonicalArtistId ?? matchRow?.artistId, aliases };
  }

  async function openPreview(idx: number) {
    const payload = buildPayload(idx);
    if (!payload.canonicalName) return toast({ title: "请填写规范名", variant: "destructive" });
    if (!payload.aliases.length) return toast({ title: "没有要并入的变体", variant: "destructive" });
    try {
      const res = await request<PreviewResult>({ method: "POST", url: "/admin/artist-merge/preview", data: payload });
      setPreview(res);
      setPreviewIdx(idx);
    } catch (err) {
      toast({ title: "预览失败", description: msg(err), variant: "destructive" });
    }
  }

  async function confirmMerge() {
    if (previewIdx === null) return;
    setSubmitting(true);
    try {
      const payload = buildPayload(previewIdx);
      const res = await request<{ summary: PreviewResult["summary"] }>({
        method: "POST",
        url: "/admin/artist-merge",
        data: payload,
      });
      toast({
        title: "合并完成",
        description: `改写 ${res.summary.clips} 歌切 / ${res.summary.songs} 歌曲，已写入历史（可撤销）`,
      });
      setPreview(null);
      setPreviewIdx(null);
      void load();
    } catch (err) {
      toast({ title: "合并失败", description: msg(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          按「大小写/全半角归一 · 子串 · 相似度」自动聚类，<b className="text-foreground">只给建议、需人工确认</b>。
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> 重新扫描
        </Button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">扫描中…</p>
      ) : clusters.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">🎉 没有发现可合并的重复歌手。</p>
      ) : (
        clusters.map((c, idx) => {
          const e = edits[idx] ?? { canonical: c.canonical, excluded: new Set<string>() };
          const includeCount = c.members.filter((m) => !e.excluded.has(m.name)).length;
          return (
            <Card key={idx}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">疑似同一歌手 · {includeCount} 个变体</span>
                  <span className="text-xs text-muted-foreground">预计影响 {c.totalClips} 歌切 / {c.totalSongs} 歌曲</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.members.map((m) => {
                    const excluded = e.excluded.has(m.name);
                    const isCanon = norm(m.name) === norm(e.canonical);
                    return (
                      <button
                        key={m.name}
                        onClick={() => toggleMember(idx, m.name, e.canonical)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                          excluded
                            ? "opacity-40 line-through"
                            : isCanon
                              ? "border-primary bg-primary/10"
                              : "hover:border-foreground/30"
                        }`}
                        title={excluded ? "点击加入" : "点击排除"}
                      >
                        {m.artistId && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">歌手行</Badge>}
                        {m.name}
                        <span className="text-xs text-muted-foreground">歌切{m.clips}·歌曲{m.songs}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <b className="text-foreground">为什么判定同组：</b>{c.why}
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    规范名
                    <ArtistCombobox
                      value={e.canonical}
                      seed={c.canonical}
                      onChange={(name, id) => setCanon(idx, name, id)}
                      className="w-52"
                    />
                  </label>
                  <Button size="sm" onClick={() => void openPreview(idx)}>
                    <FlaskConical className="h-4 w-4" /> 预览合并
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* 预览弹窗 */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[86vh] overflow-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              合并预览
              <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600">
                <FlaskConical className="h-3 w-3" /> 试跑 · 未写库
              </Badge>
            </DialogTitle>
            <DialogDescription>
              把变体并入规范歌手 <b className="text-foreground">{preview?.canonicalName}</b>，将产生如下改动：
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat n={preview.summary.clips} label="歌切改写" />
                <Stat n={preview.summary.songs} label="歌曲重指" />
                <Stat n={preview.summary.aliasesToRegister} label="登记别名" />
                <Stat n={preview.summary.artistRowsMerged} label="歌手行并入" />
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">改写明细（旧 → 新，最多 50 条）</p>
                <div className="max-h-64 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <tbody>
                      {preview.detail.length === 0 && (
                        <tr><td className="p-3 text-center text-muted-foreground">仅合并歌手行，无字符串改写</td></tr>
                      )}
                      {preview.detail.map((d, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="w-16 p-2 text-xs text-muted-foreground">{typeLabel(d.type)}</td>
                          <td className="p-2 text-rose-500">{d.old}</td>
                          <td className="w-8 p-2 text-center text-primary">→</td>
                          <td className="p-2 text-emerald-600">{d.next}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>取消</Button>
            <Button onClick={() => void confirmMerge()} disabled={submitting}>
              <GitMerge className="h-4 w-4" /> {submitting ? "合并中…" : "确认合并"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-2xl font-semibold">{n}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/* ============ 别名管理 ============ */
function AliasTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [list, setList] = useState<AliasRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toArtistId, setToArtistId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ list: AliasRow[] }>({ method: "GET", url: "/admin/artist-merge/aliases" });
      setList(res.list ?? []);
    } catch (err) {
      toast({ title: "加载失败", description: msg(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => void load(), [load]);

  async function add() {
    if (!from.trim() || !to.trim()) return toast({ title: "请填写变体与规范歌手", variant: "destructive" });
    try {
      await request({
        method: "POST",
        url: "/admin/artist-merge/aliases",
        data: { alias: from.trim(), canonicalName: to.trim(), canonicalArtistId: toArtistId },
      });
      setFrom("");
      setTo("");
      setToArtistId(undefined);
      toast({ title: "已添加别名" });
      void load();
    } catch (err) {
      toast({ title: "添加失败", description: msg(err), variant: "destructive" });
    }
  }
  async function del(id: string) {
    try {
      await request({ method: "DELETE", url: `/admin/artist-merge/aliases/${id}` });
      toast({ title: "已删除" });
      void load();
    } catch (err) {
      toast({ title: "删除失败", description: msg(err), variant: "destructive" });
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          合并时自动登记，也可手动增删。<b className="text-foreground">上传新歌切时会先查这张表把变体归一</b>，从源头防止再次拆分。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="变体，如 るる" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-44" />
          <span className="text-primary">→</span>
          <ArtistCombobox
            value={to}
            placeholder="规范歌手，如 雫るる"
            onChange={(name, id) => {
              setTo(name);
              setToArtistId(id);
            }}
            className="w-52"
          />
          <Button size="sm" onClick={() => void add()}>添加别名</Button>
        </div>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-2 text-left font-medium">变体写法</th>
                <th className="p-2" />
                <th className="p-2 text-left font-medium">规范歌手</th>
                <th className="p-2 text-left font-medium">来源</th>
                <th className="p-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">加载中…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">暂无别名</td></tr>
              ) : (
                list.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-2">{a.alias}</td>
                    <td className="p-2 text-center text-primary">→</td>
                    <td className="p-2 font-medium">{a.canonical}</td>
                    <td className="p-2"><Badge variant="secondary" className="text-[10px]">{a.source}</Badge></td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => void del(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============ 合并历史 ============ */
function HistoryTab({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [list, setList] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<{ list: LogRow[] }>({ method: "GET", url: "/admin/artist-merge/logs" });
      setList(res.list ?? []);
      setSelected(new Set());
    } catch (err) {
      toast({ title: "加载失败", description: msg(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => void load(), [load]);

  const revertable = list.filter((h) => !h.reverted);

  function toggle(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === revertable.length ? new Set() : new Set(revertable.map((h) => h.id)),
    );
  }

  async function undo(id: string) {
    try {
      await request({ method: "POST", url: `/admin/artist-merge/logs/${id}/revert` });
      toast({ title: "已撤销", description: "数据按快照回滚" });
      void load();
    } catch (err) {
      toast({ title: "撤销失败", description: msg(err), variant: "destructive" });
    }
  }
  async function undoMany() {
    if (!selected.size) return;
    try {
      const res = await request<{ reverted: number; total: number }>({
        method: "POST",
        url: "/admin/artist-merge/logs/revert-many",
        data: { ids: Array.from(selected) },
      });
      toast({ title: "批量撤销完成", description: `成功撤销 ${res.reverted}/${res.total} 条` });
      void load();
    } catch (err) {
      toast({ title: "批量撤销失败", description: msg(err), variant: "destructive" });
    }
  }
  async function undoBatch(batchId: string) {
    try {
      const res = await request<{ reverted: number; total: number }>({
        method: "POST",
        url: `/admin/artist-merge/logs/batch/${batchId}/revert`,
      });
      toast({ title: "整批撤销完成", description: `成功撤销 ${res.reverted}/${res.total} 条` });
      void load();
    } catch (err) {
      toast({ title: "整批撤销失败", description: msg(err), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      {revertable.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
            <input type="checkbox" checked={selected.size === revertable.length && revertable.length > 0} onChange={toggleAll} />
            全选可撤销
          </label>
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" disabled={!selected.size} onClick={() => void undoMany()}>
            <Undo2 className="h-4 w-4" /> 批量撤销{selected.size ? `（${selected.size}）` : ""}
          </Button>
        </div>
      )}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">加载中…</p>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">还没有合并记录。</p>
      ) : (
        list.map((h) => (
          <Card key={h.id}>
            <CardContent className="flex items-center justify-between gap-2 p-4">
              <div className="flex items-start gap-3">
                {!h.reverted && (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(h.id)}
                    onChange={() => toggle(h.id)}
                  />
                )}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{h.canonicalName}</span>
                    <span className="text-xs text-muted-foreground">← {h.aliases.join("、")}</span>
                    {h.kind === "auto" && <Badge variant="secondary" className="text-[10px]">空壳清理</Badge>}
                    {h.reverted && <Badge variant="outline" className="text-rose-500">已撤销</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString("zh-CN")} · 改写 {h.clipCount} 歌切 / {h.songCount} 歌曲
                    {h.operatorName ? ` · ${h.operatorName}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!h.reverted && h.batchId && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => void undoBatch(h.batchId!)}>
                    整批撤销
                  </Button>
                )}
                {!h.reverted && (
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => void undo(h.id)}>
                    <Undo2 className="h-4 w-4" /> 撤销
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

/* ============ 小工具 ============ */
function typeLabel(t: string) {
  return t === "clip" ? "歌切" : t === "session" ? "场次" : t === "album" ? "专辑" : t;
}
function msg(err: unknown) {
  return err instanceof Error ? err.message : "请稍后重试";
}
