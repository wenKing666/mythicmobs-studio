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

  /* 扫到的文件建一份索引，yaml.js 的引用检查拿它判断 skill{s=xxx} / Drops 里的表名是否存在。
     值是文件信息（不再是 true），引用检查的「跳转」要拿它打开对应文件。
     只在扫过服务器目录时才有值，纯浏览器里 window.MM_REFS 一直是 undefined，引用检查自动跳过。 */
  function buildRefs() {
    const mk = function (kind) {
      const s = {};
      files.forEach(function (f) {
        if (f.kind !== kind) return;
        s[String(f.name).replace(/\.ya?ml$/i, "").toLowerCase()] = {
          path: f.path, rel: f.rel, name: f.name, kind: kind, size: f.size, mtime: f.mtime
        };
      });
      return s;
    };
    window.MM_REFS = { skills: mk("skill"), droptables: mk("droptable") };
  }

  /* 侧栏「服务器文件」的分组顺序与中文名 */
  const KIND_ORDER = ["mob", "skill", "item", "droptable", "spawner", "randomspawn",
    "menu", "dialog", "cinematic", "pin", "pack", "vanillaoverride", "stats"];
  const KIND_NAME = { mob: "怪物", skill: "技能组", item: "物品", droptable: "掉落表" };

  function kindTitle(kind) {
    if (KIND_NAME[kind]) return KIND_NAME[kind];
    const sp = window.MM_STATE && MM_STATE.specOf && MM_STATE.specOf(kind);
    return sp ? sp.title : "其他";
  }

  function kindIcon(f) {
    if (window.MM_UI && MM_UI.kindIcon) return MM_UI.kindIcon(f.kind);
    return "file";
  }

  function renderFiles() {
    const box = $("serverFiles");
    box.innerHTML = "";
    buildRefs();
    if (!files.length) {
      box.appendChild(el("div", { class: "file-empty", text: "这个目录里没有 .yml 文件" }));
      return;
    }

    function group(title, list) {
      if (!list.length) return;
      box.appendChild(el("div", { class: "file-group", text: title + " · " + list.length }));
      list.forEach(function (f) {
        /* 磁盘上的文件比打开时新了 → 在条目上标出来，点开后用「重新读取」拿最新内容 */
        const opened = (window.MM_STATE ? MM_STATE.all() : []).find(function (p) { return p.filePath === f.path; });
        const dirty = !!(opened && opened.mtime && f.mtime && f.mtime > opened.mtime + 1);
        box.appendChild(el("div", {
          class: "file-item" + (dirty ? " dirty" : ""),
          title: f.rel + (dirty ? "（磁盘上已被外部修改）" : ""),
          onclick: function () { openFile(f); }
        }, [
          el("span", { class: "file-icon", html: MM_ICONS.get(kindIcon(f), 13) }),
          el("span", { class: "file-name", text: f.name + (dirty ? " ·" : "") }),
          el("span", { class: "file-size", text: (dirty ? "已改动 · " : "") + fmtSize(f.size) })
        ]));
      });
    }

    const done = {};
    KIND_ORDER.forEach(function (kind) {
      group(kindTitle(kind), files.filter(function (f) { return f.kind === kind; }));
      done[kind] = true;
    });
    group("其他", files.filter(function (f) { return !done[f.kind]; }));
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
      const known = ["mob", "item", "skill", "droptable"].concat(
        (MM_STATE.specKinds() || []).map(function (t) { return t.kind; }));
      const kind = known.indexOf(f.kind) >= 0 ? f.kind : MM_IMPORT.guessKind(r.js);

      const opened = MM_STATE.all().find(function (p) { return p.filePath === f.path; });
      if (opened) {
        MM_STATE.select(opened.id);
        MM_APP.refresh(true);
        toast("已切到「" + opened.key + "」，保存会写回原文件");
        return;
      }

      const base = kind === "mob" ? MM_STATE.newMob()
        : kind === "skill" ? MM_STATE.newSkill()
        : kind === "droptable" ? MM_STATE.newDropTable()
        : MM_STATE.specOf(kind) ? MM_STATE.newSpecProject(kind)
        : MM_STATE.newItem();
      const res = MM_IMPORT.fill(base, { js: r.js, text: r.text, filePath: f.path });
      if (!res.ok) {
        showFileView(f, r, [res.reason]);
        return;
      }
      MM_STATE.add(base);
      base.mtime = r.mtime;   /* 记下打开时的修改时间，文件列表用它发现「外部已改动」 */
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
    Object.keys(textCache).forEach(function (k) { delete textCache[k]; });
    $("serverDir").textContent = rootDir;
    $("serverDir").title = rootDir;
    $("serverBlock").hidden = false;
    renderFiles();
    return files.length;
  };
  window.MM_HOST_OPEN_FILE = openFile;

  /* 全局搜索（0.14.0）：在扫过的服务器文件里找关键字。
     带内容缓存（重扫目录时清空；单文件外部改动由「已改动」标记提示）。 */
  const textCache = {};
  window.MM_HOST_SEARCH_FILES = async function (term) {
    const t = String(term || "").trim().toLowerCase();
    if (!t || !files.length) return [];
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      let text = textCache[f.path];
      if (text === undefined) {
        try { text = (await MM_HOST.read(f.path)).text || ""; }
        catch (e) { text = ""; }
        textCache[f.path] = text;
      }
      const lower = text.toLowerCase();
      let idx = lower.indexOf(t), hits = 0;
      while (idx >= 0 && hits < 3) {
        const lineNo = text.slice(0, idx).split("\n").length;
        const line = text.split("\n")[lineNo - 1] || "";
        out.push({
          path: f.path, rel: f.rel, name: f.name, kind: f.kind,
          line: lineNo, snippet: line.trim().slice(0, 80)
        });
        hits++;
        idx = lower.indexOf(t, idx + t.length);
      }
      if (out.length > 60) break;
    }
    return out;
  };

  /* 反向引用扫描（0.11.0）：在扫过的文件里找「谁引用了这个技能组 / 掉落表」。
     kind = "skill" | "droptable"，name 是配置 ID（不含 table: 前缀）。
     返回引用者文件列表；当前文件自己（selfPath）不算。 */
  window.MM_HOST_FIND_REFERRERS = async function (kind, name, selfPath) {
    const n = String(name || "").trim();
    if (!n || !files.length) return [];
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.kind !== "mob" && f.kind !== "skill" && f.kind !== "droptable") continue;
      if (selfPath && f.path === selfPath) continue;
      try {
        const r = await MM_HOST.read(f.path);
        const text = String(r.text || "");
        let hit = false;
        if (kind === "skill") {
          /* skill{s=名} / metaskill{s=名}（raw 行与结构化行都在原文里） */
          const reInline = new RegExp("(?:skill|metaskill)\\s*\\{[^}]*\\b(?:s|skill|name)\\s*=\\s*['\"]?" + esc + "(?:['\"]|[,;}]|\\s|$)", "i");
          /* FailedConditionsSkill / OnCooldownSkill / Skill: 名（单值键） */
          const reKey = new RegExp("^\\s*(?:FailedConditionsSkill|OnCooldownSkill|Skill)\\s*:\\s*['\"]?" + esc + "(?:['\"]|\\s|$)", "im");
          hit = reInline.test(text) || reKey.test(text);
        } else {
          /* table:名 或掉落表列表里的单 token 行 `- 名 1 0.5` */
          const reTable = new RegExp("table\\s*:\\s*['\"]?" + esc + "(?:['\"]|\\s|$)", "i");
          const reToken = new RegExp("^\\s*-\\s+" + esc + "(?:\\s|$)", "m");
          hit = reTable.test(text) || reToken.test(text);
        }
        if (hit) out.push({ path: f.path, rel: f.rel, name: f.name, kind: f.kind });
      } catch (e) { /* 读不了的文件跳过 */ }
    }
    return out;
  };

  /* 一键重命名：把引用文件里旧 ID 的出现位置换成新 ID，写回（主进程自动备份）。
     只动「作为引用 token」的位置，逐文件整读整写。返回成功改写的文件列表。 */
  window.MM_HOST_RENAME_REFERRERS = async function (kind, oldName, newName, referrers) {
    const esc = String(oldName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const done = [];
    for (let i = 0; i < referrers.length; i++) {
      const f = referrers[i];
      try {
        const r = await MM_HOST.read(f.path);
        let text = String(r.text || "");
        if (kind === "skill") {
          text = text.replace(
            new RegExp("((?:skill|metaskill)\\s*\\{[^}]*\\b(?:s|skill|name)\\s*=\\s*['\"]?)" + esc + "(?=['\"]|[,;}]|\\s|$)", "gi"),
            "$1" + newName);
          text = text.replace(
            new RegExp("^(\\s*(?:FailedConditionsSkill|OnCooldownSkill|Skill)\\s*:\\s*['\"]?)" + esc + "(?=['\"]|\\s|$)", "gim"),
            "$1" + newName);
        } else {
          text = text.replace(new RegExp("(table\\s*:\\s*['\"]?)" + esc + "(?=['\"]|\\s|$)", "gi"), "$1" + newName);
          text = text.replace(new RegExp("^(\\s*-\\s+)" + esc + "(?=\\s|$)", "gm"), "$1" + newName);
        }
        if (text !== r.text) {
          await MM_HOST.write(f.path, text);
          done.push(f.rel);
        }
      } catch (e) { /* 单个文件失败不挡其他 */ }
    }
    return done;
  };

  /* 关系图（0.15.0）：遍历文件抽「谁引用了谁」的正向边。
     技能引用与 FIND_REFERRERS 同款模式；掉落表引用用「token 恰好是已知表名」消歧
     （掉落行里的裸 token 既可能是物品也可能是表，只有命中表名清单才算边）。
     返回 { nodes, edges, skipped }：nodes 是出现在边里的文件；skipped 是孤立文件数。 */
  window.MM_HOST_BUILD_GRAPH = async function () {
    if (!files.length) return { nodes: [], edges: [], skipped: 0 };
    const known = {};
    files.forEach(function (f) {
      if (f.kind === "skill" || f.kind === "droptable") {
        known[String(f.name || "").replace(/\.yml$/i, "").toLowerCase()] = f;
      }
    });
    const nodes = {}, edges = [];
    const skillRefsOf = function (text) {
      const out = {}, re = /(?:skill|metaskill)\s*\{[^}]*\b(?:s|skill|name)\s*=\s*['"]?([\w\-]+)/gi;
      let m;
      while ((m = re.exec(text))) out[m[1].toLowerCase()] = m[1];
      const re2 = /^\s*(?:FailedConditionsSkill|OnCooldownSkill|Skill)\s*:\s*['"]?([\w\-]+)/gim;
      while ((m = re2.exec(text))) out[m[1].toLowerCase()] = m[1];
      return out;
    };
    const tableTokensOf = function (text) {
      const out = {};
      let m; const re = /table\s*[:=]\s*['"]?([\w\-]+)/gi;
      while ((m = re.exec(text))) out[m[1].toLowerCase()] = m[1];
      /* 单 token 行 `- 名字`：后面不跟数字/花括号，且名字是已知掉落表才算边 */
      const re2 = /^\s*-\s+([\w\-]+)\s*(?:#.*)?$/gm;
      while ((m = re2.exec(text))) {
        if (known[m[1].toLowerCase()]) out[m[1].toLowerCase()] = m[1];
      }
      return out;
    };
    const addNode = function (f) {
      if (!nodes[f.path]) nodes[f.path] = { id: f.path, kind: f.kind, name: f.name || f.rel, path: f.path };
    };
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.kind !== "mob" && f.kind !== "skill" && f.kind !== "droptable") continue;
      let text = textCache[f.path];
      if (text === undefined) {
        try { text = (await MM_HOST.read(f.path)).text || ""; }
        catch (e) { text = ""; }
        textCache[f.path] = text;
      }
      addNode(f);
      const fromId = f.path;
      const skills = skillRefsOf(text);
      Object.keys(skills).forEach(function (low) {
        const target = known[low];
        if (target && target.path !== fromId) {
          addNode(target);
          edges.push({ from: fromId, to: target.path, kind: "skill" });
        }
      });
      const tables = tableTokensOf(text);
      Object.keys(tables).forEach(function (low) {
        const target = known[low];
        if (target && target.path !== fromId) {
          addNode(target);
          edges.push({ from: fromId, to: target.path, kind: "table" });
        }
      });
    }
    const nodeList = Object.keys(nodes).map(function (k) { return nodes[k]; });
    const linked = {};
    edges.forEach(function (e) { linked[e.from] = linked[e.to] = true; });
    const shown = nodeList.filter(function (n) { return linked[n.id]; });
    return { nodes: shown, edges: edges, skipped: nodeList.length - shown.length };
  };

  function init() {
    $("btnOpenFolder").hidden = false;
    $("btnOpenFolder").addEventListener("click", openFolder);
    $("projectList").addEventListener("click", function () {
      // 切回项目时不需要额外处理
    });
    // 显示版本
    MM_HOST.info().then(function (i) {
      const el = $("appVer");
      if (el) el.textContent = (i.version || "?") + " · Electron " + i.electron;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
