# 象棋练棋辅助工具

一个零依赖的网页象棋练棋辅助工具，重点支持棋谱招训练、Pikafish 指导、多路线推演、棋谱复盘、历史记录、人机对练、玩家对练、多套棋盘风格和移动端适配。

开源仓库地址：https://github.com/qq978262947/-_-

正式访问地址：https://xianqi-mini-program.onrender.com

## 功能

- 棋谱招训练：入门、稳健、深思等难度优先使用精准匹配的棋谱招，便于练开局和常见变化。
- 人机对练：可选择执红或执黑，AI 难度会记住上次选择。
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

## AI 和 Pikafish WASM

电脑行棋顺序：

1. 入门、稳健、深思、谱库大师会先按本地谱库精确匹配，谱库会自动派生左右镜像、红黑镜像和红黑左右镜像。
2. 脱谱后交给浏览器内置 Pikafish WASM，不调用服务端引擎。
3. 最强 AI 直接由浏览器内置 Pikafish WASM 接管。
4. Pikafish WASM 缺失或初始化失败时启用客户端 Alpha-Beta 搜索兜底，包含吃子、将军、局面评估和迭代加深。

Pikafish 指导功能使用固定深度分析，输入范围 1-99，默认深度 17，并会记住上次输入。WASM 引擎运行在浏览器 Web Worker 中，计算时不会阻塞棋盘 UI。

### 构建 Pikafish WASM

Pikafish WASM 需要 Emscripten：

```bash
npm run build:pikafish-wasm -- /Users/wangjun/Downloads/Pikafish-master
```

构建成功后会生成：

```text
engines/pikafish-wasm/pikafish.js
engines/pikafish-wasm/pikafish.wasm
engines/pikafish-wasm/pikafish.nnue
```

网页通过 `engines/pikafish-wasm/pikafish-wasm-worker.js` 在 Web Worker 中加载 Pikafish WASM。用户打开正式网页即可在自己浏览器本地运行 Pikafish，不需要访问服务端引擎，也不需要用户安装本机原生 Pikafish。

如果 WASM 文件缺失，页面会自动切换到 JS 搜索兜底，棋力会弱于 Pikafish。

## 本机原生 Pikafish 接口（开发/兜底）

项目仍保留 Node.js 原生 Pikafish 接口，主要用于开发调试和 WASM 构建前的兜底：

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
curl http://localhost:5178/healthz
curl http://localhost:5178/api/health
```

## 正式部署

正式部署后，Pikafish 分析优先在用户浏览器内通过 WASM 运行，不占用服务端引擎算力。Node.js 服务端主要提供静态资源、玩家对练房间和匹配接口。

### Docker

Docker 镜像默认使用轻量构建，不在 Render 构建阶段下载或编译 Pikafish，避免免费部署卡在引擎构建。服务端未检测到 Linux 版 Pikafish 时，接口会返回不可用并由前端/本地逻辑兜底。需要启用服务端 Pikafish 时，可以在服务器中提供 Linux x86-64 可执行文件，并通过 `PIKAFISH_PATH` 指向它。

```bash
docker build -t xianqi-mini-program .
docker run -p 10000:10000 xianqi-mini-program
```

部署后访问：

```text
http://服务器地址:5178
```

如果平台提供域名绑定，把外部 80/443 流量转发到容器的 `5178` 端口即可。

### Render

项目内置 `render.yaml`，推送到 GitHub 后可以在 Render 选择 Blueprint 部署。部署完成后访问 Render 分配的 HTTPS 域名即可。

### Zeabur

如果 Render 要求绑定付款方式，可以改用 Zeabur Free Plan。Zeabur 支持 GitHub 集成，并会自动识别项目根目录的 `Dockerfile` 进行部署。

部署步骤：

1. 打开 Zeabur Dashboard。
2. 使用 GitHub 登录并授权仓库 `qq978262947/-_-`。
3. 创建 Project，选择 Deploy New Service。
4. 选择 GitHub 仓库 `qq978262947/-_-`。
5. 确认使用 Dockerfile 部署。
6. 部署完成后绑定或复制 Zeabur 分配的访问域名。

## 微信小程序发布

仓库内置 `wechat-miniprogram` 子工程。微信小程序端使用原生小程序页面承载正式 H5 地址，并提供原生“关于我们”和“捐赠开发者”页面。

发布前需要先在微信公众平台完成：

1. 注册并认证小程序，获取真实 AppID。
2. 在“开发管理 / 开发设置”里下载代码上传密钥。
3. 在“开发管理 / 开发设置 / 业务域名”里配置正式 HTTPS 域名，例如 `https://xianqi-mini-program.onrender.com`。`web-view` 必须使用已备案并通过微信校验的业务域名。
4. 将 `wechat-miniprogram/project.config.json` 里的 `appid` 从 `touristappid` 改成真实 AppID，或复制 `wechat-miniprogram/project.private.config.json.example` 为本地私有配置。

使用微信开发者工具发布：

1. 打开微信开发者工具。
2. 导入目录 `wechat-miniprogram`。
3. 填写真实 AppID。
4. 预览确认首页、关于我们、捐赠开发者页面正常。
5. 点击“上传”，再到微信公众平台提交审核。

使用命令行上传：

```bash
cp wechat.config.example.json wechat.config.json
npm install miniprogram-ci --save-dev
npm run upload:wechat
```

`wechat.config.json` 和上传密钥不会提交到 Git。

## 开源和许可

本项目以 GPL-3.0-only 开源发布。

本产品使用了 Pikafish 象棋引擎。Pikafish 是一个开源中国象棋 UCI 引擎，基于 GNU General Public License version 3（GPL v3）授权发布。

Pikafish 项目地址：

```text
https://github.com/official-pikafish/Pikafish
```

Pikafish 的版权归其原作者及贡献者所有。本产品遵守 GPL v3 的相关要求。
