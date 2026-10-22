// 一次性截图脚本：展开技能区并滚动，输出到指定文件
import fs from "node:fs";

const [port, outFile, url, jsExpr] = process.argv.slice(2);
let id = 0; const pending = new Map(); let ws;

function send(method, params = {}) {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise((res, rej) => {
    pending.set(i, res);
    setTimeout(() => { if (pending.has(i)) { pending.delete(i); rej(new Error("timeout " + method)); } }, 15000);
  });
}

const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(t => t.type === "page");
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
};
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 980, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url });
await new Promise(r => setTimeout(r, 1600));
if (jsExpr) {
  await send("Runtime.evaluate", { expression: jsExpr });
  await new Promise(r => setTimeout(r, 500));
}
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(outFile, Buffer.from(shot.data, "base64"));
console.log("saved", outFile);
process.exit(0);
