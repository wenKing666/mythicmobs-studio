/* YAML 生成 + 预览高亮 */
window.MM_YAML = (function () {
  "use strict";

  const NEED_QUOTE = /[:#\[\]{}&*!|>'"%@`,]/;

  function scalar(v) {
    const s = String(v);
    if (s === "") return "''";
    const looksNum = /^-?\d+(\.\d+)?$/.test(s);
    const looksBool = /^(true|false|yes|no|null|~)$/i.test(s);
    if (!NEED_QUOTE.test(s) && !looksNum && !looksBool &&
        s === s.trim() && s[0] !== "-" && s[0] !== "?" && s[0] !== " ") {
      return s;
    }
    return "'" + s.replace(/'/g, "''") + "'";
  }

  function num(v) {
    return v === "" || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
  }

  function fmtNum(v) {
    const n = Number(v);
    return Number.isInteger(n) ? String(n) : String(n);
  }

  /* 原样保留的值可能是 bool / number / 嵌套，不能一律当字符串加引号 */
  function scalarAny(v) {
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return String(v);
    if (v === null || v === undefined) return "''";
    if (typeof v === "object") return JSON.stringify(v);
    return scalar(v);
  }

  function rawOf(p) {
    return p && p.raw ? p.raw : { head: [], entry: [], others: [], options: {} };
  }

  function pushHead(L, raw) {
    (raw.head || []).forEach(function (l) { L.push(l); });
  }

  /* 未识别的字段块与同文件里的其他条目，原样追加在末尾 */
  function pushTail(L, raw) {
    (raw.entry || []).forEach(function (text) { String(text).split("\n").forEach(function (l) { L.push(l); }); });
    (raw.others || []).forEach(function (text) {
      L.push("");
      String(text).split("\n").forEach(function (l) { L.push(l); });
    });
  }

  /* ---------- 怪物 ---------- */
  function keyOf(p) {
    const raw = String(p.key || "").trim();
    /* 导入来的 ID 原样保留（MM 允许 . 和 -），只在真的非法时才清洗 */
    if (/^[A-Za-z0-9_.\-]+$/.test(raw)) return raw;
    const k = raw.replace(/[^A-Za-z0-9_\-]/g, "_").replace(/^_+|_+$/g, "");
    const sp = specOf(p.kind);
    return k || (p.kind === "mob" ? "my_mob"
      : p.kind === "skill" ? "my_skill"
      : p.kind === "droptable" ? "my_droptable"
      : sp ? sp.keyPrefix : "my_item");
  }

  /* 全部怪物 Options（126 项），带类型与默认值 */
  function mobOptionList() {
    if (!window.MM_OPTS) {
      return MM_DATA.mobOptions.map(function (o) { return { k: o.key, type: o.type, def: o.def }; });
    }
    const out = [];
    (MM_OPTS.universal || []).forEach(function (x) { out.push(x); });
    (MM_OPTS.groups || []).forEach(function (g) { (g.items || []).forEach(function (x) { out.push(x); }); });
    (MM_OPTS.mobs || []).forEach(function (g) { (g.items || []).forEach(function (x) { out.push(x); }); });
    return out;
  }

  /* ---------- AI 行为 / 目标 / 伤害修正 / 掉落 ---------- */

  /* AI 选择器的参数：只写与 wiki 默认值不同的，名字用正式名（AI 的别名很容易撞车） */
  function aiParams(id, values, kind) {
    const def = catOf(kind || "aiGoals", id);
    const parts = [];
    if (!def || !values) return parts;
    (def.params || []).forEach(function (pp) {
      const v = values[pp.name];
      if (v === undefined || v === null) return;
      const sv = String(v).trim();
      if (sv === "") return;
      if (pp.def !== "" && sv === String(pp.def)) return;
      parts.push(pp.name + "=" + pval(sv));
    });
    return parts;
  }

  /* AIGoalSelectors 的行带优先级数字（官方 51 个例子都是 "- 0 clear" 这种写法）；
     AITargetSelectors 的行不带数字。别把两者统一成一个形态。
     优先级只在文件里本来就写了数字时才补，避免把纯 `- clear` 的写法改花。 */
  function aiGoalLines(list) {
    const out = [];
    const rows = (list || []).filter(function (r) { return r && r.goal; });
    const numbered = rows.some(function (r) { return r.priority !== undefined && r.priority !== null && r.priority !== ""; });
    rows.forEach(function (row) {
      const parts = aiParams(row.goal, row.params, "aiGoals");
      const body = parts.length ? row.goal + "{" + parts.join(";") + "}" : row.goal;
      out.push(numbered ? String(row.priority !== undefined && row.priority !== "" ? row.priority : out.length) + " " + body : body);
    });
    return out;
  }

  function aiTargetLines(list) {
    const out = [];
    (list || []).forEach(function (row) {
      const id = row.target;
      if (!id) return;
      const parts = aiParams(id, row.params, "aiTargets");
      out.push(parts.length ? id + "{" + parts.join(";") + "}" : id);
    });
    return out;
  }

  /* 伤害修正：正数=倍率，0=免疫但仍有受伤动画，负数=取消伤害并按绝对值回血 */
  function damageModifierLines(list) {
    const out = [];
    (list || []).forEach(function (m) {
      const t = String(m.type || "").trim().toUpperCase();
      const v = String(m.value === undefined || m.value === null ? "" : m.value).trim();
      if (!t || v === "") return;
      out.push(t + " " + v);
    });
    return out;
  }

  /* 一条掉落可以是：原版/自定义物品（可带行内 {参数}）、某个掉落类型、或引用掉落表 */
  function dropLine(x) {
    if (x.table) return String(x.table).trim();
    if (x.type) {
      const v = String(x.value || "").trim();
      const c = String(x.chance || "").trim();
      /* cmd / mythicitem 这类要把参数写在花括号里：`cmd{cmd="give ..."} 1 0.5` */
      const inline = String(x.params || "").trim();
      const head = x.type + (inline ? "{" + inline.replace(/^\{|\}$/g, "") + "}" : "");
      return head + (v ? " " + v : "") + (c ? " " + c : "");
    }
    const item = String(x.item || "").trim();
    if (!item) return "";
    const inline = String(x.params || "").trim();
    const head = inline ? item + "{" + inline.replace(/^\{|\}$/g, "") + "}" : item;
    const amt = String(x.amount === undefined || x.amount === null || x.amount === "" ? "1" : x.amount).trim();
    const c = String(x.chance || "").trim();
    return head + " " + amt + (c ? " " + c : "");
  }

  function hasDrop(x) {
    return !!(x && (String(x.item || "").trim() || String(x.type || "").trim() || String(x.table || "").trim()));
  }

  function dropBlock(L, drops, indent) {
    const rows = (drops || []).filter(hasDrop).map(dropLine).filter(Boolean);
    if (!rows.length) return false;
    rows.forEach(function (r) { L.push(indent + "- " + r); });
    return true;
  }

  function mob(p) {
    const d = p.data, L = [];
    const raw = rawOf(p);
    pushHead(L, raw);
    L.push(keyOf(p) + ":");
    L.push("  Type: " + (d.type || ""));
    if (d.display) L.push("  Display: " + scalar(d.display));
    if (num(d.health) !== null) L.push("  Health: " + fmtNum(d.health));
    if (num(d.damage) !== null && Number(d.damage) > 0) L.push("  Damage: " + fmtNum(d.damage));
    if (num(d.armor) !== null && Number(d.armor) > 0) L.push("  Armor: " + fmtNum(d.armor));

    /* 0.7.0 补齐的 15 个顶层字段（Level / LevelModifiers / Faction / HealthBar /
       Nameplate / DisplayOptions / MannequinOptions / Modules / Hearing /
       AIPathfindingMalus / Variables / Trades / Totem / Mount / Disguise），
       字段表在 spec-data.js 的 mobExtra 里，按表顺序接在基础属性后面 */
    if (window.MM_SPEC) {
      MM_SPEC.toYaml(MM_SPEC.mobExtraFields(), d.extra || {}, 2).forEach(function (line) { L.push(line); });
    }

    // BOSS 血条
    const bb = d.bossbar;
    if (bb && bb.enabled) {
      L.push("  BossBar:");
      L.push("    Enabled: true");
      L.push("    Title: " + scalar(bb.title || d.display || p.key));
      L.push("    Range: " + fmtNum(bb.range || 30));
      L.push("    Color: " + (bb.color || "RED"));
      L.push("    Style: " + (bb.style || "SOLID"));
    }

    // 选项：只输出与默认值不同的（默认值取自官方 wiki，126 项）
    const opts = [];
    mobOptionList().forEach(function (o) {
      const v = d.options[o.k];
      if (v === undefined || v === null) return;
      if (o.type === "bool") {
        if (!!v !== !!o.def) opts.push("    " + o.k + ": " + (v ? "true" : "false"));
      } else if (o.type === "number") {
        if (v !== "" && Number(v) !== Number(o.def)) opts.push("    " + o.k + ": " + fmtNum(v));
      } else {
        const sv = String(v).trim();
        const dv = o.def === undefined || o.def === null ? "" : String(o.def);
        if (sv !== "" && sv !== dv) opts.push("    " + o.k + ": " + scalar(sv));
      }
    });
    if (opts.length || Object.keys(raw.options || {}).length) {
      L.push("  Options:");
      L.push.apply(L, opts);
      /* 表单不认识的 Options 键（版本差异/扩展插件），原样写回 */
      Object.keys(raw.options || {}).forEach(function (k) {
        L.push("    " + k + ": " + scalarAny(raw.options[k]));
      });
    }

    // 装备
    const eq = (d.equipment || []).filter(function (e) { return e.item; });
    if (eq.length) {
      L.push("  Equipment:");
      eq.forEach(function (e) { L.push("  - " + e.item + " " + e.slot); });
    }

    // AI：行为选择器带优先级数字，目标选择器不带
    const ag = aiGoalLines(d.aiGoals);
    if (ag.length) {
      L.push("  AIGoalSelectors:");
      ag.forEach(function (x) { L.push("  - " + x); });
    }
    const at = aiTargetLines(d.aiTargets);
    if (at.length) {
      L.push("  AITargetSelectors:");
      at.forEach(function (x) { L.push("  - " + x); });
    }
    const dm = damageModifierLines(d.damageModifiers);
    if (dm.length) {
      L.push("  DamageModifiers:");
      dm.forEach(function (x) { L.push("  - " + x); });
    }

    // 技能（含导入时无法结构化、只能原样保留的行）
    const sk = (d.skills || []).filter(function (s) { return s.raw || s.mechanic; });
    if (sk.length) {
      L.push("  Skills:");
      sk.forEach(function (s) { L.push("  - " + (s.raw || skillLine(s))); });
    }

    // 掉落
    if ((d.drops || []).filter(hasDrop).length) {
      L.push("  Drops:");
      dropBlock(L, d.drops, "  ");
    }
    pushTail(L, raw);
    return L.join("\n") + "\n";
  }

  /* 参数值里含空格或分隔符时要加引号，否则 MM 会把后半截当成新参数 */
  function pval(v) {
    const s = String(v);
    if (/^".*"$/.test(s) || /^'.*'$/.test(s)) return s;
    if (/[\s;{}@~]/.test(s)) return '"' + s.replace(/"/g, '\\"') + '"';
    return s;
  }

  function catOf(kind, id) {
    const c = window.MM_CATALOG;
    if (!c || !c[kind]) return null;
    for (let i = 0; i < c[kind].length; i++) if (c[kind][i].id === id) return c[kind][i];
    return null;
  }

  function mechParamsOf(id) {
    const m = mechDefOf(id);
    return m ? m.params : null;
  }

  /* catalog 优先；测试或降级场景下回退到手写表 */
  function mechDefOf(id) {
    const c = catOf("mechanics", id);
    if (c) return c;
    const old = MM_DATA.mechanics.filter(function (x) { return x.id === id; })[0];
    return old ? { id: old.id, zh: old.zh, en: old.id, params: old.params || [] } : null;
  }

  /* 输出时用最短的别名：radius → r，health → h，和 wiki 示例一致 */
  function shortParamName(pp) {
    if (pp && pp.aliases && pp.aliases.length) {
      let best = pp.aliases[0];
      for (let i = 1; i < pp.aliases.length; i++) {
        if (pp.aliases[i].length < best.length) best = pp.aliases[i];
      }
      return best;
    }
    return pp ? pp.name : "";
  }

  /* 所有目标器共用的通用参数（筛选 / 偏移 / 坐标），wiki 里挂在 Targeters 说明页 */
  function targeterUniversal() {
    const t = catOf("targeters", "targeters");
    return t ? (t.params || []) : [];
  }

  function skTarget(s) {
    if (!s.targeter) return "";
    /* @self 是默认行为，不写出来，配置更干净 */
    if (s.targeter === "self") return "";

    const tg = catOf("targeters", s.targeter);
    if (!tg) {
      /* 目录里没有（旧手写表 / 插件自定义目标器）→ 退回手写模板 */
      const old = MM_DATA.targeters.filter(function (x) { return x.id === s.targeter; })[0];
      if (old && old.tpl) {
        const r = (s.targetParams && s.targetParams.radius) || s.radius || old.defaultR || 5;
        return " " + old.tpl.replace("%r%", r);
      }
      return " @" + s.targeter;
    }
    const parts = [];
    (tg.params || []).forEach(function (pp) {
      const v = s.targetParams ? s.targetParams[pp.name] : undefined;
      if (v === undefined || v === null || v === "") return;
      if (pp.type === "boolean") { if (v === "true" || v === true) parts.push(shortParamName(pp) + "=true"); return; }
      parts.push(shortParamName(pp) + "=" + pval(v));
    });
    /* 通用筛选（targetplayers / sort / limit…）与偏移坐标写在同一个花括号里 */
    targeterUniversal().forEach(function (pp) {
      const v = s.targetParams ? s.targetParams[pp.name] : undefined;
      if (v === undefined || v === null || v === "") return;
      if (pp.type === "boolean") { if (v === "true" || v === true) parts.push(pp.name + "=true"); return; }
      if (pp.def !== "" && pp.def !== undefined && String(v) === String(pp.def)) return;
      parts.push(pp.name + "=" + pval(v));
    });
    /* 单词型用 id（@target / @self），组合词用驼峰（@PlayersInRadius），和 wiki 一致 */
    const enName = String(tg.en || tg.id);
    const name = /\s/.test(enName) ? enName.replace(/\s+/g, "") : tg.id;
    return " @" + name + (parts.length ? "{" + parts.join(";") + "}" : "");
  }

  function skTrigger(s) {
    const old = MM_DATA.triggers.filter(function (x) { return x.id === s.trigger; })[0];
    if (old && old.syntax) {
      let syn = old.syntax;
      if (old.needsTicks) syn = syn.replace("%t%", String((Number(s.seconds) || 10) * 20));
      return " " + syn;
    }
    if (!s.trigger) return "";
    if (s.trigger === "ontimer") return " ~onTimer:" + String((Number(s.seconds) || 10) * 20);
    const tg = catOf("triggers", s.trigger);
    const name = tg ? String(tg.en || tg.id).replace(/\s+/g, "") : s.trigger;
    return " ~" + name;
  }

  function condText(c) {
    if (!c || !c.id) return "";
    const cd = catOf("conditions", c.id);
    const byName = {};
    (cd ? cd.params || [] : []).forEach(function (pp) { byName[pp.name] = pp; });
    const parts = [];
    Object.keys(c.params || {}).forEach(function (k) {
      const v = c.params[k];
      if (v === undefined || v === null || v === "") return;
      if (v === "false" || v === false) return;
      const pp = byName[k];
      parts.push((pp ? shortParamName(pp) : k) + "=" + pval(v));
    });
    return "?" + c.id + (parts.length ? "{" + parts.join(";") + "}" : "");
  }

  function skillLine(s) {
    if (s.raw) return String(s.raw).replace(/^\s*-\s*/, "");

    const parts = [];
    const defs = mechParamsOf(s.mechanic);
    const known = {};
    (defs || []).forEach(function (p) {
      known[p.name] = 1;
      const v = s.params ? s.params[p.name] : undefined;
      if (v === undefined || v === null || v === "") return;
      if (p.type === "bool" || p.type === "boolean") {
        if (v === true || v === "true") parts.push(p.name + "=true");
        return;
      }
      parts.push(p.name + "=" + pval(v));
    });

    /* 定义外的参数（导入时保留下来的、或是插件新增的）不丢 */
    Object.keys(s.params || {}).forEach(function (k) {
      if (known[k]) return;
      const v = s.params[k];
      if (v === undefined || v === null || v === "") return;
      if (v === "false" || v === false) return;
      parts.push(k + "=" + pval(v));
    });

    /* 通用修饰：顺序以目录为准（冷却 / 延迟 / 重复 / 间隔 / 概率 / 起点…），目录外的新键追加在后 */
    const uni = s.universal || {};
    const uniKeys = ((window.MM_CATALOG && window.MM_CATALOG.universal) || [])
      .map(function (x) { return x.name; });
    ["cooldown", "delay", "repeat", "repeatInterval", "chance"].forEach(function (k) {
      if (uniKeys.indexOf(k) < 0) uniKeys.push(k);
    });
    Object.keys(uni).forEach(function (k) {
      if (uniKeys.indexOf(k) < 0) uniKeys.push(k);
    });
    uniKeys.forEach(function (k) {
      const v = uni[k];
      if (v === undefined || v === null || v === "") return;
      parts.push(k + "=" + pval(v));
    });

    let out = s.mechanic + (parts.length ? "{" + parts.join(";") + "}" : "");
    out += skTarget(s);
    (s.conditions || []).forEach(function (c) {
      const t = condText(c);
      if (t) out += " " + t;
    });
    out += skTrigger(s);
    return out;
  }

  /* ---------- 物品 ---------- */
  /* ---------- 物品组件（1.20.5+ 的 data component 映射） ---------- */

  function itemCompSpec() {
    return (window.MM_EXTRAS && MM_EXTRAS.itemComponents) || [];
  }

  function itemComponentLines(L, comps) {
    if (!comps) return;
    const spec = itemCompSpec();
    const order = {};
    spec.forEach(function (c, i) { order[c.id] = i; });
    const defOf = {};
    spec.forEach(function (c) { defOf[c.id] = c; });

    const ids = Object.keys(comps).sort(function (a, b) {
      const ia = order[a] === undefined ? 999 : order[a];
      const ib = order[b] === undefined ? 999 : order[b];
      return ia - ib || (a < b ? -1 : a > b ? 1 : 0);
    });

    ids.forEach(function (id) {
      const entry = comps[id];
      if (!entry) return;
      const c = defOf[id];
      const sf = window.MM_SPEC ? MM_SPEC.itemComponentFields(id) : null;
      const fields = entry.params || {};
      const keys = Object.keys(fields).filter(function (k) {
        const v = fields[k];
        return v !== undefined && v !== null && (typeof v === "object" || String(v).trim() !== "");
      });

      /* 列表形态（UnsetComponents / Hide 的单值列表） */
      if (entry.list && entry.list.length) {
        const vals = entry.list.filter(function (x) { return String(x).trim() !== ""; });
        if (!vals.length) return;
        L.push("  " + id + ":");
        vals.forEach(function (v) { L.push("  - " + String(v).trim()); });
        return;
      }

      /* 标量形态优先：OminousBottleAmplifier / Rarity / PaintingVariant…
         这类组件的值就一个，写成子块反而错 */
      const scalarVal = entry.value;
      if (!keys.length && scalarVal !== undefined && scalarVal !== null && String(scalarVal).trim() !== "") {
        L.push("  " + id + ": " + scalarAny(scalarVal));
        return;
      }

      if (!keys.length) return;

      let lines = [];
      if (sf) {
        /* 有字段表的组件走通用引擎，列表 / 键值 / 数字类型都由它保证 */
        lines = MM_SPEC.toYaml(sf, fields, 0).map(function (l) { return "    " + l; });
      } else {
        const pdefs = {};
        ((c && c.params) || []).forEach(function (pp) { pdefs[pp.name] = pp; });
        /* 先按 wiki 顺序输出已知子键，再补表单不认识的 */
        const known = ((c && c.params) || []).map(function (pp) { return pp.name; });
        const rest = keys.filter(function (k) { return known.indexOf(k) < 0; });
        known.concat(rest).forEach(function (k) {
          const v = fields[k];
          if (v === undefined || v === null) return;
          /* 列表 / 键值子键（Hide.flags、NBT.tags、BlockStates.states…）要展开写 */
          if (Array.isArray(v)) {
            const vals = v.filter(function (x) { return String(x).trim() !== ""; });
            if (!vals.length) return;
            lines.push("    " + k + ":");
            vals.forEach(function (x) { lines.push("    - " + scalarAny(x)); });
            return;
          }
          if (typeof v === "object") {
            const ks = Object.keys(v).filter(function (kk) {
              return v[kk] !== undefined && v[kk] !== null && String(v[kk]).trim() !== "";
            });
            if (!ks.length) return;
            lines.push("    " + k + ":");
            ks.forEach(function (kk) { lines.push("      " + kk + ": " + scalarAny(v[kk])); });
            return;
          }
          if (typeof v === "boolean") { lines.push("    " + k + ": " + (v ? "true" : "false")); return; }
          const sv = String(v).trim();
          if (sv === "") return;
          const pp = pdefs[k];
          if (pp && pp.def !== "" && pp.type !== "boolean" && sv === String(pp.def)) return;
          /* 数字与布尔值都要保持原类型，写成 '1.5' 组件会读不到 */
          if (pp && pp.type === "number" && /^-?\d+(\.\d+)?$/.test(sv)) { lines.push("    " + k + ": " + sv); return; }
          if (/^(true|false)$/i.test(sv)) { lines.push("    " + k + ": " + sv.toLowerCase()); return; }
          lines.push("    " + k + ": " + scalarAny(v));
        });
      }

      if (!lines.length) return;
      L.push("  " + id + ":");
      L.push.apply(L, lines);
    });
  }

  /* 物品 Options 清单：优先用从 wiki 抽出来的 17 项（data/zh/items.json + build_extras.py），
     早期 data.js 里那 4 项只在没有 extras 数据时兜底。 */
  function itemOptionList() {
    const ex = (window.MM_EXTRAS && MM_EXTRAS.itemOptions) || [];
    if (ex.length) {
      return ex.map(function (o) {
        return {
          key: o.id,
          label: o.zh || o.id,
          type: o.type === "boolean" ? "bool" : o.type,
          def: o.def,
          desc: o.desc || ""
        };
      });
    }
    return MM_DATA.itemOptions;
  }

  function item(p) {
    const d = p.data, L = [];
    const raw = rawOf(p);
    pushHead(L, raw);
    L.push(keyOf(p) + ":");
    L.push("  Id: " + (d.material || ""));
    if (d.display) L.push("  Display: " + scalar(d.display));
    if (num(d.amount) !== null && Number(d.amount) !== 1) L.push("  Amount: " + fmtNum(d.amount));

    const lore = (d.lore || []).filter(function (x) { return x !== ""; });
    if (lore.length) {
      L.push("  Lore:");
      lore.forEach(function (x) { L.push("  - " + scalar(x)); });
    }

    const opts = [];
    itemOptionList().forEach(function (o) {
      const v = d.options[o.key];
      if (v === undefined || v === null) return;
      if (o.type === "bool") {
        /* extras 里的默认值是字符串 "true"/"false"，不能直接 !!，否则 "false" 会被当成真 */
        const dflt = o.def === true || o.def === "true";
        if (!!v !== dflt) opts.push("    " + o.key + ": " + (v ? "true" : "false"));
      }
      else if (o.type === "number") {
        if (String(v).trim() !== "" && Number(v) !== Number(o.def)) opts.push("    " + o.key + ": " + fmtNum(v));
      } else {
        const sv = String(v).trim();
        if (sv !== "" && sv !== String(o.def === undefined || o.def === null ? "" : o.def)) {
          opts.push("    " + o.key + ": " + scalar(sv));
        }
      }
    });
    if (opts.length || Object.keys(raw.options || {}).length) {
      L.push("  Options:");
      L.push.apply(L, opts);
      Object.keys(raw.options || {}).forEach(function (k) {
        L.push("    " + k + ": " + scalarAny(raw.options[k]));
      });
    }

    const en = (d.enchants || []).filter(function (e) { return e.name; });
    if (en.length) {
      L.push("  Enchantments:");
      en.forEach(function (e) { L.push("  - " + e.name + " " + (e.level || 1)); });
    }

    const at = (d.attributes || []).filter(function (a) { return a.name; });
    if (at.length) {
      L.push("  Attributes:");
      const bySlot = {};
      at.forEach(function (a) {
        const slot = a.slot || "All";
        (bySlot[slot] = bySlot[slot] || []).push(a);
      });
      Object.keys(bySlot).forEach(function (slot) {
        L.push("    " + slot + ":");
        bySlot[slot].forEach(function (a) {
          L.push("      " + a.name + ": " + a.value + " " + (a.op || "ADD"));
        });
      });
    }
    itemComponentLines(L, d.components);
    pushTail(L, raw);
    return L.join("\n") + "\n";
  }

  /* ---------- 掉落表（DropTables，独立文件） ---------- */

  function droptable(p) {
    const d = p.data, L = [];
    const raw = rawOf(p);
    pushHead(L, raw);
    L.push(keyOf(p) + ":");
    /* 数字就该是数字：写成 '0.1' 会让 MM 读成字符串 */
    function numOrText(v) {
      const s = String(v).trim();
      return /^-?\d+(\.\d+)?$/.test(s) ? s : scalarAny(s);
    }
    [["TotalItems", d.totalItems], ["MinItems", d.minItems], ["MaxItems", d.maxItems],
     ["BonusLevelItems", d.bonusLevelItems], ["BonusLuckItems", d.bonusLuckItems],
     ["BiasStat", d.biasStat]].forEach(function (b) {
      const v = b[1];
      if (v === undefined || v === null || String(v).trim() === "") return;
      L.push("  " + b[0] + ": " + (b[0] === "BiasStat" ? scalarAny(String(v).trim()) : numOrText(v)));
    });

    [["Conditions", d.conditions], ["TriggerConditions", d.triggerConditions]].forEach(function (b) {
      const lines = (b[1] || []).map(metaskillCondLine).filter(Boolean);
      if (!lines.length) return;
      L.push("  " + b[0] + ":");
      lines.forEach(function (t) { L.push("  - " + t); });
    });

    if ((d.drops || []).filter(hasDrop).length) {
      L.push("  Drops:");
      dropBlock(L, d.drops, "  ");
    }
    pushTail(L, raw);
    return L.join("\n") + "\n";
  }

  /* ---------- 技能组（Metaskill） ---------- */

  /* 技能组 Conditions 里的条件不带 ?，可选后缀 true/false 表示「期望不成立」 */
  function metaskillCondLine(c) {
    const t = condText(c);
    if (!t) return "";
    let out = t.replace(/^\?/, "");
    if (c.expect === "true" || c.expect === "false") out += " " + c.expect;
    return out;
  }

  function metaskill(p) {
    const d = p.data, L = [];
    const raw = rawOf(p);
    pushHead(L, raw);
    L.push(keyOf(p) + ":");
    if (d.cancelIfNoTargets === "true") L.push("  CancelIfNoTargets: true");
    if (d.hidden === "true") L.push("  Hidden: true");

    [["Conditions", d.conditions],
     ["TargetConditions", d.targetConditions],
     ["TriggerConditions", d.triggerConditions]].forEach(function (b) {
      const lines = (b[1] || []).map(metaskillCondLine).filter(Boolean);
      if (!lines.length) return;
      L.push("  " + b[0] + ":");
      lines.forEach(function (t) { L.push("  - " + t); });
    });

    if (d.failedConditionsSkill) L.push("  FailedConditionsSkill: " + scalar(d.failedConditionsSkill));
    if (num(d.cooldown) !== null) L.push("  Cooldown: " + fmtNum(d.cooldown));
    if (d.onCooldownSkill) L.push("  OnCooldownSkill: " + scalar(d.onCooldownSkill));
    if (d.skill) L.push("  Skill: " + scalar(d.skill));

    const sk = (d.skills || []).filter(function (s) { return s.raw || s.mechanic; });
    if (sk.length) {
      L.push("  Skills:");
      sk.forEach(function (s) { L.push("  - " + (s.raw || skillLine(s))); });
    }
    pushTail(L, raw);
    return L.join("\n") + "\n";
  }

  /* ---------- 必填校验 ---------- */
  function checkSkillRows(list, out) {
    (list || []).forEach(function (s, i) {
      if (s.raw) return;                      // 原样保留的技能行不拦
      const mech = mechDefOf(s.mechanic);
      if (!mech) { out.push("第 " + (i + 1) + " 个技能：效果未选择"); return; }
      (mech.params || []).forEach(function (pp) {
        if (!pp.required) return;
        const v = s.params ? s.params[pp.name] : undefined;
        if (v === undefined || v === null || String(v).trim() === "") {
          out.push("技能「" + (mech.zh || mech.en || mech.id) + "」的 " + (pp.zh || pp.label || pp.name) + " 没填");
        }
      });
    });
  }

  /* ---------- 引用检查 ----------
     skill{s=xxx} / FailedConditionsSkill / Drops 里的掉落表名都是自由文本，写错不会报错，
     服务器只会静默不执行。只在真的扫过服务器目录（MM_REFS 已建）时才查，
     否则纯手工编辑时满屏假警告。 */
  function refIssues(p) {
    return scanRefs(p).missing.map(function (m) { return m.msg; });
  }

  /* 结构化版：missing 里带 kind/name 供「一键新建」，found 是确实存在的引用（可跳转）。
     纯浏览器没有 MM_REFS 时两个都返回空。 */
  function refMissing(p) {
    return scanRefs(p).missing;
  }

  function refFound(p) {
    return scanRefs(p).found;
  }

  function scanRefs(p) {
    const refs = window.MM_REFS;
    const missing = [], found = { skills: [], droptables: [] };
    if (!refs || !p) return { missing: missing, found: found };
    const seen = { skills: {}, droptables: {} };
    function record(kind, name, where, ok) {
      if (seen[kind][name]) return;   /* 同一个名字只报一次 */
      seen[kind][name] = true;
      if (ok) found[kind].push(name);
      else missing.push({
        kind: kind, name: name,
        msg: where + "引用的「" + name + "」在 " + (kind === "skills" ? "Skills/" : "Drops/") + " 目录里找不到"
      });
    }
    function miss(kind, name, where) {
      const set = refs[kind];
      if (!set || !name) return;
      let n = String(name).trim();
      /* `- table:boss_loot` 前缀只是语法，比的是表名 */
      if (kind === "droptables") n = n.replace(/^table\s*:\s*/i, "").trim();
      /* 带占位符或变量的名字没法静态判断，放过 */
      if (!n || /[<${}]/.test(n)) return;
      record(kind, n, where, !!set[n.toLowerCase()]);
    }
    /* `skill{s=xxx;cooldown=2}` 里取技能组名；s / skill / name 都认 */
    function pickSkillArg(args) {
      const m = /(?:^|;)\s*(?:s|skill|name)\s*=\s*([^;]+)/i.exec(String(args || ""));
      return m ? m[1].replace(/^["']|["']$/g, "").trim() : "";
    }
    /* skill{...} 这类整行在导入时是不解析的（保留原样），但恰恰是最常见的引用点，
       所以要把原文里所有 skill{ } / metaskill{ } 抠出来查一遍 */
    function scanRaw(text, where) {
      const re = /(?:^|[\s@>])(?:skill|metaskill)\s*\{([^}]*)\}/gi;
      const s = String(text || "");
      let m;
      while ((m = re.exec(s))) miss("skills", pickSkillArg(m[1]), where);
    }
    const d = p.data || {};
    if (p.kind === "mob" || p.kind === "skill") {
      (d.skills || []).forEach(function (s, i) {
        const where = "第 " + (i + 1) + " 个技能：";
        if (s.raw) { scanRaw(s.raw, where); return; }
        if (!s.mechanic) return;
        const m = String(s.mechanic).toLowerCase();
        if (m !== "skill" && m !== "metaskill") return;
        const v = s.params && (s.params.skill || s.params.s || s.params.name);
        miss("skills", v, where);
      });
      ["failedConditionsSkill", "onCooldownSkill", "skill"].forEach(function (k) {
        miss("skills", d[k], k === "failedConditionsSkill" ? "条件不满足时" : k === "onCooldownSkill" ? "冷却中时" : "并发执行的技能组");
      });
    }
    if (p.kind === "mob" || p.kind === "droptable") {
      (d.drops || []).forEach(function (x, i) {
        if (x && x.table) miss("droptables", x.table, "第 " + (i + 1) + " 条掉落：");
      });
    }
    return { missing: missing, found: found };
  }

  /* ---------- 通用配置类型（Spawners / RandomSpawns / Stats / Menus / Dialogs /
     Cinematics / Pins / Packs / VanillaMobs），字段定义在 spec-data.js ---------- */

  function specOf(kind) {
    return (window.MM_SPEC && MM_SPEC.type(kind)) || null;
  }

  function specDoc(p) {
    const spec = specOf(p.kind);
    if (!spec) return "";
    const fields = MM_SPEC.flatFields(spec);
    const raw = rawOf(p);
    const L = [];
    pushHead(L, raw);
    /* pins.yml 是列表（每项 - 开头）、pack.yml 直接写字段、其余包一层 ID */
    const mode = spec.listFile ? "list" : (spec.wrap ? "wrap" : "flat");
    const text = MM_SPEC.docYaml(keyOf(p), fields, p.data.fields || {}, { mode: mode });
    String(text).split("\n").forEach(function (line) {
      if (line.trim() !== "") L.push(line);
    });
    /* 列表项里没识别的字段：留在这一项里（缩进 2），不能甩到文件末尾 */
    if (mode === "list") {
      (raw.itemExtra || []).forEach(function (line) { L.push(line); });
    }
    pushTail(L, raw);
    if (!L.length) return "";
    return L.join("\n") + "\n";
  }

  function validateSpec(p, out) {
    const spec = specOf(p.kind);
    if (!spec) return;
    const store = p.data.fields || {};
    MM_SPEC.flatFields(spec).forEach(function (f) {
      if (!f.r) return;
      if (MM_SPEC.isEmpty(store[f.k])) out.push((f.z || f.k) + " 不能为空");
    });
    /* Dialog 的输入项键名只能是字母数字下划线，写错了 <dialog.x> 取不到值 */
    if (p.kind === "dialog") {
      (store.Inputs || []).forEach(function (row, i) {
        const k = String(row.Key || "").trim();
        if (!k) out.push("第 " + (i + 1) + " 个输入项没填键名");
        else if (!/^[A-Za-z0-9_]+$/.test(k)) out.push("第 " + (i + 1) + " 个输入项的键名只能有字母、数字、下划线");
      });
    }
  }

  function validate(p) {
    const out = [];
    if (!p) return out;
    /* pack.yml 这种「一个目录只有一份」的文件没有 ID 概念 */
    const single = specOf(p.kind) && specOf(p.kind).single;
    if (!single && !String(p.key || "").trim()) out.push("ID 不能为空");

    if (specOf(p.kind)) {
      validateSpec(p, out);
    } else if (p.kind === "mob") {
      if (!p.data.type) out.push("生物类型未选择");
      checkSkillRows(p.data.skills, out);
      (p.data.equipment || []).forEach(function (e, i) {
        if (!e.item || !String(e.item).trim()) out.push("第 " + (i + 1) + " 件装备没选物品");
      });
      (p.data.drops || []).forEach(function (x, i) {
        if (!hasDrop(x)) out.push("第 " + (i + 1) + " 条掉落没选物品");
      });
      (p.data.damageModifiers || []).forEach(function (m, i) {
        if (!String(m.type || "").trim()) out.push("第 " + (i + 1) + " 条伤害修正没选伤害类型");
        else if (String(m.value === undefined || m.value === null ? "" : m.value).trim() === "" ||
                 isNaN(Number(m.value))) out.push("第 " + (i + 1) + " 条伤害修正的倍率无效");
      });
    } else if (p.kind === "droptable") {
      if (!(p.data.drops || []).filter(hasDrop).length) out.push("掉落表至少要有 1 条掉落");
      [["TotalItems", p.data.totalItems], ["MinItems", p.data.minItems],
       ["MaxItems", p.data.maxItems]].forEach(function (b) {
        const v = b[1];
        if (v === undefined || v === null || String(v).trim() === "") return;
        if (isNaN(Number(v)) || Number(v) < 0) out.push(b[0] + " 必须是非负数字");
      });
      [["条件", p.data.conditions], ["触发条件", p.data.triggerConditions]]
        .forEach(function (b) {
          (b[1] || []).forEach(function (c, i) {
            if (!c.id) out.push("第 " + (i + 1) + " 个" + b[0] + "：条件未选择");
          });
        });
    } else if (p.kind === "skill") {
      checkSkillRows(p.data.skills, out);
      [["条件", p.data.conditions], ["目标条件", p.data.targetConditions], ["触发条件", p.data.triggerConditions]]
        .forEach(function (b) {
          (b[1] || []).forEach(function (c, i) {
            if (!c.id) out.push("第 " + (i + 1) + " 个" + b[0] + "：条件未选择");
          });
        });
    } else {
      if (!p.data.material) out.push("物品材质未选择");
      (p.data.enchants || []).forEach(function (e, i) {
        if (!e.name || !String(e.name).trim()) out.push("第 " + (i + 1) + " 个附魔没选");
        else if (e.level === "" || e.level === null || isNaN(Number(e.level)) || Number(e.level) < 1) {
          out.push("第 " + (i + 1) + " 个附魔的等级无效");
        }
      });
      (p.data.attributes || []).forEach(function (a, i) {
        if (!a.name || !String(a.name).trim()) out.push("第 " + (i + 1) + " 条属性没选");
        else if (a.value === "" || a.value === null || isNaN(Number(a.value))) {
          out.push("第 " + (i + 1) + " 条属性的数值无效");
        }
      });
    }
    /* 引用检查只做提示，不算「填不完不能保存」——技能组名写错是服务器那边静默失败，
       这儿拦下来只会让人没法存盘。所以放在 refIssues 里，由界面单独显示。 */
    return out;
  }

  function generate(p) {
    if (!p) return "# 左边选一个模板，或点「新建怪物」开始\n";
    if (p.kind === "mob") return mob(p);
    if (p.kind === "skill") return metaskill(p);
    if (p.kind === "droptable") return droptable(p);
    if (specOf(p.kind)) return specDoc(p);
    return item(p);
  }

  /* ---------- 高亮 ---------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function hlValue(v) {
    if (!v) return "";
    // 注释
    let out = "", rest = v;
    const ci = rest.indexOf(" #");
    let comment = "";
    if (ci >= 0) { comment = rest.slice(ci); rest = rest.slice(0, ci); }
    if (/^\s*'/.test(rest) || /^\s*"/.test(rest)) out = '<span class="s">' + esc(rest) + "</span>";
    else if (/^\s*-?\d+(\.\d+)?\s*$/.test(rest)) out = '<span class="n">' + esc(rest) + "</span>";
    else out = esc(rest);
    if (comment) out += '<span class="c">' + esc(comment) + "</span>";
    return out;
  }

  function highlight(text) {
    return text.split("\n").map(function (line) {
      if (/^\s*#/.test(line)) return '<span class="c">' + esc(line) + "</span>";
      const m = line.match(/^(\s*)([A-Za-z_][\w.\-]*)(:(?:\s|$))(.*)$/);
      if (m) return esc(m[1]) + '<span class="k">' + esc(m[2]) + "</span>" + esc(m[3]) + hlValue(m[4]);
      const l = line.match(/^(\s*)(- )(.*)$/);
      if (l) {
        const inner = l[3];
        const q = inner.match(/^([\w.\-]+)(:)(.*)$/);
        if (q) return esc(l[1]) + '<span class="h">- </span><span class="k">' + esc(q[1]) + "</span>:" + hlValue(q[3]);
        return esc(l[1]) + '<span class="h">- </span>' + hlValue(inner);
      }
      return esc(line);
    }).join("\n");
  }

  /* 通用引擎要用同两套渲染：条件去掉行内问号、技能行不带列表前缀 */
  if (window.MM_SPEC) {
    MM_SPEC.adapters.condText = function (c) { return metaskillCondLine(c); };
    MM_SPEC.adapters.skillText = function (s) {
      return String(skillLine(s) || "").replace(/^\s*-\s*/, "");
    };
  }

  return { generate: generate, validate: validate, refIssues: refIssues, refMissing: refMissing, refFound: refFound, mob: mob, item: item, specDoc: specDoc, highlight: highlight, scalar: scalar };
})();

