// Electron 端到端测试：连上窗口的 CDP，验证文件系统能力
// 用法: node tools/e2e-electron.mjs <端口> <fixture目录>
import path from "node:path";

const PORT = process.argv[2] || "9350";
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

  check("Electron 环境已注入", await ev(`!!(window.MM_HOST && window.MM_HOST.isElectron)`));
  check("顶栏出现「打开文件夹」", await ev(`document.getElementById("btnOpenFolder").hidden === false`));

  const info = await ev(`MM_HOST.info()`);
  check("能拿到版本信息", !!info.electron, JSON.stringify(info));

  const dir = FIXTURE.replace(/\\/g, "\\\\");
  const scan = await ev(`MM_HOST.scan("${dir}")`);
  check("扫描目录拿到 2 个文件", scan.files.length === 2, "count=" + scan.files.length);
  check("识别出 mob / item", scan.files.some(f => f.kind === "mob") && scan.files.some(f => f.kind === "item"),
    JSON.stringify(scan.files.map(f => f.kind)));

  const mob = scan.files.find(f => f.kind === "mob");
  const read = await ev(`MM_HOST.read(${JSON.stringify(mob.path)})`);
  check("读取文件内容", read.text.includes("Type: SKELETON"), read.text.slice(0, 60));

  // 写回 + 备份
  const tmp = JSON.stringify(path.join(FIXTURE, "Mobs", "_write_test.yml"));
  await ev(`MM_HOST.write(${tmp}, "test_a: 1\\n")`);
  const w2 = await ev(`MM_HOST.write(${tmp}, "test_b: 2\\n")`);
  check("第二次写入生成备份", !!w2.backup, JSON.stringify(w2));
  const after = await ev(`MM_HOST.read(${tmp})`);
  check("写入内容正确", after.text.includes("test_b: 2"));
  const bak = await ev(`MM_HOST.read(${JSON.stringify(w2.backup)})`);
  check("备份是旧内容", bak.text.includes("test_a: 1"));

  // 打开文件视图
  await ev(`(async () => {
    const r = await MM_HOST.read(${JSON.stringify(mob.path)});
    window.__openTest = r.text;
    return true;
  })()`);
  await sleep(200);

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} 通过, ${failed} 失败`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error("E2E 出错:", e.message); process.exit(2); });
