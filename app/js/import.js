/* 导入：服务器 yml → 项目模型
   原则：能结构化的进表单；认不出的（AIGoalSelectors、行内条件、陌生机制…）整块原样保留，
   保存时再原样写回，做到"改一个字段，别的字段不丢"。 */
window.MM_IMPORT = (function () {
  "use strict";

  /* 表单能管的顶层字段；不在这里的，整块留原文 */
  const MOB_KEYS = ["Type", "Display", "Health", "Damage", "Armor", "BossBar", "Options", "Equipment", "Skills", "Drops"];
  const ITEM_KEYS = ["Id", "Display", "Amount", "Lore", "Options", "Enchantments", "Attributes"];

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

  function triggerIdOf(syntax) {
    /* ~onTimer:200 / ~onAttack → 找到对应的触发器定义 */
    const base = String(syntax).split(":")[0];
    const hit = MM_DATA.triggers.find(function (t) {
      return String(t.syntax).split(":")[0] === base;
    });
    return hit || null;
  }

  function targeterIdOf(token) {
    /* @PlayersInRadius{r=30} / @Target */
    const base = String(token).split("{")[0];
    const hit = MM_DATA.targeters.find(function (t) {
      return String(t.tpl).split("{")[0] === base;
    });
    return hit || null;
  }

  /* 一行技能 → 结构化；拿不准就整行保留 */
  function parseSkill(line) {
    const s = String(line).trim();
    if (!s) return null;
    /* 带行内条件、元技能、变量等复杂写法，直接留原文 */
    if (s.indexOf("?") >= 0 || /^skill\{/i.test(s) || s.indexOf("$") >= 0) return { raw: s };

    const m = s.match(/^([A-Za-z_][\w]*)\s*(?:\{([^}]*)\})?\s*(.*)$/);
    if (!m) return { raw: s };

    const mechId = m[1];
    const paramsText = m[2] || "";
    let rest = (m[3] || "").trim();
    const mech = MM_DATA.mechanics.find(function (x) { return x.id === mechId; });
    if (!mech) return { raw: s };

    /* 参数表 */
    const params = {};
    if (paramsText.trim()) {
      const pairs = paramsText.split(";");
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if (!pair.trim()) continue;
        const eq = pair.indexOf("=");
        if (eq < 0) return { raw: s };              // 认不出的参数写法
        const k = pair.slice(0, eq).trim();
        params[k] = unquote(pair.slice(eq + 1).trim());
      }
    }
    /* 有表单装不下的参数名 → 整行保留，别悄悄丢 */
    const declared = {};
    (mech.params || []).forEach(function (pp) { declared[pp.name] = pp; });
    const extra = Object.keys(params).filter(function (k) { return !declared[k]; });
    if (extra.length) return { raw: s };

    /* 目标选择器 */
    let targeter = "self";
    let radius;
    const tg = rest.match(/@([A-Za-z]+)(?:\{([^}]*)\})?/);
    if (tg) {
      const hit = targeterIdOf(tg[0]);
      if (!hit) return { raw: s };                  // 陌生目标器
      targeter = hit.id;
      if (tg[2]) {
        const rm = tg[2].match(/r\s*=\s*([\d.]+)/);
        if (rm) radius = Number(rm[1]);
      }
      rest = (rest.slice(0, tg.index) + rest.slice(tg.index + tg[0].length)).trim();
    }

    /* 触发器 */
    let trigger = null;
    let seconds;
    const tr = rest.match(/~([A-Za-z]+)(?::(\d+))?/);
    if (tr) {
      const hit = triggerIdOf("~" + tr[1]);
      if (!hit) return { raw: s };                  // 陌生触发器
      trigger = hit.id;
      if (tr[2] && hit.needsTicks) seconds = Number(tr[2]) / 20;
      rest = (rest.slice(0, tr.index) + rest.slice(tr.index + tr[0].length)).trim();
    }
    if (rest) return { raw: s };                    // 还有没消化掉的尾巴

    /* 参数值按声明类型收敛 */
    const outParams = {};
    (mech.params || []).forEach(function (pp) {
      const v = params[pp.name];
      if (v === undefined) return;
      if (pp.type === "bool") outParams[pp.name] = asBool(v, !!pp.def);
      else if (pp.type === "number") outParams[pp.name] = v === "" ? "" : Number(v);
      else outParams[pp.name] = v;
    });

    const item = { mechanic: mech.id, trigger: trigger || "onSpawn", targeter: targeter, params: outParams };
    if (radius !== undefined) item.radius = radius;
    else if (targeter !== "self") {
      const t = MM_DATA.targeters.find(function (x) { return x.id === targeter; });
      if (t && t.needsRadius) item.radius = t.defaultR;
    }
    if (seconds !== undefined) item.seconds = seconds;
    else if (trigger) {
      const t = MM_DATA.triggers.find(function (x) { return x.id === trigger; });
      if (t && t.needsTicks) item.seconds = 10;
    }
    return item;
  }

  function parseSkills(list) {
    const out = [];
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (x === null || x === undefined) return;
      if (typeof x !== "string") { out.push({ raw: JSON.stringify(x) }); return; }
      const r = parseSkill(x);
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

  function guessKind(js) {
    const keys = js && typeof js === "object" ? Object.keys(js) : [];
    for (let i = 0; i < keys.length; i++) {
      const b = js[keys[i]];
      if (!b || typeof b !== "object" || Array.isArray(b)) continue;
      if (b.Type !== undefined) return "mob";
      if (b.Id !== undefined) return "item";
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
    const doc = splitTop(parsed.text || "");
    const raw = { head: doc.head, entry: [], others: [], options: {} };
    const warnings = [];

    /* 本条目里认不出的子块（AIGoalSelectors / DamageModifiers / KillMessages…）整块留原文 */
    const handled = {};
    (isMob ? MOB_KEYS : ITEM_KEYS).forEach(function (k) { handled[k] = true; });
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
