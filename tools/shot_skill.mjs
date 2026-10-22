// 截一张「技能组（Metaskill）+ 独立条件块 + 比较符」的界面图，给 README 用
// 用法: node tools/shot_skill.mjs <调试端口> <输出 png>
import fs from "node:fs";

const PORT = process.argv[2] || "9333";
const OUT = process.argv[3] || "docs/img/metaskill-ui.png";

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
await new Promise(r => setTimeout(r, 1600));

// 「BOSS 二阶段」模板：Conditions 里带 healthpercent，技能组里带 Cooldown
const picked = await evalJs(`(() => {
  const b = [...document.querySelectorAll('.tpl-btn')].find(x => x.innerText.includes("BOSS 二阶段"));
  if (!b) return false;
  b.click();
  return true;
})()`);
if (!picked) throw new Error("模板列表里没有「BOSS 二阶段」");
await new Promise(r => setTimeout(r, 700));

// 条件卡片和技能列表默认就展开，再把「目标条件」也打开，让三块条件都在图里
await evalJs(`(() => {
  [...document.querySelectorAll('.card')].forEach(c => {
    const s = c.querySelector('summary');
    if (s && (s.textContent.includes('目标条件') || s.textContent.includes('技能列表'))) c.open = true;
  });
  return true;
})()`);
await new Promise(r => setTimeout(r, 400));

await evalJs(`(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('show'); return true; })()`);

// 滚到条件卡片，右侧 YAML 一起入镜
await evalJs(`(() => {
  const card = [...document.querySelectorAll('.card')]
    .find(c => c.querySelector('summary') && c.querySelector('summary').textContent.includes('条件 Conditions'));
  if (card) card.scrollIntoView({ block: 'start' });
  return true;
})()`);
await new Promise(r => setTimeout(r, 400));

const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
fs.writeFileSync(OUT, Buffer.from(r.data, "base64"));
console.log("saved", OUT);
ws.close();
process.exit(0);
