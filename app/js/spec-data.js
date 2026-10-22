/* 自动生成，别手改。源数据 data/spec/*.json，生成脚本 tools/build_spec.py */
window.MM_SPEC_DATA = {
 "types": {
  "spawner": {
   "kind": "spawner",
   "title": "刷怪点",
   "one": "刷怪点",
   "dir": "Spawners",
   "keyPrefix": "my_spawner",
   "icon": "target",
   "wrap": true,
   "note": "文件被服务器加载后只能用游戏内指令改；在编辑器里改要先停服。",
   "groups": [
    {
     "id": "who",
     "title": "刷什么",
     "fields": [
      {
       "k": "MobName",
       "z": "怪物",
       "t": "text",
       "r": true,
       "h": "必须是 MythicMobs 内部名；也可写 25%MobA,75%MobB 做权重"
      },
      {
       "k": "MobLevel",
       "z": "怪物等级",
       "t": "num",
       "d": "1"
      },
      {
       "k": "MobsPerSpawn",
       "z": "每次刷几只",
       "t": "num",
       "d": "1"
      },
      {
       "k": "MaxMobs",
       "z": "最多存活",
       "t": "num",
       "d": "1",
       "h": "必须 ≥ 每次刷几只"
      },
      {
       "k": "UseWorldScaling",
       "z": "叠加世界等级",
       "t": "bool",
       "d": "false"
      }
     ]
    },
    {
     "id": "where",
     "title": "刷在哪",
     "fields": [
      {
       "k": "World",
       "z": "世界",
       "t": "text",
       "h": "世界文件夹名，留空 = 创建时的世界"
      },
      {
       "k": "SpawnerGroup",
       "z": "分组",
       "t": "text",
       "h": "用 /mm s g:<组> 批量改"
      },
      {
       "k": "X",
       "z": "X 坐标",
       "t": "num"
      },
      {
       "k": "Y",
       "z": "Y 坐标",
       "t": "num"
      },
      {
       "k": "Z",
       "z": "Z 坐标",
       "t": "num"
      },
      {
       "k": "Radius",
       "z": "水平半径",
       "t": "num",
       "d": "0"
      },
      {
       "k": "RadiusY",
       "z": "垂直半径",
       "t": "num",
       "d": "0"
      }
     ]
    },
    {
     "id": "timer",
     "title": "计时与冷却",
     "fields": [
      {
       "k": "UseTimer",
       "z": "按计时器刷",
       "t": "bool",
       "d": "true"
      },
      {
       "k": "Cooldown",
       "z": "冷却（秒）",
       "t": "num",
       "d": "0"
      },
      {
       "k": "Warmup",
       "z": "预热（秒）",
       "t": "num",
       "d": "0",
       "h": "激活后等这么久才开始冷却"
      },
      {
       "k": "Chance",
       "z": "生成概率",
       "t": "num",
       "d": "1",
       "h": "0.0–1.0；失败那一次不消耗冷却"
      }
     ]
    },
    {
     "id": "player",
     "title": "玩家与拴绳",
     "fields": [
      {
       "k": "CheckForPlayers",
       "z": "需要玩家在附近",
       "t": "bool",
       "d": "true"
      },
      {
       "k": "ActivationRange",
       "z": "激活半径",
       "t": "num",
       "d": "40"
      },
      {
       "k": "LeashRange",
       "z": "拴绳距离",
       "t": "num",
       "d": "-1",
       "h": "-1 = 不拴"
      },
      {
       "k": "HealOnLeash",
       "z": "拉回时回满血",
       "t": "bool",
       "d": "false"
      },
      {
       "k": "ResetThreatOnLeash",
       "z": "拉回时清仇恨",
       "t": "bool",
       "d": "false"
      }
     ]
    },
    {
     "id": "misc",
     "title": "其它",
     "fields": [
      {
       "k": "ShowFlames",
       "z": "显示火焰",
       "t": "bool",
       "d": "false"
      },
      {
       "k": "Breakable",
       "z": "可被破坏",
       "t": "bool",
       "d": "false"
      },
      {
       "k": "RandomRotation",
       "z": "随机朝向",
       "t": "bool",
       "d": "false"
      },
      {
       "k": "Conditions",
       "z": "激活条件",
       "t": "conds",
       "h": "不满足就不激活"
      },
      {
       "k": "SpawnConditions",
       "z": "出生点条件",
       "t": "conds",
       "h": "检查实际生成的位置"
      }
     ]
    }
   ]
  },
  "randomspawn": {
   "kind": "randomspawn",
   "title": "随机刷怪",
   "one": "随机刷怪规则",
   "dir": "RandomSpawns",
   "keyPrefix": "my_randomspawn",
   "icon": "shuffle",
   "wrap": true,
   "note": "决定原版自然刷怪时替换成什么，和刷怪点（Spawners）不是一回事。",
   "groups": [
    {
     "id": "who",
     "title": "刷什么",
     "fields": [
      {
       "k": "Action",
       "z": "方式",
       "t": "enum",
       "o": [
        "ADD",
        "REPLACE"
       ],
       "d": "ADD",
       "h": "ADD = 额外加一只；REPLACE = 顶掉原版那只"
      },
      {
       "k": "Type",
       "z": "怪物名",
       "t": "text",
       "h": "多个用逗号分隔，也可写原版生物"
      },
      {
       "k": "Types",
       "z": "权重列表",
       "t": "list",
       "h": "每行「怪物名 权重」，和上面的单值二选一"
      },
      {
       "k": "Level",
       "z": "等级",
       "t": "num",
       "d": "1",
       "h": "只能写固定数字，不接受 3to7"
      }
     ]
    },
    {
     "id": "where",
     "title": "刷在哪",
     "fields": [
      {
       "k": "Worlds",
       "z": "世界",
       "t": "list",
       "h": "每行一个世界名"
      },
      {
       "k": "Biomes",
       "z": "群系",
       "t": "list",
       "h": "每行一个群系，如 JUNGLE"
      },
      {
       "k": "Structures",
       "z": "结构",
       "t": "list",
       "h": "如 minecraft:fortress；设了就只能在这些结构里刷"
      },
      {
       "k": "Reason",
       "z": "生成原因",
       "t": "list",
       "h": "如 NATURAL / SPAWNER，留空 = 不限"
      },
      {
       "k": "PositionType",
       "z": "位置类型",
       "t": "enum",
       "o": [
        "LAND",
        "SEA"
       ],
       "d": "LAND",
       "h": "只在 Action: ADD 时生效"
      }
     ]
    },
    {
     "id": "weight",
     "title": "概率与优先级",
     "fields": [
      {
       "k": "Chance",
       "z": "生成概率",
       "t": "num",
       "d": "1"
      },
      {
       "k": "Priority",
       "z": "优先级",
       "t": "num",
       "d": "1",
       "h": "同一位置多条命中时，数字大的优先"
      },
      {
       "k": "Cooldown",
       "z": "冷却（秒）",
       "t": "num",
       "h": "同一条规则两次刷怪的最小间隔"
      },
      {
       "k": "UseWorldScaling",
       "z": "叠加世界等级",
       "t": "bool",
       "d": "true"
      }
     ]
    },
    {
     "id": "cond",
     "title": "条件",
     "fields": [
      {
       "k": "Conditions",
       "z": "条件",
       "t": "conds",
       "h": "任意一条不满足就不刷"
      }
     ]
    }
   ]
  },
  "stats": {
   "kind": "stats",
   "title": "自定义属性",
   "one": "属性",
   "dir": "stats",
   "keyPrefix": "MY_STAT",
   "icon": "activity",
   "wrap": true,
   "note": "stats.yml（可以放在 Packs 里）。物品上要用属性需要装 MythicCrucible。",
   "groups": [
    {
     "id": "base",
     "title": "基础",
     "fields": [
      {
       "k": "Enabled",
       "z": "启用",
       "t": "bool",
       "d": "true"
      },
      {
       "k": "AlwaysActive",
       "z": "强制作用于所有实体",
       "t": "bool",
       "d": "false"
      },
      {
       "k": "Type",
       "z": "类型",
       "t": "enum",
       "o": [
        "STATIC",
        "ADDITIVE",
        "ADDITIVE_MULTIPLIER",
        "COMPOUND_MULTIPLIER",
        "DAMAGE_MODIFIER",
        "DAMAGE_BONUS",
        "PROC"
       ],
       "d": "STATIC",
       "h": "STATIC 用于纯计数属性；PROC 是按概率触发技能"
      },
      {
       "k": "Display",
       "z": "显示名",
       "t": "text"
      },
      {
       "k": "FormulaKey",
       "z": "公式键",
       "t": "text",
       "h": "占位符里用的短名，如 SPD"
      },
      {
       "k": "Priority",
       "z": "优先级",
       "t": "num"
      },
      {
       "k": "Rounding",
       "z": "保留小数位",
       "t": "num",
       "d": "2"
      }
     ]
    },
    {
     "id": "value",
     "title": "数值",
     "fields": [
      {
       "k": "BaseValue",
       "z": "基础值",
       "t": "num",
       "d": "0",
       "h": "没有父属性时用的静态基础值"
      },
      {
       "k": "Formula",
       "z": "基础值公式",
       "t": "text",
       "h": "有父属性时按公式算基础值，公式键用 FormulaKey 指定的短名"
      },
      {
       "k": "MinValue",
       "z": "最小值",
       "t": "num"
      },
      {
       "k": "MaxValue",
       "z": "最大值",
       "t": "num"
      }
     ]
    },
    {
     "id": "trigger",
     "title": "触发与依赖",
     "fields": [
      {
       "k": "Triggers",
       "z": "触发时机",
       "t": "list",
       "h": "写触发器去掉 on 前缀的短名，如 Attack / Damaged / Death"
      },
      {
       "k": "ExecutionPoint",
       "z": "计算时机",
       "t": "enum",
       "o": [
        "PRE",
        "POST"
       ],
       "d": "PRE",
       "h": "PRE 在触发的事件之前算，POST 在之后算"
      },
      {
       "k": "ParentStats",
       "z": "依赖的父属性",
       "t": "list",
       "h": "本属性要靠哪些属性算出来，一行一个属性名"
      },
      {
       "k": "TriggerStats",
       "z": "触发者的属性",
       "t": "list",
       "h": "触发实体可能带的属性与公式键，空格分隔，如 FIRE_RESISTANCE FR"
      }
     ]
    },
    {
     "id": "fmt",
     "title": "显示格式",
     "fields": [
      {
       "k": "Formatting",
       "z": "格式",
       "t": "obj",
       "f": [
        {
         "k": "Additive",
         "z": "加法",
         "t": "text",
         "h": "如 +<value> Speed"
        },
        {
         "k": "Multiply",
         "z": "乘法",
         "t": "text",
         "h": "如 +<value>% Speed"
        },
        {
         "k": "Compound",
         "z": "复合",
         "t": "text",
         "h": "如 x<value>% Speed"
        },
        {
         "k": "Static",
         "z": "静态",
         "t": "text",
         "h": "如 Force <value> <display>"
        }
       ]
      },
      {
       "k": "ShowInLore",
       "z": "在 lore 里显示",
       "t": "obj",
       "f": [
        {
         "k": "Additive",
         "z": "加法",
         "t": "bool"
        },
        {
         "k": "Multiply",
         "z": "乘法",
         "t": "bool"
        },
        {
         "k": "Compound",
         "z": "复合",
         "t": "bool"
        }
       ]
      }
     ]
    },
    {
     "id": "hook",
     "title": "挂技能",
     "fields": [
      {
       "k": "Skills",
       "z": "技能",
       "t": "skills",
       "h": "属性触发时执行，如暴击粒子"
      },
      {
       "k": "Conditions",
       "z": "条件",
       "t": "conds"
      }
     ]
    }
   ]
  },
  "menu": {
   "kind": "menu",
   "title": "自定义菜单",
   "one": "菜单",
   "dir": "menus",
   "keyPrefix": "MyMenu",
   "icon": "grid",
   "wrap": true,
   "note": "需要 MythicMobs Premium 或 MythicRPG。",
   "groups": [
    {
     "id": "base",
     "title": "基础",
     "fields": [
      {
       "k": "Display",
       "z": "标题",
       "t": "text"
      },
      {
       "k": "Size",
       "z": "槽位数",
       "t": "num",
       "d": "27",
       "h": "9 的倍数，最大 54"
      },
      {
       "k": "Shared",
       "z": "所有玩家共用一份",
       "t": "bool",
       "d": "false",
       "h": "开启后不按玩家缓存"
      },
      {
       "k": "Schema",
       "z": "布局",
       "t": "list",
       "h": "每行 9 个字符，如 '1 1 1 1 1 1 1 1 1'；0 = 空"
      }
     ]
    },
    {
     "id": "icons",
     "title": "图标",
     "fields": [
      {
       "k": "Icons",
       "z": "图标",
       "t": "map",
       "h": "键名随意，用 Schema 里的字符映射到格子",
       "f": [
        {
         "k": "Mapping",
         "z": "映射字符",
         "t": "text"
        },
        {
         "k": "Material",
         "z": "材质",
         "t": "text"
        },
        {
         "k": "Model",
         "z": "CustomModelData",
         "t": "num"
        },
        {
         "k": "Display",
         "z": "名字",
         "t": "text"
        },
        {
         "k": "Glint",
         "z": "附魔光效",
         "t": "bool"
        },
        {
         "k": "Hide",
         "z": "隐藏提示",
         "t": "list",
         "h": "每行一个 ItemFlag，如 ATTRIBUTES"
        },
        {
         "k": "Enchantments",
         "z": "附魔",
         "t": "list",
         "h": "每行「附魔 等级」"
        },
        {
         "k": "TooltipStyle",
         "z": "提示框样式",
         "t": "text"
        },
        {
         "k": "Skills",
         "z": "点击技能",
         "t": "skills"
        }
       ]
      }
     ]
    }
   ]
  },
  "dialog": {
   "kind": "dialog",
   "title": "对话窗口",
   "one": "对话",
   "dir": "dialogs",
   "keyPrefix": "MyDialog",
   "icon": "message-square",
   "wrap": true,
   "note": "Paper Dialog API，需要 Premium + Paper 1.21.6+。文本用 MiniMessage，写 &c 这种旧色码会导致打不开。",
   "groups": [
    {
     "id": "base",
     "title": "基础",
     "fields": [
      {
       "k": "Title",
       "z": "标题",
       "t": "text"
      },
      {
       "k": "ExternalTitle",
       "z": "外部标题",
       "t": "text",
       "h": "在暂停菜单等界面里的按钮名"
      },
      {
       "k": "CanClose",
       "z": "允许 Esc 关闭",
       "t": "bool",
       "d": "true"
      },
      {
       "k": "Pause",
       "z": "暂停游戏",
       "t": "bool",
       "d": "false",
       "h": "仅单人有效"
      },
      {
       "k": "AfterAction",
       "z": "点击后",
       "t": "enum",
       "o": [
        "CLOSE",
        "WAIT_FOR_RESPONSE",
        "NONE"
       ],
       "d": "CLOSE"
      },
      {
       "k": "Columns",
       "z": "按钮列数",
       "t": "num",
       "d": "1"
      }
     ]
    },
    {
     "id": "body",
     "title": "正文",
     "fields": [
      {
       "k": "Body",
       "z": "正文元素",
       "t": "objlist",
       "f": [
        {
         "k": "Type",
         "z": "类型",
         "t": "enum",
         "o": [
          "text",
          "item"
         ],
         "d": "text"
        },
        {
         "k": "Message",
         "z": "文字",
         "t": "text"
        },
        {
         "k": "Width",
         "z": "宽度（px）",
         "t": "num",
         "h": "文字最多 1024，物品最多 256"
        },
        {
         "k": "Item",
         "z": "物品",
         "t": "text",
         "h": "材质 / Mythic 物品 / mmoitems.TYPE.ID / 掉落表"
        },
        {
         "k": "Height",
         "z": "高度（px）",
         "t": "num",
         "d": "64"
        },
        {
         "k": "Decoration",
         "z": "显示数量与耐久条",
         "t": "bool"
        },
        {
         "k": "ShowTooltip",
         "z": "悬停显示提示",
         "t": "bool",
         "d": "true"
        }
       ]
      }
     ]
    },
    {
     "id": "inputs",
     "title": "输入项",
     "fields": [
      {
       "k": "Inputs",
       "z": "输入项",
       "t": "objlist",
       "h": "点击按钮时以 dialog.<Key> 传进技能",
       "f": [
        {
         "k": "Type",
         "z": "类型",
         "t": "enum",
         "o": [
          "text",
          "bool",
          "range",
          "option"
         ],
         "d": "text"
        },
        {
         "k": "Key",
         "z": "键名",
         "t": "text",
         "h": "只能用字母、数字、下划线"
        },
        {
         "k": "Label",
         "z": "标签",
         "t": "text"
        },
        {
         "k": "Initial",
         "z": "初始值",
         "t": "text",
         "h": "支持占位符，不支持 MiniMessage"
        },
        {
         "k": "Width",
         "z": "宽度（px）",
         "t": "num",
         "d": "200"
        },
        {
         "k": "LabelVisible",
         "z": "显示标签",
         "t": "bool",
         "d": "true"
        },
        {
         "k": "MaxLength",
         "z": "最大字数",
         "t": "num",
         "d": "256"
        },
        {
         "k": "Multiline",
         "z": "多行",
         "t": "bool"
        },
        {
         "k": "MaxLines",
         "z": "最大行数",
         "t": "num"
        },
        {
         "k": "Height",
         "z": "高度（px）",
         "t": "num"
        }
       ]
      }
     ]
    },
    {
     "id": "buttons",
     "title": "按钮",
     "fields": [
      {
       "k": "Buttons",
       "z": "按钮",
       "t": "objlist",
       "f": [
        {
         "k": "Label",
         "z": "文字",
         "t": "text"
        },
        {
         "k": "Width",
         "z": "宽度（px）",
         "t": "num",
         "d": "150"
        },
        {
         "k": "Tooltip",
         "z": "悬停提示",
         "t": "text"
        },
        {
         "k": "Actions",
         "z": "点击动作",
         "t": "list",
         "h": "每行一个动作，如 run_command"
        }
       ]
      }
     ]
    }
   ]
  },
  "cinematic": {
   "kind": "cinematic",
   "title": "过场镜头",
   "one": "镜头路径",
   "dir": "cutscenes",
   "keyPrefix": "my_path",
   "icon": "video",
   "wrap": true,
   "note": "用 cinematicCamera{path=...} 播放；路径点也可以写成相对坐标（以 ~ 开头）。",
   "groups": [
    {
     "id": "base",
     "title": "路径",
     "fields": [
      {
       "k": "duration",
       "z": "总时长（tick）",
       "t": "num",
       "d": "100"
      },
      {
       "k": "loop",
       "z": "循环播放",
       "t": "bool",
       "d": "false"
      },
      {
       "k": "easing",
       "z": "默认缓动",
       "t": "enum",
       "o": [
        "LINEAR",
        "EASE_IN_QUAD",
        "EASE_OUT_QUAD",
        "EASE_IN_OUT_QUAD",
        "EASE_IN_CUBIC",
        "EASE_OUT_CUBIC",
        "EASE_IN_OUT_CUBIC",
        "EASE_IN_SINE",
        "EASE_OUT_SINE",
        "EASE_IN_OUT_SINE",
        "SMOOTHSTEP",
        "SMOOTHERSTEP",
        "CATMULL_ROM",
        "STEP"
       ],
       "d": "EASE_IN_OUT_CUBIC"
      },
      {
       "k": "points",
       "z": "路径点",
       "t": "list",
       "h": "每行 world,x,y,z,yaw,pitch 或 ~,dx,dy,dz,yaw,pitch，可再加 hold 和 easing"
      }
     ]
    }
   ]
  },
  "pin": {
   "kind": "pin",
   "title": "定位点",
   "one": "定位点",
   "dir": "pins",
   "keyPrefix": "my_pin",
   "icon": "map-pin",
   "wrap": false,
   "listFile": true,
   "note": "pins.yml 是一个列表，每项一条。可供 pin 相关机制与目标器使用。",
   "groups": [
    {
     "id": "base",
     "title": "定位点",
     "fields": [
      {
       "k": "name",
       "z": "名字",
       "t": "text",
       "r": true
      },
      {
       "k": "location",
       "z": "位置",
       "t": "text",
       "h": "world,x,y,z"
      },
      {
       "k": "radius",
       "z": "半径",
       "t": "num"
      },
      {
       "k": "duration",
       "z": "存在时长（tick）",
       "t": "num"
      },
      {
       "k": "color",
       "z": "颜色",
       "t": "text"
      }
     ]
    }
   ]
  },
  "pack": {
   "kind": "pack",
   "title": "内容包",
   "one": "内容包",
   "dir": "pack",
   "keyPrefix": "pack",
   "icon": "package",
   "wrap": false,
   "single": "pack.yml",
   "note": "包信息文件，一个目录只有一份 pack.yml；子目录里的文件按 packs/<Name>/ 组织。",
   "groups": [
    {
     "id": "info",
     "title": "包信息",
     "fields": [
      {
       "k": "Name",
       "z": "包名",
       "t": "text"
      },
      {
       "k": "Version",
       "z": "版本",
       "t": "text"
      },
      {
       "k": "Author",
       "z": "作者",
       "t": "text"
      },
      {
       "k": "URL",
       "z": "链接",
       "t": "text"
      },
      {
       "k": "Description",
       "z": "描述",
       "t": "list",
       "h": "每行一句，支持颜色码"
      },
      {
       "k": "Icon",
       "z": "图标",
       "t": "obj",
       "f": [
        {
         "k": "Material",
         "z": "材质",
         "t": "text"
        },
        {
         "k": "Model",
         "z": "CustomModelData",
         "t": "num"
        }
       ]
      }
     ]
    },
    {
     "id": "deps",
     "title": "依赖与覆写",
     "fields": [
      {
       "k": "PackDependencies",
       "z": "依赖的包",
       "t": "list",
       "h": "每行一个包名，支持 && || 表达式"
      },
      {
       "k": "PackOverrides",
       "z": "覆写的包",
       "t": "list"
      },
      {
       "k": "FileDependencies",
       "z": "单文件依赖",
       "t": "list",
       "h": "如 enchantments/* MythicEnchants"
      },
      {
       "k": "FileOverrides",
       "z": "单文件覆写",
       "t": "list"
      }
     ]
    }
   ]
  },
  "vanillaoverride": {
   "kind": "vanillaoverride",
   "title": "原版覆写",
   "one": "原版覆写",
   "dir": "VanillaMobs",
   "keyPrefix": "ZOMBIE",
   "icon": "layers",
   "wrap": true,
   "note": "VanillaMobs.yml：顶层写原版生物类型（大写），下面是普通怪物字段，用来改原版怪。",
   "groups": [
    {
     "id": "base",
     "title": "基础",
     "fields": [
      {
       "k": "Health",
       "z": "生命",
       "t": "num"
      },
      {
       "k": "Damage",
       "z": "伤害",
       "t": "num"
      },
      {
       "k": "Armor",
       "z": "护甲",
       "t": "num"
      },
      {
       "k": "Display",
       "z": "显示名",
       "t": "text"
      },
      {
       "k": "Faction",
       "z": "阵营",
       "t": "text"
      },
      {
       "k": "Options",
       "z": "Options",
       "t": "kv",
       "h": "键: 值，如 PreventSunburn: true"
      },
      {
       "k": "Skills",
       "z": "技能",
       "t": "skills"
      },
      {
       "k": "Drops",
       "z": "掉落",
       "t": "raw",
       "h": "多行原文，按 wiki 语法写"
      },
      {
       "k": "AIGoalSelectors",
       "z": "AI 行为",
       "t": "list"
      },
      {
       "k": "AITargetSelectors",
       "z": "AI 目标",
       "t": "list"
      },
      {
       "k": "DamageModifiers",
       "z": "伤害修正",
       "t": "list",
       "h": "每行「类型 倍率」"
      }
     ]
    }
   ]
  }
 },
 "mobExtra": {
  "groups": [
   {
    "id": "level",
    "title": "等级与成长",
    "fields": [
     {
      "k": "Level",
      "z": "默认等级",
      "t": "text",
      "h": "固定数字，或 3to7 / 3-7 表示每次生成随机"
     },
     {
      "k": "LevelModifiers",
      "z": "每级成长",
      "t": "obj",
      "h": "基础值没设的项不会生效",
      "f": [
       {
        "k": "Health",
        "z": "生命",
        "t": "num"
       },
       {
        "k": "Damage",
        "z": "伤害",
        "t": "num"
       },
       {
        "k": "Armor",
        "z": "护甲",
        "t": "num"
       },
       {
        "k": "Power",
        "z": "技能强度",
        "t": "num"
       },
       {
        "k": "KnockbackResistance",
        "z": "击退抗性",
        "t": "num"
       },
       {
        "k": "MovementSpeed",
        "z": "移速",
        "t": "num"
       }
      ]
     },
     {
      "k": "Template",
      "z": "继承模板",
      "t": "text",
      "h": "模板名，多个用逗号分隔；自己的字段会覆盖模板"
     }
    ]
   },
   {
    "id": "look",
    "title": "外观",
    "fields": [
     {
      "k": "Faction",
      "z": "阵营",
      "t": "text",
      "h": "区分大小写；用于 AI 与目标器筛选"
     },
     {
      "k": "Disguise",
      "z": "伪装成",
      "t": "text",
      "h": "需要装 LibsDisguises；只写生物类型"
     },
     {
      "k": "KillMessages",
      "z": "击杀消息",
      "t": "list",
      "h": "每行一条，随机挑一条播；可用 <target.name>"
     },
     {
      "k": "HealthBar",
      "z": "头顶血条",
      "t": "obj",
      "f": [
       {
        "k": "Enabled",
        "z": "启用",
        "t": "bool"
       },
       {
        "k": "Offset",
        "z": "高度偏移",
        "t": "num",
        "d": "1.45"
       }
      ]
     },
     {
      "k": "Nameplate",
      "z": "自定义名牌",
      "t": "obj",
      "f": [
       {
        "k": "Enabled",
        "z": "启用",
        "t": "bool"
       },
       {
        "k": "Offset",
        "z": "高度偏移",
        "t": "num",
        "d": "1.8"
       },
       {
        "k": "Scale",
        "z": "缩放",
        "t": "text",
        "h": "如 1,1,1"
       },
       {
        "k": "Mounted",
        "z": "适配 ModelEngine",
        "t": "bool"
       }
      ]
     },
     {
      "k": "DisplayOptions",
      "z": "显示实体",
      "t": "obj",
      "h": "只对 *_display 类型生效",
      "f": [
       {
        "k": "Block",
        "z": "方块",
        "t": "text"
       },
       {
        "k": "Item",
        "z": "物品",
        "t": "text"
       },
       {
        "k": "Text",
        "z": "文字",
        "t": "text"
       },
       {
        "k": "ViewRange",
        "z": "可视距离",
        "t": "num"
       },
       {
        "k": "Width",
        "z": "宽度",
        "t": "num"
       },
       {
        "k": "Height",
        "z": "高度",
        "t": "num"
       },
       {
        "k": "ShadowRadius",
        "z": "阴影半径",
        "t": "num"
       },
       {
        "k": "ShadowStrength",
        "z": "阴影浓度",
        "t": "num"
       },
       {
        "k": "Billboard",
        "z": "朝向方式",
        "t": "enum",
        "o": [
         "FIXED",
         "VERTICAL",
         "HORIZONTAL",
         "CENTER"
        ]
       },
       {
        "k": "TeleportDuration",
        "z": "瞬移时长",
        "t": "num"
       },
       {
        "k": "InterpolationDelay",
        "z": "插值延迟",
        "t": "num"
       },
       {
        "k": "InterpolationDuration",
        "z": "插值时长",
        "t": "num"
       },
       {
        "k": "ColorOverride",
        "z": "颜色覆盖",
        "t": "num"
       },
       {
        "k": "BlockLight",
        "z": "方块光",
        "t": "num"
       },
       {
        "k": "SkyLight",
        "z": "天空光",
        "t": "num"
       },
       {
        "k": "Translation",
        "z": "平移",
        "t": "text",
        "h": "x,y,z"
       },
       {
        "k": "Scale",
        "z": "缩放",
        "t": "text",
        "h": "x,y,z"
       },
       {
        "k": "LeftRotation",
        "z": "左旋四元数",
        "t": "text",
        "h": "x,y,z,w"
       },
       {
        "k": "RightRotation",
        "z": "右旋四元数",
        "t": "text",
        "h": "x,y,z,w"
       },
       {
        "k": "Transform",
        "z": "物品变换",
        "t": "enum",
        "o": [
         "NONE",
         "THIRD_PERSON_LEFT_HAND",
         "THIRD_PERSON_RIGHT_HAND",
         "FIRST_PERSON_LEFT_HAND",
         "FIRST_PERSON_RIGHT_HAND",
         "HEAD",
         "GUI",
         "GROUND",
         "FIXED"
        ]
       },
       {
        "k": "Opacity",
        "z": "不透明度",
        "t": "num"
       }
      ]
     },
     {
      "k": "MannequinOptions",
      "z": "模特选项",
      "t": "obj",
      "h": "Type: MANNEQUIN 时用",
      "f": [
       {
        "k": "Player",
        "z": "皮肤来源玩家",
        "t": "text"
       },
       {
        "k": "Skin",
        "z": "皮肤贴图",
        "t": "text",
        "h": "namespace:directory/texturename"
       },
       {
        "k": "Cape",
        "z": "披风",
        "t": "text"
       },
       {
        "k": "Elytra",
        "z": "鞘翅",
        "t": "text"
       },
       {
        "k": "Model",
        "z": "体型",
        "t": "enum",
        "o": [
         "SLIM",
         "WIDE"
        ]
       },
       {
        "k": "Pose",
        "z": "姿势",
        "t": "text"
       },
       {
        "k": "MainHand",
        "z": "主手",
        "t": "enum",
        "o": [
         "LEFT",
         "RIGHT"
        ]
       },
       {
        "k": "Description",
        "z": "描述",
        "t": "text"
       },
       {
        "k": "HideDescription",
        "z": "隐藏描述",
        "t": "bool"
       },
       {
        "k": "Immovable",
        "z": "固定不动",
        "t": "bool"
       }
      ]
     }
    ]
   },
   {
    "id": "behave",
    "title": "行为与模块",
    "fields": [
     {
      "k": "Mount",
      "z": "默认坐骑",
      "t": "text",
      "h": "必须是另一个 MythicMob 的内部名"
     },
     {
      "k": "Modules",
      "z": "模块开关",
      "t": "obj",
      "f": [
       {
        "k": "ThreatTable",
        "z": "仇恨表",
        "t": "bool",
        "h": "按累计伤害决定打谁，超过当前目标 110% 才换"
       },
       {
        "k": "ImmunityTable",
        "z": "独立无敌帧",
        "t": "bool",
        "h": "每个玩家各自算 NoDamageTicks"
       }
      ]
     },
     {
      "k": "Hearing",
      "z": "听觉",
      "t": "obj",
      "f": [
       {
        "k": "Enabled",
        "z": "启用（解锁 ~onHear）",
        "t": "bool"
       }
      ]
     },
     {
      "k": "AIPathfindingMalus",
      "z": "寻路惩罚",
      "t": "list",
      "h": "每行「路径类型 数值」，如 WATER 0"
     },
     {
      "k": "Variables",
      "z": "初始变量",
      "t": "kv",
      "h": "键: 值；值可写 int/2、float/4.2 指定类型"
     },
     {
      "k": "Trades",
      "z": "村民交易",
      "t": "map",
      "h": "键随意（1、2、3…），职业等级要到 2 才保留",
      "f": [
       {
        "k": "Item1",
        "z": "材料 1",
        "t": "text",
        "h": "如 5 EMERALD"
       },
       {
        "k": "Item2",
        "z": "材料 2",
        "t": "text"
       },
       {
        "k": "Result",
        "z": "产出",
        "t": "text"
       },
       {
        "k": "MaxUses",
        "z": "可用次数",
        "t": "num",
        "d": "10000"
       }
      ]
     },
     {
      "k": "Totem",
      "z": "图腾召唤",
      "t": "obj",
      "h": "摆出指定结构就召唤这只怪",
      "f": [
       {
        "k": "Head",
        "z": "触发方块",
        "t": "text",
        "h": "如 player_head"
       },
       {
        "k": "Pattern",
        "z": "结构图案",
        "t": "list",
        "h": "每行「x,y,z 材质」，坐标以底座中心为原点"
       },
       {
        "k": "Replacement",
        "z": "替换方块",
        "t": "list",
        "h": "每行「x,y,z 材质」；没列的会变成空气"
       }
      ]
     }
    ]
   }
  ]
 },
 "itemComponentFields": {
  "Hide": [
   {
    "k": "flags",
    "z": "隐藏项",
    "t": "list",
    "h": "每行一个 ItemFlag，如 ATTRIBUTES / ENCHANTS"
   }
  ],
  "PotionEffects": [
   {
    "k": "effects",
    "z": "药水效果",
    "t": "list",
    "h": "每行「类型;时长;等级」，如 SPEED;200;1"
   }
  ],
  "BannerLayers": [
   {
    "k": "layers",
    "z": "图案层",
    "t": "list",
    "h": "每行「颜色 图案」，如 RED BASE"
   }
  ],
  "CanPlaceOn": [
   {
    "k": "blocks",
    "z": "可放置",
    "t": "list",
    "h": "方块 id 或 #标签（标签要加引号）"
   }
  ],
  "CanBreak": [
   {
    "k": "blocks",
    "z": "可破坏",
    "t": "list"
   }
  ],
  "BlockStates": [
   {
    "k": "states",
    "z": "方块状态",
    "t": "kv",
    "h": "键: 值，如 waterlogged: true"
   }
  ],
  "NBT": [
   {
    "k": "tags",
    "z": "NBT 标签",
    "t": "kv",
    "h": "键: 值；值可加 int/ float/ double/ byte/ bool/ 前缀"
   }
  ],
  "Trim": [
   {
    "k": "Material",
    "z": "纹饰材质",
    "t": "text",
    "h": "如 REDSTONE"
   },
   {
    "k": "Pattern",
    "z": "纹饰图案",
    "t": "text",
    "h": "如 SENTRY"
   }
  ],
  "Firework": [
   {
    "k": "Colors",
    "z": "颜色",
    "t": "text",
    "h": "逗号分隔的 RGB，如 255,0,0"
   },
   {
    "k": "FadeColors",
    "z": "渐隐色",
    "t": "text"
   },
   {
    "k": "Flicker",
    "z": "闪烁",
    "t": "bool"
   },
   {
    "k": "Trail",
    "z": "拖尾",
    "t": "bool"
   },
   {
    "k": "Type",
    "z": "形状",
    "t": "text",
    "h": "如 BALL / STAR / CREEPER"
   },
   {
    "k": "Flight",
    "z": "飞行时长",
    "t": "num",
    "d": "1"
   }
  ],
  "Book": [
   {
    "k": "Title",
    "z": "标题",
    "t": "text"
   },
   {
    "k": "Author",
    "z": "作者",
    "t": "text"
   },
   {
    "k": "Pages",
    "z": "页面",
    "t": "list",
    "h": "每行一页，支持颜色码"
   }
  ],
  "DeathProtection": [
   {
    "k": "ConsumeEffects",
    "z": "触发效果",
    "t": "list",
    "h": "每行一个机制，如 heal{amount=4}"
   }
  ],
  "Spawner": [
   {
    "k": "Delay",
    "z": "初始延迟",
    "t": "num"
   },
   {
    "k": "MinSpawnDelay",
    "z": "最短间隔",
    "t": "num"
   },
   {
    "k": "MaxSpawnDelay",
    "z": "最长间隔",
    "t": "num"
   },
   {
    "k": "RequiredPlayerRange",
    "z": "需要玩家距离",
    "t": "num"
   },
   {
    "k": "SpawnCount",
    "z": "每次数量",
    "t": "num"
   },
   {
    "k": "SpawnRange",
    "z": "生成半径",
    "t": "num"
   },
   {
    "k": "MaxNearbyEntities",
    "z": "附近上限",
    "t": "num"
   },
   {
    "k": "Mobs",
    "z": "怪物",
    "t": "list",
    "h": "每行一个怪物名"
   }
  ],
  "DropOptions": [
   {
    "k": "DropGlowColor",
    "z": "发光颜色",
    "t": "text"
   },
   {
    "k": "DropBeamColor",
    "z": "光柱颜色",
    "t": "text"
   },
   {
    "k": "DropLootsplosion",
    "z": "掉落爆散",
    "t": "bool"
   },
   {
    "k": "DropHologram",
    "z": "掉落全息",
    "t": "bool"
   },
   {
    "k": "DropVFX",
    "z": "粒子效果",
    "t": "text"
   },
   {
    "k": "DropVFXMaterial",
    "z": "粒子材质",
    "t": "text"
   },
   {
    "k": "DropVFXData",
    "z": "粒子数据",
    "t": "text"
   },
   {
    "k": "DropVFXColor",
    "z": "粒子颜色",
    "t": "text"
   },
   {
    "k": "DropBillboarding",
    "z": "始终朝向玩家",
    "t": "bool"
   },
   {
    "k": "DropBrightness",
    "z": "亮度",
    "t": "num"
   },
   {
    "k": "DropClientSide",
    "z": "仅客户端显示",
    "t": "bool"
   }
  ],
  "PiercingWeapon": [
   {
    "k": "Knockback",
    "z": "击退",
    "t": "num"
   },
   {
    "k": "Dismounts",
    "z": "使目标下坐骑",
    "t": "bool"
   },
   {
    "k": "Sound",
    "z": "音效",
    "t": "text"
   },
   {
    "k": "HitSound",
    "z": "命中音效",
    "t": "text"
   }
  ],
  "KineticWeapon": [
   {
    "k": "ContactCooldownTicks",
    "z": "接触冷却（tick）",
    "t": "num"
   },
   {
    "k": "DelayTicks",
    "z": "延迟（tick）",
    "t": "num"
   },
   {
    "k": "ForwardMovement",
    "z": "前冲速度",
    "t": "num"
   },
   {
    "k": "DamageMultiplier",
    "z": "伤害倍率",
    "t": "num"
   },
   {
    "k": "Sound",
    "z": "音效",
    "t": "text"
   },
   {
    "k": "HitSound",
    "z": "命中音效",
    "t": "text"
   }
  ],
  "OminousBottleAmplifier": [
   {
    "k": "level",
    "z": "不祥之兆等级",
    "t": "num",
    "h": "写数字即可"
   }
  ],
  "PotDecorations": [
   {
    "k": "Back",
    "z": "后面",
    "t": "text"
   },
   {
    "k": "Left",
    "z": "左面",
    "t": "text"
   },
   {
    "k": "Right",
    "z": "右面",
    "t": "text"
   },
   {
    "k": "Front",
    "z": "前面",
    "t": "text"
   }
  ],
  "UseRemainder": [
   {
    "k": "Item",
    "z": "剩余物品",
    "t": "text"
   },
   {
    "k": "Amount",
    "z": "数量",
    "t": "num"
   }
  ],
  "Weapon": [
   {
    "k": "ItemDamagePerAttack",
    "z": "每次攻击掉耐久",
    "t": "num"
   },
   {
    "k": "DisableBlockingForSeconds",
    "z": "禁用格挡秒数",
    "t": "num"
   }
  ],
  "BreakSound": [
   {
    "k": "sound",
    "z": "损坏音效",
    "t": "text"
   }
  ],
  "JukeboxPlayable": [
   {
    "k": "song",
    "z": "曲目",
    "t": "text",
    "h": "如 minecraft:cat"
   }
  ],
  "NoteBlockSound": [
   {
    "k": "sound",
    "z": "音符盒音效",
    "t": "text"
   }
  ],
  "BlocksAttacks": [
   {
    "k": "BlockDelaySeconds",
    "z": "格挡启动延迟（秒）",
    "t": "num"
   },
   {
    "k": "DisableCooldownScale",
    "z": "禁用冷却缩放",
    "t": "num"
   },
   {
    "k": "ItemDamage",
    "z": "物品耐久损失",
    "t": "num"
   },
   {
    "k": "HitBlockSound",
    "z": "格挡音效",
    "t": "text"
   },
   {
    "k": "DisabledSound",
    "z": "格挡失效音效",
    "t": "text"
   },
   {
    "k": "DamageReductions",
    "z": "减伤条目",
    "t": "list",
    "h": "每行一条减伤规则"
   },
   {
    "k": "BypassedBy",
    "z": "可穿透",
    "t": "list",
    "h": "每行一个伤害类型标签"
   }
  ],
  "UseEffects": [
   {
    "k": "CanSprint",
    "z": "可疾跑使用",
    "t": "bool"
   },
   {
    "k": "SpeedMultiplier",
    "z": "速度倍率",
    "t": "num"
   }
  ],
  "SwingAnimation": [
   {
    "k": "Type",
    "z": "动画类型",
    "t": "enum",
    "o": [
     "WHACK",
     "NONE",
     "STAB"
    ]
   },
   {
    "k": "Duration",
    "z": "时长（tick）",
    "t": "num"
   }
  ],
  "MinimumAttackCharge": [
   {
    "k": "value",
    "z": "最小充能",
    "t": "num",
    "h": "0.0–1.0"
   }
  ],
  "PaintingVariant": [
   {
    "k": "variant",
    "z": "画作",
    "t": "text",
    "h": "如 minecraft:skull_and_roses"
   }
  ],
  "Compostable": [
   {
    "k": "Layers",
    "z": "堆肥层数",
    "t": "num",
    "h": "1–8，或原版堆肥几率 id"
   }
  ]
 },
 "fancyDrops": {
  "title": "掉落特效",
  "fields": [
   {
    "k": "DropGlowColor",
    "z": "发光颜色",
    "t": "text"
   },
   {
    "k": "DropBeamColor",
    "z": "光柱颜色",
    "t": "text"
   },
   {
    "k": "DropLootsplosion",
    "z": "掉落爆散",
    "t": "bool"
   },
   {
    "k": "DropHologram",
    "z": "掉落全息",
    "t": "bool"
   },
   {
    "k": "DropVFX",
    "z": "粒子效果",
    "t": "text"
   },
   {
    "k": "DropVFXMaterial",
    "z": "粒子材质",
    "t": "text"
   },
   {
    "k": "DropVFXData",
    "z": "粒子数据",
    "t": "text"
   },
   {
    "k": "DropVFXColor",
    "z": "粒子颜色",
    "t": "text"
   },
   {
    "k": "DropBillboarding",
    "z": "始终朝向玩家",
    "t": "bool"
   },
   {
    "k": "DropBrightness",
    "z": "亮度",
    "t": "num"
   },
   {
    "k": "DropClientSide",
    "z": "仅客户端显示",
    "t": "bool"
   }
  ]
 }
};
