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

  function refresh(rebuild) {
    const p = MM_STATE.current();
    $("yamlOut").innerHTML = MM_YAML.highlight(currentYaml());
    renderWarnings(MM_YAML.validate(p));

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

  /* 导入过的项目：丢掉本地改动，按磁盘上的最新内容重填表单 */
  async function reloadFromDisk() {
    const p = MM_STATE.current();
    if (!p || !p.filePath) { toast("这个项目不是从文件导入的"); return; }
    if (!window.MM_HOST || !MM_HOST.readParsed) { toast("纯浏览器模式没有文件系统"); return; }
    if (!window.confirm("从磁盘重新读取会丢掉这个项目里没保存的修改，继续？")) return;
    try {
      const r = await MM_HOST.readParsed(p.filePath);
      if (r.errors && r.errors.length) { toast("文件解析失败：" + r.errors[0]); return; }
      const sp = MM_SPEC && MM_SPEC.type(p.kind);
      const base = p.kind === "mob" ? MM_STATE.newMob()
        : p.kind === "skill" ? MM_STATE.newSkill()
        : p.kind === "droptable" ? MM_STATE.newDropTable()
        : sp ? MM_STATE.newSpecProject(p.kind)
        : MM_STATE.newItem();
      const res = MM_IMPORT.fill(base, { js: r.js, text: r.text, filePath: p.filePath });
      if (!res.ok) { toast(res.reason || "重新读取失败"); return; }
      /* 多条目文件：fill 只吃第一个条目；原来编辑的是第 N 个就切回第 N 个 */
      if (base.key !== p.key && MM_IMPORT.entryKeys(base).indexOf(p.key) >= 0) {
        const back = await MM_IMPORT.switchEntry(base, MM_IMPORT.entryKeys(base).indexOf(p.key));
        if (!back.ok) { toast("切回条目失败：" + back.reason); return; }
      }
      p.key = base.key;
      p.data = base.data;
      p.raw = base.raw;
      p.mtime = r.mtime;
      refresh(true);
      toast("已从磁盘重新读取「" + p.key + "」");
    } catch (e) {
      toast("读取失败：" + e.message);
    }
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
      if (!ct) return;
      const cp = MM_STATE.buildCustom(ct);
      MM_UI.renderEditor($("editor"), cp);
      refresh();
      $("editor").scrollTop = 0;
      toast("已从模板创建：" + ct.name);
      return;
    }
    const t = MM_STATE.templates.find(function (x) { return x.id === id; });
    if (!t) return;
    const p = MM_STATE.add(t.build());
    MM_UI.renderEditor($("editor"), p);
    refresh();
    $("editor").scrollTop = 0;
    toast("已从模板创建：" + t.name);
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
    $("btnCopy").addEventListener("click", copy);
    $("btnDownload").addEventListener("click", download);
    $("btnHelp").addEventListener("click", function () { $("helpModal").hidden = false; });
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
      undo: doUndo, redo: doRedo };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

