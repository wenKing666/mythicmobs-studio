/* 通用字段引擎：9 种配置类型 + 怪物扩展字段 + 物品组件子键共用一套
   数据在 spec-data.js（由 tools/build_spec.py 从 data/spec/*.json 生成）
   这里只做纯逻辑：空值判断 / 生成 YAML 行 / 从解析结果反填，不碰 DOM */
window.MM_SPEC = (function () {
  "use strict";

  const D = window.MM_SPEC_DATA ||
    { types: {}, mobExtra: { groups: [] }, itemComponentFields: {}, fancyDrops: { fields: [] } };

  const NEED_QUOTE = /[:#\[\]{}&*!|>'"%@`,]/;
  const LOOKS_BOOL = /^(true|false|yes|no|null|~)$/i;

  /* ---------- 标量 ---------- */

  function sc(v) {
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return String(v);
    const s = String(v);
    if (s === "") return "''";
    if (!NEED_QUOTE.test(s) && !LOOKS_BOOL.test(s) && s === s.trim() &&
        s[0] !== "-" && s[0] !== "?" && s[0] !== " ") return s;
    return "'" + s.replace(/'/g, "''") + "'";
  }

  /* 数字字段：纯数字裸着写，写成 '5' 服务端会当字符串 */
  function numText(v) {
    if (typeof v === "number") return String(v);
    const s = String(v).trim();
    return s === "" ? "" : s;
  }

  function isEmpty(v) {
    if (v === undefined || v === null) return true;
    if (typeof v === "string") return v.trim() === "";
    if (typeof v === "boolean") return false;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "object") return Object.keys(v).length === 0;
    return false;
  }

  function truthy(v) {
    return v === true || v === "true";
  }

  /* 键值对的值：true / false / 数字要裸着写，写成 'true' 服务端会当字符串 */
  function kvVal(v) {
    const s = String(v === undefined || v === null ? "" : v).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return s;
    if (/^(true|false)$/i.test(s)) return s.toLowerCase();
    return sc(s);
  }

  /* ---------- 适配器（由 yaml.js / import.js 在加载后注入） ---------- */
  const adapters = {
    condText: null,   /* (cond) => "night true" */
    parseCond: null,  /* ("night true") => {id, expect, params} */
    skillText: null   /* (row) => "message{m=...} @target ~onTimer:100" */
  };

  /* ---------- 生成 YAML ---------- */

  function fieldLines(f, store, pad) {
    const L = [];
    const t = f.t || "text";
    const v = store ? store[f.k] : undefined;
    if (isEmpty(v)) return L;

    if (t === "bool") {
      L.push(pad + f.k + ": " + (truthy(v) ? "true" : "false"));
      return L;
    }
    if (t === "num") {
      const s = numText(v);
      if (s !== "") L.push(pad + f.k + ": " + s);
      return L;
    }
    if (t === "text" || t === "enum") {
      L.push(pad + f.k + ": " + sc(v));
      return L;
    }
    if (t === "raw") {
      const body = String(v);
      if (!body.trim()) return L;
      L.push(pad + f.k + ":");
      body.split("\n").forEach(function (line) {
        L.push(line.trim() === "" ? "" : pad + "  " + line.replace(/\s+$/, ""));
      });
      return L;
    }
    if (t === "list") {
      const arr = normList(v);
      if (!arr.length) return L;
      L.push(pad + f.k + ":");
      arr.forEach(function (x) { L.push(pad + "- " + sc(x)); });
      return L;
    }
    if (t === "kv") {
      const keys = Object.keys(v || {}).filter(function (k) { return !isEmpty(v[k]); });
      if (!keys.length) return L;
      L.push(pad + f.k + ":");
      keys.forEach(function (k) { L.push(pad + "  " + sc(k) + ": " + kvVal(v[k])); });
      return L;
    }
    if (t === "obj") {
      const inner = toYaml(f.f || [], v, 0);
      if (!inner.length) return L;
      L.push(pad + f.k + ":");
      inner.forEach(function (line) { L.push(pad + "  " + line); });
      return L;
    }
    if (t === "map") {
      const names = Object.keys(v || {});
      const blocks = [];
      names.forEach(function (name) {
        const inner = toYaml(f.f || [], v[name] || {}, 0);
        if (!inner.length) return;
        const blk = [pad + "  " + sc(name) + ":"];
        inner.forEach(function (line) { blk.push(pad + "    " + line); });
        blocks.push(blk);
      });
      if (!blocks.length) return L;
      L.push(pad + f.k + ":");
      blocks.forEach(function (b) { b.forEach(function (x) { L.push(x); }); });
      return L;
    }
    if (t === "objlist") {
      const blocks = [];
      (v || []).forEach(function (item) {
        const inner = toYaml(f.f || [], item || {}, 0);
        if (!inner.length) return;
        const blk = [];
        inner.forEach(function (line, i) {
          blk.push(i === 0 ? pad + "- " + line : pad + "  " + line);
        });
        blocks.push(blk);
      });
      if (!blocks.length) return L;
      L.push(pad + f.k + ":");
      blocks.forEach(function (b) { b.forEach(function (x) { L.push(x); }); });
      return L;
    }
    if (t === "conds") {
      const arr = (v || []).map(function (c) {
        return adapters.condText ? adapters.condText(c) : sc(String(c));
      }).filter(function (x) { return x && x !== "''"; });
      if (!arr.length) return L;
      L.push(pad + f.k + ":");
      arr.forEach(function (x) { L.push(pad + "- " + x); });
      return L;
    }
    if (t === "skills") {
      const arr = (v || []).map(function (s) {
        if (typeof s === "string") return s;
        if (adapters.skillText) return adapters.skillText(s);
        return s && s.raw ? s.raw : "";
      }).filter(function (x) { return String(x || "").trim() !== ""; });
      if (!arr.length) return L;
      L.push(pad + f.k + ":");
      arr.forEach(function (x) { L.push(pad + "- " + x); });
      return L;
    }
    return L;
  }

  function normList(v) {
    if (Array.isArray(v)) return v.filter(function (x) { return !isEmpty(x); });
    if (typeof v === "string") {
      return v.split(/[\n,]/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    return [];
  }

  function toYaml(fields, store, indent) {
    const pad = " ".repeat(indent || 0);
    let out = [];
    (fields || []).forEach(function (f) {
      out = out.concat(fieldLines(f, store, pad));
    });
    return out;
  }

  /* 一份配置文件的完整 YAML，三种形态：
     wrap    → key: 下面挂字段（mob / item / spawner…）
     list    → 每项以 - 开头（pins.yml）
     flat    → 直接写字段（pack.yml） */
  function docYaml(key, fields, store, opts) {
    opts = opts || {};
    const mode = opts.mode || "wrap";

    if (mode === "flat") {
      const body = toYaml(fields, store, 0);
      return (body.length ? body.join("\n") : "# 还没填任何字段") + "\n";
    }
    if (mode === "list") {
      const body = toYaml(fields, store, 0);
      if (!body.length) return "";
      const L = body.map(function (line, i) { return i === 0 ? "- " + line : "  " + line; });
      return L.join("\n") + "\n";
    }

    const body = toYaml(fields, store, 2);
    if (!body.length) return key + ":\n";
    return [key + ":"].concat(body).join("\n") + "\n";
  }

  /* ---------- 从解析结果反填 ---------- */

  function convertIn(f, v) {
    const t = f.t || "text";
    if (v === undefined || v === null) return undefined;
    if (t === "bool") {
      if (typeof v === "boolean") return v ? "true" : "false";
      return String(v).toLowerCase() === "true" ? "true" : "false";
    }
    if (t === "num") {
      if (typeof v === "number") return v;
      return String(v);
    }
    if (t === "text" || t === "enum") {
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    }
    if (t === "raw") {
      if (Array.isArray(v)) {
        return v.map(function (x) { return typeof x === "object" ? JSON.stringify(x) : String(x); }).join("\n");
      }
      return String(v);
    }
    if (t === "list") {
      if (Array.isArray(v)) {
        return v.map(function (x) { return typeof x === "object" ? JSON.stringify(x) : String(x); });
      }
      return String(v).split(/[\n,]/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    if (t === "kv") {
      if (v && typeof v === "object" && !Array.isArray(v)) return Object.assign({}, v);
      return {};
    }
    if (t === "obj") {
      const r = {};
      (f.f || []).forEach(function (sub) {
        if (v && typeof v === "object" && sub.k in v) {
          const x = convertIn(sub, v[sub.k]);
          if (x !== undefined) r[sub.k] = x;
        }
      });
      return r;
    }
    if (t === "map") {
      const r = {};
      if (v && typeof v === "object" && !Array.isArray(v)) {
        Object.keys(v).forEach(function (name) {
          const one = {};
          (f.f || []).forEach(function (sub) {
            if (v[name] && typeof v[name] === "object" && sub.k in v[name]) {
              const x = convertIn(sub, v[name][sub.k]);
              if (x !== undefined) one[sub.k] = x;
            }
          });
          r[name] = one;
        });
      }
      return r;
    }
    if (t === "objlist") {
      if (!Array.isArray(v)) return [];
      return v.map(function (raw) {
        const one = {};
        (f.f || []).forEach(function (sub) {
          if (raw && typeof raw === "object" && sub.k in raw) {
            const x = convertIn(sub, raw[sub.k]);
            if (x !== undefined) one[sub.k] = x;
          }
        });
        return one;
      });
    }
    if (t === "conds") {
      if (!Array.isArray(v)) return [];
      return v.map(function (raw) {
        const text = typeof raw === "string" ? raw : String(raw);
        if (adapters.parseCond) return adapters.parseCond(text) || { id: "", params: {} };
        return text;
      });
    }
    if (t === "skills") {
      if (!Array.isArray(v)) return [];
      return v.map(function (raw) {
        return typeof raw === "string" ? raw : (raw && raw.raw ? raw.raw : String(raw));
      });
    }
    return String(v);
  }

  /* 返回 { store, used }：used 记下哪些键被吃掉了，剩下的调用方原样保留 */
  function fromYaml(fields, js) {
    const store = {};
    const used = {};
    if (!js || typeof js !== "object") return { store: store, used: used };
    (fields || []).forEach(function (f) {
      if (!(f.k in js)) return;
      used[f.k] = true;
      const v = convertIn(f, js[f.k]);
      if (v !== undefined) store[f.k] = v;
    });
    return { store: store, used: used };
  }

  /* ---------- 新建时的空壳 ---------- */

  function blank(fields) {
    const store = {};
    (fields || []).forEach(function (f) {
      const t = f.t || "text";
      if (t === "list" || t === "objlist" || t === "conds" || t === "skills") store[f.k] = [];
      else if (t === "obj" || t === "kv" || t === "map") store[f.k] = {};
      else store[f.k] = "";
    });
    return store;
  }

  /* ---------- 查表 ---------- */

  function type(id) {
    return D.types[id] || null;
  }

  function allTypes() {
    return Object.keys(D.types).map(function (id) { return D.types[id]; });
  }

  function flatFields(spec) {
    const out = [];
    (spec.groups || []).forEach(function (g) {
      (g.fields || []).forEach(function (f) { out.push(f); });
    });
    return out;
  }

  function mobExtraGroups() {
    return (D.mobExtra && D.mobExtra.groups) || [];
  }

  function mobExtraFields() {
    const out = [];
    mobExtraGroups().forEach(function (g) {
      (g.fields || []).forEach(function (f) { out.push(f); });
    });
    return out;
  }

  function itemComponentFields(id) {
    return (D.itemComponentFields && D.itemComponentFields[id]) || null;
  }

  function fancyDrops() {
    return D.fancyDrops || { title: "掉落特效", fields: [] };
  }

  /* 字段需要多宽：长文本 / 复杂结构占整行 */
  function isWide(f) {
    const t = f.t || "text";
    return t === "list" || t === "raw" || t === "obj" || t === "map" ||
      t === "objlist" || t === "conds" || t === "skills" || !!(f.h && f.h.length > 26);
  }

  return {
    types: D.types,
    adapters: adapters,
    sc: sc,
    numText: numText,
    isEmpty: isEmpty,
    truthy: truthy,
    toYaml: toYaml,
    docYaml: docYaml,
    fromYaml: fromYaml,
    blank: blank,
    type: type,
    allTypes: allTypes,
    flatFields: flatFields,
    mobExtraGroups: mobExtraGroups,
    mobExtraFields: mobExtraFields,
    itemComponentFields: itemComponentFields,
    fancyDrops: fancyDrops,
    isWide: isWide
  };
})();
