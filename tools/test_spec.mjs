// 通用字段引擎 + 9 种配置类型 + 怪物扩展字段 + 物品组件子键：node tools/test_spec.mjs
// 覆盖 0.7.0 新增的三块：Spawners/RandomSpawns/Stats/Menus/Dialogs/Cinematics/Pins/Packs/VanillaMobs、
// 怪物的 15 个顶层字段、物品 28 项组件的子键表单。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const win = {};
globalThis.window = win;
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ["app/js/data.js", "app/js/options-data.js", "app/js/catalog.js",
  "app/js/extras-data.js", "app/js/spec-data.js", "app/js/spec.js",
  "app/js/yaml.js", "app/js/state.js", "app/js/import.js"]) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  (0, eval)(src);
  Object.assign(globalThis, win);
}

const { MM_IMPORT, MM_YAML, MM_STATE, MM_SPEC, MM_EXTRAS, MM_SPEC_DATA } = globalThis;

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

function specP(kind, fill) {
  const p = MM_STATE.newSpecProject(kind);
  p.key = "t_" + kind;
  if (fill) fill(p.data.fields);
  return p;
}

function rt(kind, text) {
  const p = MM_STATE.newSpecProject(kind);
  const r = MM_IMPORT.fill(p, { js: parse(text), text, filePath: "t.yml" });
  return { p, r, yaml: r.ok ? MM_YAML.generate(p) : "", back: r.ok ? parse(MM_YAML.generate(p)) : null };
}

const ALL = ["spawner", "randomspawn", "stats", "menu", "dialog", "cinematic", "pin", "pack", "vanillaoverride"];

console.log("\n[1] 数据：9 种类型都在字段表里");
eq("类型数量", MM_SPEC.allTypes().length, 9);
ALL.forEach(function (k) {
  ok(k + " 已注册", !!MM_SPEC.type(k));
  ok(k + " 有 title / dir / keyPrefix", !!(MM_SPEC.type(k).title && MM_SPEC.type(k).dir && MM_SPEC.type(k).keyPrefix));
});
ok("每种类型至少有 4 个字段", ALL.every(k => MM_SPEC.flatFields(MM_SPEC.type(k)).length >= 4),
  ALL.map(k => k + "=" + MM_SPEC.flatFields(MM_SPEC.type(k)).length));
ok("字段都有中文标签", ALL.every(k => MM_SPEC.flatFields(MM_SPEC.type(k)).every(f => f.z)),
  ALL.filter(k => MM_SPEC.flatFields(MM_SPEC.type(k)).some(f => !f.z)));
ok("enum 字段都带 o", ALL.every(k => MM_SPEC.flatFields(MM_SPEC.type(k))
  .every(f => f.t !== "enum" || (f.o && f.o.length))));
ok("同一类型里键名不重复", ALL.every(function (k) {
  const ks = MM_SPEC.flatFields(MM_SPEC.type(k)).map(f => f.k);
  return new Set(ks).size === ks.length;
}));
/* stats 的字段表按 wiki「Custom Stat Options」逐项核对过：
   Enabled/AlwaysActive/Type/Display/Formatting/ShowInLore/Priority/MinValue/MaxValue/
   Triggers/ParentStats/TriggerStats/Formula/FormulaKey/BaseValue/ExecutionPoint/Skills
   （Conditions 与 Rounding 是编辑器侧补充），漏一个这里就会炸 */
eq("stats 字段数与 wiki 选项表一致", MM_SPEC.flatFields(MM_SPEC.type("stats")).length, 19);

console.log("\n[2] 新建空壳 + 校验");
const sp0 = specP("spawner");
eq("空刷怪点生成只留 ID 行", MM_YAML.generate(sp0), "t_spawner:\n");
eq("刷怪点缺怪物名要报错", MM_YAML.validate(sp0), ["怪物 不能为空"]);
ok("pack 没有 ID 概念，不报错", MM_YAML.validate(specP("pack")).length === 0);
const pn0 = specP("pin");
eq("pins 空壳是空字符串", MM_YAML.generate(pn0), "");
eq("初建的 pin 没有名字要报错", MM_YAML.validate(pn0), ["名字 不能为空"]);

console.log("\n[3] 刷怪点生成");
const sp = specP("spawner", function (f) {
  f.MobName = "SkeletalKnight"; f.World = "world"; f.MobLevel = 5;
  f.X = 100; f.Y = 64; f.Z = -20; f.Radius = 5; f.Cooldown = 300;
  f.UseTimer = "true"; f.MaxMobs = 3;
  f.Conditions = [{ id: "day", params: {}, expect: "" }];
});
const spY = MM_YAML.generate(sp);
ok("包着 ID 写", spY.startsWith("t_spawner:\n"));
ok("怪物名写进去", spY.includes("MobName: SkeletalKnight"));
ok("坐标写成数字不加引号", spY.includes("X: 100") && spY.includes("Y: 64") && spY.includes("Z: -20"));
ok("布尔写 true 而不是 'true'", spY.includes("UseTimer: true") && !spY.includes("'true'"));
ok("条件块照写", spY.includes("  Conditions:\n  - day"));
eq("没有必填报错", MM_YAML.validate(sp), []);

console.log("\n[4] 菜单 / 对话 / 镜头");
const mn = specP("menu", function (f) {
  f.Display = "&8主菜单"; f.Size = 27;
  f.Schema = ["1 1 1 1 1 1 1 1 1", "1 0 0 0 0 0 0 0 1"];
  f.Icons = { "1": { Mapping: "1", Material: "RED_STAINED_GLASS_PANE", Model: 3 } };
});
const mnY = MM_YAML.generate(mn);
ok("菜单布局按行写", mnY.includes("Schema:\n  - 1 1 1 1 1 1 1 1 1"));
ok("图标按名字挂成子块", mnY.includes("  Icons:\n    1:"));
ok("图标子键写进去", mnY.includes("      Material: RED_STAINED_GLASS_PANE"));
ok("Size 是数字", mnY.includes("Size: 27"));

const dg = specP("dialog", function (f) {
  f.Title = "守卫"; f.CanClose = "true";
  f.Body = [{ Type: "TEXT", Message: "你好", Width: 300 }];
  f.Inputs = [{ Type: "TEXT", Key: "name", Label: "名字", MaxLength: 16 }];
  f.Buttons = [{ Label: "接受", Actions: ["run_command:/say hi"] }];
});
const dgY = MM_YAML.generate(dg);
ok("对话正文是对象列表", dgY.includes("  Body:\n  - Type: TEXT\n    Message: 你好"));
ok("输入项写成对象列表", dgY.includes("    Key: name"));
ok("按钮动作是列表", dgY.includes("    Actions:\n    - 'run_command:/say hi'"));
eq("输入项键名合法时不报错", MM_YAML.validate(dg), []);
const dgBad = specP("dialog", function (f) {
  f.Body = [{ Type: "TEXT", Message: "x" }];
  f.Inputs = [{ Key: "玩家 名字", Label: "x" }];
});
ok("输入项键名带空格要报错",
  MM_YAML.validate(dgBad).some(t => t.indexOf("输入项") >= 0), MM_YAML.validate(dgBad));

const cm = specP("cinematic", function (f) {
  f.duration = 120; f.easing = "SMOOTHSTEP";
  f.points = ["world,10,64,10,0,0", "world,20,66,20,90,10"];
});
const cmY = MM_YAML.generate(cm);
ok("路径点按行写", cmY.includes("  points:\n  - 'world,10,64,10,0,0'"));
ok("缓动写成枚举值", cmY.includes("easing: SMOOTHSTEP"));

console.log("\n[5] pins 是整份列表");
const pin = specP("pin", function (f) {
  f.name = "boss_arena"; f.location = "world,100,64,-20"; f.radius = 10; f.duration = 600;
});
const pinY = MM_YAML.generate(pin);
ok("每项以 - 开头", pinY.startsWith("- name: boss_arena"));
ok("后续字段缩进 2", pinY.includes("\n  location: 'world,100,64,-20'"));

console.log("\n[6] pack.yml 是平铺字段");
const pk = specP("pack", function (f) {
  f.Name = "My Pack"; f.Version = "1.0";
  f.Description = ["&7第一行", "&7第二行"];
  f.Icon = { Material: "DIAMOND", Model: 1 };
});
const pkY = MM_YAML.generate(pk);
ok("没有外层 ID", pkY.startsWith("Name: My Pack"));
ok("描述是列表", pkY.includes("Description:\n- '&7第一行'"));
ok("图标是子块", pkY.includes("Icon:\n  Material: DIAMOND"));

console.log("\n[7] 导入：刷怪点保留陌生字段");
const a = rt("spawner", `BossSpawner:
  MobName: SkeletalKnight
  MobLevel: 5
  X: 100
  Y: 64
  Z: -20
  UseTimer: true
  Conditions:
  - day true
  WeirdField: keep-me
  AnotherBlock:
    deep: 1
`);
ok("导入成功", a.r.ok === true);
eq("ID 取文件名里的键", a.p.key, "BossSpawner");
eq("数字保持数字", a.p.data.fields.X, 100);
ok("陌生字段原样写回", a.yaml.includes("WeirdField: keep-me"));
ok("陌生的块也写回", a.yaml.includes("AnotherBlock:\n    deep: 1"));
eq("重新解析对得上", a.back.BossSpawner.WeirdField, "keep-me");

console.log("\n[8] 导入：菜单 / 对话 / 明细表");
const b = rt("menu", `MyMenu:
  Display: '&8主菜单'
  Size: 27
  Schema:
  - 1 1 1 1 1 1 1 1 1
  Icons:
    FILLER:
      Mapping: '1'
      Material: RED_STAINED_GLASS_PANE
      Model: 3
  OpenSound: BLOCK_CHEST_OPEN
`);
eq("图标读进 map", Object.keys(b.p.data.fields.Icons), ["FILLER"]);
eq("图标子键读对", b.p.data.fields.Icons.FILLER.Material, "RED_STAINED_GLASS_PANE");
ok("布局读成数组", Array.isArray(b.p.data.fields.Schema) && b.p.data.fields.Schema.length === 1);
ok("陌生的 OpenSound 原样保留", b.yaml.includes("OpenSound: BLOCK_CHEST_OPEN"));

const c = rt("dialog", `MyDialog:
  Title: '&6守卫'
  CanClose: true
  Body:
  - Type: TEXT
    Message: 你好
    Width: 300
  Buttons:
  - Label: 接受
    Actions:
    - run_command:/say hi
`);
eq("正文条目数", c.p.data.fields.Body.length, 1);
eq("正文宽度是数字", c.p.data.fields.Body[0].Width, 300);
eq("按钮动作是数组", c.p.data.fields.Buttons[0].Actions, ["run_command:/say hi"]);
eq("数值往返不变", c.back.MyDialog.Body[0].Width, 300);

console.log("\n[9] 导入：pins 列表 + pack 平铺");
const d = rt("pin", `- name: boss_arena
  location: world,100,64,-20
  radius: 10
- name: second
  location: world,0,64,0
`);
ok("导入成功", d.r.ok === true);
eq("ID 取第一项的名字", d.p.key, "boss_arena");
ok("提示只编辑第一项", d.r.warnings.some(w => w.indexOf("2 项") >= 0));
ok("第二项原样保留", d.yaml.includes("- name: second"));
eq("重新解析还是两条", d.back.length, 2);
eq("第一项半径是数字", d.back[0].radius, 10);

const e = rt("pack", `Name: My Pack
Version: 1.0
Author: me
Description:
- '&7第一行'
SomethingUnknown: 42
`);
eq("平铺文件导入成功", e.r.ok, true);
eq("Name 读对", e.p.data.fields.Name, "My Pack");
ok("陌生字段保留", e.yaml.includes("SomethingUnknown: 42"));
eq("没有 ID 也能通过校验", MM_YAML.validate(e.p), []);
eq("重新解析对得上", e.back.SomethingUnknown, 42);

console.log("\n[10] 导入：原版覆写");
const f = rt("vanillaoverride", `ZOMBIE:
  Health: 40
  Damage: 8
  Display: '&c精英僵尸'
  Options:
    PreventSunburn: true
    MovementSpeed: 0.3
`);
eq("ID 就是生物类型", f.p.key, "ZOMBIE");
ok("Options 写成 true 不变成 'true'", f.yaml.includes("PreventSunburn: true"));
ok("移速是数字", f.yaml.includes("MovementSpeed: 0.3"));

console.log("\n[11] 怪物：15 个扩展字段");
const mobText = `Lv50Boss:
  Type: WITHER_SKELETON
  Display: '&4血王'
  Health: 800
  Level: 50
  LevelModifiers:
    Health: 20
    Damage: 1.5
  Faction: undead
  Mount: SkeletalHorse
  Disguise: WITHER
  KillMessages:
  - '&7被撕碎了'
  HealthBar:
    Enabled: true
    Offset: 1.6
  Modules:
    ThreatTable: true
    ImmunityTable: false
  Hearing:
    Enabled: true
  AIPathfindingMalus:
  - WATER 0
  Variables:
    phase: int/1
  Trades:
    1:
      Item1: 5 EMERALD
      Result: 1 DIAMOND
  Totem:
    Head: player_head
    Pattern:
    - 0,0,0 GOLD_BLOCK
  UnknownExtra: keep
`;
const mp = MM_STATE.newMob();
MM_IMPORT.fill(mp, { js: parse(mobText), text: mobText, filePath: "t.yml" });
const mpY = MM_YAML.generate(mp);
const mpBack = parse(mpY).Lv50Boss;
eq("扩展字段数量", MM_SPEC.mobExtraFields().length, 17);
eq("Level 读对", mp.data.extra.Level, "50");
eq("LevelModifiers 是对象", mp.data.extra.LevelModifiers.Damage, 1.5);
eq("KillMessages 是数组", mp.data.extra.KillMessages.length, 1);
eq("Modules 布尔保持", mpBack.Modules.ThreatTable, true);
eq("Modules 的 false 不被省掉", mpBack.Modules.ImmunityTable, false);
eq("Variables 是键值对", mpBack.Variables.phase, "int/1");
eq("Trades 是具名子块", mpBack.Trades["1"].Result, "1 DIAMOND");
eq("Totem 图案是列表", mpBack.Totem.Pattern.length, 1);
eq("HealthBar 偏移是数字", mpBack.HealthBar.Offset, 1.6);
ok("扩展字段没被当成陌生块重复写", (mpY.match(/Level:/g) || []).length === 1);
ok("不认识的顶层字段仍然原样保留", mpY.includes("UnknownExtra: keep"));
ok("扩展字段全部有中文标签", MM_SPEC.mobExtraFields().every(x => x.z));
ok("分组有中文标题", MM_SPEC.mobExtraGroups().every(g => g.title && g.fields.length));

console.log("\n[12] 物品：28 项组件的子键表单");
const compIds = Object.keys(MM_SPEC_DATA.itemComponentFields);
eq("补了子键的组件数", compIds.length, 28);
ok("每项都至少 1 个子键", compIds.every(id => MM_SPEC.itemComponentFields(id).length > 0));
ok("子键都有中文", compIds.every(id => MM_SPEC.itemComponentFields(id).every(x => x.z)));
ok("和在售组件不冲突",
  compIds.every(id => (MM_EXTRAS.itemComponents || []).some(c => c.id === id)));

const itemText = `MysteryPick:
  Id: diamond_pickaxe
  Display: '&b秘银镐'
  Hide:
    flags:
    - ATTRIBUTES
    - UNBREAKABLE
  NBT:
    tags:
      mythic_type: pickaxe
      level: 3
  Book:
    Title: '手册'
    Pages:
    - 第一页
  SwingAnimation:
    Type: STAB
    Duration: 6
  OminousBottleAmplifier: 2
`;
const ip = MM_STATE.newItem();
MM_IMPORT.fill(ip, { js: parse(itemText), text: itemText, filePath: "t.yml" });
const ipY = MM_YAML.generate(ip);
ok("Hide 是列表形态", ipY.includes("  Hide:\n    flags:\n    - ATTRIBUTES"));
ok("NBT 是键值对", ipY.includes("    tags:\n      mythic_type: pickaxe"));
ok("NBT 的数字保持数字", ipY.includes("      level: 3") && !ipY.includes("level: '3'"));
ok("多行子键（Book）保留", ipY.includes("    Pages:\n    - 第一页"));
ok("枚举子键写枚举值", ipY.includes("    Type: STAB"));
ok("数字子键保持数字", ipY.includes("    Duration: 6"));
ok("标量组件保持裸数字", ipY.includes("OminousBottleAmplifier: 2"));
eq("重新解析数组还在", parse(ipY).MysteryPick.Hide.flags, ["ATTRIBUTES", "UNBREAKABLE"]);

console.log("\n[13] 掉落特效（FancyDrops）");
const fd = MM_SPEC.fancyDrops();
eq("字段数", fd.fields.length, 11);
ok("字段都有中文", fd.fields.every(x => x.z));
const fp = MM_STATE.newItem();
fp.key = "glow_drop";
fp.data.materials = fp.data.material;
fp.data.components.DropOptions = {
  params: { DropGlowColor: "#ff0000", DropLootplosion: true, DropLootplosion: true, DropLootsplosion: true, DropBrightness: 15 }
};
const fpY = MM_YAML.generate(fp);
ok("掉落特效写进 DropOptions", fpY.includes("  DropOptions:\n    DropGlowColor: '#ff0000'"));
ok("亮度是数字", fpY.includes("    DropBrightness: 15"));
ok("布尔不写成字符串", fpY.includes("    DropLootsplosion: true"));

console.log("\n[14] 类型猜测");
ok("刷怪点", MM_IMPORT.guessKind({ A: { MobName: "X", MobLevel: 1 } }) === "spawner");
ok("随机刷怪", MM_IMPORT.guessKind({ A: { MobType: "X", Worlds: ["w"] } }) === "randomspawn");
ok("属性", MM_IMPORT.guessKind({ A: { Type: "DOUBLE", BaseValue: 1 } }) === "stats");
ok("菜单", MM_IMPORT.guessKind({ A: { Schema: [], Icons: {} } }) === "menu");
ok("对话", MM_IMPORT.guessKind({ A: { Title: "t", Body: [] } }) === "dialog");
ok("内容包", MM_IMPORT.guessKind({ Name: "p", Version: "1" }) === "pack");
ok("pins 列表", MM_IMPORT.guessKind([{ name: "a" }]) === "pin");
ok("原版覆写", MM_IMPORT.guessKind({ ZOMBIE: { Health: 40, Options: {} } }) === "vanillaoverride");
ok("普通怪物不被抢走", MM_IMPORT.guessKind({ A: { Type: "ZOMBIE", Health: 20 } }) === "mob");

console.log("\n[15] 字段引擎本身");
eq("数字不写成字符串", MM_SPEC.toYaml([{ k: "a", t: "num" }], { a: "12" }, 0), ["a: 12"]);
eq("布尔写成 true", MM_SPEC.toYaml([{ k: "a", t: "bool" }], { a: "true" }, 0), ["a: true"]);
eq("空值整行不写", MM_SPEC.toYaml([{ k: "a" }, { k: "b" }], { a: "", b: "x" }, 0), ["b: x"]);
eq("含冒号要加引号", MM_SPEC.toYaml([{ k: "a" }], { a: "x:y" }, 0), ["a: 'x:y'"]);
eq("列表展平", MM_SPEC.toYaml([{ k: "a", t: "list" }], { a: ["x", "y"] }, 0), ["a:", "- x", "- y"]);
eq("键值对里 true 保持布尔", MM_SPEC.toYaml([{ k: "a", t: "kv" }], { a: { b: "true" } }, 0), ["a:", "  b: true"]);
eq("fromYaml 只吃认识的键",
  MM_SPEC.fromYaml([{ k: "a" }], { a: "1", zzz: 2 }).store, { a: "1" });
eq("blank 按类型给空壳", MM_SPEC.blank([{ k: "a", t: "list" }, { k: "b", t: "obj" }, { k: "c" }]),
  { a: [], b: {}, c: "" });

console.log("\n" + pass + " 通过, " + fail + " 失败");
process.exit(fail ? 1 : 0);
