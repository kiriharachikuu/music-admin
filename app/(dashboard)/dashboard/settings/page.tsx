"use client";

// XingTone - 系统设置
// Tabs 分组：基本信息 / SEO / 存储 / 其他
// - 基本信息：站点标题、Logo 上传、备案号、版权信息
// - SEO：关键词、描述（textarea）
// - 存储：本地/对象存储切换（local/s3），S3 配置项，切换后提示重启
// - 其他：注册开关、默认音质（standard/high/lossless）
// 对接 GET /api/admin/settings、PUT /api/admin/settings
// 字段异构且多为可选，采用受控 useState（不引入 react-hook-form）
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCcw, Save, UploadCloud, XCircle } from "lucide-react";

import { request } from "@/lib/api";
import type { MigrationProgress, SystemSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { FileUpload } from "@/components/admin/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 默认音质可选项
const QUALITY_OPTIONS = [
  { value: "standard", label: "标准" },
  { value: "high", label: "高品质" },
  { value: "lossless", label: "无损" },
] as const;

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>({});
  // 记录加载完成时的原始存储类型，用于保存时检测是否变更
  const [originalStorageType, setOriginalStorageType] = useState<
    "local" | "s3" | "cos" | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  // 是否完成首次加载（成功/失败均置 true，用于保存时检测 storageType 变更）
  const [loaded, setLoaded] = useState(false);
  // 加载失败时的错误信息（非 null 表示当前为错误态，不展示表单避免空值覆盖后端配置）
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [migration, setMigration] = useState<MigrationProgress | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // 拉取系统设置：失败时记录错误并展示重试入口，不再静默回退默认空值
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await request<SystemSettings>({
        method: "GET",
        url: "/admin/settings",
      });
      const next: SystemSettings = {
        ...data,
        // 兜底默认值，避免 Select 无值时报错
        storageType: data.storageType ?? "local",
        allowRegister: data.allowRegister ?? false,
        defaultQuality: data.defaultQuality ?? "standard",
      };
      setSettings(next);
      setOriginalStorageType(next.storageType);
      setLoaded(true);
    } catch (err) {
      // 加载失败：记录错误信息，不回退默认空值，避免管理员误存覆盖后端真实配置
      setLoadError(err instanceof Error ? err.message : "加载设置失败");
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // 通用字段更新函数
  function updateField<K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  // 保存设置
  async function handleSave() {
    setSaving(true);
    try {
      await request({
        method: "PUT",
        url: "/admin/settings",
        data: settings,
      });
      // 检测存储类型是否变更 → 提示重启
      const storageChanged =
        loaded &&
        originalStorageType !== undefined &&
        settings.storageType !== originalStorageType;
      // 更新原始存储类型记录
      setOriginalStorageType(settings.storageType);
      toast({ title: "保存成功" });
      if (storageChanged) {
        // 延迟弹出，避免与成功 toast 互相覆盖（useToast 限制 1 条）
        setTimeout(() => {
          toast({
            title: "存储方式已切换",
            description: "需重启后端服务后生效",
          });
        }, 1200);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存失败";
      toast({ title: "保存失败", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const fetchMigrationStatus = useCallback(async () => {
    try {
      const data = await request<MigrationProgress>({ url: "/admin/migration/status", method: "GET" });
      setMigration(data);
      if (data.status !== "running" && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {}
  }, []);

  const startMigration = useCallback(async () => {
    try {
      const ok = await confirm("确定开始将本地存储的文件迁移到对象存储吗？此过程可能需要较长时间，请保持页面打开。");
      if (!ok) return;
      const data = await request<MigrationProgress>({ url: "/admin/migration/start", method: "POST" });
      setMigration(data);
      toast({ title: "迁移已启动", description: "文件迁移进行中..." });
      if (!pollRef.current) {
        pollRef.current = setInterval(() => void fetchMigrationStatus(), 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "启动失败";
      toast({ title: "启动失败", description: message, variant: "destructive" });
    }
  }, [fetchMigrationStatus, toast]);

  const cancelMigration = useCallback(async () => {
    try {
      await request({ url: "/admin/migration/cancel", method: "POST" });
      toast({ title: "已请求取消", description: "将在当前文件处理完成后停止" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "取消失败";
      toast({ title: "取消失败", description: message, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    void fetchMigrationStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMigrationStatus]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="系统设置"
        description="站点基础信息、SEO、存储与运营配置"
      />

      {loading ? (
        // 骨架屏：与最终布局结构一致
        <div className="space-y-4">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : loadError ? (
        // 加载失败：展示错误提示卡片 + 重试按钮，不展示空表单（避免被误存覆盖后端配置）
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              加载设置失败
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadSettings()}
            >
              <RotateCcw className="h-4 w-4" />
              重试
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="storage">存储</TabsTrigger>
            <TabsTrigger value="other">其他</TabsTrigger>
          </TabsList>

          {/* ============ 基本信息 ============ */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 站点标题 */}
                <div className="space-y-2">
                  <Label htmlFor="siteTitle">站点标题</Label>
                  <Input
                    id="siteTitle"
                    value={(settings.siteTitle as string) ?? ""}
                    onChange={(e) => updateField("siteTitle", e.target.value)}
                    placeholder="XingTone"
                  />
                </div>

                {/* Logo 上传 */}
                <div className="space-y-2">
                  <Label>站点 Logo</Label>
                  <FileUpload
                    value={(settings.logoUrl as string) ?? ""}
                    onChange={(url) => updateField("logoUrl", url)}
                    accept="image/*"
                    type="image"
                    preview="image"
                    hint="建议尺寸 256×256，支持 PNG / JPG / SVG"
                  />
                </div>

                {/* 备案号 */}
                <div className="space-y-2">
                  <Label htmlFor="icp">备案号</Label>
                  <Input
                    id="icp"
                    value={(settings.icp as string) ?? ""}
                    onChange={(e) => updateField("icp", e.target.value)}
                    placeholder="如：京ICP备XXXXXXXX号"
                  />
                </div>

                {/* 版权信息 */}
                <div className="space-y-2">
                  <Label htmlFor="copyright">版权信息</Label>
                  <Input
                    id="copyright"
                    value={(settings.copyright as string) ?? ""}
                    onChange={(e) => updateField("copyright", e.target.value)}
                    placeholder="如：© 2026 XingTone"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ SEO ============ */}
          <TabsContent value="seo">
            <Card>
              <CardHeader>
                <CardTitle>SEO 配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 关键词 */}
                <div className="space-y-2">
                  <Label htmlFor="seoKeywords">关键词</Label>
                  <Input
                    id="seoKeywords"
                    value={(settings.seoKeywords as string) ?? ""}
                    onChange={(e) =>
                      updateField("seoKeywords", e.target.value)
                    }
                    placeholder="多个关键词用英文逗号分隔，如：音乐,播放器,星瞳"
                  />
                </div>

                {/* 站点描述 */}
                <div className="space-y-2">
                  <Label htmlFor="seoDescription">站点描述</Label>
                  <Textarea
                    id="seoDescription"
                    value={(settings.seoDescription as string) ?? ""}
                    onChange={(e) =>
                      updateField("seoDescription", e.target.value)
                    }
                    placeholder="一段简洁的站点描述，建议 80-160 字"
                    className="min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ 存储 ============ */}
          <TabsContent value="storage">
            <Card>
              <CardHeader>
                <CardTitle>存储配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 存储方式切换 */}
                <div className="space-y-2">
                  <Label>存储方式</Label>
                  <Select
                    value={settings.storageType ?? "local"}
                    onValueChange={(v) =>
                      updateField("storageType", v as "local" | "s3" | "cos")
                    }
                  >
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue placeholder="选择存储方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">本地存储</SelectItem>
                      <SelectItem value="s3">对象存储（S3 兼容）</SelectItem>
                      <SelectItem value="cos">腾讯云 COS</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    切换存储方式后需重启后端服务，已上传文件不会自动迁移。
                  </p>
                </div>

                {/* 对象存储配置项：仅当存储方式为 s3 或 cos 时展示 */}
                {(settings.storageType === "s3" || settings.storageType === "cos") && (
                  <div className="space-y-5 rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Bucket */}
                      <div className="space-y-2">
                        <Label htmlFor="bucket">Bucket</Label>
                        <Input
                          id="bucket"
                          value={(settings.bucket as string) ?? ""}
                          onChange={(e) => updateField("bucket", e.target.value)}
                          placeholder="chikuu-1252656027"
                        />
                      </div>
                      {/* Region */}
                      <div className="space-y-2">
                        <Label htmlFor="region">Region</Label>
                        <Input
                          id="region"
                          value={(settings.region as string) ?? ""}
                          onChange={(e) => updateField("region", e.target.value)}
                          placeholder="ap-nanjing"
                        />
                      </div>
                      {/* SecretId */}
                      <div className="space-y-2">
                        <Label htmlFor="secretId">SecretId</Label>
                        <Input
                          id="secretId"
                          value={(settings.secretId as string) ?? ""}
                          onChange={(e) => updateField("secretId", e.target.value)}
                          placeholder="AKID..."
                          autoComplete="off"
                        />
                      </div>
                      {/* SecretKey */}
                      <div className="space-y-2">
                        <Label htmlFor="secretKey">SecretKey</Label>
                        <Input
                          id="secretKey"
                          type="password"
                          value={(settings.secretKey as string) ?? ""}
                          onChange={(e) => updateField("secretKey", e.target.value)}
                          placeholder="SecretKey"
                          autoComplete="new-password"
                        />
                      </div>
                      {/* SessionToken（可选） */}
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="sessionToken">SessionToken（可选）</Label>
                        <Input
                          id="sessionToken"
                          value={(settings.sessionToken as string) ?? ""}
                          onChange={(e) => updateField("sessionToken", e.target.value)}
                          placeholder="临时密钥 SessionToken，非必须"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* S3 兼容可选扩展配置 */}
                    {settings.storageType === "s3" && (
                      <div className="space-y-4 border-t border-border/50 pt-4">
                        <p className="text-xs text-muted-foreground">
                          S3 兼容服务扩展配置（MinIO / R2 等需要，COS 无需填写）
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="endpoint">Endpoint（可选）</Label>
                            <Input
                              id="endpoint"
                              value={(settings.endpoint as string) ?? ""}
                              onChange={(e) => updateField("endpoint", e.target.value)}
                              placeholder="https://s3.example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="publicDomain">公开域名（可选）</Label>
                            <Input
                              id="publicDomain"
                              value={(settings.publicDomain as string) ?? ""}
                              onChange={(e) => updateField("publicDomain", e.target.value)}
                              placeholder="https://cdn.example.com"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 一键迁移 */}
                {settings.storageType !== "local" && (
                  <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">一键迁移</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          将本地 uploads 目录下的文件迁移到对象存储，并自动更新数据库中的文件引用
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => void startMigration()}
                          disabled={migration?.status === "running"}
                        >
                          {migration?.status === "running" ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <UploadCloud className="h-4 w-4 mr-2" />
                          )}
                          {migration?.status === "running" ? "迁移中..." : "开始迁移"}
                        </Button>
                        {migration?.status === "running" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void cancelMigration()}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            取消
                          </Button>
                        )}
                      </div>
                    </div>

                    {migration && migration.total > 0 && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>进度</span>
                            <span>{migration.processed} / {migration.total}</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{
                                width: `${migration.total > 0 ? (migration.processed / migration.total) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>成功: {migration.migrated}</span>
                            <span>失败: {migration.failed}</span>
                            <span>跳过: {migration.skipped}</span>
                            <span>DB更新: {migration.dbUpdated}</span>
                          </div>
                        </div>

                        {migration.logs.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">迁移日志</p>
                            <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-background p-3 text-xs font-mono">
                              {migration.logs.map((line, i) => (
                                <div key={i} className="text-muted-foreground">{line}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {migration.status === "completed" && (
                          <div className="rounded-md bg-green-500/10 p-3 text-xs text-green-600">
                            迁移完成！共处理 {migration.processed} 个文件，成功 {migration.migrated} 个，失败 {migration.failed} 个
                          </div>
                        )}
                        {migration.status === "failed" && (
                          <div className="rounded-md bg-red-500/10 p-3 text-xs text-red-600">
                            迁移失败：{migration.error || "未知错误"}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ 其他 ============ */}
          <TabsContent value="other">
            <Card>
              <CardHeader>
                <CardTitle>其他设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 注册开关 */}
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="allowRegister">允许注册</Label>
                    <p className="text-xs text-muted-foreground">
                      关闭后新用户将无法自助注册，需管理员创建账号。
                    </p>
                  </div>
                  {/* 开关开启态 primary-700（--primary 变量已绑定 #8B00FF） */}
                  <Switch
                    id="allowRegister"
                    checked={!!settings.allowRegister}
                    onCheckedChange={(v) => updateField("allowRegister", v)}
                  />
                </div>

                {/* 默认音质 */}
                <div className="space-y-2">
                  <Label>默认音质</Label>
                  <Select
                    value={settings.defaultQuality ?? "standard"}
                    onValueChange={(v) =>
                      updateField(
                        "defaultQuality",
                        v as "standard" | "high" | "lossless"
                      )
                    }
                  >
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue placeholder="选择默认音质" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 底部保存按钮：固定在内容区下方，primary-700 实心 */}
          <div className="sticky bottom-0 z-10 mt-6 flex justify-end rounded-lg bg-background/80 py-3 backdrop-blur">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !!loadError}
              className="min-w-28"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  保存中
                </>
              ) : (
                <>
                  <Save />
                  保存设置
                </>
              )}
            </Button>
          </div>
        </Tabs>
      )}
    </div>
  );
}
