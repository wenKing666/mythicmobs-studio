/* 导入：服务器 yml → 项目模型
   原则：能结构化的进表单；认不出的（AIGoalSelectors、行内条件、陌生机制…）整块原样保留，
   保存时再原样写回，做到"改一个字段，别的字段不丢"。 */
window.MM_IMPORT = (function () {
  "use strict";

  /* 表单能管的顶层字段；不在这里的，整块留原文 */
  const MOB_KEYS = ["Type", "Display", "Health", "Damage", "Armor", "BossBar", "Options", "Equipment", "Skills", "Drops"];
  const ITEM_KEYS = ["Id", "Display", "Amount", "Lore", "Options", "Enchantments", "Attributes"];
  /* 技能组（Metaskill）：/Skills 目录下的文件，字段见 wiki Skills/Metaskills */
  const SKILL_KEYS = ["CancelIfNoTargets", "Hidden", "Conditions", "TargetConditions", "TriggerConditions",
    "FailedConditionsSkill", "OnFailSkill", "Cooldown", "OnCooldownSkill", "Skill", "Skills"];

  function knownMobOptions() {
    const set = {};
    function add(list) {
      (list || []).forEach(function (x) { if (x && x.k) set[x.k] = true; });
    }
    if (window.MM_OPTS) {
      add(MM_OPTS.universal);
      (MM_OPTS.groups || []).forEach(function (g) { add(g.items); });
      (MM_OPTS.mobs || []).forEach(function (g) { add(g.items); });
    }
    MM_DATA.mobOptions.forEach(function (x) { set[x.key] = true; });
    return set;
  }

  function knownItemOptions() {
    const set = {};
    MM_DATA.itemOptions.forEach(function (x) { set[x.key] = true; });
    return set;
  }

  /* ---------- 按缩进切块 ---------- */

  const KEY_LINE = /^([A-Za-z_][\w.\-]*)\s*:(.*)$/;

  function indentOf(line) {
    const m = line.match(/^ */);
    return m ? m[0].length : 0;
  }

  /* 把一组行按"某缩进层级上的 key:"切成块，块内保留原始缩进 */
  function splitByIndent(lines, indent) {
    const out = [];
    let cur = null;
    lines.forEach(function (l) {
      const t = l.trim();
      const isKey = t && !t.startsWith("#") && indentOf(l) === indent && KEY_LINE.test(l.trim());
      if (isKey) {
        cur = { key: l.trim().slice(0, l.trim().indexOf(":")).trim(), lines: [l] };
        out.push(cur);
      } else if (cur) {
        cur.lines.push(l);
      }
    });
    return out;
  }

  /* 顶层：第一个 `key:` 之前的行（注释/空行）单独存起来 */
  function splitTop(text) {
    const lines = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
    let first = -1;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t && !t.startsWith("#") && indentOf(lines[i]) === 0 && KEY_LINE.test(t)) { first = i; break; }
    }
    if (first < 0) return { head: lines, blocks: [], lines: lines };
    return {
      head: lines.slice(0, first),
      blocks: splitByIndent(lines.slice(first), 0),
      lines: lines
    };
  }

  /* 取出某个顶层条目的原始行（用于切它内部的子块） */
  function entryLines(doc, key) {
    const b = doc.blocks.find(function (x) { return x.key === key; });
    return b ? b.lines : [];
  }

  /* ---------- 各字段解析 ---------- */

  function asBool(v, def) {
    if (v === undefined || v === null) return def;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    if (s === "true" || s === "yes") return true;
    if (s === "false" || s === "no") return false;
    return def;
  }

  function parseBossBar(bb) {
    const out = { enabled: false, title: "", color: "RED", style: "SOLID", range: 30 };
    if (!bb || typeof bb !== "object") return out;
    out.enabled = asBool(bb.Enabled, true);
    if (bb.Title !== undefined && bb.Title !== null) out.title = String(bb.Title);
    if (bb.Color) out.color = String(bb.Color).toUpperCase();
    if (bb.Style) out.style = String(bb.Style).toUpperCase();
    if (bb.Range !== undefined && bb.Range !== null) out.range = bb.Range;
    return out;
  }

  function parseEquipment(list) {
    const slots = {};
    MM_DATA.equipSlots.forEach(function (s) { slots[s.id] = true; });
    const out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (x === null || x === undefined) return;
      if (typeof x === "object") {
        const item = x.item || x.Item || x.Id || "";
        const slot = String(x.slot || x.Slot || "HAND").toUpperCase();
        out.push({ item: String(item), slot: slots[slot] ? slot : "HAND" });
        return;
      }
      const parts = String(x).trim().split(/\s+/);
      let slot = "HAND";
      const last = parts[parts.length - 1];
      if (parts.length > 1 && last && slots[last.toUpperCase()]) slot = parts.pop().toUpperCase();
      out.push({ item: parts.join(" "), slot: slot });
    });
    return out;
  }

  function parseDrops(list) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (x === null || x === undefined) return;
      if (typeof x === "object") {
        out.push({
          item: String(x.item || x.Item || ""),
          amount: x.amount !== undefined && x.amount !== null ? String(x.amount) : "1",
          chance: x.chance !== undefined && x.chance !== null ? String(x.chance) : ""
        });
        return;
      }
      const parts = String(x).trim().split(/\s+/);
      out.push({
        item: parts[0] || "",
        amount: parts[1] || "1",
        chance: parts.length > 2 ? parts[2] : ""
      });
    });
    return out;
  }

  function unquote(v) {
    return String(v === undefined || v === null ? "" : v).replace(/^["']/, "").replace(/["']$/, "");
  }

  function catOf(kind, id) {
    const c = window.MM_CATALOG;
    if (!c || !c[kind]) return null;
    for (let i = 0; i < c[kind].length; i++) if (c[kind][i].id === id) return c[kind][i];
    return null;
  }

  /* 触发器在两边都要认：onTimer / ~onTimer:200 / On Timer 都算同一个 */
  function triggerIdOf(syntax) {
    const base = String(syntax).split(":")[0].replace(/^~/, "").replace(/[{}].*$/, "").toLowerCase();
    const c = window.MM_CATALOG;
    if (c && c.triggers) {
      for (let i = 0; i < c.triggers.length; i++) {
        const t = c.triggers[i];
        if (t.id === base || String(t.en || "").replace(/\s+/g, "").toLowerCase() === base) {
          return { id: t.id, needsTicks: base === "ontimer" };
        }
      }
    }
    const old = MM_DATA.triggers.filter(function (t) {
      return String(t.syntax).split(":")[0].replace(/^~/, "").toLowerCase() === base;
    })[0];
    return old || null;
  }

  function targeterIdOf(token) {
    const base = String(token).split("{")[0].replace(/^@/, "").toLowerCase();
    const c = window.MM_CATALOG;
    if (c && c.targeters) {
      for (let i = 0; i < c.targeters.length; i++) {
        const t = c.targeters[i];
        if (t.id === base || String(t.en || "").replace(/\s+/g, "").toLowerCase() === base) return t;
      }
    }
    const old = MM_DATA.targeters.filter(function (t) {
      return String(t.tpl).split("{")[0].replace(/^@/, "").toLowerCase() === base;
    })[0];
    return old || null;
  }

  /* 所有目标器共用的通用参数（筛选 / 偏移 / 坐标） */
  function targeterUniversal() {
    const t = catOf("targeters", "targeters");
    return t ? (t.params || []) : [];
  }

  /* 通用修饰：目录里有 14 项就用目录，目录不在才退回固定 5 项 */
  const UNIVERSAL_FALLBACK = ["cooldown", "delay", "repeat", "repeatInterval", "chance"];
  function universalDefs() {
    const u = window.MM_CATALOG && window.MM_CATALOG.universal;
    if (u && u.length) return u;
    return UNIVERSAL_FALLBACK.map(function (k) {
      return { name: k, type: "number", def: "0" };
    });
  }
  function universalSet() {
    const set = {};
    universalDefs().forEach(function (x) { set[x.name] = 1; });
    return set;
  }

  /* 别名归一：a=10 → amount，r=30 → radius。UI 只认正式参数名 */
  function normKeys(pairs, defs) {
    const map = {};
    (defs || []).forEach(function (pp) {
      map[String(pp.name).toLowerCase()] = pp.name;
      (pp.aliases || []).forEach(function (a) { map[String(a).toLowerCase()] = pp.name; });
    });
    const out = {};
    Object.keys(pairs).forEach(function (k) {
      out[map[k.toLowerCase()] || k] = pairs[k];
    });
    return out;
  }

  /* a=1;b=2 → {a:"1", b:"2"} */
  function parsePairs(text) {
    const out = {};
    String(text || "").split(";").forEach(function (pair) {
      if (!pair.trim()) return;
      const eq = pair.indexOf("=");
      if (eq < 0) { out[unquote(pair.trim())] = ""; return; }
      out[unquote(pair.slice(0, eq).trim())] = unquote(pair.slice(eq + 1).trim());
    });
    return out;
  }

  /* 切出行内条件 ?条件{参数}，只在花括号外面才算条件 */
  function splitInlineConditions(s) {
    const conds = [];
    let base = "", depth = 0, i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === "?" && depth === 0) {
        const m = s.slice(i).match(/^\?([A-Za-z_][\w]*)/);
        if (!m) return null;
        let j = i + m[0].length;
        let body = "";
        if (s[j] === "{") {
          let d = 0, k = j;
          for (; k < s.length; k++) {
            if (s[k] === "{") d++;
            else if (s[k] === "}") { d--; if (d === 0) { k++; break; } }
          }
          body = s.slice(j + 1, k - 1);
          j = k;
        }
        conds.push({ id: m[1], body: body });
        i = j;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth = Math.max(0, depth - 1);
      base += ch;
      i++;
    }
    return { base: base.replace(/\s+/g, " ").trim(), conds: conds };
  }

  /* 一行技能 → 结构化；拿不准就整行保留。
     opts.noTrigger：技能组里的技能行没有触发器，别拿 onSpawn 去补 */
  function parseSkill(line, opts) {
    opts = opts || {};
    const s = String(line).trim().replace(/^-\s+/, "");
    if (!s) return null;
    if (/^skill\{/i.test(s) || s.indexOf("$") >= 0) return { raw: s };

    const split = splitInlineConditions(s);
    if (!split) return { raw: s };

    const conditions = [];
    for (let ci = 0; ci < split.conds.length; ci++) {
      const cd = catOf("conditions", split.conds[ci].id);
      if (!cd) return { raw: s };                 // 有认不出的条件，整行保留
      conditions.push({ id: cd.id, params: normKeys(parsePairs(split.conds[ci].body), cd.params || []) });
    }

    const m = split.base.match(/^([A-Za-z_][\w]*)\s*(?:\{([^}]*)\})?\s*(.*)$/);
    if (!m) return { raw: s };

    const mechId = m[1];
    const paramsText = m[2] || "";
    let rest = (m[3] || "").trim();
    const mech = catOf("mechanics", mechId);
    if (!mech) return { raw: s };

    /* 机制自己的参数优先：通用修饰的别名（cd、sync…）放在前面，遇到同名以机制为准 */
    const params = normKeys(parsePairs(paramsText), universalDefs().concat(mech.params || []));
    const declared = {};
    (mech.params || []).forEach(function (pp) { declared[pp.name] = pp; });

    /* 冷却 / 延迟 / 重复 / 概率 / 起点… 属于通用修饰，单拎出来 */
    const universal = {};
    const UK = universalSet();
    Object.keys(params).forEach(function (k) {
      if (UK[k] && !declared[k]) {
        universal[k] = params[k];
        delete params[k];
      }
    });

    /* 目标选择器 */
    let targeter = "self";
    let targetParams = {};
    const tg = rest.match(/@([A-Za-z_]+)(?:\{([^}]*)\})?/);
    if (tg) {
      const hit = targeterIdOf(tg[0]);
      if (!hit) return { raw: s };                // 陌生目标器
      targeter = hit.id;
      targetParams = normKeys(parsePairs(tg[2] || ""), (hit.params || []).concat(targeterUniversal()));
      rest = (rest.slice(0, tg.index) + rest.slice(tg.index + tg[0].length)).trim();
    }

    /* 触发器 */
    let trigger = null;
    let seconds;
    const tr = rest.match(/~([A-Za-z_]+)(?::(\d+))?/);
    if (tr) {
      const hit = triggerIdOf("~" + tr[1]);
      if (!hit) return { raw: s };                // 陌生触发器
      trigger = hit.id;
      if (tr[2] && hit.needsTicks) seconds = Number(tr[2]) / 20;
      rest = (rest.slice(0, tr.index) + rest.slice(tr.index + tr[0].length)).trim();
    }
    if (rest) return { raw: s };                  // 还有没消化掉的尾巴

    /* 参数值按声明类型收敛；声明里没有的键也留着，生成时会原样写回 */
    const outParams = {};
    Object.keys(params).forEach(function (k) {
      const pp = declared[k];
      const v = params[k];
      if (pp && (pp.type === "boolean" || pp.type === "bool")) outParams[k] = asBool(v, pp.def === "true");
      else if (pp && pp.type === "number") outParams[k] = v === "" ? "" : Number(v);
      else outParams[k] = v;
    });

    const item = { mechanic: mech.id, trigger: trigger || (opts.noTrigger ? "" : "onSpawn"), targeter: targeter, params: outParams };
    if (Object.keys(universal).length) item.universal = universal;
    if (Object.keys(targetParams).length) item.targetParams = targetParams;
    if (conditions.length) item.conditions = conditions;
    if (seconds !== undefined) item.seconds = seconds;
    else if (trigger) {
      const t2 = triggerIdOf(trigger);
      if (t2 && t2.needsTicks) item.seconds = 10;
    }
    return item;
  }

  function parseSkills(list, opts) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (x === null || x === undefined) return;
      if (typeof x !== "string") { out.push({ raw: JSON.stringify(x) }); return; }
      const r = parseSkill(x, opts);
      if (r) out.push(r);
    });
    return out;
  }

  function parseEnchants(list) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (x === null || x === undefined) return;
      if (typeof x === "object") {
        Object.keys(x).forEach(function (k) { out.push({ name: k.toUpperCase(), level: Number(x[k]) || 1 }); });
        return;
      }
      const parts = String(x).trim().split(/\s*[:\s]\s*/);
      out.push({ name: (parts[0] || "").toUpperCase(), level: Number(parts[1]) || 1 });
    });
    return out;
  }

  function parseAttributes(obj) {
    const out = [];
    if (!obj || typeof obj !== "object") return out;
    Object.keys(obj).forEach(function (slot) {
      const attrs = obj[slot];
      if (!attrs || typeof attrs !== "object") return;
      Object.keys(attrs).forEach(function (name) {
        const raw = String(attrs[name]).trim();
        const m = raw.match(/^(-?[\d.]+%?)\s*([A-Za-z_]+)?/);
        out.push({
          slot: slot,
          name: name.toUpperCase(),
          value: m ? m[1] : raw,
          op: m && m[2] ? m[2].toUpperCase() : "ADD"
        });
      });
    });
    return out;
  }

  /* 技能组的 Conditions 行：`healthpercent{p=<50%}`，可选后缀 true/false 是期望值。
     和技能行内条件不同，这里不带 ? 前缀。 */
  function parseConditionList(list) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      const line = String(x === null || x === undefined ? "" : x).trim();
      if (!line) return;
      const m = line.match(/^([A-Za-z_][\w]*)\s*(?:\{([^}]*)\})?\s*(true|false)?\s*$/i);
      if (!m) return;
      const cd = catOf("conditions", m[1].toLowerCase()) || catOf("conditions", m[1]);
      const c = {
        id: cd ? cd.id : m[1],
        params: normKeys(parsePairs(m[2] || ""), cd ? cd.params || [] : [])
      };
      /* 后缀 true 和不写后缀等价，只记 false，UI 上就两项 */
      if (m[3] && m[3].toLowerCase() === "false") c.expect = "false";
      out.push(c);
    });
    return out;
  }

  function guessKind(js) {
    const keys = js && typeof js === "object" ? Object.keys(js) : [];
    for (let i = 0; i < keys.length; i++) {
      const b = js[keys[i]];
      if (!b || typeof b !== "object" || Array.isArray(b)) continue;
      if (b.Type !== undefined) return "mob";
      if (b.Id !== undefined) return "item";
    }
    /* 没有 Type / Id，但带着技能组的招牌字段 → 技能组 */
    for (let i = 0; i < keys.length; i++) {
      const b = js[keys[i]];
      if (!b || typeof b !== "object" || Array.isArray(b)) continue;
      if (b.Conditions !== undefined || b.TargetConditions !== undefined || b.TriggerConditions !== undefined ||
          b.Cooldown !== undefined || b.CancelIfNoTargets !== undefined || b.Hidden !== undefined) {
        return "skill";
      }
    }
    return "mob";
  }

  /* ---------- 主入口 ---------- */

  /* 把解析结果灌进一个已建好的项目壳（MM_STATE.newMob/newItem 的产物）。
     只填第一个顶层条目，其余条目原文保留。 */
  function fill(p, parsed) {
    const js = parsed && parsed.js;
    if (!js || typeof js !== "object" || Array.isArray(js)) {
      return { ok: false, reason: "文件内容不是「ID: 配置」结构" };
    }
    const keys = Object.keys(js);
    if (!keys.length) return { ok: false, reason: "文件里没有顶层条目" };

    const key = keys[0];
    const body = js[key];
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { ok: false, reason: "「" + key + "」下面不是字段列表" };
    }

    const d = p.data;
    const isMob = p.kind === "mob";
    const isSkill = p.kind === "skill";
    const doc = splitTop(parsed.text || "");
    const raw = { head: doc.head, entry: [], others: [], options: {} };
    const warnings = [];

    /* 本条目里认不出的子块（AIGoalSelectors / DamageModifiers / KillMessages…）整块留原文 */
    const handled = {};
    (isMob ? MOB_KEYS : isSkill ? SKILL_KEYS : ITEM_KEYS).forEach(function (k) { handled[k] = true; });
    const mine = entryLines(doc, key);
    splitByIndent(mine.slice(1), 2).forEach(function (b) {
      if (!handled[b.key]) raw.entry.push(b.lines.join("\n"));
    });

    /* 同一文件里的其他条目，整块原文保留 */
    doc.blocks.forEach(function (b) {
      if (b.key !== key) raw.others.push(b.lines.join("\n"));
    });
    if (keys.length > 1) warnings.push("这个文件里有 " + keys.length + " 个条目，已导入「" + key + "」，其余原样保留");

    p.key = key;
    if (parsed.filePath) p.filePath = parsed.filePath;

    if (isMob) {
      if (body.Type !== undefined) d.type = String(body.Type).toUpperCase();
      d.display = body.Display !== undefined ? String(body.Display) : "";
      d.health = body.Health !== undefined ? body.Health : "";
      d.damage = body.Damage !== undefined ? body.Damage : "";
      d.armor = body.Armor !== undefined ? body.Armor : "";
      d.bossbar = parseBossBar(body.BossBar);
      d.equipment = parseEquipment(body.Equipment);
      d.drops = parseDrops(body.Drops);
      d.skills = parseSkills(body.Skills);

      const known = knownMobOptions();
      Object.keys(body.Options || {}).forEach(function (k) {
        if (known[k]) d.options[k] = body.Options[k];
        else raw.options[k] = body.Options[k];
      });
    } else if (isSkill) {
      d.cancelIfNoTargets = body.CancelIfNoTargets === true ? "true" : "";
      d.hidden = body.Hidden === true ? "true" : "";
      d.conditions = parseConditionList(body.Conditions);
      d.targetConditions = parseConditionList(body.TargetConditions);
      d.triggerConditions = parseConditionList(body.TriggerConditions);
      const fail = body.FailedConditionsSkill !== undefined ? body.FailedConditionsSkill : body.OnFailSkill;
      d.failedConditionsSkill = Array.isArray(fail) ? "" : (fail !== undefined ? String(fail) : "");
      d.cooldown = body.Cooldown !== undefined ? body.Cooldown : "";
      d.onCooldownSkill = body.OnCooldownSkill !== undefined ? String(body.OnCooldownSkill) : "";
      d.skill = body.Skill !== undefined ? String(body.Skill) : "";
      d.skills = parseSkills(body.Skills, { noTrigger: true });
      if (Array.isArray(fail)) {
        warnings.push("条件不满足时执行的是一个内联技能列表，表单表达不了，已原样保留");
        raw.entry.push("  FailedConditionsSkill:\n" + fail.map(function (l) { return "  - " + l; }).join("\n"));
      }
    } else {
      if (body.Id !== undefined) d.material = String(body.Id);
      d.display = body.Display !== undefined ? String(body.Display) : "";
      d.amount = body.Amount !== undefined ? body.Amount : 1;
      if (Array.isArray(body.Lore)) d.lore = body.Lore.map(function (x) { return String(x); });
      else if (body.Lore !== undefined) d.lore = [String(body.Lore)];
      else d.lore = [];
      d.enchants = parseEnchants(body.Enchantments);
      d.attributes = parseAttributes(body.Attributes);

      const known = knownItemOptions();
      Object.keys(body.Options || {}).forEach(function (k) {
        if (known[k]) d.options[k] = body.Options[k];
        else raw.options[k] = body.Options[k];
      });
    }

    const rawSkills = (d.skills || []).filter(function (s) { return s.raw; }).length;
    if (rawSkills) warnings.push(rawSkills + " 条技能用了表单表达不了的写法（行内条件/陌生机制），已原样保留，只读");

    p.raw = raw;
    return { ok: true, key: key, count: keys.length, warnings: warnings };
  }

  return {
    fill: fill,
    guessKind: guessKind,
    /* 供测试用 */
    parseSkill: parseSkill,
    splitTop: splitTop
  };
})();
