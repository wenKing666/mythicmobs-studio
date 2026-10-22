# MythicMobs Studio

一个给「不会写 YAML 的人」用的 MythicMobs 可视化编辑器。

当前状态：**MVP 可试玩** —— 怪物 / 物品的表单编辑 + 实时生成配置已经跑通；数据层（wiki 全站 813 个组件）也已就绪。

![怪物编辑器](docs/img/editor-mob.png)

## 怎么用

1. 双击 **`启动编辑器(无窗口).vbs`**（推荐，不会有黑框）或 **`启动编辑器.bat`**，打开独立窗口。
   没装 Electron 运行时会自动回落到浏览器（功能少掉文件读写）；`.bat` 会显示提示，`.vbs` 不会。
2. 左边挑一个模板，或点右上角「新建怪物 / 新建物品」。
3. 中间填表格，右侧实时显示生成的配置。
4. 点「下载 .yml」，把文件放进服务器：
   - 怪物 → `plugins/MythicMobs/Mobs/`
   - 物品 → `plugins/MythicMobs/Items/`
5. 游戏里 `/mm reload`。

数据存在浏览器本地（localStorage），关掉再打开还在；换电脑请用「下载 .yml」或重新填。

## MVP 现在能做什么

**怪物**
- 生物类型（可搜索下拉，78 种常见实体）、显示名、生命、伤害、护甲
- **126 个官方 Options 全部实现**（通用 37 / 生物大类 15 / 生物专属 74），每个都有中文名 + 一句话说明；顶部可搜索，当前生物的专属选项会自动展开，其余折叠
- BOSS 血条（标题 / 颜色 / 分段样式 / 显示范围）
- 装备（6 个槽位，物品中文下拉）
- 技能：12 种触发器 × 21 种常用机制 × 10 种目标选择器，参数按机制自动出表单
- 掉落物（物品 / 数量范围 / 概率）

**物品**
- 材质（可搜索下拉，210 种，中文名 + 英文 ID 对照）、显示名、数量、多行描述
- 附魔（40 种，可搜索）
- 属性加成（32 种属性 × 7 个槽位 × 3 种计算方式，可搜索）
- 选项：无法破坏、附魔光效、隐藏提示、自定义模型数据

**桌面版（Electron）**
- 「打开文件夹」直接选 `plugins/MythicMobs`，左侧列出服务器里所有怪物 / 物品配置
- 点文件只读预览原始内容（导入到表单是下一步）
- 保存走系统对话框，**覆盖前自动备份**为 `xxx.yml.bak-日期时间`

**其他**
- 4 个模板：普通小怪 / BOSS / 近战武器 / 防具
- 4 个功能开关示例、实时 YAML 预览与语法高亮
- 选择器：点输入框列出全部选项（中文名 + 英文 ID），可搜索、可滚动、也可直接输入自定义 ID
- 必填校验：缺内容时输入框标红，右侧顶部列出缺哪几项，下载按钮变灰（不会悄悄给你填个默认值）
- `Ctrl+S` 下载；`index.html?tpl=tpl_boss` 可直接打开某个模板

## 还没做的（下一步）

1. **导入已有 yml**（反向解析），目前只能新建和只读预览。
2. 技能只放出了 21 个常用机制，schema 里其实有 303 个 —— 需要按使用频率分批放出来。
3. 条件（Conditions）、技能树、掉落表（DropTable）还没做。
4. 物品 1.20.5+ 的组件（Food / Tool / Equippable 等）只有数据没做 UI。
5. 打包成 exe（Tauri 需要 Rust 环境，当前机器没有；Electron 是备选）。

## 工程结构

```
启动编辑器(无窗口).vbs  双击即用，无黑框（推荐）
启动编辑器.bat        同上，但会闪一下黑框并显示错误信息
electron/
  main.js             主进程：窗口 + 文件扫描/读写/对话框
  preload.js          暴露给页面的安全接口（MM_HOST）
app/
  index.html          界面骨架
  style.css           样式（中性灰、细边框、紧凑排版）
  js/icons.js         内联 SVG 图标（无 emoji、无外部字体）
  js/data.js          中文数据表（实体/物品/附魔/属性/触发器等）
  js/options-data.js  怪物 Options 全量 126 项（自动生成）
  js/yaml.js          YAML 生成 + 预览高亮
  js/state.js         项目模型、localStorage、模板
  js/ui.js            表单渲染
  js/app.js           交互与下载
  js/host.js          Electron 里的文件浏览与保存
tools/
  crawl_wiki.py       wiki 抓取         ┐
  build_schema.py     去重归类          ├ 数据管线
  make_docs.py        生成中文索引      ┘
  demo_query.py       查 schema 示例
  test_yaml.mjs       YAML 生成器 + 校验单测（11 项）
  e2e.mjs             无头浏览器交互测试（37 项）
  e2e-electron.mjs    Electron 文件系统测试（9 项）
tests/
  fixture-server/     测试用的假服务器目录（Mobs/Items 各一个文件）
```

## 测试

```powershell
node tools/test_yaml.mjs                       # 生成器单测
node tools/e2e.mjs 9333 .                      # 界面测试（需先启动带 --remote-debugging-port 的 Edge/Electron）
node tools/e2e-electron.mjs 9350 tests/fixture-server   # 文件系统测试（先 electron . --remote-debugging-port=9350）
```

---

## 数据成果（wiki 全站结构化）

数据源：<https://wiki.mythiccraft.io/mythicmobs>（官方 wiki，抓取于 2026-10-21）

| 类别 | 条数 | 说明 |
|---|---:|---|
| 技能机制 Mechanics | 303 | `Skills:` 下 `- 机制名{参数=值}` |
| 条件 Conditions | 196 | `Conditions:` / 行内 `?条件` |
| 目标选择器 Targeters | 91 | `@Targeter` |
| 触发器 Triggers | 38 | `~onXXX` |
| 粒子类型 Particles | 120 | `particle{}` 的取值 |
| AI 行为 AI Goals | 51 | `AIGoalSelectors:` |
| AI 目标 AI Targets | 14 | `AITargetSelectors:` |
| **组件合计** | **813** | 参数条目 **1526** 条，配置示例 **1973** 段 |

另有 136 个文档页（怪物、物品、掉落、刷怪、Stat、菜单等），其中：

- `Mobs/Mobs` 28 个顶层字段
- `Mobs/Options` **146** 个选项
- `Items/Items` **57** 个顶层字段
- `Items/Options` 17 个选项

（原始抓取 1491 个页面，按正文去重后 949 个唯一页面；wiki 同一页存在大小写两种 URL。）

## 数据文件说明

```
data/
  schema.json               ★ 编辑器主数据（665 KB，组件 + 参数 + 示例）
  mythicmobs-wiki.json      全量数据（4.7 MB，含每页 markdown 正文与文档页）
  index.md                  数据索引（中文）
  index-full.md             全部组件名清单
  zh/glossary.json          常用字段中文对照
  mob-options.json          怪物 Options 126 项（含分组/默认值/说明）
  raw/*.html                原始页面缓存（960 个，80 MB，可断点重跑，可删）
docs/
  字段中文对照.md            怪物/物品字段中文释义表
tools/
  crawl_wiki.py             抓取 + 解析
  build_schema.py           去重 / 归类 / 生成 schema.json
  make_docs.py              生成中文索引与对照表
  demo_query.py             读取 schema 的示例
```

### schema.json 单条记录

```jsonc
{
  "Activatespawner": {
    "name": "Activatespawner",
    "aliases": ["as"],
    "description": "Activates a MythicMobs spawner, causing it to spawn mobs...",
    "inherits": "",                    // 非空表示继承该组件的全部参数（共 34 个组件如此）
    "attributes": [
      {
        "name": "spawners",
        "aliases": ["spawner", "s"],
        "description": "The name of the spawner(s) to activate...",
        "default": "NONE"
      }
    ],
    "fields": [],                      // 文档页才有：h4 小标题形式的字段
    "examples": ["Skills:\n- activatespawner{spawner=BossAdd}"],
    "url": "https://wiki.mythiccraft.io/mythicmobs/Skills/Mechanics/activatespawner"
  }
}
```

> 键名与取值一律保留 wiki 原文（英文、原大小写）——因为 YAML 里必须这么写，翻译会直接导致配置失效。
> 中文只出现在 `content_md` 之外的说明性文件里。

## 数据管线

```powershell
python tools/crawl_wiki.py    # 抓取（有缓存，第二次约 30 秒；无缓存约 5 分钟）
python tools/build_schema.py  # 去重、归类、生成 schema.json
python tools/make_docs.py     # 生成中文索引与字段对照
python tools/demo_query.py message   # 试用：查一个机制
python tools/demo_query.py --list mechanics
```

wiki 若改版，只需清掉 `data/raw/` 重跑第一条命令。

## 数据已知缺口

1. 少数组件页没有参数表（如 `Cancel Skill`），wiki 原文即注明 *This mechanic has no attributes*，非解析失败。
2. `inherits` 只记录 wiki 明写"继承某组件全部属性"的 34 处，**继承来的参数未展开合并**；编辑器需要自己按 `inherits` 递归取参数。
3. 少数参数表把多个参数写在一行（如 `x1, y1, z1`），会被当成一个参数名，需在编辑器里手工拆分。
4. 中文释义是人工整理的常用子集（约 230 条），未覆盖全部 1526 个参数。
5. 只抓了 MythicMobs 本体；ModelEngine / MythicCrucible / MythicEnchants 等扩展 wiki 是独立站点，尚未纳入。

## 参考

- 同类项目与选型对比：[调研-现有方案.md](调研-现有方案.md)
- 字段中文对照：[docs/字段中文对照.md](docs/字段中文对照.md)
- 数据索引：[data/index.md](data/index.md)



