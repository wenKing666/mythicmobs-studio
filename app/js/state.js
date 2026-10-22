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
        drops: []
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
    return project;
  }

  function create(kind) {
    const p = kind === "mob" ? newMob()
      : kind === "skill" ? newSkill()
      : kind === "droptable" ? newDropTable()
      : newItem();
    const baseKey = kind === "mob" ? "my_mob"
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

  function select(id) { currentId = id; save(); }

  function touch() {
    const p = current();
    if (p) { p.updated = Date.now(); save(); }
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

  return {
    templates: templates,
    load: load, save: save, create: create, add: add, remove: remove,
    current: current, select: select, touch: touch,
    all: function () { return projects; },
    currentId: function () { return currentId; },
    renameKey: renameKey,
    newMob: newMob, newItem: newItem, newSkill: newSkill, newDropTable: newDropTable
  };
})();


