# MythicMobs Wiki 结构化数据

> 抓取源：https://wiki.mythiccraft.io/mythicmobs　｜　生成时间：2026-10-21T21:08:28+0800
> 原始页面 1491 个，按正文去重后 949 个。

## 一、文件清单

| 文件 | 内容 |
|---|---|
| `data/schema.json` | **编辑器主数据**：机制/条件/目标器/触发器/粒子/AI 组件，含参数表 |
| `data/mythicmobs-wiki.json` | 全量数据：schema + 文档页 + 每页 markdown 正文 |
| `data/zh/glossary.json` | 常用字段中文对照 |
| `data/raw/*.html` | 原始页面缓存（离线可复现，可删） |
| `data/index.md` | 本文件 |
| `data/index-full.md` | 全部组件名清单 |
| `docs/字段中文对照.md` | 中文释义表 |

## 二、规模

| 类别 | 条数 | 说明 |
|---|---:|---|
| 技能机制 | 303 | 写在 `Skills:` 下，形如 `- 机制名{参数=值}` |
| 条件 | 196 | `Conditions:` 列表或行内 `?条件` |
| 目标选择器 | 91 | 行尾的 `@Targeter{...}` |
| 触发器 | 38 | 行尾的 `~onXXX` |
| 粒子类型 | 120 | `particle{}` 里 particle 的取值 |
| AI 行为 | 51 | 怪物 `AIGoalSelectors:` 的取值 |
| AI 目标 | 14 | 怪物 `AITargetSelectors:` 的取值 |

参数条目合计 **1526** 条，配置示例 **1973** 段。

## 三、单条记录的结构

```jsonc
{
  "name": "Activatespawner",            // 组件名（在 YAML 里就是它）
  "aliases": ["as"],                    // 别名，可直接替换使用
  "description": "Activates a ...",     // 一句话说明
  "inherits": "",                       // 若继承其它组件, 写在这里(如 Aura)
  "attributes": [                       // 参数表
    {"name": "spawners", "aliases": ["spawner","s"],
     "description": "The name of ...", "default": "NONE"}
  ],
  "fields": [],                          // 文档页专用: 小标题形式的字段
  "examples": ["Skills:\n- activatespawner{spawner=BossAdd}"],
  "url": "https://wiki.mythiccraft.io/..."
}
```

## 四、文档页（怪物 / 物品 / 掉落 / 刷怪）

| 路径 | 标题 | 字段数 |
|---|---|---:|
| `API` | A P I | 2 |
| `Cinematics` | Cinematics | 3 |
| `Dialogs` | Dialogs | 2 |
| `Guides/%28Step-1%29-Understanding-the-different-terms` | ( Step 1) Understanding The Different Terms | 1 |
| `Guides/%28Step-3%29-Creating-Your-First-Mob` | ( Step 3) Creating Your First Mob | 2 |
| `Guides/%28Step-4%29-Essential-Commands` | ( Step 4) Essential Commands | 1 |
| `Guides/Health-Displays` | Health Displays | 1 |
| `Guides/Making-An-NPC` | Making An N P C | 2 |
| `Guides/Your-First-Random-Spawn` | Your First Random Spawn | 2 |
| `Items/Attributes` | Attributes | 32 |
| `Items/Firework` | Firework | 5 |
| `Items/Items` | Items | 58 |
| `Items/Options` | Options | 17 |
| `Items/Potions` | Potions | 1 |
| `Mobs/BossBar` | Boss Bar | 3 |
| `Mobs/Disguises` | Disguises | 2 |
| `Mobs/DisplayOptions` | Display Options | 26 |
| `Mobs/Equipment` | Equipment | 2 |
| `Mobs/MannequinOptions` | Mannequin Options | 10 |
| `Mobs/Mobs` | Mobs | 28 |
| `Mobs/Mobs/Unstable-Entity-Types` | Unstable Entity Types | 29 |
| `Mobs/Options` | Options | 146 |
| `Mobs/Templates` | Templates | 1 |
| `Model-Engine` | Model Engine | 1 |
| `Random-Spawns` | Random Spawns | 1 |
| `Skills/Intratick-Scheduling` | Intratick Scheduling | 2 |
| `Skills/SkillTrees` | Skill Trees | 4 |
| `Skills/Tags/Mechanic-Tags` | Mechanic Tags | 4 |
| `Skills/Variables` | Variables | 11 |
| `Stats` | Stats | 32 |
| `Wiki-Editors-Resources/Wiki-Editors-Resources` | Wiki Editors Resources | 2 |
| `changelogs/2.0.x_changelogs` | 2.0.X Changelogs | 15 |
| `changelogs/2.4.x_changelogs` | 2.4.X Changelogs | 3 |
| `changelogs/2.5.x_changelogs` | 2.5.X Changelogs | 2 |
| `changelogs/4.0.x_changelogs` | 4.0.X Changelogs | 5 |
| `changelogs/4.13.x_changelogs` | 4.13.X Changelogs | 1 |
| `changelogs/4.14.x_changelogs` | 4.14.X Changelogs | 1 |
| `changelogs/4.2.x_changelogs` | 4.2.X Changelogs | 1 |
| `changelogs/4.3.x_changelogs` | 4.3.X Changelogs | 1 |
| `changelogs/4.4.x_changelogs` | 4.4.X Changelogs | 3 |
| `changelogs/4.5.x_changelogs` | 4.5.X Changelogs | 1 |
| `changelogs/4.6.x_changelogs` | 4.6.X Changelogs | 3 |
| `changelogs/4.8.x_changelogs` | 4.8.X Changelogs | 2 |
| `changelogs/4.9.x_changelogs` | 4.9.X Changelogs | 1 |
| `changelogs/5.3.x_changelogs` | 5.3.X Changelogs | 1 |
| `changelogs/5.9.x_changelogs` | 5.9.X Changelogs | 1 |
| `changelogs/Changelogs` | Changelog | 15 |
| `changelogs/pre-2.0_changelogs` | Pre 2.0 Changelogs | 10 |
| `drops/DropTables` | Drop Tables | 2 |
| `drops/Drops` | Drops | 5 |
| `drops/FancyDrops` | Fancy Drops | 17 |

## 五、已知缺口

1. 少数组件页没有参数表（如 `Cancel Skill`），wiki 原文就写着 *This mechanic has no attributes*，属正常。
2. `inherits` 只记录了 wiki 里明写“继承某组件全部属性”的 34 个组件，继承来的参数没有展开合并。
3. 分类按 wiki 面包屑判定；`Skills/Mechanics/Particle/Particle-Types/*` 归入 `particles`。
4. 中文释义是人工整理的常用子集，未覆盖全部 1526 个参数。
