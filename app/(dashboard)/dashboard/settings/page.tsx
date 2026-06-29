"use client";

// XingTone - 系统设置
// Tabs 分组：基本信息 / SEO / 存储 / 其他
// - 基本信息：站点标题、Logo 上传、备案号、版权信息
// - SEO：关键词、描述（textarea）
// - 存储：本地/对象存储切换（local/s3），S3 配置项，切换后提示重启
// - 其他：注册开关、默认音质（standard/high/lossless）
// 对接 GET /api/admin/settings、PUT /api/admin/settings
// 字段异构且多为可选，采用受控 useState（不引入 react-hook-form）
import { useEffect, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { request } from "@/lib/api";
import type { SystemSettings } from "@/lib/types";
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
    "local" | "s3" | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // 防止首次加载完成后误判 storageType 变化
  const loadedRef = useRef(false);

  // 拉取系统设置
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await request<SystemSettings>({
          method: "GET",
          url: "/admin/settings",
        });
        if (cancelled) return;
        const next: SystemSettings = {
          ...data,
          // 兜底默认值，避免 Select 无值时报错
          storageType: data.storageType ?? "local",
          allowRegister: data.allowRegister ?? false,
          defaultQuality: data.defaultQuality ?? "standard",
        };
        setSettings(next);
        setOriginalStorageType(next.storageType);
        loadedRef.current = true;
      } catch {
        // 接口未实现时静默失败，保留空态可编辑
        if (!cancelled) {
          setSettings({
            storageType: "local",
            allowRegister: false,
            defaultQuality: "standard",
          });
          setOriginalStorageType("local");
          loadedRef.current = true;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        loadedRef.current &&
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
                      updateField("storageType", v as "local" | "s3")
                    }
                  >
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue placeholder="选择存储方式" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">本地存储</SelectItem>
                      <SelectItem value="s3">对象存储（S3）</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    切换存储方式后需重启后端服务，已上传文件不会自动迁移。
                  </p>
                </div>

                {/* S3 配置项：仅当存储方式为 s3 时展示 */}
                {settings.storageType === "s3" && (
                  <div className="space-y-5 rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Endpoint */}
                      <div className="space-y-2">
                        <Label htmlFor="s3Endpoint">Endpoint</Label>
                        <Input
                          id="s3Endpoint"
                          value={(settings.s3Endpoint as string) ?? ""}
                          onChange={(e) =>
                            updateField("s3Endpoint", e.target.value)
                          }
                          placeholder="https://s3.example.com"
                        />
                      </div>
                      {/* Bucket */}
                      <div className="space-y-2">
                        <Label htmlFor="s3Bucket">Bucket</Label>
                        <Input
                          id="s3Bucket"
                          value={(settings.s3Bucket as string) ?? ""}
                          onChange={(e) =>
                            updateField("s3Bucket", e.target.value)
                          }
                          placeholder="xingtong-music"
                        />
                      </div>
                      {/* Region */}
                      <div className="space-y-2">
                        <Label htmlFor="s3Region">Region</Label>
                        <Input
                          id="s3Region"
                          value={(settings.s3Region as string) ?? ""}
                          onChange={(e) =>
                            updateField("s3Region", e.target.value)
                          }
                          placeholder="us-east-1"
                        />
                      </div>
                      {/* 公开域名 */}
                      <div className="space-y-2">
                        <Label htmlFor="s3PublicDomain">公开访问域名</Label>
                        <Input
                          id="s3PublicDomain"
                          value={(settings.s3PublicDomain as string) ?? ""}
                          onChange={(e) =>
                            updateField("s3PublicDomain", e.target.value)
                          }
                          placeholder="https://cdn.example.com"
                        />
                      </div>
                      {/* AccessKey */}
                      <div className="space-y-2">
                        <Label htmlFor="s3AccessKey">AccessKey</Label>
                        <Input
                          id="s3AccessKey"
                          value={(settings.s3AccessKey as string) ?? ""}
                          onChange={(e) =>
                            updateField("s3AccessKey", e.target.value)
                          }
                          placeholder="AccessKey"
                          autoComplete="off"
                        />
                      </div>
                      {/* SecretKey */}
                      <div className="space-y-2">
                        <Label htmlFor="s3SecretKey">SecretKey</Label>
                        <Input
                          id="s3SecretKey"
                          type="password"
                          value={(settings.s3SecretKey as string) ?? ""}
                          onChange={(e) =>
                            updateField("s3SecretKey", e.target.value)
                          }
                          placeholder="SecretKey"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
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
              disabled={saving}
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
