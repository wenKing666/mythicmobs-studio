// Electron 主进程：窗口 + 文件系统能力
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const YAML = require("yaml");

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: "#f4f4f2",
    title: "MythicMobs 编辑器",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "..", "app", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------------- 文件系统 ---------------- */

const YAML_EXT = /\.(ya?ml)$/i;

function classify(rel) {
  const p = rel.replace(/\\/g, "/").toLowerCase();
  if (p.includes("/mobs/") || p.startsWith("mobs/")) return "mob";
  if (p.includes("/items/") || p.startsWith("items/")) return "item";
  return "other";
}

async function walk(dir, base, depth, out) {
  if (depth < 0 || out.length > 3000) return;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      await walk(full, base, depth - 1, out);
    } else if (YAML_EXT.test(e.name)) {
      const rel = path.relative(base, full);
      const st = await fsp.stat(full).catch(() => null);
      out.push({
        path: full,
        rel,
        name: e.name,
        kind: classify(rel),
        size: st ? st.size : 0,
        mtime: st ? st.mtimeMs : 0
      });
    }
  }
}

async function scan(dir) {
  const out = [];
  await walk(dir, dir, 4, out);
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "mob" ? -1 : b.kind === "mob" ? 1 : 0;
    return a.rel.localeCompare(b.rel);
  });
  return out;
}

ipcMain.handle("dialog:openFolder", async () => {
  const r = await dialog.showOpenDialog(win, {
    title: "选择服务器目录（例如 plugins/MythicMobs）",
    properties: ["openDirectory"]
  });
  if (r.canceled || !r.filePaths.length) return null;
  const dir = r.filePaths[0];
  const files = await scan(dir);
  return { dir, files };
});

ipcMain.handle("fs:scan", async (_e, dir) => {
  if (!dir || !fs.existsSync(dir)) return { dir, files: [] };
  return { dir, files: await scan(dir) };
});

ipcMain.handle("fs:read", async (_e, file) => {
  const text = await fsp.readFile(file, "utf8");
  const st = await fsp.stat(file);
  return { text, size: st.size, mtime: st.mtimeMs };
});

/* 解析后返回：渲染层要用 js 对象做映射，同时保留 text 用来切"未识别块"。
   解析放在主进程，因为渲染层没有 Node、也没有打包进来的 yaml 依赖。 */
ipcMain.handle("fs:readParsed", async (_e, file) => {
  const text = await fsp.readFile(file, "utf8");
  const st = await fsp.stat(file);
  const doc = YAML.parseDocument(text);
  const errors = doc.errors.map((e) => e.message);
  let js = null;
  try {
    js = doc.toJS();
  } catch (e) {
    errors.push(String(e && e.message ? e.message : e));
  }
  return { text, js, errors, size: st.size, mtime: st.mtimeMs };
});

ipcMain.handle("fs:write", async (_e, file, text) => {
  let backup = null;
  if (fs.existsSync(file)) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    backup = file + ".bak-" + stamp;
    await fsp.copyFile(file, backup);
  }
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, text, "utf8");
  return { file, backup };
});

ipcMain.handle("dialog:saveFile", async (_e, defaultName) => {
  const r = await dialog.showSaveDialog(win, {
    title: "保存配置文件",
    defaultPath: defaultName || "my_config.yml",
    filters: [{ name: "YAML", extensions: ["yml", "yaml"] }]
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle("shell:showItem", async (_e, file) => {
  shell.showItemInFolder(file);
});

ipcMain.handle("app:info", async () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  platform: process.platform
}));
