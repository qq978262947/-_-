import fs from "node:fs";
import path from "node:path";

const configPath = path.resolve("wechat.config.json");

if (!fs.existsSync(configPath)) {
  console.error("缺少 wechat.config.json。请复制 wechat.config.example.json 后填入 AppID 和上传密钥路径。");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const { default: ci } = await import("miniprogram-ci");

const project = new ci.Project({
  appid: config.appid,
  type: "miniProgram",
  projectPath: path.resolve("wechat-miniprogram"),
  privateKeyPath: path.resolve(config.privateKeyPath),
  ignores: ["node_modules/**/*"]
});

await ci.upload({
  project,
  version: config.version || "1.0.0",
  desc: config.desc || "象棋练棋辅助工具微信版",
  setting: {
    es6: true,
    minify: true
  },
  onProgressUpdate: console.log
});

console.log("微信小程序代码上传完成，请到微信公众平台提交审核。");
