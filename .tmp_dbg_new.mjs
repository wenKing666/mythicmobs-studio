const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails.exception?.description || "").split("\n").slice(0, 3).join(" | "));
};
const send = (method, params) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await new Promise(r => ws.onopen = r);
await send("Runtime.enable");
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  if (r.exceptionDetails) return "EXC: " + (r.exceptionDetails.exception?.description || "").split("\n")[0];
  return r.result?.value;
};
await send("Page.enable");
await send("Page.navigate", { url: "file:///D:/下载/服务器/MythicMobsStudio/app/index.html" });
await new Promise(r => setTimeout(r, 1500));
await ev(`localStorage.clear(); true`);
await send("Page.reload");
await new Promise(r => setTimeout(r, 1800));
console.log("点新建:", await ev(`(() => { const b = document.getElementById("btnNewMob"); if (!b) return "无按钮"; b.click(); return "ok"; })()`));
await new Promise(r => setTimeout(r, 600));
console.log("head:", await ev(`document.body.innerText.slice(0, 200).replace(/[\\n]/g, " ")`));
console.log("editor html 长度:", await ev(`document.getElementById("editor").innerHTML.length`));
console.log("wizard-bar:", await ev(`!!document.querySelector(".wizard-bar")`));
console.log("card 数:", await ev(`document.querySelectorAll("#editor details.card").length`));
console.log("异常:", errs.slice(0, 3));
process.exit(0);
