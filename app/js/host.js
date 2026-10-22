/* Electron 壳里的文件系统功能：打开服务器目录、浏览文件、另存为
   在纯浏览器里打开时整段不生效（window.MM_HOST 不存在）。 */
(function () {
  "use strict";

  if (!window.MM_HOST || !window.MM_HOST.isElectron) return;

  const $ = function (id) { return document.getElementById(id); };
  let rootDir = "";
  let files = [];

  function toast(msg) {
    const t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function fmtSize(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }

  function renderFiles() {
    const box = $("serverFiles");
    box.innerHTML = "";
    if (!files.length) {
      box.appendChild(el("div", { class: "file-empty", text: "这个目录里没有 .yml 文件" }));
      return;
    }
    const mobs = files.filter(function (f) { return f.kind === "mob"; });
    const items = files.filter(function (f) { return f.kind === "item"; });
    const others = files.filter(function (f) { return f.kind !== "mob" && f.kind !== "item"; });

    function group(title, list) {
      if (!list.length) return;
      box.appendChild(el("div", { class: "file-group", text: title + " · " + list.length }));
      list.forEach(function (f) {
        box.appendChild(el("div", {
          class: "file-item",
          title: f.rel,
          onclick: function () { openFile(f); }
        }, [
          el("span", { class: "file-icon", html: MM_ICONS.get(f.kind === "mob" ? "skull" : f.kind === "item" ? "sword" : "file", 13) }),
          el("span", { class: "file-name", text: f.name }),
          el("span", { class: "file-size", text: fmtSize(f.size) })
        ]));
      });
    }

    group("怪物", mobs);
    group("物品", items);
    group("其他", others);
  }

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  async function openFolder() {
    try {
      const r = await MM_HOST.openFolder();
      if (!r) return;
      rootDir = r.dir;
      files = r.files;
      $("serverDir").textContent = rootDir;
      $("serverDir").title = rootDir;
      $("serverBlock").hidden = false;
      renderFiles();
      toast("已载入 " + files.length + " 个配置文件");
    } catch (e) {
      toast("打开失败：" + e.message);
    }
  }

  /* 点服务器文件：能解析就进表单编辑，解析不了退回只读预览 */
  async function openFile(f) {
    try {
      if (!MM_HOST.readParsed) {
        const old = await MM_HOST.read(f.path);
        showFileView(f, old, ["宿主没有解析接口，请重启编辑器"]);
        return;
      }
      const r = await MM_HOST.readParsed(f.path);
      if (r.errors && r.errors.length) {
        showFileView(f, r, r.errors);
        return;
      }
      const kind = (f.kind === "mob" || f.kind === "item") ? f.kind : MM_IMPORT.guessKind(r.js);

      const opened = MM_STATE.all().find(function (p) { return p.filePath === f.path; });
      if (opened) {
        MM_STATE.select(opened.id);
        MM_APP.refresh(true);
        toast("已切到「" + opened.key + "」，保存会写回原文件");
        return;
      }

      const base = kind === "mob" ? MM_STATE.newMob() : MM_STATE.newItem();
      const res = MM_IMPORT.fill(base, { js: r.js, text: r.text, filePath: f.path });
      if (!res.ok) {
        showFileView(f, r, [res.reason]);
        return;
      }
      MM_STATE.add(base);
      MM_APP.refresh(true);
      toast(res.warnings.length
        ? "已导入「" + res.key + "」：" + res.warnings.join("；")
        : "已导入「" + res.key + "」，改完保存会覆盖原文件（自动备份）");
    } catch (e) {
      toast("读取失败：" + e.message);
    }
  }

  function showFileView(f, r, errors) {
    const root = $("editor");
    root.innerHTML = "";
    root.scrollTop = 0;
    const why = (errors && errors.length) ? "　这个文件没能解析成表单（" + errors[0] + "），只能查看原文。" : "";
    root.appendChild(el("div", { class: "card" }, [
      el("div", { class: "card-head" }, [
        el("span", { class: "card-icon", html: MM_ICONS.get("file", 15) }),
        el("span", { text: f.name }),
        el("span", { class: "card-sub", text: fmtSize(r.size) + " · " + new Date(r.mtime).toLocaleString() })
      ]),
      el("div", { class: "card-body", style: "padding-left:16px" }, [
        el("div", { class: "file-note" }, [
          el("b", { text: "只读预览" }),
          document.createTextNode(why || "　这是服务器上的原始文件。编辑后保存会覆盖它（覆盖前自动备份）。")
        ]),
        el("div", { class: "file-path", text: f.path }),
        el("div", { class: "file-actions" }, [
          el("button", { class: "btn", onclick: function () { MM_HOST.reveal(f.path); } }, ["在资源管理器中显示"]),
          el("button", { class: "btn", onclick: function () { copyText(r.text); } }, ["复制全文"])
        ])
      ])
    ]));
    $("yamlOut").innerHTML = MM_YAML.highlight(r.text);
    $("yamlWarn").hidden = true;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("已复制"); }, function () {});
    }
  }

  /* ---------- 保存 ---------- */
  window.MM_HOST_SAVE = async function () {
    const p = MM_STATE.current();
    if (!p) { toast("先新建一个作品"); return true; }
    const issues = MM_YAML.validate(p);
    if (issues.length) { toast("还有 " + issues.length + " 项必填内容没填"); return true; }

    let target = p.filePath;
    if (!target) {
      target = await MM_HOST.saveAs((p.key || "my_config") + ".yml");
      if (!target) return true;
    }
    const text = MM_YAML.generate(p);
    try {
      const r = await MM_HOST.write(target, text);
      p.filePath = target;
      MM_STATE.save();
      toast(r.backup ? "已保存，原文件备份为 " + r.backup.split("\\").pop() : "已保存到 " + target);
    } catch (e) {
      toast("保存失败：" + e.message);
    }
    return true;
  };

  // 给测试/命令行用：直接打开某个目录，不弹对话框
  window.MM_HOST_OPEN_DIR = async function (dir) {
    const r = await MM_HOST.scan(dir);
    rootDir = r.dir;
    files = r.files;
    $("serverDir").textContent = rootDir;
    $("serverDir").title = rootDir;
    $("serverBlock").hidden = false;
    renderFiles();
    return files.length;
  };
  window.MM_HOST_OPEN_FILE = openFile;

  function init() {
    $("btnOpenFolder").hidden = false;
    $("btnOpenFolder").addEventListener("click", openFolder);
    $("projectList").addEventListener("click", function () {
      // 切回项目时不需要额外处理
    });
    // 显示版本
    MM_HOST.info().then(function (i) {
      const el = $("appVer");
      if (el) el.textContent = "0.2 · Electron " + i.electron;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
