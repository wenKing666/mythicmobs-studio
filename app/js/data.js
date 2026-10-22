/* 中文数据表：所有下拉/提示都从这里来。id 是写进 YAML 的真实值，zh 只用于显示。 */
window.MM_DATA = (function () {
  "use strict";

  const entities = [
    ["ZOMBIE", "僵尸"], ["SKELETON", "骷髅"], ["CREEPER", "苦力怕"], ["SPIDER", "蜘蛛"],
    ["CAVE_SPIDER", "洞穴蜘蛛"], ["ENDERMAN", "末影人"], ["WITCH", "女巫"],
    ["WITHER_SKELETON", "凋灵骷髅"], ["BLAZE", "烈焰人"], ["GHAST", "恶魂"],
    ["PIGLIN", "猪灵"], ["PIGLIN_BRUTE", "猪灵蛮兵"], ["ZOMBIFIED_PIGLIN", "僵尸猪灵"],
    ["HOGLIN", "疣猪兽"], ["ZOGLIN", "僵尸疣猪兽"], ["ENDERMITE", "末影螨"],
    ["SILVERFISH", "蠹虫"], ["SLIME", "史莱姆"], ["MAGMA_CUBE", "岩浆怪"],
    ["PHANTOM", "幻翼"], ["DROWNED", "溺尸"], ["HUSK", "尸壳"], ["STRAY", "流浪者"],
    ["PILLAGER", "掠夺者"], ["VINDICATOR", "卫道士"], ["EVOKER", "唤魔者"],
    ["ILLUSIONER", "幻术师"], ["RAVAGER", "劫掠兽"], ["VEX", "恼鬼"],
    ["GUARDIAN", "守卫者"], ["ELDER_GUARDIAN", "远古守卫者"], ["SHULKER", "潜影贝"],
    ["ENDER_DRAGON", "末影龙"], ["WITHER", "凋灵"], ["WARDEN", "监守者"],
    ["IRON_GOLEM", "铁傀儡"], ["SNOW_GOLEM", "雪傀儡"], ["VILLAGER", "村民"],
    ["WANDERING_TRADER", "流浪商人"], ["ZOMBIE_VILLAGER", "僵尸村民"], ["WOLF", "狼"],
    ["CAT", "猫"], ["OCELOT", "豹猫"], ["HORSE", "马"], ["DONKEY", "驴"], ["MULE", "骡"],
    ["SKELETON_HORSE", "骷髅马"], ["ZOMBIE_HORSE", "僵尸马"], ["LLAMA", "羊驼"],
    ["FOX", "狐狸"], ["PANDA", "熊猫"], ["POLAR_BEAR", "北极熊"], ["RABBIT", "兔子"],
    ["CHICKEN", "鸡"], ["COW", "牛"], ["PIG", "猪"], ["SHEEP", "羊"], ["MOOSHROOM", "哞菇"],
    ["SQUID", "鱿鱼"], ["GLOW_SQUID", "发光鱿鱼"], ["DOLPHIN", "海豚"], ["TURTLE", "海龟"],
    ["AXOLOTL", "美西螈"], ["COD", "鳕鱼"], ["SALMON", "鲑鱼"], ["TROPICAL_FISH", "热带鱼"],
    ["PUFFERFISH", "河豚"], ["BAT", "蝙蝠"], ["BEE", "蜜蜂"], ["ALLAY", "悦灵"],
    ["FROG", "青蛙"], ["TADPOLE", "蝌蚪"], ["GOAT", "山羊"], ["STRIDER", "炽足兽"],
    ["ARMOR_STAND", "盔甲架"], ["GIANT", "巨人"], ["BREEZE", "旋风人"], ["BOGGED", "沼骷"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const materials = [
    ["diamond_sword", "钻石剑"], ["netherite_sword", "下界合金剑"], ["iron_sword", "铁剑"],
    ["golden_sword", "金剑"], ["stone_sword", "石剑"], ["wooden_sword", "木剑"],
    ["diamond_axe", "钻石斧"], ["netherite_axe", "下界合金斧"], ["iron_axe", "铁斧"],
    ["diamond_pickaxe", "钻石镐"], ["netherite_pickaxe", "下界合金镐"], ["iron_pickaxe", "铁镐"],
    ["bow", "弓"], ["crossbow", "弩"], ["trident", "三叉戟"], ["arrow", "箭"],
    ["diamond_helmet", "钻石头盔"], ["netherite_helmet", "下界合金头盔"], ["iron_helmet", "铁头盔"],
    ["golden_helmet", "金头盔"], ["leather_helmet", "皮革帽子"], ["chainmail_helmet", "锁链头盔"],
    ["diamond_chestplate", "钻石胸甲"], ["netherite_chestplate", "下界合金胸甲"],
    ["iron_chestplate", "铁胸甲"], ["golden_chestplate", "金胸甲"], ["leather_chestplate", "皮革外套"],
    ["diamond_leggings", "钻石护腿"], ["netherite_leggings", "下界合金护腿"],
    ["iron_leggings", "铁护腿"], ["golden_leggings", "金护腿"], ["leather_leggings", "皮革裤子"],
    ["diamond_boots", "钻石靴子"], ["netherite_boots", "下界合金靴子"], ["iron_boots", "铁靴子"],
    ["golden_boots", "金靴子"], ["leather_boots", "皮革靴子"],
    ["diamond", "钻石"], ["netherite_ingot", "下界合金锭"], ["iron_ingot", "铁锭"],
    ["gold_ingot", "金锭"], ["emerald", "绿宝石"], ["coal", "煤炭"], ["redstone", "红石"],
    ["lapis_lazuli", "青金石"], ["amethyst_shard", "紫水晶碎片"], ["quartz", "下界石英"],
    ["copper_ingot", "铜锭"], ["nether_star", "下界之星"], ["echo_shard", "回响碎片"],
    ["stick", "木棍"], ["string", "线"], ["feather", "羽毛"], ["flint", "燧石"],
    ["leather", "皮革"], ["rabbit_hide", "兔子皮"], ["bone", "骨头"], ["gunpowder", "火药"],
    ["blaze_rod", "烈焰棒"], ["blaze_powder", "烈焰粉"], ["ender_pearl", "末影珍珠"],
    ["ender_eye", "末影之眼"], ["ghast_tear", "恶魂之泪"], ["slime_ball", "黏液球"],
    ["magma_cream", "岩浆膏"], ["phantom_membrane", "幻翼膜"], ["rabbit_foot", "兔子脚"],
    ["spider_eye", "蜘蛛眼"], ["fermented_spider_eye", "发酵蜘蛛眼"], ["sugar", "糖"],
    ["glowstone_dust", "荧石粉"], ["redstone_block", "红石块"], ["tnt", "TNT"],
    ["golden_apple", "金苹果"], ["enchanted_golden_apple", "附魔金苹果"],
    ["bread", "面包"], ["cooked_beef", "熟牛肉"], ["cooked_porkchop", "熟猪排"],
    ["golden_carrot", "金胡萝卜"], ["cake", "蛋糕"], ["cookie", "曲奇"],
    ["potion", "药水"], ["splash_potion", "喷溅药水"], ["lingering_potion", "滞留药水"],
    ["experience_bottle", "附魔之瓶"], ["totem_of_undying", "不死图腾"],
    ["enchanted_book", "附魔书"], ["book", "书"], ["written_book", "成书"],
    ["name_tag", "命名牌"], ["lead", "拴绳"], ["saddle", "鞍"], ["elytra", "鞘翅"],
    ["shield", "盾牌"], ["firework_rocket", "烟花火箭"], ["snowball", "雪球"], ["egg", "鸡蛋"],
    ["diamond_block", "钻石块"], ["iron_block", "铁块"], ["gold_block", "金块"],
    ["emerald_block", "绿宝石块"], ["netherite_block", "下界合金块"],
    ["stone", "石头"], ["cobblestone", "圆石"], ["oak_planks", "橡木木板"],
    ["spruce_planks", "云杉木板"], ["obsidian", "黑曜石"], ["bedrock", "基岩"],
    ["glass", "玻璃"], ["glowstone", "荧石"], ["sea_lantern", "海晶灯"], ["torch", "火把"],
    ["chest", "箱子"], ["barrel", "木桶"], ["hopper", "漏斗"], ["furnace", "熔炉"],
    ["anvil", "铁砧"], ["beacon", "信标"], ["conduit", "潮涌核心"],
    ["player_head", "玩家头颅"], ["zombie_head", "僵尸头"], ["skeleton_skull", "骷髅头"],
    ["wither_skeleton_skull", "凋灵骷髅头"], ["creeper_head", "苦力怕头"],
    ["dragon_head", "龙首"], ["piglin_head", "猪灵头"],
    ["oak_log", "橡木原木"], ["sand", "沙子"], ["gravel", "沙砾"], ["dirt", "泥土"],
    ["grass_block", "草方块"], ["netherrack", "下界岩"], ["soul_sand", "灵魂沙"],
    ["end_stone", "末地石"], ["prismarine", "海晶石"], ["sponge", "海绵"],
    ["ender_chest", "末影箱"], ["shulker_box", "潜影盒"],
    ["white_wool", "白色羊毛"], ["red_wool", "红色羊毛"], ["blue_wool", "蓝色羊毛"], ["black_wool", "黑色羊毛"],
    ["white_concrete", "白色混凝土"], ["smooth_stone", "平滑石头"], ["stone_bricks", "石砖"], ["bricks", "红砖块"],
    ["deepslate", "深板岩"], ["calcite", "方解石"], ["tuff", "凝灰岩"], ["copper_block", "铜块"],
    ["raw_iron", "粗铁"], ["raw_gold", "粗金"], ["raw_copper", "粗铜"], ["coal_block", "煤炭块"],
    ["lapis_block", "青金石块"], ["quartz_block", "石英块"], ["amethyst_block", "紫水晶块"], ["hay_block", "干草捆"],
    ["bookshelf", "书架"], ["crafting_table", "工作台"], ["enchanting_table", "附魔台"], ["brewing_stand", "酿造台"],
    ["cauldron", "炼药锅"], ["grindstone", "砂轮"], ["smithing_table", "锻造台"], ["stonecutter", "切石机"],
    ["loom", "织布机"], ["cartography_table", "制图台"], ["fletching_table", "制箭台"], ["composter", "堆肥桶"],
    ["lectern", "讲台"], ["bell", "钟"], ["lantern", "灯笼"], ["soul_lantern", "灵魂灯笼"],
    ["campfire", "营火"], ["soul_campfire", "灵魂营火"], ["respawn_anchor", "重生锚"], ["lodestone", "磁石"],
    ["piston", "活塞"], ["sticky_piston", "黏性活塞"], ["observer", "侦测器"], ["dispenser", "发射器"],
    ["dropper", "投掷器"], ["redstone_torch", "红石火把"], ["repeater", "红石中继器"], ["comparator", "红石比较器"],
    ["daylight_detector", "阳光探测器"], ["lever", "拉杆"], ["ladder", "梯子"], ["scaffolding", "脚手架"],
    ["chain", "锁链"], ["iron_bars", "铁栏杆"], ["oak_door", "橡木门"], ["oak_trapdoor", "橡木活板门"],
    ["white_bed", "白色床"], ["note_block", "音符盒"], ["jukebox", "唱片机"], ["target", "标靶"],
    ["lightning_rod", "避雷针"], ["sculk", "幽匿块"], ["honey_block", "蜂蜜块"], ["slime_block", "黏液块"],
    ["cobweb", "蜘蛛网"], ["ice", "冰"], ["packed_ice", "浮冰"], ["snow_block", "雪块"],
    ["clay", "黏土"], ["moss_block", "苔藓块"], ["glow_berries", "发光浆果"], ["sweet_berries", "甜浆果"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const enchantments = [
    ["SHARPNESS", "锋利"], ["SMITE", "亡灵杀手"], ["BANE_OF_ARTHROPODS", "节肢杀手"],
    ["KNOCKBACK", "击退"], ["FIRE_ASPECT", "火焰附加"], ["LOOTING", "抢夺"],
    ["SWEEPING_EDGE", "横扫之刃"], ["EFFICIENCY", "效率"], ["SILK_TOUCH", "精准采集"],
    ["UNBREAKING", "耐久"], ["FORTUNE", "时运"], ["MENDING", "经验修补"],
    ["POWER", "力量"], ["PUNCH", "冲击"], ["FLAME", "火矢"], ["INFINITY", "无限"],
    ["PROTECTION", "保护"], ["FIRE_PROTECTION", "火焰保护"], ["FEATHER_FALLING", "摔落保护"],
    ["BLAST_PROTECTION", "爆炸保护"], ["PROJECTILE_PROTECTION", "弹射物保护"],
    ["RESPIRATION", "水下呼吸"], ["AQUA_AFFINITY", "水下速掘"], ["THORNS", "荆棘"],
    ["DEPTH_STRIDER", "深海探索者"], ["FROST_WALKER", "冰霜行者"], ["SOUL_SPEED", "灵魂疾行"],
    ["SWIFT_SNEAK", "迅捷潜行"], ["LUCK_OF_THE_SEA", "海之眷顾"], ["LURE", "诱饵"],
    ["CHANNELING", "引雷"], ["IMPALING", "穿刺"], ["RIPTIDE", "激流"], ["LOYALTY", "忠诚"],
    ["MULTISHOT", "多重射击"], ["QUICK_CHARGE", "快速装填"], ["PIERCING", "穿透"],
    ["DENSITY", "密度"], ["BREACH", "破甲"], ["WIND_BURST", "风爆"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const attributes = [
    ["ATTACK_DAMAGE", "攻击伤害"], ["ATTACK_SPEED", "攻击速度"], ["MAX_HEALTH", "最大生命"],
    ["MOVEMENT_SPEED", "移动速度"], ["ARMOR", "护甲"], ["ARMOR_TOUGHNESS", "护甲韧性"],
    ["KNOCKBACK_RESISTANCE", "击退抗性"], ["ATTACK_KNOCKBACK", "攻击击退"],
    ["LUCK", "幸运"], ["SCALE", "体型"], ["FOLLOW_RANGE", "跟随范围"],
    ["JUMP_HEIGHT", "跳跃高度"], ["MAX_ABSORPTION", "最大伤害吸收"], ["OXYGEN", "氧气"],
    ["BLOCK_INTERACTION_RANGE", "方块交互距离"], ["ENTITY_INTERACTION_RANGE", "实体交互距离"],
    ["BURNING_TIME", "燃烧时间"], ["EXPLOSION_KNOCKBACK_RESISTANCE", "爆炸击退抗性"],
    ["FALL_DAMAGE_MULTIPLIER", "摔落伤害倍率"], ["GRAVITY", "重力"],
    ["SAFE_FALL_DISTANCE", "安全摔落距离"], ["STEP_HEIGHT", "步高"],
    ["WATER_MOVEMENT_EFFICIENCY", "水中移动效率"], ["MOVEMENT_EFFICIENCY", "移动效率"],
    ["SUBMERGED_MINING_SPEED", "水下挖掘速度"], ["MINING_EFFICIENCY", "挖掘效率"],
    ["SWEEPING_DAMAGE_RATIO", "横扫伤害比"], ["SNEAKING_SPEED", "潜行速度"],
    ["TEMPT_RANGE", "诱导范围"], ["FLYING_SPEED", "飞行速度"],
    ["BLOCK_BREAK_SPEED", "方块破坏速度"], ["SPAWN_REINFORCEMENTS", "生成援军"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const effects = [
    ["SPEED", "速度"], ["SLOWNESS", "缓慢"], ["HASTE", "急迫"], ["MINING_FATIGUE", "挖掘疲劳"],
    ["STRENGTH", "力量"], ["INSTANT_HEALTH", "瞬间治疗"], ["INSTANT_DAMAGE", "瞬间伤害"],
    ["JUMP_BOOST", "跳跃提升"], ["NAUSEA", "反胃"], ["REGENERATION", "生命恢复"],
    ["RESISTANCE", "抗性提升"], ["FIRE_RESISTANCE", "抗火"], ["WATER_BREATHING", "水下呼吸"],
    ["INVISIBILITY", "隐身"], ["BLINDNESS", "失明"], ["NIGHT_VISION", "夜视"],
    ["HUNGER", "饥饿"], ["WEAKNESS", "虚弱"], ["POISON", "中毒"], ["WITHER", "凋灵"],
    ["HEALTH_BOOST", "生命提升"], ["ABSORPTION", "伤害吸收"], ["SATURATION", "饱和"],
    ["GLOWING", "发光"], ["LEVITATION", "飘浮"], ["SLOW_FALLING", "缓降"],
    ["DARKNESS", "黑暗"], ["BAD_OMEN", "不祥之兆"], ["HERO_OF_THE_VILLAGE", "村庄英雄"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const particles = [
    "flame", "smoke", "cloud", "crit", "enchanted_hit", "explosion", "explosion_emitter",
    "soul", "soul_fire_flame", "lava", "drip_lava", "dripping_lava", "water_splash",
    "dripping_water", "heart", "angry_villager", "happy_villager", "note", "portal",
    "enchant", "end_rod", "dragon_breath", "spell_witch", "spell_mob", "spell_instant",
    "totem_of_undying", "sonic_boom", "cherry_leaves", "snowflake", "electric_spark"
  ].map(function (x) { return { id: x, zh: x }; });

  const triggers = [
    { id: "onSpawn", zh: "生成时", syntax: "~onSpawn" },
    { id: "onDeath", zh: "死亡时", syntax: "~onDeath" },
    { id: "onAttack", zh: "攻击命中时", syntax: "~onAttack" },
    { id: "onDamaged", zh: "受到伤害时", syntax: "~onDamaged" },
    { id: "onTimer", zh: "定时重复（秒）", syntax: "~onTimer:%t%", needsTicks: true, defaultTicks: 200 },
    { id: "onInteract", zh: "被玩家右键时", syntax: "~onInteract" },
    { id: "onKillPlayer", zh: "击杀玩家时", syntax: "~onKillPlayer" },
    { id: "onDespawn", zh: "消失时", syntax: "~onDespawn" },
    { id: "onEnterCombat", zh: "进入战斗时", syntax: "~onEnterCombat" },
    { id: "onShoot", zh: "射箭/投掷时", syntax: "~onShoot" },
    { id: "onProjectileHit", zh: "弹射物命中时", syntax: "~onProjectileHit" },
    { id: "onSpawnOrLoad", zh: "生成或区块加载时", syntax: "~onSpawnOrLoad" }
  ];

  const targeters = [
    { id: "self", zh: "自己", tpl: "@Self" },
    { id: "target", zh: "当前攻击目标", tpl: "@Target" },
    { id: "trigger", zh: "触发者", tpl: "@Trigger" },
    { id: "nearest", zh: "最近的玩家", tpl: "@NearestPlayer" },
    { id: "pir", zh: "附近玩家（可设半径）", tpl: "@PlayersInRadius{r=%r%}", needsRadius: true, defaultR: 10 },
    { id: "eir", zh: "附近实体（可设半径）", tpl: "@EntitiesInRadius{r=%r%}", needsRadius: true, defaultR: 5 },
    { id: "mir", zh: "附近怪物（可设半径）", tpl: "@MobsInRadius{r=%r%}", needsRadius: true, defaultR: 8 },
    { id: "loc", zh: "目标所在位置", tpl: "@TargetLocation" },
    { id: "forward", zh: "面朝前方", tpl: "@Forward" },
    { id: "owner", zh: "主人", tpl: "@Owner" }
  ];

  /* 常用技能效果（机制）。参数名与 wiki 一致。 */
  const mechanics = [
    {
      id: "message", zh: "发送聊天消息", desc: "对玩家发送一条聊天栏消息，支持 &颜色 和 <caster.name> 等变量",
      params: [{ name: "message", label: "消息内容", type: "text", def: "&a你好！", required: true }]
    },
    {
      id: "actionmessage", zh: "屏幕中央提示", desc: "在玩家屏幕中央显示一行字",
      params: [{ name: "message", label: "提示文字", type: "text", def: "&e小心！", required: true }]
    },
    {
      id: "title", zh: "显示大标题", desc: "屏幕中央的大标题 + 小标题",
      params: [
        { name: "title", label: "大标题", type: "text", def: "&cBOSS 出现" },
        { name: "subtitle", label: "小标题", type: "text", def: "" }
      ]
    },
    {
      id: "damage", zh: "造成伤害", desc: "对目标造成指定数值的伤害",
      params: [
        { name: "amount", label: "伤害值", type: "number", def: 10, required: true },
        { name: "ignoreArmor", label: "无视护甲", type: "bool", def: false }
      ]
    },
    {
      id: "heal", zh: "治疗", desc: "为目标恢复生命值",
      params: [{ name: "amount", label: "治疗量", type: "number", def: 10, required: true }]
    },
    {
      id: "sethealth", zh: "设置血量", desc: "把目标血量直接设为某个值",
      params: [{ name: "amount", label: "血量", type: "number", def: 20, required: true }]
    },
    {
      id: "potion", zh: "给予药水效果", desc: "给目标施加一个药水效果",
      params: [
        { name: "type", label: "效果", type: "effect", def: "SPEED", required: true },
        { name: "duration", label: "持续（游戏刻，20=1秒）", type: "number", def: 200 },
        { name: "level", label: "等级", type: "number", def: 1 }
      ]
    },
    {
      id: "particle", zh: "播放粒子效果", desc: "在目标位置生成粒子，做特效用",
      params: [
        { name: "particle", label: "粒子", type: "particle", def: "flame", required: true },
        { name: "amount", label: "数量", type: "number", def: 20 },
        { name: "spread", label: "扩散范围", type: "number", def: 1 }
      ]
    },
    {
      id: "sound", zh: "播放音效", desc: "播放一个 Minecraft 音效",
      params: [
        { name: "sound", label: "音效 ID", type: "text", def: "entity.zombie.ambient", required: true },
        { name: "volume", label: "音量", type: "number", def: 1 },
        { name: "pitch", label: "音调", type: "number", def: 1 }
      ]
    },
    {
      id: "teleport", zh: "传送到目标", desc: "把施法者传送到目标位置",
      params: []
    },
    {
      id: "summon", zh: "召唤生物", desc: "在目标位置召唤生物（支持原版或 MythicMobs 怪物）",
      params: [
        { name: "type", label: "召唤什么", type: "entity", def: "ZOMBIE", required: true },
        { name: "amount", label: "数量", type: "number", def: 1 }
      ]
    },
    {
      id: "ignite", zh: "点燃", desc: "让目标燃烧",
      params: [{ name: "ticks", label: "燃烧时长（游戏刻）", type: "number", def: 60 }]
    },
    {
      id: "lightning", zh: "召唤闪电", desc: "在目标位置劈下闪电",
      params: []
    },
    {
      id: "explosion", zh: "产生爆炸", desc: "在目标位置制造爆炸",
      params: [
        { name: "power", label: "爆炸威力", type: "number", def: 3 },
        { name: "fire", label: "产生火焰", type: "bool", def: false }
      ]
    },
    {
      id: "push", zh: "击退/击飞", desc: "给目标一个速度",
      params: [{ name: "velocity", label: "速度 (x,y,z)", type: "text", def: "1,0.5,1", required: true }]
    },
    {
      id: "command", zh: "执行命令", desc: "以控制台身份执行一条服务器命令",
      params: [{ name: "command", label: "命令（不带斜杠）", type: "text", def: "say hello", required: true }]
    },
    {
      id: "giveitem", zh: "给予物品", desc: "给玩家物品",
      params: [
        { name: "item", label: "物品", type: "material", def: "diamond", required: true },
        { name: "amount", label: "数量", type: "number", def: 1 }
      ]
    },
    {
      id: "setname", zh: "修改名字", desc: "改变目标的显示名",
      params: [{ name: "name", label: "新名字", type: "text", def: "&c新名字", required: true }]
    },
    {
      id: "remove", zh: "移除实体", desc: "直接移除目标实体",
      params: []
    },
    {
      id: "delay", zh: "延迟", desc: "等待一段时间再继续（技能链里用）",
      params: [{ name: "ticks", label: "延迟（游戏刻）", type: "number", def: 20, required: true }]
    },
    {
      id: "skill", zh: "调用另一个技能", desc: "执行一个已经写好的技能（填技能名）",
      params: [{ name: "skill", label: "技能名", type: "text", def: "", required: true }]
    }
  ];

  /* 怪物常用选项 */
  const mobOptions = [
    { key: "MovementSpeed", label: "移动速度", type: "number", def: 0.2, hint: "僵尸约 0.23，玩家 0.1" },
    { key: "FollowRange", label: "索敌范围", type: "number", def: 32, hint: "多少格内会追玩家" },
    { key: "KnockbackResistance", label: "击退抗性", type: "number", def: 0, hint: "0~1，1 表示完全打不退" },
    { key: "Scale", label: "体型缩放", type: "number", def: 1, hint: "1 是正常大小" },
    { key: "PreventSunburn", label: "不会被阳光烧死", type: "bool", def: false, hint: "僵尸/骷髅类常用" },
    { key: "AlwaysShowName", label: "始终显示名字", type: "bool", def: false },
    { key: "Glowing", label: "发光描边", type: "bool", def: false, hint: "隔墙也能看到轮廓" },
    { key: "Invisible", label: "永久隐身", type: "bool", def: false },
    { key: "NoAI", label: "关闭 AI", type: "bool", def: false, hint: "不会移动和攻击" },
    { key: "NoGravity", label: "不受重力", type: "bool", def: false },
    { key: "Silent", label: "静音", type: "bool", def: false },
    { key: "PreventRandomEquipment", label: "不随机穿装备", type: "bool", def: false, hint: "建议开启，否则僵尸可能自带装备" },
    { key: "PreventOtherDrops", label: "不掉落自身装备", type: "bool", def: false },
    { key: "PreventItemPickup", label: "不捡地上的物品", type: "bool", def: true },
    { key: "PreventLeashing", label: "不能被拴绳拴住", type: "bool", def: true },
    { key: "Collidable", label: "有碰撞体积", type: "bool", def: true }
  ];

  const itemOptions = [
    { key: "Unbreakable", label: "无法破坏", type: "bool", def: false },
    { key: "Glint", label: "附魔光效", type: "bool", def: false, hint: "没附魔也发光" },
    { key: "HideFlags", label: "隐藏属性文字", type: "bool", def: false },
    { key: "CustomModelData", label: "自定义模型数据", type: "number", def: 0, hint: "配合资源包换外观，0 表示不设置" }
  ];

  const equipSlots = [
    ["HAND", "主手"], ["OFFHAND", "副手"], ["HEAD", "头盔"],
    ["CHEST", "胸甲"], ["LEGS", "护腿"], ["FEET", "靴子"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const attrSlots = [
    ["All", "所有槽位"], ["MainHand", "主手"], ["OffHand", "副手"], ["Head", "头盔"],
    ["Chest", "胸甲"], ["Legs", "护腿"], ["Feet", "靴子"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const attrOps = [
    ["ADD", "加算（最常见）"], ["MULTIPLY_BASE", "按基础值乘算"], ["MULTIPLY", "连乘"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const bossbarColors = [
    ["RED", "红色"], ["PINK", "粉色"], ["BLUE", "蓝色"], ["GREEN", "绿色"],
    ["YELLOW", "黄色"], ["PURPLE", "紫色"], ["WHITE", "白色"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  const bossbarStyles = [
    ["SOLID", "整条"], ["SEGMENTED_6", "分 6 段"], ["SEGMENTED_10", "分 10 段"],
    ["SEGMENTED_12", "分 12 段"], ["SEGMENTED_20", "分 20 段"]
  ].map(function (x) { return { id: x[0], zh: x[1] }; });

  function zhOf(list, id) {
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i].zh;
    return "";
  }

  return {
    entities, materials, enchantments, attributes, effects, particles,
    triggers, targeters, mechanics, mobOptions, itemOptions,
    equipSlots, attrSlots, attrOps, bossbarColors, bossbarStyles, zhOf
  };
})();

