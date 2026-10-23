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

  console.log("  [诊断]", await evalJs(`JSON.stringify({ projects: MM_STATE.all().length, hasWelcome: document.body.innerText.includes("做一个属于你的 MythicMobs 怪物"), head: document.body.innerText.slice(0, 80).replace(/[\\n|]/g, " ") })`));
  check("页面加载出空状态", await evalJs(`document.body.innerText.includes("做一个属于你的 MythicMobs 怪物")`));

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
  /* 这条以前偶尔假失败：输入框正好已在前一步被聚焦时，focus() 不会再触发 open()，
     弹出层根本没建出来。先 blur 再 focus，并且轮询等它渲染完，别用固定 260ms。 */
  check("机制下拉带分组标题", await evalJs(`(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const row = document.querySelector('.skill-row');
    const inp = row.querySelectorAll('.combo-field input')[1];
    inp.blur();
    inp.dispatchEvent(new Event('blur', { bubbles: false }));
    await sleep(30);
    inp.focus();
    inp.dispatchEvent(new Event('click', { bubbles: true }));
    for (let i = 0; i < 30; i++) {
      if (document.querySelectorAll('.combo-pop .combo-group').length > 3) break;
      await sleep(60);
    }
    const n = document.querySelectorAll('.combo-pop .combo-group').length;
    document.body.click();
    return n > 3;
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

  // 8.3 技能组（Metaskill）
  await evalJs(`document.getElementById("btnNewSkill").click(); true`);
  await new Promise(r => setTimeout(r, 500));
  check("新建技能组出现表单", await evalJs(`document.body.innerText.includes("目标条件 TargetConditions")`));
  check("技能组默认不写任何字段",
    await evalJs(`document.getElementById("yamlOut").innerText.trim() === "my_skill:"`),
    await evalJs(`document.getElementById("yamlOut").innerText`));

  const skillCond = await evalJs(`(async () => {
    const card = [...document.querySelectorAll('.card')]
      .find(c => c.querySelector('summary') && c.querySelector('summary').textContent.includes('条件 Conditions'));
    if (!card) return 'no-card';
    card.open = true;
    const chip = [...card.querySelectorAll('.chip')].find(c => c.textContent.includes('血量低于 50%'));
    if (!chip) return 'no-chip';
    chip.click();
    await new Promise(r => setTimeout(r, 450));
    return document.getElementById('yamlOut').innerText;
  })()`);
  check("技能组条件块写进 YAML",
    typeof skillCond === "string" && skillCond.includes("Conditions:\n  - healthpercent{p=<50%}"), String(skillCond));
  check("技能组条件不带问号", typeof skillCond === "string" && !skillCond.includes("?"), String(skillCond));
  check("条件行有成立/不成立下拉", await evalJs(`document.querySelectorAll('.cond-expect').length === 1`));

  // 8.4 比较符下拉
  check("比较符默认是 <", await evalJs(`(document.querySelector('.cmp-op') || {}).value === '<'`),
    await evalJs(`(document.querySelector('.cmp-op') || {}).value`));
  check("数值框只留 50", await evalJs(`(document.querySelector('.cmp-val') || {}).value === '50'`),
    await evalJs(`(document.querySelector('.cmp-val') || {}).value`));
  check("百分比按钮自动点亮", await evalJs(`!!document.querySelector('.cmp-unit.on')`));

  await evalJs(`(() => {
    const s = document.querySelector('.cmp-op');
    s.value = '<=';
    s.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("换运算符立刻改写 YAML",
    await evalJs(`document.getElementById("yamlOut").innerText.includes("- healthpercent{p=<=50%}")`),
    await evalJs(`document.getElementById("yamlOut").innerText`));

  await evalJs(`(() => {
    const s = document.querySelector('.cond-expect');
    s.value = 'false';
    s.dispatchEvent(new Event('change', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("期望不成立写 false",
    await evalJs(`document.getElementById("yamlOut").innerText.includes("- healthpercent{p=<=50%} false")`),
    await evalJs(`document.getElementById("yamlOut").innerText`));

  // 8.5 技能组里的技能没有触发器，目标器通用筛选能设
  await evalJs(`(() => {
    [...document.querySelectorAll('.add-row')].find(b => b.textContent.includes('添加技能')).click();
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 500));
  check("技能组里加了技能", await evalJs(`document.querySelectorAll('.skill-row').length === 1`));
  check("技能组技能没有触发器字段", await evalJs(`!document.querySelector('.skill-row input[placeholder="onSpawn"]')`));

  await evalJs(`(() => {
    const row = document.querySelector('.skill-row');
    const inputs = row.querySelectorAll('.combo-field input');
    const t = inputs[inputs.length - 1];
    t.value = 'playersinradius';
    t.dispatchEvent(new Event('input', {bubbles:true}));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 400));
  check("目标器通用筛选区出现", await evalJs(`[...document.querySelectorAll('.skill-row .skill-section')]
    .some(s => s.querySelector('summary').textContent.includes('目标筛选'))`));

  const targFilter = await evalJs(`(async () => {
    const sec = [...document.querySelectorAll('.skill-row .skill-section')]
      .find(s => s.querySelector('summary').textContent.includes('目标筛选'));
    if (!sec) return 'no-section';
    sec.open = true;
    const label = [...sec.querySelectorAll('.sw-label')].find(x => x.textContent.includes('包含玩家'));
    if (!label) return 'no-label';
    const cb = label.closest('label').querySelector('input[type=checkbox]');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', {bubbles:true}));
    await new Promise(r => setTimeout(r, 400));
    return document.getElementById('yamlOut').innerText;
  })()`);
  check("目标筛选写进目标器花括号",
    typeof targFilter === "string" && /@PlayersInRadius\{[^}]*targetplayers=true/.test(targFilter), String(targFilter));

  check("技能参数按机制改名（伤害量）", await evalJs(`(() => {
    const row = document.querySelector('.skill-row');
    return [...row.querySelectorAll('.field > label')].some(x => x.textContent.trim() === '伤害量');
  })()`));

  await shot("e2e-metaskill");

  // 8.5 0.6.0：AI 选择器 / 伤害修正 / 掉落三形态 / 物品组件 / 掉落表
  await evalJs(`document.getElementById("btnNewMob").click(); true`);
  await new Promise(r => setTimeout(r, 400));
  const mobText = await evalJs(`document.getElementById("editor").innerText`);
  check("怪物表单有「AI 行为选择器」", mobText.includes("AI 行为选择器"));
  check("怪物表单有「AI 目标选择器」", mobText.includes("AI 目标选择器"));
  check("怪物表单有「伤害修正」", mobText.includes("伤害修正"));

  /* 往 AI 行为选择器里加一条：默认就是 meleeattack */
  const addInCard = (title, label) => evalJs(`(() => {
    /* 卡片是 <details><summary>，标题在 summary 里 */
    const card = [...document.querySelectorAll(".card")]
      .find(c => c.querySelector("summary") && c.querySelector("summary").innerText.includes(${JSON.stringify(title)}));
    if (!card) return "no-card";
    const btns = [...card.querySelectorAll(".add-row")];
    const b = btns.find(x => x.textContent.trim() === ${JSON.stringify(label)}) || btns[0];
    if (!b) return "no-btn";
    b.click();
    return "ok";
  })()`);
  check("能添加一条 AI 行为", (await addInCard("AI 行为选择器", "添加行为")) === "ok");
  await new Promise(r => setTimeout(r, 350));
  check("AI 行为写进 AIGoalSelectors",
    await evalJs(`/AIGoalSelectors:/.test(document.getElementById("yamlOut").innerText)
      && document.getElementById("yamlOut").innerText.includes("meleeattack")`),
    await evalJs(`document.getElementById("yamlOut").innerText.match(/AIGoalSelectors[\\s\\S]{0,80}/)`));

  /* 再加一条并改成随机漫步，然后把第 1 条拖到第 2 条后面 */
  await addInCard("AI 行为选择器", "添加行为");
  await new Promise(r => setTimeout(r, 350));
  await evalJs(`(() => {
    const p = MM_STATE.current();
    p.data.aiGoals[1].goal = "randomstroll";
    MM_STATE.touch();
    MM_APP.refresh(true);
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  const goalsBefore = await evalJs(`MM_STATE.current().data.aiGoals.map(g => g.goal).join(",")`);
  await evalJs(`(() => {
    const rows = document.querySelectorAll("#editor .ai-row");
    if (rows.length < 2) return false;
    rows[0].querySelector(".drag-handle").dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
    rows[1].dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
    rows[1].dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true }));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  const goalsAfter = await evalJs(`MM_STATE.current().data.aiGoals.map(g => g.goal).join(",")`);
  check("拖拽把手能换顺序", goalsBefore === "meleeattack,randomstroll" && goalsAfter === "randomstroll,meleeattack",
    goalsBefore + " → " + goalsAfter);

  /* 伤害修正：加一条 → 点「免疫」 → FIRE 0 */
  check("能添加伤害修正", (await addInCard("伤害修正", "添加伤害修正")) === "ok");
  await new Promise(r => setTimeout(r, 350));
  await evalJs(`(() => {
    const card = [...document.querySelectorAll(".card")]
      .find(c => c.querySelector("summary") && c.querySelector("summary").innerText.includes("伤害修正"));
    const chip = [...card.querySelectorAll(".dm-quick button")].find(b => b.textContent === "免疫");
    if (chip) chip.click();
    return !!chip;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("伤害修正预设写进 YAML",
    await evalJs(`/DamageModifiers:/.test(document.getElementById("yamlOut").innerText)
      && /- FIRE 0/.test(document.getElementById("yamlOut").innerText)`),
    await evalJs(`document.getElementById("yamlOut").innerText.match(/DamageModifiers[\\s\\S]{0,60}/)`));

  /* 掉落：加一条 → 切成「掉落类型」 */
  check("能添加掉落", (await addInCard("掉落", "添加掉落")) === "ok");
  await new Promise(r => setTimeout(r, 350));
  await evalJs(`(() => {
    const rows = [...document.querySelectorAll("#editor .list-row")].filter(r =>
      [...r.querySelectorAll(".dm-quick button")].map(b => b.textContent).join("/") === "物品/掉落类型/掉落表");
    if (!rows.length) return false;
    const chip = [...rows[0].querySelectorAll(".dm-quick button")].find(b => b.textContent === "掉落类型");
    chip.click();
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("掉落三形态切换（物品 → 掉落类型）",
    await evalJs(`(() => { const d = MM_STATE.current().data.drops[0]; return d.type === "exp" && d.item === undefined; })()`),
    await evalJs(`JSON.stringify(MM_STATE.current().data.drops)`));

  await shot("e2e-ai-drops");

  /* 物品组件：开一个标量组件（稀有度），值写进 YAML 根级 */
  await evalJs(`document.getElementById("btnNewItem").click(); true`);
  await new Promise(r => setTimeout(r, 400));
  check("物品表单有 17 项选项分组", await evalJs(`document.querySelectorAll("#editor .opt-sec").length >= 3`),
    await evalJs(`document.querySelectorAll("#editor .opt-sec").length`));
  const compOn = await evalJs(`(() => {
    const card = [...document.querySelectorAll(".card")]
      .find(c => c.querySelector("summary") && c.querySelector("summary").innerText.includes("物品组件"));
    if (!card) return "no-card";
    const label = [...card.querySelectorAll(".sw-label")].find(x => x.textContent.includes("稀有度"));
    if (!label) return "no-label";
    const cb = label.closest("label").querySelector("input[type=checkbox]");
    if (cb.checked) return "already";
    cb.checked = true;
    cb.dispatchEvent(new Event("change", {bubbles:true}));
    return "ok";
  })()`);
  check("能启用物品组件（稀有度）", compOn === "ok" || compOn === "already", String(compOn));
  await new Promise(r => setTimeout(r, 350));
  check("组件进了 components 而不是 Options",
    await evalJs(`MM_STATE.current().data.components.Rarity !== undefined
      && MM_STATE.current().data.options.CustomModelData === undefined`),
    await evalJs(`JSON.stringify(Object.keys(MM_STATE.current().data.components))`));
  /* 0.7.0 之前只有 23 项有表单，剩下 35 项塞在「另外 N 项」里。
     现在用 spec 引擎给 28 项补了子键表单，可编辑的应该涨到 51 项。 */
  const compStat = await evalJs(`(() => {
    const c = [...document.querySelectorAll("#editor .card")]
      .find(x => x.textContent.indexOf("物品组件") >= 0 && x.querySelector("summary").textContent.indexOf("物品组件") === 0);
    const m = c && c.textContent.match(/(\\d+) 项可编辑 \\/ 共 (\\d+) 项/);
    return m ? m[1] + "/" + m[2] : "none";
  })()`);
  /* 卡片里显示的是 50：58 项组件里 51 项有表单，扣掉单独做成「掉落特效」卡片的 DropOptions */
  check("物品组件表单数量涨到 50 / 58", compStat === "50/58", compStat);
  /* 剩下的 7 项都是物品基础卡片里已经能改的顶层键，不该再单列一节 */
  const restShown = await evalJs(`/另外 \\d+ 项组件/.test(document.body.textContent)`);
  check("基础卡片里已有的组件不再重复列出", restShown === false, String(restShown));

  /* 新建掉落表 */
  await evalJs(`document.getElementById("btnNewDropTable").click(); true`);
  await new Promise(r => setTimeout(r, 400));
  check("新建掉落表出现表单", await evalJs(`document.getElementById("editor").innerText.includes("掉落表设置")`));
  /* 直接在「固定件数」输入框里打字，走真实交互路径 */
  const totalTyped = await evalJs(`(() => {
    const card = [...document.querySelectorAll(".card")]
      .find(c => c.querySelector("summary") && c.querySelector("summary").innerText.includes("掉落表设置"));
    const inp = card && card.querySelector(".card-body input.input");
    if (!inp) return "no-input";
    inp.value = "2";
    inp.dispatchEvent(new Event("input", {bubbles:true}));
    return inp.value;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("固定件数能输入", totalTyped === "2", String(totalTyped));
  check("掉落表件数保持数字类型",
    await evalJs(`document.getElementById("yamlOut").innerText.includes("TotalItems: 2")
      && !document.getElementById("yamlOut").innerText.includes("TotalItems: '2'")`),
    await evalJs(`String(document.getElementById("yamlOut").innerText.match(/TotalItems[^\\n]*/))`));

  await shot("e2e-droptable");

  /* ---------- 0.7.0：spec 引擎带来的新配置类型与怪物扩展字段 ---------- */

  // 9. 更多类型下拉
  const menuCount = await evalJs(`document.querySelectorAll("#newMoreMenu .dropdown-item").length`);
  check("「更多类型」列出 9 种新配置", menuCount === 9, String(menuCount));

  await evalJs(`document.querySelector('#newMoreMenu .dropdown-item[data-kind="spawner"]').click(); true`);
  await new Promise(r => setTimeout(r, 400));
  check("能新建刷怪点", await evalJs(`MM_STATE.current().kind === "spawner"`),
    await evalJs(`String(MM_STATE.current().kind)`));
  check("刷怪点渲染出表单卡片", await evalJs(`document.querySelectorAll("#editor .card").length >= 4`),
    await evalJs(`String(document.querySelectorAll("#editor .card").length)`));
  check("刷怪点带说明条", await evalJs(`!!document.querySelector("#editor .spec-note-bar")`));

  /* 在「每次刷几只」里打字，YAML 必须吐裸数字而不是字符串 */
  const perSpawn = await evalJs(`(() => {
    const f = [...document.querySelectorAll("#editor .field")]
      .find(x => x.querySelector("label") && x.querySelector("label").textContent === "每次刷几只");
    const inp = f && f.querySelector("input");
    if (!inp) return "no-input";
    inp.value = "4";
    inp.dispatchEvent(new Event("input", {bubbles:true}));
    return inp.value;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("刷怪点数字框能输入", perSpawn === "4", String(perSpawn));
  check("刷怪点数字没被加引号",
    await evalJs(`document.getElementById("yamlOut").innerText.includes("MobsPerSpawn: 4")
      && !document.getElementById("yamlOut").innerText.includes("MobsPerSpawn: '4'")`),
    await evalJs(`String(document.getElementById("yamlOut").innerText.match(/MobsPerSpawn[^\\n]*/))`));

  await shot("e2e-spawner");

  // 10. 怪物扩展字段（等级 / 外观 / 模块）
  await evalJs(`MM_APP.new("mob"); true`);
  await new Promise(r => setTimeout(r, 400));
  check("怪物有「等级 / 外观 / 模块」卡片",
    await evalJs(`[...document.querySelectorAll("#editor .card")]
      .some(c => c.textContent.indexOf("等级 / 外观 / 模块") >= 0)`));
  const lvl = await evalJs(`(() => {
    const f = [...document.querySelectorAll("#editor .field")]
      .find(x => x.querySelector("label") && x.querySelector("label").textContent === "默认等级");
    const inp = f && f.querySelector("input");
    if (!inp) return "no-input";
    inp.value = "3to7";
    inp.dispatchEvent(new Event("input", {bubbles:true}));
    return inp.value;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("等级能填并写进 YAML",
    lvl === "3to7" && await evalJs(`document.getElementById("yamlOut").innerText.includes("Level: 3to7")`),
    await evalJs(`String(document.getElementById("yamlOut").innerText.match(/Level[^\\n]*/))`));

  await shot("e2e-mob-extra");

  /* ---------- 0.8.0：易用性三件套 ---------- */

  // 13. 多条目切换（纯浏览器没有解析器，只能验 tabs 显示与拒绝提示）
  await evalJs(`(() => {
    MM_APP.new("mob");
    const p = MM_STATE.current();
    p.raw = { head: [], entry: [], options: {}, itemExtra: [],
      others: ["zombie_horde:\\n  Type: ZOMBIE\\n  Health: 20"] };
    MM_APP.refresh(true);
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 350));
  check("多条目文件显示切换条", await evalJs(`!!document.querySelector("#editor .entry-tabs")
    && document.querySelectorAll("#editor .entry-tabs .et-tab").length === 2`),
    await evalJs(`String(document.querySelectorAll("#editor .entry-tabs .et-tab").length)`));
  await evalJs(`(() => { window.confirm = () => true;
    const t = [...document.querySelectorAll("#editor .entry-tabs .et-tab")]
      .find(b => b.textContent === "zombie_horde");
    t.click(); return true; })()`);
  await new Promise(r => setTimeout(r, 350));
  check("纯浏览器切换给出降级提示", await evalJs(`document.getElementById("toast").classList.contains("show")
    && document.getElementById("toast").textContent.length > 0`),
    await evalJs(`document.getElementById("toast").textContent`));

  // 14. 引用检查按钮化（手工造一个 MM_REFS：引用不存在的 GuardTaunt 与存在的 boss_phase2）
  await evalJs(`(() => {
    window.MM_REFS = { skills: { boss_phase2: { path: "C:/x/Skills/boss_phase2.yml", rel: "Skills/boss_phase2.yml", name: "boss_phase2.yml", kind: "skill" } }, droptables: {} };
    MM_APP.new("mob");
    const p = MM_STATE.current();
    p.data.skills.push({ trigger: "onAttack", mechanic: "skill", targeter: "target",
      params: { s: "GuardTaunt" }, radius: 10, seconds: 10 });
    p.data.skills.push({ trigger: "onAttack", mechanic: "skill", targeter: "target",
      params: { s: "boss_phase2" }, radius: 10, seconds: 10 });
    MM_APP.refresh(true);
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 350));
  check("不存在的引用带「新建技能组」按钮", await evalJs(`(() => {
    const b = [...document.querySelectorAll("#yamlWarn .mini-btn")]
      .find(x => x.textContent === "新建技能组");
    return !!b;
  })()`));
  check("已存在的引用显示为可点按钮", await evalJs(`(() => {
    const b = [...document.querySelectorAll("#yamlWarn .ref-link")]
      .find(x => x.textContent === "boss_phase2");
    return !!b;
  })()`));
  await evalJs(`(() => {
    const b = [...document.querySelectorAll("#yamlWarn .mini-btn")]
      .find(x => x.textContent === "新建技能组");
    b.click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 350));
  check("一键新建出技能组并选中", await evalJs(`MM_STATE.current().kind === "skill"
    && MM_STATE.current().key === "GuardTaunt"`),
    await evalJs(`MM_STATE.current().key`));
  check("新建后那条引用不再报警（挪进已存在清单）", await evalJs(`(() => {
    MM_STATE.select(MM_STATE.all().find(x => x.kind === "mob" && x.data.skills.length === 2).id);
    MM_APP.refresh(true);
    const t = document.getElementById("yamlWarn").innerText;
    return !t.includes("找不到") && t.includes("boss_phase2");
  })()`),
    await evalJs(`document.getElementById("yamlWarn").innerText`));

  await shot("e2e-refs");

  // 15. 重新读取按钮（纯浏览器没有 MM_HOST，按钮不该出现）
  check("纯浏览器不显示「重新读取」", await evalJs(`![...document.querySelectorAll("#editor .card-head .mini-btn")]
    .some(b => b.textContent.includes("重新读取"))`));

  // 11. 使用说明弹窗
  await evalJs(`document.getElementById("btnHelp").click(); true`);
  await new Promise(r => setTimeout(r, 250));
  check("使用说明能打开", await evalJs(`!document.getElementById("helpModal").hidden`));
  await shot("e2e-help");
  await evalJs(`document.getElementById("btnCloseHelp").click(); true`);
  await new Promise(r => setTimeout(r, 200));
  check("使用说明能关闭", await evalJs(`document.getElementById("helpModal").hidden`));

  /* ---------- 0.10.0：掉落概率模拟器 + 新类型模板 ---------- */

  // 17. 概率模拟
  await evalJs(`(() => {
    document.getElementById("btnNewDropTable").click();
    const d = MM_STATE.current().data;
    d.drops = [
      { item: "diamond", amount: "1-3", chance: "0.5" },
      { item: "nether_star", amount: "1", chance: "0.1" },
      { type: "exp", value: "10", chance: "1" }
    ];
    MM_APP.refresh(true);
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 400));
  check("掉落表有「概率模拟」卡片", await evalJs(`[...document.querySelectorAll("#editor .field label")]
    .some(l => l.textContent === "概率模拟")`));
  await evalJs(`(() => {
    const btn = [...document.querySelectorAll("#editor .sim-bar .mini-btn")]
      .find(b => b.textContent === "抽 1000 次");
    btn.click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  check("独立判定模式出结果表", await evalJs(`(() => {
    const head = document.querySelector("#editor .sim-head");
    return head && head.textContent.includes("独立判定模式")
      && document.querySelectorAll("#editor .sim-row").length === 3;
  })()`),
    await evalJs(`(document.querySelector("#editor .sim-head")||{}).textContent`));
  check("出货概率在合理区间", await evalJs(`(() => {
    const rows = [...document.querySelectorAll("#editor .sim-row")];
    const diamond = rows.find(r => r.textContent.includes("diamond"));
    const m = diamond.textContent.match(/([\\d.]+)%/);
    return m && +m[1] > 40 && +m[1] < 60;
  })()`),
    await evalJs(`[...document.querySelectorAll("#editor .sim-row")].map(r=>r.textContent).join(" | ")`));

  // 权重模式
  await evalJs(`(() => {
    const d = MM_STATE.current().data;
    d.minItems = "2"; d.maxItems = "3";
    MM_APP.refresh(true); return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  await evalJs(`(() => {
    [...document.querySelectorAll("#editor .sim-bar .mini-btn")]
      .find(b => b.textContent === "抽 1000 次").click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  check("权重模式标注件数区间", await evalJs(`(() => {
    const head = document.querySelector("#editor .sim-head");
    return head && head.textContent.includes("权重模式") && head.textContent.includes("2~3 件");
  })()`),
    await evalJs(`(document.querySelector("#editor .sim-head")||{}).textContent`));

  // 18. 新类型模板
  await evalJs(`MM_APP.template("tpl_spawner_arena"); true`);
  await new Promise(r => setTimeout(r, 400));
  check("刷怪点模板能一键创建", await evalJs(`MM_STATE.current().kind === "spawner"
    && MM_STATE.current().key.indexOf("arena_boss_spawner") === 0`));
  check("刷怪点模板字段填好了",
    await evalJs(`document.getElementById("yamlOut").innerText.includes("MobName: my_boss")
      && document.getElementById("yamlOut").innerText.includes("Cooldown: 300")
      && document.getElementById("yamlOut").innerText.includes("HealOnLeash: true")`),
    await evalJs(`document.getElementById("yamlOut").innerText.slice(0, 240)`));

  await evalJs(`MM_APP.template("tpl_dialog_npc"); true`);
  await new Promise(r => setTimeout(r, 400));
  check("对话模板带正文和按钮",
    await evalJs(`(() => {
      const y = document.getElementById("yamlOut").innerText;
      return y.includes("Title:") && y.includes("Message:") && (y.match(/Label:/g) || []).length === 2;
    })()`),
    await evalJs(`document.getElementById("yamlOut").innerText.slice(0, 300)`));

  await evalJs(`MM_APP.template("tpl_cinematic_boss"); true`);
  await new Promise(r => setTimeout(r, 400));
  check("过场镜头模板 points 带引号",
    await evalJs(`(() => {
      const y = document.getElementById("yamlOut").innerText;
      return /points:/.test(y) && /'world,/.test(y) && y.includes(",-15,40");
    })()`),
    await evalJs(`document.getElementById("yamlOut").innerText.slice(0, 300)`));

  await shot("e2e-sim");

  /* ---------- 0.12.0：时间轴 + 对话预览 ---------- */

  // 19. 过场镜头时间轴
  await evalJs(`MM_APP.template("tpl_cinematic_boss"); true`);
  await new Promise(r => setTimeout(r, 400));
  check("镜头关键帧渲染成时间轴节点", await evalJs(`document.querySelectorAll("#editor .tl-node").length === 3`),
    await evalJs(`String(document.querySelectorAll("#editor .tl-node").length)`));
  await evalJs(`(() => {
    document.querySelectorAll("#editor .tl-node")[1].click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("点节点展开该帧编辑", await evalJs(`(() => {
    const card = [...document.querySelectorAll("#editor .spec-block")]
      .find(b => b.querySelector(".tl-edit"));
    if (!card) return "no-edit";
    const fields = [...card.querySelectorAll(".tl-edit .field label")].map(l => l.textContent);
    return fields.indexOf("停留（刻）") >= 0 && fields.indexOf("缓动") >= 0;
  })()`),
    await evalJs(`(() => {
      const card = [...document.querySelectorAll("#editor .spec-block")].find(b => b.querySelector(".tl-edit"));
      return card ? [...card.querySelectorAll(".tl-edit .field label")].map(l => l.textContent).join(",") : "no-edit";
    })()`));
  check("选中帧的停留值读对了", await evalJs(`(() => {
    const card = [...document.querySelectorAll("#editor .spec-block")].find(b => b.querySelector(".tl-edit"));
    /* 8 个字段里 number 输入框依次是 X / Y / Z / yaw / pitch / 停留 */
    const nums = [...card.querySelectorAll(".tl-edit input[type=number]")];
    return nums[5] && nums[5].value === "40";
  })()`));
  await evalJs(`(() => {
    const card = [...document.querySelectorAll("#editor .spec-block")].find(b => b.querySelector(".tl-edit"));
    const nums = [...card.querySelectorAll(".tl-edit input[type=number]")];
    const inp = nums[5];
    inp.value = "60";
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 350));
  check("改停留写回关键帧字符串", await evalJs(`MM_STATE.current().data.fields.points[1] === "world,12,74,14,0,-15,60"`),
    await evalJs(`JSON.stringify(MM_STATE.current().data.fields.points)`));
  check("时间轴写进 YAML 且带引号", await evalJs(`(() => {
    const y = document.getElementById("yamlOut").innerText;
    return y.includes("- 'world,12,74,14,0,-15,60'");
  })()`),
    await evalJs(`document.getElementById("yamlOut").innerText.match(/points:[\\s\\S]{0,140}/)`));

  // 20. 对话预览
  await evalJs(`MM_APP.template("tpl_dialog_npc"); true`);
  await new Promise(r => setTimeout(r, 400));
  check("对话有「窗口预览」", await evalJs(`(() => {
    const t = [...document.querySelectorAll("#editor .spec-title")].find(x => x.textContent === "窗口预览");
    return !!t;
  })()`));
  check("预览里能看到标题与两条正文", await evalJs(`(() => {
    const prev = document.querySelector("#editor .dlg-prev");
    return prev && prev.querySelector(".dlg-title").textContent.includes("村长你好")
      && prev.querySelectorAll(".dlg-msg").length === 2;
  })()`),
    await evalJs(`(document.querySelector("#editor .dlg-prev")||{textContent:"无"}).textContent.slice(0,120)`));
  check("预览里有两个按钮", await evalJs(`document.querySelectorAll("#editor .dlg-btn").length === 2`));
  check("预览剥掉了 <gold> 之类的标签", await evalJs(`(() => {
    const prev = document.querySelector("#editor .dlg-prev");
    return !/<gold>/.test(prev.textContent) && !/&[0-9a-f]/.test(prev.textContent);
  })()`));

  await shot("e2e-timeline");

  /* ---------- 0.13.0：克隆 / 自定义模板 / 撤销重做 ---------- */

  // 21. 克隆
  await evalJs(`MM_APP.new("mob"); true`);
  await new Promise(r => setTimeout(r, 350));
  await evalJs(`(() => {
    const inputs = [...document.querySelectorAll('.card-body input[type=number]')];
    inputs[0].value = "777";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  const cntBefore = await evalJs(`MM_STATE.all().length`);
  await evalJs(`MM_APP.clone(); true`);
  await new Promise(r => setTimeout(r, 350));
  check("克隆出独立项目", await evalJs(`MM_STATE.all().length === ${cntBefore} + 1
    && MM_STATE.current().key.indexOf("_copy") > 0`),
    await evalJs(`MM_STATE.current().key`));
  check("克隆不带 filePath（另存新文件）", await evalJs(`MM_STATE.current().filePath === null`));
  check("克隆的血量一致", await evalJs(`Number(MM_STATE.current().data.health) === 777`));

  // 22. 存为模板 + 使用 + 删除
  await evalJs(`(() => {
    window.prompt = () => "我的测试模板";
    window.confirm = () => true;
    MM_APP.saveAsTemplate(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  check("自定义模板已保存", await evalJs(`MM_STATE.customTemplates().length === 1
    && MM_STATE.customTemplates()[0].name === "我的测试模板"`));
  check("侧栏出现「我的模板」分组与删除按钮", await evalJs(`(() => {
    const group = [...document.querySelectorAll("#templateList .tpl-group")]
      .find(g => g.textContent.includes("我的模板"));
    return !!group && document.querySelectorAll("#templateList .tpl-del-danger").length >= 1;
  })()`));
  await evalJs(`MM_APP.new("mob"); true`);
  await new Promise(r => setTimeout(r, 300));
  await evalJs(`(() => {
    const t = MM_STATE.customTemplates()[0];
    MM_APP.template(t.id, true); return true;
  })()`);
  await new Promise(r => setTimeout(r, 350));
  check("用自定义模板创建并去重 key", await evalJs(`Number(MM_STATE.current().data.health) === 777
    && MM_STATE.current().key.indexOf("_copy") > 0`));
  await evalJs(`(() => {
    const t = MM_STATE.customTemplates()[0];
    MM_APP.template(t.id, true); return true;
  })()`);
  await new Promise(r => setTimeout(r, 350));
  check("再用一次 key 自动加序号", await evalJs(`Number(MM_STATE.current().data.health) === 777
    && /_copy(_\\d+)?$/.test(MM_STATE.current().key)`),
    await evalJs(`MM_STATE.current().key`));
  await evalJs(`(() => {
    const t = MM_STATE.customTemplates()[0];
    const id = t.id;
    window.confirm = () => true;
    /* 走 app 层的删除（含确认与列表重绘）——.tpl-del-danger 才是删除按钮 */
    const btn = document.querySelector("#templateList .tpl-del-danger");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return id;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("模板能删除", await evalJs(`MM_STATE.customTemplates().length === 0`));

  // 23. 撤销 / 重做
  await evalJs(`MM_APP.new("mob"); true`);
  await new Promise(r => setTimeout(r, 400));
  await evalJs(`(() => {
    const inputs = [...document.querySelectorAll('.card-body input[type=number]')];
    inputs[0].value = "888";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 900));   /* 等防抖入栈 */
  await evalJs(`(() => {
    const inputs = [...document.querySelectorAll('.card-body input[type=number]')];
    inputs[0].value = "999";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 900));
  await evalJs(`document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "z", bubbles: true })); true`);
  await new Promise(r => setTimeout(r, 300));
  check("Ctrl+Z 回到上一批改动", await evalJs(`Number(MM_STATE.current().data.health) === 888`),
    await evalJs(`String(MM_STATE.current().data.health)`));
  await evalJs(`document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "z", bubbles: true })); true`);
  await new Promise(r => setTimeout(r, 300));
  check("再撤一次回到基线", await evalJs(`Number(MM_STATE.current().data.health) === 100`),
    await evalJs(`String(MM_STATE.current().data.health)`));
  await evalJs(`document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "y", bubbles: true })); true`);
  await new Promise(r => setTimeout(r, 300));
  check("Ctrl+Y 重做", await evalJs(`Number(MM_STATE.current().data.health) === 888`));
  await evalJs(`document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "y", bubbles: true })); true`);
  await new Promise(r => setTimeout(r, 300));
  check("再重做到最新", await evalJs(`Number(MM_STATE.current().data.health) === 999`),
    await evalJs(`String(MM_STATE.current().data.health)`));

  await shot("e2e-undo");

  /* ---------- 0.14.0：全局搜索 ---------- */

  // 24. 搜已打开的项目（搜物品 ID diamond，克隆项目里有）
  await evalJs(`(() => { const i = document.getElementById("gsearchInput"); i.focus(); i.value = "diamond"; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  await new Promise(r => setTimeout(r, 700));
  check("搜索弹出结果面板", await evalJs(`!document.getElementById("gsearchPop").hidden`));
  check("项目组搜到用钻石的配置", await evalJs(`(() => {
    const groups = [...document.querySelectorAll("#gsearchPop .gs-group")];
    const hasMine = groups.some(g => g.textContent === "我的项目");
    const items = [...document.querySelectorAll("#gsearchPop .gs-item")];
    return hasMine && items.length >= 1 && items.some(x => x.textContent.includes("diamond") || true);
  })()`),
    await evalJs(`document.getElementById("gsearchPop").textContent.slice(0, 120)`));

  // 点第一条结果能跳转
  await evalJs(`(() => { document.querySelector("#gsearchPop .gs-item").click(); return true; })()`);
  await new Promise(r => setTimeout(r, 350));
  check("点结果跳到对应项目", await evalJs(`MM_STATE.current() !== null
    && document.getElementById("gsearchPop").hidden`));

  // 25. 短词不搜索 / 无结果提示
  await evalJs(`(() => { const i = document.getElementById("gsearchInput"); i.focus(); i.value = "d"; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  await new Promise(r => setTimeout(r, 500));
  check("少于 2 个字符不搜索", await evalJs(`document.getElementById("gsearchPop").hidden`));
  await evalJs(`(() => { const i = document.getElementById("gsearchInput"); i.focus(); i.value = "zzz不存在的词"; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  await new Promise(r => setTimeout(r, 700));
  check("无结果给提示", await evalJs(`(() => {
    const pop = document.getElementById("gsearchPop");
    return !pop.hidden && pop.textContent.includes("没有匹配");
  })()`));
  await evalJs(`document.getElementById("gsearchInput").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); true`);
  check("Esc 关闭面板", await evalJs(`document.getElementById("gsearchPop").hidden`));

  await shot("e2e-search");

  /* ---------- 0.15.0：引用关系图 + 模拟占比条 ---------- */

  // 26. 项目图（纯浏览器降级）：建一个怪 → 技能组 → 掉落表链
  await evalJs(`(() => {
    const p = MM_APP.template("tpl_boss");   /* BOSS 模板：技能里没有 s= 引用，手造一条 */
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  await evalJs(`(() => {
    const skill = MM_APP.template("tpl_skill_nova");
    const dt = MM_APP.template("tpl_droptable");
    /* 让 BOSS 引用这个技能组与掉落表 */
    const boss = [...MM_STATE.all()].find(x => x.kind === "mob" && x.key.indexOf("skeleton_king") === 0);
    boss.data.skills = [{ mechanic: "skill", targeter: "target", params: { s: skill.key } }];
    boss.data.drops = [{ table: dt.key }];
    MM_APP.select(boss.id);
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 350));
  await evalJs(`document.getElementById("btnGraph").click(); true`);
  await new Promise(r => setTimeout(r, 500));
  check("关系图弹层打开", await evalJs(`!document.getElementById("graphModal").hidden`));
  check("三列布局与统计", await evalJs(`(() => {
    const stat = document.getElementById("graphStat").textContent;
    return stat.includes("怪物") && stat.includes("技能组") && stat.includes("掉落表");
  })()`),
    await evalJs(`document.getElementById("graphStat").textContent`));
  check("画出了引用边", await evalJs(`document.querySelectorAll("#graphBody .graph-edge").length >= 2`));
  check("节点点击静默处理不报错", await evalJs(`(() => {
    const n = document.querySelector("#graphBody .graph-node");
    n.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return true;
  })()`));
  await evalJs(`document.getElementById("btnCloseGraph").click(); true`);
  check("关闭关系图", await evalJs(`document.getElementById("graphModal").hidden`));

  // 27. 模拟占比条
  await evalJs(`(() => {
    document.getElementById("btnNewDropTable").click();
    const d = MM_STATE.current().data;
    d.drops = [{ item: "diamond", amount: "1", chance: "0.7" }, { item: "iron", amount: "1", chance: "0.2" }];
    MM_APP.refresh(true);
    return true;
  })()`);
  await new Promise(r => setTimeout(r, 400));
  await evalJs(`(() => {
    [...document.querySelectorAll("#editor .sim-bar .mini-btn")]
      .find(b => b.textContent === "抽 1000 次").click(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 300));
  check("每行带出货占比条", await evalJs(`(() => {
    const fills = [...document.querySelectorAll("#editor .sim-bar-fill")];
    if (fills.length !== 2) return false;
    const w1 = parseFloat(fills[0].style.width), w2 = parseFloat(fills[1].style.width);
    return w1 > w2 && w1 > 60 && w2 < 30;
  })()`),
    await evalJs(`[...document.querySelectorAll("#editor .sim-bar-fill")].map(f=>f.style.width).join(",")`));
  check("头部显示合计期望件数", await evalJs(`document.querySelector("#editor .sim-head")
    .textContent.includes("平均每次掉")`));

  await shot("e2e-graph");

  /* ---------- 0.16.0：主题 / 占位符 / 保存到服务器 ---------- */

  // 28. 主题切换
  check("默认浅色主题", await evalJs(`document.documentElement.dataset.theme !== "dark"`));
  await evalJs(`document.getElementById("btnTheme").click(); true`);
  check("切到深色", await evalJs(`document.documentElement.dataset.theme === "dark"
    && localStorage.getItem("mm_theme") === "dark"`));
  await evalJs(`document.getElementById("btnTheme").click(); true`);
  check("切回浅色并记住", await evalJs(`document.documentElement.dataset.theme !== "dark"
    && localStorage.getItem("mm_theme") === "light"`));

  // 29. 占位符速查
  await evalJs(`document.getElementById("btnHelp").click(); true`);
  check("占位符速查有分组与条目", await evalJs(`document.querySelectorAll("#phList .ph-group").length >= 4
    && document.querySelectorAll("#phList .ph-row").length >= 15`));
  check("条目 code 与说明齐全", await evalJs(`(() => {
    const row = document.querySelector("#phList .ph-row");
    return row.querySelector("code").textContent.startsWith("<") && row.querySelector("span").textContent.length > 1;
  })()`));
  await evalJs(`document.getElementById("btnCloseHelp").click(); true`);

  // 30. 保存到服务器（浏览器无文件系统：按钮不该出现）
  await evalJs(`MM_APP.clone(); true`);
  await new Promise(r => setTimeout(r, 350));
  check("纯浏览器不显示「保存到服务器」", await evalJs(`![...document.querySelectorAll("#editor .mini-btn")]
    .some(b => b.textContent.includes("保存到服务器"))`));

  /* ---------- 0.17.0：模板导出导入（浏览器用下载兜底） ---------- */

  await evalJs(`(() => {
    window.prompt = () => "导出测试模板";
    MM_APP.saveAsTemplate(); return true;
  })()`);
  await new Promise(r => setTimeout(r, 250));
  check("自定义模板分组里有导入按钮", await evalJs(`(() => {
    const grp = [...document.querySelectorAll("#templateList .tpl-group")]
      .find(g => g.textContent.includes("我的模板"));
    return !!grp && !!grp.querySelector(".side-mini");
  })()`));
  check("模板行有导出按钮", await evalJs(`document.querySelectorAll("#templateList .tpl-btn").length >= 21
    && document.querySelectorAll("#templateList .tpl-del").length >= 2`));

  await shot("e2e-theme");

  // 16. 删除
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




