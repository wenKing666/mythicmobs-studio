// Electron 端到端测试：连上窗口的 CDP，验证文件系统能力
// 用法: node tools/e2e-electron.mjs <端口> <fixture目录>
import fs from "node:fs";
import os from "node:os";
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

/* 清掉本用例写进夹具的文件。不清理的话下次扫描会多出条目，
   「扫描拿到 2 个文件」这条断言就永远失败，基线会自己烂掉。 */
function cleanWriteTest(dir) {
  const mobs = path.join(dir, "Mobs");
  let names = [];
  try { names = fs.readdirSync(mobs); } catch { return; }
  names
    .filter(n => n === "_write_test.yml" || n.startsWith("_write_test.yml.bak-"))
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

  check("Electron 环境已注入", await ev(`!!(window.MM_HOST && window.MM_HOST.isElectron)`));
  check("顶栏出现「打开文件夹」", await ev(`document.getElementById("btnOpenFolder").hidden === false`));

  const info = await ev(`MM_HOST.info()`);
  check("能拿到版本信息", !!info.electron, JSON.stringify(info));

  // 上一次跑挂掉可能留下残留，先清一遍再断言文件数
  cleanWriteTest(FIXTURE);

  const dir = FIXTURE.replace(/\\/g, "\\\\");
  const scan = await ev(`MM_HOST.scan("${dir}")`);
  check("扫描目录拿到 2 个文件", scan.files.length === 2, "count=" + scan.files.length);
  check("识别出 mob / item", scan.files.some(f => f.kind === "mob") && scan.files.some(f => f.kind === "item"),
    JSON.stringify(scan.files.map(f => f.kind)));

  const mob = scan.files.find(f => f.kind === "mob");
  const read = await ev(`MM_HOST.read(${JSON.stringify(mob.path)})`);
  check("读取文件内容", read.text.includes("Type: SKELETON"), read.text.slice(0, 60));

  // 写回 + 备份（断言做完无论成败都清掉临时文件）
  const tmp = JSON.stringify(path.join(FIXTURE, "Mobs", "_write_test.yml"));
  try {
    await ev(`MM_HOST.write(${tmp}, "test_a: 1\\n")`);
    const w2 = await ev(`MM_HOST.write(${tmp}, "test_b: 2\\n")`);
    check("第二次写入生成备份", !!w2.backup, JSON.stringify(w2));
    const after = await ev(`MM_HOST.read(${tmp})`);
    check("写入内容正确", after.text.includes("test_b: 2"));
    const bak = await ev(`MM_HOST.read(${JSON.stringify(w2.backup)})`);
    check("备份是旧内容", bak.text.includes("test_a: 1"));
  } finally {
    cleanWriteTest(FIXTURE);
  }

  // 打开文件视图
  await ev(`(async () => {
    const r = await MM_HOST.read(${JSON.stringify(mob.path)});
    window.__openTest = r.text;
    return true;
  })()`);
  await sleep(200);

  /* 导入：点文件应该进表单，而不是停在只读预览 */
  const meta = JSON.stringify({
    path: mob.path, name: mob.name, kind: "mob", rel: mob.rel, size: mob.size, mtime: mob.mtime
  });
  await ev(`MM_HOST_OPEN_FILE(${meta}); true`);
  await sleep(400);
  check("点文件直接进表单", await ev(`!document.getElementById("editor").innerText.includes("只读预览")
    && document.querySelectorAll("#editor .card").length > 1`));
  check("导入后配置仍是文件原内容", await ev(`document.getElementById("yamlOut").innerText.includes("Health: 500")
    && document.getElementById("yamlOut").innerText.includes("skill{s=KingSlam}")`));

  const roundTrip = await ev(`(async () => {
    const r = await MM_HOST.readParsed(${JSON.stringify(mob.path)});
    const p = MM_STATE.newMob();
    const res = MM_IMPORT.fill(p, { js: r.js, text: r.text, filePath: ${JSON.stringify(mob.path)} });
    p.data.health = 800;
    const out = MM_YAML.generate(p);
    return res.ok && out.includes("Health: 800") && out.includes("Drops:") && out.includes("Equipment:");
  })()`);
  check("读取→映射→生成 往返可用", roundTrip === true, String(roundTrip));

  /* 验收：导入 → 改血量 → 保存 → 磁盘上的文件真的变了，且其他字段没丢
     用临时副本，不碰夹具 */
  const tmpRoot = path.join(os.tmpdir(), "mm-save-test");
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(tmpRoot, "Mobs"), { recursive: true });
  const dst = path.join(tmpRoot, "Mobs", "skeleton_king.yml");
  fs.writeFileSync(dst, fs.readFileSync(mob.path, "utf8"), "utf8");

  await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
    path: dst, name: "skeleton_king.yml", kind: "mob", rel: "Mobs/skeleton_king.yml", size: 0, mtime: 0
  })}); true`);
  await sleep(300);
  await ev(`(() => { const p = MM_STATE.current(); p.data.health = 777; MM_STATE.touch(); return true; })()`);
  await ev(`MM_HOST_SAVE()`);

  const written = fs.readFileSync(dst, "utf8");
  const backups = fs.readdirSync(path.join(tmpRoot, "Mobs")).filter(n => n.includes(".bak-"));
  check("保存后磁盘上的血量变了", /Health:\s*777/.test(written), written.slice(0, 80).replace(/\n/g, " | "));
  check("保存前生成了备份", backups.length === 1, JSON.stringify(backups));
  check("其他字段没丢", /Type:\s*SKELETON/.test(written) && /Drops:/.test(written)
    && /skill\{s=KingSlam\}/.test(written) && /MovementSpeed/.test(written));
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  /* 清掉导入的项目，别留在下次运行里 */
  await ev(`(() => {
    MM_STATE.all().filter(p => p.filePath).forEach(p => MM_STATE.remove(p.id));
    MM_APP.refresh(true);
    return true;
  })()`);

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} 通过, ${failed} 失败`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error("E2E 出错:", e.message); process.exit(2); });
