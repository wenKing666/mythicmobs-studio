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
    return k || (p.kind === "mob" ? "my_mob" : "my_item");
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

    // 技能（含导入时无法结构化、只能原样保留的行）
    const sk = (d.skills || []).filter(function (s) { return s.raw || s.mechanic; });
    if (sk.length) {
      L.push("  Skills:");
      sk.forEach(function (s) { L.push("  - " + (s.raw || skillLine(s))); });
    }

    // 掉落
    const dr = (d.drops || []).filter(function (x) { return x.item; });
    if (dr.length) {
      L.push("  Drops:");
      dr.forEach(function (x) {
        const amt = x.amount === "" ? "1" : x.amount;
        const chance = x.chance === "" ? "" : " " + x.chance;
        L.push("  - " + x.item + " " + amt + chance);
      });
    }
    pushTail(L, raw);
    return L.join("\n") + "\n";
  }

  function skillLine(s) {
    const mech = MM_DATA.mechanics.find(function (m) { return m.id === s.mechanic; });
    let params = "";
    if (mech && mech.params.length) {
      const parts = [];
      mech.params.forEach(function (p) {
        const v = s.params ? s.params[p.name] : undefined;
        if (v === undefined || v === null || v === "") return;
        if (p.type === "bool") { if (v) parts.push(p.name + "=true"); }
        else parts.push(p.name + "=" + v);
      });
      if (parts.length) params = "{" + parts.join(";") + "}";
    }
    let t = "";
    const tg = MM_DATA.targeters.find(function (x) { return x.id === s.targeter; });
    if (tg && s.targeter !== "self") {
      t = " " + tg.tpl.replace("%r%", s.radius || tg.defaultR || 5);
    }
    let tr = "";
    const trg = MM_DATA.triggers.find(function (x) { return x.id === s.trigger; });
    if (trg) {
      let syn = trg.syntax;
      if (trg.needsTicks) syn = syn.replace("%t%", String((Number(s.seconds) || 10) * 20));
      tr += " " + syn;
    }
    return s.mechanic + params + t + tr;
  }

  /* ---------- 物品 ---------- */
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
    MM_DATA.itemOptions.forEach(function (o) {
      const v = d.options[o.key];
      if (v === undefined || v === null) return;
      if (o.type === "bool") { if (v !== o.def) opts.push("    " + o.key + ": " + (v ? "true" : "false")); }
      else if (v !== "" && Number(v) !== Number(o.def)) opts.push("    " + o.key + ": " + fmtNum(v));
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
    pushTail(L, raw);
    return L.join("\n") + "\n";
  }

  /* ---------- 必填校验 ---------- */
  function validate(p) {
    const out = [];
    if (!p) return out;
    const D = MM_DATA;
    if (!String(p.key || "").trim()) out.push("ID 不能为空");

    if (p.kind === "mob") {
      if (!p.data.type) out.push("生物类型未选择");
      (p.data.skills || []).forEach(function (s, i) {
        if (s.raw) return;                      // 原样保留的技能行不拦
        const mech = D.mechanics.find(function (m) { return m.id === s.mechanic; });
        if (!mech) { out.push("第 " + (i + 1) + " 个技能：效果未选择"); return; }
        (mech.params || []).forEach(function (pp) {
          if (!pp.required) return;
          const v = s.params ? s.params[pp.name] : undefined;
          if (v === undefined || v === null || String(v).trim() === "") {
            out.push("技能「" + mech.zh + "」的 " + pp.label + " 没填");
          }
        });
      });
      (p.data.equipment || []).forEach(function (e, i) {
        if (!e.item || !String(e.item).trim()) out.push("第 " + (i + 1) + " 件装备没选物品");
      });
      (p.data.drops || []).forEach(function (x, i) {
        if (!x.item || !String(x.item).trim()) out.push("第 " + (i + 1) + " 条掉落没选物品");
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
    return out;
  }

  function generate(p) {
    if (!p) return "# 左边选一个模板，或点「新建怪物」开始\n";
    return p.kind === "mob" ? mob(p) : item(p);
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

  return { generate: generate, validate: validate, mob: mob, item: item, highlight: highlight, scalar: scalar };
})();

