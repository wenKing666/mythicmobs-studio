// 生成器单测：node tools/test_yaml.mjs
import fs from "node:fs";
import vm from "node:vm";

const ctx = { window: {}, console, document: undefined };
vm.createContext(ctx);
for (const f of ["app/js/data.js", "app/js/yaml.js"]) {
  vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
}
// 浏览器里 MM_DATA 是全局变量，这里手动补上
ctx.MM_DATA = ctx.window.MM_DATA;
const D = ctx.window.MM_DATA;
const Y = ctx.window.MM_YAML;

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  if (actual === expected) { pass++; console.log("  ✓", name); }
  else {
    fail++;
    console.log("  ✗", name);
    console.log("---- 实际 ----\n" + actual + "----------------");
    console.log("---- 期望 ----\n" + expected + "----------------");
  }
}

const defOpts = (list) => { const o = {}; list.forEach(x => o[x.key] = x.def); return o; };

/* 1. 最小怪物 */
{
  const p = {
    kind: "mob", key: "test_zombie",
    data: {
      type: "ZOMBIE", display: "", health: 20, damage: 0, armor: 0,
      options: defOpts(D.mobOptions), bossbar: { enabled: false },
      equipment: [], skills: [], drops: []
    }
  };
  eq("最小怪物", Y.generate(p), "test_zombie:\n  Type: ZOMBIE\n  Health: 20\n");
}

/* 2. 带颜色码/引号/冒号的名字 */
{
  const p = {
    kind: "mob", key: "quoted",
    data: {
      type: "SKELETON", display: "&c它叫 '小王': 很凶", health: 100, damage: 5, armor: 2,
      options: Object.assign(defOpts(D.mobOptions), { PreventSunburn: true }),
      bossbar: { enabled: false }, equipment: [], skills: [], drops: []
    }
  };
  const out = Y.generate(p);
  if (!out.includes("Display: '&c它叫 ''小王'': 很凶'")) { fail++; console.log("  ✗ 引号转义\n" + out); }
  else { pass++; console.log("  ✓ 引号转义"); }
}

/* 3. 技能行 */
{
  const p = {
    kind: "mob", key: "sk",
    data: {
      type: "ZOMBIE", display: "", health: 20, damage: 0, armor: 0,
      options: defOpts(D.mobOptions), bossbar: { enabled: false }, equipment: [], drops: [],
      skills: [
        { trigger: "onSpawn", mechanic: "message", targeter: "self", params: { message: "&a来了" } },
        { trigger: "onTimer", mechanic: "damage", targeter: "pir", radius: 8, seconds: 5, params: { amount: 3, ignoreArmor: true } },
        { trigger: "onDeath", mechanic: "summon", targeter: "loc", params: { type: "ZOMBIE", amount: 2 } }
      ]
    }
  };
  eq("技能行", Y.generate(p).split("Skills:\n")[1],
    "  - message{message=&a来了} ~onSpawn\n" +
    "  - damage{amount=3;ignoreArmor=true} @PlayersInRadius{r=8} ~onTimer:100\n" +
    "  - summon{type=ZOMBIE;amount=2} @TargetLocation ~onDeath\n");
}

/* 4. 基础物品 */
{
  const p = {
    kind: "item", key: "my_sword",
    data: {
      material: "diamond_sword", display: "&b冰霜之剑", amount: 1,
      lore: ["&7很冷", ""], enchants: [{ name: "SHARPNESS", level: 5 }],
      attributes: [
        { slot: "MainHand", name: "ATTACK_DAMAGE", value: 9, op: "ADD" },
        { slot: "MainHand", name: "ATTACK_SPEED", value: 0.5, op: "MULTIPLY_BASE" }
      ],
      options: Object.assign(defOpts(D.itemOptions), { Unbreakable: true, CustomModelData: 12 })
    }
  };
  eq("基础物品", Y.generate(p),
    "my_sword:\n" +
    "  Id: diamond_sword\n" +
    "  Display: '&b冰霜之剑'\n" +
    "  Lore:\n  - '&7很冷'\n" +
    "  Options:\n    Unbreakable: true\n    CustomModelData: 12\n" +
    "  Enchantments:\n  - SHARPNESS 5\n" +
    "  Attributes:\n    MainHand:\n      ATTACK_DAMAGE: 9 ADD\n      ATTACK_SPEED: 0.5 MULTIPLY_BASE\n");
}

/* 5. 非法 key 自动清洗 */
{
  const p = { kind: "item", key: "我的 剑!", data: { material: "stone", display: "", amount: 1, lore: [], enchants: [], attributes: [], options: defOpts(D.itemOptions) } };
  const first = Y.generate(p).split("\n")[0];
  if (first.startsWith("__") || first.startsWith("___") || /^[A-Za-z0-9_\-]+:$/.test(first)) { pass++; console.log("  ✓ key 清洗 ->", first); }
  else { fail++; console.log("  ✗ key 清洗 ->", first); }
}

/* 6. 空项目不炸 */
{
  const out = Y.generate(null);
  if (out.startsWith("#")) { pass++; console.log("  ✓ 空项目"); } else { fail++; console.log("  ✗ 空项目", out); }
}

/* 7. 必填校验 */
{
  const badItem = {
    kind: "item", key: "x",
    data: { material: "", display: "", amount: 1, lore: [], enchants: [], attributes: [], options: defOpts(D.itemOptions) }
  };
  eq("缺材质会被拦下", Y.validate(badItem).join(" | "), "物品材质未选择");

  const badMob = {
    kind: "mob", key: "",
    data: { type: "", display: "", health: 20, damage: 0, armor: 0, options: defOpts(D.mobOptions), bossbar: {}, equipment: [], skills: [], drops: [] }
  };
  const msg = Y.validate(badMob).join(" | ");
  if (msg.includes("ID 不能为空") && msg.includes("生物类型未选择")) { pass++; console.log("  ✓ 缺 ID / 类型会被拦下"); }
  else { fail++; console.log("  ✗ 缺 ID / 类型", msg); }

  const goodItem = {
    kind: "item", key: "ok",
    data: { material: "diamond", display: "", amount: 1, lore: [], enchants: [{ name: "SHARPNESS", level: 3 }], attributes: [{ slot: "MainHand", name: "ATTACK_DAMAGE", value: 5, op: "ADD" }], options: defOpts(D.itemOptions) }
  };
  eq("正常物品无报错", Y.validate(goodItem).length, 0);

  const badSkill = {
    kind: "mob", key: "m",
    data: {
      type: "ZOMBIE", display: "", health: 20, damage: 0, armor: 0, options: defOpts(D.mobOptions), bossbar: {},
      equipment: [], drops: [],
      skills: [{ trigger: "onSpawn", mechanic: "message", targeter: "self", params: { message: "" } }]
    }
  };
  if (Y.validate(badSkill).some(t => t.includes("消息内容"))) { pass++; console.log("  ✓ 技能必填参数会被拦下"); }
  else { fail++; console.log("  ✗ 技能必填参数", Y.validate(badSkill)); }
}

/* 8. 空材质不再静默变成 stone */
{
  const p = {
    kind: "item", key: "blank",
    data: { material: "", display: "", amount: 1, lore: [], enchants: [], attributes: [], options: defOpts(D.itemOptions) }
  };
  const out = Y.generate(p);
  if (!out.includes("Id: stone")) { pass++; console.log("  ✓ 空材质不偷偷填 stone"); }
  else { fail++; console.log("  ✗ 空材质仍输出 stone", out); }
}

console.log(`\n${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
