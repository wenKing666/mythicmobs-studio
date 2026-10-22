/* 项目模型 / 本地存储 / 模板 */
window.MM_STATE = (function () {
  "use strict";

  const KEY = "mmstudio.projects.v1";
  let projects = [];
  let currentId = null;
  let seq = 1;

  function uid() {
    return "p" + Date.now().toString(36) + (seq++).toString(36);
  }

  function defaultOptions(list) {
    const o = {};
    list.forEach(function (x) { o[x.key] = x.def; });
    return o;
  }

  /* 物品 Options 的默认值：优先用 wiki 抽出来的 17 项，缺数据时退回 data.js 那 4 项。
     注意 extras 里的 bool 默认值是字符串 "true"/"false"，统一折成真正的布尔。 */
  function itemOptionDefaults() {
    const ex = (window.MM_EXTRAS && MM_EXTRAS.itemOptions) || [];
    if (!ex.length) return defaultOptions(MM_DATA.itemOptions);
    const o = {};
    ex.forEach(function (x) {
      if (x.type === "boolean") o[x.id] = x.def === "true";
      else if (x.type === "number") o[x.id] = x.def === "" ? "" : Number(x.def);
      else o[x.id] = x.def === undefined || x.def === null ? "" : x.def;
    });
    return o;
  }

  /* 怪物 Options 全量默认值（126 个，来自官方 wiki） */
  function mobOptionDefaults() {
    const o = {};
    function add(items) {
      (items || []).forEach(function (x) {
        if (!(x.k in o)) o[x.k] = x.def;
      });
    }
    if (window.MM_OPTS) {
      add(MM_OPTS.universal);
      (MM_OPTS.groups || []).forEach(function (g) { add(g.items); });
      (MM_OPTS.mobs || []).forEach(function (g) { add(g.items); });
    }
    // 兜底：早期 16 个
    MM_DATA.mobOptions.forEach(function (x) { if (!(x.key in o)) o[x.key] = x.def; });
    return o;
  }

  function newMob() {
    return {
      kind: "mob",
      key: "",
      data: {
        type: "ZOMBIE",
        display: "",
        health: 100,
        damage: 5,
        armor: 0,
        options: mobOptionDefaults(),
        bossbar: { enabled: false, title: "", color: "RED", style: "SOLID", range: 30 },
        equipment: [],
        aiGoals: [],
        aiTargets: [],
        damageModifiers: [],
        skills: [],
        drops: [],
        /* 0.7.0 补齐的 15 个顶层字段（Level / Faction / HealthBar / Modules…），
           字段表在 spec-data.js 的 mobExtra，生成时整块接在标准字段后面 */
        extra: window.MM_SPEC ? MM_SPEC.blank(MM_SPEC.mobExtraFields()) : {}
      }
    };
  }

  function newItem() {
    return {
      kind: "item",
      key: "",
      data: {
        material: "diamond_sword",
        display: "",
        amount: 1,
        lore: [],
        enchants: [],
        attributes: [],
        components: {},
        options: itemOptionDefaults()
      }
    };
  }

  /* 掉落表（DropTables，独立文件放 Drops/ 目录），和怪物的内联 Drops 是两套东西 */
  function newDropTable() {
    return {
      kind: "droptable",
      key: "",
      data: {
        totalItems: "",
        minItems: "",
        maxItems: "",
        bonusLevelItems: "",
        bonusLuckItems: "",
        biasStat: "",
        conditions: [],
        triggerConditions: [],
        drops: []
      }
    };
  }

  function newSkill() {
    return {
      kind: "skill",
      key: "",
      data: {
        cancelIfNoTargets: "",
        hidden: "",
        conditions: [],
        targetConditions: [],
        triggerConditions: [],
        failedConditionsSkill: "",
        cooldown: "",
        onCooldownSkill: "",
        skill: "",
        skills: []
      }
    };
  }

  /* 通用配置类型（spec-data.js 描述的 9 种）：字段一股脑塞进 data.fields，
     由 MM_SPEC 负责生成 YAML 与反填，state 这边只管建空壳。 */
  function specOf(kind) {
    return (window.MM_SPEC && MM_SPEC.type(kind)) || null;
  }

  function specKinds() {
    return (window.MM_SPEC && MM_SPEC.allTypes()) || [];
  }

  function newSpecProject(kind) {
    const sp = specOf(kind);
    return {
      kind: kind,
      key: "",
      data: { fields: window.MM_SPEC ? MM_SPEC.blank(MM_SPEC.flatFields(sp)) : {} }
    };
  }

  function uniqueKey(base) {
    let k = base, i = 2;
    while (projects.some(function (p) { return p.key === k; })) k = base + "_" + (i++);
    return k;
  }

  function add(project) {
    project.id = uid();
    project.updated = Date.now();
    projects.unshift(project);
    currentId = project.id;
    save();
    baselineSnap();
    return project;
  }

  function create(kind) {
    const sp = specOf(kind);
    const p = sp ? newSpecProject(kind)
      : kind === "mob" ? newMob()
      : kind === "skill" ? newSkill()
      : kind === "droptable" ? newDropTable()
      : newItem();
    const baseKey = sp ? (sp.keyPrefix || kind)
      : kind === "mob" ? "my_mob"
      : kind === "skill" ? "my_skill"
      : kind === "droptable" ? "my_droptable"
      : "my_item";
    p.key = uniqueKey(baseKey);
    if (kind === "mob") p.data.display = "&c我的怪物";
    else if (kind === "item") p.data.display = "&b我的物品";
    return add(p);
  }

  /* ---------- 模板 ---------- */
  const templates = [
    {
      id: "tpl_trash", kind: "mob", icon: "skull", name: "普通小怪",
      desc: "100 血、会掉落腐肉",
      build: function () {
        const p = newMob();
        p.key = uniqueKey("wasteland_zombie");
        p.data.display = "&2荒原僵尸";
        p.data.health = 100; p.data.damage = 6; p.data.armor = 2;
        p.data.drops = [{ item: "rotten_flesh", amount: "1-2", chance: "0.8" }];
        p.data.skills = [{
          trigger: "onAttack", mechanic: "potion", targeter: "target",
          params: { type: "SLOWNESS", duration: 60, level: 1 }
        }];
        return p;
      }
    },
    {
      id: "tpl_boss", kind: "mob", icon: "crown", name: "BOSS",
      desc: "500 血、穿装备、三个技能",
      build: function () {
        const p = newMob();
        p.key = uniqueKey("skeleton_king");
        p.data.type = "SKELETON";
        p.data.display = "&6&l骷髅王";
        p.data.health = 500; p.data.damage = 15; p.data.armor = 8;
        p.data.options.MovementSpeed = 0.28;
        p.data.options.PreventSunburn = true;
        p.data.options.PreventRandomEquipment = true;
        p.data.options.AlwaysShowName = true;
        p.data.bossbar = { enabled: true, title: "&6&l骷髅王", color: "RED", style: "SOLID", range: 40 };
        p.data.equipment = [
          { item: "diamond_helmet", slot: "HEAD" },
          { item: "diamond_chestplate", slot: "CHEST" },
          { item: "diamond_sword", slot: "HAND" }
        ];
        p.data.skills = [
          { trigger: "onSpawn", mechanic: "sendtitle", targeter: "playersinradius", targetParams: { radius: 30 }, params: { title: "&c&l骷髅王 降临", subtitle: "&7准备战斗", duration: 40, fadeIn: 10, fadeOut: 10 } },
          { trigger: "onAttack", mechanic: "damage", targeter: "target", params: { amount: 6 } },
          { trigger: "onDamaged", mechanic: "lightning", targeter: "self", params: { damage: 5 }, universal: { cooldown: "5" } },
          { trigger: "onDeath", mechanic: "message", targeter: "playersinradius", targetParams: { radius: 30 }, params: { message: "&a你击败了骷髅王！" } },
          { trigger: "onDamaged", mechanic: "particle", targeter: "self", params: { particle: "flame", amount: 20, spread: 1 },
            conditions: [{ id: "healthpercent", params: { percent: "<50%" } }] }
        ];
        p.data.drops = [
          { item: "diamond", amount: "2-4", chance: "1" },
          { item: "nether_star", amount: "1", chance: "0.3" }
        ];
        return p;
      }
    },
    {
      id: "tpl_skill_phase", kind: "skill", icon: "zap", name: "BOSS 二阶段",
      desc: "血量低于 50% 才执行，带全屏提示",
      build: function () {
        const p = newSkill();
        p.key = uniqueKey("boss_phase2");
        p.data.conditions = [{ id: "healthpercent", params: { percent: "<50%" } }];
        p.data.cooldown = 15;
        p.data.skills = [
          { trigger: "", mechanic: "sendtitle", targeter: "playersinradius", targetParams: { radius: 30 }, params: { title: "&c&l第二阶段", subtitle: "&7他变得更愤怒了", duration: 40, fadeIn: 10, fadeOut: 10 } },
          { trigger: "", mechanic: "lightning", targeter: "target", params: { damage: 8 } },
          { trigger: "", mechanic: "particle", targeter: "self", params: { particle: "flame", amount: 60, spread: 2 } }
        ];
        return p;
      }
    },
    {
      id: "tpl_skill_nova", kind: "skill", icon: "zap", name: "范围爆发",
      desc: "10 秒冷却，周围 8 格全体受伤并击退",
      build: function () {
        const p = newSkill();
        p.key = uniqueKey("shock_nova");
        p.data.cooldown = 10;
        p.data.skills = [
          { trigger: "", mechanic: "damage", targeter: "playersinradius", targetParams: { radius: 8 }, params: { amount: 12 } },
          { trigger: "", mechanic: "throw", targeter: "playersinradius", targetParams: { radius: 8 }, params: { velocity: 1.5 } },
          { trigger: "", mechanic: "particle", targeter: "self", params: { particle: "explosion_large", amount: 1 } }
        ];
        return p;
      }
    },
    {
      id: "tpl_archer", kind: "mob", icon: "sword", name: "弓箭手",
      desc: "远程 AI：清空原版行为、只打玩家、摔不死",
      build: function () {
        const p = newMob();
        p.key = uniqueKey("elite_archer");
        p.data.type = "SKELETON";
        p.data.display = "&a精英弓箭手";
        p.data.health = 120; p.data.damage = 4; p.data.armor = 3;
        p.data.options.MovementSpeed = 0.3;
        p.data.aiGoals = [
          { goal: "clear" },
          { goal: "arrowattack", params: { attackradius: "18", attackspeedmax: "45", attackspeedmin: "20", speed: "1" } },
          { goal: "lookatplayers", params: { range: "16" } }
        ];
        p.data.aiTargets = [
          { target: "clear" },
          { target: "players" }
        ];
        p.data.damageModifiers = [{ type: "FALL", value: "0" }];
        p.data.skills = [{
          trigger: "onAttack", mechanic: "potion", targeter: "target",
          params: { type: "SLOWNESS", duration: 40, level: 1 }
        }];
        p.data.drops = [{ item: "bone", amount: "1-2", chance: "0.6" }];
        return p;
      }
    },
    {
      id: "tpl_charger", kind: "mob", icon: "skull", name: "冲锋兵",
      desc: "近战 AI：贴脸追人、会跳跃突进、怕火",
      build: function () {
        const p = newMob();
        p.key = uniqueKey("charger_brute");
        p.data.type = "ZOMBIE";
        p.data.display = "&c冲锋蛮兵";
        p.data.health = 200; p.data.damage = 9; p.data.armor = 4;
        p.data.options.MovementSpeed = 0.32;
        p.data.options.AttackKnockback = 1.2;
        p.data.aiGoals = [
          { goal: "clear" },
          { goal: "leapattarget", params: { speed: "1.2" } },
          { goal: "meleeattack", params: { speedmodifier: "1.2" } },
          { goal: "randomstroll" }
        ];
        p.data.aiTargets = [
          { target: "clear" },
          { target: "hurtbytarget" },
          { target: "players" }
        ];
        p.data.damageModifiers = [{ type: "FIRE", value: "1.5" }, { type: "FIRE_TICK", value: "1.5" }];
        p.data.drops = [{ item: "rotten_flesh", amount: "2-4", chance: "0.9" }];
        return p;
      }
    },
    {
      id: "tpl_boss_ai", kind: "mob", icon: "crown", name: "会走位的 BOSS",
      desc: "三段 AI + 反伤免疫 + 掉落表引用",
      build: function () {
        const p = newMob();
        p.key = uniqueKey("warlord");
        p.data.type = "PIGLIN_BRUTE";
        p.data.display = "&6&l战将";
        p.data.health = 800; p.data.damage = 18; p.data.armor = 10;
        p.data.options.MovementSpeed = 0.26;
        p.data.options.AlwaysShowName = true;
        p.data.bossbar = { enabled: true, title: "&6&l战将", color: "RED", style: "SOLID", range: 40 };
        p.data.aiGoals = [
          { goal: "clear" },
          { goal: "patrol", params: { points: "10,64,10;20,64,20", speed: "1", tolerance: "2" } },
          { goal: "meleeattack", params: { speedmodifier: "1.1" } },
          { goal: "randomlookaround" }
        ];
        p.data.aiTargets = [
          { target: "clear" },
          { target: "nearestconditionaltarget", params: { conditions: "targetconditions", interval: "20" } }
        ];
        p.data.damageModifiers = [
          { type: "FALL", value: "0" },
          { type: "PROJECTILE", value: "0.5" },
          { type: "FIRE", value: "-0.5" }
        ];
        p.data.equipment = [
          { item: "netherite_helmet", slot: "HEAD" },
          { item: "netherite_chestplate", slot: "CHEST" },
          { item: "netherite_axe", slot: "HAND" }
        ];
        p.data.skills = [
          { trigger: "onSpawn", mechanic: "sendtitle", targeter: "playersinradius", targetParams: { radius: 30 }, params: { title: "&6&l战将登场", subtitle: "&7小心他的斧子", duration: 40, fadeIn: 10, fadeOut: 10 } },
          { trigger: "onAttack", mechanic: "damage", targeter: "target", params: { amount: 4 } }
        ];
        p.data.drops = [{ table: "boss_loot" }];
        return p;
      }
    },
    {
      id: "tpl_droptable", kind: "droptable", icon: "box", name: "BOSS 掉落表",
      desc: "必掉 2 件、按等级加量、带条件",
      build: function () {
        const p = newDropTable();
        p.key = uniqueKey("boss_loot");
        p.data.totalItems = "2";
        p.data.bonusLevelItems = "0.1";
        p.data.conditions = [{ id: "healthpercent", params: { percent: ">0" }, expect: "" }];
        p.data.drops = [
          { item: "diamond", amount: "2-4", chance: "1" },
          { item: "nether_star", amount: "1", chance: "0.25" },
          { type: "money", value: "500", chance: "0.8" }
        ];
        return p;
      }
    },
    {
      id: "tpl_food", kind: "item", icon: "shield", name: "可食用物品",
      desc: "食物组件 + 消耗动画 + 使用冷却",
      build: function () {
        const p = newItem();
        p.key = uniqueKey("mythic_apple");
        p.data.material = "apple";
        p.data.display = "&d秘法苹果";
        p.data.lore = ["&7吃下去会恢复 8 点饥饿值", "&8使用冷却 5 秒"];
        p.data.options.Glint = true;
        p.data.components = {
          Consumable: { ConsumeSeconds: "1.5", HasParticles: true, Animation: "EAT" },
          Food: { Nutrition: "8", Saturation: "12", CanAlwaysEat: false },
          UseCooldown: { CooldownSeconds: "5" }
        };
        return p;
      }
    },
    {
      id: "tpl_sword", kind: "item", icon: "sword", name: "近战武器",
      desc: "钻石剑，攻击 +9",
      build: function () {
        const p = newItem();
        p.key = uniqueKey("flame_sword");
        p.data.display = "&c烈焰之剑";
        p.data.lore = ["&7燃烧着不灭的火焰", "&8攻击力 +9"];
        p.data.enchants = [{ name: "FIRE_ASPECT", level: 2 }, { name: "SHARPNESS", level: 5 }];
        p.data.attributes = [{ slot: "MainHand", name: "ATTACK_DAMAGE", value: 9, op: "ADD" }];
        p.data.options.Glint = true;
        return p;
      }
    },
    {
      id: "tpl_armor", kind: "item", icon: "shield", name: "防具",
      desc: "钻石胸甲，生命 +20",
      build: function () {
        const p = newItem();
        p.key = uniqueKey("guardian_chest");
        p.data.material = "diamond_chestplate";
        p.data.display = "&b守护胸甲";
        p.data.lore = ["&7生命上限 +20", "&8穿戴后生效"];
        p.data.attributes = [
          { slot: "Chest", name: "MAX_HEALTH", value: 20, op: "ADD" },
          { slot: "Chest", name: "ARMOR", value: 4, op: "ADD" }
        ];
        p.data.options.Unbreakable = true;
        return p;
      }
    },

    /* ---------- 0.10.0：9 种新配置类型的模板 ---------- */
    {
      id: "tpl_spawner_arena", kind: "spawner", icon: "map-pin", name: "竞技场刷怪点",
      desc: "计时刷怪、冷却 5 分钟、拴绳保护、需要玩家在附近",
      build: function () {
        const p = newSpecProject("spawner");
        p.key = uniqueKey("arena_boss_spawner");
        const f = p.data.fields;
        f.MobName = "my_boss"; f.World = "world";
        f.X = "0"; f.Y = "64"; f.Z = "0"; f.Radius = "3"; f.RadiusY = "2";
        f.MobsPerSpawn = "1"; f.MaxMobs = "1";
        f.UseTimer = "true"; f.Cooldown = "300"; f.Warmup = "10";
        f.CheckForPlayers = "true"; f.ActivationRange = "40";
        f.LeashRange = "32"; f.HealOnLeash = "true"; f.ResetThreatOnLeash = "true";
        f.ShowFlames = "true"; f.Breakable = "false";
        return p;
      }
    },
    {
      id: "tpl_randomspawn_night", kind: "randomspawn", icon: "moon", name: "夜晚荒野随机刷",
      desc: "替换原版生成：5% 概率把夜晚的僵尸换成 3 级强化版",
      build: function () {
        const p = newSpecProject("randomspawn");
        p.key = uniqueKey("night_elite");
        const f = p.data.fields;
        f.Action = "REPLACE"; f.Type = "zombie"; f.Level = "3";
        f.Chance = "0.05"; f.Worlds = ["world"]; f.PositionType = "LAND";
        f.Conditions = [{ id: "night", params: {}, expect: "" }];
        return p;
      }
    },
    {
      id: "tpl_stat_crit", kind: "stats", icon: "activity", name: "暴击属性",
      desc: "PROC 型：攻击时按基础值概率触发，挂技能自己填",
      build: function () {
        const p = newSpecProject("stats");
        p.key = uniqueKey("MY_CRIT");
        const f = p.data.fields;
        f.Enabled = "true"; f.Type = "PROC"; f.Display = "&c暴击";
        f.FormulaKey = "CRIT"; f.BaseValue = "5"; f.MinValue = "0"; f.MaxValue = "100";
        f.Priority = "3"; f.Rounding = "0";
        f.Triggers = ["Attack"]; f.ExecutionPoint = "PRE";
        f.Formatting = { Additive: "+<value>% 暴击率" };
        return p;
      }
    },
    {
      id: "tpl_menu_main", kind: "menu", icon: "grid", name: "简单主菜单",
      desc: "27 格菜单 + 九宫格布局骨架，图标在 Icons 里配",
      build: function () {
        const p = newSpecProject("menu");
        p.key = uniqueKey("main_menu");
        const f = p.data.fields;
        f.Display = "&8服务器菜单"; f.Size = "27";
        f.Shared = "false";
        f.Schema = [".........", ".iii.iii.", "........."];
        return p;
      }
    },
    {
      id: "tpl_dialog_npc", kind: "dialog", icon: "message", name: "NPC 对话",
      desc: "带正文与两个按钮的欢迎对话",
      build: function () {
        const p = newSpecProject("dialog");
        p.key = uniqueKey("villager_welcome");
        const f = p.data.fields;
        f.Title = "<gold>村长你好！";
        f.CanClose = "true"; f.AfterAction = "CLOSE";
        f.Body = [
          { Type: "text", Message: "<gray>欢迎来到本服务器，<target.name>！" },
          { Type: "text", Message: "<gray>左侧的任务都做完了吗？" }
        ];
        f.Buttons = [
          { Label: "<green>做完了", Tooltip: "领取奖励" },
          { Label: "<yellow>还没有", Tooltip: "去接任务" }
        ];
        return p;
      }
    },
    {
      id: "tpl_cinematic_boss", kind: "cinematic", icon: "film", name: "BOSS 登场镜头",
      desc: "10 秒环绕推近的两段镜头路径",
      build: function () {
        const p = newSpecProject("cinematic");
        p.key = uniqueKey("boss_intro");
        const f = p.data.fields;
        f.duration = "200"; f.loop = "false"; f.easing = "EASE_IN_OUT_CUBIC";
        f.points = [
          "world,0,80,25,0,-20",
          "world,12,74,14,0,-15,40",
          "world,0,70,6,0,0"
        ];
        return p;
      }
    },
    {
      id: "tpl_pin_arena", kind: "pin", icon: "map-pin", name: "竞技场定位点",
      desc: "半径 12 格、常驻 10 分钟的红色定位点",
      build: function () {
        const p = newSpecProject("pin");
        p.key = uniqueKey("boss_arena");
        const f = p.data.fields;
        f.name = "boss_arena"; f.location = "world,0,64,0";
        f.radius = "12"; f.duration = "6000"; f.color = "RED";
        return p;
      }
    },
    {
      id: "tpl_pack_starter", kind: "pack", icon: "layers", name: "示例内容包",
      desc: "pack.yml 骨架：包名 / 版本 / 描述",
      build: function () {
        const p = newSpecProject("pack");
        p.key = uniqueKey("my_pack");
        const f = p.data.fields;
        f.Name = "MyPack"; f.Version = "1.0.0"; f.Author = "你";
        f.Description = ["我的第一个内容包", "把 Mobs / Skills 等文件夹整个拖进来就行"];
        return p;
      }
    },
    {
      id: "tpl_vanilla_zombie", kind: "vanillaoverride", icon: "skull", name: "强化原版僵尸",
      desc: "给所有僵尸加血加伤害、带 AI 目标",
      build: function () {
        const p = newSpecProject("vanillaoverride");
        p.key = uniqueKey("zombie");
        const f = p.data.fields;
        f.Health = "30"; f.Damage = "6"; f.Armor = "2";
        f.Display = "&2强化僵尸";
        f.Options = { MovementSpeed: "0.3" };
        f.AITargetSelectors = ["players"];
        return p;
      }
    }
  ];

  /* ---------- 存储 ---------- */
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ projects: projects, currentId: currentId }));
    } catch (e) { /* 隐私模式忽略 */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const o = JSON.parse(raw);
      projects = o.projects || [];
      currentId = o.currentId || (projects[0] && projects[0].id) || null;
      // 兼容旧数据：补齐新增选项的默认值
      projects.forEach(function (p) {
        p.data = p.data || {};
        /* 通用配置类型：data.fields 里的空值补齐，字段表以后加了新键也不至于 undefined */
        const sp = specOf(p.kind);
        if (sp) {
          p.data.fields = Object.assign(MM_SPEC.blank(MM_SPEC.flatFields(sp)), p.data.fields || {});
          return;
        }
        const base = p.kind === "mob" ? newMob() : p.kind === "item" ? newItem() : null;
        if (!base) return;
        const defs = p.kind === "mob" ? mobOptionDefaults() : itemOptionDefaults();
        p.data.options = Object.assign(defs, p.data.options || {});
        /* 0.6.0 新增的字段：老项目里没有，补上空值，别让渲染层到处判 undefined */
        Object.keys(base.data).forEach(function (k) {
          if (p.data[k] === undefined) p.data[k] = base.data[k];
        });
        /* CustomModelData 从 Options 升成了根级组件：老项目里设过的值搬过去，别丢配置 */
        if (p.kind === "item" && p.data.options && p.data.options.CustomModelData !== undefined &&
            Number(p.data.options.CustomModelData) > 0 &&
            !(p.data.components && p.data.components.CustomModelData)) {
          p.data.components = p.data.components || {};
          p.data.components.CustomModelData = { value: String(p.data.options.CustomModelData) };
        }
        if (p.data.options) delete p.data.options.CustomModelData;
      });
    } catch (e) { projects = []; }
  }

  function remove(id) {
    const i = projects.findIndex(function (p) { return p.id === id; });
    if (i < 0) return;
    projects.splice(i, 1);
    if (currentId === id) currentId = projects[0] ? projects[0].id : null;
    save();
  }

  function current() {
    return projects.find(function (p) { return p.id === currentId; }) || null;
  }

  function select(id) { currentId = id; save(); baselineSnap(); }

  function touch() {
    const p = current();
    if (p) { p.updated = Date.now(); save(); scheduleSnap(); }
  }

  function renameKey(p, key) {
    const clean = String(key).trim().replace(/[^A-Za-z0-9_\-]/g, "_").replace(/_+/g, "_");
    if (!clean) return p.key;
    const dup = projects.some(function (x) { return x !== p && x.key === clean; });
    if (dup) return p.key;
    p.key = clean;
    save();
    return p.key;
  }

  /* ---------- 0.13.0：克隆 / 自定义模板 / 撤销重做 ---------- */

  /* 克隆：配置内容完整拷贝，另起 ID 与不重复的 key；不继承 filePath（保存会另存新文件） */
  function clone(id) {
    const src = projects.find(function (p) { return p.id === id; });
    if (!src) return null;
    const p = JSON.parse(JSON.stringify(src));
    p.id = uid();
    p.updated = Date.now();
    p.key = uniqueKey(src.key + "_copy");
    p.filePath = null;
    p.mtime = null;
    projects.unshift(p);
    currentId = p.id;
    save();
    baselineSnap();
    return p;
  }

  /* 自定义模板：独立 localStorage 键，与官方模板分开管理 */
  const TPL_KEY = KEY + "_custom_templates";
  function customTemplates() {
    try { return JSON.parse(localStorage.getItem(TPL_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCustomTemplate(name, project) {
    const list = customTemplates();
    list.unshift({
      id: "ctpl_" + uid(),
      name: String(name || "").trim() || project.key,
      desc: (project.kind === "mob" ? "怪物" : project.kind === "skill" ? "技能组" :
        project.kind === "droptable" ? "掉落表" : project.kind === "item" ? "物品" :
        (specOf(project.kind) ? specOf(project.kind).title : "配置")) + " · " + project.key,
      kind: project.kind,
      payload: JSON.parse(JSON.stringify({ key: project.key, data: project.data }))
    });
    if (list.length > 40) list.length = 40;
    localStorage.setItem(TPL_KEY, JSON.stringify(list));
    return list;
  }
  function removeCustomTemplate(id) {
    const list = customTemplates().filter(function (t) { return t.id !== id; });
    localStorage.setItem(TPL_KEY, JSON.stringify(list));
    return list;
  }
  /* 导入的模板入库（0.17.0）：校验必要的字段，名字加标记防重名混乱 */
  function addCustomTemplate(obj) {
    if (!obj || typeof obj !== "object") throw new Error("模板格式不对");
    if (!obj.name || !obj.kind || !obj.payload || !obj.payload.data) throw new Error("缺少 name / kind / payload");
    const list = customTemplates();
    list.unshift({
      id: "ctpl_" + uid(),
      name: String(obj.name) + "（导入）",
      desc: String(obj.desc || ""),
      kind: obj.kind,
      payload: JSON.parse(JSON.stringify(obj.payload))
    });
    localStorage.setItem(TPL_KEY, JSON.stringify(list));
    return list;
  }
  /* 用自定义模板建项目：payload 恢复 + 走一遍与 load() 相同的兼容补齐 */
  function buildCustom(t) {
    const p = JSON.parse(JSON.stringify(t.payload));
    p.kind = t.kind;
    p.data = p.data || {};
    const sp = specOf(p.kind);
    if (sp) {
      p.data.fields = Object.assign(MM_SPEC.blank(MM_SPEC.flatFields(sp)), p.data.fields || {});
    } else {
      const base = p.kind === "mob" ? newMob() : p.kind === "item" ? newItem() :
        p.kind === "skill" ? newSkill() : p.kind === "droptable" ? newDropTable() : null;
      if (base) {
        Object.keys(base.data).forEach(function (k) {
          if (p.data[k] === undefined) p.data[k] = base.data[k];
        });
        if (p.data.options) p.data.options = Object.assign(mobOptionDefaults(), p.data.options);
      }
    }
    p.id = uid();
    p.updated = Date.now();
    p.key = uniqueKey(p.key || "my_" + p.kind);
    p.filePath = null;
    p.mtime = null;
    projects.unshift(p);
    currentId = p.id;
    save();
    baselineSnap();
    return p;
  }

  /* 撤销 / 重做：按项目快照。改动经 touch() 防抖 600ms 入栈（同一状态去重），
     切换 / 新建 / 打开时打基线快照，保证每批改动都有「改前」可回退。 */
  let undoStack = [], redoStack = [];
  let snapTimer = null, lastSnap = "";
  const SNAP_MAX = 50;
  function snapshotOf(p) {
    return JSON.stringify({ id: p.id, key: p.key, data: p.data });
  }
  function baselineSnap() {
    if (snapTimer) { clearTimeout(snapTimer); snapTimer = null; }
    const p = current();
    if (!p) return;
    lastSnap = snapshotOf(p);
    /* 基线也进栈：第一次撤销要能回到「刚打开 / 刚新建」的状态 */
    undoStack.push(lastSnap);
    if (undoStack.length > SNAP_MAX) undoStack.shift();
    redoStack.length = 0;
  }
  function scheduleSnap() {
    if (snapTimer) clearTimeout(snapTimer);
    snapTimer = setTimeout(function () {
      snapTimer = null;
      const p = current();
      if (!p) return;
      const snap = snapshotOf(p);
      if (snap === lastSnap) return;
      undoStack.push(snap);
      /* 字节预算：大项目全量快照很吃内存，合计超 2MB 就丢最旧的 */
      let bytes = undoStack.reduce(function (t, x) { return t + x.length; }, 0);
      while (bytes > 2 * 1024 * 1024 && undoStack.length > 2) {
        bytes -= undoStack[0].length;
        undoStack.shift();
      }
      if (undoStack.length > SNAP_MAX) undoStack.shift();
      redoStack.length = 0;
      lastSnap = snap;
    }, 600);
  }
  function applySnap(snap) {
    const o = JSON.parse(snap);
    const p = projects.find(function (x) { return x.id === o.id; });
    if (!p) return false;
    p.key = o.key;
    p.data = o.data;
    save();
    return true;
  }
  function undo() {
    const p = current();
    if (!p) return false;
    const cur = snapshotOf(p);
    while (undoStack.length) {
      const snap = undoStack.pop();
      if (snap === cur) continue;
      redoStack.push(cur);
      if (!applySnap(snap)) continue;
      lastSnap = snap;
      return true;
    }
    return false;
  }
  function redo() {
    const p = current();
    if (!p) return false;
    const cur = snapshotOf(p);
    while (redoStack.length) {
      const snap = redoStack.pop();
      if (snap === cur) continue;
      undoStack.push(cur);
      if (!applySnap(snap)) continue;
      lastSnap = snap;
      return true;
    }
    return false;
  }

  return {
    templates: templates,
    load: load, save: save, create: create, add: add, remove: remove,
    current: current, select: select, touch: touch,
    all: function () { return projects; },
    currentId: function () { return currentId; },
    renameKey: renameKey,
    newMob: newMob, newItem: newItem, newSkill: newSkill, newDropTable: newDropTable,
    specOf: specOf, specKinds: specKinds, newSpecProject: newSpecProject,
    clone: clone,
    customTemplates: customTemplates, saveCustomTemplate: saveCustomTemplate,
    removeCustomTemplate: removeCustomTemplate, addCustomTemplate: addCustomTemplate, buildCustom: buildCustom,
    undo: undo, redo: redo, baselineSnap: baselineSnap
  };
})();


