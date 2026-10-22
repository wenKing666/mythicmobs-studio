// 截一张「技能行 + 全量目录 + 通用修饰」的界面图，给 README 用
// 用法: node tools/shot_catalog.mjs <调试端口> <输出 png>
import fs from "node:fs";

const PORT = process.argv[2] || "9333";
const OUT = process.argv[3] || "docs/img/catalog-ui.png";

let id = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject });
    setTimeout(() => { if (pending.has(msgId)) { pending.delete(msgId); reject(new Error("timeout " + method)); } }, 15000);
  });
}

async function evalJs(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval error");
  return r.result?.value;
}

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find(t => t.type === "page");
if (!page) throw new Error("没有找到页面 target");
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id); }
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1520, height: 1000, deviceScaleFactor: 1, mobile: false });
await evalJs("localStorage.clear(); location.reload(); true");
await new Promise(r => setTimeout(r, 1500));

// 用 BOSS 模板，技能行里同时有目标器 / 行内条件 / 通用冷却
await evalJs(`(() => {
  const b = [...document.querySelectorAll('.tpl-btn')].find(x => x.innerText.includes("BOSS"));
  if (b) b.click(); return true;
})()`);
await new Promise(r => setTimeout(r, 600));

// 展开通用修饰，让 14 项都在图里
await evalJs(`(() => {
  const d = [...document.querySelectorAll('.skill-row .skill-section')]
    .filter(x => x.querySelector('summary').textContent.includes('通用修饰'))[0];
  if (d) d.open = true;
  const c = [...document.querySelectorAll('.skill-row .skill-section')]
    .filter(x => x.querySelector('summary').textContent.includes('触发条件'))[0];
  if (c) c.open = true;
  return true;
})()`);
await new Promise(r => setTimeout(r, 500));
// 别让提示条挡住图
await evalJs(`(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('show'); return true; })()`);

// 把「通用修饰」滚到视野中间，右侧 YAML 一起入镜
await evalJs(`(() => {
  const d = [...document.querySelectorAll('.skill-row .skill-section')]
    .filter(x => x.querySelector('summary').textContent.includes('通用修饰'))[0];
  if (d) d.scrollIntoView({ block: 'start' });
  return true;
})()`);
await new Promise(r => setTimeout(r, 400));

const shotParams = { format: "png", captureBeyondViewport: false };
const r = await send("Page.captureScreenshot", shotParams);
fs.writeFileSync(OUT, Buffer.from(r.data, "base64"));
console.log("saved", OUT);
ws.close();
process.exit(0);
