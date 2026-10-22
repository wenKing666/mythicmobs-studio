/* 表单渲染 */
window.MM_UI = (function () {
  "use strict";

  let changed = function () {};
  const D = MM_DATA;

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
        items.forEach(function (o, i) {
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
        ico(p.kind === "mob" ? "skull" : "sword", 14),
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
          el("button", { class: "btn", onclick: function () { window.MM_APP && window.MM_APP.new("item"); } }, ["新建物品"])
        ])
      ]));
      return;
    }
    root.appendChild(editorHeader(project));
    if (project.kind === "mob") renderMob(root, project);
    else renderItem(root, project);
  }

  function editorHeader(p) {
    const kindName = p.kind === "mob" ? "怪物" : "物品";
    const iconName = p.kind === "mob" ? "skull" : "sword";

    const idErr = el("div", { class: "field-err", text: "ID 不能为空" });
    idErr.style.display = "none";
    const idInput = textInput(p.key, function (v, input) {
      const clean = String(v).replace(/[^A-Za-z0-9_\-]/g, "_");
      if (clean !== v) input.value = clean;
      p.key = clean;
      syncId();
      MM_STATE.touch();
      changed();
    }, { placeholder: p.kind === "mob" ? "my_boss" : "my_sword" });

    function syncId() {
      const bad = !String(idInput.value || "").trim();
      idInput.classList.toggle("invalid", bad);
      idErr.style.display = bad ? "" : "none";
    }

    syncId();

    return el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [
        el("span", { class: "card-icon", html: MM_ICONS.get(iconName, 15) }),
        el("span", { text: kindName })
      ]),
      el("div", { class: "card-body" }, [
        el("div", { class: "grid" }, [
          el("div", { class: "field" }, [
            el("label", { text: "ID" }),
            idInput,
            idErr,
            el("div", { class: "hint", text: "服务器里用它刷怪 / 给物品，只能英文、数字、下划线" })
          ]),
          field("显示名称", "头顶显示的名字，支持 & 颜色代码", textInput(p.data.display, function (v) {
            p.data.display = v; MM_STATE.touch(); changed();
          }, { placeholder: p.kind === "mob" ? "&c我的怪物" : "&b我的物品" }))
        ])
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

    /* 掉落 */
    const drBody = el("div", { class: "list" });
    d.drops.forEach(function (x, i) {
      drBody.appendChild(el("div", { class: "list-row" }, [
        el("div", { class: "row-body" }, [
          el("div", { class: "grid three" }, [
            field("掉什么", "物品 ID 或 exp", listInput(D.materials, x.item, function (v) {
              x.item = v; MM_STATE.touch(); changed();
            }, "diamond")),
            field("数量", "可写 1-3", textInput(x.amount, function (v) {
              x.amount = v; MM_STATE.touch(); changed();
            }, { placeholder: "1" })),
            field("概率", "0.5 = 50%", textInput(x.chance, function (v) {
              x.chance = v; MM_STATE.touch(); changed();
            }, { placeholder: "0.5" }))
          ])
        ]),
        rmButton("删除", function () {
          d.drops.splice(i, 1); MM_STATE.touch(); changed(true);
        })
      ]));
    });
    drBody.appendChild(addButton("添加掉落", function () {
      d.drops.push({ item: "", amount: "1", chance: "1" });
      MM_STATE.touch(); changed(true);
    }));
    root.appendChild(card("box", "掉落物", "", d.drops.length > 0, [drBody]));
  }

  function skillRow(d, s, i) {
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

    const mech = D.mechanics.find(function (m) { return m.id === s.mechanic; }) || D.mechanics[0];
    const tg = D.targeters.find(function (x) { return x.id === s.targeter; });
    const trg = D.triggers.find(function (x) { return x.id === s.trigger; });

    const head = el("div", { class: "grid three" }, [
      field("触发", null, selectInput(D.triggers, s.trigger, function (v) {
        s.trigger = v; MM_STATE.touch(); changed(true);
      })),
      field("效果", null, selectInput(D.mechanics.map(function (m) {
        return { id: m.id, zh: m.zh };
      }), s.mechanic, function (v) {
        s.mechanic = v;
        const m2 = D.mechanics.find(function (x) { return x.id === v; });
        s.params = {};
        if (m2) m2.params.forEach(function (pp) { s.params[pp.name] = pp.def; });
        MM_STATE.touch(); changed(true);
      })),
      field("目标", null, selectInput(D.targeters, s.targeter, function (v) {
        s.targeter = v; MM_STATE.touch(); changed(true);
      }))
    ]);

    const extra = [];
    if (trg && trg.needsTicks) {
      extra.push(field("间隔（秒）", null, numberInput(s.seconds === undefined ? 10 : s.seconds, function (v) {
        s.seconds = v; MM_STATE.touch(); changed();
      }, { min: 1, step: 1 })));
    }
    if (tg && tg.needsRadius) {
      extra.push(field("半径（格）", null, numberInput(s.radius === undefined ? tg.defaultR : s.radius, function (v) {
        s.radius = v; MM_STATE.touch(); changed();
      }, { min: 1, step: 1 })));
    }
    const extraWrap = extra.length ? el("div", { class: "grid three", style: "margin-top:10px" }, extra) : null;

    const paramWrap = el("div", { class: "grid three", style: "margin-top:10px" });
    (mech.params || []).forEach(function (pp) {
      const val = s.params ? s.params[pp.name] : pp.def;
      let ctl;
      if (pp.type === "bool") {
        ctl = switchRow(pp.label, null, !!val, function (v) {
          s.params[pp.name] = v; MM_STATE.touch(); changed();
        });
      } else if (pp.type === "number") {
        ctl = numberInput(val, function (v) {
          s.params[pp.name] = v; MM_STATE.touch(); changed();
        }, { step: "any" });
      } else if (pp.type === "effect") {
        ctl = listInput(D.effects, val, function (v) {
          s.params[pp.name] = v.toUpperCase(); MM_STATE.touch(); changed();
        });
      } else if (pp.type === "particle") {
        ctl = listInput(D.particles, val, function (v) {
          s.params[pp.name] = v; MM_STATE.touch(); changed();
        });
      } else if (pp.type === "entity") {
        ctl = listInput(D.entities, val, function (v) {
          s.params[pp.name] = v.toUpperCase(); MM_STATE.touch(); changed();
        });
      } else if (pp.type === "material") {
        ctl = listInput(D.materials, val, function (v) {
          s.params[pp.name] = v; MM_STATE.touch(); changed();
        });
      } else {
        ctl = textInput(val, function (v) {
          s.params[pp.name] = v; MM_STATE.touch(); changed();
        });
      }
      paramWrap.appendChild(field(pp.label, null, ctl));
    });

    return el("div", { class: "list-row skill-row" }, [
      el("div", { class: "row-body" }, [head, extraWrap, paramWrap].filter(Boolean)),
      rmButton("删除", function () {
        d.skills.splice(i, 1); MM_STATE.touch(); changed(true);
      })
    ]);
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

    const optsGrid = el("div", { class: "grid" }, D.itemOptions.map(function (o) {
      if (o.type === "bool") {
        return switchRow(o.label, o.hint, !!d.options[o.key], function (v) {
          d.options[o.key] = v; MM_STATE.touch(); changed();
        });
      }
      return field(o.label, o.hint, numberInput(d.options[o.key] === 0 ? "" : d.options[o.key], function (v) {
        d.options[o.key] = v; MM_STATE.touch(); changed();
      }, { min: 0, step: 1 }));
    }));
    root.appendChild(card("sliders", "其他选项", "", false, [optsGrid]));
  }

  return {
    init: function (opts) { changed = opts.onChange; },
    renderSidebar: renderSidebar,
    renderTemplates: renderTemplates,
    renderEditor: renderEditor
  };
})();






