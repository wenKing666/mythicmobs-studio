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

/* 目录名 → 项目类型。顺序有意义：/Packs/xxx/Spawners/ 这类嵌套目录先匹配到 Spawners，
   所以按「最具体的先」排，不用包含关系乱猜。 */
const DIR_KIND = [
  ["mobs", "mob"],
  ["items", "item"],
  ["skills", "skill"],
  ["drops", "droptable"],
  ["spawners", "spawner"],
  ["randomspawns", "randomspawn"],
  ["menus", "menu"],
  ["dialogs", "dialog"],
  ["cutscenes", "cinematic"],
  ["vanillamobs", "vanillaoverride"]
];

/* 整份文件就是一个条目的类型，按文件名认 */
const FILE_KIND = [
  ["pack.yml", "pack"],
  ["pins.yml", "pin"],
  ["stats.yml", "stats"],
  ["vanillamobs.yml", "vanillaoverride"]
];

function classify(rel) {
  const p = rel.replace(/\\/g, "/").toLowerCase();
  const base = p.split("/").pop();
  for (const [name, kind] of FILE_KIND) {
    if (base === name) return kind;
  }
  for (const [dir, kind] of DIR_KIND) {
    if (p.includes("/" + dir + "/") || p.startsWith(dir + "/")) return kind;
  }
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
  const ORDER = {
    mob: 0, skill: 1, item: 2, droptable: 3, spawner: 4, randomspawn: 5,
    menu: 6, dialog: 7, cinematic: 8, pin: 9, pack: 10, vanillaoverride: 11,
    stats: 12, other: 99
  };
  out.sort((a, b) => {
    const d = (ORDER[a.kind] ?? 99) - (ORDER[b.kind] ?? 99);
    return d || a.rel.localeCompare(b.rel);
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

/* 解析一段内存里的 YAML 文本（多条目切换时用来解析 raw.others 里的块） */
ipcMain.handle("fs:parseText", async (_e, text) => {
  const doc = YAML.parseDocument(String(text || ""));
  const errors = doc.errors.map((e) => e.message);
  let js = null;
  try {
    js = doc.toJS();
  } catch (e) {
    errors.push(String(e && e.message ? e.message : e));
  }
  return { text: String(text || ""), js, errors };
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

/* 备份清理（0.16.0）：递归找保存时产生的 *.bak-*，按修改时间升序 */
ipcMain.handle("fs:listBackups", async (_e, dir) => {
  const out = [];
  async function walk(d) {
    let entries;
    try { entries = await fsp.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
        await walk(full);
      } else if (/\.bak-\d{8}-\d{6}$/.test(ent.name)) {
        const st = await fsp.stat(full).catch(() => null);
        if (st) out.push({ path: full, rel: path.relative(dir, full), size: st.size, mtime: st.mtimeMs });
      }
    }
  }
  if (dir && fs.existsSync(dir)) await walk(dir);
  out.sort((a, b) => a.mtime - b.mtime);
  return out;
});

/* 批量删除（渲染层决定保留策略，这里只管删，逐个跳过占用） */
ipcMain.handle("fs:deleteFiles", async (_e, paths) => {
  let n = 0;
  for (const p of paths || []) {
    try { await fsp.unlink(p); n++; } catch { /* 占用跳过 */ }
  }
  return n;
});

ipcMain.handle("app:info", async () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  platform: process.platform
}));
