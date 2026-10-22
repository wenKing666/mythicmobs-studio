// 打包形态冒烟测试：连上打包 exe 的 CDP，验证核心链路在 asar 形态下照常工作
// 用法: node tools/smoke_packaged.mjs <端口> <fixture目录>
// 前置: dist/win-unpacked/MythicMobsStudio.exe --remote-debugging-port=<端口> --disable-gpu --no-sandbox
import fs from "node:fs";
import path from "node:path";

const PORT = process.argv[2] || "9351";
const FIXTURE = process.argv[3] || process.cwd() + "\\tests\\fixture-server";

let id = 0;
const pending = new Map();
let ws;
const results = [];

function send(method, params = {}) {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise((res, rej) => {
    pending.set(i, res);
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); rej(new Error("timeout " + method)); } }, 20000);
  });
}

async function ev(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval error");
  return r.result?.value;
}

function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log((ok ? "  ✓ " : "  ✗ ") + name + (ok ? "" : "  " + extra));
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* 与 e2e-electron 相同的夹具清理纪律：写进去的临时文件自己清 */
function cleanWriteTest(dir) {
  const mobs = path.join(dir, "Mobs");
  let names = [];
  try { names = fs.readdirSync(mobs); } catch { return; }
  names
    .filter(n => n === "_pack_write_test.yml" || n.startsWith("_pack_write_test.yml.bak-"))
    .forEach(n => { try { fs.rmSync(path.join(mobs, n), { force: true }); } catch { /* 占用就下次再说 */ } });
}

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find(t => t.type === "page" && t.url.includes("index.html"));
  if (!page) throw new Error("没找到编辑器窗口：" + JSON.stringify(list.map(t => t.url)));
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  await send("Runtime.enable");
  await sleep(800);

  check("打包形态页面加载", await ev(`document.body.innerText.length > 100`));
  check("Electron 环境在打包后仍然注入", await ev(`!!(window.MM_HOST && window.MM_HOST.isElectron)`));

  const info = await ev(`MM_HOST.info()`);
  check("打包后版本号正确", info.version === "0.9.0", JSON.stringify(info));
  const badge = await ev(`document.getElementById("appVer").textContent`);
  check("顶栏显示打包版本", badge.indexOf("0.9.0") === 0, badge);

  /* 扫描 → 打开 → 改 → 保存 → 磁盘验证：asar 不影响文件链路 */
  cleanWriteTest(FIXTURE);
  const dir = FIXTURE.replace(/\\/g, "\\\\");
  const scan = await ev(`MM_HOST.scan("${dir}")`);
  check("扫描夹具目录", scan.files.length === 8, "count=" + scan.files.length);

  const mob = scan.files.find(f => f.rel.replace(/\\/g, "/") === "Mobs/multi_mobs.yml");
  await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
    path: mob.path, name: mob.name, kind: "mob", rel: mob.rel, size: 0, mtime: 0
  })}); true`);
  await sleep(600);
  check("导入进表单", await ev(`MM_STATE.current().key === "skeleton_king"`),
    await ev(`MM_STATE.current().key`));

  /* 打包后 localStorage 是新的：先清掉再写临时文件，保证干净断言 */
  await ev(`localStorage.clear(); true`);
  const tmp = JSON.stringify(path.join(FIXTURE, "Mobs", "_pack_write_test.yml"));
  try {
    await ev(`MM_HOST.write(${tmp}, "pack_test: 1\\n")`);
    const w2 = await ev(`MM_HOST.write(${tmp}, "pack_test: 2\\n")`);
    check("打包后写文件生成备份", !!w2.backup, JSON.stringify(w2));
    const after = await ev(`MM_HOST.read(${tmp})`);
    check("打包后写盘内容正确", after.text.includes("pack_test: 2"));
  } finally {
    cleanWriteTest(FIXTURE);
  }

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} 通过, ${failed} 失败`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error("打包冒烟出错:", e.message); process.exit(2); });
