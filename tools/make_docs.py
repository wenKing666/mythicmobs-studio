#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成中文文档: 字段对照表 + 数据索引 + 全量清单"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(HERE, "data")
DOCS = os.path.join(HERE, "docs")


def load_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main():
    os.makedirs(DOCS, exist_ok=True)
    wiki = load_json(os.path.join(DATA, "mythicmobs-wiki.json"))
    zh = load_json(os.path.join(DATA, "zh", "glossary.json"))
    meta = wiki["meta"]
    schema = wiki["schema"]
    docs = wiki["docs"]

    # ---------- 校验 glossary 键名是否真实存在 ----------
    known = {
        "mob": {f["name"] for f in docs["Mobs/Mobs"]["fields"]},
        "item": {f["name"] for f in docs["Items/Items"]["fields"]},
        "mob_options": {f["name"] for f in docs["Mobs/Options"]["fields"]},
        "item_options": {f["name"] for f in docs["Items/Options"]["fields"]},
    }
    unknown = []
    for sec, keys in zh.items():
        if sec.startswith("_") or sec in ("kind", "attribute_operation"):
            continue
        for k in keys:
            if k not in known.get(sec, set()):
                unknown.append(f"{sec}.{k}")

    # ---------- 字段对照 md ----------
    lines = ["# MythicMobs 字段中文对照", "",
             "> 键名必须保持英文（它就是写进 YAML 的真实键），这里只提供中文释义，供编辑器做 label / tooltip。",
             "> 非官方翻译，按实际语义人工整理；未列出的字段说明 wiki 原文本身描述足够清楚。", ""]
    titles = [("mob", "怪物顶层字段", "Mobs/Mobs"),
              ("item", "物品顶层字段", "Items/Items"),
              ("mob_options", "怪物 Options 选项", "Mobs/Options"),
              ("item_options", "物品 Options 选项", "Items/Options")]
    for sec, title, page in titles:
        total = len(docs[page]["fields"])
        lines += [f"## {title}（{len(zh[sec])} / {total}）", "",
                  "| 键名 | 中文释义 |", "|---|---|"]
        for k, v in zh[sec].items():
            lines.append(f"| `{k}` | {v} |")
        lines.append("")
    lines += ["## 属性修饰符 Operation", "", "| 值 | 说明 |", "|---|---|"]
    for k, v in zh["attribute_operation"].items():
        lines.append(f"| `{k}` | {v} |")
    lines.append("")
    with open(os.path.join(DOCS, "字段中文对照.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # ---------- 数据索引 md ----------
    idx = ["# MythicMobs Wiki 结构化数据", "",
           f"> 抓取源：{meta['source']}　｜　生成时间：{meta['generated_at']}",
           f"> 原始页面 {meta['crawled_pages']} 个，按正文去重后 {meta['unique_pages']} 个。", "",
           "## 一、文件清单", "",
           "| 文件 | 内容 |", "|---|---|",
           "| `data/schema.json` | **编辑器主数据**：机制/条件/目标器/触发器/粒子/AI 组件，含参数表 |",
           "| `data/mythicmobs-wiki.json` | 全量数据：schema + 文档页 + 每页 markdown 正文 |",
           "| `data/zh/glossary.json` | 常用字段中文对照 |",
           "| `data/raw/*.html` | 原始页面缓存（离线可复现，可删） |",
           "| `data/index.md` | 本文件 |",
           "| `data/index-full.md` | 全部组件名清单 |",
           "| `docs/字段中文对照.md` | 中文释义表 |", "",
           "## 二、规模", "",
           "| 类别 | 条数 | 说明 |", "|---|---:|---|"]
    desc = {
        "mechanics": "写在 `Skills:` 下，形如 `- 机制名{参数=值}`",
        "conditions": "`Conditions:` 列表或行内 `?条件`",
        "targeters": "行尾的 `@Targeter{...}`",
        "triggers": "行尾的 `~onXXX`",
        "particles": "`particle{}` 里 particle 的取值",
        "ai-goals": "怪物 `AIGoalSelectors:` 的取值",
        "ai-targets": "怪物 `AITargetSelectors:` 的取值",
    }
    for k, label in [("mechanics", "技能机制"), ("conditions", "条件"), ("targeters", "目标选择器"),
                     ("triggers", "触发器"), ("particles", "粒子类型"),
                     ("ai-goals", "AI 行为"), ("ai-targets", "AI 目标")]:
        idx.append(f"| {label} | {len(schema[k])} | {desc[k]} |")
    idx += ["", f"参数条目合计 **{meta['total_attributes']}** 条，配置示例 **{meta['total_examples']}** 段。", "",
            "## 三、单条记录的结构", "",
            "```jsonc", "{",
            '  "name": "Activatespawner",            // 组件名（在 YAML 里就是它）',
            '  "aliases": ["as"],                    // 别名，可直接替换使用',
            '  "description": "Activates a ...",     // 一句话说明',
            '  "inherits": "",                       // 若继承其它组件, 写在这里(如 Aura)',
            '  "attributes": [                       // 参数表',
            '    {"name": "spawners", "aliases": ["spawner","s"],',
            '     "description": "The name of ...", "default": "NONE"}',
            "  ],",
            '  "fields": [],                          // 文档页专用: 小标题形式的字段',
            '  "examples": ["Skills:\\n- activatespawner{spawner=BossAdd}"],',
            '  "url": "https://wiki.mythiccraft.io/..."',
            "}", "```", "",
            "## 四、文档页（怪物 / 物品 / 掉落 / 刷怪）", "",
            "| 路径 | 标题 | 字段数 |", "|---|---|---:|"]
    for key in sorted(docs):
        d = docs[key]
        if d["fields"]:
            idx.append(f"| `{key}` | {d['title']} | {len(d['fields'])} |")
    idx += ["", "## 五、已知缺口", "",
            "1. 少数组件页没有参数表（如 `Cancel Skill`），wiki 原文就写着 *This mechanic has no attributes*，属正常。",
            "2. `inherits` 只记录了 wiki 里明写“继承某组件全部属性”的 34 个组件，继承来的参数没有展开合并。",
            "3. 分类按 wiki 面包屑判定；`Skills/Mechanics/Particle/Particle-Types/*` 归入 `particles`。",
            "4. 中文释义是人工整理的常用子集，未覆盖全部 1526 个参数。", ""]
    with open(os.path.join(DATA, "index.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(idx))

    # ---------- 全量清单 ----------
    full = ["# 全量组件清单", ""]
    for k, label in [("mechanics", "技能机制"), ("conditions", "条件"), ("targeters", "目标选择器"),
                     ("triggers", "触发器"), ("particles", "粒子类型"),
                     ("ai-goals", "AI 行为"), ("ai-targets", "AI 目标")]:
        names = sorted(schema[k], key=str.lower)
        full += [f"## {label}（{len(names)}）", "",
                 "、".join(f"`{n}`" for n in names), ""]
    with open(os.path.join(DATA, "index-full.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(full))

    print("生成:")
    print("  docs/字段中文对照.md")
    print("  data/index.md")
    print("  data/index-full.md")
    if unknown:
        print(f"\n⚠ glossary 里有 {len(unknown)} 个键在数据中找不到: {unknown[:10]}")
    else:
        print("\n✓ glossary 键名全部与数据匹配")
    return 0


if __name__ == "__main__":
    sys.exit(main())
