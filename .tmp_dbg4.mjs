const list = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const page = list.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
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
console.log("styleSheets fold-rail:", await ev(`(() => {
  try {
    let n = 0;
    [...document.styleSheets].forEach(ss => {
      try { n += [...ss.cssRules].filter(r => r.cssText.indexOf("fold-rail") >= 0).length; } catch (e) { n += "ERR:" + e.message; }
    });
    return n;
  } catch (e) { return "ERR " + e.message; }
})()`));
console.log("current():", await ev(`JSON.stringify(MM_STATE.current())`));
console.log("all().length:", await ev(`MM_STATE.all().length`));
console.log("editor len:", await ev(`document.getElementById("editor").innerHTML.length`));
console.log("welcome text?", await ev(`document.body.innerText.includes("做一个属于你的")`));
console.log("new mob:", await ev(`(() => {
  window.__e = null;
  try { MM_APP.new("mob"); return "ok, cards=" + document.querySelectorAll("#editor details.card").length; }
  catch (e) { window.__e = e.stack; return "ERR caught"; }
})()`));
console.log(await ev(`String(window.__e).split(String.fromCharCode(10)).slice(0, 4).join(" || ")`));
process.exit(0);process.exit(0);
