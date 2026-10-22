/* 引导与交互 */
(function () {
  "use strict";

  const $ = function (id) { return document.getElementById(id); };
  let rebuilding = false;

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function currentYaml() {
    return MM_YAML.generate(MM_STATE.current());
  }

  /* 两块提示共用这个框：
     必填项缺失 = 拦截保存（红），引用检查 = 只提示（蓝），后者不挡保存。
     0.8.0 起引用检查是可点的：不存在的名字一键新建，已存在的引用一键跳到那个文件。 */
  function renderWarnings(issues) {
    const box = $("yamlWarn");
    const dl = $("btnDownload");
    const p = MM_STATE.current();
    issues = issues || [];
    const missing = (window.MM_YAML.refMissing ? MM_YAML.refMissing(p) : []);
    const found = (window.MM_YAML.refFound ? MM_YAML.refFound(p) : { skills: [], droptables: [] });
    const hasRefs = missing.length || found.skills.length || found.droptables.length;
    if (!issues.length && !hasRefs) {
      box.hidden = true;
      box.innerHTML = "";
      box.classList.remove("soft");
      dl.disabled = false;
      dl.title = "";
      return;
    }
    box.hidden = false;
    box.classList.toggle("soft", !issues.length);
    box.innerHTML = "";

    function miniBtn(text, onclick, title) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mini-btn";
      b.textContent = text;
      if (title) b.title = title;
      b.addEventListener("click", onclick);
      return b;
    }

    function listHead(title) {
      const head = document.createElement("b");
      head.textContent = title;
      box.appendChild(head);
      const ul = document.createElement("ul");
      box.appendChild(ul);
      return ul;
    }

    if (issues.length) {
      const ul = listHead("还差 " + issues.length + " 项才能用：");
      issues.slice(0, 6).forEach(function (t) {
        const li = document.createElement("li");
        li.textContent = t;
        ul.appendChild(li);
      });
      if (issues.length > 6) {
        const li = document.createElement("li");
        li.textContent = "……还有 " + (issues.length - 6) + " 项";
        ul.appendChild(li);
      }
      dl.disabled = true;
      dl.title = "先补全上面列出的必填项";
    } else {
      dl.disabled = false;
      dl.title = "";
    }

    if (missing.length) {
      const ul = listHead("引用检查（不影响保存）：");
      missing.slice(0, 8).forEach(function (m) {
        const li = document.createElement("li");
        li.appendChild(document.createTextNode(m.msg + "　"));
        li.appendChild(miniBtn(m.kind === "skills" ? "新建技能组" : "新建掉落表", function () {
          const np = m.kind === "skills" ? MM_STATE.newSkill() : MM_STATE.newDropTable();
          np.key = m.name;
          MM_STATE.add(np);
          /* 新建的还没落盘，但名字已经存在了——同步进引用索引，报警立刻消失 */
          if (window.MM_REFS && MM_REFS[m.kind]) {
            MM_REFS[m.kind][m.name.toLowerCase()] = {
              path: null, rel: "", name: m.name + ".yml",
              kind: m.kind === "skills" ? "skill" : "droptable", size: 0, mtime: 0
            };
          }
          refresh(true);
          toast("已新建「" + m.name + "」，那条引用现在能找到了");
        }, "建一个叫这个名字的空配置，引用就不报警了"));
        ul.appendChild(li);
      });
      if (missing.length > 8) {
        const li = document.createElement("li");
        li.textContent = "……还有 " + (missing.length - 8) + " 项";
        ul.appendChild(li);
      }
    }

    /* 已存在的引用：列出来，点「打开」直接进那个文件（已打开过就切回去） */
    [["skills", "引用的技能组"], ["droptables", "引用的掉落表"]].forEach(function (pair) {
      const kind = pair[0], names = found[kind];
      if (!names.length) return;
      const row = document.createElement("div");
      row.className = "ref-found";
      row.appendChild(document.createTextNode(pair[1] + "："));
      names.slice(0, 10).forEach(function (n, i) {
        if (i) row.appendChild(document.createTextNode("、"));
        const b = miniBtn(n, function () {
          const meta = window.MM_REFS && MM_REFS[kind] && MM_REFS[kind][String(n).toLowerCase()];
          if (!meta || !window.MM_HOST_OPEN_FILE) {
            toast("纯浏览器模式没有文件系统，打不开；用桌面版扫目录后可以跳转");
            return;
          }
          if (!meta.path) { toast("「" + n + "」还没保存到磁盘，保存后再打开"); return; }
          MM_HOST_OPEN_FILE(meta);
        }, "打开 " + n);
        b.classList.add("ref-link");
        row.appendChild(b);
      });
      box.appendChild(row);
    });
  }

  let previewTimer = null;
  function paintPreview(p) {
    $("yamlOut").innerHTML = MM_YAML.highlight(currentYaml());
    renderWarnings(MM_YAML.validate(p));
  }
  function refresh(rebuild) {
    const p = MM_STATE.current();
    if (previewTimer) clearTimeout(previewTimer);
    if (rebuild) paintPreview(p);
    else previewTimer = setTimeout(function () { previewTimer = null; paintPreview(MM_STATE.current()); }, 120);

    // 侧栏标题随名字变化
    MM_UI.renderSidebar($("projectList"), selectProject, deleteProject);

    if (rebuild && !rebuilding) {
      /* 重建表单前先把还挂着的手写补全弹层关掉，否则它会留在 body 上 */
      if (window.__mmActiveCombo) window.__mmActiveCombo.close();
      const sc = $("editor").scrollTop;
      MM_UI.renderEditor($("editor"), p);
      $("editor").scrollTop = sc;
    }
  }

  function selectProject(id) {
    MM_STATE.select(id);
    MM_UI.renderEditor($("editor"), MM_STATE.current());
    MM_UI.renderSidebar($("projectList"), selectProject, deleteProject);
    $("yamlOut").innerHTML = MM_YAML.highlight(currentYaml());
    renderWarnings(MM_YAML.validate(MM_STATE.current()));
    $("editor").scrollTop = 0;
  }

  function deleteProject(id) {
    const p = MM_STATE.all().find(function (x) { return x.id === id; });
    if (!p) return;
    if (!confirm("确定删除「" + (p.data.display || p.key) + "」吗？")) return;
    MM_STATE.remove(id);
    refresh(true);
    toast("已删除");
  }

  function newProject(kind) {
    const p = MM_STATE.create(kind);
    MM_UI.renderEditor($("editor"), p);
    refresh();
    $("editor").scrollTop = 0;
  }

  /* 导入过的项目：丢掉本地改动，按磁盘上的最新内容重填表单。
     0.18.0：先弹「磁盘 vs 本地」行级差异，确认后才真的覆盖。 */
  async function reloadFromDisk() {
    const p = MM_STATE.current();
    if (!p || !p.filePath) { toast("这个项目不是从文件导入的"); return; }
    if (!window.MM_HOST || !MM_HOST.readParsed) { toast("纯浏览器模式没有文件系统"); return; }
    let r;
    try { r = await MM_HOST.readParsed(p.filePath); }
    catch (e) { toast("读取失败：" + e.message); return; }
    if (r.errors && r.errors.length) { toast("文件解析失败：" + r.errors[0]); return; }
    const sp = MM_SPEC && MM_SPEC.type(p.kind);
    const base = p.kind === "mob" ? MM_STATE.newMob()
      : p.kind === "skill" ? MM_STATE.newSkill()
      : p.kind === "droptable" ? MM_STATE.newDropTable()
      : sp ? MM_STATE.newSpecProject(p.kind)
      : MM_STATE.newItem();
    const res = MM_IMPORT.fill(base, { js: r.js, text: r.text, filePath: p.filePath });
    if (!res.ok) { toast(res.reason || "重新读取失败"); return; }
    /* 磁盘版 YAML（编辑器格式）：在深拷贝的临时壳上切到当前条目、entryOnly 摘出
       单条目文本——不碰 base 本身，后面 applyReload 还要用它的整份骨架 */
    const wantKey = p.key;
    let diskText;
    try {
      const tmp = JSON.parse(JSON.stringify(base));
      if (tmp.key !== wantKey) {
        /* entryKeys 只列 others 里的条目，下标与 raw.others 一一对应 */
        const oi = MM_IMPORT.entryKeys(tmp).indexOf(wantKey);
        if (oi >= 0) await MM_IMPORT.switchEntry(tmp, oi);
      }
      diskText = MM_IMPORT.entryOnly(tmp);
    } catch (e) { diskText = r.text; }
    showDiffModal(currentYaml(), diskText, function (apply) {
      if (!apply) { toast("已取消，保留本地修改"); return; }
      applyReload(p, r, base, wantKey);
    });
  }

  /* diff 确认后真正覆盖：p.raw 拿磁盘整份骨架（未切过），数据切到原来编辑的条目 */
  async function applyReload(p, r, base, wantKey) {
    p.raw = base.raw;
    const tmp = JSON.parse(JSON.stringify(base));
    if (tmp.key !== wantKey) {
      const oi = MM_IMPORT.entryKeys(tmp).indexOf(wantKey);
      if (oi >= 0) {
        const back = await MM_IMPORT.switchEntry(tmp, oi);
        if (!back.ok) toast("原条目在磁盘上已不存在，已切回第一个条目");
      }
    }
    p.key = tmp.key;
    p.data = tmp.data;
    p.mtime = r.mtime;
    refresh(true);
    toast("已从磁盘重新读取「" + p.key + "」");
  }

  /* 多条目文件：切到另一个条目（当前条目会原样写回 others，保存时不丢） */
  async function switchEntry(idx) {
    const p = MM_STATE.current();
    if (!p) return;
    const r = await MM_IMPORT.switchEntry(p, idx);
    if (!r.ok) { toast(r.reason || "切换失败"); return; }
    refresh(true);
    $("editor").scrollTop = 0;
    toast("已切到条目「" + r.key + "」");
  }

  /* 「更多类型」下拉：9 种通用配置类型直接按字段表生成按钮 */
  function buildNewMenu() {
    const box = $("newMoreMenu");
    if (!box) return;
    box.innerHTML = "";
    const types = (window.MM_SPEC && MM_SPEC.allTypes()) || [];
    types.forEach(function (t) {
      const b = document.createElement("button");
      b.className = "dropdown-item";
      b.type = "button";
      b.dataset.kind = t.kind;
      b.innerHTML = '<span class="di-ico"></span><span class="di-t"></span><span class="di-d"></span>';
      b.querySelector(".di-ico").innerHTML = MM_ICONS.get(t.icon || "file", 14);
      b.querySelector(".di-t").textContent = t.title;
      b.querySelector(".di-d").textContent = t.dir + "/";
      b.addEventListener("click", function () {
        $("newMore").open = false;
        newProject(t.kind);
      });
      box.appendChild(b);
    });
  }

  function useTemplate(id, custom) {
    if (custom) {
      const ct = MM_STATE.customTemplates().find(function (x) { return x.id === id; });
      if (!ct) return null;
      const cp = MM_STATE.buildCustom(ct);
      MM_UI.renderEditor($("editor"), cp);
      refresh();
      $("editor").scrollTop = 0;
      toast("已从模板创建：" + ct.name);
      return cp;
    }
    const t = MM_STATE.templates.find(function (x) { return x.id === id; });
    if (!t) return null;
    const p = MM_STATE.add(t.build());
    MM_UI.renderEditor($("editor"), p);
    refresh();
    $("editor").scrollTop = 0;
    toast("已从模板创建：" + t.name);
    return p;
  }

  function download() {
    // Electron 壳里用系统保存对话框 + 直接写文件
    if (window.MM_HOST_SAVE) { window.MM_HOST_SAVE(); return; }
    const p = MM_STATE.current();
    if (!p) { toast("先新建一个作品"); return; }
    const issues = MM_YAML.validate(p);
    if (issues.length) {
      toast("还有 " + issues.length + " 项必填内容没填");
      return;
    }
    let name = (p.key || "my_config").replace(/[^A-Za-z0-9_\-]/g, "_");
    const text = currentYaml();
    const blob = new Blob([text], { type: "text/yaml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + ".yml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("已下载 " + name + ".yml");
  }

  function copy() {
    const text = currentYaml();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); toast("已复制到剪贴板"); }
      catch (e) { toast("复制失败，请手动选中右侧文本"); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("已复制到剪贴板"); }, fallback);
    } else fallback();
  }

  /* 0.13.0：克隆 / 自定义模板 / 撤销重做 */
  function cloneProject() {
    const p = MM_STATE.current();
    if (!p) { toast("先新建一个作品"); return; }
    const np = MM_STATE.clone(p.id);
    if (!np) return;
    MM_UI.renderEditor($("editor"), np);
    refresh();
    toast("已克隆为「" + np.key + "」（保存时会另存新文件）");
  }

  function saveAsTemplate() {
    const p = MM_STATE.current();
    if (!p) { toast("先新建一个作品"); return; }
    const name = window.prompt("模板名字（会出现在左侧模板列表里）：", plainName(p) || p.key);
    if (name === null) return;   /* 取消 */
    MM_STATE.saveCustomTemplate(name, p);
    MM_UI.renderTemplates($("templateList"), useTemplate, removeTemplate);
    toast("已存为模板「" + name + "」");
  }

  function removeTemplate(id) {
    if (!window.confirm("删除这个自定义模板？（不影响已经创建的项目）")) return;
    MM_STATE.removeCustomTemplate(id);
    MM_UI.renderTemplates($("templateList"), useTemplate, removeTemplate);
    toast("模板已删除");
  }

  /* 0.17.0：模板导出 / 导入（换机器或分享给同服朋友） */
  async function exportTemplate(id) {
    const t = MM_STATE.customTemplates().find(function (x) { return x.id === id; });
    if (!t) return;
    const data = JSON.stringify(t, null, 2);
    const fname = "模板-" + t.name + ".json";
    if (window.MM_HOST && MM_HOST.isElectron) {
      const p = await MM_HOST.saveAs(fname);
      if (!p) return;
      await MM_HOST.write(p, data);
      toast("模板已导出到 " + p);
    } else {
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("模板已导出");
    }
  }

  async function importTemplate() {
    let text = null;
    if (window.MM_HOST && MM_HOST.isElectron && MM_HOST_OPEN_JSON) {
      const p = await MM_HOST_OPEN_JSON();
      if (!p) return;
      text = (await MM_HOST.read(p)).text;
    } else {
      text = await new Promise(function (resolve) {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = ".json,application/json";
        inp.onchange = function () {
          const f = inp.files[0];
          if (!f) return resolve(null);
          const r = new FileReader();
          r.onload = function () { resolve(r.result); };
          r.readAsText(f);
        };
        inp.click();
      });
      if (!text) return;
    }
    try {
      const o = JSON.parse(text);
      MM_STATE.addCustomTemplate(o);
      MM_UI.renderTemplates($("templateList"), useTemplate, removeTemplate);
      toast("已导入模板「" + o.name + "」");
    } catch (e) {
      toast("导入失败：" + e.message);
    }
  }

  function plainName(p) {
    return String(p.data.display || "").replace(/&[0-9a-fk-or]/gi, "").trim();
  }

  function doUndo() {
    if (MM_STATE.undo()) { refresh(true); toast("已撤销（Ctrl+Y 恢复）"); }
    else toast("没有可撤销的改动");
  }
  function doRedo() {
    if (MM_STATE.redo()) { refresh(true); toast("已重做"); }
    else toast("没有可重做的改动");
  }

  /* 0.14.0：全局搜索——已打开的项目 + 服务器文件内容 */
  let gsTimer = null;
  function gsEl(tag, attrs) {
    const n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      const v = attrs[k];
      if (v === undefined || v === null) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "onclick") n.addEventListener("click", v);
    });
    return n;
  }
  function gsInit() {
    const box = $("gsearch");
    const input = $("gsearchInput");
    const pop = $("gsearchPop");
    if (!box || !input) return;

    function close() { pop.hidden = true; }

    function row(title, sub, onclick) {
      const n = gsEl("div", { class: "gs-item", onclick: onclick });
      n.appendChild(gsEl("div", { class: "gs-t", text: title }));
      n.appendChild(gsEl("div", { class: "gs-s", text: sub }));
      return n;
    }

    function render(projects, files) {
      pop.innerHTML = "";
      if (projects.length) {
        pop.appendChild(gsEl("div", { class: "gs-group", text: "我的项目" }));
        projects.forEach(function (p) {
          pop.appendChild(row(plainName(p) || p.key, p.key, function () {
            close(); input.value = "";
            MM_STATE.select(p.id);
            MM_UI.renderEditor($("editor"), p);
            refresh(true);
          }));
        });
      }
      if (files.length) {
        pop.appendChild(gsEl("div", { class: "gs-group", text: "服务器文件" }));
        files.forEach(function (f) {
          pop.appendChild(row(f.name + " · 第 " + f.line + " 行", f.snippet, function () {
            close(); input.value = "";
            if (window.MM_HOST_OPEN_FILE) MM_HOST_OPEN_FILE(f);
          }));
        });
      }
      if (!projects.length && !files.length) {
        pop.appendChild(gsEl("div", { class: "gs-empty", text: "没有匹配的配置。" }));
      }
      pop.hidden = false;
    }

    input.addEventListener("input", function () {
      if (gsTimer) clearTimeout(gsTimer);
      const term = input.value.trim();
      if (term.length < 2) { close(); return; }
      gsTimer = setTimeout(async function () {
        /* 已打开的项目：搜它们生成的 YAML */
        const projects = MM_STATE.all().filter(function (p) {
          try {
            return MM_YAML.generate(p).toLowerCase().indexOf(term.toLowerCase()) >= 0;
          } catch (e) { return false; }
        }).slice(0, 8);
        /* 服务器文件：桌面版才有 */
        let files = [];
        if (window.MM_HOST_SEARCH_FILES) {
          try { files = (await MM_HOST_SEARCH_FILES(term)).slice(0, 20); }
          catch (e) { files = []; }
        }
        render(projects, files);
      }, 300);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); input.blur(); }
      if (e.key === "Enter") {
        const first = pop.querySelector(".gs-item");
        if (first) first.click();
      }
    });
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) close();
    });
  }

  /* 0.15.0：引用关系图——三列布局（怪物 / 技能组 / 掉落表），SVG 贝塞尔连线 */
  const COL = { mob: { title: "怪物", x: 0.16 }, skill: { title: "技能组", x: 0.5 }, droptable: { title: "掉落表", x: 0.84 } };
  const GS = { nodeH: 26, gap: 8, colW: 150 };

  async function openGraph() {
    const modal = $("graphModal");
    const body = $("graphBody");
    const stat = $("graphStat");
    modal.hidden = false;
    body.innerHTML = '<div class="gs-empty">正在读取服务器配置…</div>';

    let g = null;
    if (window.MM_HOST_BUILD_GRAPH) {
      try { g = await MM_HOST_BUILD_GRAPH(); } catch (e) { g = null; }
    }
    if (!g || !g.nodes.length) {
      /* 纯浏览器或没有文件：用已打开的项目兜底构图 */
      g = projectGraph();
      if (!g.nodes.length) {
        body.innerHTML = '<div class="gs-empty">还没有可画的配置：先打开服务器文件夹，或新建几个互相引用的怪物 / 技能组 / 掉落表。</div>';
        stat.textContent = "";
        return;
      }
    }
    /* 循环引用检测（0.16.0）：技能组互相引用成环会让服务端递归卡死 */
    let cycles = [];
    if (window.MM_HOST_FIND_CYCLES) {
      try { cycles = MM_HOST_FIND_CYCLES(g.nodes, g.edges) || []; } catch (e) { cycles = []; }
    }
    drawGraph(g, body, stat);
    if (cycles.length) {
      const warn = document.createElement("div");
      warn.className = "graph-cycles";
      warn.innerHTML = "<b>发现 " + cycles.length + " 处循环引用（服务端会一直递归，直到卡死）：</b><br>" +
        cycles.slice(0, 6).map(function (c) {
          return "↻ " + c.map(function (n) { return n.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }).join(" → ");
        }).join("<br>");
      body.insertBefore(warn, body.firstChild);
    }
  }

  /* 用已打开项目构建同结构图（无文件系统时的降级） */
  function projectGraph() {
    const nodes = [], edges = [], known = {};
    MM_STATE.all().forEach(function (p) {
      if (p.kind === "skill" || p.kind === "droptable") {
        known[p.key.toLowerCase()] = { id: "p:" + p.id, kind: p.kind, name: p.key, path: "p:" + p.id };
      }
    });
    MM_STATE.all().forEach(function (p) {
      if (p.kind !== "mob" && p.kind !== "skill" && p.kind !== "droptable") return;
      const self = { id: "p:" + p.id, kind: p.kind, name: p.key, path: "p:" + p.id };
      nodes.push(self);
      let text = "";
      try { text = MM_YAML.generate(p); } catch (e) { return; }
      const skills = {};
      let m; const re = /(?:skill|metaskill)\s*\{[^}]*\b(?:s|skill|name)\s*=\s*['"]?([\w\-]+)/gi;
      while ((m = re.exec(text))) skills[m[1].toLowerCase()] = m[1];
      const re2 = /\btable\s*[:=]\s*['"]?([\w\-]+)/gi;
      while ((m = re2.exec(text))) {
        const t = known[m[1].toLowerCase()];
        if (t && t.path !== self.id) edges.push({ from: self.id, to: t.path, kind: "table" });
      }
      Object.keys(skills).forEach(function (low) {
        const t = known[low];
        if (t && t.path !== self.id) edges.push({ from: self.id, to: t.path, kind: "skill" });
      });
    });
    const linked = {};
    edges.forEach(function (e) { linked[e.from] = linked[e.to] = true; });
    return { nodes: nodes.filter(n => linked[n.id]), edges: edges, skipped: 0 };
  }

  function drawGraph(g, body, stat) {
    const cols = { mob: [], skill: [], droptable: [] };
    g.nodes.forEach(function (n) { (cols[n.kind] || (cols[n.kind] = [])).push(n); });
    Object.keys(cols).forEach(function (k) {
      cols[k].sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    });
    const maxRows = Math.max(cols.mob.length, cols.skill.length, cols.droptable.length, 1);
    const W = 900, H = Math.max(maxRows * (GS.nodeH + GS.gap) + 60, 160);
    stat.textContent = cols.mob.length + " 怪物 · " + cols.skill.length + " 技能组 · " +
      cols.droptable.length + " 掉落表 · " + g.edges.length + " 条引用" +
      (g.skipped ? "（另有 " + g.skipped + " 个无关联配置未画）" : "");

    const nodeById = {};
    g.nodes.forEach(function (n) { nodeById[n.id] = n; });
    /* 每列内编号 → 坐标 */
    function pos(n) {
      const col = cols[n.kind];
      const i = col.findIndex(function (x) { return x.id === n.id; });
      const cx = COL[n.kind].x * W;
      const startY = (H - col.length * (GS.nodeH + GS.gap)) / 2 + GS.nodeH / 2;
      return { x: cx, y: startY + i * (GS.nodeH + GS.gap) };
    }

    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="graph-svg" xmlns="http://www.w3.org/2000/svg">';
    Object.keys(COL).forEach(function (k) {
      svg += '<text x="' + (COL[k].x * W) + '" y="16" text-anchor="middle" class="graph-col">' + COL[k].title + '</text>';
    });
    g.edges.forEach(function (e, i) {
      const a = pos(nodeById[e.from]), b = pos(nodeById[e.to]);
      if (!a || !b) return;
      const x1 = a.x + GS.colW / 2, y1 = a.y;
      const x2 = b.x - GS.colW / 2, y2 = b.y;
      const mid = (x1 + x2) / 2;
      svg += '<path class="graph-edge e-' + e.kind + '" data-i="' + i +
        '" d="M' + x1 + ' ' + y1 + ' C ' + mid + ' ' + y1 + ', ' + mid + ' ' + y2 + ', ' + x2 + ' ' + y2 + '"/>';
    });
    g.nodes.forEach(function (n) {
      const p = pos(n);
      const cls = n.kind === "mob" ? "n-mob" : n.kind === "skill" ? "n-skill" : "n-table";
      const title = (n.name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
      svg += '<g class="graph-node ' + cls + '" data-id="' + n.id.replace(/"/g, "&quot;") + '">' +
        '<rect x="' + (p.x - GS.colW / 2) + '" y="' + (p.y - GS.nodeH / 2) + '" width="' + GS.colW +
        '" height="' + GS.nodeH + '" rx="6"/>' +
        '<text x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle">' + title + '</text></g>';
    });
    svg += '</svg>';

    body.innerHTML = svg;
    /* 点节点打开文件（项目节点无 path 前缀的才是文件） */
    body.querySelectorAll(".graph-node").forEach(function (gn) {
      gn.addEventListener("click", function () {
        const id = gn.getAttribute("data-id");
        if (id.indexOf("p:") === 0) return;
        const n = g.nodes.find(function (x) { return x.id === id; });
        if (n && window.MM_HOST_OPEN_FILE) {
          MM_HOST_OPEN_FILE({ path: n.path, name: n.name, kind: n.kind, rel: n.name, size: 0, mtime: 0 });
          $("graphModal").hidden = true;
        }
      });
      gn.addEventListener("mouseenter", function () {
        const id = gn.getAttribute("data-id");
        body.querySelectorAll(".graph-edge").forEach(function (edge) {
          edge.classList.toggle("hot", false);
        });
        g.edges.forEach(function (e, i) {
          if (e.from === id || e.to === id) {
            const el = body.querySelector('.graph-edge[data-i="' + i + '"]');
            if (el) el.classList.add("hot");
          }
        });
      });
    });
    body.addEventListener("mouseleave", function () {
      body.querySelectorAll(".graph-edge.hot").forEach(function (edge) { edge.classList.remove("hot"); });
    });
  }

  /* 0.16.0：主题切换（默认浅色，深色记住偏好） */
  function themeInit() {
    const btn = $("btnTheme");
    if (!btn) return;
    let theme = "light";
    try { theme = localStorage.getItem("mm_theme") === "dark" ? "dark" : "light"; } catch (e) { /* 忽略 */ }
    apply();
    btn.addEventListener("click", function () {
      theme = theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("mm_theme", theme); } catch (e) { /* 忽略 */ }
      apply();
    });
    function apply() {
      document.documentElement.dataset.theme = theme;
      $("themeSun").hidden = theme === "dark";
      $("themeMoon").hidden = theme !== "dark";
    }
  }

  /* 0.16.0：启动时恢复上次打开的服务器目录 */
  function restoreLastDir() {
    if (!window.MM_HOST || !MM_HOST.isElectron) return;
    let dir = null;
    try { dir = localStorage.getItem("mm_last_dir"); } catch (e) { /* 忽略 */ }
    if (!dir) return;
    MM_HOST_OPEN_DIR(dir).then(function (n) {
      if (n) toast("已恢复上次打开的目录（" + n + " 个文件）");
    }).catch(function () { /* 目录没了就静默 */ });
  }

  /* 0.16.0：把没有 filePath 的项目（克隆 / 模板新建）落盘成服务器新文件 */
  const KIND_DIR = {
    mob: "Mobs", item: "Items", skill: "Skills", droptable: "Drops",
    spawner: "Spawners", randomspawn: "RandomSpawns", menu: "Menus",
    dialog: "Dialogs", cinematic: "Cutscenes", vanillaoverride: "VanillaMobs"
  };
  async function saveToServer() {
    const p = MM_STATE.current();
    if (!p) { toast("先选一个项目"); return; }
    const root = window.MM_HOST_ROOT && MM_HOST_ROOT();
    if (!root) { toast("先打开服务器文件夹"); return; }
    const dir = KIND_DIR[p.kind];
    if (!dir) { toast("这种类型（" + p.kind + "）没有独立目录，请用「下载 .yml」手动放置"); return; }
    const target = root.replace(/[\\/]+$/, "") + "/" + dir + "/" + p.key + ".yml";
    try {
      const r = await MM_HOST.write(target, currentYaml());
      p.filePath = r.file;
      p.rel = dir + "/" + p.key + ".yml";
      try { const st = await MM_HOST.read(r.file); p.mtime = st.mtime; } catch (e) { /* 无碍 */ }
      MM_STATE.touch();
      refresh(true);
      toast("已保存到 " + dir + "/" + p.key + ".yml" + (r.backup ? "（覆盖前已备份）" : ""));
    } catch (e) {
      toast("保存失败：" + e.message);
    }
  }

  /* 0.16.0：清理旧备份（保留最近 5 份） */
  async function cleanBackups() {
    const root = window.MM_HOST_ROOT && MM_HOST_ROOT();
    if (!root) { toast("先打开服务器文件夹"); return; }
    let list = [];
    try { list = await MM_HOST_BACKUPS(root); } catch (e) { list = []; }
    if (!list.length) { toast("没有找到任何 .bak 备份，很干净"); return; }
    const keep = Math.max(0, 5);
    const toDelete = list.slice(0, Math.max(0, list.length - keep));
    if (!toDelete.length) { toast("共 " + list.length + " 份备份，都在最近 5 份内，不用清理"); return; }
    if (!window.confirm("找到 " + list.length + " 份备份。将删除最旧的 " + toDelete.length +
      " 份（保留最近 " + keep + " 份），确定吗？")) return;
    const n = await MM_HOST_DELETE_FILES(toDelete.map(function (b) { return b.path; }));
    toast("已删除 " + n + " 份旧备份");
  }

  /* 0.16.0：占位符速查（帮助弹层里，点击复制） */
  const PH_GROUPS = [
    { g: "触发者（谁触发了技能）", items: [
      ["<trigger.name>", "触发者名字"], ["<trigger.health>", "触发者当前血量"],
      ["<trigger.uuid>", "触发者 UUID"], ["<trigger.display>", "触发者显示名"],
      ["<trigger.stance>", "触发者站姿（站/蹲/游）"]
    ] },
    { g: "施法者（放技能的怪）", items: [
      ["<caster.name>", "施法者名字"], ["<caster.health>", "施法者当前血量"],
      ["<caster.maxhealth>", "施法者最大血量"], ["<caster.l.x>", "施法者 X 坐标"],
      ["<caster.l.y>", "施法者 Y 坐标"], ["<caster.l.z>", "施法者 Z 坐标"],
      ["<caster.hp.full>", "满血时的血量"]
    ] },
    { g: "目标（技能作用的对象）", items: [
      ["<target.name>", "目标名字"], ["<target.health>", "目标当前血量"],
      ["<target.uuid>", "目标 UUID"], ["<target.threat>", "目标对施法者的仇恨值"]
    ] },
    { g: "通用", items: [
      ["<skill.var.名称>", "技能变量"], ["<skill.vardiff.名称>", "技能变量变化量"],
      ["<global.var.名称>", "全局变量"], ["<random.1to5>", "1~5 随机数"],
      ["<random.amount>", "0~100 随机数"]
    ] }
  ];
  function phInit() {
    const list = $("phList");
    if (!list) return;
    PH_GROUPS.forEach(function (grp) {
      const t = document.createElement("div");
      t.className = "ph-group";
      t.textContent = grp.g;
      list.appendChild(t);
      grp.items.forEach(function (item) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "ph-row";
        row.title = "点击复制";
        row.innerHTML = '<code>' + item[0].replace(/</g, "&lt;") + '</code><span>' + item[1] + "</span>";
        row.addEventListener("click", function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(item[0]).then(function () { toast("已复制 " + item[0]); }, function () { /* 忽略 */ });
          }
        });
        list.appendChild(row);
      });
    });
  }

  /* 0.18.0：行级 diff（LCS 简化版：剥共同前后缀，中段小规模才做 DP） */
  function diffLines(oldText, newText) {
    const A = String(oldText || "").split("\n");
    const B = String(newText || "").split("\n");
    const out = [];
    let pre = 0;
    while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++;
    let sufA = A.length - 1, sufB = B.length - 1;
    while (sufA >= pre && sufB >= pre && A[sufA] === B[sufB]) { sufA--; sufB--; }
    for (let i = 0; i < pre; i++) out.push({ t: " ", s: A[i] });
    const midA = A.slice(pre, sufA + 1), midB = B.slice(pre, sufB + 1);
    if (midA.length * midB.length <= 640000) {
      /* LCS DP */
      const n = midA.length, m = midB.length;
      const dp = new Array((n + 1) * (m + 1)).fill(0);
      for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--)
          dp[i * (m + 1) + j] = midA[i] === midB[j]
            ? dp[(i + 1) * (m + 1) + j + 1] + 1
            : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (midA[i] === midB[j]) { out.push({ t: " ", s: midA[i] }); i++; j++; }
        else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) { out.push({ t: "-", s: midA[i] }); i++; }
        else { out.push({ t: "+", s: midB[j] }); j++; }
      }
      while (i < n) { out.push({ t: "-", s: midA[i] }); i++; }
      while (j < m) { out.push({ t: "+", s: midB[j] }); j++; }
    } else {
      midA.forEach(function (s) { out.push({ t: "-", s: s }); });
      midB.forEach(function (s) { out.push({ t: "+", s: s }); });
    }
    for (let i = sufA + 1; i < A.length; i++) out.push({ t: " ", s: A[i] });
    return out;
  }

  /* 0.18.0：重新读取的确认弹层——先看「磁盘 vs 本地」差异再决定覆盖 */
  function showDiffModal(curText, diskText, onDone) {
    let modal = $("diffModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "diffModal";
      modal.className = "modal";
      modal.innerHTML = '<div class="modal-box diff-box"><div class="modal-head"><h2>磁盘 vs 本地</h2>' +
        '<span class="diff-legend"><i class="dl-del"></i>本地将被丢弃 <i class="dl-add"></i>磁盘上的新内容</span>' +
        '<button class="modal-close" title="关闭">✕</button></div>' +
        '<div class="diff-body"></div>' +
        '<div class="diff-actions"><button class="btn dark" data-act="cancel">取消（保留本地）</button>' +
        '<button class="btn" data-act="apply">应用（覆盖本地）</button></div></div>';
      document.body.appendChild(modal);
    }
    const body = modal.querySelector(".diff-body");
    const rows = diffLines(curText, diskText);
    let adds = 0, dels = 0;
    body.innerHTML = rows.map(function (r) {
      if (r.t === "+") adds++;
      if (r.t === "-") dels++;
      const cls = r.t === "+" ? "l-add" : r.t === "-" ? "l-del" : "l-ctx";
      return '<div class="diff-line ' + cls + '">' +
        '<span class="diff-mark">' + (r.t === "+" ? "+" : r.t === "-" ? "-" : " ") + "</span>" +
        '<code>' + String(r.s).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</code></div>";
    }).join("");
    modal.querySelector(".diff-legend").innerHTML =
      '<i class="dl-del"></i>本地将被丢弃（' + dels + " 行） <i class='dl-add'></i>磁盘新内容（" + adds + " 行）";
    modal.hidden = false;
    modal.querySelector("[data-act=apply]").onclick = function () { modal.hidden = true; onDone(true); };
    modal.querySelector("[data-act=cancel]").onclick = function () { modal.hidden = true; onDone(false); };
    modal.querySelector(".modal-close").onclick = function () { modal.hidden = true; onDone(false); };
  }

  /* 0.18.0：批量编辑（带预览）——按类型选文件，数值字段统一调整 */
  function showBatchModal() {
    if (!window.MM_HOST_ROOT || !MM_HOST_ROOT()) { toast("先打开服务器文件夹"); return; }
    let modal = $("batchModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "batchModal";
      modal.className = "modal";
      modal.innerHTML = '<div class="modal-box diff-box"><div class="modal-head"><h2>批量编辑</h2>' +
        '<button class="modal-close" title="关闭">✕</button></div>' +
        '<div class="batch-form"></div><div class="batch-preview"></div>' +
        '<div class="diff-actions"><button class="btn dark" data-act="cancel">取消</button>' +
        '<button class="btn" data-act="run" disabled>应用（写回并备份）</button></div></div>';
      document.body.appendChild(modal);
    }
    const form = modal.querySelector(".batch-form");
    const preview = modal.querySelector(".batch-preview");
    const runBtn = modal.querySelector("[data-act=run]");
    const kinds = [
      { id: "mob", zh: "怪物" }, { id: "item", zh: "物品" },
      { id: "skill", zh: "技能组" }, { id: "droptable", zh: "掉落表" }
    ];
    form.innerHTML =
      '<div class="batch-row"><span class="batch-label">类型</span>' +
      kinds.map(k => '<label class="batch-chk"><input type="checkbox" value="' + k.id + '" checked> ' + k.zh + "</label>").join("") +
      '</div>' +
      '<div class="batch-row"><span class="batch-label">字段</span>' +
      '<select id="batchField"><option value="health">血量 Health</option><option value="damage">伤害 Damage</option>' +
      '<option value="armor">护甲 Armor</option><option value="level">等级 Level</option></select></div>' +
      '<div class="batch-row"><span class="batch-label">操作</span>' +
      '<select id="batchOp"><option value="mul">×（乘）</option><option value="add">+（加）</option><option value="set">=（设为）</option></select>' +
      '<input id="batchVal" type="text" placeholder="例如 1.1 或 20" style="width:110px;margin-left:8px"></div>' +
      '<div class="batch-hint">只改有该字段的配置；写回前每份自动备份。预览确认后才动手。</div>';

    let pending = [];
    function collect() {
      preview.innerHTML = '<div class="gs-empty">点「预览」查看将发生的改动。</div>';
      runBtn.disabled = true;
    }
    collect();

    async function doPreview() {
      const want = [...form.querySelectorAll(".batch-chk input:checked")].map(x => x.value);
      const field = form.querySelector("#batchField").value;
      const op = form.querySelector("#batchOp").value;
      const val = parseFloat(form.querySelector("#batchVal").value);
      preview.innerHTML = '<div class="gs-empty">正在读取与计算…</div>';
      if (isNaN(val)) { preview.innerHTML = '<div class="gs-empty">请先填一个数字。</div>'; return; }
      pending = [];
      let lines = "";
      for (const f of (window.MM_HOST_SEARCH_FILES ? await MM_HOST.searchFilesForKinds ? [] : [] : [])) { break; }
      const list = (await collectFilesByKinds(want)).filter(function (f) { return !!f; });
      for (const f of list) {
        try {
          const rp = await MM_HOST.readParsed(f.path);
          const shell = { kind: f.kind, key: guessKeyFromText(rp.text) || f.name.replace(/\.yml$/i, ""), data: {}, raw: { head: [], entry: [], others: [], options: [] } };
          try { MM_IMPORT.fill(shell, rp); } catch (e) { continue; }
          const d = shell.data;
          if (d[field] === undefined || d[field] === null || d[field] === "") continue;
          const oldV = parseFloat(d[field]);
          if (isNaN(oldV)) continue;
          const newV = op === "mul" ? oldV * val : op === "add" ? oldV + val : val;
          const newVr = Math.round(newV * 100) / 100;
          if (newVr === oldV) continue;
          d[field] = newVr;
          const gen = MM_YAML.generate(shell);
          pending.push({ path: f.path, rel: f.rel, name: f.name, kind: f.kind, key: shell.key, text: gen,
            summary: field + " " + oldV + " → " + newVr });
          lines += '<div class="batch-file"><b>' + f.name + "</b> — " + field + " " + oldV + " → " + newVr + "</div>";
        } catch (e) { /* 单文件失败跳过 */ }
      }
      preview.innerHTML = lines || '<div class="gs-empty">范围内没有带这个字段的配置。</div>';
      runBtn.disabled = !pending.length;
      runBtn.textContent = "应用（" + pending.length + " 份，写回并备份）";
    }

    async function collectFilesByKinds(want) {
      const scan = await MM_HOST.scan(MM_HOST_ROOT());
      return scan.files.filter(function (f) { return want.indexOf(f.kind) >= 0; });
    }
    function guessKeyFromText(text) {
      const m = String(text || "").match(/^([A-Za-z_][\w\-]*):/m);
      return m ? m[1] : null;
    }

    runBtn.onclick = async function () {
      if (!pending.length) return;
      if (!window.confirm("将写回 " + pending.length + " 份文件（覆盖前自动备份），确定吗？")) return;
      let n = 0;
      for (const it of pending) {
        try { await MM_HOST.write(it.path, it.text); n++; }
        catch (e) { /* 单份失败继续 */ }
      }
      modal.hidden = true;
      toast("批量编辑完成：写回 " + n + " 份（各留备份）。重新扫描后生效");
      const dir = MM_HOST_ROOT();
      await MM_HOST_OPEN_DIR(dir);
    };
    modal.querySelector(".modal-close").onclick = function () { modal.hidden = true; };
    modal.querySelector("[data-act=cancel]").onclick = function () { modal.hidden = true; };
    modal.querySelector("[data-act=run]").disabled = true;
    const oldPreview = modal.querySelector("[data-act=preview]");
    if (!oldPreview) {
      const pb = document.createElement("button");
      pb.className = "btn dark";
      pb.textContent = "预览";
      pb.setAttribute("data-act", "preview");
      pb.addEventListener("click", doPreview);
      modal.querySelector(".diff-actions").insertBefore(pb, runBtn);
    }
    modal.hidden = false;
  }

  /* 0.19.0：变量管理——扫 var= 定义、全局重命名（写回自动备份） */
  async function openVars() {
    if (!window.MM_HOST_SCAN_VARS) { toast("变量管理需要桌面版（要读服务器文件）"); return; }
    let modal = $("varsModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "varsModal";
      modal.className = "modal";
      modal.innerHTML = '<div class="modal-box diff-box"><div class="modal-head"><h2>变量管理</h2>' +
        '<span class="diff-legend" id="varsStat"></span>' +
        '<button class="modal-close" title="关闭">✕</button></div>' +
        '<div class="vars-body" id="varsBody"></div></div>';
      document.body.appendChild(modal);
      modal.querySelector(".modal-close").onclick = function () { modal.hidden = true; };
      modal.addEventListener("click", function (e) { if (e.target === modal) modal.hidden = true; });
    }
    const body = modal.querySelector("#varsBody");
    const stat = modal.querySelector("#varsStat");
    modal.hidden = false;
    body.innerHTML = '<div class="gs-empty">正在扫描…</div>';
    const vars = await MM_HOST_SCAN_VARS();
    stat.textContent = vars.length + " 个变量";
    body.innerHTML = "";
    if (!vars.length) {
      body.innerHTML = '<div class="gs-empty">还没扫到任何变量（技能里 var=xxx 的都会列在这里）。</div>';
      return;
    }
    vars.forEach(function (v) {
      const row = gsEl("div", { class: "vars-row" });
      row.appendChild(gsEl("code", { class: "vars-name", text: v.name }));
      row.appendChild(gsEl("span", { class: "vars-meta", text: v.hits + " 处 · " + v.files + " 个文件" }));
      const ren = gsEl("button", { class: "mini-btn", text: "重命名" });
      ren.addEventListener("click", async function () {
        const nn = window.prompt("把变量「" + v.name + "」重命名为：", v.name);
        if (!nn || nn === v.name) return;
        if (!/^[\w.]+$/.test(nn)) { toast("变量名只能用字母数字下划线和点"); return; }
        if (!window.confirm("将在 " + v.files + " 个文件里把 var=" + v.name + " 全部改成 var=" + nn +
          "（写回自动备份），确定吗？")) return;
        const n = await MM_HOST_RENAME_VAR(v.name, nn);
        toast("已改写 " + n + " 个文件");
        modal.hidden = true;
        await MM_HOST_OPEN_DIR(MM_HOST_ROOT());
      });
      row.appendChild(ren);
      body.appendChild(row);
    });
  }

  /* 0.19.0：配置包——当前项目 + 引用闭包打成一个 .json，导入时整体重建 */
  function refNamesOf(text) {
    const out = {};
    let m;
    const re = /(?:skill|metaskill)\s*\{[^}]*\b(?:s|skill|name)\s*=\s*['"]?([\w\-]+)/gi;
    while ((m = re.exec(text))) out[m[1].toLowerCase()] = m[1];
    const re2 = /\btable\s*[:=]\s*['"]?([\w\-]+)/gi;
    while ((m = re2.exec(text))) out[m[1].toLowerCase()] = m[1];
    return out;
  }
  async function exportBundle() {
    const start = MM_STATE.current();
    if (!start) { toast("先选一个项目"); return; }
    const byKey = {};
    MM_STATE.all().forEach(function (p) { byKey[p.key] = p; });
    const items = [], seen = {};
    const queue = [start];
    seen[start.key] = true;
    while (queue.length) {
      const p = queue.shift();
      let text = "";
      try { text = MM_YAML.generate(p); } catch (e) { /* 忽略 */ }
      items.push({ kind: p.kind, key: p.key, data: JSON.parse(JSON.stringify(p.data)),
        raw: JSON.parse(JSON.stringify(p.raw || {})) });
      const refs = refNamesOf(text);
      Object.keys(refs).forEach(function (low) {
        const t = byKey[refs[low]];
        if (t && !seen[t.key]) { seen[t.key] = true; queue.push(t); }
      });
    }
    const bundle = { type: "mmstudio-bundle", exported: new Date().toISOString(), items: items };
    const data = JSON.stringify(bundle, null, 2);
    const fname = "配置包-" + start.key + "-" + items.length + "项.json";
    if (window.MM_HOST && MM_HOST.isElectron) {
      const p = await MM_HOST.saveAs(fname);
      if (!p) return;
      await MM_HOST.write(p, data);
      toast("配置包已导出（" + items.length + " 个配置）");
    } else {
      const blob = new Blob([data], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("配置包已下载（" + items.length + " 个配置）");
    }
  }

  async function importBundle() {
    let text = null;
    if (window.MM_HOST && MM_HOST.isElectron && MM_HOST_OPEN_JSON) {
      const p = await MM_HOST_OPEN_JSON();
      if (!p) return;
      text = (await MM_HOST.read(p)).text;
    } else {
      text = await new Promise(function (resolve) {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = ".json,application/json";
        inp.onchange = function () {
          const f = inp.files[0];
          if (!f) return resolve(null);
          const r = new FileReader();
          r.onload = function () { resolve(r.result); };
          r.readAsText(f);
        };
        inp.click();
      });
      if (!text) return;
    }
    let bundle;
    try { bundle = JSON.parse(text); } catch (e) { toast("不是合法的 JSON 文件"); return; }
    if (bundle.type !== "mmstudio-bundle" || !Array.isArray(bundle.items)) {
      toast("这不是配置包文件（单个模板请用「导入」）");
      return;
    }
    /* key 冲突时给整包统一加前缀，并同步包内互相引用的名字 */
    const existing = {};
    MM_STATE.all().forEach(function (p) { existing[p.key] = true; });
    const keys = bundle.items.map(function (it) { return it.key; });
    const clash = keys.some(function (k) { return existing[k]; });
    let prefix = "";
    if (clash) {
      prefix = (bundle.items[0].key.split("_")[0] || "pack") + "_";
      while (keys.some(function (k) { return existing[prefix + k]; })) prefix = "i_" + prefix;
    }
    let last = null;
    bundle.items.forEach(function (it) {
      const key = prefix ? prefix + it.key : it.key;
      const p = { kind: it.kind, key: key, data: JSON.parse(JSON.stringify(it.data)),
        raw: JSON.parse(JSON.stringify(it.raw || {})) };
      last = MM_STATE.add(p);
    });
    if (prefix) {
      /* 包内互相引用的名字同步加前缀（替换生成文本里的引用 token） */
      MM_STATE.all().forEach(function (p) {
        if (!p.raw || keys.indexOf(p.key.replace(prefix, "")) < 0) return;
        bundle.items.forEach(function (it) {
          /* 无文本级替换——引用存在 data.skills.params.s 与 raw 文本两处，重建成本高，
             第一版策略：冲突时提示用户用「重命名」工具自己统一 */
        });
      });
      toast("已导入 " + bundle.items.length + " 个配置（加了前缀 " + prefix + "，包内引用如断开可用引用检查一键重建）");
    } else {
      toast("已导入 " + bundle.items.length + " 个配置");
    }
    MM_UI.renderEditor($("editor"), last);
    refresh(true);
  }

  function init() {

    MM_UI.init({
      onChange: function (rebuild) { refresh(!!rebuild); }
    });

    MM_STATE.load();

    // 便于分享/测试：index.html?tpl=boss 直接生成一个模板
    const q = new URLSearchParams(location.search.replace(/^\?/, ""));
    const tplId = q.get("tpl");
    if (tplId && MM_STATE.templates.some(function (t) { return t.id === tplId; })) {
      const t = MM_STATE.templates.find(function (x) { return x.id === tplId; });
      MM_STATE.add(t.build());
    }

    $("btnNewMob").addEventListener("click", function () { newProject("mob"); });
    $("btnNewItem").addEventListener("click", function () { newProject("item"); });
    $("btnNewSkill").addEventListener("click", function () { newProject("skill"); });
    $("btnNewDropTable").addEventListener("click", function () { newProject("droptable"); });
    buildNewMenu();
    gsInit();
    themeInit();
    phInit();
    $("btnCleanBak").addEventListener("click", cleanBackups);
    $("btnBatch").addEventListener("click", showBatchModal);
    $("btnVars").addEventListener("click", openVars);
    $("btnImportBundle").addEventListener("click", importBundle);
    $("btnCopy").addEventListener("click", copy);
    $("btnDownload").addEventListener("click", download);
    $("btnHelp").addEventListener("click", function () { $("helpModal").hidden = false; });
    $("btnGraph").addEventListener("click", openGraph);
    $("btnCloseGraph").addEventListener("click", function () { $("graphModal").hidden = true; });
    $("graphModal").addEventListener("click", function (e) {
      if (e.target === $("graphModal")) $("graphModal").hidden = true;
    });
    $("btnCloseHelp").addEventListener("click", function () { $("helpModal").hidden = true; });
    $("helpModal").addEventListener("click", function (e) {
      if (e.target === $("helpModal")) $("helpModal").hidden = true;
    });

    MM_UI.renderTemplates($("templateList"), useTemplate, removeTemplate);
    MM_UI.renderSidebar($("projectList"), selectProject, deleteProject);
    MM_UI.renderEditor($("editor"), MM_STATE.current());
    $("yamlOut").innerHTML = MM_YAML.highlight(currentYaml());
    renderWarnings(MM_YAML.validate(MM_STATE.current()));
    MM_STATE.baselineSnap();

    /* Ctrl+Z 撤销 / Ctrl+Y 或 Ctrl+Shift+Z 重做。
       焦点在输入框里时 Ctrl+Z 让浏览器自己撤销文本，不抢。 */
    document.addEventListener("keydown", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const tag = (document.activeElement || {}).tagName || "";
      const editing = tag === "INPUT" || tag === "TEXTAREA";
      if (editing && k === "z" && !e.shiftKey) return;
      e.preventDefault();
      if (k === "z" && !e.shiftKey) doUndo(); else doRedo();
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        download();
      }
      if (e.key === "Escape") $("helpModal").hidden = true;
    });

    // 给空状态里的按钮用
    window.MM_APP = { new: newProject, template: useTemplate, download: download, refresh: refresh, select: selectProject,
      reload: reloadFromDisk, switchEntry: switchEntry, clone: cloneProject, saveAsTemplate: saveAsTemplate,
      undo: doUndo, redo: doRedo, saveToServer: saveToServer, exportTemplate: exportTemplate, importTemplate: importTemplate,
      showBatchModal: showBatchModal, openVars: openVars, exportBundle: exportBundle, importBundle: importBundle };
    restoreLastDir();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

