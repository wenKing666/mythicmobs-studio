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

  /* 上一次运行留下的项目还在 localStorage 里（openFile 会切回旧项目而不是重新导入，
     夹具一改断言就对不上），先清掉再刷新，保证从干净状态跑 */
  await send("Page.enable");
  await ev(`localStorage.clear(); true`);
  await send("Page.reload");
  await sleep(1500);

  check("Electron 环境已注入", await ev(`!!(window.MM_HOST && window.MM_HOST.isElectron)`));
  check("顶栏出现「打开文件夹」", await ev(`document.getElementById("btnOpenFolder").hidden === false`));

  const info = await ev(`MM_HOST.info()`);
  check("能拿到版本信息", !!info.electron, JSON.stringify(info));
  /* 以前 host.js 里写死 "0.2 · Electron ..."，版本一路涨到 0.5.0 界面还显示 0.2。
     现在顶栏必须显示 app.getVersion() 的值。 */
  const badge = await ev(`document.getElementById("appVer").textContent`);
  check("顶栏版本号与 package.json 一致", badge.indexOf(info.version) === 0, badge);

  // 上一次跑挂掉可能留下残留，先清一遍再断言文件数
  cleanWriteTest(FIXTURE);

  const dir = FIXTURE.replace(/\\/g, "\\\\");
  const scan = await ev(`MM_HOST.scan("${dir}")`);
  /* 夹具：Mobs/skeleton_king.yml、Mobs/ai_guard.yml、Mobs/multi_mobs.yml、Items/flame_sword.yml、
     Skills/boss_phase2.yml、Drops/boss_loot.yml、Spawners/boss_spawner.yml、pins.yml */
  check("扫描目录拿到 8 个文件", scan.files.length === 8, "count=" + scan.files.length);
  check("识别出 mob / item / skill / droptable",
    ["mob", "item", "skill", "droptable"].every(k => scan.files.some(f => f.kind === k)),
    JSON.stringify(scan.files.map(f => f.kind)));
  /* 0.7.0：刷怪点与 pins 是新认的类型，目录映射错了这里会先炸 */
  check("识别出 spawner / pin",
    ["spawner", "pin"].every(k => scan.files.some(f => f.kind === k)),
    JSON.stringify(scan.files.map(f => f.kind + ":" + f.rel)));

  const mob = scan.files.find(f => f.rel.replace(/\\/g, "/") === "Mobs/skeleton_king.yml");
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

  /* 技能组：打开 → 进表单 → 改冷却 → 保存 → 磁盘上真的变了 */
  const skillFile = scan.files.find(f => f.kind === "skill");
  if (!skillFile) {
    check("夹具里有技能组文件", false, JSON.stringify(scan.files.map(f => f.rel)));
  } else {
    const tmpSkill = path.join(os.tmpdir(), "mm-skill-test");
    fs.rmSync(tmpSkill, { recursive: true, force: true });
    fs.mkdirSync(path.join(tmpSkill, "Skills"), { recursive: true });
    const sDst = path.join(tmpSkill, "Skills", "boss_phase2.yml");
    fs.writeFileSync(sDst, fs.readFileSync(skillFile.path, "utf8"), "utf8");

    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: sDst, name: "boss_phase2.yml", kind: "skill", rel: "Skills/boss_phase2.yml", size: 0, mtime: 0
    })}); true`);
    await sleep(400);
    check("技能组进表单而不是只读预览",
      await ev(`!document.getElementById("editor").innerText.includes("只读预览")`));
    check("技能组读出条件块",
      await ev(`document.getElementById("yamlOut").innerText.includes("- healthpercent{p=<50%}")`));
    check("技能组的 day false 读成「不成立」",
      await ev(`document.getElementById("yamlOut").innerText.includes("- day false")`));

    await ev(`(() => { const p = MM_STATE.current(); p.data.cooldown = 99; MM_STATE.touch(); return true; })()`);
    await ev(`MM_HOST_SAVE()`);

    const sWritten = fs.readFileSync(sDst, "utf8");
    check("技能组冷却写回磁盘", /Cooldown:\s*99/.test(sWritten), sWritten.slice(0, 100).replace(/\n/g, " | "));
    check("技能组条件没丢",
      /Conditions:/.test(sWritten) && /healthpercent/.test(sWritten) && /day false/.test(sWritten), sWritten);
    check("技能组技能没丢", /lightning\{damage=8\} @target/.test(sWritten), sWritten);
    fs.rmSync(tmpSkill, { recursive: true, force: true });
  }

  /* ---------- 0.6.0：AI 选择器 / 伤害修正 / 掉落表 / 引用检查 ---------- */

  const aiFile = scan.files.find(f => f.rel.replace(/\\/g, "/") === "Mobs/ai_guard.yml");
  const lootFile = scan.files.find(f => f.rel.replace(/\\/g, "/") === "Drops/boss_loot.yml");

  await ev(`MM_HOST_OPEN_DIR(${JSON.stringify(FIXTURE)})`);
  await sleep(200);
  check("打开目录后建好引用索引",
    await ev(`!!(window.MM_REFS && window.MM_REFS.skills.boss_phase2 && window.MM_REFS.droptables.boss_loot)`),
    await ev(`JSON.stringify(window.MM_REFS)`));

  if (!aiFile || !lootFile) {
    check("夹具里有 AI 怪物和掉落表", false, JSON.stringify(scan.files.map(f => f.rel)));
  } else {
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: aiFile.path, name: aiFile.name, kind: "mob", rel: aiFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(400);

    const hasCard = async (t) => ev(`[...document.querySelectorAll("#editor .card")]
      .some(c => c.textContent.indexOf(${JSON.stringify(t)}) >= 0)`);
    check("AI 怪物有「AI 行为选择器」卡片", await hasCard("AI 行为选择器"));
    check("AI 怪物有「AI 目标选择器」卡片", await hasCard("AI 目标选择器"));
    check("AI 怪物有「伤害修正」卡片", await hasCard("伤害修正"));
    check("每条 AI 行为都有拖拽把手",
      await ev(`document.querySelectorAll("#editor .ai-row .drag-handle").length >= 4`),
      await ev(`document.querySelectorAll("#editor .ai-row .drag-handle").length`));
    check("优先级数字写回 YAML",
      await ev(`document.getElementById("yamlOut").innerText.includes("0 clear")`),
      await ev(`document.getElementById("yamlOut").innerText.match(/AIGoalSelectors[\\s\\S]{0,120}/)`));

    /* 引用检查：夹具里故意写了不存在的 GuardTaunt */
    check("引用检查标出打错的技能组名",
      await ev(`document.getElementById("yamlWarn").hidden === false
        && document.getElementById("yamlWarn").innerText.includes("GuardTaunt")`),
      await ev(`document.getElementById("yamlWarn").innerText`));
    check("引用检查不拦保存",
      await ev(`document.getElementById("btnDownload").disabled === false`));
    check("引用检查用蓝色提示（不与必填项混在一起）",
      await ev(`document.getElementById("yamlWarn").classList.contains("soft")`));

    /* 拖拽排序：把第 1 条拖到第 3 条的位置 */
    const orderBefore = await ev(`MM_STATE.current().data.aiGoals.map(g => g.goal).join(",")`);
    await ev(`(() => {
      const rows = document.querySelectorAll("#editor .ai-row");
      rows[0].querySelector(".drag-handle").dispatchEvent(new DragEvent("dragstart", { bubbles: true }));
      rows[2].dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true }));
      rows[2].dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true }));
      return true;
    })()`);
    await sleep(300);
    const orderAfter = await ev(`MM_STATE.current().data.aiGoals.map(g => g.goal).join(",")`);
    check("拖拽改变了顺序", orderBefore !== orderAfter, orderBefore + " → " + orderAfter);
    check("拖拽后 YAML 顺序同步",
      await ev(`(() => {
        const y = MM_YAML.generate(MM_STATE.current());
        /* YAML 里出现的先后必须和数据里的顺序一致 */
        const names = MM_STATE.current().data.aiGoals.map(g => g.goal);
        const pos = names.map(n => y.indexOf(n));
        return pos.every((v, i) => v >= 0 && (i === 0 || pos[i - 1] < v));
      })()`),
      await ev(`MM_YAML.generate(MM_STATE.current()).match(/AIGoalSelectors[\\s\\S]{0,160}/)`));

    /* 掉落形态切换：第 1 条是「引用掉落表」，切成「掉落类型」 */
    const clickDropChip = (rowIdx, label) => ev(`(() => {
      /* 掉落行的特征：一行里同时有 物品/掉落类型/掉落表 三个 chip */
      const rows = [...document.querySelectorAll("#editor .list-row")].filter(r =>
        [...r.querySelectorAll(".dm-quick button")].map(b => b.textContent).join("/") === "物品/掉落类型/掉落表");
      if (!rows[${rowIdx}]) return "no-row";
      const btn = [...rows[${rowIdx}].querySelectorAll(".dm-quick button")]
        .find(b => b.textContent === ${JSON.stringify(label)});
      if (!btn) return "no-chip";
      btn.click();
      return "ok";
    })()`);
    check("掉落行能切成「掉落类型」", (await clickDropChip(0, "掉落类型")) === "ok");
    await sleep(300);
    check("切换后旧字段被清掉、类型生效",
      await ev(`(() => { const d = MM_STATE.current().data.drops[0];
        return d.type === "exp" && !d.table && d.item === undefined; })()`),
      await ev(`JSON.stringify(MM_STATE.current().data.drops)`));
    check("切成掉落类型后 YAML 跟着变",
      await ev(`/^\\s*- exp 1\\s*$/m.test(MM_YAML.generate(MM_STATE.current()))`),
      await ev(`MM_YAML.generate(MM_STATE.current()).match(/Drops:[\\s\\S]{0,60}/)`));
    check("能切回「掉落表」", (await clickDropChip(0, "掉落表")) === "ok");
    await sleep(300);
    check("切回后重新变成引用", await ev(`MM_STATE.current().data.drops[0].table === ""`));

    /* 掉落表文件 */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: lootFile.path, name: lootFile.name, kind: "droptable", rel: lootFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(400);
    check("掉落表进表单而不是只读预览",
      await ev(`document.getElementById("editor").innerText.includes("掉落表设置")`));
    /* 数字写成 '2' 会被服务端当字符串读，必须是裸数字 */
    check("件数保持数字类型（没被加引号）",
      await ev(`document.getElementById("yamlOut").innerText.includes("TotalItems: 2")
        && !document.getElementById("yamlOut").innerText.includes("TotalItems: '2'")`),
      await ev(`document.getElementById("yamlOut").innerText.match(/TotalItems[^\\n]*/)`));
    check("命令行掉落的花括号参数没丢",
      await ev(`document.getElementById("yamlOut").innerText.indexOf('cmd{cmd="crate give <trigger.name> RewardCrate 1"} 1 0.2') >= 0`),
      await ev(`document.getElementById("yamlOut").innerText.match(/cmd[^\\n]*/)`));
  }

  /* ---------- 0.7.0：spec 引擎带来的新配置类型 ---------- */

  const spawnFile = scan.files.find(f => f.rel.replace(/\\/g, "/") === "Spawners/boss_spawner.yml");
  const pinFile = scan.files.find(f => f.rel.replace(/\\/g, "/") === "pins.yml");

  if (!spawnFile || !pinFile) {
    check("夹具里有刷怪点和 pins", false, JSON.stringify(scan.files.map(f => f.rel)));
  } else {
    /* 刷怪点：wrap 模式，顶层 key 是文件名，字段缩进在里面 */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: spawnFile.path, name: spawnFile.name, kind: "spawner", rel: spawnFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(400);
    check("刷怪点进表单而不是只读预览",
      await ev(`document.querySelectorAll("#editor .card").length > 1
        && !document.getElementById("editor").innerText.includes("只读预览")`));
    check("刷怪点读数正确",
      await ev(`document.getElementById("yamlOut").innerText.includes("MobName: SkeletalKnight")
        && document.getElementById("yamlOut").innerText.includes("MobLevel: 5")`),
      await ev(`document.getElementById("yamlOut").innerText.slice(0, 200)`));
    /* 顶层 key 必须是文件里原来的 BossSpawner，不能被改成文件名 */
    check("刷怪点顶层 key 用的是原来的 ID",
      await ev(`/^BossSpawner:\\s*$/m.test(document.getElementById("yamlOut").innerText)`),
      await ev(`document.getElementById("yamlOut").innerText.split("\\n")[0]`));
    check("刷怪点里不认识的字段原样留着",
      await ev(`document.getElementById("yamlOut").innerText.includes("UnknownSpawnerKey: keep-me")`));
    /* 直接改字段，YAML 要跟着变；数字不能被引号包住 */
    await ev(`(() => { MM_STATE.current().data.fields.MobsPerSpawn = "7"; MM_APP.refresh(true); return true; })()`);
    await sleep(300);
    check("刷怪点字段改了 YAML 跟着变",
      await ev(`document.getElementById("yamlOut").innerText.includes("MobsPerSpawn: 7")
        && !document.getElementById("yamlOut").innerText.includes("MobsPerSpawn: '7'")`),
      await ev(`document.getElementById("yamlOut").innerText.match(/MobsPerSpawn[^\\n]*/)`));

    /* pins：list 模式，整文件是列表，每行开头要有 "- " */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: pinFile.path, name: pinFile.name, kind: "pin", rel: pinFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(400);
    check("pins 进表单",
      await ev(`document.querySelectorAll("#editor .card").length >= 1`));
    check("pins 是列表形态（行首带 -）",
      await ev(`/^-\\s+name:/m.test(document.getElementById("yamlOut").innerText)`),
      await ev(`document.getElementById("yamlOut").innerText.split("\\n").slice(0, 3).join(" | ")`));

    /* 内容包：flat 模式，整文件没有包裹 key，字段直接顶格写 */
    await ev(`MM_APP.new("pack"); true`);
    await sleep(400);
    await ev(`(() => { MM_STATE.current().data.fields.Name = "MyPack"; MM_APP.refresh(true); return true; })()`);
    await sleep(300);
    check("内容包是 flat 形态（字段顶格，没有包裹 key）",
      await ev(`(() => {
        const t = document.getElementById("yamlOut").innerText.trim().split("\\n");
        return t[0] === "Name: MyPack" && !/^my_pack:/m.test(t.join("\\n"));
      })()`),
      await ev(`document.getElementById("yamlOut").innerText.split("\\n").slice(0, 3).join(" | ")`));

    /* 怪物扩展字段：0.7.0 补齐的等级 / 外观 / 模块卡片 */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: mob.path, name: mob.name, kind: "mob", rel: mob.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(400);
    check("怪物有「等级 / 外观 / 模块」卡片", await ev(`[...document.querySelectorAll("#editor .card")]
      .some(c => c.textContent.indexOf("等级 / 外观 / 模块") >= 0)`));
    await ev(`(() => { MM_STATE.current().data.extra.Level = "3to7"; MM_APP.refresh(true); return true; })()`);
    await sleep(300);
    check("等级写进怪物 YAML",
      await ev(`document.getElementById("yamlOut").innerText.includes("Level: 3to7")`),
      await ev(`document.getElementById("yamlOut").innerText.match(/Level[^\\n]*/)`));
  }

  /* ---------- 0.8.0：易用性三件套 ---------- */

  const multiFile = scan.files.find(f => f.rel.replace(/\\/g, "/") === "Mobs/multi_mobs.yml");

  if (!multiFile) {
    check("夹具里有多条目怪物文件", false, JSON.stringify(scan.files.map(f => f.rel)));
  } else {
    /* 多条目切换：一个文件 skeleton_king + zombie_horde */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: multiFile.path, name: multiFile.name, kind: "mob", rel: multiFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(400);
    check("多条目文件显示切换条",
      await ev(`document.querySelectorAll("#editor .entry-tabs .et-tab").length === 2`),
      await ev(`String(document.querySelectorAll("#editor .entry-tabs .et-tab").length)`));
    check("默认编辑第一个条目", await ev(`MM_STATE.current().key === "skeleton_king"`));
    await ev(`(() => {
      [...document.querySelectorAll("#editor .entry-tabs .et-tab")]
        .find(b => b.textContent === "zombie_horde").click();
      return true;
    })()`);
    await sleep(500);
    check("点第二个条目切过去", await ev(`MM_STATE.current().key === "zombie_horde"`),
      await ev(`MM_STATE.current().key`));
    check("第二个条目的血量读进来了", await ev(`MM_STATE.current().data.health === 20`));
    check("切换后整份文件两个条目都在",
      await ev(`(() => {
        const y = MM_YAML.generate(MM_STATE.current());
        return y.includes("skeleton_king:") && y.includes("Health: 500")
          && y.includes("MovementSpeed: 0.3");
      })()`),
      await ev(`MM_YAML.generate(MM_STATE.current())`));

    /* 重新读取：改血量 → 不保存 → ↻ → 回到磁盘上的值 */
    await ev(`(() => { MM_STATE.current().data.health = 777; MM_APP.refresh(true); return true; })()`);
    await sleep(300);
    await ev(`window.confirm = () => true;
      [...document.querySelectorAll("#editor .card-head .mini-btn")]
        .find(b => b.textContent.includes("重新读取")).click(); true`);
    await sleep(600);
    check("重新读取后丢掉本地改动", await ev(`MM_STATE.current().data.health === 20`),
      await ev(`String(MM_STATE.current().data.health)`));
  }

  /* 引用跳转：ai_guard.yml 引用了存在的 boss_phase2 与不存在的 GuardTaunt */
  if (aiFile) {
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: aiFile.path, name: aiFile.name, kind: "mob", rel: aiFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(400);
    check("不存在的引用有「新建技能组」按钮",
      await ev(`[...document.querySelectorAll("#yamlWarn .mini-btn")]
        .some(b => b.textContent === "新建技能组")`));
    check("存在的引用显示为可点按钮",
      await ev(`[...document.querySelectorAll("#yamlWarn .ref-link")]
        .some(b => b.textContent === "boss_phase2")`));
    await ev(`(() => {
      [...document.querySelectorAll("#yamlWarn .ref-link")]
        .find(b => b.textContent === "boss_phase2").click();
      return true;
    })()`);
    await sleep(600);
    check("点引用直接跳进那个技能组", await ev(`MM_STATE.current().kind === "skill"
      && MM_STATE.current().key === "boss_phase2"`),
      await ev(`MM_STATE.current().kind + ":" + MM_STATE.current().key`));
  }

  /* 外部改动检测：外部改文件 → 重扫 → 文件列表标「已改动」→ 打开后重新读取拿到新值 */
  const mobPath = mob.path;
  const origMob = await ev(`MM_HOST.read(${JSON.stringify(mobPath)})`).then(r => r.text);
  try {
    fs.writeFileSync(mobPath, origMob.replace(/Health:\s*500/, "Health: 999"));
    await ev(`MM_HOST_OPEN_DIR(${JSON.stringify(FIXTURE)}); true`);
    await sleep(500);
    check("外部改过的文件标「已改动」",
      await ev(`[...document.querySelectorAll("#serverFiles .file-item.dirty .file-size")]
        .some(x => x.textContent.includes("已改动"))`));
    await ev(`(() => {
      const item = [...document.querySelectorAll("#serverFiles .file-item.dirty")]
        .find(x => x.textContent.includes("skeleton_king"));
      item.click(); return true;
    })()`);
    await sleep(500);
    await ev(`window.confirm = () => true;
      [...document.querySelectorAll("#editor .card-head .mini-btn")]
        .find(b => b.textContent.includes("重新读取")).click(); true`);
    await sleep(600);
    check("重新读取拿到磁盘上的新血量", await ev(`MM_STATE.current().data.health === 999`),
      await ev(`String(MM_STATE.current().data.health)`));
  } finally {
    fs.writeFileSync(mobPath, origMob);
  }

  /* ---------- 0.11.0：引用影响面板 + 改名联动 ---------- */

  const skillRefFile = scan.files.find(f => f.rel.replace(/\\/g, "/") === "Skills/boss_phase2.yml");
  const guardOrig = aiFile ? (await ev(`MM_HOST.read(${JSON.stringify(aiFile.path)})`)).text : "";

  if (!skillRefFile || !aiFile) {
    check("夹具里有技能组与 AI 怪物", false, JSON.stringify(scan.files.map(f => f.rel)));
  } else {
    /* 反向引用：boss_phase2 被 ai_guard 的 skill{s=boss_phase2} 引用 */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: skillRefFile.path, name: skillRefFile.name, kind: "skill", rel: skillRefFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(700);
    check("扫出引用者 ai_guard", await ev(`(() => {
      const card = [...document.querySelectorAll("#editor .card")]
        .find(c => c.textContent.indexOf("引用影响") >= 0);
      return card && card.textContent.includes("ai_guard.yml");
    })()`),
      await ev(`(() => {
        const card = [...document.querySelectorAll("#editor .card")]
          .find(c => c.textContent.indexOf("引用影响") >= 0);
        return card ? card.textContent.slice(0, 120) : "无卡片";
      })()`));

    /* 掉落表的反向引用：boss_loot 被 ai_guard 的 table:boss_loot 引用 */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: lootFile.path, name: lootFile.name, kind: "droptable", rel: lootFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(700);
    check("掉落表也扫出引用者", await ev(`(() => {
      const card = [...document.querySelectorAll("#editor .card")]
        .find(c => c.textContent.indexOf("引用影响") >= 0);
      return card && card.textContent.includes("ai_guard.yml");
    })()`));

    /* 改名联动：技能组 ID 改成 boss_phase3 → 确认 → ai_guard.yml 里的引用一起变 */
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: skillRefFile.path, name: skillRefFile.name, kind: "skill", rel: skillRefFile.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(700);
    await ev(`(() => {
      window.confirm = () => true;
      const card = [...document.querySelectorAll("#editor .card")]
        .find(c => c.querySelector("label") && c.querySelector("label").textContent === "ID");
      const inp = card.querySelector("input");
      inp.focus();
      inp.value = "boss_phase3";
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`);
    await sleep(900);
    const guardNow = (await ev(`MM_HOST.read(${JSON.stringify(aiFile.path)})`)).text;
    check("改名联动更新了引用文件", /skill\{s=boss_phase3\}/.test(guardNow), guardNow.match(/Skills:[\s\S]{0,90}/));
    /* 当前项目的 YAML 顶层 ID 也是新名 */
    check("项目 ID 已是新名", await ev(`MM_STATE.current().key === "boss_phase3"`));
  }

  /* 还原 ai_guard.yml（改名联动测试改写了它） */
  if (aiFile && guardOrig) fs.writeFileSync(aiFile.path, guardOrig);

  /* ---------- 0.14.0：服务器文件内容搜索 ---------- */

  const skelHits = await ev(`MM_HOST_SEARCH_FILES("SKELETON")`);
  check("文件内容搜索命中 skeleton_king", Array.isArray(skelHits)
    && skelHits.some(h => h.rel.replace(/\\/g, "/").includes("skeleton_king")
      && /Type:\s*SKELETON/.test(h.snippet)),
    JSON.stringify((skelHits || []).slice(0, 2)));
  check("搜索带行号与摘要", Array.isArray(skelHits) && skelHits.length
    && skelHits.every(h => h.line >= 1 && typeof h.snippet === "string"));
  /* 命中文件能直接打开进表单 */
  const firstHit = (skelHits || []).find(h => h.rel.replace(/\\/g, "/").includes("skeleton_king"));
  if (firstHit) {
    await ev(`MM_HOST_OPEN_FILE(${JSON.stringify({
      path: firstHit.path, name: firstHit.name, kind: firstHit.kind, rel: firstHit.rel, size: 0, mtime: 0
    })}); true`);
    await sleep(500);
    check("搜索结果点开进表单", await ev(`MM_STATE.current().key === "skeleton_king"`));
  }

  /* ---------- 0.15.0：引用关系图数据 ---------- */

  const graph = await ev(`MM_HOST_BUILD_GRAPH()`);
  const gp = typeof graph === "string" ? JSON.parse(graph) : graph;
  check("图数据抽出技能边", Array.isArray(gp.edges)
    && gp.edges.some(e => {
      const to = gp.nodes.find(n => n.id === e.to);
      return e.kind === "skill" && to && to.name.indexOf("boss_phase2") === 0;
    }),
    JSON.stringify(gp.edges));
  check("图数据抽掉落表边（token 消歧）", Array.isArray(gp.edges)
    && gp.edges.some(e => {
      const to = gp.nodes.find(n => n.id === e.to);
      return e.kind === "table" && to && to.name.indexOf("boss_loot") === 0;
    }));
  check("孤立文件不进图并计数", Array.isArray(gp.nodes)
    && gp.nodes.every(n => gp.edges.some(e => e.from === n.id || e.to === n.id))
    && gp.skipped >= 1);

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
