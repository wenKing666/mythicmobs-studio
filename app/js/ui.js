/* 表单渲染 */
window.MM_UI = (function () {
  "use strict";

  let changed = function () {};
  const D = MM_DATA;
  const CAT = window.MM_CATALOG || null;

  /* 全量目录（wiki 抓取）优先；没有就退回手写表，保证页面永远能开。
     目录里混着「说明」条目（id 等于类型名，如 Targeters / Conditions），
     它们是 wiki 的总述页，不该出现在选择列表里。 */
  function catList(kind) {
    if (CAT && CAT[kind] && CAT[kind].length) {
      return CAT[kind]
        .filter(function (x) { return x.id !== kind; })
        .map(function (x) {
          return {
            id: x.id,
            zh: x.zh || x.en || x.id,
            en: x.en || x.id,
            group: x.group || "",
            params: x.params || [],
            desc: x.desc || ""
          };
        });
    }
    return (D[kind] || []).map(function (x) {
      return { id: x.id, zh: x.zh || x.id, en: x.en || x.id, group: "", params: x.params || [], desc: x.desc || "" };
    });
  }

  function catFind(kind, id) {
    return catList(kind).filter(function (x) { return x.id === id; })[0] || null;
  }

  function groupTitle(gid) {
    if (!CAT) return "";
    const g = (CAT.groups || []).filter(function (x) { return x.id === gid; })[0];
    return g ? g.title : "";
  }

  /* ---------- DOM 小工具 ---------- */
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
        else if (k === "checked" || k === "disabled" || k === "open") n[k] = !!v;
        else n.setAttribute(k, v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function ico(name, size) {
    const s = document.createElement("span");
    s.className = "ico";
    s.innerHTML = MM_ICONS.get(name, size || 15);
    return s;
  }

  function svgSpan(name, size, cls) {
    const s = document.createElement("span");
    if (cls) s.className = cls;
    s.innerHTML = MM_ICONS.get(name, size || 15);
    return s;
  }

  function field(label, hint, control, opts) {
    opts = opts || {};
    return el("div", { class: "field" + (opts.full ? " full" : "") }, [
      el("label", { text: label }),
      control,
      hint ? el("div", { class: "hint", text: hint }) : null
    ]);
  }

  function textInput(value, oninput, attrs) {
    const i = el("input", Object.assign({ class: "input", type: "text" }, attrs || {}));
    i.value = value === undefined || value === null ? "" : value;
    i.addEventListener("input", function () { oninput(i.value, i); });
    return i;
  }

  function numberInput(value, oninput, attrs) {
    const i = el("input", Object.assign({ class: "input", type: "number" }, attrs || {}));
    i.value = value === undefined || value === null ? "" : value;
    i.addEventListener("input", function () { oninput(i.value); });
    return i;
  }

  function selectInput(options, value, onchange, attrs) {
    const s = el("select", Object.assign({ class: "input" }, attrs || {}));
    options.forEach(function (o) {
      const opt = el("option", { value: o.id }, [o.zh]);
      if (String(o.id) === String(value)) opt.selected = true;
      s.appendChild(opt);
    });
    s.addEventListener("change", function () { onchange(s.value); });
    return s;
  }

  function listInput(list, value, onchange, placeholder, required) {
    const wrap = el("div", { class: "combo" });
    const row = el("div", { class: "combo-field" });
    const input = el("input", { class: "input", type: "text", placeholder: placeholder || "" });
    input.value = value === undefined || value === null ? "" : value;
    input.autocomplete = "off";
    input.spellcheck = false;
    const btn = el("button", { class: "combo-btn", type: "button", title: "浏览全部" }, [
      svgSpan("chevron", 12)
    ]);
    const zhLine = el("div", { class: "combo-zh" });
    const errLine = el("div", { class: "field-err", text: "必填" });
    errLine.style.display = "none";
    row.appendChild(input);
    row.appendChild(btn);
    wrap.appendChild(row);
    wrap.appendChild(zhLine);
    if (required) wrap.appendChild(errLine);

    let pop = null;
    let activeIdx = -1;
    let typed = false;

    function zhOf(id) {
      const hit = list.find(function (o) { return String(o.id) === String(id); });
      return hit ? hit.zh : "";
    }

    function syncZh() {
      const z = zhOf(input.value);
      zhLine.textContent = z || "";
      zhLine.style.display = z ? "" : "none";
      if (required) {
        const bad = !String(input.value || "").trim();
        input.classList.toggle("invalid", bad);
        errLine.style.display = bad ? "" : "none";
      }
    }

    function close() {
      if (!pop) return;
      pop.remove();
      pop = null;
      activeIdx = -1;
      document.removeEventListener("mousedown", onDocDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize, true);
      if (window.__mmActiveCombo && window.__mmActiveCombo.close === close) window.__mmActiveCombo = null;
    }

    // 只有“下拉以外”的滚动才需要处理；列表内部滚动、拖动滚动条都放过
    function onScroll(e) {
      if (!pop) return;
      if (e.target === pop || pop.contains(e.target)) return;
      position();
    }

    function onResize() {
      if (pop) position();
    }

    function onDocDown(e) {
      if (pop && !pop.contains(e.target) && !wrap.contains(e.target)) close();
    }

    function filtered() {
      if (!typed) return list;
      const q = input.value.trim().toLowerCase();
      if (!q) return list;
      return list.filter(function (o) {
        return String(o.id).toLowerCase().indexOf(q) >= 0 ||
          String(o.zh || "").toLowerCase().indexOf(q) >= 0;
      });
    }

    function position() {
      const r = row.getBoundingClientRect();
      const w = Math.max(r.width, 250);
      pop.style.width = w + "px";
      pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + "px";
      const h = pop.getBoundingClientRect().height;
      const below = window.innerHeight - r.bottom;
      if (below < h + 12 && r.top > h + 12) {
        pop.style.top = (r.top - h - 4) + "px";
      } else {
        pop.style.top = (r.bottom + 4) + "px";
        pop.style.maxHeight = Math.max(150, below - 16) + "px";
      }
    }

    function pick(o) {
      input.value = o.id;
      syncZh();
      onchange(o.id);
      close();
    }

    function renderList() {
      const box = pop.querySelector(".combo-list");
      const items = filtered();
      box.innerHTML = "";
      activeIdx = -1;
      if (!items.length) {
        box.appendChild(el("div", { class: "combo-empty", text: "没有匹配项，可直接输入自定义 ID" }));
      } else {
        let lastGroup = "";
        items.forEach(function (o, i) {
          if (o.group && o.group !== lastGroup) {
            lastGroup = o.group;
            const t = groupTitle(o.group);
            if (t) box.appendChild(el("div", { class: "combo-group", text: t }));
          }
          const r = el("div", { class: "combo-row" + (String(o.id) === String(input.value) ? " on" : "") }, [
            el("span", { class: "zh", text: o.zh || o.id }),
            el("span", { class: "id", text: o.id })
          ]);
          r.addEventListener("mousedown", function (e) { e.preventDefault(); pick(o); });
          r.addEventListener("mouseenter", function () { activeIdx = i; });
          box.appendChild(r);
        });
      }
      pop.querySelector(".combo-foot").textContent =
        items.length + " / " + list.length + " 项 · 可直接输入自定义 ID";
    }

    function open() {
      if (pop) { renderList(); position(); return; }
      if (window.__mmActiveCombo) window.__mmActiveCombo.close();
      typed = false;
      pop = el("div", { class: "combo-pop" }, [
        el("div", { class: "combo-list" }),
        el("div", { class: "combo-foot" })
      ]);
      document.body.appendChild(pop);
      // 下拉内部的滚轮不带动页面滚动
      pop.addEventListener("wheel", function (e) { e.stopPropagation(); }, { passive: true });
      renderList();
      const box = pop.querySelector(".combo-list");
      const on = box.querySelector(".combo-row.on");
      if (on) box.scrollTop = Math.max(0, on.offsetTop - box.clientHeight / 2);
      position();
      window.__mmActiveCombo = { close: close };
      document.addEventListener("mousedown", onDocDown, true);
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onResize, true);
    }

    input.addEventListener("input", function () {
      typed = true;
      onchange(input.value);
      syncZh();
      if (pop) renderList();
    });
    input.addEventListener("focus", function () { open(); });
    input.addEventListener("click", function () { open(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); return; }
      if (!pop) return;
      const rows = Array.prototype.slice.call(pop.querySelectorAll(".combo-row"));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!rows.length) return;
        activeIdx = e.key === "ArrowDown"
          ? Math.min(rows.length - 1, activeIdx + 1)
          : Math.max(0, activeIdx - 1);
        rows.forEach(function (r, i) { r.classList.toggle("on", i === activeIdx); });
        rows[activeIdx].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (rows.length) rows[Math.max(0, activeIdx)].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      }
    });
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
    btn.addEventListener("click", function () {
      if (pop) close();
      else input.focus({ preventScroll: true });
    });

    syncZh();
    return wrap;
  }

  function switchRow(label, hint, checked, onchange) {
    const rid = "sw" + Math.random().toString(36).slice(2, 8);
    const input = el("input", { type: "checkbox", id: rid });
    input.checked = !!checked;
    input.addEventListener("change", function () { onchange(input.checked); });
    return el("label", { class: "switch-row", for: rid }, [
      input,
      el("span", { class: "switch" }),
      el("span", { class: "sw-label" }, [
        document.createTextNode(label),
        hint ? el("div", { class: "sw-hint", text: hint }) : null
      ])
    ]);
  }

  function card(iconName, title, sub, open, body) {
    const d = el("details", { class: "card", open: open });
    d.appendChild(el("summary", null, [
      el("span", { class: "card-icon", html: MM_ICONS.get(iconName, 15) }),
      el("span", { text: title }),
      sub ? el("span", { class: "card-sub", text: sub }) : null,
      el("span", { class: "chev", html: MM_ICONS.get("chevron", 14) })
    ]));
    d.appendChild(el("div", { class: "card-body" }, body));
    return d;
  }

  function rmButton(title, onclick) {
    return el("button", { class: "rm", title: title, onclick: onclick }, [
      svgSpan("x", 13)
    ]);
  }

  function addButton(text, onclick) {
    return el("button", { class: "add-row", onclick: onclick }, [
      svgSpan("plus", 13),
      text
    ]);
  }

  function plain(s) {
    return String(s || "").replace(/&[0-9a-fk-orx]/gi, "").replace(/<[^>]+>/g, "").trim();
  }

  /* ---------- 侧栏 ---------- */
  function renderSidebar(listEl, onSelect, onDelete) {
    listEl.innerHTML = "";
    const all = MM_STATE.all();
    if (!all.length) {
      listEl.appendChild(el("div", {
        class: "hint", style: "padding:4px 8px 2px;font-size:11px;color:#a9abaf",
        text: "暂无项目"
      }));
    }
    all.forEach(function (p) {
      const item = el("div", {
        class: "project-item" + (p.id === MM_STATE.currentId() ? " active" : ""),
        onclick: function () { onSelect(p.id); }
      }, [
        ico(kindIcon(p.kind), 14),
        el("div", { class: "meta" }, [
          el("div", { class: "name", text: plain(p.data.display) || p.key }),
          el("div", { class: "sub", text: p.key })
        ]),
        el("button", {
          class: "del", title: "删除",
          onclick: function (e) { e.stopPropagation(); onDelete(p.id); }
        }, [svgSpan("trash", 13)])
      ]);
      listEl.appendChild(item);
    });
  }

  function renderTemplates(container, onPick) {
    container.innerHTML = "";
    MM_STATE.templates.forEach(function (t) {
      container.appendChild(el("button", {
        class: "tpl-btn", onclick: function () { onPick(t.id); }
      }, [
        ico(t.icon, 15),
        el("span", null, [
          el("div", { class: "t", text: t.name }),
          el("div", { class: "d", text: t.desc })
        ])
      ]));
    });
  }

  /* ---------- 通用配置类型表单（9 种，字段表在 spec-data.js） ---------- */

  function specTouch() { MM_STATE.touch(); changed(); }

  function specLabel(f) { return f.z || f.k; }

  function specHint(f) {
    if (f.h) return f.h;
    if (f.d !== undefined && f.d !== null && f.d !== "") return "默认 " + f.d;
    return null;
  }

  /* 一行一条的列表（世界名、路径点、附魔…） */
  function linesField(store, f) {
    const ta = el("textarea", { class: "input", rows: 3, placeholder: "一行一条" });
    ta.value = (store[f.k] || []).join("\n");
    ta.addEventListener("input", function () {
      store[f.k] = ta.value.split("\n")
        .map(function (s) { return s.replace(/\s+$/, ""); })
        .filter(function (s) { return s.trim() !== ""; });
      specTouch();
    });
    return field(specLabel(f), specHint(f), ta, { full: true });
  }

  function rawField(store, f) {
    const ta = el("textarea", { class: "input mono", rows: 4, placeholder: "按 wiki 语法写，会原样输出" });
    const v = store[f.k];
    ta.value = v === undefined || v === null ? "" : String(v);
    ta.addEventListener("input", function () {
      store[f.k] = ta.value; specTouch();
    });
    return field(specLabel(f), specHint(f), ta, { full: true });
  }

  /* 键值对（Variables / NBT / Options） */
  function kvEditor(store, f) {
    const box = el("div", { class: "list" });
    let rows = [];
    function sync() {
      const n = {};
      rows.forEach(function (r) {
        const kk = String(r.k || "").trim();
        if (kk) n[kk] = r.v;
      });
      store[f.k] = n;
      specTouch();
    }
    function draw() {
      box.innerHTML = "";
      rows.forEach(function (r, i) {
        box.appendChild(el("div", { class: "list-row" }, [
          el("div", { class: "row-body" }, [
            el("div", { class: "grid" }, [
              field("键", null, textInput(r.k, function (v) { r.k = v; sync(); }, { placeholder: "键名" })),
              field("值", null, textInput(r.v, function (v) { r.v = v; sync(); }, { placeholder: "值" }))
            ])
          ]),
          rmButton("删除", function () { rows.splice(i, 1); sync(); draw(); })
        ]));
      });
      box.appendChild(addButton("添加一行", function () { rows.push({ k: "", v: "" }); draw(); }));
    }
    const cur = store[f.k] || {};
    rows = Object.keys(cur).map(function (k) {
      const v = cur[k];
      return { k: k, v: v === undefined || v === null ? "" : String(v) };
    });
    draw();
    return el("div", { class: "spec-block" }, [
      el("div", { class: "spec-title", text: specLabel(f) }),
      specHint(f) ? el("div", { class: "spec-note", text: specHint(f) }) : null,
      box
    ]);
  }

  /* 嵌套结构（obj）：子字段平铺成一个小格子 */
  function subGrid(store, subs) {
    const g = el("div", { class: "grid" });
    (subs || []).forEach(function (s) {
      const c = specControl(store, s);
      if (c) g.appendChild(c);
    });
    return g;
  }

  function objField(store, f) {
    const inner = store[f.k] || (store[f.k] = {});
    return el("div", { class: "spec-block" }, [
      el("div", { class: "spec-title", text: specLabel(f) }),
      specHint(f) ? el("div", { class: "spec-note", text: specHint(f) }) : null,
      subGrid(inner, f.f)
    ]);
  }

  /* 具名多条（菜单图标 / 交易表）：名字 + 一组子字段 */
  function mapEditor(store, f) {
    const box = el("div", { class: "list" });
    const cur = store[f.k] || (store[f.k] = {});
    let rows = Object.keys(cur).map(function (n) {
      return { name: n, data: Object.assign(MM_SPEC.blank(f.f || []), cur[n] || {}) };
    });
    function sync() {
      const n = {};
      rows.forEach(function (r) {
        const name = String(r.name || "").trim();
        if (name) n[name] = r.data;
      });
      store[f.k] = n;
      specTouch();
    }
    function draw() {
      box.innerHTML = "";
      rows.forEach(function (r, i) {
        box.appendChild(el("div", { class: "list-row" }, [
          el("div", { class: "row-body" }, [
            el("div", { class: "grid" }, [
              field("名字", "这一项的键名", textInput(r.name, function (v) { r.name = v; sync(); }, { placeholder: "名字" }))
            ]),
            subGrid(r.data, f.f)
          ]),
          rmButton("删除这一项", function () { rows.splice(i, 1); sync(); draw(); })
        ]));
      });
      box.appendChild(addButton("添加一项", function () {
        rows.push({ name: "", data: MM_SPEC.blank(f.f || []) });
        draw();
      }));
    }
    draw();
    return el("div", { class: "spec-block" }, [
      el("div", { class: "spec-title", text: specLabel(f) }),
      specHint(f) ? el("div", { class: "spec-note", text: specHint(f) }) : null,
      box
    ]);
  }

  /* 无名字的多条（对话正文 / 输入项 / 按钮） */
  function objListEditor(store, f) {
    const box = el("div", { class: "list" });
    const list = store[f.k] || (store[f.k] = []);
    function draw() {
      box.innerHTML = "";
      list.forEach(function (row, i) {
        if (!row || typeof row !== "object") return;
        box.appendChild(el("div", { class: "list-row" }, [
          el("div", { class: "row-body" }, [subGrid(row, f.f)]),
          rmButton("删除", function () { list.splice(i, 1); MM_STATE.touch(); changed(true); })
        ]));
      });
      box.appendChild(addButton("添加一项", function () {
        list.push(MM_SPEC.blank(f.f || []));
        MM_STATE.touch(); changed(true);
      }));
    }
    draw();
    return el("div", { class: "spec-block" }, [
      el("div", { class: "spec-title", text: specLabel(f) }),
      specHint(f) ? el("div", { class: "spec-note", text: specHint(f) }) : null,
      box
    ]);
  }

  /* 技能列表：和技能组共用同一套行编辑器 */
  function skillsField(store, f) {
    const list = store[f.k] || (store[f.k] = []);
    const shim = { skills: list };
    const body = el("div", { class: "list" });
    list.forEach(function (s, i) { body.appendChild(skillRow(shim, s, i, {})); });
    body.appendChild(addButton("添加技能", function () {
      list.push({ trigger: "onSpawn", mechanic: "damage", targeter: "target", params: { amount: 10 } });
      MM_STATE.touch(); changed(true);
    }));
    return el("div", { class: "spec-block" }, [
      el("div", { class: "spec-title", text: specLabel(f) }),
      specHint(f) ? el("div", { class: "spec-note", text: specHint(f) }) : null,
      body
    ]);
  }

  /* 单个字段 → DOM；map / objlist / conds / skills 这些整块返回，调用方放进卡片 */
  function specControl(store, f) {
    const t = f.t || "text";
    const k = f.k;
    if (t === "bool") {
      return switchRow(specLabel(f), specHint(f) || "", MM_SPEC.truthy(store[k]), function (v) {
        store[k] = v ? "true" : "false"; specTouch();
      });
    }
    if (t === "num") {
      return field(specLabel(f), specHint(f), numberInput(store[k], function (v) {
        store[k] = v; specTouch();
      }, { step: "any" }));
    }
    if (t === "enum") {
      const opts = (f.o || []).map(function (x) { return { id: x, zh: x }; });
      const fallback = f.d !== undefined && f.d !== "" ? f.d : (opts[0] ? opts[0].id : "");
      return field(specLabel(f), specHint(f), selectInput(opts, store[k] || fallback, function (v) {
        store[k] = v; specTouch();
      }));
    }
    if (t === "list") return linesField(store, f);
    if (t === "raw") return rawField(store, f);
    if (t === "kv") return kvEditor(store, f);
    if (t === "obj") return objField(store, f);
    if (t === "map") return mapEditor(store, f);
    if (t === "objlist") return objListEditor(store, f);
    if (t === "skills") return skillsField(store, f);
    if (t === "conds") return null;   /* 条件块单独按卡片渲染，见 renderSpec */
    return field(specLabel(f), specHint(f), textInput(store[k], function (v) {
      store[k] = v; specTouch();
    }, { placeholder: f.d === undefined ? "" : String(f.d) }), { full: MM_SPEC.isWide(f) });
  }

  function renderSpec(root, p) {
    const spec = MM_STATE.specOf(p.kind);
    if (!spec) {
      root.appendChild(el("div", { class: "hint", text: "这种配置类型没有字段表，只能看原文" }));
      return;
    }
    const store = p.data.fields || (p.data.fields = {});
    if (spec.note) {
      root.appendChild(el("div", { class: "spec-note-bar", text: spec.note }));
    }
    (spec.groups || []).forEach(function (g, gi) {
      const body = el("div", { class: "list" });
      const grid = el("div", { class: "grid" });
      const conds = [];
      (g.fields || []).forEach(function (f) {
        if ((f.t || "text") === "conds") { conds.push(f); return; }
        const c = specControl(store, f);
        if (c) grid.appendChild(c);
      });
      if (grid.childNodes.length) body.appendChild(grid);
      if (body.childNodes.length) {
        root.appendChild(card(spec.icon || "file", g.title || spec.title, "", gi === 0, [body]));
      }
      /* 条件块自带一张卡片，直接挂到 root 上，别套在里面 */
      conds.forEach(function (f) {
        const sub = f.h || (f.k === "Conditions" ? "满足这些条件才生效" : "刷出来的怪带这些条件");
        root.appendChild(condCardFor(store, f.k, f.z || f.k, sub, f.k === "Conditions", false));
      });
    });
  }

  /* ---------- 引用影响（0.11.0）：反向引用扫描 ---------- */
  function referrerCard(p) {
    if (!window.MM_HOST_FIND_REFERRERS) return null;
    const box = el("div", { class: "hint", text: "正在扫描服务器目录…" });
    /* 需要引用索引才能判断「这是不是个被引用的名字」——纯浏览器没有文件系统，整卡不出 */
    const cardEl = card("zap", "引用影响", "改名字 / 删除之前，先看谁在用", true, [box]);
    MM_HOST_FIND_REFERRERS(p.kind === "skill" ? "skill" : "droptable", p.key, p.filePath).then(function (list) {
      box.innerHTML = "";
      if (!list.length) {
        box.className = "hint";
        box.textContent = "服务器目录里没有其他配置引用它，改名 / 删除没有连带影响。";
        return;
      }
      box.className = "sim-grid";
      list.forEach(function (r) {
        box.appendChild(el("div", { class: "sim-row" }, [
          el("span", { class: "sim-name", text: r.name }),
          el("span", { class: "sim-num", text: r.kind === "mob" ? "怪物" : r.kind === "skill" ? "技能组" : "掉落表" }),
          el("span", {}, [el("button", {
            class: "mini-btn", text: "打开", type: "button",
            onclick: function () { window.MM_HOST_OPEN_FILE && MM_HOST_OPEN_FILE(r); }
          })])
        ]));
      });
    });
    return cardEl;
  }

  /* ---------- 编辑器外壳 ---------- */
  function renderEditor(root, project) {
    root.innerHTML = "";
    if (!project) {
      root.appendChild(el("div", { class: "empty" }, [
        el("div", { class: "big", html: MM_ICONS.get("layers", 30) }),
        el("h2", { text: "还没有打开的项目" }),
        el("p", { text: "从左侧模板开始，或新建一个" }),
        el("div", { class: "hint-row" }, [
          el("button", { class: "btn", onclick: function () { window.MM_APP && window.MM_APP.new("mob"); } }, ["新建怪物"]),
          el("button", { class: "btn", onclick: function () { window.MM_APP && window.MM_APP.new("item"); } }, ["新建物品"]),
          el("button", { class: "btn", onclick: function () { window.MM_APP && window.MM_APP.new("skill"); } }, ["新建技能组"])
        ])
      ]));
      return;
    }
    const tabs = entryTabs(project);
    if (tabs) root.appendChild(tabs);
    root.appendChild(editorHeader(project));
    /* 技能组 / 掉落表：显示「服务器里谁在引用我」，改名前先看影响面（0.11.0） */
    if ((project.kind === "skill" || project.kind === "droptable") && project.filePath) {
      const rc = referrerCard(project);
      if (rc) root.appendChild(rc);
    }
    if (window.MM_STATE.specOf && MM_STATE.specOf(project.kind)) renderSpec(root, project);
    else if (project.kind === "mob") renderMob(root, project);
    else if (project.kind === "skill") renderSkill(root, project);
    else if (project.kind === "droptable") renderDropTable(root, project);
    else renderItem(root, project);
  }

  /* 多条目文件（mob/pin 等）：只编辑第一个，其余原样在 raw.others；
     0.8.0 起这里显示切换条，点别的条目就把当前条目原样存回去、解析那一个进来 */
  function entryTabs(p) {
    if (!window.MM_IMPORT || !MM_IMPORT.entryKeys) return null;
    const keys = MM_IMPORT.entryKeys(p);
    if (!keys.length) return null;
    const bar = el("div", { class: "entry-tabs" }, [
      el("span", { class: "et-label", text: "这个文件里有 " + (keys.length + 1) + " 个条目：" })
    ]);
    bar.appendChild(el("button", { class: "et-tab on", text: p.key || "(未命名)", title: "正在编辑这个条目" }));
    keys.forEach(function (k, i) {
      bar.appendChild(el("button", {
        class: "et-tab", text: k,
        title: "切到这个条目；当前条目会原样存回文件，保存时不丢",
        onclick: function () { window.MM_APP && MM_APP.switchEntry(i); }
      }));
    });
    return bar;
  }

  /* 配置类型 → 图标名（侧栏、文件列表、编辑器头都用这一份） */
  function kindIcon(kind) {
    const sp = window.MM_STATE && MM_STATE.specOf && MM_STATE.specOf(kind);
    if (sp) return sp.icon || "file";
    return kind === "mob" ? "skull" : kind === "skill" ? "zap"
      : kind === "droptable" ? "box" : kind === "item" ? "sword" : "file";
  }

  function editorHeader(p) {
    const sp = window.MM_STATE.specOf && MM_STATE.specOf(p.kind);
    const kindName = sp ? (sp.one || sp.title) : p.kind === "mob" ? "怪物" : p.kind === "skill" ? "技能组"
      : p.kind === "droptable" ? "掉落表" : "物品";
    const iconName = kindIcon(p.kind);
    const isSkill = p.kind === "skill" || p.kind === "droptable" || !!sp;
    const idPlaceholder = sp ? (sp.keyPrefix || "")
      : p.kind === "skill" ? "my_boss_phase2"
      : p.kind === "droptable" ? "boss_loot"
      : p.kind === "mob" ? "my_boss" : "my_sword";

    const idErr = el("div", { class: "field-err", text: "ID 不能为空" });
    idErr.style.display = "none";
    const oldKey = String(p.key || "");   /* 改名联动要拿渲染时的旧 ID */
    const idInput = textInput(p.key, function (v, input) {
      const clean = String(v).replace(/[^A-Za-z0-9_\-]/g, "_");
      if (clean !== v) input.value = clean;
      p.key = clean;
      syncId();
      MM_STATE.touch();
      changed();
    }, { placeholder: idPlaceholder });
    /* 失焦时如果改了名：技能组 / 掉落表可能有别处引用旧 ID，问一句要不要一起改（0.11.0） */
    idInput.addEventListener("change", function () {
      const newKey = String(p.key || "");
      if (!oldKey || newKey === oldKey || !p.filePath) return;
      if (p.kind !== "skill" && p.kind !== "droptable") return;
      if (!window.MM_HOST_FIND_REFERRERS || !window.MM_HOST_RENAME_REFERRERS) return;
      const kind = p.kind === "skill" ? "skill" : "droptable";
      MM_HOST_FIND_REFERRERS(kind, oldKey, p.filePath).then(function (list) {
        if (!list.length) return;
        if (!window.confirm("有 " + list.length + " 个文件引用了「" + oldKey + "」。要把这些引用一起改成「" + newKey + "」吗？（会写回那些文件并自动备份）")) return;
        MM_HOST_RENAME_REFERRERS(kind, oldKey, newKey, list).then(function (done) {
          if (window.MM_APP) window.MM_APP.refresh(true);
          /* 提示走 toast 元素（定义在 app.js），这里只碰 DOM */
          const t = document.getElementById("toast");
          if (t) {
            t.textContent = done.length
              ? "已把 " + done.length + " 个文件里的引用改成「" + newKey + "」。磁盘上的文件名还是旧的，需要的话在文件管理器里同步改名"
              : "引用文件没能改写（可能被占用）";
            t.classList.add("show");
            setTimeout(function () { t.classList.remove("show"); }, 2600);
          }
        });
      });
    });

    function syncId() {
      const bad = !String(idInput.value || "").trim();
      idInput.classList.toggle("invalid", bad);
      idErr.style.display = bad ? "" : "none";
    }

    syncId();

    /* 从磁盘导入的项目：一键丢掉本地改动、按最新文件重填（外部改过文件后用） */
    const reloadBtn = (p.filePath && window.MM_HOST && MM_HOST.isElectron)
      ? el("button", {
          class: "mini-btn", text: "↻ 重新读取", type: "button",
          title: "文件可能被外部改过（或想放弃本地修改）时，按磁盘上的最新内容重填表单",
          onclick: function () { window.MM_APP && MM_APP.reload(); }
        })
      : null;

    return el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [
        el("span", { class: "card-icon", html: MM_ICONS.get(iconName, 15) }),
        el("span", { text: kindName }),
        reloadBtn
      ]),
      el("div", { class: "card-body" }, [
        el("div", { class: "grid" + (isSkill ? " one" : "") }, [
          el("div", { class: "field" }, [
            el("label", { text: "ID" }),
            idInput,
            idErr,
            el("div", {
              class: "hint",
              text: sp ? (sp.single ? "这个文件只有一个条目，名字不影响效果" : "配置名，写进文件名或作为这一项的键")
                : p.kind === "droptable" ? "掉落表名，怪物的 Drops 里直接写这个名字引用它"
                : isSkill ? "技能组名，别的技能用 skill{s=这个名字} 调用它"
                : "服务器里用它刷怪 / 给物品，只能英文、数字、下划线"
            })
          ]),
          isSkill ? null : field("显示名称", "头顶显示的名字，支持 & 颜色代码", textInput(p.data.display, function (v) {
            p.data.display = v; MM_STATE.touch(); changed();
          }, { placeholder: p.kind === "mob" ? "&c我的怪物" : "&b我的物品" }))
        ].filter(Boolean))
      ])
    ]);
  }


  /* ---------- 怪物 Options 全量渲染 ---------- */
  function optionsCount() {
    if (!window.MM_OPTS) return MM_DATA.mobOptions.length;
    return MM_OPTS.universal.length
      + MM_OPTS.groups.reduce(function (n, g) { return n + g.items.length; }, 0)
      + MM_OPTS.mobs.reduce(function (n, g) { return n + g.items.length; }, 0);
  }

  function optionField(it, d) {
    const set = function (v) {
      d.options[it.k] = v;
      MM_STATE.touch();
      changed();
    };
    let ctl;
    if (it.type === "bool") {
      ctl = switchRow(it.zh, it.tip, !!d.options[it.k], set);
    } else if (it.type === "number") {
      ctl = field(it.zh, it.tip, numberInput(d.options[it.k], set, {
        step: "any",
        placeholder: it.def === "" || it.def === null ? "" : String(it.def)
      }));
    } else {
      ctl = field(it.zh, it.tip, textInput(d.options[it.k], set, {
        placeholder: it.def ? String(it.def) : "未设置"
      }));
    }
    const wrap = el("div", { class: "opt", title: it.k });
    wrap.dataset.search = (it.k + " " + it.zh + " " + (it.tip || "")).toLowerCase();
    wrap.appendChild(ctl);
    return wrap;
  }

  function optionsBody(d) {
    const body = el("div", { class: "opts" });
    const search = el("input", { class: "input opt-search-input", type: "text", placeholder: "搜索选项：中文名或英文键名，例如 隐身 / Sunburn" });

    const uni = el("div", { class: "opt-block" }, [
      el("div", { class: "opt-title" }, [
        document.createTextNode("通用"),
        el("span", { class: "opt-count", text: MM_OPTS.universal.length + " 项" })
      ]),
      el("div", { class: "grid three" }, MM_OPTS.universal.map(function (it) { return optionField(it, d); }))
    ]);

    function groupBlock(g) {
      const ent = String(d.type || "").toUpperCase();
      const match = (g.entities || []).indexOf(ent) >= 0;
      const det = el("details", { class: "opt-group" + (match ? " relevant" : ""), open: match });
      det.appendChild(el("summary", null, [
        el("span", { text: g.zh }),
        el("span", { class: "opt-count", text: g.items.length + " 项" }),
        el("span", { class: "chev", html: MM_ICONS.get("chevron", 13) })
      ]));
      det.appendChild(el("div", { class: "opt-items grid three" }, g.items.map(function (it) { return optionField(it, d); })));
      return det;
    }

    const grp = el("div", { class: "opt-block" }, [
      el("div", { class: "opt-title" }, [document.createTextNode("按生物大类")])
    ].concat(MM_OPTS.groups.map(groupBlock)));

    const ent = String(d.type || "").toUpperCase();
    const mine = MM_OPTS.mobs.filter(function (g) { return (g.entities || []).indexOf(ent) >= 0; });
    const rest = MM_OPTS.mobs.filter(function (g) { return (g.entities || []).indexOf(ent) < 0; });

    const mob = el("div", { class: "opt-block" }, [
      el("div", { class: "opt-title" }, [
        document.createTextNode("生物专属"),
        el("span", { class: "opt-count", text: mine.length ? "当前生物 " + mine.length + " 组" : "没有当前生物的专属选项" })
      ])
    ].concat(mine.map(groupBlock)));

    if (rest.length) {
      const restCount = rest.reduce(function (n, g) { return n + g.items.length; }, 0);
      const det = el("details", { class: "opt-group opt-others" });
      det.appendChild(el("summary", null, [
        el("span", { text: "其他生物的专属选项" }),
        el("span", { class: "opt-count", text: rest.length + " 组 " + restCount + " 项" }),
        el("span", { class: "chev", html: MM_ICONS.get("chevron", 13) })
      ]));
      det.appendChild(el("div", { class: "opt-items" }, rest.map(function (g) {
        const inner = el("div", { class: "opt-sub" }, [
          el("div", { class: "opt-sub-title", text: g.zh })
        ]);
        inner.appendChild(el("div", { class: "grid three" }, g.items.map(function (it) { return optionField(it, d); })));
        return inner;
      })));
      mob.appendChild(det);
    }

    body.appendChild(search);
    body.appendChild(uni);
    body.appendChild(grp);
    body.appendChild(mob);

    search.addEventListener("input", function () {
      const q = search.value.trim().toLowerCase();
      body.querySelectorAll(".opt").forEach(function (n) {
        const hit = !q || n.dataset.search.indexOf(q) >= 0;
        n.style.display = hit ? "" : "none";
        if (hit) n.dataset.hit = "1"; else delete n.dataset.hit;
      });
      body.querySelectorAll(".opt-sub").forEach(function (sub) {
        const any = sub.querySelector('.opt[data-hit="1"]');
        sub.style.display = any ? "" : "none";
      });
      body.querySelectorAll(".opt-group").forEach(function (g) {
        const any = g.querySelector('.opt[data-hit="1"]');
        g.style.display = any ? "" : "none";
        if (q && any) g.open = true;
      });
      body.querySelectorAll(".opt-block").forEach(function (b) {
        const any = b.querySelector('.opt[data-hit="1"]');
        b.style.display = any ? "" : "none";
      });
    });

    return body;
  }

  /* ---------- 怪物表单 ---------- */
  /* ---------- AI 行为 / 目标选择器 ---------- */

  /* 拖拽排序的共享状态：只允许同一张列表内部移动 */
  let dragCtx = null;

  function moveRow(list, from, to) {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return false;
    const x = list.splice(from, 1)[0];
    list.splice(to, 0, x);
    return true;
  }

  /* 把手单独 draggable，行里的输入框就不会抢走拖拽手势 */
  function dragHandle(list, index, onMoved) {
    const h = el("button", { class: "drag-handle", type: "button", title: "拖动排序；也可以 Alt+↑ / Alt+↓" }, [
      svgSpan("grip", 14)
    ]);
    h.setAttribute("draggable", "true");
    h.addEventListener("dragstart", function (e) {
      dragCtx = { list: list, index: index };
      try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(index)); } catch (err) { }
      h.classList.add("dragging");
    });
    h.addEventListener("dragend", function () {
      dragCtx = null;
      h.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach(function (x) { x.classList.remove("drag-over"); });
    });
    h.addEventListener("keydown", function (e) {
      if (!e.altKey) return;
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const to = index + (e.key === "ArrowUp" ? -1 : 1);
      if (moveRow(list, index, to)) onMoved(to);
    });
    return h;
  }

  function sortableRow(rowEl, list, index, onMoved) {
    rowEl.addEventListener("dragover", function (e) {
      if (!dragCtx || dragCtx.list !== list) return;
      e.preventDefault();
      rowEl.classList.add("drag-over");
    });
    rowEl.addEventListener("dragleave", function () { rowEl.classList.remove("drag-over"); });
    rowEl.addEventListener("drop", function (e) {
      e.preventDefault();
      rowEl.classList.remove("drag-over");
      if (!dragCtx || dragCtx.list !== list) return;
      const from = dragCtx.index;
      dragCtx = null;
      if (moveRow(list, from, index)) onMoved(index);
    });
    return rowEl;
  }

  /* AI 选择器的参数区：只有带参数的才有这一块，全部收在 details 里避免一屏几十个输入框 */
  function aiParamBox(def, row) {
    if (!def || !(def.params || []).length) return null;
    const used = (def.params || []).filter(function (pp) {
      return row.params && row.params[pp.name] !== undefined && row.params[pp.name] !== "";
    }).length;
    return el("details", { class: "skill-section" }, [
      el("summary", { text: "参数（" + def.params.length + " 项" + (used ? " · 已设 " + used : "") + "）" }),
      paramGrid(def.params, function (pp) {
        return row.params && row.params[pp.name] !== undefined ? row.params[pp.name] : pp.def;
      }, function (pp, v) {
        if (!row.params) row.params = {};
        if (v === "" || v === null || v === undefined) delete row.params[pp.name];
        else row.params[pp.name] = v;
        MM_STATE.touch(); changed();
      })
    ]);
  }

  function aiRows(cfg) {
    const list = cfg.list;
    const body = el("div", { class: "list ai-list" });
    if (!list.length) {
      body.appendChild(el("div", { class: "empty-hint", text: cfg.empty }));
    }
    list.forEach(function (row, i) {
      const id = row[cfg.key] || "";
      const def = catFind(cfg.kind, id);
      const head = el("div", { class: "ai-head" }, [
        dragHandle(list, i, function () { MM_STATE.touch(); changed(true); }),
        el("span", { class: "ai-idx", text: String(i) }),
        el("div", { class: "combo-field", style: "flex:1 1 auto" }, [
          listInput(catList(cfg.kind), id, function (v) {
            row[cfg.key] = v.trim().toLowerCase();
            row.params = {};
            MM_STATE.touch(); changed(true);
          }, cfg.placeholder)
        ]),
        el("div", { class: "ai-ops" }, [
          el("button", {
            class: "mini", type: "button", title: "上移",
            onclick: function () { if (moveRow(list, i, i - 1)) { MM_STATE.touch(); changed(true); } }
          }, [svgSpan("arrow-up", 13)]),
          el("button", {
            class: "mini", type: "button", title: "下移",
            onclick: function () { if (moveRow(list, i, i + 1)) { MM_STATE.touch(); changed(true); } }
          }, [svgSpan("arrow-down", 13)])
        ]),
        rmButton("删除", function () {
          list.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]);

      const kids = [head];
      if (def && def.zh) {
        kids.push(el("div", { class: "ai-desc", text: def.zh + (def.desc ? "　" + def.desc.slice(0, 90) : "") }));
      }
      const pb = aiParamBox(def, row);
      if (pb) kids.push(pb);

      body.appendChild(sortableRow(el("div", { class: "list-row ai-row" }, [
        el("div", { class: "row-body" }, kids)
      ]), list, i, function () { MM_STATE.touch(); changed(true); }));
    });
    body.appendChild(addButton(cfg.addText, function () {
      const row = {};
      row[cfg.key] = cfg.kind === "aiGoals" ? "meleeattack" : "players";
      list.push(row);
      MM_STATE.touch(); changed(true);
    }));
    return body;
  }

  /* ---------- 伤害修正 ---------- */

  const DMG_PRESETS = [
    { label: "免疫", value: "0" },
    { label: "减半", value: "0.5" },
    { label: "常通", value: "1" },
    { label: "弱点 1.5×", value: "1.5" },
    { label: "反吸 -1", value: "-1" }
  ];

  function damageRows(d) {
    const body = el("div", { class: "list" });
    if (!d.damageModifiers.length) {
      body.appendChild(el("div", { class: "empty-hint", text: "没设就是不修正：任何伤害都按原样吃。写 0 才是免疫。" }));
    }
    d.damageModifiers.forEach(function (m, i) {
      const quick = el("div", { class: "dm-quick" });
      DMG_PRESETS.forEach(function (p) {
        const b = el("button", {
          class: "chip" + (String(m.value) === p.value ? " on" : ""), type: "button",
          onclick: function () { m.value = p.value; MM_STATE.touch(); changed(true); }
        }, [document.createTextNode(p.label)]);
        b.title = "设为 " + p.value;
        quick.appendChild(b);
      });
      body.appendChild(el("div", { class: "list-row" }, [
        el("div", { class: "row-body" }, [
          el("div", { class: "grid three" }, [
            field("伤害类型", null, listInput(
              ((window.MM_EXTRAS && MM_EXTRAS.damageTypes) || []).map(function (x) {
                return { id: x.id, zh: x.zh };
              }),
              m.type, function (v) {
                m.type = v.toUpperCase(); MM_STATE.touch(); changed();
              }, "FIRE", true)),
            field("倍率", "0 免疫 · 1 正常 · 负数反吸治疗", textInput(m.value, function (v) {
              m.value = v; MM_STATE.touch(); changed();
            }, { placeholder: "0.5" }))
          ]),
          quick
        ]),
        rmButton("删除", function () {
          d.damageModifiers.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]));
    });
    body.appendChild(addButton("添加伤害修正", function () {
      d.damageModifiers.push({ type: "FIRE", value: "0" });
      MM_STATE.touch(); changed(true);
    }));
    return body;
  }

  /* ---------- 掉落（物品 / 掉落类型 / 引用掉落表） ---------- */

  function dropKind(bodies, i) {
    const x = bodies[i];
    if (x.table) return "table";
    if (x.type) return "type";
    return "item";
  }

  function dropRows(list) {
    const body = el("div", { class: "list" });
    if (!list.length) body.appendChild(el("div", { class: "empty-hint", text: "没有掉落就只掉原版默认掉落。" }));
    list.forEach(function (x, i) {
      const kind = dropKind(list, i);
      const switcher = el("div", { class: "dm-quick" });
      [["item", "物品"], ["type", "掉落类型"], ["table", "掉落表"]].forEach(function (k) {
        switcher.appendChild(el("button", {
          class: "chip" + (kind === k[0] ? " on" : ""), type: "button",
          onclick: function () {
            if (kind === k[0]) return;
            /* 换类型时把旧字段清掉，免得同时写出两种语义 */
            delete x.item; delete x.type; delete x.table; delete x.params; delete x.value;
            if (k[0] === "item") { x.item = ""; x.amount = "1"; x.chance = "1"; }
            else if (k[0] === "type") { x.type = "exp"; x.value = ""; x.chance = "1"; }
            else { x.table = ""; delete x.amount; delete x.chance; }
            MM_STATE.touch(); changed(true);
          }
        }, [document.createTextNode(k[1])]));
      });

      const cols = [];
      if (kind === "item") {
        cols.push(field("掉什么", "原版材质或自定义物品 ID", listInput(D.materials, x.item, function (v) {
          x.item = v; MM_STATE.touch(); changed();
        }, "diamond")));
        cols.push(field("数量", "可写 1-3 / 1to3", textInput(x.amount, function (v) {
          x.amount = v; MM_STATE.touch(); changed();
        }, { placeholder: "1" })));
        cols.push(field("概率", "0.5 = 50%", textInput(x.chance, function (v) {
          x.chance = v; MM_STATE.touch(); changed();
        }, { placeholder: "0.5" })));
      } else if (kind === "type") {
        cols.push(field("掉落类型", null, listInput(
          ((window.MM_EXTRAS && MM_EXTRAS.dropTypes) || []).map(function (t) { return { id: t.id, zh: t.zh }; }),
          x.type, function (v) {
            x.type = v.toLowerCase(); MM_STATE.touch(); changed();
          }, "exp", true)));
        cols.push(field("数量 / 参数", "exp 填经验值，money 填金额", textInput(x.value, function (v) {
          x.value = v; MM_STATE.touch(); changed();
        }, { placeholder: "1500" })));
        cols.push(field("概率", "0.5 = 50%", textInput(x.chance, function (v) {
          x.chance = v; MM_STATE.touch(); changed();
        }, { placeholder: "0.5" })));
      } else {
        cols.push(field("掉落表名", "Drops 目录下的掉落表 ID", textInput(x.table, function (v) {
          x.table = v; MM_STATE.touch(); changed();
        }, { placeholder: "boss_loot" }), { full: true }));
      }

      const extra = [];
      if (kind === "item" || kind === "type") {
        const isType = kind === "type";
        const inline = el("details", { class: "skill-section" }, [
          el("summary", { text: (isType ? "参数（花括号里的内容）" : "行内物品参数") + (x.params ? " · 已设" : "") }),
          el("div", { class: "grid", style: "margin-top:8px" }, [
            field("花括号里的内容",
              isType ? '例：cmd="crate give <trigger.name> RewardCrate 1"'
                     : "例：name=\"&c神剑\";enchants=SHARPNESS:3",
              textInput(x.params, function (v) {
                x.params = v; MM_STATE.touch(); changed();
              }, { placeholder: isType ? 'cmd="say hi"' : 'name="&c神剑"' }), { full: true })
          ])
        ]);
        extra.push(inline);
      }

      body.appendChild(el("div", { class: "list-row" }, [
        el("div", { class: "row-body" }, [switcher, el("div", { class: "grid three" }, cols)].concat(extra)),
        rmButton("删除", function () {
          list.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]));
    });
    body.appendChild(addButton("添加掉落", function () {
      list.push({ item: "", amount: "1", chance: "1" });
      MM_STATE.touch(); changed(true);
    }));
    return body;
  }

  function renderDropTable(root, p) {
    const d = p.data;
    root.appendChild(card("box", "掉落表设置", "不填就按每条掉落的概率各判一次", true, [
      el("div", { class: "grid three" }, [
        field("固定件数（TotalItems）", "设了就按权重抽，且只出这么多件", textInput(d.totalItems, function (v) {
          d.totalItems = v; MM_STATE.touch(); changed();
        }, { placeholder: "留空" })),
        field("最少件数（MinItems）", null, textInput(d.minItems, function (v) {
          d.minItems = v; MM_STATE.touch(); changed();
        }, { placeholder: "留空" })),
        field("最多件数（MaxItems）", "和最少件数同时设 → 概率变权重", textInput(d.maxItems, function (v) {
          d.maxItems = v; MM_STATE.touch(); changed();
        }, { placeholder: "留空" }))
      ]),
      el("div", { class: "grid three", style: "margin-top:12px" }, [
        field("等级加成（BonusLevelItems）", "件数 + 怪物等级 × 这个值", textInput(d.bonusLevelItems, function (v) {
          d.bonusLevelItems = v; MM_STATE.touch(); changed();
        }, { placeholder: "0.1" })),
        field("幸运加成（BonusLuckItems）", "件数 + 幸运值 × 这个值", textInput(d.bonusLuckItems, function (v) {
          d.bonusLuckItems = v; MM_STATE.touch(); changed();
        }, { placeholder: "0.2" })),
        field("偏差属性（BiasStat）", "影响稀有掉落概率，留空用 LOOT_BIAS", textInput(d.biasStat, function (v) {
          d.biasStat = v; MM_STATE.touch(); changed();
        }, { placeholder: "LOOT_BIAS" }))
      ])
    ]));

    root.appendChild(condCardFor(d, "conditions", "掉落者条件 Conditions", "判断怪物自身，不满足就不掉", true, false));
    root.appendChild(condCardFor(d, "triggerConditions", "击杀者条件 TriggerConditions", "判断触发掉落的人（通常就是击杀者）", false, false));

    root.appendChild(card("box", "掉落内容", "", true, [dropRows(d.drops)]));

    root.appendChild(dropSimCard(d));
  }

  /* ---------- 掉落概率模拟（0.10.0） ----------
     纯前端按当前配置试抽，两种模式与生成侧一致：
     - 默认：每条独立 roll chance（留空 = 100%）
     - 设了 MinItems+MaxItems（或 TotalItems）：先随机件数，再按 chance 当权重抽
     Bonus 系列与条件不参与（它们依赖运行时的等级 / 幸运 / 实体）。 */
  function dropAmountRange(v) {
    const s = String(v === undefined || v === null ? "" : v).trim();
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(s);
    if (m) return [Math.max(0, +m[1]), Math.max(0, +m[2])];
    if (/^\d+(\.\d+)?$/.test(s)) { const n = Math.max(0, Math.round(+s)); return [n, n]; }
    return [1, 1];
  }

  function dropChance(v) {
    const raw = String(v === undefined || v === null ? "" : v).trim();
    if (!raw) return 1;
    const isPercent = /%$/.test(raw);
    const s = raw.replace(/%$/, "");
    if (!/^\d*\.?\d+$/.test(s)) return 1;
    const n = +s;
    if (isPercent) return Math.min(1, Math.max(0, n / 100));
    /* MM 的 chance 就是 0~1 的小数；写大了按 100% 算 */
    return Math.min(1, Math.max(0, n));
  }

  function dropName(x) {
    if (x.table) return "表 " + String(x.table).replace(/^table\s*:\s*/i, "").trim();
    if (x.type) return x.type + (String(x.value || "").trim() ? " (" + x.value + ")" : "");
    return String(x.item || "").trim() || "(空)";
  }

  function dropSimCard(d) {
    const out = el("div", { class: "sim-out hint", text: "点上面的按钮开始模拟。Bonus 系列和条件不参与（依赖运行时的等级 / 幸运 / 实体）。" });

    function run(times) {
      /* 与 yaml.js hasDrop 同口径：有 item / type / table 之一才算一条 */
      const rows = (d.drops || []).filter(function (x) {
        return !!(x && (String(x.item || "").trim() || String(x.type || "").trim() || String(x.table || "").trim()));
      });
      if (!rows.length) { out.textContent = "先在「掉落内容」里加几条掉落再模拟。"; return; }
      const minI = parseInt(d.minItems, 10), maxI = parseInt(d.maxItems, 10), totalI = parseInt(d.totalItems, 10);
      const hasMin = !isNaN(minI), hasMax = !isNaN(maxI), hasTotal = !isNaN(totalI);
      const weightMode = (hasMin && hasMax) || hasTotal;
      const lo = hasMin ? minI : (hasTotal ? totalI : 0);
      const hi = hasMax ? maxI : (hasTotal ? totalI : 0);

      const items = rows.map(function (x) {
        const r = x.table || x.type ? [1, 1] : dropAmountRange(x.amount);
        return { name: dropName(x), lo: r[0], hi: r[1], w: dropChance(x.chance) };
      });
      const stats = items.map(function (it) { return { name: it.name, hits: 0, pieces: 0 }; });
      const wsum = items.reduce(function (s, it) { return s + it.w; }, 0);

      for (let t = 0; t < times; t++) {
        if (weightMode && wsum > 0) {
          let n = lo + Math.floor(Math.random() * (hi - lo + 1));
          while (n-- > 0) {
            let roll = Math.random() * wsum, pick = items.length - 1;
            for (let k = 0; k < items.length; k++) { roll -= items[k].w; if (roll <= 0) { pick = k; break; } }
            const cnt = items[pick].lo + Math.floor(Math.random() * (items[pick].hi - items[pick].lo + 1));
            stats[pick].hits++; stats[pick].pieces += cnt;
          }
        } else {
          items.forEach(function (it, k) {
            if (Math.random() < it.w) {
              const cnt = it.lo + Math.floor(Math.random() * (it.hi - it.lo + 1));
              stats[k].hits++; stats[k].pieces += cnt;
            }
          });
        }
      }

      out.innerHTML = "";
      out.className = "sim-out";
      const head = el("div", { class: "sim-head", text: "抽了 " + times + " 次" +
        (weightMode ? "（权重模式，每轮 " + lo + "~" + hi + " 件）" : "（独立判定模式）") + "：" });
      out.appendChild(head);
      const grid = el("div", { class: "sim-grid" });
      stats.forEach(function (s) {
        grid.appendChild(el("div", { class: "sim-row" }, [
          el("span", { class: "sim-name", text: s.name }),
          el("span", { class: "sim-num", text: s.hits + " 次 · " + (s.hits * 100 / times).toFixed(1) + "%" }),
          el("span", { class: "sim-exp", text: "期望 " + (s.pieces / times).toFixed(2) + " 件/次" })
        ]));
      });
      out.appendChild(grid);
    }

    const bar = el("div", { class: "sim-bar" });
    [100, 1000, 10000].forEach(function (n) {
      bar.appendChild(el("button", {
        class: "mini-btn", text: "抽 " + n + " 次", type: "button",
        onclick: function () { run(n); }
      }));
    });

    return el("div", { class: "sim-card" }, [
      el("div", { class: "grid" }, [el("div", { class: "field" }, [
        el("label", { text: "概率模拟" }), bar, out
      ])])
    ]);
  }

  /* ---------- 怪物表单 ---------- */
  function renderMob(root, p) {
    const d = p.data;

    root.appendChild(card("file", "基础属性", "", true, [
      el("div", { class: "grid three" }, [
        field("生物类型", "决定外观和基础行为", listInput(D.entities, d.type, function (v) {
          d.type = v.toUpperCase(); MM_STATE.touch(); changed();
        }, "ZOMBIE", true)),
        field("生命值", "普通僵尸 20，玩家 20", numberInput(d.health, function (v) {
          d.health = v; MM_STATE.touch(); changed();
        }, { min: 1, step: 1 })),
        field("攻击伤害", "0 表示不主动攻击", numberInput(d.damage, function (v) {
          d.damage = v; MM_STATE.touch(); changed();
        }, { min: 0, step: 1 }))
      ]),
      el("div", { class: "grid three", style: "margin-top:12px" }, [
        field("护甲值", "普通僵尸 2", numberInput(d.armor, function (v) {
          d.armor = v; MM_STATE.touch(); changed();
        }, { min: 0, step: 1 }))
      ])
    ]));

    /* BOSS 血条 */
    if (!d.bossbar) d.bossbar = { enabled: false, title: "", color: "RED", style: "SOLID", range: 30 };
    const bb = d.bossbar;
    const bbChildren = [
      switchRow("显示 BOSS 血条", "屏幕顶部的长血条，像打末影龙那样", !!bb.enabled, function (v) {
        bb.enabled = v; MM_STATE.touch(); changed(true);
      })
    ];
    if (bb.enabled) {
      bbChildren.push(el("div", { class: "grid", style: "margin-top:12px" }, [
        field("血条标题", "留空则用显示名称", textInput(bb.title, function (v) {
          bb.title = v; MM_STATE.touch(); changed();
        }, { placeholder: "&6BOSS" }), { full: true }),
        field("颜色", null, selectInput(D.bossbarColors, bb.color, function (v) {
          bb.color = v; MM_STATE.touch(); changed();
        })),
        field("样式", null, selectInput(D.bossbarStyles, bb.style, function (v) {
          bb.style = v; MM_STATE.touch(); changed();
        })),
        field("显示范围", "多少格内的玩家能看到", numberInput(bb.range, function (v) {
          bb.range = v; MM_STATE.touch(); changed();
        }, { min: 1, step: 1 }))
      ]));
    }
    root.appendChild(card("crown", "BOSS 血条", "", !!bb.enabled, bbChildren));

    /* 行为选项（官方全量 126 项） */
    root.appendChild(card("sliders", "行为选项", "官方全量 " + optionsCount() + " 项，不填则用默认值", true, [optionsBody(d)]));

    /* 装备 */
    const eqBody = el("div", { class: "list" });
    d.equipment.forEach(function (e, i) {
      eqBody.appendChild(el("div", { class: "list-row" }, [
        el("div", { class: "row-body" }, [
          el("div", { class: "grid three" }, [
            field("槽位", null, selectInput(D.equipSlots, e.slot, function (v) {
              e.slot = v; MM_STATE.touch(); changed();
            })),
            field("物品 ID", "原版物品填英文 ID", listInput(D.materials, e.item, function (v) {
              e.item = v; MM_STATE.touch(); changed();
            }, "diamond_sword"))
          ])
        ]),
        rmButton("删除", function () {
          d.equipment.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]));
    });
    eqBody.appendChild(addButton("添加装备", function () {
      d.equipment.push({ item: "", slot: "HAND" });
      MM_STATE.touch(); changed(true);
    }));
    root.appendChild(card("shield", "装备", "", d.equipment.length > 0, [eqBody]));

    /* AI：行为选择器带优先级（顺序就是优先级），目标选择器不带 */
    if (!d.aiGoals) d.aiGoals = [];
    if (!d.aiTargets) d.aiTargets = [];
    if (!d.damageModifiers) d.damageModifiers = [];
    root.appendChild(card("sword", "AI 行为选择器", "51 项 · 顺序即优先级" +
      (d.aiGoals.length ? " · " + d.aiGoals.length + " 条" : ""), d.aiGoals.length > 0, [
      aiRows({
        kind: "aiGoals", key: "goal", list: d.aiGoals,
        addText: "添加行为",
        placeholder: "meleeattack",
        empty: "没配 AI 就完全按原版行为走。自定义 AI 通常第一条写 clear 清空原版行为。"
      })
    ]));
    root.appendChild(card("sparkle", "AI 目标选择器", "14 项 · 决定它去追谁" +
      (d.aiTargets.length ? " · " + d.aiTargets.length + " 条" : ""), d.aiTargets.length > 0, [
      aiRows({
        kind: "aiTargets", key: "target", list: d.aiTargets,
        addText: "添加目标规则",
        placeholder: "players",
        empty: "没配就用原版的目标选择逻辑。"
      })
    ]));
    root.appendChild(card("sliders", "伤害修正", "33 种伤害类型 · 免疫 / 减伤 / 弱点 / 反吸" +
      (d.damageModifiers.length ? " · " + d.damageModifiers.length + " 条" : ""), d.damageModifiers.length > 0, [
      damageRows(d)
    ]));

    /* 技能 */
    const skBody = el("div", { class: "list" });
    d.skills.forEach(function (s, i) { skBody.appendChild(skillRow(d, s, i)); });
    skBody.appendChild(addButton("添加技能", function () {
      d.skills.push({
        trigger: "onAttack", mechanic: "damage", targeter: "target",
        params: { amount: 10, ignoreArmor: false }, radius: 10, seconds: 10
      });
      MM_STATE.touch(); changed(true);
    }));
    root.appendChild(card("zap", "技能", "", d.skills.length > 0, [skBody]));

    /* 等级 / 外观 / 模块：0.7.0 补齐的 15 个顶层字段，字段表在 spec-data.js 的 mobExtra */
    if (window.MM_SPEC) {
      if (!d.extra) d.extra = MM_SPEC.blank(MM_SPEC.mobExtraFields());
      const filled = MM_SPEC.mobExtraFields().filter(function (f) {
        return !MM_SPEC.isEmpty(d.extra[f.k]);
      }).length;
      const exBody = el("div", { class: "list" });
      MM_SPEC.mobExtraGroups().forEach(function (g) {
        const grid = el("div", { class: "grid" });
        (g.fields || []).forEach(function (f) {
          const c = specControl(d.extra, f);
          if (c) grid.appendChild(c);
        });
        exBody.appendChild(el("div", { class: "spec-block" }, [
          el("div", { class: "spec-title", text: g.title }), grid
        ]));
      });
      root.appendChild(card("crown", "等级 / 外观 / 模块",
        "等级成长、阵营、血条、仇恨表、交易、图腾" + (filled ? " · 已填 " + filled + " 项" : ""), filled > 0, [exBody]));
    }

    /* 掉落 */
    if (!d.drops) d.drops = [];
    root.appendChild(card("box", "掉落物", "物品 / 掉落类型 / 引用掉落表" +
      (d.drops.length ? " · " + d.drops.length + " 条" : ""), d.drops.length > 0, [dropRows(d.drops)]));
  }

  /* ---------- 技能行 ---------- */

  /* 通用修饰：目录里有 14 项（带中文名与类型）就用目录，目录不在才退回固定 5 项 */
  const UNIVERSAL_FALLBACK = ["cooldown", "delay", "repeat", "repeatInterval", "chance"];
  function universalDefs() {
    const u = CAT && CAT.universal;
    if (u && u.length) return u;
    return UNIVERSAL_FALLBACK.map(function (k) {
      return { name: k, type: "number", def: "0", zh: "" };
    });
  }

  /* 预设必须与插件语法一致：health 只认绝对值，百分比要用 healthpercent */
  const COND_PRESETS = [
    { label: "血量低于 50%", id: "healthpercent", params: { percent: "<50%" } },
    { label: "血量低于 30%", id: "healthpercent", params: { percent: "<30%" } },
    { label: "30% 概率", id: "chance", params: { chance: "0.3" } },
    { label: "只在白天", id: "day", params: {} },
    { label: "只在夜晚", id: "night", params: {} },
    { label: "距离 10 格内", id: "distance", params: { distance: "<10" } },
    { label: "处于战斗中", id: "incombat", params: {} }
  ];

  /* ---------- 条件行（技能行与技能组共用） ---------- */
  /* 技能组的 Conditions 行可以带 true/false 后缀表示「期望不成立」 */
  function expectSelect(value, onchange) {
    const s = el("select", { class: "input cond-expect", title: "期望结果：不写就是「成立」，false 表示条件不成立时才继续" });
    [["", "成立"], ["false", "不成立"]].forEach(function (o) {
      const opt = el("option", { value: o[0], text: o[1] });
      if (String(value || "") === o[0]) opt.selected = true;
      s.appendChild(opt);
    });
    s.addEventListener("change", function () { onchange(s.value); });
    return s;
  }

  function conditionRows(list, opts) {
    opts = opts || {};
    return list.map(function (c, ci) {
      const cd = catFind("conditions", c.id);
      const paramsBox = (cd && cd.params.length) ? paramGrid(cd.params, function (pp) {
        return c.params && c.params[pp.name] !== undefined ? c.params[pp.name] : pp.def;
      }, function (pp, v) {
        if (!c.params) c.params = {};
        c.params[pp.name] = v;
        MM_STATE.touch(); changed();
      }, { cmp: true }) : null;

      const head = el("div", { class: "cond-head" }, [
        listInput(catList("conditions"), c.id, function (v) {
          list[ci] = { id: v, params: {}, expect: c.expect };
          MM_STATE.touch(); changed(true);
        }, "搜索条件名，如 healthpercent / chance", true),
        opts.expect ? expectSelect(c.expect, function (v) {
          c.expect = v; MM_STATE.touch(); changed();
        }) : null,
        /* 掉落表的条件不支持 true/false 后缀，但老文件里可能写了，导入时保留在数据里，
           这儿只提示一下，不让它悄悄消失 */
        (!opts.expect && c.expect === "false") ? el("span", { class: "cond-neg", text: "非" }) : null,
        rmButton("删除条件", function () {
          list.splice(ci, 1); MM_STATE.touch(); changed(true);
        })
      ].filter(Boolean));

      return el("div", { class: "cond-row" }, [head, paramsBox].filter(Boolean));
    });
  }

  function enumTable(name) {
    if (!name) return null;
    if (name === "particles") return catList("particles");
    if (name === "mechanics") return catList("mechanics");
    if (name === "targeters") return catList("targeters");
    if (name === "sounds") return null;
    const pool = {
      materials: D.materials, entities: D.entities, enchantments: D.enchantments,
      potionEffects: D.effects, effects: D.effects, attributes: D.attributes,
      equipSlots: D.equipSlots, attrOps: D.attrOps
    };
    return pool[name] || null;
  }

  function guessEnum(name) {
    const n = String(name || "").toLowerCase();
    if (n.indexOf("particle") === 0) return catList("particles");
    if (n === "material" || n.indexOf("blocktype") === 0) return D.materials;
    if (n === "mob" || n === "entity" || n === "entitytype") return D.entities;
    if (n === "potion" || n === "effect") return D.effects;
    if (n === "enchantment") return D.enchantments;
    if (n === "attribute") return D.attributes;
    if (n === "slot") return D.equipSlots;
    return null;
  }

  /* ---------- 比较符输入 ---------- */
  /* 条件参数的值几乎都是「运算符 + 数值」，wiki 里写成 <50% / >10 / >=3。
     裸敲容易漏写 < 或把 % 弄丢，所以运算符做成下拉、百分比做成开关。 */
  const CMP_OPS = [
    { op: "", label: "=" },
    { op: "<", label: "<" },
    { op: "<=", label: "≤" },
    { op: ">", label: ">" },
    { op: ">=", label: "≥" },
    { op: "!=", label: "≠" }
  ];

  function splitCmp(v) {
    const s = String(v === undefined || v === null ? "" : v);
    const m = s.match(/^\s*(<=|>=|!=|=|<|>)\s*(.*)$/);
    if (!m) return { op: "", val: s };
    return { op: m[1] === "=" ? "" : m[1], val: m[2] };
  }

  function cmpInput(value, onchange, opts) {
    opts = opts || {};
    const p = splitCmp(value);
    let unit = "";
    let body = p.val;
    if (opts.percent && /%\s*$/.test(body)) { unit = "%"; body = body.replace(/%\s*$/, ""); }

    const sel = el("select", { class: "input cmp-op", title: "比较符" });
    CMP_OPS.forEach(function (o) {
      const opt = el("option", { value: o.op, text: o.label });
      if (o.op === p.op) opt.selected = true;
      sel.appendChild(opt);
    });
    const num = el("input", { class: "input cmp-val", type: "text", placeholder: opts.placeholder || "数值" });
    num.value = body;

    function emit() {
      const v = num.value.trim();
      if (v === "") { onchange(""); return; }
      onchange(sel.value + v + (unit ? "%" : ""));
    }
    sel.addEventListener("change", emit);
    num.addEventListener("input", emit);

    const kids = [sel, num];
    if (opts.percent) {
      const pc = el("button", {
        class: "cmp-unit" + (unit ? " on" : ""), type: "button", title: "按百分比（% ）"
      }, ["%"]);
      pc.addEventListener("click", function () {
        unit = unit ? "" : "%";
        pc.classList.toggle("on", !!unit);
        emit();
      });
      kids.push(pc);
    }
    return el("div", { class: "cmp-row" }, kids);
  }

  function paramControl(pp, value, set, opts) {
    const t = pp.type;
    const label = pp.zh || pp.name;
    /* 条件参数：数值型或值里已经带运算符 → 用「运算符 + 数值」控件 */
    if (opts && opts.cmp && ["boolean", "enum", "skill", "condition", "color"].indexOf(t) < 0) {
      const CMPABLE = /^(percent|percentage|amount|damage|damageamount|distance|height|level|stacks|kills|size|velocity|force|speed|difficulty|health|healthpercent|count|value|score|exp|food|hunger|time|players|entities|blocks|y|mana|hp|soul|age)$/i;
      const text = String(value === undefined || value === null ? "" : value);
      const numLike = t === "number" || CMPABLE.test(pp.name);
      const hasCmp = /^\s*(<=|>=|!=|=|<|>)/.test(text);
      if (numLike || hasCmp) {
        return cmpInput(value, set, { percent: /percent|percentage/i.test(pp.name) });
      }
    }
    if (t === "boolean") {
      return switchRow(label, null, value === true || value === "true", function (v) {
        set(v ? "true" : "");
      });
    }
    if (t === "number") return numberInput(value, set, { step: "any" });
    if (t === "enum") {
      const tbl = enumTable(pp.enum) || guessEnum(pp.name);
      if (tbl && tbl.length) return listInput(tbl, value, set, pp.def || "");
    }
    if (t === "skill") return textInput(value, set, { placeholder: "技能组名，如 my_skill" });
    if (t === "condition") return textInput(value, set, { placeholder: "条件组名" });
    if (t === "color") return textInput(value, set, { placeholder: "#FFAA00" });
    return textInput(value, set, { placeholder: pp.def || "" });
  }

  function paramGrid(list, getVal, setVal, opts) {
    const wrap = el("div", { class: "grid " + ((opts && opts.cols) || "three"), style: "margin-top:10px" });
    list.forEach(function (pp) {
      const ctl = paramControl(pp, getVal(pp), function (v) { setVal(pp, v); }, opts);
      /* 提示只放「必填 / 默认值」，英文原描述收进 title，避免整屏英文 */
      let hint = null;
      if (pp.required && !pp.def) hint = "必填";
      else if (pp.def !== "" && pp.def !== undefined) hint = "默认 " + pp.def;
      const f = field(pp.zh || pp.name, hint, ctl);
      if (pp.desc) f.title = pp.desc;
      wrap.appendChild(f);
    });
    return wrap;
  }

  /* 目标器通用参数：wiki「Targeters」说明页列出的筛选 / 偏移 / 坐标，所有目标器都能用 */
  const TARGET_GEOM_RE = /^(xoffset|yoffset|zoffset|forwardoffset|sideoffset|upoffset|rotate|coordinate|length|block|faulty|nomegbb|useboundingbox|sudoparent|sudoowner|sudotrigger)/i;

  function targeterExtraNodes(s) {
    if (!s.targeter || s.targeter === "self" || s.targeter === "targeters") return [];
    /* 直接取 catalog 的「Targeters 说明」条目——它不在 catList 里 */
    const uni = ((CAT && CAT.targeters) || []).filter(function (x) { return x.id === "targeters"; })[0];
    if (!uni || !uni.params || !uni.params.length) return [];
    const geoms = uni.params.filter(function (pp) { return TARGET_GEOM_RE.test(pp.name); });
    const filters = uni.params.filter(function (pp) { return !TARGET_GEOM_RE.test(pp.name); });

    function box(title, list) {
      if (!list.length) return null;
      const used = list.filter(function (pp) {
        return s.targetParams && s.targetParams[pp.name] !== undefined && s.targetParams[pp.name] !== "";
      }).length;
      return el("details", { class: "skill-section" }, [
        el("summary", { text: title + "（" + list.length + " 项" + (used ? " · 已设 " + used : "") + "）" }),
        paramGrid(list, function (pp) {
          return s.targetParams && s.targetParams[pp.name] !== undefined ? s.targetParams[pp.name] : pp.def;
        }, function (pp, v) {
          if (!s.targetParams) s.targetParams = {};
          s.targetParams[pp.name] = v;
          MM_STATE.touch(); changed();
        })
      ]);
    }
    return [box("目标筛选", filters), box("偏移 · 坐标 · sudo", geoms)].filter(Boolean);
  }

  function skillRow(d, s, i, opts) {
    opts = opts || {};
    /* 导入时认不出的技能行：只读展示，可删，不猜语义 */
    if (s.raw) {
      return el("div", { class: "list-row skill-row" }, [
        el("div", { class: "row-body" }, [
          el("div", { class: "raw-skill" }, [
            el("div", { class: "raw-skill-tag", text: "原始技能行 · 表单改不了，只读保留" }),
            el("code", { class: "raw-skill-code", text: s.raw })
          ])
        ]),
        rmButton("删除", function () {
          d.skills.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]);
    }

    if (!s.params) s.params = {};
    if (!s.conditions) s.conditions = [];
    if (!s.universal) s.universal = {};

    const mech = catFind("mechanics", s.mechanic);
    const tg = catFind("targeters", s.targeter);

    function getParam(pp) {
      const v = s.params[pp.name];
      return v === undefined ? pp.def : v;
    }
    function setParam(pp, v) {
      s.params[pp.name] = v;
      MM_STATE.touch(); changed();
    }

    const head = el("div", { class: opts.noTrigger ? "grid" : "grid three" }, [
      opts.noTrigger ? null : field("触发", null, listInput(catList("triggers"), s.trigger, function (v) {
        s.trigger = v; MM_STATE.touch(); changed(true);
      }, "onSpawn", true)),
      field("效果", null, listInput(catList("mechanics"), s.mechanic, function (v) {
        s.mechanic = v;
        /* 只清空，不预填默认值——生成时只写用户真的改过的字段 */
        s.params = {};
        MM_STATE.touch(); changed(true);
      }, "搜索机制名，如 damage / particle", true)),
      field("目标", null, listInput(catList("targeters"), s.targeter, function (v) {
        s.targeter = v; MM_STATE.touch(); changed(true);
      }, "self"))
    ].filter(Boolean));

    const descLine = mech ? el("div", { class: "mech-desc" }, [
      el("b", { text: mech.zh }),
      mech.desc ? el("span", { class: "mech-desc-en", text: mech.desc }) : null
    ]) : null;

    const targParamWrap = (tg && tg.params.length)
      ? paramGrid(tg.params, function (pp) {
          return s.targetParams && s.targetParams[pp.name] !== undefined ? s.targetParams[pp.name] : pp.def;
        }, function (pp, v) {
          if (!s.targetParams) s.targetParams = {};
          s.targetParams[pp.name] = v;
          MM_STATE.touch(); changed();
        })
      : null;

    const all = mech ? mech.params : [];
    /* 默认只露「必填」和「用户已经改过」的，其余收进折叠区 */
    const isTouched = function (pp) {
      return s.params && s.params[pp.name] !== undefined && s.params[pp.name] !== "";
    };
    const mainP = all.filter(function (pp) { return pp.required || isTouched(pp); });
    const advP = all.filter(function (pp) { return !(pp.required || isTouched(pp)); });

    const paramNodes = [];
    if (mainP.length) paramNodes.push(paramGrid(mainP, getParam, setParam));
    else if (advP.length) {
      paramNodes.push(el("div", { class: "mech-desc", text: "这个效果用默认参数就能工作；要微调就展开下面的「可调参数」。" }));
    }
    if (advP.length) {
      paramNodes.push(el("details", { class: "skill-section" }, [
        el("summary", { text: "可调参数（" + advP.length + " 项，默认值已对好）" }),
        paramGrid(advP, getParam, setParam)
      ]));
    }

    const condWrap = el("details", { class: "skill-section", open: s.conditions.length > 0 }, [
      el("summary", { text: "触发条件" + (s.conditions.length ? "（" + s.conditions.length + " 个）" : "") }),
      el("div", { class: "cond-presets" }, COND_PRESETS.map(function (pre) {
        return el("button", {
          class: "chip", type: "button", text: pre.label,
          onclick: function () {
            s.conditions.push({ id: pre.id, params: Object.assign({}, pre.params) });
            MM_STATE.touch(); changed(true);
          }
        });
      })),
      el("div", { class: "cond-list" }, conditionRows(s.conditions)),
      addButton("添加条件", function () {
        s.conditions.push({ id: "chance", params: { chance: "0.3" } });
        MM_STATE.touch(); changed(true);
      })
    ]);

    const uniDefs = universalDefs();
    const uniFields = uniDefs.map(function (u) {
      const k = u.name;
      const label = u.zh || k;
      const val = s.universal[k];
      const hint = u.def !== "" && u.def !== undefined ? "默认 " + u.def : null;
      let node;
      if (u.type === "boolean") {
        node = switchRow(label, hint, val === "true", function (v) {
          s.universal[k] = v ? "true" : "false";
          MM_STATE.touch(); changed();
        });
      } else if (u.type === "text") {
        node = field(label, hint, textInput(val, function (v) {
          s.universal[k] = v; MM_STATE.touch(); changed();
        }, { placeholder: "@Forward{f=10}" }));
      } else {
        node = field(label, hint, numberInput(val, function (v) {
          s.universal[k] = v; MM_STATE.touch(); changed();
        }, { step: "any" }));
      }
      if (u.desc) node.title = u.desc;
      return node;
    });

    const uniWrap = el("details", { class: "skill-section" }, [
      el("summary", { text: "通用修饰（冷却 / 延迟 / 重复 / 概率 等 " + uniDefs.length + " 项）" }),
      el("div", { class: "grid three", style: "margin-top:10px" }, uniFields)
    ]);

    return el("div", { class: "list-row skill-row" }, [
      el("div", { class: "row-body" },
        [head, descLine, targParamWrap]
          .concat(paramNodes.concat(targeterExtraNodes(s)))
          .concat([condWrap, uniWrap]).filter(Boolean)),
      rmButton("删除", function () {
        d.skills.splice(i, 1); MM_STATE.touch(); changed(true);
      })
    ]);
  }

  /* ---------- 技能组表单（Metaskill） ---------- */
  function renderSkill(root, p) {
    const d = p.data;
    ["conditions", "targetConditions", "triggerConditions", "skills"].forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = [];
    });

    root.appendChild(card("zap", "基础", "", true, [
      el("div", { class: "grid three" }, [
        switchRow("没有目标就取消", "CancelIfNoTargets", d.cancelIfNoTargets === "true", function (v) {
          d.cancelIfNoTargets = v ? "true" : ""; MM_STATE.touch(); changed();
        }),
        switchRow("隐藏", "不出现在 /mm skills 列表里", d.hidden === "true", function (v) {
          d.hidden = v ? "true" : ""; MM_STATE.touch(); changed();
        }),
        field("冷却（秒）", "同一施法者两次执行的最小间隔", numberInput(d.cooldown, function (v) {
          d.cooldown = v; MM_STATE.touch(); changed();
        }, { step: "any" }))
      ])
    ]));

    /* 三块条件语义不同：施法者 / 继承到的目标 / 触发者 */
    root.appendChild(condCardFor(d, "conditions", "条件 Conditions",
      "对施法者判定" + (d.conditions.length ? " · " + d.conditions.length + " 个" : " · 不满足就不执行"), true, true));
    root.appendChild(condCardFor(d, "targetConditions", "目标条件 TargetConditions",
      "对继承到的目标判定" + (d.targetConditions.length ? " · " + d.targetConditions.length + " 个" : ""), false, true));
    root.appendChild(condCardFor(d, "triggerConditions", "触发条件 TriggerConditions",
      "对触发者判定，可用 @Trigger" + (d.triggerConditions.length ? " · " + d.triggerConditions.length + " 个" : ""), false, true));

    const skBody = el("div", { class: "list" });
    d.skills.forEach(function (s, i) { skBody.appendChild(skillRow(d, s, i, { noTrigger: true })); });
    skBody.appendChild(addButton("添加技能", function () {
      d.skills.push({ trigger: "", mechanic: "damage", targeter: "target", params: { amount: 10 } });
      MM_STATE.touch(); changed(true);
    }));
    root.appendChild(card("layers", "技能列表", d.skills.length ? d.skills.length + " 条" : "技能组里真正执行的东西", d.skills.length > 0, [skBody]));

    root.appendChild(card("box", "分支技能组", "条件不满足 / 冷却中 / 并发执行时改跑别的技能组", false, [
      el("div", { class: "grid three" }, [
        field("条件不满足时", "FailedConditionsSkill", textInput(d.failedConditionsSkill, function (v) {
          d.failedConditionsSkill = v; MM_STATE.touch(); changed();
        }, { placeholder: "另一个技能组名" })),
        field("冷却中时", "OnCooldownSkill", textInput(d.onCooldownSkill, function (v) {
          d.onCooldownSkill = v; MM_STATE.touch(); changed();
        }, { placeholder: "另一个技能组名" })),
        field("同时并发执行", "额外的异步技能组", textInput(d.skill, function (v) {
          d.skill = v; MM_STATE.touch(); changed();
        }, { placeholder: "另一个技能组名" }))
      ])
    ]));
  }

  /* ---------- 条件卡片（技能组与掉落表共用） ---------- */

  /* 三块条件语义不同：施法者 / 继承到的目标 / 触发者；期望值只在技能组里有意义 */
  function condCardFor(d, key, title, sub, withPresets, withExpect) {
    const list = d[key] || (d[key] = []);
    const body = el("div", { class: "list" }, [
      withPresets ? el("div", { class: "cond-presets" }, COND_PRESETS.map(function (pre) {
        return el("button", {
          class: "chip", type: "button", text: pre.label,
          onclick: function () {
            list.push({ id: pre.id, params: Object.assign({}, pre.params) });
            MM_STATE.touch(); changed(true);
          }
        });
      })) : null,
      el("div", { class: "cond-list" }, conditionRows(list, { expect: !!withExpect })),
      addButton("添加条件", function () {
        list.push({ id: "", params: {} });
        MM_STATE.touch(); changed(true);
      })
    ].filter(Boolean));
    return card("sliders", title, sub, list.length > 0, [body]);
  }

  /* ---------- 物品表单 ---------- */
  function renderItem(root, p) {
    const d = p.data;

    root.appendChild(card("file", "基础属性", "", true, [
      el("div", { class: "grid three" }, [
        field("物品材质", "决定它长什么样", listInput(D.materials, d.material, function (v) {
          d.material = v; MM_STATE.touch(); changed();
        }, "diamond_sword", true)),
        field("单次数量", "一次给 / 掉几个", numberInput(d.amount, function (v) {
          d.amount = v; MM_STATE.touch(); changed();
        }, { min: 1, step: 1 }))
      ])
    ]));

    const loreArea = el("textarea", { class: "input", rows: 4, placeholder: "第一行介绍\n第二行介绍" });
    loreArea.value = (d.lore || []).join("\n");
    loreArea.addEventListener("input", function () {
      d.lore = loreArea.value.split("\n");
      MM_STATE.touch(); changed();
    });
    root.appendChild(card("text", "物品描述", "显示在名字下面的小字", (d.lore || []).length > 0, [
      field("描述", "一行一条，支持 & 颜色代码", loreArea, { full: true })
    ]));

    const enBody = el("div", { class: "list" });
    d.enchants.forEach(function (e, i) {
      enBody.appendChild(el("div", { class: "list-row" }, [
        el("div", { class: "row-body" }, [
          el("div", { class: "grid" }, [
            field("附魔", null, listInput(D.enchantments, e.name, function (v) {
              e.name = v.toUpperCase(); MM_STATE.touch(); changed();
            }, "SHARPNESS")),
            field("等级", null, numberInput(e.level, function (v) {
              e.level = v; MM_STATE.touch(); changed();
            }, { min: 1, step: 1 }))
          ])
        ]),
        rmButton("删除", function () {
          d.enchants.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]));
    });
    enBody.appendChild(addButton("添加附魔", function () {
      d.enchants.push({ name: "SHARPNESS", level: 1 });
      MM_STATE.touch(); changed(true);
    }));
    root.appendChild(card("sparkle", "附魔", "可超过原版等级上限", d.enchants.length > 0, [enBody]));

    const atBody = el("div", { class: "list" });
    d.attributes.forEach(function (a, i) {
      atBody.appendChild(el("div", { class: "list-row" }, [
        el("div", { class: "row-body" }, [
          el("div", { class: "grid" }, [
            field("生效槽位", null, selectInput(D.attrSlots, a.slot, function (v) {
              a.slot = v; MM_STATE.touch(); changed();
            })),
            field("属性", null, listInput(D.attributes, a.name, function (v) {
              a.name = v.toUpperCase(); MM_STATE.touch(); changed();
            }, "ATTACK_DAMAGE"))
          ]),
          el("div", { class: "grid", style: "margin-top:10px" }, [
            field("数值", null, numberInput(a.value, function (v) {
              a.value = v; MM_STATE.touch(); changed();
            }, { step: "any" })),
            field("计算方式", null, selectInput(D.attrOps, a.op, function (v) {
              a.op = v; MM_STATE.touch(); changed();
            }))
          ])
        ]),
        rmButton("删除", function () {
          d.attributes.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]));
    });
    atBody.appendChild(addButton("添加属性", function () {
      d.attributes.push({ slot: "MainHand", name: "ATTACK_DAMAGE", value: 5, op: "ADD" });
      MM_STATE.touch(); changed(true);
    }));
    root.appendChild(card("sliders", "属性加成", "加攻击力、生命值等", d.attributes.length > 0, [atBody]));

    /* 物品选项：全量 17 项（wiki 的 Items/Options 页），分「通用 / 头颅 / 染色」三组 */
    if (!d.options) d.options = MM_STATE.newItem().data.options;
    if (!d.components) d.components = {};
    const optList = (window.MM_EXTRAS && MM_EXTRAS.itemOptions) || [];
    const optBody = el("div", { class: "list" });
    const groups = {};
    optList.forEach(function (o) {
      const g = o.section || "通用";
      (groups[g] = groups[g] || []).push(o);
    });
    Object.keys(groups).forEach(function (g) {
      const grid = el("div", { class: "grid" }, groups[g].map(function (o) {
        if (o.type === "boolean") {
          return switchRow(o.zh || o.id, o.id, d.options[o.id] === true, function (v) {
            d.options[o.id] = v; MM_STATE.touch(); changed();
          });
        }
        if (o.type === "number") {
          return field(o.zh || o.id, o.id, numberInput(d.options[o.id], function (v) {
            d.options[o.id] = v; MM_STATE.touch(); changed();
          }, { step: "any" }));
        }
        return field(o.zh || o.id, o.id, textInput(d.options[o.id], function (v) {
          d.options[o.id] = v; MM_STATE.touch(); changed();
        }, { placeholder: o.def || "" }));
      }));
      optBody.appendChild(el("div", { class: "opt-sec" }, [
        el("div", { class: "opt-title", text: g }),
        grid
      ]));
    });
    root.appendChild(card("sliders", "其他选项", "官方全部 " + (optList.length || 0) + " 项", false, [optBody]));

    /* 掉落特效（FancyDrops）：和 DropOptions 组件是同一个容器，
       单独给一张卡更找得到，组件列表里就不重复列了 */
    if (window.MM_SPEC) {
      const fd = MM_SPEC.fancyDrops();
      const entry = d.components.DropOptions;
      const on = !!entry;
      const box = el("div", { class: "list" }, [
        switchRow("启用掉落特效", "发光、光柱、爆散、全息", on, function (v) {
          if (v) d.components.DropOptions = { params: {} };
          else delete d.components.DropOptions;
          MM_STATE.touch(); changed(true);
        }),
        on ? subGrid(entry.params || (entry.params = {}), fd.fields) : null
      ].filter(Boolean));
      root.appendChild(card("sparkle", fd.title || "掉落特效",
        "掉落物发光 / 光柱 / 爆散 / 全息，写进 DropOptions", on, [box]));
    }

    /* 1.20.5+ 组件：只把有明确子键的做成表单，其余列出来供参考 */
    root.appendChild(itemComponentsCard(d));
  }

  /* 物品组件卡片：wiki 的 Items 页把 1.20.5+ 的 data component 都映射成了根级键，
     这里挑「值形态明确」的那些做成输入框，剩下的一律不硬凑。 */
  /* 物品 1.20.5+ 组件。三档：
     ① extras 里有子键表的 23 项 → 按表渲染输入框
     ② spec-data 里补了子键的 28 项 → 走通用引擎（列表 / 键值 / 枚举）
     ③ 剩下的是物品自己的顶层键（Id / Lore / Options…），在基础卡片里改，不在这儿重复 */
  const ITEM_BASE_KEYS = ["Internal_Name", "Id", "Display", "Lore", "Attributes", "Options", "Enchantments"];

  function componentFieldsFor(id) {
    return (window.MM_SPEC && MM_SPEC.itemComponentFields(id)) || null;
  }

  function itemComponentsCard(d) {
    const all = ((window.MM_EXTRAS && MM_EXTRAS.itemComponents) || []);
    /* DropOptions 有独立的「掉落特效」卡片，这里不再重复 */
    const spec = all.filter(function (c) {
      return c.id !== "DropOptions" && (c.form || componentFieldsFor(c.id));
    });
    const body = el("div", { class: "list" });
    if (!spec.length) return card("layers", "物品组件", "数据没加载", false, [body]);

    spec.forEach(function (c) {
      const entry = d.components[c.id];
      const on = !!entry;
      const sf = componentFieldsFor(c.id);
      const toggle = switchRow(c.zh, c.id + (on ? "" : " · 未启用"), on, function (v) {
        if (v) d.components[c.id] = { params: {}, value: "" };
        else delete d.components[c.id];
        MM_STATE.touch(); changed(true);
      });
      const box = el("div", { class: "comp-box" }, [toggle]);

      if (on && sf) {
        /* 通用引擎：子键在 entry.params 里，和另一条路径共用同一个容器 */
        if (!entry.params || typeof entry.params !== "object") entry.params = {};
        const grid = subGrid(entry.params, sf);
        grid.style.marginTop = "10px";
        box.appendChild(grid);
      } else if (on) {
        if (entry.list) {
          const ta = el("textarea", { class: "input", rows: 3, placeholder: "一行一个，例如：food" });
          ta.value = (entry.list || []).join("\n");
          ta.addEventListener("input", function () {
            entry.list = ta.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
            MM_STATE.touch(); changed();
          });
          box.appendChild(field(c.params && c.params[0] ? c.params[0].zh : "条目", null, ta, { full: true }));
        } else if (!(c.params || []).length) {
          box.appendChild(el("div", { class: "grid", style: "margin-top:8px" }, [
            field(c.zh, c.desc ? c.desc.slice(0, 60) : null,
              textInput(entry.value, function (v) {
                entry.value = v; MM_STATE.touch(); changed();
              }, { placeholder: "" }), { full: true })
          ]));
        } else {
          const grid = el("div", { class: "grid three", style: "margin-top:10px" });
          (c.params || []).forEach(function (pp) {
            if (!entry.params) entry.params = {};
            const cur = entry.params[pp.name];
            if (pp.type === "boolean") {
              grid.appendChild(switchRow(pp.zh || pp.name, pp.name, cur === "true", function (v) {
                entry.params[pp.name] = v; MM_STATE.touch(); changed();
              }));
            } else if (pp.type === "list") {
              const ta = el("textarea", { class: "input", rows: 3 });
              ta.value = (entry.list || []).join("\n");
              ta.addEventListener("input", function () {
                entry.list = ta.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
                MM_STATE.touch(); changed();
              });
              grid.appendChild(field(pp.zh || pp.name, null, ta, { full: true }));
            } else {
              grid.appendChild(field(pp.zh || pp.name, pp.def ? "默认 " + pp.def : pp.name,
                textInput(cur, function (v) {
                  if (v === "") delete entry.params[pp.name];
                  else entry.params[pp.name] = v;
                  MM_STATE.touch(); changed();
                }, { placeholder: pp.def || "" })));
            }
          });
          box.appendChild(grid);
        }
      }
      const wrap = el("details", { class: "skill-section" }, [
        el("summary", { text: c.zh + (on ? " · 已启用" : "") }),
        el("div", { class: "comp-desc", text: c.desc || "" }),
        box
      ]);
      body.appendChild(wrap);
    });

    /* 剩下的是物品自身的顶层键，在基础卡片里改过了 */
    const rest = all.filter(function (c) {
      return !c.form && !componentFieldsFor(c.id) && ITEM_BASE_KEYS.indexOf(c.id) < 0;
    });
    if (rest.length) {
      const list = el("div", { class: "grid", style: "margin-top:8px" });
      rest.forEach(function (c) {
        list.appendChild(field(c.zh || c.id, (c.desc || "").slice(0, 70) || c.id,
          el("div", { class: "comp-desc", text: c.id }), { full: true }));
      });
      body.appendChild(el("details", { class: "skill-section" }, [
        el("summary", { text: "另外 " + rest.length + " 项组件（不做表单，导进来会原样保留）" }),
        list
      ]));
    }
    return card("layers", "物品组件", "1.20.5+ 的 data component 映射 · " + spec.length + " 项可编辑 / 共 " +
      ((window.MM_EXTRAS && MM_EXTRAS.itemComponents) || []).length + " 项", false, [body]);
  }

  return {
    init: function (opts) { changed = opts.onChange; },
    renderSidebar: renderSidebar,
    renderTemplates: renderTemplates,
    renderEditor: renderEditor,
    kindIcon: kindIcon
  };
})();






