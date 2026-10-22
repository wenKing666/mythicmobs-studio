// AI 选择器 / 伤害修正 / 掉落体系 / 物品组件：node tools/test_ai.mjs
// 覆盖 0.6.0 新增的四块：AIGoalSelectors、AITargetSelectors、DamageModifiers、
// Drops 的三种形态与 DropTables、物品 1.20.5+ 组件与 17 项 Options。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const win = {};
globalThis.window = win;
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ["app/js/data.js", "app/js/options-data.js", "app/js/catalog.js",
  "app/js/extras-data.js", "app/js/yaml.js", "app/js/state.js", "app/js/import.js"]) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  (0, eval)(src);
  Object.assign(globalThis, win);
}

const { MM_IMPORT, MM_YAML, MM_STATE, MM_CATALOG, MM_EXTRAS } = globalThis;

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

function mobG(extra) {
  const p = MM_STATE.newMob();
  p.key = "t_mob";
  Object.assign(p.data, extra || {});
  return p;
}

console.log("\n[1] 数据：AI 选择器全量入目录");
eq("AI 行为 51 项 + clear", MM_CATALOG.aiGoals.length, 52);
eq("AI 目标 14 项 + clear", MM_CATALOG.aiTargets.length, 15);
ok("AI 行为全部有中文名", MM_CATALOG.aiGoals.every(g => g.zh && g.zh !== g.id),
  MM_CATALOG.aiGoals.filter(g => !g.zh).map(g => g.id));
ok("AI 目标全部有中文名", MM_CATALOG.aiTargets.every(g => g.zh && g.zh !== g.id));
ok("AI 参数全部有中文名",
  MM_CATALOG.aiGoals.concat(MM_CATALOG.aiTargets).every(g => (g.params || []).every(p => p.zh)));
ok("AI 分组已注册", MM_CATALOG.groups.some(g => g.id === "ai-attack" && g.title === "攻击与战斗"));
eq("clear 排在最前", MM_CATALOG.aiGoals[0].id, "clear");
ok("meleeattack 有参数", MM_CATALOG.aiGoals.find(g => g.id === "meleeattack").params.length === 2);

console.log("\n[2] 生成：AIGoalSelectors（不带数字时保持不带数字）");
{
  const p = mobG({
    aiGoals: [{ goal: "clear" }, { goal: "meleeattack", params: { speedmodifier: "1.2" } }],
    aiTargets: [{ target: "clear" }, { target: "players" }]
  });
  const doc = parse(MM_YAML.generate(p)).t_mob;
  eq("行为选择器", doc.AIGoalSelectors, ["clear", "meleeattack{speedmodifier=1.2}"]);
  eq("目标选择器", doc.AITargetSelectors, ["clear", "players"]);
}

console.log("\n[3] 生成：原本带优先级的写法原样保留");
{
  const p = mobG({
    aiGoals: [{ goal: "clear", priority: "0" }, { goal: "randomstroll", priority: "2" }]
  });
  const doc = parse(MM_YAML.generate(p)).t_mob;
  eq("优先级数字写回", doc.AIGoalSelectors, ["0 clear", "2 randomstroll"]);
}

console.log("\n[4] 生成：AI 参数等于默认值时不写");
{
  const p = mobG({
    aiGoals: [{ goal: "lookatplayers", params: { range: "5" } }],
    aiTargets: []
  });
  const doc = parse(MM_YAML.generate(p)).t_mob;
  /* lookatplayers 的 range 默认就是 5，写出来是噪音 */
  eq("默认值被省略", doc.AIGoalSelectors, ["lookatplayers"]);
  eq("没配目标就不出这个键", doc.AITargetSelectors, undefined);
}

console.log("\n[5] 生成：DamageModifiers");
{
  const p = mobG({
    damageModifiers: [{ type: "fire", value: "0.5" }, { type: "FALL", value: "0" }]
  });
  const doc = parse(MM_YAML.generate(p)).t_mob;
  eq("伤害类型转大写", doc.DamageModifiers, ["FIRE 0.5", "FALL 0"]);
}

console.log("\n[6] 生成：掉落三种形态");
{
  const p = mobG({
    drops: [
      { item: "diamond", amount: "2-4", chance: "1" },
      { item: "leather_chestplate", params: 'name="&c皮甲";color=BLACK', amount: "1", chance: "0.5" },
      { type: "money", value: "1500", chance: "0.8" },
      { table: "boss_loot" }
    ]
  });
  const doc = parse(MM_YAML.generate(p)).t_mob;
  eq("四种掉落", doc.Drops, [
    "diamond 2-4 1",
    'leather_chestplate{name="&c皮甲";color=BLACK} 1 0.5',
    "money 1500 0.8",
    "boss_loot"
  ]);
}

console.log("\n[7] 生成：掉落表（DropTables）");
{
  const p = MM_STATE.newDropTable();
  p.key = "boss_loot";
  p.data.totalItems = "2";
  p.data.bonusLevelItems = "0.1";
  p.data.minItems = "1";
  p.data.conditions = [{ id: "healthpercent", params: { percent: ">0" } }];
  p.data.drops = [{ item: "diamond", amount: "1", chance: "1" }];
  const doc = parse(MM_YAML.generate(p)).boss_loot;
  eq("TotalItems", doc.TotalItems, 2);
  eq("MinItems", doc.MinItems, 1);
  eq("BonusLevelItems", doc.BonusLevelItems, 0.1);
  /* 掉落表里的条件不带 ? 前缀 */
  eq("条件块", doc.Conditions, ["healthpercent{p=>0}"]);
  eq("掉落", doc.Drops, ["diamond 1 1"]);
}

console.log("\n[8] 生成：物品组件");
{
  const p = MM_STATE.newItem();
  p.key = "my_apple";
  p.data.material = "apple";
  p.data.components = {
    Consumable: { params: { ConsumeSeconds: "1.5", HasParticles: "true", Animation: "DRINK" } },
    Food: { params: { Nutrition: "8", Saturation: "12" } },
    Rarity: { value: "EPIC" }
  };
  const doc = parse(MM_YAML.generate(p)).my_apple;
  eq("Consumable", doc.Consumable, { ConsumeSeconds: 1.5, HasParticles: true, Animation: "DRINK" });
  eq("Food", doc.Food, { Nutrition: 8, Saturation: 12 });
  eq("标量组件", doc.Rarity, "EPIC");
}

console.log("\n[9] 生成：物品列表型组件");
{
  const p = MM_STATE.newItem();
  p.key = "soup";
  p.data.material = "mushroom_stew";
  p.data.components = { UnsetComponents: { list: ["food", "consumable"] } };
  const doc = parse(MM_YAML.generate(p)).soup;
  eq("UnsetComponents 写成列表", doc.UnsetComponents, ["food", "consumable"]);
}

console.log("\n[10] 生成：物品 Options（17 项、默认值不写）");
{
  const p = MM_STATE.newItem();
  p.key = "sword_x";
  p.data.options.StackSize = 1;
  p.data.options.Repairable = false;
  const doc = parse(MM_YAML.generate(p)).sword_x;
  eq("非默认值才写", doc.Options, { Repairable: false, StackSize: 1 });
  eq("extras 里有 17 项选项", MM_EXTRAS.itemOptions.length, 17);
  ok("默认值 true 的选项不写", MM_STATE.newItem().data.options.Repairable === true);
}

console.log("\n[11] 导入：AI / 伤害修正进表单");
{
  const text = [
    "ai_mob:",
    "  Type: ZOMBIE",
    "  AIGoalSelectors:",
    "  - 0 clear",
    "  - 1 arrowAttack{attackradius=18;attackspeedmax=45}",
    "  - 2 lookatplayers",
    "  AITargetSelectors:",
    "  - clear",
    "  - players",
    "  DamageModifiers:",
    "  - FIRE 0.5",
    "  - ENTITY_ATTACK",
    ""
  ].join("\n");
  const p = MM_STATE.newMob();
  const r = MM_IMPORT.fill(p, { js: parse(text), text, filePath: "x.yml" });
  ok("导入成功", r.ok, r.reason);
  eq("三条行为", p.data.aiGoals.length, 3);
  eq("优先级记住", p.data.aiGoals[0].priority, "0");
  /* 官方例子里 arrowAttack 是 camelCase，导入要按小写归一 */
  eq("驼峰名归一", p.data.aiGoals[1].goal, "arrowattack");
  eq("参数归一", p.data.aiGoals[1].params, { attackradius: "18", attackspeedmax: "45" });
  eq("两条目标", p.data.aiTargets.map(t => t.target), ["clear", "players"]);
  eq("伤害修正解析", p.data.damageModifiers, [{ type: "FIRE", value: "0.5" }, { type: "ENTITY_ATTACK", value: "" }]);
}

console.log("\n[12] 导入：掉落三种形态");
{
  const text = [
    "drop_mob:",
    "  Type: ZOMBIE",
    "  Drops:",
    "  - diamond 3 0.2",
    '  - cmd{cmd="crate give <trigger.name> RewardCrate 1"} 1 0.6',
    "  - exp 100to600 0.12",
    "  - boss_loot",
    ""
  ].join("\n");
  const p = MM_STATE.newMob();
  const r = MM_IMPORT.fill(p, { js: parse(text), text, filePath: "x.yml" });
  ok("导入成功", r.ok, r.reason);
  eq("物品掉落", p.data.drops[0], { item: "diamond", amount: "3", chance: "0.2" });
  eq("命令类型（花括号里有空格也不切坏）", p.data.drops[1],
    { type: "cmd", value: "1", chance: "0.6", params: 'cmd="crate give <trigger.name> RewardCrate 1"' });
  eq("经验区间", p.data.drops[2], { type: "exp", value: "100to600", chance: "0.12" });
  eq("引用掉落表", p.data.drops[3], { table: "boss_loot" });
}

console.log("\n[13] 导入：掉落表识别 + 往返");
{
  const text = [
    "boss_loot:",
    "  TotalItems: 2",
    "  BonusLevelItems: 0.1",
    "  Conditions:",
    "  - healthpercent{p=>0}",
    "  Drops:",
    "  - diamond 2-4 1",
    "  - money 500 0.8",
    ""
  ].join("\n");
  eq("猜测为掉落表", MM_IMPORT.guessKind(parse(text)), "droptable");
  const p = MM_STATE.newDropTable();
  const r = MM_IMPORT.fill(p, { js: parse(text), text, filePath: "x.yml" });
  ok("导入成功", r.ok, r.reason);
  eq("TotalItems", p.data.totalItems, "2");
  eq("条件", p.data.conditions[0].id, "healthpercent");
  const doc = parse(MM_YAML.generate(p)).boss_loot;
  eq("往返后掉落不变", doc.Drops, ["diamond 2-4 1", "money 500 0.8"]);
}

console.log("\n[14] 导入：物品组件");
{
  const text = [
    "my_food:",
    "  Id: apple",
    "  Food:",
    "    Nutrition: 8",
    "    Saturation: 12",
    "  Rarity: EPIC",
    "  UnsetComponents:",
    "  - food",
    ""
  ].join("\n");
  const p = MM_STATE.newItem();
  const r = MM_IMPORT.fill(p, { js: parse(text), text, filePath: "x.yml" });
  ok("导入成功", r.ok, r.reason);
  eq("Food 子键", p.data.components.Food, { params: { Nutrition: "8", Saturation: "12" } });
  eq("标量组件", p.data.components.Rarity, { value: "EPIC" });
  eq("列表组件", p.data.components.UnsetComponents, { list: ["food"] });
  const doc = parse(MM_YAML.generate(p)).my_food;
  eq("往返保留 Food", doc.Food, { Nutrition: 8, Saturation: 12 });
  eq("往返保留 Rarity", doc.Rarity, "EPIC");
}

console.log("\n[15] 校验");
{
  const t = MM_STATE.newDropTable();
  t.key = "empty_table";
  const issues = MM_YAML.validate(t);
  ok("空掉落表被拦", issues.some(x => x.includes("至少要有 1 条掉落")), JSON.stringify(issues));

  const m = mobG({ damageModifiers: [{ type: "FIRE", value: "abc" }] });
  ok("伤害倍率非数字被拦", MM_YAML.validate(m).some(x => x.includes("倍率无效")), JSON.stringify(MM_YAML.validate(m)));

  const ok2 = mobG({ damageModifiers: [{ type: "FIRE", value: "0.5" }] });
  eq("正常伤害修正无报错", MM_YAML.validate(ok2), []);
}

console.log("\n[16] 引用检查：skill{s=xxx} / 掉落表名");
{
  /* 没扫过服务器目录时 window.MM_REFS 不存在，不该冒出一堆假警告 */
  delete win.MM_REFS;
  const noRefs = mobG({ skills: [{ raw: "skill{s=Missing} @self" }] });
  eq("没有索引就完全跳过", MM_YAML.refIssues(noRefs), []);

  win.MM_REFS = { skills: { kingslam: true, guardtaunt: true }, droptables: { boss_loot: true } };

  const typo = mobG({ skills: [{ raw: "skill{s=BossTaunt} @target ~onTimer:100" }] });
  ok("打错的技能组名被指出",
    MM_YAML.refIssues(typo).some(x => x.includes("BossTaunt") && x.includes("Skills/")),
    JSON.stringify(MM_YAML.refIssues(typo)));

  const fine = mobG({ skills: [{ raw: "skill{s=KingSlam} @target ~onAttack" }] });
  eq("存在的技能组不吭声", MM_YAML.refIssues(fine), []);

  const variable = mobG({ skills: [{ raw: 'skill{s=<skill.var>} @self' }] });
  eq("变量名放过", MM_YAML.refIssues(variable), []);

  const metaskillField = mobG({ failedConditionsSkill: "NoSuchSkill" });
  ok("FailedConditionsSkill 也查",
    MM_YAML.refIssues(metaskillField).some(x => x.includes("NoSuchSkill")));

  const dropMiss = mobG({ drops: [{ table: "boss_loot" }, { table: "no_such_table" }] });
  ok("掉落表名查得到",
    MM_YAML.refIssues(dropMiss).length === 1 && MM_YAML.refIssues(dropMiss)[0].includes("no_such_table"),
    JSON.stringify(MM_YAML.refIssues(dropMiss)));

  /* 引用错只是提示，不能把保存拦下来 */
  eq("引用问题不进 validate（不挡保存）", MM_YAML.validate(typo), []);
}

console.log("\n[17] 夹具往返：AI 怪物与掉落表");
{
  const mobText = fs.readFileSync(path.join(ROOT, "tests/fixture-server/Mobs/ai_guard.yml"), "utf8");
  const p = MM_STATE.create("mob");
  const r = MM_IMPORT.fill(p, { js: parse(mobText), text: mobText, filePath: "Mobs/ai_guard.yml" });
  ok("ai_guard 导入成功", r.ok, r.reason);
  const out = parse(MM_YAML.generate(p)).ai_guard;
  eq("AI 行为原样保留", out.AIGoalSelectors,
    ["0 clear", "1 meleeattack{speedmodifier=1.2}", "2 lookatplayers{range=8}", "3 randomstroll"]);
  eq("AI 目标原样保留", out.AITargetSelectors, ["clear", "players", "hurtbytarget"]);
  eq("伤害修正原样保留", out.DamageModifiers, ["FIRE 0", "PROJECTILE 0.5", "ENTITY_ATTACK 1.5", "MAGIC -1"]);
  eq("掉落表引用", out.Drops, ["boss_loot", "exp 15 1"]);

  const tText = fs.readFileSync(path.join(ROOT, "tests/fixture-server/Drops/boss_loot.yml"), "utf8");
  const t = MM_STATE.create("droptable");
  const tr = MM_IMPORT.fill(t, { js: parse(tText), text: tText, filePath: "Drops/boss_loot.yml" });
  ok("boss_loot 导入成功", tr.ok, tr.reason);
  const tOut = parse(MM_YAML.generate(t)).boss_loot;
  eq("件数保持数字类型", [tOut.TotalItems, tOut.MinItems, tOut.MaxItems], [2, 1, 3]);
  eq("加成保持数字类型", [tOut.BonusLevelItems, tOut.BonusLuckItems], [0.5, 0.1]);
  eq("掉落四条都在", tOut.Drops, [
    "diamond 2-4 0.5", "item flame_sword", "exp 50 1",
    'cmd{cmd="crate give <trigger.name> RewardCrate 1"} 1 0.2'
  ]);
}

console.log("\n" + pass + " 通过, " + fail + " 失败");
process.exit(fail ? 1 : 0);
