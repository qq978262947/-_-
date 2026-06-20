const path = require("path");
const { app, BrowserWindow, dialog, shell } = require("electron");
const { startServer } = require("../server");

let mainWindow = null;
let httpServer = null;

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 720,
    title: "象棋练棋辅助工具",
    backgroundColor: "#f4f1e8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: ["--xianqi-desktop=1"]
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadURL(`${url}/?desktop=1`);
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });
}

async function bootstrap() {
  try {
    const started = await startServer({ port: 0, host: "127.0.0.1" });
    httpServer = started.server;
    createWindow(started.url);
  } catch (error) {
    dialog.showErrorBox("启动失败", error?.message || String(error));
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && httpServer?.listening) {
    const address = httpServer.address();
    const port = typeof address === "object" && address ? address.port : 5178;
    createWindow(`http://127.0.0.1:${port}`);
  }
});

app.on("before-quit", () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
});
