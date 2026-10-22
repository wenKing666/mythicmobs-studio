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
        options: defaultOptions(MM_DATA.itemOptions)
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
    const p = kind === "mob" ? newMob() : newItem();
    p.key = uniqueKey(kind === "mob" ? "my_mob" : "my_item");
    p.data.display = kind === "mob" ? "&c我的怪物" : "&b我的物品";
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
        const defs = p.kind === "mob" ? mobOptionDefaults() : defaultOptions(MM_DATA.itemOptions);
        p.data.options = Object.assign(defs, p.data.options || {});
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
    newMob: newMob, newItem: newItem
  };
})();


