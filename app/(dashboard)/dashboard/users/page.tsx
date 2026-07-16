"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldOff, Pencil, Users, UserCheck, UserX } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UsersPage() {
  const { toast } = useToast();

  const [data, setData] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ username: "", email: "", avatar: "", role: "USER" as Role });
  const [editSaving, setEditSaving] = useState(false);

  const [batchRoleTarget, setBatchRoleTarget] = useState<Role | null>(null);
  const [batchDisableTarget, setBatchDisableTarget] = useState<boolean | null>(null);

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

  function handleEdit(user: User) {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      avatar: user.avatar ?? "",
      role: user.role,
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editingUser) return;
    setEditSaving(true);
    try {
      await request({
        method: "PATCH",
        url: `/admin/users/${editingUser.id}`,
        data: editForm,
      });
      toast({ title: "保存成功" });
      setEditOpen(false);
      setEditingUser(null);
      void loadList();
    } catch (err) {
      toast({
        title: "保存失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleBatchRoleChange() {
    if (!batchRoleTarget || selectedRowKeys.length === 0) return;
    try {
      await request({
        method: "POST",
        url: "/admin/users/batch/role",
        data: { ids: selectedRowKeys, role: batchRoleTarget },
      });
      toast({
        title: batchRoleTarget === "ADMIN" ? "已批量设为管理员" : "已批量取消管理员",
      });
      setBatchRoleTarget(null);
      setSelectedRowKeys([]);
      void loadList();
    } catch (err) {
      toast({
        title: "操作失败",
        description: err instanceof Error ? err.message : "请稍后重试",
        variant: "destructive",
      });
    }
  }

  async function handleBatchStatusChange() {
    if (batchDisableTarget === null || selectedRowKeys.length === 0) return;
    try {
      await request({
        method: "POST",
        url: "/admin/users/batch/status",
        data: { ids: selectedRowKeys, disabled: batchDisableTarget },
      });
      toast({ title: batchDisableTarget ? "已批量禁用" : "已批量启用" });
      setBatchDisableTarget(null);
      setSelectedRowKeys([]);
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
    { key: "email", title: "邮箱", width: 200, render: (row) => <span className="text-muted-foreground">{row.email}</span> },
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
      width: 70,
      render: (row) => (
        <span className="text-muted-foreground">{row._count?.favorites ?? 0}</span>
      ),
    },
    {
      key: "playlistCount",
      title: "歌单",
      width: 70,
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
      width: 240,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => handleEdit(row)}
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={
              row.role === "ADMIN"
                ? "h-8 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                : "h-8"
            }
            onClick={() => setRoleTarget(row)}
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
        </div>
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
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        searchValue={keyword}
        onSearchChange={setKeyword}
        searchPlaceholder="搜索用户名 / 邮箱"
        selectable
        selectedRowKeys={selectedRowKeys}
        onSelectionChange={setSelectedRowKeys}
        batchActions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchRoleTarget("ADMIN")}
            >
              <Users className="h-3.5 w-3.5" />
              批量设为管理员
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchRoleTarget("USER")}
            >
              <UserCheck className="h-3.5 w-3.5" />
              批量取消管理员
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchDisableTarget(true)}
            >
              <UserX className="h-3.5 w-3.5" />
              批量禁用
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBatchDisableTarget(false)}
            >
              <UserCheck className="h-3.5 w-3.5" />
              批量启用
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={!!roleTarget}
        onOpenChange={(o) => !o && setRoleTarget(null)}
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

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget && !toggleTarget.deletedAt ? "禁用用户" : "启用用户"}
        description={
          toggleTarget
            ? toggleTarget.deletedAt
              ? `确定启用用户「${toggleTarget.username}」吗？启用后该用户可正常登录。`
              : `确定禁用用户「${toggleTarget.username}」吗？禁用后该用户将无法登录。`
            : ""
        }
        confirmText={toggleTarget && !toggleTarget.deletedAt ? "禁用" : "启用"}
        variant={toggleTarget && !toggleTarget.deletedAt ? "destructive" : "default"}
        onConfirm={() => {
          if (toggleTarget) void handleToggleDisabled(toggleTarget);
        }}
      />

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEditOpen(false);
            setEditingUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
            <DialogDescription>
              修改用户「{editingUser?.username}」的基本信息和权限设置
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="请输入用户名"
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="请输入邮箱"
              />
            </div>
            <div className="space-y-2">
              <Label>头像 URL</Label>
              <Input
                value={editForm.avatar}
                onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                placeholder="请输入头像图片地址"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">普通用户</SelectItem>
                  <SelectItem value="ADMIN">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditingUser(null);
              }}
              disabled={editSaving}
            >
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={batchRoleTarget !== null}
        onOpenChange={(o) => !o && setBatchRoleTarget(null)}
        title={batchRoleTarget === "ADMIN" ? "批量设为管理员" : "批量取消管理员"}
        description={`确定要将选中的 ${selectedRowKeys.length} 个用户${batchRoleTarget === "ADMIN" ? "设为管理员" : "取消管理员"}吗？`}
        confirmText={batchRoleTarget === "ADMIN" ? "批量设为管理员" : "批量取消管理员"}
        variant={batchRoleTarget === "ADMIN" ? "default" : "destructive"}
        onConfirm={handleBatchRoleChange}
      />

      <ConfirmDialog
        open={batchDisableTarget !== null}
        onOpenChange={(o) => !o && setBatchDisableTarget(null)}
        title={batchDisableTarget ? "批量禁用用户" : "批量启用用户"}
        description={`确定要将选中的 ${selectedRowKeys.length} 个用户${batchDisableTarget ? "禁用" : "启用"}吗？`}
        confirmText={batchDisableTarget ? "批量禁用" : "批量启用"}
        variant={batchDisableTarget ? "destructive" : "default"}
        onConfirm={handleBatchStatusChange}
      />
    </div>
  );
}
