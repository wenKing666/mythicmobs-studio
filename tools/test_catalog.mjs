/* 全量目录测试：302 机制 / 196 条件 / 通用修饰 / 导入回解析 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra === undefined ? "" : "  → " + JSON.stringify(extra))); }
}
function eq(name, got, want) {
  ok(name, got === want, got === want ? undefined : { got, want });
}

/* 用一个 window 充当全局，模拟浏览器加载顺序 */
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); }
load("app/js/data.js");
load("app/js/catalog.js");
load("app/js/extras-data.js");
load("app/js/yaml.js");
load("app/js/import.js");

const CAT = ctx.MM_CATALOG;
const Y = ctx.MM_YAML;
const IMP = ctx.MM_IMPORT || ctx.MM_YAML_IMPORT || null;

function mob(skills) {
  return {
    kind: "mob", key: "t", id: "x",
    data: {
      type: "ZOMBIE", display: "", health: 20, damage: 0, armor: 0,
      options: {}, bossbar: {}, equipment: [], drops: [], skills
    }
  };
}

console.log("\n[1] 目录规模");
eq("机制 302", CAT.mechanics.length, 302);
eq("条件 196", CAT.conditions.length, 196);
eq("目标器 91", CAT.targeters.length, 91);
eq("触发器 38", CAT.triggers.length, 38);
eq("粒子 120", CAT.particles.length, 120);
eq("通用属性 14", CAT.universal.length, 14);
ok("机制全部有中文名", CAT.mechanics.every(m => m.zh && m.zh !== m.id));
ok("条件全部有中文名", CAT.conditions.every(m => m.zh && m.zh !== m.id));
ok("目标器全部有中文名", CAT.targeters.every(m => m.zh && m.zh !== m.id));
ok("触发器全部有中文名", CAT.triggers.every(m => m.zh && m.zh !== m.id));
ok("通用属性全部有中文名", CAT.universal.every(u => u.zh));
ok("参数全部有中文名", CAT.mechanics.every(m => m.params.every(p => p.zh)));
ok("条件/目标器的参数也有中文名", CAT.conditions.concat(CAT.targeters).every(m => (m.params || []).every(p => p.zh)));
/* wiki 的部分页面有「Non-Inheritable」+「Inheritable」两张属性表，早期只读第一张，
   Damage 就只剩 amount，ignoreArmor / damagecause 全丢。这条盯住别回退。 */
ok("两张属性表都读进来（damage.ignoreArmor / projectile.BulletType）", (() => {
  const d = CAT.mechanics.filter(m => m.id === "damage")[0];
  const p = CAT.mechanics.filter(m => m.id === "projectile")[0];
  return d.params.some(x => x.name === "ignoreArmor")
    && d.params.some(x => x.name === "damagecause")
    && p.params.some(x => x.name === "BulletType");
})(), CAT.mechanics.filter(m => m.id === "damage")[0].params.map(p => p.name).join(","));
ok("机制全部有分组", CAT.mechanics.every(m => m.group && m.group !== "misc"));

console.log("\n[2] 必填推断");
{
  const part = CAT.mechanics.filter(m => m.id === "particle")[0];
  const mob = part.params.filter(p => p.name === "mob")[0];
  ok("default 留空不算必填（particle.mob）", mob.required === false, mob);
  const msg = CAT.mechanics.filter(m => m.id === "message")[0];
  const m2 = msg.params.filter(p => p.name === "message")[0];
  ok("default=NONE 哨兵仍算必填（message.message）", m2.required === true, m2);
  const req = CAT.mechanics.reduce((n, m) => n + m.params.filter(p => p.required).length, 0);
  ok("必填参数不过度膨胀（≤ 30 个）", req <= 30, req);
}

console.log("\n[3] 行内条件");
{
  const y = Y.mob(mob([
    { trigger: "onDamaged", mechanic: "damage", targeter: "target", params: { amount: "10" },
      conditions: [{ id: "healthpercent", params: { percent: "<50%" } }] }
  ]));
  ok("百分比条件用 healthpercent{p}", y.includes('damage{amount=10} @target ?healthpercent{p=<50%} ~onDamaged'), y.split("\n").filter(l => l.includes("damage")));
}
{
  const y = Y.mob(mob([
    { trigger: "onSpawn", mechanic: "message", targeter: "self", params: { message: "hi" },
      conditions: [{ id: "day", params: {} }, { id: "chance", params: { chance: "0.3" } }] }
  ]));
  ok("无参数条件不带花括号", y.includes("?day") && !y.includes("?day{"), y);
  ok("两个条件并列", y.includes("?day ?chance{c=0.3}"), y);
}

console.log("\n[4] 通用修饰");
{
  const y = Y.mob(mob([
    { trigger: "onAttack", mechanic: "damage", targeter: "target", params: { amount: "5" },
      universal: { cooldown: "5", delay: "10", repeat: "3" } }
  ]));
  ok("冷却/延迟/重复写进花括号", /damage\{amount=5;cooldown=5;delay=10;repeat=3\}/.test(y), y);
}
{
  const y = Y.mob(mob([
    { trigger: "onAttack", mechanic: "damage", targeter: "target", params: { amount: "5" },
      universal: { cooldown: "0.5", origin: "@Forward{f=10}", faulty: "false", forcesync: "true" } }
  ]));
  ok("布尔型通用修饰也写", /faulty=false/.test(y) && /forcesync=true/.test(y), y);
  ok("起点目标器带花括号时加引号", y.includes('origin="@Forward{f=10}"'), y);
}

console.log("\n[5] 目标器参数");
{
  const y = Y.mob(mob([
    { trigger: "onSpawn", mechanic: "message", targeter: "playersinradius",
      targetParams: { radius: "30" }, params: { message: "hi" } }
  ]));
  ok("半径写成 @PlayersInRadius{r=30}", y.includes("@PlayersInRadius{r=30}"), y);
}

console.log("\n[6] 值里的空格要加引号");
{
  const y = Y.mob(mob([
    { trigger: "onSpawn", mechanic: "message", targeter: "self", params: { message: "骷髅王 降临" } }
  ]));
  ok("含空格的参数值被引号包住", y.includes('message="骷髅王 降临"'), y);
}

console.log("\n[7] 全量机制逐个生成");
{
  let bad = [];
  CAT.mechanics.forEach(m => {
    try {
      const params = {};
      m.params.forEach(p => { if (p.def !== "") params[p.name] = p.def; });
      const y = Y.mob(mob([{ trigger: "onSpawn", mechanic: m.id, targeter: "self", params }]));
      if (!y.includes(m.id + "{") && !y.includes(m.id + " ")) bad.push([m.id, "未生成"]);
      if (/undefined|null/.test(y)) bad.push([m.id, "含 undefined"]);
    } catch (e) {
      bad.push([m.id, e.message]);
    }
  });
  ok("302 个机制全部可生成", bad.length === 0, bad.slice(0, 6));
}

console.log("\n[8] 全量条件逐个生成");
{
  let bad = [];
  CAT.conditions.forEach(c => {
    try {
      const y = Y.mob(mob([
        { trigger: "onSpawn", mechanic: "message", targeter: "self", params: { message: "x" },
          conditions: [{ id: c.id, params: {} }] }
      ]));
      if (!y.includes("?" + c.id)) bad.push(c.id);
    } catch (e) { bad.push([c.id, e.message]); }
  });
  ok("196 个条件全部可生成", bad.length === 0, bad.slice(0, 6));
}

console.log("\n[9] 全量目标器逐个生成");
{
  let bad = [];
  CAT.targeters.forEach(t => {
    try {
      const y = Y.mob(mob([
        { trigger: "onSpawn", mechanic: "message", targeter: t.id, params: { message: "x" } }
      ]));
      if (t.id !== "self" && !/@/.test(y)) bad.push(t.id);
    } catch (e) { bad.push([t.id, e.message]); }
  });
  ok("91 个目标器全部可生成", bad.length === 0, bad.slice(0, 6));
}

console.log("\n[10] 导入回解析");
if (IMP && typeof IMP.parseSkill === "function") {
  const r = IMP.parseSkill('- damage{amount=10;cooldown=5} @Target ?healthpercent{p=<50%} ~onDamaged');
  ok("解析出机制", r.mechanic === "damage", r);
  ok("解析出参数", r.params && r.params.amount === 10, r && r.params);
  ok("解析出通用修饰", r.universal && r.universal.cooldown === "5", r && r.universal);
  ok("解析出目标器", r.targeter === "target", r && r.targeter);
  ok("解析出条件", r.conditions && r.conditions[0] && r.conditions[0].id === "healthpercent", r && r.conditions);
  ok("条件参数按正式名归一（p → percent）", !!(r.conditions && r.conditions[0]) && r.conditions[0].params.percent === "<50%", r && r.conditions);

  const r2 = IMP.parseSkill('- throw{velocity=2} @target ?day ~onSpawn');
  ok("抛飞/白天条件也能解析", r2.mechanic === "throw" && r2.conditions[0].id === "day", r2);

  const r3 = IMP.parseSkill('- sendtitle{title="&cBOSS";subtitle="来了"} @PlayersInRadius{r=20} ~onSpawn');
  ok("带引号参数不被拆坏", r3.params && r3.params.title === "&cBOSS", r3 && (r3.params || r3));

  const r4 = IMP.parseSkill('- damage{amount=10;cd=5;faulty=false} @Target ~onDamaged');
  ok("cd 别名归一成 cooldown", r4.universal && r4.universal.cooldown === "5", r4 && r4.universal);
  ok("布尔型通用修饰也归到 universal", r4.universal && r4.universal.faulty === "false", r4 && r4.universal);
} else {
  console.log("  （跳过：导入模块没暴露 parseSkill）");
}

console.log("\n[10] 版本号");
/* 以前 index.html 与 host.js 各写死一个 "0.2"，发到 0.5.0 界面还显示 0.2。
   现在 Electron 里取 app.getVersion()，浏览器模式的兜底文本必须与 package.json 对齐。 */
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const html = fs.readFileSync(path.join(ROOT, "app/index.html"), "utf8");
  const host = fs.readFileSync(path.join(ROOT, "app/js/host.js"), "utf8");
  const m = /id="appVer"[^>]*>([^<]*)</.exec(html);
  eq("index.html 的版本兜底与 package.json 一致", m && m[1].trim(), pkg.version);
  ok("host.js 版本取自 app.getVersion()", /i\.version/.test(host));
}

console.log("\n" + pass + " 通过, " + fail + " 失败");
process.exit(fail ? 1 : 0);
