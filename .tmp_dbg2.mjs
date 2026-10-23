const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise(r => ws.onopen = r);
await send("Runtime.enable");
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  if (r.exceptionDetails) return "EXC: " + ((r.exceptionDetails.exception?.description || r.exceptionDetails.text) || "").split("\n").slice(0, 5).join(" | ");
  return r.result?.value;
};
await send("Page.enable");
await send("Page.navigate", { url: "file:///D:/下载/服务器/MythicMobsStudio/app/index.html" });
await new Promise(r => setTimeout(r, 1600));
console.log(await ev(`(() => {
  try {
    localStorage.clear();
    location.reload;
    const root = document.getElementById("editor");
    root.innerHTML = "";
    /* 直接调 renderEditor 的路径：MM_UI.renderEditor(root, null) */
    MM_UI.renderEditor(root, null);
    return "welcome OK, html len=" + root.innerHTML.length;
  } catch (e) {
    return "ERR: " + e.message + " @ " + (e.stack || "").split("\\n").slice(0, 3).join(" | ");
  }
})()`));
process.exit(0);
