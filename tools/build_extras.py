#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 wiki 里「不像技能组件那样规整」的几批数据加工成 app/js/extras-data.js。

为什么单独一个脚本：build_catalog.py 吃的是 data/schema.json，那里面只有
机制/条件/目标器/触发器/粒子/AI 六类。伤害类型、掉落类型、物品选项、物品组件
只存在于 data/raw 的 HTML 表格里，字段形态也各不相同（有的是 Tag|Description|Default
三列，有的是 Modifier|Explanation 两列），硬塞进 schema 会让两边都变脏。

数据源：
  data/raw/mythicmobs__Mobs__DamageModifiers.html   -> damageTypes
  data/raw/mythicmobs__drops__Drops.html            -> dropTypes
  data/raw/mythicmobs__Items__Options.html          -> itemOptions
  data/raw/mythicmobs__Items__Items.html            -> itemComponents
中文：data/zh/items.json

用法：python tools/build_extras.py
"""
import io
import json
import re
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
ZH = ROOT / "data" / "zh" / "items.json"
OUT = ROOT / "app" / "js" / "extras-data.js"

# 物品组件里，前端做成「表单卡片」的那些。其余组件只给名字与说明，
# 前端统一走「其他字段（原样 YAML）」那条路，不硬凑输入框。
SIMPLE_COMPONENTS = {
    "ItemName", "CustomModelData", "MaxDurability", "Rarity", "Enchantability",
    "DamageResistant", "UnsetComponents", "Glider", "TooltipStyle", "AttackRange",
    "Repairable", "Group", "Hidden", "Durability", "Amount", "Template",
    "Consumable", "Food", "Equippable", "Tool", "UseCooldown",
    "CookingFuel", "BrewingFuel",
}

# 有子键但 wiki 没给表格的（只在例子里出现），手工补
MANUAL_PARAMS = {
    "Consumable": [
        {"name": "ConsumeSeconds", "type": "number", "def": ""},
        {"name": "HasParticles", "type": "boolean", "def": "true"},
        {"name": "Animation", "type": "enum", "def": "EAT",
         "enum": "EAT,DRINK,BLOCK,SPYGLASS,BOW,TRIDENT,SPEAR,CROSSBOW,NONE"},
        {"name": "Sound", "type": "text", "def": ""},
        {"name": "ConsumeEffects", "type": "text", "def": ""},
    ],
    "Food": [
        {"name": "Nutrition", "type": "number", "def": ""},
        {"name": "Saturation", "type": "number", "def": ""},
        {"name": "CanAlwaysEat", "type": "boolean", "def": "false"},
    ],
    "UnsetComponents": [{"name": "Components", "type": "list", "def": "", "list": True}],
}

# 类型兜底：表格里没有类型列，按默认值与描述猜，猜不出的按 text
TYPE_OVERRIDE = {
    "Slot": "enum", "Animation": "enum", "CooldownSeconds": "number",
    "Rooty": "number", "DamagePerBlock": "number",
}
ENUM_OVERRIDE = {
    "Slot": "HEAD,CHEST,LEGS,FEET,HAND,OFF_HAND,BODY,SADDLE",
}


# 物品选项里描述没写「Defaults to」的那几个，类型与默认值手工钉死
OPTION_FIX = {
    "StackSize": ("number", "64"),
    "GenerateUUID": ("boolean", "false"),
    "GenerateTimestamp": ("boolean", "false"),
    "HideFlags": ("boolean", "false"),
    "ItemModel": ("text", ""),
    "Color": ("text", ""),
    "DamageType": ("text", ""),
    "PreventStacking": ("boolean", "false"),
}

# 掉落类型在配置里的常见别名：wiki 表里写 command，官方例子里写的是 cmd
DROP_ALIASES = {
    "cmd": ["command"],
    "exp": ["experience"],
    "money": ["vault"],
}

# 掉落类型表里带空格的写法要归一到实际用的 id
DROP_ID_FIX = {
    "MythicMob": "mythicmob",
    "Mythic Item": "mythicitem",
    "VanillaLootTable": "vanillaloottable",
    "ItemVariable": "itemvariable",
    "command": "cmd",
}


def text_of(htmlfrag):
    s = re.sub(r"<[^>]+>", " ", htmlfrag)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def tables(page):
    """返回页面里所有表格，每个表格是二维字符串数组。"""
    s = RAW.joinpath(page).read_text(encoding="utf-8", errors="ignore")
    s = re.sub(r"<script[\s\S]*?</script>", "", s)
    out = []
    for t in re.findall(r"<table[\s\S]*?</table>", s):
        rows = []
        for r in re.findall(r"<tr[\s\S]*?</tr>", t):
            cells = re.findall(r"<t[hd][^>]*>([\s\S]*?)</t[hd]>", r)
            if cells:
                rows.append([text_of(c) for c in cells])
        if rows:
            out.append(rows)
    return out


def sections(page):
    """按 h1-h4 切页，返回 [(level, id, title, html_rest)]。"""
    s = RAW.joinpath(page).read_text(encoding="utf-8", errors="ignore")
    i = s.find('<div class="wiki-content">')
    body = s[i:] if i >= 0 else s
    parts = re.split(r'<h([1-4]) id="([^"]+)"[^>]*>([\s\S]*?)</h\1>', body)
    seq = parts[1:]
    out = []
    for n in range(0, len(seq), 4):
        out.append((seq[n], seq[n + 1], text_of(seq[n + 2]), seq[n + 3]))
    return out


def guess_type(name, default, desc):
    if name in TYPE_OVERRIDE:
        return TYPE_OVERRIDE[name]
    d = (default or "").strip().lower()
    if d in ("true", "false"):
        return "boolean"
    if re.fullmatch(r"-?\d+(\.\d+)?", d):
        return "number"
    low = (desc or "").lower()
    if low.startswith("whether") or low.startswith("if ") or "true or false" in low:
        return "boolean"
    return "text"


def default_of(desc):
    m = re.search(r"Defaults? to\s+`?([^`.\s]+)`?", desc or "", re.I)
    return m.group(1) if m else ""


# ---------------------------------------------------------------- 各批次

def build_damage(zh):
    rows = tables("mythicmobs__Mobs__DamageModifiers.html")
    table = next((r for r in rows if r and r[0][0].lower() == "modifier"), None)
    if not table:
        raise SystemExit("没找到 DamageModifiers 的 Modifier 表")
    out = []
    for r in table[1:]:
        if len(r) < 2 or not r[0]:
            continue
        cid = r[0].strip()
        out.append({
            "id": cid,
            "zh": (zh.get("damage") or {}).get(cid, cid),
            "desc": r[1],
        })
    return out


def build_drop_types(zh):
    rows = tables("mythicmobs__drops__Drops.html")
    table = next((r for r in rows if r and r[0][0].lower() == "type"), None)
    if not table:
        raise SystemExit("没找到 Drops 的 Type 表")
    out = []
    for r in table[1:]:
        if not r or not r[0]:
            continue
        raw = r[0].strip()
        cid = DROP_ID_FIX.get(raw) or raw.split()[0].lower()
        ex = (r[2] if len(r) > 2 else "").strip()
        item = {
            "id": cid,
            "en": raw,
            "zh": (zh.get("dropTypes") or {}).get(cid, raw),
            "desc": r[1] if len(r) > 1 else "",
            "ex": ex,
        }
        if DROP_ALIASES.get(cid):
            item["aliases"] = DROP_ALIASES[cid]
        out.append(item)
    # wiki 表里没列、但 MythicMobs 支持的两种最常用落法
    known = {d["id"] for d in out}
    for extra in [
        {"id": "minecraftitem", "en": "vanilla item", "zh": "原版物品",
         "desc": "直接写材质名，最常用的一种。", "ex": "- diamond 1 0.5"},
        {"id": "mythicitem", "en": "Mythic Item", "zh": "MythicMobs 物品",
         "desc": "掉落 MythicMobs 自己定义的物品。", "ex": "- myCustomSword 1 0.1"},
    ]:
        if extra["id"] not in known:
            out.append(extra)
    return out


def build_item_options(zh):
    out = []
    sec = ""
    for lvl, hid, title, rest in sections("mythicmobs__Items__Options.html"):
        if lvl == "1":
            sec = title
            continue
        if lvl not in ("3", "4"):
            continue
        pm = re.search(r"<p>([\s\S]*?)</p>", rest)
        desc = text_of(pm.group(1)) if pm else ""
        ex = ""
        cm = re.search(r"<pre><code[^>]*>([\s\S]*?)</code></pre>", rest)
        if cm:
            ex = html.unescape(cm.group(1)).strip()
        cid = title.replace(" ", "")
        dflt = default_of(desc)
        ptype = guess_type(cid, dflt, desc)
        if cid in OPTION_FIX:
            ptype, dflt = OPTION_FIX[cid]
        out.append({
            "id": cid,
            "zh": (zh.get("options") or {}).get(cid, cid),
            "desc": desc,
            "section": sec,
            "def": dflt,
            "type": ptype,
            "ex": ex[:200],
        })
    return out


def build_item_components(zh):
    zc = zh.get("components") or {}
    out = []
    for lvl, hid, title, rest in sections("mythicmobs__Items__Items.html"):
        if lvl != "4":
            continue
        cid = title.replace(" ", "")
        pm = re.search(r"<p>([\s\S]*?)</p>", rest)
        desc = text_of(pm.group(1)) if pm else ""
        # 组件页里的 Tag|Description|Default 表
        params = []
        for r in re.findall(r"<table[\s\S]*?</table>", rest):
            rows = []
            for tr in re.findall(r"<tr[\s\S]*?</tr>", r):
                cells = re.findall(r"<t[hd][^>]*>([\s\S]*?)</t[hd]>", tr)
                if cells:
                    rows.append([text_of(c) for c in cells])
            if not rows or rows[0][0].lower() != "tag":
                continue
            for row in rows[1:]:
                if len(row) < 2 or not row[0]:
                    continue
                name, pdesc = row[0], row[1]
                dflt = row[2] if len(row) > 2 else ""
                params.append({
                    "name": name,
                    "type": guess_type(name, dflt, pdesc),
                    "def": "" if dflt.lower() in ("none", "") else dflt,
                    "desc": pdesc,
                })
        if not params and cid in MANUAL_PARAMS:
            params = [dict(p) for p in MANUAL_PARAMS[cid]]
        meta = zc.get(cid) or {}
        generic = zh.get("componentParams") or {}
        for p in params:
            p["zh"] = (meta.get("params") or {}).get(p["name"]) or generic.get(p["name"], "")
            if p["type"] == "enum" and p["name"] in ENUM_OVERRIDE:
                p["enum"] = ENUM_OVERRIDE[p["name"]]
        out.append({
            "id": cid,
            "zh": meta.get("zh") or cid,
            "desc": meta.get("desc") or desc[:200],
            "params": params,
            "form": cid in SIMPLE_COMPONENTS,
        })
    return out


def main():
    zh = json.loads(ZH.read_text(encoding="utf-8"))
    payload = {
        "meta": {
            "source": "data/raw（wiki.mythiccraft.io）+ data/zh/items.json",
            "built": "tools/build_extras.py",
        },
        "damageTypes": build_damage(zh),
        "dropTypes": build_drop_types(zh),
        "itemOptions": build_item_options(zh),
        "itemComponents": build_item_components(zh),
    }
    body = (
        "/* 自动生成，请勿手改 —— 改动请编辑 tools/build_extras.py 后重跑。\n"
        "   数据源：wiki 的 DamageModifiers / Drops / Items-Options / Items 页 */\n"
        "window.MM_EXTRAS = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    OUT.write_text(body, encoding="utf-8", newline="\n")
    print("extras-data.js %.1f KB" % (OUT.stat().st_size / 1024))
    print("伤害类型:", len(payload["damageTypes"]))
    print("掉落类型:", len(payload["dropTypes"]))
    print("物品选项:", len(payload["itemOptions"]))
    print("物品组件:", len(payload["itemComponents"]),
          "其中做成表单:", sum(1 for c in payload["itemComponents"] if c["form"]))
    miss = [p["name"] for c in payload["itemComponents"] for p in c["params"] if not p["zh"]]
    print("组件参数缺中文:", sorted(set(miss)))


if __name__ == "__main__":
    main()
