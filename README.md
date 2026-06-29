# XingTone Admin

XingTone 音乐播放器管理后台，用于管理歌曲、专辑、歌手、用户、Banner 及系统配置。

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 14 (App Router) | React 框架 |
| TypeScript | 类型安全 |
| TailwindCSS v3 + shadcn/ui | 样式与组件库 |
| react-hook-form + zod | 表单管理与校验 |
| Recharts | 数据可视化（看板图表） |
| axios | HTTP 客户端 |
| next-themes | 亮/暗色模式 |

## 核心功能

- **数据看板** — 用户/歌曲/播放量统计、播放趋势折线图、热门歌曲 TOP 10
- **歌曲管理** — 新增/编辑/删除歌曲，上传音频自动解析 ID3 元信息（标题/歌手/时长），专辑封面自动同步
- **专辑管理** — 新增/编辑/删除专辑
- **歌手管理** — 新增/编辑/删除歌手
- **歌单管理** — 新增/编辑/删除歌单
- **标签管理** — 新增/编辑/删除标签
- **Banner 管理** — 新增/编辑/删除首页横幅，拖拽排序
- **用户管理** — 查看/禁用用户，角色切换
- **系统设置** — 站点标题、版权信息、SEO 配置、存储类型（本地/S3）

## 快速开始

### 环境要求

- Node.js 20+

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
# 运行于 http://localhost:3001
```

### 3. 构建生产版本

```bash
npm run build
npm run start
```

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址，如 `http://localhost:3000/api` |

## 默认账号

首次启动后端后，访问 `/api/admin/init` 初始化管理员账号。

## 登录说明

- 管理员账号：`admin`
- 密码：初始化时设置的密码
- 登录后 JWT token 存储于 cookie + localStorage，7 天有效期

## 部署

推荐部署到 [Vercel](https://vercel.com)：

1. 登录 Vercel → Import Git Repository → 选择 `music-admin` 目录
2. **Root Directory** 设置为 `.`（本目录）
3. 添加环境变量 `NEXT_PUBLIC_API_BASE`
4. 点击 Deploy

> 注意：Vercel 环境变量修改后需重新部署才生效。

## 页面路由

| 路径 | 说明 |
|------|------|
| `/login` | 登录页 |
| `/dashboard` | 数据看板 |
| `/dashboard/songs` | 歌曲管理 |
| `/dashboard/albums` | 专辑管理 |
| `/dashboard/artists` | 歌手管理 |
| `/dashboard/playlists` | 歌单管理 |
| `/dashboard/tags` | 标签管理 |
| `/dashboard/banners` | Banner 管理 |
| `/dashboard/users` | 用户管理 |
| `/dashboard/settings` | 系统设置 |

## 歌曲上传功能

上传音频文件时，系统自动读取 ID3 标签（标题/歌手/专辑/时长/比特率）并填充表单，缺失字段友好提示允许手动修正。

封面图片无需单独上传，选择专辑后自动同步专辑封面，节省存储空间。

## 项目结构

```
app/
├── (dashboard)/         # 管理后台路由
│   └── dashboard/
│       ├── page.tsx        # 数据看板
│       ├── songs/
│       ├── albums/
│       ├── artists/
│       ├── playlists/
│       ├── tags/
│       ├── banners/
│       ├── users/
│       └── settings/
├── login/               # 登录页
└── globals.css

components/
└── admin/               # 管理后台专用组件
    ├── data-table.tsx   # 通用数据表格（排序/分页/操作列）
    ├── confirm-dialog.tsx # 删除确认弹窗
    ├── file-upload.tsx  # 拖拽上传组件
    ├── page-header.tsx  # 页面标题栏
    └── ...

lib/
├── api.ts               # axios 请求封装（含 401 跳转）
├── auth.ts              # 登录态管理
├── admin-utils.ts       # 管理后台工具函数
└── types.ts             # TypeScript 类型定义
```

## License

MIT
