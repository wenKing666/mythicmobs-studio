#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 data/schema.json 加工成运行时可直接用的全量目录 app/js/catalog.js。

wiki 的参数表只有 Attribute / Aliases / Description / Default 四列，没有类型列，
所以 type 必须推断。推断信号按可靠性排序：
  1. 官方 examples 里该参数的真实取值形态（最强）
  2. 参数名语义词典（563 个唯一名里高频的那批）
  3. default 值的形态（true/false、纯数字）
  4. description 里的关键词（whether / amount / range）

输出：
  app/js/catalog.js   全量组件（机制 / 条件 / 目标器 / 触发器 / 粒子 / 通用属性）
  data/catalog-report.json  推断置信度统计，供人工抽检

用法：python tools/build_catalog.py
"""
import json
import re
import collections
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "data" / "schema.json"
ZH_DIR = ROOT / "data" / "zh"
OUT_JS = ROOT / "app" / "js" / "catalog.js"
OUT_REPORT = ROOT / "data" / "catalog-report.json"

# 中文名按组件类型分文件存放，便于增量维护
ZH_FILES = {
    "mechanics": "mechanics.json",
    "conditions": "conditions.json",
    "targeters": "targeters.json",
    "triggers": "triggers.json",
    "particles": "particles.json",
    "params": "params.json",
}


def load_zh():
    out = {}
    for key, fn in ZH_FILES.items():
        p = ZH_DIR / fn
        out[key] = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    return out

# ---------------------------------------------------------------- 语义词典

NUM_WORDS = {
    "amount", "damage", "damageamount", "value", "health", "hp", "maxhealth", "mana",
    "level", "duration", "ticks", "interval", "delay", "radius", "r", "range",
    "distance", "x", "y", "z", "xoffset", "yoffset", "zoffset", "speed", "velocity",
    "pitch", "yaw", "volume", "chance", "points", "count", "number", "limit",
    "maxdistance", "mindistance", "height", "width", "depth", "angle", "rotation",
    "scale", "size", "power", "force", "knockback", "spread", "period", "time",
    "seconds", "minutes", "exp", "money", "price", "temperature", "food",
    "saturation", "cooldown", "repeat", "repeatinterval", "targetinterval",
    "amplifier", "powerlevel", "threat", "percent", "percentage", "ratio", "multiplier",
    "vx", "vy", "vz", "max", "min", "step", "stride", "density", "frequency",
    "lifetime", "lifespan", "warmup", "cooldownseconds", "hppercent", "healthpercent",
}

BOOL_WORDS = {
    "force", "silent", "glow", "glowing", "invisible", "collide", "collidable",
    "cancel", "cancelevent", "exact", "relative", "absolute", "reverse", "override",
    "prevent", "allow", "invert", "negate", "drop", "spawn", "follow", "mustsee",
    "gravity", "onlynatural", "powers", "percentages", "includeabsorption",
    "fromorigin", "targetisorigin", "targetcreative", "splitpower", "faulty",
    "forcesync", "playeronly", "onlyplayers", "onlymobs", "nodamage", "noai",
    "ignorearmor", "ignoreinvulnerability", "settarget", "removetarget",
    "clear", "reset", "remove", "delete", "hide", "show", "lock", "unlock",
    "enabled", "enable", "disable", "noair", "nogravity", "dropself",
    "targetself", "casterisonly", "playonce", "loop", "loopmode", "inherit",
    "respectarmor", "ignorerange", "instant", "continuous",
}

ENUM_WORDS = {
    "type", "mode", "action", "slot", "audience", "style", "shape", "sort", "order",
    "direction", "stage", "phase", "reason", "source", "operation", "attribute",
    "targeter", "mechanic", "trigger", "particle", "sound", "item", "material",
    "mob", "entity", "potion", "effect", "enchantment", "biome", "world", "block",
    "damagecause", "damagetype", "objective", "projectile", "model", "skin",
}

TEXT_WORDS = {
    "message", "text", "string", "name", "display", "displayname", "title",
    "subtitle", "command", "cmd", "lore", "tag", "id", "key", "entry", "formula",
    "expression", "identifier", "url", "link", "prefix", "suffix", "format",
    "texture", "value_string", "metadata", "nbt", "json", "raw",
}

# 参数名 → 候选枚举表（复用 data.js 已有的静态表，命名对应 catalog.enums）
ENUM_TABLE_OF = {
    "particle": "particles",
    "sound": "sounds",
    "item": "materials",
    "material": "materials",
    "block": "materials",
    "mob": "entities",
    "entity": "entities",
    "potion": "potionEffects",
    "effect": "potionEffects",
    "enchantment": "enchantments",
    "attribute": "attributes",
    "biome": "biomes",
    "damagetype": "damageTypes",
    "slot": "equipSlots",
    "operation": "attrOps",
    "targeter": "targeters",
    "mechanic": "mechanics",
}

# ---------------------------------------------------------------- 分组

GROUPS = [
    ("damage", "伤害与攻击", [
        "damage", "attack", "arrow", "projectile", "missile", "sword", "melee",
        "knockback", "explosion", "explode", "ignite", "fire", "burn", "poison",
        "wither", "lightning", "strike", "beam", "bullet", "shoot", "launch",
        "throw", "punch", "hit", "death", "kill", "damaging",
    ]),
    ("heal", "治疗与生命", [
        "heal", "health", "regen", "revive", "resurrect", "respawn", "life",
        "absorb", "shield", "hunger", "food", "saturat", "cure",
    ]),
    ("state", "状态与药水", [
        "potion", "effect", "aura", "buff", "debuff", "stance", "mount",
        "disguise", "invisib", "glow", "freeze", "slow", "speed", "levitat",
        "attribute", "equip", "enchant", "stun", "root",
    ]),
    ("move", "移动与位移", [
        "teleport", "moveto", "move", "dash", "jump", "leap", "push", "pull",
        "throw", "velocity", "vector", "orbit", "spin", "rotate", "follow",
        "path", "goto", "runai", "nav",
    ]),
    ("visual", "粒子与特效", [
        "particle", "effect", "visual", "animation", "animate", "model",
        "glow", "trail", "helix", "ring", "sphere", "circle", "line", "arc",
        "tornado", "beam", "smoke", "flame", "aura",
    ]),
    ("sound", "音效与音乐", [
        "sound", "music", "note", "play", "audio", "jingle", "voice",
    ]),
    ("item", "物品与装备", [
        "item", "give", "drop", "equip", "inventory", "loot", "trade", "shop",
        "currency", "money", "enchant", "durab", "repair", "craft", "bottle",
        "bucket", "armor", "weapon", "tool", "pickup", "spray",
    ]),
    ("entity", "实体与生成", [
        "summon", "spawn", "mob", "entity", "despawn", "remove", "mount",
        "summonarea", "projectile", "armorstand", "stand", "npc", "pet",
        "breed", "tame", "leash", "disguise", "dragon",
    ]),
    ("flow", "流程与控制", [
        "delay", "repeat", "skill", "meta", "if", "else", "while", "loop",
        "foreach", "cancel", "end", "stop", "chain", "branch", "switch",
        "random", "probability", "condition", "wait", "sync", "runai",
        "setvar", "variable", "score", "math", "calc", "flag", "tag",
        "command", "console", "permission", "money", "mythicdrop",
    ]),
    ("ui", "消息与界面", [
        "message", "actionbar", "actionmessage", "title", "subtitle", "bossbar",
        "jsonmessage", "chat", "gui", "menu", "dialog", "book", "sign",
        "holo", "hologram", "toast", "tab", "scoreboard", "announce",
        "blackscreen", "cinematic", "camera",
    ]),
    ("world", "世界与方块", [
        "block", "piston", "physics", "chest", "fawepaste", "fillchest",
        "tracklocation", "region", "claim", "weather", "time", "explosion",
        "onblock", "oninteract", "onswing", "swing", "world", "spawner",
    ]),
]

GROUP_FALLBACK = ("misc", "其他机制")

# 形如 "EnderDragon*" 这类插件联动机制单独归一
GROUP_PREFIXES = [
    ("EnderDragon", "entity"),
    ("Guardian", "damage"),
    ("Geyser", "entity"),
    ("Disguise", "state"),
    ("Mythic", "flow"),
    ("Item", "item"),
    ("Particle", "visual"),
    ("Sound", "sound"),
    ("Skill", "flow"),
    ("Model", "visual"),
]


def guess_group(name):
    low = name.lower()
    for kw, gid, _ in [(k, g, t) for g, t, ks in GROUPS for k in ks]:
        if kw in low:
            return gid
    for pref, gid in GROUP_PREFIXES:
        if name.startswith(pref):
            return gid
    return GROUP_FALLBACK[0]


GROUP_TITLES = dict([(g, t) for g, t, _ in GROUPS] + [GROUP_FALLBACK])

# 关键词猜不出来的，按语义人工归类（id 全部小写无空格）
HAND_GROUPS = {
    "atom": "visual", "barset": "ui", "bloodyscreen": "ui", "bonemeal": "world",
    "bossborder": "world", "bouncy": "state", "cast": "flow",
    "clearexperience": "state", "clearexperiencelevels": "state",
    "cleartarget": "entity", "clearthreat": "entity", "consume": "heal",
    "consumeslot": "item", "decapitate": "damage", "disengage": "move",
    "doppleganger": "entity", "ejectpassenger": "entity", "fear": "state",
    "feed": "heal", "fly": "move", "foreach": "flow", "foreachpin": "flow",
    "foreachvalue": "flow", "globalcooldown": "flow", "goatram": "damage",
    "hide": "state", "log": "flow", "look": "move", "lunge": "move",
    "matchrotation": "move", "onkeypress": "flow", "onkeyrelease": "flow",
    "oxygen": "heal", "polygon": "flow", "printparenttree": "flow",
    "prison": "world", "propel": "move", "rally": "entity", "raytrace": "flow",
    "raytraceto": "flow", "recoil": "ui", "resetai": "entity", "saddle": "entity",
    "setai": "entity", "setchunkforceloaded": "world", "setcollidable": "entity",
    "setfaction": "entity", "setflying": "move", "setgamemode": "state",
    "setgliding": "move", "setgravity": "move", "setinteractionsize": "entity",
    "setlevel": "entity", "setmaterialcooldown": "flow", "setname": "state",
    "setowner": "entity", "setparent": "entity", "setpitch": "move",
    "setpose": "state", "setraidercanjoinraid": "entity",
    "setraiderpatrolleader": "entity", "setrotation": "move",
    "settarget": "entity", "settonguetarget": "entity", "skybox": "ui",
    "slash": "flow", "speak": "ui", "suicide": "damage", "swap": "move",
    "takeexperiencelevels": "state", "taunt": "entity", "terminable": "flow",
    "threat": "entity", "thunderlevel": "world", "togglelever": "world",
    "togglesitting": "entity", "totem": "world", "totemofundying": "visual",
    "undopaste": "world", "volley": "damage", "wolfsit": "entity",
}

# ---------------------------------------------------------------- 类型推断


def classify_literal(v):
    """按字面量形态判断类型。返回 None 表示无信息。"""
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    low = s.lower()
    if low in ("true", "false"):
        return "boolean"
    if low in ("none", "null"):
        return None
    if re.fullmatch(r"-?\d+", s) or re.fullmatch(r"-?\d+\.\d+", s):
        return "number"
    if re.fullmatch(r"[<>]=?-?\d+(\.\d+)?", s) or re.fullmatch(r"=?[<>]=?-?\d+(\.\d+)?", s):
        return "number"
    if re.fullmatch(r"-?\d+(\.\d+)?\s*(to|\.\.|-)\s*-?\d+(\.\d+)?", low):
        return "number"
    if re.fullmatch(r"\d+(\.\d+)?%", s):
        return "number"
    if re.fullmatch(r"#?[0-9a-fA-F]{6}", s):
        return "color"
    return "text"


def collect_example_samples(comp):
    """从官方 examples 里抓 {k=v;...}，返回 参数名(含别名) -> 值列表。"""
    samples = collections.defaultdict(list)
    for ex in comp.get("examples") or []:
        for m in re.finditer(r"\{([^{}]*)\}", ex):
            for pair in m.group(1).split(";"):
                if "=" not in pair:
                    continue
                k, v = pair.split("=", 1)
                k = k.strip().lower()
                if not k:
                    continue
                samples[k].append(v.strip().strip('"').strip("'"))
    return samples


def infer_param(name, default, description, samples):
    """返回 (type, confidence, evidence)"""
    low = name.lower()
    votes = collections.Counter()
    evidence = []

    # 1. examples 实证
    vals = samples.get(low, [])
    if vals:
        t = collections.Counter()
        for v in vals:
            c = classify_literal(v)
            if c:
                t[c] += 1
        if t:
            best, n = t.most_common(1)[0]
            votes[best] += 6 * n
            evidence.append("examples:" + best)

    # 2. 别名也算（samples 里可能用别名赋值）
    #    由调用方把别名样本合并进来

    # 3. 参数名语义
    if low in BOOL_WORDS:
        votes["boolean"] += 4
        evidence.append("name:bool")
    if low in NUM_WORDS:
        votes["number"] += 4
        evidence.append("name:num")
    if low in ENUM_WORDS:
        votes["enum"] += 4
        evidence.append("name:enum")
    if low in TEXT_WORDS:
        votes["text"] += 4
        evidence.append("name:text")

    # 4. default 形态
    dt = classify_literal(default)
    if dt:
        votes[dt] += 2
        evidence.append("default:" + dt)

    # 5. description 关键词
    d = (description or "").lower()
    if "whether" in d or "if true" in d or "true or false" in d or "true/false" in d:
        votes["boolean"] += 2
        evidence.append("desc:bool")
    if re.match(r"\s*(should|does|is|has|can|if)\b", d):
        votes["boolean"] += 2
        evidence.append("desc:bool-open")
    if re.search(r"\bthe (amount|number|value|range|radius|distance|duration|angle|degrees)\b", d):
        votes["number"] += 1
    if "in seconds" in d or "in ticks" in d or "in blocks" in d:
        votes["number"] += 2
        evidence.append("desc:unit")
    if "comma-separated" in d or "comma separated" in d or "a list of" in d:
        votes["text"] += 1
        evidence.append("desc:list")

    # 6. 名称后缀语义：技能引用 / 条件引用
    if low.endswith("skill") or low.endswith("skills"):
        votes["skill"] += 6
        evidence.append("name:skillref")
    elif low.endswith("conditions") or low == "conditions":
        votes["condition"] += 6
        evidence.append("name:condref")

    if not votes:
        return "text", 0.3, "fallback"

    total = sum(votes.values())
    best, score = votes.most_common(1)[0]
    conf = score / total if total else 0.3
    return best, round(conf, 2), ",".join(evidence[:4])


def norm_default(v):
    if v is None:
        return ""
    s = str(v).strip()
    if s.upper() in ("NONE", "NULL"):
        return ""
    return s


def build_param(attr, samples, zh_params):
    name = attr.get("name", "")
    aliases = [a for a in (attr.get("aliases") or []) if a]
    # 合并别名样本
    local = dict(samples)
    for al in aliases:
        k = al.lower()
        if k in samples and k != name.lower():
            local.setdefault(name.lower(), []).extend(samples[k])
    ptype, conf, ev = infer_param(
        name, attr.get("default"), attr.get("description"), local
    )
    dflt = norm_default(attr.get("default"))
    """必填只认两种硬证据，别用「没默认值」推断：
       a) wiki 把 default 写成哨兵 NONE / NULL —— 说明没有合理默认，必须给
       b) 描述里明写 required / mandatory / must be given
       `default:` 留空只代表「空是合法的」，不代表必填（particle 的 mob/color、message 的 audience
       都留空但完全可选）。早期版本按 dflt=="" 判必填，结果 BOSS 模板自己都被拦下不让下载。"""
    raw_default = str(attr.get("default")).strip().upper() if attr.get("default") is not None else ""
    desc_low = (attr.get("description") or "").lower()
    required = bool(
        raw_default in ("NONE", "NULL")
        or re.search(r"\brequired\b|\bmandatory\b|\bmust be (set|given|specified|provided)\b", desc_low)
    )
    out = {
        "name": name,
        "type": ptype,
        "def": dflt,
        "required": required,
        "zh": zh_params.get(name) or zh_params.get(name.lower()) or "",
        "desc": attr.get("description") or "",
        "conf": conf,
    }
    if aliases:
        out["aliases"] = aliases
    if ptype == "enum":
        out["enum"] = ENUM_TABLE_OF.get(name.lower(), "")
    return out


def build_components(raw, kind, zh_names, zh_params, with_group=False):
    items = []
    for key, comp in raw.items():
        cid = key.lower().replace(" ", "")
        params = []
        samples = collect_example_samples(comp)
        for attr in comp.get("attributes") or []:
            # wiki 有时把多个参数挤在一行（如 "x1, y1, z1"），拆成独立参数
            names = [n.strip() for n in str(attr.get("name", "")).split(",") if n.strip()]
            if len(names) > 1:
                for n in names:
                    sub = dict(attr)
                    sub["name"] = n
                    params.append(build_param(sub, samples, zh_params))
            else:
                params.append(build_param(attr, samples, zh_params))
        desc = (comp.get("description") or "").strip()
        if len(desc) > 400:
            desc = desc[:400].rstrip() + "…"
        item = {
            "id": cid,
            "en": comp.get("name") or key,
            "zh": zh_names.get(cid, ""),
            "desc": desc,
            "params": params,
            "ex": [e[:220] for e in (comp.get("examples") or [])[:1]],
        }
        if with_group:
            item["group"] = HAND_GROUPS.get(cid) or guess_group(comp.get("name") or key)
        items.append(item)
    items.sort(key=lambda x: x["id"])
    return items


def js_dump(obj, indent=0):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def main():
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    zh = load_zh()
    zh_mech = zh["mechanics"]
    zh_cond = zh["conditions"]
    zh_targ = zh["targeters"]
    zh_trig = zh["triggers"]
    zh_particle = zh["particles"]
    zh_params = zh["params"]

    # 通用属性从 mechanics 里摘出来（wiki 把它当成一个叫 Mechanics 的条目）
    raw_mech = dict(schema.get("mechanics") or {})
    universal_raw = raw_mech.pop("Mechanics", None)
    universal = []
    if universal_raw:
        samples = collect_example_samples(universal_raw)
        for attr in universal_raw.get("attributes") or []:
            universal.append(build_param(attr, samples, zh_params))

    mechanics = build_components(raw_mech, "mechanic", zh_mech, zh_params, with_group=True)
    conditions = build_components(schema.get("conditions") or {}, "condition", zh_cond, zh_params)
    targeters = build_components(schema.get("targeters") or {}, "targeter", zh_targ, zh_params)
    triggers_raw = schema.get("triggers") or {}
    triggers = []
    if isinstance(triggers_raw, dict):
        for key, comp in triggers_raw.items():
            cid = key.lower().replace(" ", "")
            if isinstance(comp, dict):
                triggers.append({
                    "id": cid,
                    "en": comp.get("name") or key,
                    "zh": zh_trig.get(cid, ""),
                    "desc": (comp.get("description") or "").strip(),
                    "params": [],
                })
            else:
                triggers.append({"id": cid, "en": key, "zh": zh_trig.get(cid, ""), "desc": str(comp), "params": []})
        triggers.sort(key=lambda x: x["id"])

    particles = []
    for key, comp in (schema.get("particles") or {}).items():
        cid = key.lower().replace(" ", "_")
        particles.append({
            "id": cid,
            "en": comp.get("name") if isinstance(comp, dict) else key,
            "zh": zh_particle.get(cid, ""),
            "desc": (comp.get("description") or "").strip() if isinstance(comp, dict) else "",
        })
    particles.sort(key=lambda x: x["id"])

    # 统计
    all_params = [p for c in mechanics + conditions + targeters for p in c["params"]]
    conf_bucket = collections.Counter(
        "high" if p["conf"] >= 0.7 else ("mid" if p["conf"] >= 0.45 else "low")
        for p in all_params
    )
    type_count = collections.Counter(p["type"] for p in all_params)
    report = {
        "counts": {
            "mechanics": len(mechanics),
            "conditions": len(conditions),
            "targeters": len(targeters),
            "triggers": len(triggers),
            "particles": len(particles),
            "universal": len(universal),
            "params": len(all_params),
        },
        "types": dict(type_count),
        "confidence": dict(conf_bucket),
        "group_count": dict(collections.Counter(c["group"] for c in mechanics)),
        "misc_mechanics": [c["id"] for c in mechanics if c["group"] == "misc"],
        "no_param": [c["id"] for c in mechanics if not c["params"]],
        "missing_param_zh": sorted({p["name"] for c in mechanics + conditions + targeters
                                    for p in c["params"] if not p["zh"]}),
        "low_confidence": [
            {"component": c["id"], "param": p["name"], "type": p["type"],
             "def": p["def"], "desc": p["desc"][:90]}
            for c in mechanics for p in c["params"] if p["conf"] < 0.45
        ][:200],
        "missing_zh": {
            "mechanics": [c["id"] for c in mechanics if not c["zh"]],
            "conditions": [c["id"] for c in conditions if not c["zh"]],
            "targeters": [c["id"] for c in targeters if not c["zh"]],
            "triggers": [c["id"] for c in triggers if not c["zh"]],
        },
    }

    payload = {
        "meta": {
            "source": "data/schema.json",
            "built": "tools/build_catalog.py",
            "counts": report["counts"],
        },
        "groups": [{"id": g, "title": t} for g, t, _ in GROUPS] + [{"id": GROUP_FALLBACK[0], "title": GROUP_FALLBACK[1]}],
        "universal": universal,
        "mechanics": mechanics,
        "conditions": conditions,
        "targeters": targeters,
        "triggers": triggers,
        "particles": particles,
    }

    body = (
        "/* 自动生成，请勿手改 —— 改动请编辑 tools/build_catalog.py 后重跑。\n"
        "   数据源：data/schema.json（wiki.mythiccraft.io），中文名见 data/zh/names.json */\n"
        "window.MM_CATALOG = " + js_dump(payload) + ";\n"
    )
    OUT_JS.write_text(body, encoding="utf-8", newline="\n")
    OUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")

    print("catalog.js %.1f KB" % (OUT_JS.stat().st_size / 1024))
    print("组件:", report["counts"])
    print("参数类型:", dict(type_count))
    print("置信度:", dict(conf_bucket))
    print("分组:", dict(report["group_count"]))
    print("缺中文: 机制 %d / 条件 %d / 目标器 %d / 触发器 %d" % (
        len(report["missing_zh"]["mechanics"]), len(report["missing_zh"]["conditions"]),
        len(report["missing_zh"]["targeters"]), len(report["missing_zh"]["triggers"])))


if __name__ == "__main__":
    main()
