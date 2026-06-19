# 象棋小程序

一个零依赖的网页中国象棋小程序，包含人机对战、玩家对练、双人练习、Pikafish 指导、棋谱复盘、历史记录、多套棋盘风格和移动端适配。

开源仓库地址：https://github.com/qq978262947/-_-

## 功能

- 人机对战：可选择执红或执黑，AI 难度会记住上次选择。
- 玩家对练：支持创建房间、加入房间和 30 秒匹配；匹配不到真人时由入门 AI 接管。
- 对战计时：支持 10 秒一步/5 分钟到 60 分钟一步/1200 分钟等局时档位，超时判负。
- Pikafish 指导：固定深度分析，多路线展示，可逐手播放和沙盘推演。
- 复盘和历史：对局结束后可复盘，历史记录可回看。
- 棋盘风格：红花梨、黄花梨、酸枝、黑檀、乌木、小叶紫檀、深曜石等风格。
- 关于和捐赠：内置 Pikafish 许可声明和开发者捐赠入口。

## 本地启动

```bash
npm start
```

默认地址：

```text
http://localhost:5178
```

也可以直接打开 `index.html`。页面在 `file://` 场景下会自动连接 `http://localhost:5178` 的服务端 API；但仍然需要先运行 `npm start`，否则 Pikafish、玩家对练房间和指导功能无法工作。

## 玩家对练

1. 一名玩家点击“玩家对练”并创建房间或发起 30 秒匹配。
2. 另一名玩家打开同一地址，输入房间码加入。
3. 创建者执红，加入者执黑。

在同一台电脑上可以用两个浏览器标签测试。局域网内对战时，把 `localhost` 换成开房电脑的局域网 IP。

玩家对练支持固定局时档位：10秒一步/5分钟、30秒一步/10分钟、2分钟一步/40分钟、5分钟一步/100分钟、15分钟一步/300分钟、30分钟一步/600分钟、60分钟一步/1200分钟。创建房间或发起匹配时选择档位，加入者沿用房间设置。

对局开始后不能在“人机对战 / 玩家对练 / 双人练习”之间切换；需要结束当前局或重新开局后再切换。终局弹框会区分绝杀、困毙和超时，其中困毙按无合法着法判负。

## AI 和 Pikafish

电脑行棋顺序：

1. 最强 AI 直接由服务端 Pikafish + NNUE 接管。
2. 入门、稳健、深思会先按配置处理首手和棋谱匹配；脱谱后交给 Pikafish。
3. Pikafish 不可用时启用客户端 Alpha-Beta 搜索兜底，包含吃子、将军、局面评估和迭代加深。

Pikafish 指导功能使用固定深度分析，输入范围 1-99，默认深度 17，并会记住上次输入。深度大于等于 20 时会启用多线程提速。

服务端人机行棋默认使用最多 7 个线程和 512MB Hash，可通过环境变量调整：

```bash
PIKAFISH_THREADS=8 PIKAFISH_HASH_MB=1024 npm start
```

## 启用 Pikafish

服务端接口：

```text
POST /api/engine/pikafish
```

当前项目内置本机可用的 Pikafish：

```text
engines/pikafish/pikafish
engines/pikafish/pikafish.nnue
```

也可以通过环境变量指定：

```bash
PIKAFISH_PATH=/path/to/pikafish npm start
```

健康检查：

```bash
curl http://localhost:5178/api/health
```

## 正式部署

这个项目需要 Node.js 服务端来提供房间接口、Pikafish 调用和静态资源，因此正式上线建议部署到支持长进程和原生二进制的服务，例如云服务器、Render、Railway、Fly.io 或 Docker 容器平台。

### Docker

```bash
docker build -t xianqi-mini-program .
docker run -p 5178:5178 xianqi-mini-program
```

部署后访问：

```text
http://服务器地址:5178
```

如果平台提供域名绑定，把外部 80/443 流量转发到容器的 `5178` 端口即可。

### Render

项目内置 `render.yaml`，推送到 GitHub 后可以在 Render 选择 Blueprint 部署。部署完成后访问 Render 分配的 HTTPS 域名即可。

## 开源和许可

本项目以 GPL-3.0-only 开源发布。

本产品使用了 Pikafish 象棋引擎。Pikafish 是一个开源中国象棋 UCI 引擎，基于 GNU General Public License version 3（GPL v3）授权发布。

Pikafish 项目地址：

```text
https://github.com/official-pikafish/Pikafish
```

Pikafish 的版权归其原作者及贡献者所有。本产品遵守 GPL v3 的相关要求。
