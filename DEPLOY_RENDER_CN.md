# 留子冰箱部署指南（Render，小白版）

这份项目是一个 Node.js 服务，前端页面和 API 在同一个服务里。

## 你将得到什么

- 一个可访问地址：`https://你的服务名.onrender.com`
- 健康检查地址：`https://你的服务名.onrender.com/health`
- API 和页面都在同一个域名下，无需额外前后端分离部署

## 0. 准备

1. 注册 GitHub 账号。
2. 注册 Render 账号（建议用 GitHub 登录）。
3. 把项目上传到 GitHub（仓库里不要包含 `node_modules`）。

## 1. 上传项目到 GitHub（无命令行方式）

1. 在 GitHub 新建一个仓库（例如 `liuzi-bingxiang`）。
2. 点击 `Add file -> Upload files`。
3. 把这个项目文件夹拖进去上传。
4. 注意不要上传 `node_modules`（体积太大且不需要）。
5. 点击 `Commit changes` 完成上传。

## 2. 在 Render 一键部署

1. 进入 Render 控制台。
2. 点击 `New +` -> `Blueprint`。
3. 选择你刚才的 GitHub 仓库。
4. Render 会自动识别仓库根目录的 `render.yaml`。
5. 点击创建并开始部署。
6. 等待 2-5 分钟，部署成功后会生成公网地址。

当前项目使用的部署配置在：`render.yaml`

## 3. 部署成功后检查

1. 打开你的服务地址，看首页是否正常展示。
2. 打开 `https://你的服务名.onrender.com/health`，应看到：

```json
{"ok":true}
```

## 4. 接入微信小程序时要做的域名配置

到微信公众平台 -> 小程序后台 -> `开发管理` -> `开发设置`：

1. `request 合法域名`：填你的 Render 域名（不带路径）。
2. 如果小程序用 `web-view` 打开网页，还要配置 `业务域名`。

## 5. 重要提醒（当前版本）

当前库存数据是内存存储，服务重启后会清空。  
如果你准备给真实用户使用，下一步应接入数据库（例如 Supabase / Neon / Render Postgres）。

## 6. 常见问题

1. 页面打不开：先看 `.../health` 是否返回 `ok:true`。
2. 部署失败：检查 Render 日志里是否有 `npm run build` 报错。
3. 微信上请求失败：通常是“合法域名没配置”或“域名未启用 HTTPS”。
