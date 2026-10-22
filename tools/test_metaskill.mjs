// 技能组（Metaskill）与目标器通用参数：node tools/test_metaskill.mjs
// 覆盖：Conditions 条件块、TargetConditions / TriggerConditions、Cooldown、
//       目标器通用筛选写进花括号、导入回解析、参数上下文中文
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const win = {};
globalThis.window = win;
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ["app/js/data.js", "app/js/options-data.js", "app/js/catalog.js", "app/js/extras-data.js", "app/js/yaml.js", "app/js/state.js", "app/js/import.js"]) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  (0, eval)(src);
  Object.assign(globalThis, win);
}

const { MM_IMPORT, MM_YAML, MM_STATE, MM_CATALOG } = globalThis;

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
function skill(data) {
  const p = MM_STATE.newSkill();
  p.key = "my_skill";
  Object.assign(p.data, data);
  return p;
}

console.log("\n[1] 最小技能组");
{
  eq("只有名字", MM_YAML.generate(skill({})), "my_skill:\n");
  eq("一条技能", MM_YAML.generate(skill({
    skills: [{ mechanic: "damage", targeter: "target", params: { amount: 5 } }]
  })), "my_skill:\n  Skills:\n  - damage{amount=5} @target\n");
}

console.log("\n[2] Conditions 条件块（不带 ? 前缀）");
{
  const out = MM_YAML.generate(skill({
    conditions: [
      { id: "healthpercent", params: { percent: "<50%" } },
      { id: "day", params: {} }
    ]
  }));
  eq("条件块", out,
    "my_skill:\n  Conditions:\n  - healthpercent{p=<50%}\n  - day\n");
  ok("条件行不带问号", !out.includes("?"), out);
}

console.log("\n[3] 期望值 false");
{
  const out = MM_YAML.generate(skill({ conditions: [{ id: "day", params: {}, expect: "false" }] }));
  eq("不成立后缀", out, "my_skill:\n  Conditions:\n  - day false\n");
}

console.log("\n[4] 目标条件 / 触发条件 / 冷却 / 开关");
{
  const out = MM_YAML.generate(skill({
    cancelIfNoTargets: "true",
    hidden: "true",
    cooldown: 12,
    conditions: [{ id: "chance", params: { chance: "0.5" } }],
    targetConditions: [{ id: "healthpercent", params: { percent: ">20%" } }],
    triggerConditions: [{ id: "day", params: {} }],
    failedConditionsSkill: "phase_fail",
    onCooldownSkill: "too_soon",
    skill: "extra_fx",
    skills: [{ mechanic: "lightning", targeter: "self" }]
  }));
  eq("完整技能组", out,
    "my_skill:\n" +
    "  CancelIfNoTargets: true\n" +
    "  Hidden: true\n" +
    "  Conditions:\n  - chance{c=0.5}\n" +
    "  TargetConditions:\n  - healthpercent{p=>20%}\n" +
    "  TriggerConditions:\n  - day\n" +
    "  FailedConditionsSkill: phase_fail\n" +
    "  Cooldown: 12\n" +
    "  OnCooldownSkill: too_soon\n" +
    "  Skill: extra_fx\n" +
    "  Skills:\n  - lightning\n");
}

console.log("\n[5] 目标器通用筛选（targetplayers / sort / limit…）");
{
  const out = MM_YAML.generate(skill({
    skills: [{
      mechanic: "damage", targeter: "playersinradius",
      targetParams: { radius: 8, targetplayers: "true", limit: 3, sort: "NEAREST" }
    }]
  }));
  ok("通用筛选写进花括号", /@PlayersInRadius\{r=8;targetplayers=true;sort=NEAREST;limit=3\}/.test(out), out);
}
{
  const out = MM_YAML.generate(skill({
    skills: [{ mechanic: "damage", targeter: "playersinradius", targetParams: { radius: 5, limit: "0" } }]
  }));
  ok("默认值 0 不写出来", /@PlayersInRadius\{r=5\}/.test(out), out);
}

console.log("\n[6] 导入技能组");
{
  const text = [
    "boss_phase2:",
    "  CancelIfNoTargets: true",
    "  Cooldown: 15",
    "  Conditions:",
    "  - healthpercent{p=<50%}",
    "  - day false",
    "  - chance{c=0.5} true",
    "  TargetConditions:",
    "  - hasaura{a=fire}",
    "  Skills:",
    "  - damage{amount=12} @target",
    "  - particle{particle=flame;amount=30} @self",
    ""
  ].join("\n");
  const js = parse(text);
  eq("能认出是技能组", MM_IMPORT.guessKind(js), "skill");

  const p = MM_STATE.newSkill();
  const r = MM_IMPORT.fill(p, { js, text, filePath: "Skills/boss.yml" });
  ok("导入成功", r.ok, r.reason);
  eq("ID", p.key, "boss_phase2");
  eq("冷却", p.data.cooldown, 15);
  eq("CancelIfNoTargets", p.data.cancelIfNoTargets, "true");
  eq("条件个数", p.data.conditions.length, 3);
  eq("条件别名归一", p.data.conditions[0], { id: "healthpercent", params: { percent: "<50%" } });
  eq("条件期望 false", p.data.conditions[1], { id: "day", params: {}, expect: "false" });
  eq("后缀 true 与不写等价", p.data.conditions[2].expect, undefined);
  eq("目标条件", p.data.targetConditions[0].id, "hasaura");
  eq("技能条数", p.data.skills.length, 2);
  eq("技能没被塞触发器", p.data.skills[0].trigger, "");
  ok("往返后还能生成", MM_YAML.generate(p).includes("- healthpercent{p=<50%}"), MM_YAML.generate(p));
  ok("往返保留 day false", MM_YAML.generate(p).includes("- day false"), MM_YAML.generate(p));
}

console.log("\n[7] 导入：目标器通用参数归一");
{
  const text = [
    "nova:",
    "  Skills:",
    "  - damage{amount=6} @PlayersInRadius{r=10;limit=2;targetplayers=true}",
    ""
  ].join("\n");
  const p = MM_STATE.newSkill();
  MM_IMPORT.fill(p, { js: parse(text), text });
  eq("limit 归到 targetParams", p.data.skills[0].targetParams.limit, "2");
  eq("targetplayers 归到 targetParams", p.data.skills[0].targetParams.targetplayers, "true");
  ok("再生成顺序不丢", /@PlayersInRadius\{r=10;targetplayers=true;limit=2\}/.test(MM_YAML.generate(p)), MM_YAML.generate(p));
}

console.log("\n[8] 参数中文按上下文（amount 不再到处是「数量」）");
{
  const zh = (kind, id, name) => {
    const c = MM_CATALOG[kind].find(x => x.id === id);
    const p = c && c.params.find(x => x.name === name);
    return p ? p.zh : "(没有这个参数)";
  };
  eq("damage.amount", zh("mechanics", "damage", "amount"), "伤害量");
  eq("heal.amount", zh("mechanics", "heal", "amount"), "治疗量");
  eq("particle.amount", zh("mechanics", "particle", "amount"), "粒子数量");
  eq("giveexperiencelevels.amount", zh("mechanics", "giveexperiencelevels", "amount"), "经验等级数");
  eq("setvariable.duration", zh("mechanics", "setvariable", "duration"), "有效期（刻）");
  eq("potion.duration", zh("mechanics", "potion", "duration"), "药水时长（刻）");
}

console.log("\n[9] 校验");
{
  eq("ID 为空被拦", MM_YAML.validate({ kind: "skill", key: "", data: { skills: [], conditions: [] } }).includes("ID 不能为空"), true);
  const bad = skill({ conditions: [{ id: "", params: {} }], skills: [] });
  ok("空条件被拦", MM_YAML.validate(bad).some(t => t.includes("条件未选择")), MM_YAML.validate(bad));
  const good = skill({ conditions: [{ id: "day", params: {} }], skills: [{ mechanic: "damage", targeter: "self", params: { amount: 5 } }] });
  eq("正常技能组无报错", MM_YAML.validate(good).length, 0);
}

console.log(`\n${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
