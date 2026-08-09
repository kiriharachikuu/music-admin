# XingTone Admin

XingTone 管理后台，用于维护音乐内容、用户、首页运营位、排行榜与系统配置。

完整项目文档见 [docs](../docs/README.md)。

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 14 App Router | 管理后台应用框架 |
| React 18 + TypeScript | UI 与类型安全 |
| TailwindCSS v3 + shadcn/ui | 样式与组件 |
| react-hook-form + zod | 表单管理与校验 |
| axios | API 请求 |
| Recharts | 看板图表 |
| jsmediatags | 音频元信息解析 |
| next-themes | 亮/暗色主题 |

## 核心功能

- 数据看板：用户、歌曲、播放量、趋势与热门歌曲统计。
- 歌曲管理：新增、编辑、删除、上传音频、解析标题/歌手/专辑/时长/比特率。
- 专辑管理：专辑信息与封面维护。
- 歌手管理：歌手资料维护。
- 歌单管理：歌单内容维护。
- Banner 管理：首页横幅新增、编辑、排序与上下线。
- 用户管理：用户查看、禁用、角色管理。
- 系统设置：站点配置、SEO、版权、存储策略等。
- 日志查看：后台操作与运行日志入口。

## 快速开始

### 环境要求

- Node.js 20+
- npm

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local` 并修改后端地址：

```bash
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
```

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址，例如 `http://localhost:3000/api` |

### 启动开发服务

```bash
npm run dev
```

默认运行于 `http://localhost:3000`。如需与用户端同时运行，可指定端口：

```bash
npm run dev -- -p 3001
```

### 生产构建

```bash
npm run build
npm run start
```

## 初始化管理员

后端启动并完成数据库初始化后，可通过后端管理员初始化接口创建管理员账号。若使用种子数据，默认管理员通常为：

```text
账号：admin
密码：admin123
```

生产环境请立即修改默认密码。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务 |
| `npm run lint` | 执行 Next lint |

## 主要路由

| 路径 | 说明 |
|------|------|
| `/login` | 登录页 |
| `/dashboard` | 数据看板 |
| `/dashboard/songs` | 歌曲管理 |
| `/dashboard/albums` | 专辑管理 |
| `/dashboard/artists` | 歌手管理 |
| `/dashboard/playlists` | 歌单管理 |
| `/dashboard/banners` | Banner 管理 |
| `/dashboard/users` | 用户管理 |
| `/dashboard/settings` | 系统设置 |
| `/dashboard/logs` | 日志查看 |

## 项目结构

```text
app/                  后台页面与路由
components/admin/     后台专用组件
components/ui/        shadcn/ui 基础组件
lib/api.ts            axios 请求封装
lib/auth.ts           登录态与 Token 管理
lib/types.ts          业务类型定义
public/icons/         后台图标资源
```

## 相关子项目

- [music-server](../music-server/README.md)：后端 API 服务。
- [music-web](../music-web/README.md)：用户端 Web/PWA。

## 许可

MIT
