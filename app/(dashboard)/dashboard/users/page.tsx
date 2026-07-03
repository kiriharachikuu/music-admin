"use client";

// XingTone - 用户管理
// 列表（头像/用户名/角色/收藏/歌单/最近登录/注册时间/状态/操作）+ 搜索 + 分页
// 禁用/启用：Switch 切换（基于软删除 deletedAt）
// 设置管理员：按钮 + 二次确认（切换 role USER/ADMIN）
// 对接 CRUD /api/admin/users，恢复 /api/admin/users/:id/restore
import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldOff } from "lucide-react";

import { request } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/utils";
import type { PageResult, Role, User } from "@/lib/types";
import { formatDateTime, useDebounced } from "@/lib/admin-utils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable, type DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UsersPage() {
  const { toast } = useToast();

  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);

  // 正在切换禁用状态的用户 id
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // 角色变更确认
  const [roleTarget, setRoleTarget] = useState<User | null>(null);

  // 禁用/启用切换确认目标
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  const debouncedKeyword = useDebounced(keyword, 300);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request<PageResult<User>>({
        method: "GET",
        url: "/admin/users",
        params: {
          page,
          pageSize,
          keyword: debouncedKeyword || undefined,
          // 包含已禁用用户，便于管理
          includeDisabled: true,
        },
      });
      setData(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      toast({
        title: "加载失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedKeyword, toast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [debouncedKeyword]);

  // 禁用 / 启用切换（基于软删除 deletedAt）
  // 后端契约：PUT /api/admin/users/:id/status，body { disabled: boolean }
  async function handleToggleDisabled(user: User) {
    setTogglingId(user.id);
    try {
      const disabled = !user.deletedAt;
      await request({
        method: "PUT",
        url: `/admin/users/${user.id}/status`,
        data: { disabled },
      });
      toast({ title: disabled ? "已禁用" : "已启用" });
      setToggleTarget(null);
      void loadList();
    } catch (err) {
      toast({
        title: "操作失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  }

  // 设置 / 取消管理员
  async function handleRoleChange() {
    if (!roleTarget) return;
    const next: Role = roleTarget.role === "ADMIN" ? "USER" : "ADMIN";
    try {
      await request({
        method: "PUT",
        url: `/admin/users/${roleTarget.id}/role`,
        data: { role: next },
      });
      toast({
        title: next === "ADMIN" ? "已设为管理员" : "已取消管理员",
      });
      setRoleTarget(null);
      void loadList();
    } catch (err) {
      toast({
        title: "操作失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  const columns: DataTableColumn<User>[] = [
    {
      key: "avatar",
      title: "头像",
      width: 56,
      render: (row) => (
        <Avatar className="h-9 w-9">
          {row.avatar && <AvatarImage src={resolveMediaUrl(row.avatar)} alt={row.username} />}
          <AvatarFallback className="bg-primary-700 text-xs text-white">
            {row.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ),
    },
    { key: "username", title: "用户名", render: (row) => <span className="font-medium">{row.username}</span> },
    {
      key: "role",
      title: "角色",
      width: 100,
      render: (row) =>
        row.role === "ADMIN" ? (
          <Badge className="bg-primary-700 hover:bg-primary-700">管理员</Badge>
        ) : (
          <Badge variant="secondary">普通用户</Badge>
        ),
    },
    {
      key: "favoriteCount",
      title: "收藏",
      width: 80,
      render: (row) => (
        <span className="text-muted-foreground">{row._count?.favorites ?? 0}</span>
      ),
    },
    {
      key: "playlistCount",
      title: "歌单",
      width: 80,
      render: (row) => (
        <span className="text-muted-foreground">{row._count?.playlists ?? 0}</span>
      ),
    },
    {
      key: "lastLoginAt",
      title: "最近登录",
      width: 160,
      render: (row) => (
        <span className="text-muted-foreground">
          {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "注册时间",
      width: 160,
      render: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 110,
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* 禁用/启用 Switch：开启态（正常）primary-700；切换前二次确认 */}
          <Switch
            checked={!row.deletedAt}
            onCheckedChange={() => setToggleTarget(row)}
            disabled={togglingId === row.id}
          />
          {row.deletedAt ? (
            <Badge variant="secondary">已禁用</Badge>
          ) : (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">正常</Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 140,
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className={
            row.role === "ADMIN"
              ? "h-8 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              : "h-8"
          }
          onClick={() => {
            setSelectedRowKey(row.id);
            setRoleTarget(row);
          }}
        >
          {row.role === "ADMIN" ? (
            <>
              <ShieldOff className="h-3.5 w-3.5" />
              取消管理员
            </>
          ) : (
            <>
              <Shield className="h-3.5 w-3.5" />
              设为管理员
            </>
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户管理"
        description="管理用户账号、禁用状态与角色权限"
      />

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(row) => row.id}
        selectedRowKey={selectedRowKey}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        searchValue={keyword}
        onSearchChange={setKeyword}
        searchPlaceholder="搜索用户名 / 邮箱"
      />

      {/* 设置/取消管理员二次确认 */}
      <ConfirmDialog
        open={!!roleTarget}
        onOpenChange={(o) => {
          if (!o) {
            setRoleTarget(null);
            setSelectedRowKey(null);
          }
        }}
        title={roleTarget?.role === "ADMIN" ? "取消管理员" : "设为管理员"}
        description={
          roleTarget
            ? roleTarget.role === "ADMIN"
              ? `确定要取消用户「${roleTarget.username}」的管理员权限吗？取消后将变为普通用户。`
              : `确定要将用户「${roleTarget.username}」设为管理员吗？管理员拥有后台所有操作权限，请谨慎操作。`
            : ""
        }
        confirmText={roleTarget?.role === "ADMIN" ? "取消管理员" : "设为管理员"}
        variant={roleTarget?.role === "ADMIN" ? "destructive" : "default"}
        onConfirm={handleRoleChange}
      />

      {/* 禁用/启用用户二次确认：避免误操作影响登录 */}
      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => {
          if (!o) setToggleTarget(null);
        }}
        title={toggleTarget && !toggleTarget.deletedAt ? "禁用用户" : "启用用户"}
        description={
          toggleTarget
            ? toggleTarget.deletedAt
              ? `确定启用用户「${toggleTarget.username}」吗？启用后该用户可正常登录。`
              : `确定禁用用户「${toggleTarget.username}」吗？禁用后该用户将无法登录。`
            : ""
        }
        confirmText={
          toggleTarget && !toggleTarget.deletedAt ? "禁用" : "启用"
        }
        variant={
          toggleTarget && !toggleTarget.deletedAt ? "destructive" : "default"
        }
        onConfirm={() => {
          if (toggleTarget) void handleToggleDisabled(toggleTarget);
        }}
      />
    </div>
  );
}
