// 导入映射单测：yml → 表单模型 → 重新生成 → 再解析，检查字段没丢
// 用法: node tools/test_import.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* 浏览器里的模块都挂在 window 上，这里造一个最小 shim */
const win = {};
globalThis.window = win;
for (const f of ["app/js/data.js", "app/js/options-data.js", "app/js/extras-data.js", "app/js/spec-data.js", "app/js/spec.js", "app/js/yaml.js", "app/js/state.js", "app/js/import.js"]) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  (0, eval)(src);
  Object.assign(globalThis, win);
}

const { MM_IMPORT, MM_YAML, MM_STATE } = globalThis;

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + "\n      实际 " + a + "\n      期望 " + b); }
}
function ok(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + "  " + extra); }
}
function readYml(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function importMob(text, filePath = "x.yml") {
  const p = MM_STATE.newMob();
  const r = MM_IMPORT.fill(p, { js: parse(text), text, filePath });
  return { p, r };
}

console.log("\n[1] 怪物夹具：字段映射");
{
  const text = readYml("tests/fixture-server/Mobs/skeleton_king.yml");
  const { p, r } = importMob(text, "tests/fixture-server/Mobs/skeleton_king.yml");
  ok("导入成功", r.ok, r.reason);
  eq("ID", p.key, "skeleton_king");
  eq("生物类型", p.data.type, "SKELETON");
  eq("显示名", p.data.display, "&6&l骷髅王");
  eq("生命", p.data.health, 500);
  eq("伤害", p.data.damage, 15);
  eq("护甲", p.data.armor, 8);
  eq("Options 命中表单", p.data.options.PreventSunburn, true);
  eq("装备槽位识别", p.data.equipment[0], { item: "diamond_helmet", slot: "HEAD" });
  eq("装备第二件", p.data.equipment[1], { item: "diamond_sword", slot: "HAND" });
  eq("掉落解析", p.data.drops[0], { item: "diamond", amount: "2-4", chance: "1" });
  ok("skill{} 这种写法保留为原始行", !!p.data.skills[0].raw, JSON.stringify(p.data.skills[0]));
  eq("文件路径记住", p.filePath, "tests/fixture-server/Mobs/skeleton_king.yml");
}

console.log("\n[2] 怪物夹具：改血量后回写，其他字段不丢");
{
  const text = readYml("tests/fixture-server/Mobs/skeleton_king.yml");
  const { p } = importMob(text);
  const before = parse(text).skeleton_king;
  p.data.health = 800;
  const out = MM_YAML.generate(p);
  const after = parse(out).skeleton_king;
  eq("血量已改", after.Health, 800);
  eq("类型没丢", after.Type, before.Type);
  eq("显示名没丢", after.Display, before.Display);
  eq("伤害没丢", after.Damage, before.Damage);
  eq("护甲没丢", after.Armor, before.Armor);
  eq("Options 没丢", after.Options, before.Options);
  eq("装备没丢", after.Equipment, before.Equipment);
  eq("掉落没丢", after.Drops, before.Drops);
  eq("原始技能行没丢", after.Skills, before.Skills);
}

console.log("\n[3] 未识别块 / 未知 Option / 多条目 / 行内条件");
{
  const text = [
    "# 车队配置文件",
    "skeleton_king:",
    "  Type: SKELETON",
    "  Health: 500",
    "  Options:",
    "    PreventSunburn: true",
    "    SomeUnknownOption: 5",
    "  AIGoalSelectors:",
    "  - clear",
    "  - meleeattack",
    "  AITargetSelectors:",
    "  - clear",
    "  - players",
    "  DamageModifiers:",
    "  - ENTITY_ATTACK 0.5",
    "  Skills:",
    "  - skill{s=KingSlam} @Target ~onAttack",
    "  - message{m=\"血量过半\"} @PIR{r=30} ~onDamaged ?health{h=<0.5}",
    "other_mob:",
    "  Type: ZOMBIE",
    "  Health: 10",
    ""
  ].join("\n");
  const { p, r } = importMob(text);
  ok("导入成功", r.ok, r.reason);
  ok("多条目给出提示", r.warnings.some(w => w.includes("2 个条目")), JSON.stringify(r.warnings));
  eq("未知 Option 进保留区", p.raw.options, { SomeUnknownOption: 5 });
  /* 0.6.0 起 AI 与伤害修正都进了表单，不再整块原样保留 */
  eq("AIGoalSelectors 进表单", p.data.aiGoals.map(g => g.goal), ["clear", "meleeattack"]);
  eq("AITargetSelectors 进表单", p.data.aiTargets.map(t => t.target), ["clear", "players"]);
  eq("DamageModifiers 进表单", p.data.damageModifiers, [{ type: "ENTITY_ATTACK", value: "0.5" }]);
  eq("AI 不再进保留区", p.raw.entry.join("\n").includes("AIGoalSelectors"), false);
  eq("伤害修正不再进保留区", p.raw.entry.join("\n").includes("DamageModifiers"), false);
  ok("第二个条目整块保留", p.raw.others.join("\n").includes("other_mob:"), JSON.stringify(p.raw.others));
  ok("头部注释保留", p.raw.head.join("\n").includes("车队配置文件"));
  ok("含行内条件的技能保留为原始行", !!p.data.skills[1].raw, JSON.stringify(p.data.skills[1]));

  p.data.health = 800;
  const out = MM_YAML.generate(p);
  const doc = parse(out);
  eq("血量已改", doc.skeleton_king.Health, 800);
  eq("AIGoalSelectors 写回正确", doc.skeleton_king.AIGoalSelectors, ["clear", "meleeattack"]);
  eq("AITargetSelectors 写回正确", doc.skeleton_king.AITargetSelectors, ["clear", "players"]);
  eq("DamageModifiers 写回正确", doc.skeleton_king.DamageModifiers, ["ENTITY_ATTACK 0.5"]);
  eq("未知 Option 写回正确", doc.skeleton_king.Options.SomeUnknownOption, 5);
  eq("已知 Option 写回正确", doc.skeleton_king.Options.PreventSunburn, true);
  eq("另一个怪物还在", doc.other_mob, { Type: "ZOMBIE", Health: 10 });
  eq("技能行数不变", doc.skeleton_king.Skills.length, 2);
  eq("条件技能原文不变", doc.skeleton_king.Skills[1], 'message{m="血量过半"} @PIR{r=30} ~onDamaged ?health{h=<0.5}');
  ok("注释仍在开头", out.startsWith("# 车队配置文件"), out.slice(0, 20));
}

console.log("\n[4] 物品夹具：映射与回写");
{
  const text = readYml("tests/fixture-server/Items/flame_sword.yml");
  const p = MM_STATE.newItem();
  const r = MM_IMPORT.fill(p, { js: parse(text), text, filePath: "Items/flame_sword.yml" });
  ok("导入成功", r.ok, r.reason);
  eq("材质", p.data.material, "diamond_sword");
  eq("显示名", p.data.display, "&c烈焰之剑");
  eq("描述", p.data.lore, ["&7燃烧着不灭的火焰"]);
  eq("附魔", p.data.enchants, [{ name: "FIRE_ASPECT", level: 2 }]);
  eq("属性", p.data.attributes, [{ slot: "MainHand", name: "ATTACK_DAMAGE", value: "9", op: "ADD" }]);

  p.data.display = "&c烈焰之剑 II";
  const doc = parse(MM_YAML.generate(p)).flame_sword;
  eq("改显示名生效", doc.Display, "&c烈焰之剑 II");
  eq("材质没丢", doc.Id, "diamond_sword");
  eq("附魔没丢", doc.Enchantments, ["FIRE_ASPECT 2"]);
  eq("属性没丢", doc.Attributes, { MainHand: { ATTACK_DAMAGE: "9 ADD" } });
}

console.log("\n[5] 边界");
{
  const { p, r } = importMob("not_a_mob: 123\n");
  ok("顶层不是对象时拒绝导入", !r.ok, JSON.stringify(r));
  eq("拒绝时不污染项目", p.key, "");
  const r2 = MM_IMPORT.fill(MM_STATE.newMob(), { js: null, text: "", filePath: "x" });
  ok("空内容拒绝导入", !r2.ok);
}

console.log("\n[6] 多条目切换（0.8.0）");
{
  /* switchEntry 需要解析器；单测里用 yaml 库假扮 MM_HOST.parseText，
     Electron 里这条路走的是主进程 fs:parseText，行为一致 */
  win.MM_HOST = { parseText: async (t) => ({ text: t, js: parse(t), errors: [] }) };
  globalThis.MM_HOST = win.MM_HOST;

  const text = [
    "skeleton_king:",
    "  Type: SKELETON",
    "  Health: 500",
    "  Display: '&6&l骷髅王'",
    "zombie_horde:",
    "  Type: ZOMBIE",
    "  Health: 20",
    "  Options:",
    "    MovementSpeed: 0.3"
  ].join("\n");
  const { p } = importMob(text, "Mobs/two_mobs.yml");
  eq("导入只吃第一个条目", p.key, "skeleton_king");
  eq("条目清单", MM_IMPORT.entryKeys(p), ["zombie_horde"]);

  const sw = await MM_IMPORT.switchEntry(p, 0);
  ok("切换成功", sw.ok, JSON.stringify(sw));
  eq("切到第二个条目", p.key, "zombie_horde");
  eq("第二个条目的类型", p.data.type, "ZOMBIE");
  eq("第二个条目的血量", p.data.health, 20);
  eq("旧条目进 others", MM_IMPORT.entryKeys(p), ["skeleton_king"]);

  /* 切换后整体生成：两个条目都在，原字段没丢 */
  const full = MM_YAML.generate(p);
  ok("旧条目没丢", full.includes("skeleton_king:") && full.includes("Health: 500"), full);
  ok("新条目在当前位", /^zombie_horde:/m.test(full), full);
  ok("陌生 Option 原样保留", full.includes("MovementSpeed: 0.3"), full);

  /* 再切回去，往返一轮 */
  const back = await MM_IMPORT.switchEntry(p, 0);
  ok("切回第一个条目", back.ok && p.key === "skeleton_king", JSON.stringify(back));
  eq("血量读回来了", p.data.health, 500);
  ok("显示名没丢", MM_YAML.generate(p).includes("Display: '&6&l骷髅王'"));

  /* pins（listFile）形态：others 里是 - name: 块 */
  const pinText = [
    "- name: boss_arena",
    "  location: world,100,64,-20",
    "  radius: 12",
    "- name: tutorial_start",
    "  location: world,0,64,0",
    "  radius: 5"
  ].join("\n");
  const pp = MM_STATE.newSpecProject("pin");
  const pr = MM_IMPORT.fillSpec(pp, { js: parse(pinText), text: pinText });
  ok("pins 多项导入成功", pr.ok, JSON.stringify(pr));
  eq("pins 条目清单", MM_IMPORT.entryKeys(pp), ["tutorial_start"]);
  const sw2 = await MM_IMPORT.switchEntry(pp, 0);
  ok("pins 切换成功", sw2.ok, JSON.stringify(sw2));
  eq("pins 切到第二项", pp.key, "tutorial_start");
  eq("第二项的半径", pp.data.fields.radius, 5);
  const pinOut = MM_YAML.generate(pp);
  ok("pins 切换后整份输出仍两行 name 都在",
    (pinOut.match(/^- name:/gm) || []).length === 2, pinOut);

  /* 越界与空块 */
  const bad = await MM_IMPORT.switchEntry(p, 99);
  ok("越界拒绝", !bad.ok);
  win.MM_HOST = undefined; globalThis.MM_HOST = undefined;
  const noHost = await MM_IMPORT.switchEntry(p, 0);
  ok("没有解析器时拒绝（纯浏览器）", !noHost.ok);
}

console.log("\n" + (fail ? "✗ " : "") + pass + " 通过, " + fail + " 失败\n");
process.exit(fail ? 1 : 0);
