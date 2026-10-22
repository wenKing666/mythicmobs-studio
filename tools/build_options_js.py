#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 data/mob-options.json 变成前端可用的 app/js/options-data.js
   —— 126 个怪物 Options，全部中文名 + 一句话说明，按 通用 / 大类 / 专属 分组
"""
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "data", "mob-options.json")
DST = os.path.join(HERE, "app", "js", "options-data.js")

# key -> [中文名, 一句话说明]
ZH = {
    # --- 通用 ---
    "AlwaysShowName": ["始终显示名字", "名牌一直可见，不受距离影响"],
    "AttackSpeed": ["攻击速度", "每秒攻击次数，默认跟随原版"],
    "VisibleByDefault": ["默认可见", "生成或加载时是否可见"],
    "Invisible": ["永久隐身", "直接隐身，不用喝隐身药水"],
    "Collidable": ["有碰撞体积", "关掉后玩家可以从它身上穿过"],
    "DigOutOfGround": ["卡进方块自动上浮", "窒息时向上传送两格"],
    "Despawn": ["远离玩家后消失", "走远就移除，省服务器性能"],
    "FollowRange": ["索敌范围", "多少格内会锁定目标"],
    "Glowing": ["发光描边", "隔墙也能看到它的轮廓"],
    "HealOnReload": ["区块重载回血", "区块重新加载时恢复满血"],
    "Hidden": ["隐藏", "不出现在命令提示和怪物列表里"],
    "Invincible": ["无敌", "免疫一切伤害"],
    "Interactable": ["可被交互", "玩家能否右键它"],
    "LockPitch": ["锁定视角俯仰", "头不能上下看，只能平视"],
    "KnockbackResistance": ["击退抗性", "0~1，1 表示完全打不退"],
    "MaxCombatDistance": ["最大交战距离", "超过这个距离玩家就打不到它"],
    "MovementSpeed": ["移动速度", "0.2 左右是正常速度，1 以上会飘"],
    "NoAI": ["关闭 AI", "不会移动也不会攻击"],
    "NoDamageTicks": ["受伤无敌帧", "受伤后多少刻免疫，默认 10"],
    "NoGravity": ["不受重力", "不会下落（也不能用 velocity 技能）"],
    "PassthroughDamage": ["伤害转移给父实体", "伤害由它的父级承担"],
    "PreventItemPickup": ["不捡地上的物品", "默认就是开"],
    "PreventLeashing": ["免疫拴绳", "默认就是开"],
    "PreventMobKillDrops": ["击杀不掉落", "它杀死的目标不掉战利品"],
    "PreventOtherDrops": ["不掉原版掉落", "只掉 Drops 里写明的东西"],
    "PreventRandomEquipment": ["不随机穿装备", "避免僵尸自带盔甲"],
    "PreventRenaming": ["禁止改名", "命名牌对它无效"],
    "PreventSunburn": ["不被阳光烧", "僵尸、骷髅类必备"],
    "PreventTransformation": ["禁止转化", "不会变成溺尸、僵尸村民"],
    "PreventVanillaDamage": ["免疫原版伤害", "只受技能伤害"],
    "RepeatAllSkills": ["技能可重复触发", "允许同一个技能反复执行"],
    "ReviveHealth": ["复活血量", "被复活后回复到多少血"],
    "Scale": ["体型缩放", "1 是正常大小，-1 表示不设置"],
    "ShowHealth": ["显示血量", "名字下方显示血量数字"],
    "Silent": ["安静", "不播放原版音效"],
    "UseThreatTable": ["使用威胁表", "按仇恨值选择攻击目标"],
    "RandomizeProperties": ["随机属性", "生成时随机化部分属性"],
    "Type": ["变体类型", "例如橡木船 / 云杉船、职业等级"],

    # --- 大类 ---
    "Age": ["年龄", "幼年生物的成长计时"],
    "AgeLock": ["锁定年龄", "永远保持当前大小"],
    "Adult": ["强制成年", "生成时就是成年"],
    "Baby": ["强制幼年", "生成时就是幼年"],
    "Angry": ["愤怒状态", "中立生物是否被激怒"],
    "PreventSlimeSplit": ["禁止分裂", "史莱姆死亡时不再分裂"],
    "Size": ["尺寸", "史莱姆、岩浆怪的大小"],
    "CanJoinRaid": ["可加入袭击", "掠夺者袭击事件"],
    "PatrolLeader": ["巡逻队长", "生成时携带袭击旗帜"],
    "PatrolSpawnPoint": ["巡逻刷新点", "作为巡逻队的出生位置"],
    "Tameable": ["可驯服", "玩家能否用食物驯服它"],
    "PreventJockeyMounts": ["禁止骑乘组合", "不生成鸡骑士、蜘蛛骑士"],
    "PreventConversion": ["禁止转化", "不会被环境改变形态"],
    "ReinforcementsChance": ["增援概率", "僵尸受伤时召唤同伴的几率"],

    # --- 盔甲架 ---
    "CanMove": ["可移动", "是否响应移动"],
    "CanTick": ["参与 tick 更新", "关掉可省性能"],
    "HasArms": ["有手臂", "盔甲架是否显示两只手"],
    "HasBasePlate": ["有底座", "脚下那块石板"],
    "HasGravity": ["受重力", "会不会往下掉"],
    "ItemBody": ["身体装备", "胸甲槽"],
    "ItemFeet": ["脚部装备", "靴子槽"],
    "ItemHand": ["主手物品", "右手拿的东西"],
    "ItemOffhand": ["副手物品", "左手拿的东西"],
    "ItemHead": ["头部装备", "头盔槽"],
    "ItemLegs": ["腿部装备", "护腿槽"],
    "Marker": ["标记模式", "无碰撞无体积，只当坐标用"],
    "Small": ["小型", "缩小版"],
    "Pose": ["姿势", "站立、坐下、睡觉等"],

    # --- 各生物 ---
    "Anger": ["愤怒值", "越高越容易蜇人"],
    "HasNectar": ["带花粉", "采完花后身上有花粉"],
    "HasStung": ["已蜇过人", "蜇完后会失去螫针"],
    "PreventStingerLoss": ["不失去螫针", "蜇人后螫针还在"],
    "Saddled": ["已装鞍", "生成时就带着鞍"],
    "Tamed": ["已驯服", "生成时就是驯服状态"],
    "CatType": ["猫的品种", "黑猫、暹罗猫、橘猫等"],
    "CollarColor": ["项圈颜色", "猫和狼戴的项圈颜色"],
    "Variant": ["变体", "具体外观种类"],
    "Jockey": ["骑乘幼年生物", "让小僵尸骑在它身上"],
    "ExplosionRadius": ["爆炸半径", "苦力怕自爆的范围"],
    "FuseTicks": ["引信时长", "点燃后多久爆炸（游戏刻）"],
    "SuperCharged": ["高压状态", "闪电苦力怕，爆炸更强"],
    "PreventSuicide": ["禁止自爆", "苦力怕不会自爆"],
    "WeatheringState": ["氧化程度", "铜傀儡的氧化阶段"],
    "Waxed": ["已涂蜡", "阻止继续氧化"],
    "PreventTeleport": ["禁止传送", "末影人不会瞬移"],
    "HeldBlock": ["手持方块", "末影人手里抱的方块"],
    "Experience": ["经验值", "这团经验有多少经验"],
    "Block": ["方块类型", "落沙、铁砧这类下落方块"],
    "BlockData": ["方块数据", "方块的附加数据值"],
    "DropsItem": ["掉落自身方块", "摔碎后变成物品"],
    "HurtsEntities": ["砸伤生物", "落下时砸到生物会造成伤害"],
    "ReplaceSpawnLocationBlock": ["替换生成位置方块", "生成时替换脚下方块"],
    "UseSpawnLocationType": ["沿用生成位置方块", "使用原地点的方块类型"],
    "FoxType": ["狐狸种类", "红狐或雪狐"],
    "Screaming": ["尖叫山羊", "会主动撞生物"],
    "ImmuneToZombification": ["免疫僵尸化", "在下界以外不会变僵尸"],
    "Huntable": ["可被猎杀", "其他生物会不会攻击它"],
    "AbleToHunt": ["可狩猎", "会不会主动攻击疣猪兽"],
    "HorseArmor": ["马铠", "马身上穿的护甲"],
    "CarryingChest": ["携带箱子", "驴、骡背上的箱子"],
    "HorseColor": ["马毛色", "白、栗、黑等"],
    "HorseStyle": ["马花纹", "无纹、白斑、斑点等"],
    "HorseType": ["马的类型", "普通马、驴、骡、骷髅马等"],
    "Height": ["高", "交互实体的高度"],
    "Width": ["宽", "交互实体的宽度"],
    "Responsive": ["可响应", "是否响应交互"],
    "PlayerCreated": ["玩家建造", "玩家放出来的铁傀儡"],
    "Item": ["物品", "掉落物实体代表什么物品"],
    "Amount": ["数量", "这堆物品有几个"],
    "CanPickup": ["可拾取", "玩家能不能捡起来"],
    "Color": ["颜色", "羊驼、狼等的颜色"],
    "ChestContents": ["箱子内容", "运输矿车里的物品"],
    "MainGene": ["显性基因", "熊猫的主要性格"],
    "HiddenGene": ["隐性基因", "决定后代的隐藏基因"],
    "FlyingSpeed": ["飞行速度", "鹦鹉的飞行速度"],
    "IsKillerBunny": ["杀手兔", "会主动攻击玩家的兔子"],
    "RabbitType": ["兔子种类", "普通、杀手兔、Toast 等"],
    "Sheared": ["已剪毛", "生成时就是剪过毛的状态"],
    "PreventBlockInfection": ["禁止感染方块", "蠹虫不会把方块变成虫蚀方块"],
    "Derp": ["歪南瓜头", "雪傀儡头上的南瓜歪着戴"],
    "PreventSnowFormation": ["不留下雪迹", "走过的路不会积雪"],
    "ExplosionYield": ["爆炸威力", "TNT 的爆炸强度"],
    "Incendiary": ["点燃火焰", "爆炸后留下火焰"],
    "Pattern": ["花纹", "热带鱼的图案"],
    "BodyColor": ["身体颜色", "热带鱼的主色"],
    "HasTrades": ["有交易", "生成时自带交易选项"],
    "Profession": ["职业", "农民、铁匠、图书管理员等"],
    "Level": ["职业等级", "决定交易内容多少"],
}

# 需要显式指定类型/默认值的键（其余按默认值自动推断）
TYPE_OVERRIDE = {
    "MovementSpeed": ("number", 0.2),
    "FollowRange": ("number", 32),
    "KnockbackResistance": ("number", 0),
    "NoDamageTicks": ("number", 10),
    "MaxCombatDistance": ("number", 256),
    "Scale": ("number", -1),
    "Size": ("number", 1),
    "FlyingSpeed": ("number", -1),
    "ExplosionRadius": ("number", -1),
    "FuseTicks": ("number", -1),
    "ExplosionYield": ("number", -1),
    "Experience": ("number", 1),
    "Amount": ("number", 1),
    "Age": ("number", 0),
    "ReinforcementsChance": ("number", 0),
    "Anger": ("number", 0),
    "Level": ("number", 1),
    "Height": ("number", 1),
    "Width": ("number", 1),
    "BlockData": ("number", 0),
    "ReviveHealth": ("number", 0),
    "UseThreatTable": ("bool", False),
    "Adult": ("bool", False),
    "Baby": ("bool", False),
    "Angry": ("bool", False),
    "Type": ("text", ""),
    "Variant": ("text", ""),
    "Pose": ("text", ""),
    "CatType": ("text", ""),
    "CollarColor": ("text", ""),
    "HorseColor": ("text", ""),
    "HorseStyle": ("text", ""),
    "HorseType": ("text", ""),
    "HorseArmor": ("text", ""),
    "FoxType": ("text", ""),
    "Profession": ("text", ""),
    "RabbitType": ("text", ""),
    "MainGene": ("text", "NORMAL"),
    "HiddenGene": ("text", "NORMAL"),
    "Pattern": ("text", ""),
    "BodyColor": ("text", ""),
    "ItemBody": ("text", ""),
    "ItemFeet": ("text", ""),
    "ItemHand": ("text", ""),
    "ItemOffhand": ("text", ""),
    "ItemHead": ("text", ""),
    "ItemLegs": ("text", ""),
    "HeldBlock": ("text", "AIR"),
    "Block": ("text", "STONE"),
    "ChestContents": ("text", ""),
    "Item": ("text", "STONE"),
}

# wiki 的小标题 -> 对应生物 ID（用于自动展开相关分组）
SUB_ENTITIES = {
    "Boat & BoatChest": [],
    "Breedable mobs": ["COW", "PIG", "SHEEP", "CHICKEN", "WOLF", "CAT", "HORSE", "LLAMA", "RABBIT", "TURTLE", "PANDA", "FOX", "BEE", "GOAT", "STRIDER", "HOGLIN"],
    "Colorable Mobs": ["SHEEP", "WOLF", "CAT", "SHULKER", "LLAMA"],
    "Neutral Entities": ["WOLF", "BEE", "POLAR_BEAR", "PANDA", "LLAMA", "IRON_GOLEM", "DOLPHIN", "GOAT"],
    "Slimes & Magma Cubes": ["SLIME", "MAGMA_CUBE"],
    "Entities with variable size": ["SLIME", "MAGMA_CUBE", "PHANTOM"],
    "Raiders": ["PILLAGER", "VINDICATOR", "EVOKER", "ILLUSIONER", "RAVAGER", "WITCH"],
    "Tameable Mobs": ["WOLF", "CAT", "HORSE", "DONKEY", "MULE", "LLAMA", "PARROT"],
    "Zombies (all variants)": ["ZOMBIE", "ZOMBIE_VILLAGER", "HUSK", "DROWNED", "ZOMBIFIED_PIGLIN"],
    "Skeleton": ["SKELETON", "STRAY", "WITHER_SKELETON"],
    "Armor Stand": ["ARMOR_STAND"],
    "Bee": ["BEE"],
    "Camel": ["CAMEL"],
    "Cat": ["CAT"],
    "Cow": ["COW", "MOOSHROOM"],
    "Chicken": ["CHICKEN"],
    "Creepers": ["CREEPER"],
    "Copper_Golem": ["COPPER_GOLEM"],
    "Enderman": ["ENDERMAN"],
    "Experience_orb": [],
    "Falling Blocks": [],
    "Fox": ["FOX"],
    "Frog": ["FROG"],
    "Goat": ["GOAT"],
    "Hoglin": ["HOGLIN", "ZOGLIN"],
    "Horses, Donkeys, and Mules": ["HORSE", "DONKEY", "MULE", "SKELETON_HORSE", "ZOMBIE_HORSE"],
    "Interaction": [],
    "IronGolem": ["IRON_GOLEM"],
    "Item": [],
    "Llama": ["LLAMA", "TRADER_LLAMA"],
    "MinecartChest": [],
    "Panda": ["PANDA"],
    "Parrot": ["PARROT"],
    "Pig": ["PIG"],
    "Piglin": ["PIGLIN"],
    "Piglin Brute": ["PIGLIN_BRUTE"],
    "Rabbit": ["RABBIT"],
    "Sheep": ["SHEEP"],
    "Silverfish": ["SILVERFISH"],
    "Snow Golem": ["SNOW_GOLEM"],
    "TNT": [],
    "Tropical Fish": ["TROPICAL_FISH"],
    "Villagers": ["VILLAGER", "WANDERING_TRADER", "ZOMBIE_VILLAGER"],
    "Zombie Villagers": ["ZOMBIE_VILLAGER"],
    "Wolfs": ["WOLF"],
}

SUB_ZH = {
    "Boat & BoatChest": "船 / 运输船",
    "Breedable mobs": "可繁殖生物",
    "Colorable Mobs": "可染色生物",
    "Neutral Entities": "中立生物",
    "Slimes & Magma Cubes": "史莱姆 / 岩浆怪",
    "Entities with variable size": "体型可变生物",
    "Raiders": "袭击者",
    "Tameable Mobs": "可驯服生物",
    "Zombies (all variants)": "僵尸系",
    "Skeleton": "骷髅系",
    "Armor Stand": "盔甲架",
    "Bee": "蜜蜂",
    "Camel": "骆驼",
    "Cat": "猫",
    "Cow": "牛 / 哞菇",
    "Chicken": "鸡",
    "Creepers": "苦力怕",
    "Copper_Golem": "铜傀儡",
    "Enderman": "末影人",
    "Experience_orb": "经验球",
    "Falling Blocks": "下落方块",
    "Fox": "狐狸",
    "Frog": "青蛙",
    "Goat": "山羊",
    "Hoglin": "疣猪兽",
    "Horses, Donkeys, and Mules": "马 / 驴 / 骡",
    "Interaction": "交互实体",
    "IronGolem": "铁傀儡",
    "Item": "掉落物实体",
    "Llama": "羊驼",
    "MinecartChest": "运输矿车",
    "Panda": "熊猫",
    "Parrot": "鹦鹉",
    "Pig": "猪",
    "Piglin": "猪灵",
    "Piglin Brute": "猪灵蛮兵",
    "Rabbit": "兔子",
    "Sheep": "羊",
    "Silverfish": "蠹虫",
    "Snow Golem": "雪傀儡",
    "TNT": "TNT",
    "Tropical Fish": "热带鱼",
    "Villagers": "村民",
    "Zombie Villagers": "僵尸村民",
    "Wolfs": "狼",
}


def infer_type(raw_default, key):
    if key in TYPE_OVERRIDE:
        return TYPE_OVERRIDE[key]
    d = (raw_default or "").strip()
    if d in ("true", "false"):
        return ("bool", d == "true")
    if re.fullmatch(r"-?\d+(\.\d+)?", d):
        return ("number", float(d) if "." in d else int(d))
    return ("text", "")


def main():
    rows = json.load(io.open(SRC, encoding="utf-8"))

    universal, groups, mobs = [], {}, {}
    missing_zh = []

    for r in rows:
        key = r["name"]
        zh = ZH.get(key)
        if not zh:
            missing_zh.append(key)
            zh = [key, ""]
        raw = r.get("default", "")
        typ, default = infer_type(raw, key)
        item = {
            "k": key,
            "zh": zh[0],
            "tip": zh[1],
            "type": typ,
            "def": default,
            "desc": r.get("description", ""),
            "subs": r.get("subs", []),
        }
        if r["group"] == "Universal options":
            universal.append(item)
            continue
        sub = (r.get("subs") or [""])[0] or "（其他）"
        bucket = groups if r["group"] == "Group specific options" else mobs
        bucket.setdefault(sub, []).append(item)

    def ents_for(items):
        out = []
        for it in items:
            for sb in it.get("subs", []):
                for e in SUB_ENTITIES.get(sb, []):
                    if e not in out:
                        out.append(e)
        return out

    def pack(bucket, order):
        out = []
        for sub in order:
            if sub not in bucket:
                continue
            out.append({
                "id": sub,
                "zh": SUB_ZH.get(sub, sub),
                "entities": ents_for(bucket[sub]),
                "items": bucket[sub],
            })
        for sub in bucket:
            if sub not in order:
                out.append({
                    "id": sub,
                    "zh": SUB_ZH.get(sub, sub),
                    "entities": ents_for(bucket[sub]),
                    "items": bucket[sub],
                })
        return out

    group_order = ["Boat & BoatChest", "Breedable mobs", "Colorable Mobs", "Neutral Entities",
                   "Slimes & Magma Cubes", "Entities with variable size", "Raiders",
                   "Tameable Mobs", "Zombies (all variants)", "Skeleton"]
    mob_order = ["Armor Stand", "Bee", "Camel", "Cat", "Chicken", "Cow", "Creepers",
                 "Copper_Golem", "Enderman", "Fox", "Frog", "Goat", "Hoglin",
                 "Horses, Donkeys, and Mules", "Interaction", "IronGolem", "Item", "Llama",
                 "MinecartChest", "Panda", "Parrot", "Pig", "Piglin", "Piglin Brute",
                 "Rabbit", "Sheep", "Silverfish", "Snow Golem", "TNT", "Tropical Fish",
                 "Villagers", "Experience_orb", "Falling Blocks"]

    data = {
        "universal": universal,
        "groups": pack(groups, group_order),
        "mobs": pack(mobs, mob_order),
    }

    js = "/* 自动生成：python tools/build_options_js.py —— 不要手改 */\n"
    js += "window.MM_OPTS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
    io.open(DST, "w", encoding="utf-8").write(js)

    total = len(universal) + sum(len(g["items"]) for g in data["groups"]) + sum(len(m["items"]) for m in data["mobs"])
    print("universal:", len(universal),
          "| groups:", len(data["groups"]), sum(len(g["items"]) for g in data["groups"]),
          "| mobs:", len(data["mobs"]), sum(len(m["items"]) for m in data["mobs"]),
          "| total:", total)
    if missing_zh:
        print("!! 缺中文:", missing_zh)


if __name__ == "__main__":
    main()
