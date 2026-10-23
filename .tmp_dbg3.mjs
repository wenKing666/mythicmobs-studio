const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const logs = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    logs.push(m.params.args.map(a => a.value || a.description || "").join(" ").slice(0, 200));
  }
};
const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise(r => ws.onopen = r);
await send("Runtime.enable");
await send("Page.enable");
await send("Page.navigate", { url: "file:///D:/下载/服务器/MythicMobsStudio/app/index.html" });
await new Promise(r => setTimeout(r, 1800));
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  if (r.exceptionDetails) return "EXC: " + (r.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result?.value;
};
console.log("fold-rail display:", await ev(`getComputedStyle(document.querySelector(".fold-rail")).display`));
console.log("MM_APP:", await ev(`typeof window.MM_APP`));
console.log("console errors:", JSON.stringify(logs.slice(0, 4)));
process.exit(0);
