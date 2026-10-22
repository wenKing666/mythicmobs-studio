// 端到端测试：用 CDP 驱动无头 Edge，真实点击按钮验证交互
// 用法: node tools/e2e.mjs <端口> <截图输出目录>
import fs from "node:fs";
import path from "node:path";

const PORT = process.argv[2] || "9333";
const SHOT_DIR = process.argv[3] || ".";
const BASE = "file:///D:/下载/服务器/MythicMobsStudio/app/index.html";

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

async function waitFor(expr, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evalJs(expr)) return true;
    await new Promise(r => setTimeout(r, 120));
  }
  return false;
}

async function shot(name) {
  const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(SHOT_DIR, name + ".png");
  fs.writeFileSync(file, Buffer.from(r.data, "base64"));
  return file;
}

const results = [];
function check(name, ok, extra = "") {
  results.push({ name, ok });
  console.log((ok ? "  ✓ " : "  ✗ ") + name + (ok ? "" : "  " + extra));
}

async function main() {
  // 找到页面 target
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find(t => t.type === "page");
  if (!page) throw new Error("没有找到页面 target");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1520, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: BASE });
  await new Promise(r => setTimeout(r, 1200));
  // 清掉上一次跑留下的数据，保证从空状态开始
  await evalJs(`localStorage.clear(); true`);
  await send("Page.navigate", { url: BASE });
  await new Promise(r => setTimeout(r, 1400));

  check("页面加载出空状态", await evalJs(`document.body.innerText.includes("还没有打开的项目")`));

  // 1. 新建怪物
  await evalJs(`document.getElementById("btnNewMob").click(); true`);
  await new Promise(r => setTimeout(r, 400));
  check("新建怪物后出现表单", await evalJs(`document.body.innerText.includes("基础属性")`));
  check("侧栏出现项目", await evalJs(`document.querySelectorAll(".project-item").length === 1`));

  // 2. 改血量
  await evalJs(`(() => {
    const inputs = [...document.querySelectorAll('.card-body input[type=number]')];
    const hp = inputs[0];
    hp.value = "888";
    hp.dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  check("改血量后 YAML 同步", await evalJs(`document.getElementById("yamlOut").innerText.includes("Health: 888")`));

  // 3. 添加技能
  await evalJs(`(() => {
    const btns = [...document.querySelectorAll('.add-row')];
    const sk = btns.find(b => b.textContent.includes('技能'));
    sk.click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 450));
  check("添加技能后出现技能行", await evalJs(`document.querySelectorAll(".skill-row").length === 1`));
  check("技能写进 YAML", await evalJs(`document.getElementById("yamlOut").innerText.includes("damage{amount=")`));

  // 4. 切换机制为「造成伤害」
  await evalJs(`(() => {
    const skillRow = document.querySelector('.skill-row');
    const inputs = skillRow.querySelectorAll('.combo-field input');
    const mechInput = inputs[1];
    mechInput.value = 'damage';
    mechInput.dispatchEvent(new Event('input', {bubbles:true}));
    return mechInput.value;
  })()`);
  await new Promise(r => setTimeout(r, 450));
  check("切换为造成伤害后参数表更新", await evalJs(`(document.querySelector(".mech-desc")||{}).innerText.includes("造成伤害")`));
  check("YAML 变成 damage", await evalJs(`/^\\s*-\\s+damage/m.test(document.getElementById("yamlOut").innerText)`));

  // 5. BOSS 血条开关
  await evalJs(`(() => {
    const labels = [...document.querySelectorAll('.switch-row')];
    const boss = labels.find(l => l.textContent.includes("显示 BOSS 血条"));
    boss.querySelector('input').click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 450));
  check("开启血条后 YAML 有 BossBar", await evalJs(`document.getElementById("yamlOut").innerText.includes("BossBar:")`));

  // 5.1 全量选项：搜索 + 写入
  const optTotal = await evalJs(`(() => {
    const card = [...document.querySelectorAll('details.card')].find(c => c.textContent.includes('行为选项'));
    card.open = true;
    return card.querySelectorAll('.opt').length;
  })()`);
  check("选项渲染了 126 项", optTotal === 126, "count=" + optTotal);

  await evalJs(`(() => {
    const card = [...document.querySelectorAll('details.card')].find(c => c.textContent.includes('行为选项'));
    const i = card.querySelector('.opt-search-input');
    i.value = '发光';
    i.dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("选项可搜索", await evalJs(`document.querySelectorAll('.opt').length > 0 && [...document.querySelectorAll('.opt')].filter(n => n.offsetParent).length === 1`));

  await evalJs(`(() => {
    const vis = [...document.querySelectorAll('.opt')].find(n => n.offsetParent);
    vis.querySelector('.switch-row input').click();
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("选项写入 YAML", await evalJs(`document.getElementById("yamlOut").innerText.includes("Glowing: true")`));

  await shot("e2e-options");

  // 6. 新建物品
  await evalJs(`document.getElementById("btnNewItem").click(); true`);
  await new Promise(r => setTimeout(r, 400));
  check("新建物品出现物品表单", await evalJs(`document.body.innerText.includes("物品材质")`));

  // 6.1 材质选择器（之前用 datalist，点开是空的，用户以为没有数据）
  await evalJs(`(() => { document.querySelector('.combo .input').click(); return true; })()`);
  await new Promise(r => setTimeout(r, 300));
  check("材质下拉能打开", await evalJs(`!!document.querySelector(".combo-pop")`));
  check("下拉默认列出全部（>100 项）", await evalJs(`document.querySelectorAll(".combo-pop .combo-row").length > 100`));

  await evalJs(`(() => {
    const i = document.querySelector('.combo .input');
    i.value = 'diamond';
    i.dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  const filtered = await evalJs(`document.querySelectorAll(".combo-pop .combo-row").length`);
  check("输入关键字后列表收窄", filtered > 0 && filtered < 60, "rows=" + filtered);

  await evalJs(`(() => {
    const rows = [...document.querySelectorAll('.combo-pop .combo-row')];
    rows[0].dispatchEvent(new MouseEvent('mousedown', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  check("点选后写入字段", await evalJs(`document.querySelector('.combo .input').value.startsWith("diamond")`));
  check("点选后 YAML 同步", await evalJs(`document.getElementById("yamlOut").innerText.includes("Id: diamond")`));
  check("选完自动收起", await evalJs(`!document.querySelector(".combo-pop")`));

  await shot("e2e-picker");

  // 6.2 滚动不应把下拉关掉（之前监听 window scroll 会误判）
  await evalJs(`(() => { document.querySelector('.combo .input').click(); return true; })()`);
  await new Promise(r => setTimeout(r, 250));
  check("下拉可以再次打开", await evalJs(`!!document.querySelector(".combo-pop")`));

  const scrolled = await evalJs(`(() => {
    const l = document.querySelector('.combo-list');
    l.scrollTop = 160;
    return l.scrollTop;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  check("列表内部滚动有效", scrolled > 0, "scrollTop=" + scrolled);
  check("列表内滚动不关闭下拉", await evalJs(`!!document.querySelector(".combo-pop")`));

  await evalJs(`(() => { document.getElementById('editor').scrollTop = 260; return true; })()`);
  await new Promise(r => setTimeout(r, 250));
  check("编辑区滚动时下拉不消失", await evalJs(`!!document.querySelector(".combo-pop")`));

  await evalJs(`(() => {
    const i = document.querySelector('.combo .input');
    i.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 200));
  check("Esc 能关掉下拉", await evalJs(`!document.querySelector(".combo-pop")`));

  // 6.3 必填校验
  await evalJs(`(() => {
    const i = document.querySelector('.combo .input');
    i.value = '';
    i.dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("清空材质后右侧出现警告", await evalJs(`!document.getElementById("yamlWarn").hidden`));
  check("清空材质后下载按钮被禁用", await evalJs(`document.getElementById("btnDownload").disabled`));
  check("清空材质后输入框标红", await evalJs(`document.querySelector('.combo .input').classList.contains("invalid")`));
  check("警告里写明了缺什么", await evalJs(`document.getElementById("yamlWarn").innerText.includes("物品材质")`));

  await shot("e2e-invalid");

  await evalJs(`(() => {
    const i = document.querySelector('.combo .input');
    i.value = 'diamond_sword';
    i.dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("补全后警告消失", await evalJs(`document.getElementById("yamlWarn").hidden`));
  check("补全后下载恢复", await evalJs(`!document.getElementById("btnDownload").disabled`));
  check("补全后红框消失", await evalJs(`!document.querySelector('.combo .input').classList.contains("invalid")`));

  await evalJs(`(() => {
    const btns = [...document.querySelectorAll('.add-row')];
    btns.find(b => b.textContent.includes('附魔')).click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 450));
  check("添加附魔写进 YAML", await evalJs(`document.getElementById("yamlOut").innerText.includes("Enchantments:")`));

  await shot("e2e-item");

  // 7. 刷新后数据仍在
  await evalJs(`location.reload(); true`);
  await new Promise(r => setTimeout(r, 1400));
  check("刷新后项目还在", await evalJs(`document.querySelectorAll(".project-item").length === 2`));

  // 8. 模板
  await evalJs(`(() => {
    const b = [...document.querySelectorAll('.tpl-btn')].find(x => x.innerText.includes("BOSS"));
    b.click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 500));
  check("模板 BOSS 生成成功", await evalJs(`document.getElementById("yamlOut").innerText.includes("BossBar:")`));
  check("BOSS 模板带血量条件", await evalJs(`document.getElementById("yamlOut").innerText.includes("?healthpercent{p=<50%}")`));
  check("BOSS 模板带通用冷却", await evalJs(`document.getElementById("yamlOut").innerText.includes("cooldown=5")`));
  check("BOSS 模板没有校验警告", await evalJs(`document.getElementById("yamlWarn").hidden`),
    await evalJs(`document.getElementById("yamlWarn").innerText`));
  check("BOSS 模板可以直接下载", await evalJs(`!document.getElementById("btnDownload").disabled`));
  check("通用修饰区 14 项且都有中文", await evalJs(`(() => {
    const d = [...document.querySelectorAll('.skill-row .skill-section')]
      .filter(x => x.querySelector('summary').textContent.includes('通用修饰'))[0];
    if (!d) return false;
    const grid = d.querySelector('.grid');
    const labels = [...grid.querySelectorAll('.field > label, .sw-label')].map(x => x.textContent.trim());
    return grid.children.length === 14 && labels.length === 14
      && labels.filter(t => /[\\u4e00-\\u9fa5]/.test(t)).length === 14;
  })()`));
  await shot("e2e-template");

  // 8.1 全量目录
  const cat = await evalJs(`JSON.stringify({ m: MM_CATALOG.mechanics.length, c: MM_CATALOG.conditions.length, t: MM_CATALOG.targeters.length })`);
  const cd = JSON.parse(cat);
  check("机制已放开 302 个", cd.m === 302, cat);
  check("条件已放开 196 个", cd.c === 196, cat);
  check("目标器已放开 91 个", cd.t === 91, cat);
  check("机制下拉带分组标题", await evalJs(`(() => {
    const row = document.querySelector('.skill-row');
    const inp = row.querySelectorAll('.combo-field input')[1];
    inp.focus();
    return new Promise(res => setTimeout(() => {
      const n = document.querySelectorAll('.combo-pop .combo-group').length;
      document.body.click();
      res(n > 3);
    }, 260));
  })()`));

  // 8.2 条件预设能直接写进 YAML
  const condOk = await evalJs(`(async () => {
    const row = document.querySelector('.skill-row');
    const sec = [...row.querySelectorAll('.skill-section')].find(s => s.textContent.includes('触发条件'));
    if (!sec) return 'no-section';
    sec.open = true;
    const chip = [...sec.querySelectorAll('.chip')].find(c => c.textContent.includes('只在夜晚'));
    if (!chip) return 'no-chip';
    chip.click();
    await new Promise(r => setTimeout(r, 400));
    return document.getElementById('yamlOut').innerText.includes('?night');
  })()`);
  check("条件预设一键写入 YAML", condOk === true, String(condOk));

  // 9. 使用说明弹窗
  await evalJs(`document.getElementById("btnHelp").click(); true`);
  await new Promise(r => setTimeout(r, 250));
  check("使用说明能打开", await evalJs(`!document.getElementById("helpModal").hidden`));
  await shot("e2e-help");
  await evalJs(`document.getElementById("btnCloseHelp").click(); true`);
  await new Promise(r => setTimeout(r, 200));
  check("使用说明能关闭", await evalJs(`document.getElementById("helpModal").hidden`));

  // 10. 删除
  await evalJs(`window.confirm = () => true; true`);
  const before = await evalJs(`document.querySelectorAll('.project-item').length`);
  await evalJs(`(() => {
    const btn = document.querySelector('.project-item .del');
    btn.click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  const after = await evalJs(`document.querySelectorAll('.project-item').length`);
  check("删除项目生效", after === before - 1, `before=${before} after=${after}`);

  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} 通过, ${failed} 失败`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error("E2E 出错:", e.message); process.exit(2); });




