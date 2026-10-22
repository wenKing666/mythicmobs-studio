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
     必填项缺失 = 拦截保存（红），引用检查 = 只提示（蓝），后者不挡保存 */
  function renderWarnings(issues, refs) {
    const box = $("yamlWarn");
    const dl = $("btnDownload");
    issues = issues || [];
    refs = refs || [];
    if (!issues.length && !refs.length) {
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

    function listHead(title, arr) {
      const head = document.createElement("b");
      head.textContent = title;
      box.appendChild(head);
      const ul = document.createElement("ul");
      arr.slice(0, 6).forEach(function (t) {
        const li = document.createElement("li");
        li.textContent = t;
        ul.appendChild(li);
      });
      if (arr.length > 6) {
        const li = document.createElement("li");
        li.textContent = "……还有 " + (arr.length - 6) + " 项";
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }

    if (issues.length) {
      listHead("还差 " + issues.length + " 项才能用：", issues);
      dl.disabled = true;
      dl.title = "先补全上面列出的必填项";
    } else {
      dl.disabled = false;
      dl.title = "";
    }
    if (refs.length) listHead("引用检查（不影响保存）：", refs);
  }

  function refresh(rebuild) {
    const p = MM_STATE.current();
    $("yamlOut").innerHTML = MM_YAML.highlight(currentYaml());
    renderWarnings(MM_YAML.validate(p), MM_YAML.refIssues(p));

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
    renderWarnings(MM_YAML.validate(MM_STATE.current()), MM_YAML.refIssues(MM_STATE.current()));
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

  function useTemplate(id) {    const t = MM_STATE.templates.find(function (x) { return x.id === id; });
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
    $("btnCopy").addEventListener("click", copy);
    $("btnDownload").addEventListener("click", download);
    $("btnHelp").addEventListener("click", function () { $("helpModal").hidden = false; });
    $("btnCloseHelp").addEventListener("click", function () { $("helpModal").hidden = true; });
    $("helpModal").addEventListener("click", function (e) {
      if (e.target === $("helpModal")) $("helpModal").hidden = true;
    });

    MM_UI.renderTemplates($("templateList"), useTemplate);
    MM_UI.renderSidebar($("projectList"), selectProject, deleteProject);
    MM_UI.renderEditor($("editor"), MM_STATE.current());
    $("yamlOut").innerHTML = MM_YAML.highlight(currentYaml());
    renderWarnings(MM_YAML.validate(MM_STATE.current()), MM_YAML.refIssues(MM_STATE.current()));

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        download();
      }
      if (e.key === "Escape") $("helpModal").hidden = true;
    });

    // 给空状态里的按钮用
    window.MM_APP = { new: newProject, template: useTemplate, download: download, refresh: refresh, select: selectProject };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

