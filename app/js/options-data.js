/* 自动生成：python tools/build_options_js.py —— 不要手改 */
window.MM_OPTS = {
 "universal": [
  {
   "k": "AlwaysShowName",
   "zh": "始终显示名字",
   "tip": "名牌一直可见，不受距离影响",
   "type": "bool",
   "def": false,
   "desc": "Whether the name-tag is always displayed. Equivalent to the NBT-tag CustomNameVisible. Defaults to false.",
   "subs": []
  },
  {
   "k": "AttackSpeed",
   "zh": "攻击速度",
   "tip": "每秒攻击次数，默认跟随原版",
   "type": "text",
   "def": "",
   "desc": "The attack speed of the mob Defaults to vanilla attack speed of the respective mobs",
   "subs": []
  },
  {
   "k": "VisibleByDefault",
   "zh": "默认可见",
   "tip": "生成或加载时是否可见",
   "type": "bool",
   "def": true,
   "desc": "Sets whether the mob is visible by default when the mobs spawns or when the mob gets loaded. Defaults to true.",
   "subs": []
  },
  {
   "k": "Invisible",
   "zh": "永久隐身",
   "tip": "直接隐身，不用喝隐身药水",
   "type": "bool",
   "def": false,
   "desc": "Sets the permanent invisibility effect on the mob; no need to apply invisibility potion with ~onSpawn trigger. Defaults to false.",
   "subs": [
    "Armor Stand"
   ]
  },
  {
   "k": "Collidable",
   "zh": "有碰撞体积",
   "tip": "关掉后玩家可以从它身上穿过",
   "type": "bool",
   "def": true,
   "desc": "Whether the mob has collisions. Collisions in Minecraft are bidirectional, so this would need to be set to false on both the entity colliders to ensure that no collisions takes place but will also stop the player from pushing the mob. Defaults to true.",
   "subs": []
  },
  {
   "k": "DigOutOfGround",
   "zh": "卡进方块自动上浮",
   "tip": "窒息时向上传送两格",
   "type": "bool",
   "def": false,
   "desc": "Teleports the mob two blocks up if it takes SUFFOCATION damage. Defaults to false.",
   "subs": []
  },
  {
   "k": "Despawn",
   "zh": "远离玩家后消失",
   "tip": "走远就移除，省服务器性能",
   "type": "bool",
   "def": true,
   "desc": "Determines how the mob will despawn. This option should be turned on if you're using a lot of mob spawners or entities will overwhelm your server, or the entity you are making requires some special behavior regarding its despawn policy (Npcs, Bosses etc.) Defaults to true.",
   "subs": []
  },
  {
   "k": "FollowRange",
   "zh": "索敌范围",
   "tip": "多少格内会锁定目标",
   "type": "number",
   "def": 32,
   "desc": "The range in blocks within which a mob will target to attack or track an entity. Defaults to vanilla follow range - 32.",
   "subs": []
  },
  {
   "k": "Glowing",
   "zh": "发光描边",
   "tip": "隔墙也能看到它的轮廓",
   "type": "bool",
   "def": false,
   "desc": "Sets whether the mob is permanently glowing. Defaults to false.",
   "subs": []
  },
  {
   "k": "HealOnReload",
   "zh": "区块重载回血",
   "tip": "区块重新加载时恢复满血",
   "type": "bool",
   "def": false,
   "desc": "Allows non-despawning mobs to heal once the chunk they are in gets reloaded. Defaults to false.",
   "subs": []
  },
  {
   "k": "Hidden",
   "zh": "隐藏",
   "tip": "不出现在命令提示和怪物列表里",
   "type": "bool",
   "def": false,
   "desc": "If true the mob will be left out of command suggestions and the mob browser menu, useful for template mobs and internal utility mobs. Defaults to false.",
   "subs": []
  },
  {
   "k": "Invincible",
   "zh": "无敌",
   "tip": "免疫一切伤害",
   "type": "bool",
   "def": false,
   "desc": "Makes the mob completely invincible to all types of damage. This option cannot be changed by command skills. Defaults to false.",
   "subs": []
  },
  {
   "k": "Interactable",
   "zh": "可被交互",
   "tip": "玩家能否右键它",
   "type": "bool",
   "def": false,
   "desc": "Sets whether the mob can be interacted with. If the mob is an armor stand, it will deny any interaction with the equipments. Defaults to false.",
   "subs": []
  },
  {
   "k": "LockPitch",
   "zh": "锁定视角俯仰",
   "tip": "头不能上下看，只能平视",
   "type": "bool",
   "def": false,
   "desc": "Keeps the mob's head from looking up/down. Defaults to false.",
   "subs": []
  },
  {
   "k": "KnockbackResistance",
   "zh": "击退抗性",
   "tip": "0~1，1 表示完全打不退",
   "type": "number",
   "def": 0,
   "desc": "A percentage of knockback resisted from attacks. This option can be anywhere between 0 and 1. But a mob with 100% knockback resistance can still be knocked back by a bow's enchantment: ARROW_KNOCKBACK (punch enchantment). For true knockback resistance, see the velocity mechanic page. Defaults to 0.",
   "subs": []
  },
  {
   "k": "MaxCombatDistance",
   "zh": "最大交战距离",
   "tip": "超过这个距离玩家就打不到它",
   "type": "number",
   "def": 256,
   "desc": "Prevents players that are a number of blocks away from damaging the mob. Setting this option to a number less than the distance of a certain mob skill or attack will ensure that the mob can damage the player and will not be as easy to exploit. Defaults to 256.",
   "subs": []
  },
  {
   "k": "MovementSpeed",
   "zh": "移动速度",
   "tip": "0.2 左右是正常速度，1 以上会飘",
   "type": "number",
   "def": 0.2,
   "desc": "The movement speed of the mob. Most mobs has a default move speed of 0.2 and any value higher than 1 tends to make a mob difficult or impossible to fight.",
   "subs": []
  },
  {
   "k": "NoAI",
   "zh": "关闭 AI",
   "tip": "不会移动也不会攻击",
   "type": "bool",
   "def": false,
   "desc": "Whether the mob should have AI. This option overrides any AI goals specified in AIGoalSelectors. As opposed to AIGoalSelectors, this will work on entities that have hardcoded AI. And if this is set to true, the mob will never cast any skills. Defaults to false.",
   "subs": []
  },
  {
   "k": "NoDamageTicks",
   "zh": "受伤无敌帧",
   "tip": "受伤后多少刻免疫，默认 10",
   "type": "number",
   "def": 10,
   "desc": "Defines how long in ticks the mob is invulnerable after taking damage. If ImmunityTables is enabled for the mob, then NoDamageTicks will be per player instead of global. Defaults to 10.",
   "subs": []
  },
  {
   "k": "NoGravity",
   "zh": "不受重力",
   "tip": "不会下落（也不能用 velocity 技能）",
   "type": "bool",
   "def": false,
   "desc": "Whether the mob should not have gravity. If set to true, the mob CANNOT have the velocity mechanic used on it. Defaults to false.",
   "subs": []
  },
  {
   "k": "PassthroughDamage",
   "zh": "伤害转移给父实体",
   "tip": "伤害由它的父级承担",
   "type": "bool",
   "def": false,
   "desc": "Causes all damage taken to be redirected to the mob's parent, if one exists. A mob's parent is the entity that initially summoned the mob. Defaults to false.",
   "subs": []
  },
  {
   "k": "PreventItemPickup",
   "zh": "不捡地上的物品",
   "tip": "默认就是开",
   "type": "bool",
   "def": true,
   "desc": "Prevent mobs from picking up items; Defaults to true.",
   "subs": []
  },
  {
   "k": "PreventLeashing",
   "zh": "免疫拴绳",
   "tip": "默认就是开",
   "type": "bool",
   "def": true,
   "desc": "Whether to prevent a leash from being placed on the mob. Defaults to true.",
   "subs": []
  },
  {
   "k": "PreventMobKillDrops",
   "zh": "击杀不掉落",
   "tip": "它杀死的目标不掉战利品",
   "type": "bool",
   "def": false,
   "desc": "Prevents a MythicMob's target from dropping loot. Defaults to false.",
   "subs": []
  },
  {
   "k": "PreventOtherDrops",
   "zh": "不掉原版掉落",
   "tip": "只掉 Drops 里写明的东西",
   "type": "bool",
   "def": false,
   "desc": "Prevents the mob from dropping its vanilla loot table. Defaults to false.",
   "subs": []
  },
  {
   "k": "PreventRandomEquipment",
   "zh": "不随机穿装备",
   "tip": "避免僵尸自带盔甲",
   "type": "bool",
   "def": false,
   "desc": "Prevents the mob from spawning with random equipment. Defaults to false.",
   "subs": []
  },
  {
   "k": "PreventRenaming",
   "zh": "禁止改名",
   "tip": "命名牌对它无效",
   "type": "bool",
   "def": true,
   "desc": "Prevents the mob from being renamed using a nametag. Defaults to true.",
   "subs": []
  },
  {
   "k": "PreventSunburn",
   "zh": "不被阳光烧",
   "tip": "僵尸、骷髅类必备",
   "type": "bool",
   "def": false,
   "desc": "Prevents the mob from burning in the sun. Defaults to false.",
   "subs": []
  },
  {
   "k": "PreventTransformation",
   "zh": "禁止转化",
   "tip": "不会变成溺尸、僵尸村民",
   "type": "bool",
   "def": true,
   "desc": "Sets whether the mob should be prevented from being turned into other entities. Defaults to true.",
   "subs": []
  },
  {
   "k": "PreventVanillaDamage",
   "zh": "免疫原版伤害",
   "tip": "只受技能伤害",
   "type": "bool",
   "def": false,
   "desc": "Cancels every instance of the mob dealing \"regular\" vanilla damage, canceling it. Skills that triggers onAttack will still be executed. Defaults to false.",
   "subs": []
  },
  {
   "k": "RepeatAllSkills",
   "zh": "技能可重复触发",
   "tip": "允许同一个技能反复执行",
   "type": "bool",
   "def": false,
   "desc": "Whether to repeat HP based skills if a mob heals back above the health threshold. Defaults to false.",
   "subs": []
  },
  {
   "k": "ReviveHealth",
   "zh": "复活血量",
   "tip": "被复活后回复到多少血",
   "type": "number",
   "def": 0,
   "desc": "When the mob's death event gets cancelled (via a Cancelevent mechanic ~onDeath) the one specified is the amount of health the mob's will be set to. If the value is -1, the mob will heal to its own max health value.",
   "subs": []
  },
  {
   "k": "Scale",
   "zh": "体型缩放",
   "tip": "1 是正常大小，-1 表示不设置",
   "type": "number",
   "def": -1,
   "desc": "The scale of the mob. If set to -1, the option is ignored. Defaults to -1.",
   "subs": []
  },
  {
   "k": "ShowHealth",
   "zh": "显示血量",
   "tip": "名字下方显示血量数字",
   "type": "bool",
   "def": false,
   "desc": "Displays the health of the mob through messages broadcast within a radius and formatting by Mobs.ShowHealth.Radius and Mobs.ShowHealth.Formatting, respectively, in /plugins/MythicMobs/config.yml Defaults to false.",
   "subs": []
  },
  {
   "k": "Silent",
   "zh": "安静",
   "tip": "不播放原版音效",
   "type": "bool",
   "def": false,
   "desc": "Whether a mob should use vanilla sound effects. Defaults to false.",
   "subs": []
  },
  {
   "k": "UseThreatTable",
   "zh": "使用威胁表",
   "tip": "按仇恨值选择攻击目标",
   "type": "bool",
   "def": false,
   "desc": "Whether the mob should have Threat Tables enabled",
   "subs": []
  },
  {
   "k": "RandomizeProperties",
   "zh": "随机属性",
   "tip": "生成时随机化部分属性",
   "type": "bool",
   "def": true,
   "desc": "RandomizeProperties is the vanilla feature in charge of giving variations to mobs when they spawn, such as equipment, zombie leader status, animal variations, zombie/spider jockey, mob size, chance of spawning as baby, etc This is ideal if you are heavily overriding entity behaviors and don't want the natural randomization Defaults to true",
   "subs": []
  }
 ],
 "groups": [
  {
   "id": "Boat & BoatChest",
   "zh": "船 / 运输船",
   "entities": [
    "FROG",
    "VILLAGER",
    "WANDERING_TRADER",
    "ZOMBIE_VILLAGER"
   ],
   "items": [
    {
     "k": "Type",
     "zh": "变体类型",
     "tip": "例如橡木船 / 云杉船、职业等级",
     "type": "text",
     "def": "",
     "desc": "The type of the boat entity. Aliases: BoatType. Defaults to OAK",
     "subs": [
      "Boat & BoatChest",
      "Frog",
      "Villagers"
     ]
    }
   ]
  },
  {
   "id": "Breedable mobs",
   "zh": "可繁殖生物",
   "entities": [
    "COW",
    "PIG",
    "SHEEP",
    "CHICKEN",
    "WOLF",
    "CAT",
    "HORSE",
    "LLAMA",
    "RABBIT",
    "TURTLE",
    "PANDA",
    "FOX",
    "BEE",
    "GOAT",
    "STRIDER",
    "HOGLIN"
   ],
   "items": [
    {
     "k": "Age",
     "zh": "年龄",
     "tip": "幼年生物的成长计时",
     "type": "number",
     "def": 0,
     "desc": "The age of the mob. Use -1 for Baby and 1 for Adults. Usable on any mob that can age. For example: Sheep, Pigs, Cows... When above 0, represents the number of ticks before this mob can breed again. Equivalent to the Age NBT. Use very low negative numbers to mess with the mobs model (not supported). May not be working properly under some situations. Defaults to 1.",
     "subs": [
      "Breedable mobs"
     ]
    },
    {
     "k": "AgeLock",
     "zh": "锁定年龄",
     "tip": "永远保持当前大小",
     "type": "bool",
     "def": false,
     "desc": "Whether the mobs age should be locked in place. Useful for keeping a baby mob from growing up over time. This is required if you want Age option to work over time. Defaults to false.",
     "subs": [
      "Breedable mobs"
     ]
    },
    {
     "k": "Adult",
     "zh": "强制成年",
     "tip": "生成时就是成年",
     "type": "bool",
     "def": false,
     "desc": "Sets adult status of mob. Use if Age does not work.",
     "subs": [
      "Breedable mobs"
     ]
    },
    {
     "k": "Baby",
     "zh": "强制幼年",
     "tip": "生成时就是幼年",
     "type": "bool",
     "def": false,
     "desc": "Sets baby/adult status of mob. Use if Age does not work.",
     "subs": [
      "Breedable mobs"
     ]
    }
   ]
  },
  {
   "id": "Neutral Entities",
   "zh": "中立生物",
   "entities": [
    "WOLF",
    "BEE",
    "POLAR_BEAR",
    "PANDA",
    "LLAMA",
    "IRON_GOLEM",
    "DOLPHIN",
    "GOAT"
   ],
   "items": [
    {
     "k": "Angry",
     "zh": "愤怒状态",
     "tip": "中立生物是否被激怒",
     "type": "bool",
     "def": false,
     "desc": "Whether the mob will spawn angry or not.",
     "subs": [
      "Neutral Entities"
     ]
    }
   ]
  },
  {
   "id": "Slimes & Magma Cubes",
   "zh": "史莱姆 / 岩浆怪",
   "entities": [
    "SLIME",
    "MAGMA_CUBE"
   ],
   "items": [
    {
     "k": "PreventSlimeSplit",
     "zh": "禁止分裂",
     "tip": "史莱姆死亡时不再分裂",
     "type": "bool",
     "def": false,
     "desc": "Prevents slimes and magmacubes from splitting. Default to false.",
     "subs": [
      "Slimes & Magma Cubes"
     ]
    }
   ]
  },
  {
   "id": "Entities with variable size",
   "zh": "体型可变生物",
   "entities": [
    "SLIME",
    "MAGMA_CUBE",
    "PHANTOM"
   ],
   "items": [
    {
     "k": "Size",
     "zh": "尺寸",
     "tip": "史莱姆、岩浆怪的大小",
     "type": "number",
     "def": 1,
     "desc": "Sets the size of slimes, magma cubes, and phantoms. Can get VERY big and get exponentially larger with each increase. Extremely high size will cause server lag and possibly crashes. Default to 1to8 (Phantoms is 1)",
     "subs": [
      "Entities with variable size"
     ]
    }
   ]
  },
  {
   "id": "Raiders",
   "zh": "袭击者",
   "entities": [
    "PILLAGER",
    "VINDICATOR",
    "EVOKER",
    "ILLUSIONER",
    "RAVAGER",
    "WITCH"
   ],
   "items": [
    {
     "k": "CanJoinRaid",
     "zh": "可加入袭击",
     "tip": "掠夺者袭击事件",
     "type": "bool",
     "def": true,
     "desc": "Whether the entity can join a raid. Defaults to true.",
     "subs": [
      "Raiders"
     ]
    },
    {
     "k": "PatrolLeader",
     "zh": "巡逻队长",
     "tip": "生成时携带袭击旗帜",
     "type": "bool",
     "def": false,
     "desc": "Whether the entity is the leader of a patrol. Defaults to false.",
     "subs": [
      "Raiders"
     ]
    },
    {
     "k": "PatrolSpawnPoint",
     "zh": "巡逻刷新点",
     "tip": "作为巡逻队的出生位置",
     "type": "bool",
     "def": false,
     "desc": "Defaults to false.",
     "subs": [
      "Raiders"
     ]
    }
   ]
  },
  {
   "id": "Tameable Mobs",
   "zh": "可驯服生物",
   "entities": [
    "WOLF",
    "CAT",
    "HORSE",
    "DONKEY",
    "MULE",
    "LLAMA",
    "PARROT"
   ],
   "items": [
    {
     "k": "Tameable",
     "zh": "可驯服",
     "tip": "玩家能否用食物驯服它",
     "type": "bool",
     "def": false,
     "desc": "Whether players are able to tame the mob. Used for wolves, cats and horses. Defaults to false.",
     "subs": [
      "Tameable Mobs"
     ]
    }
   ]
  },
  {
   "id": "Zombies (all variants)",
   "zh": "僵尸系",
   "entities": [
    "ZOMBIE",
    "ZOMBIE_VILLAGER",
    "HUSK",
    "DROWNED",
    "ZOMBIFIED_PIGLIN",
    "SKELETON",
    "STRAY",
    "WITHER_SKELETON"
   ],
   "items": [
    {
     "k": "PreventJockeyMounts",
     "zh": "禁止骑乘组合",
     "tip": "不生成鸡骑士、蜘蛛骑士",
     "type": "bool",
     "def": false,
     "desc": "Sets whether the zombie will be prevented from spawning as a jockey. Only works for Zombies. Defaults to false.",
     "subs": [
      "Zombies (all variants)"
     ]
    },
    {
     "k": "PreventConversion",
     "zh": "禁止转化",
     "tip": "不会被环境改变形态",
     "type": "bool",
     "def": false,
     "desc": "Prevents the Zombie from being converted into other types of zombies. Defaults to false.",
     "subs": [
      "Zombies (all variants)",
      "Skeleton"
     ]
    },
    {
     "k": "ReinforcementsChance",
     "zh": "增援概率",
     "tip": "僵尸受伤时召唤同伴的几率",
     "type": "number",
     "def": 0,
     "desc": "Chance for zombies to spawn reinforcements on taking damage. Should be a number between 0 and 1 (0% and 100% chance). Only works for Zombies. Defaults to 0.",
     "subs": [
      "Zombies (all variants)"
     ]
    }
   ]
  }
 ],
 "mobs": [
  {
   "id": "Armor Stand",
   "zh": "盔甲架",
   "entities": [
    "ARMOR_STAND"
   ],
   "items": [
    {
     "k": "CanMove",
     "zh": "可移动",
     "tip": "是否响应移动",
     "type": "text",
     "def": "",
     "desc": "Sets whether an armor stand can move. Defaults to true and requires PaperSpigot",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "CanTick",
     "zh": "参与 tick 更新",
     "tip": "关掉可省性能",
     "type": "text",
     "def": "",
     "desc": "Sets whether an armor stand can tick. Defaults to true and requires PaperSpigot",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "HasArms",
     "zh": "有手臂",
     "tip": "盔甲架是否显示两只手",
     "type": "bool",
     "def": false,
     "desc": "Sets whether an armor stand has arms. Defaults to false.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "HasBasePlate",
     "zh": "有底座",
     "tip": "脚下那块石板",
     "type": "bool",
     "def": true,
     "desc": "Sets whether an armor stand has a baseplate. Defaults to true",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "HasGravity",
     "zh": "受重力",
     "tip": "会不会往下掉",
     "type": "bool",
     "def": true,
     "desc": "Sets whether the armor stand is affected by gravity. Defaults to true.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "ItemBody",
     "zh": "身体装备",
     "tip": "胸甲槽",
     "type": "text",
     "def": "",
     "desc": "Designates the Mythic Item that should go in the body/chest slot of an armor stand.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "ItemFeet",
     "zh": "脚部装备",
     "tip": "靴子槽",
     "type": "text",
     "def": "",
     "desc": "Designates the Mythic Item that should go in the feet slot of an armor stand.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "ItemHand",
     "zh": "主手物品",
     "tip": "右手拿的东西",
     "type": "text",
     "def": "",
     "desc": "Designates the Mythic Item that should go in the main hand slot of an armor stand.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "ItemOffhand",
     "zh": "副手物品",
     "tip": "左手拿的东西",
     "type": "text",
     "def": "",
     "desc": "Designates the Mythic Item that should go in the off hand slot of an armor stand.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "ItemHead",
     "zh": "头部装备",
     "tip": "头盔槽",
     "type": "text",
     "def": "",
     "desc": "Designates the Mythic Item that should go in the helmet slot of an armor stand.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "ItemLegs",
     "zh": "腿部装备",
     "tip": "护腿槽",
     "type": "text",
     "def": "",
     "desc": "Designates the Mythic Item that should go in the leggings slot of an armor stand.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "Marker",
     "zh": "标记模式",
     "tip": "无碰撞无体积，只当坐标用",
     "type": "bool",
     "def": false,
     "desc": "Sets the armor stand as a marker. This option prevents the armor stand from being destroyed in game, making it completely non-interactable. Defaults to false.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "Small",
     "zh": "小型",
     "tip": "缩小版",
     "type": "bool",
     "def": false,
     "desc": "Sets the armor stand to small variant. Defaults to false.",
     "subs": [
      "Armor Stand"
     ]
    },
    {
     "k": "Pose",
     "zh": "姿势",
     "tip": "站立、坐下、睡觉等",
     "type": "text",
     "def": "",
     "desc": "Sets the body part's current pose. Default values are 0,0,0 and accepts ranges like #to#. These will go under the Pose section instead of the Options section.",
     "subs": [
      "Armor Stand"
     ]
    }
   ]
  },
  {
   "id": "Bee",
   "zh": "蜜蜂",
   "entities": [
    "BEE"
   ],
   "items": [
    {
     "k": "Anger",
     "zh": "愤怒值",
     "tip": "越高越容易蜇人",
     "type": "number",
     "def": 0,
     "desc": "Sets the time in ticks until bee anger ends. If set to 0 the bee will not be angry. Defaults to 0.",
     "subs": [
      "Bee"
     ]
    },
    {
     "k": "HasNectar",
     "zh": "带花粉",
     "tip": "采完花后身上有花粉",
     "type": "bool",
     "def": false,
     "desc": "Whether the bee is carrying pollen. Defaults to false.",
     "subs": [
      "Bee"
     ]
    },
    {
     "k": "HasStung",
     "zh": "已蜇过人",
     "tip": "蜇完后会失去螫针",
     "type": "bool",
     "def": false,
     "desc": "Whether the bee has stung an entity. Defaults to false.",
     "subs": [
      "Bee"
     ]
    },
    {
     "k": "PreventStingerLoss",
     "zh": "不失去螫针",
     "tip": "蜇人后螫针还在",
     "type": "bool",
     "def": false,
     "desc": "Whether to prevent the bee from losing its stinger once it hits an entity. Defaults to false.",
     "subs": [
      "Bee"
     ]
    }
   ]
  },
  {
   "id": "Camel",
   "zh": "骆驼",
   "entities": [
    "CAMEL",
    "HORSE",
    "DONKEY",
    "MULE",
    "SKELETON_HORSE",
    "ZOMBIE_HORSE",
    "PIG",
    "CAT",
    "LLAMA",
    "TRADER_LLAMA"
   ],
   "items": [
    {
     "k": "Saddled",
     "zh": "已装鞍",
     "tip": "生成时就带着鞍",
     "type": "bool",
     "def": false,
     "desc": "Whether the entity is saddled or not. Defaults to false.",
     "subs": [
      "Camel",
      "Horses, Donkeys, and Mules",
      "Pig"
     ]
    },
    {
     "k": "Tamed",
     "zh": "已驯服",
     "tip": "生成时就是驯服状态",
     "type": "bool",
     "def": false,
     "desc": "Whether the entity is tamed or not. Defaults to false.",
     "subs": [
      "Camel",
      "Cat",
      "Horses, Donkeys, and Mules",
      "Llama"
     ]
    }
   ]
  },
  {
   "id": "Cat",
   "zh": "猫",
   "entities": [
    "CAT"
   ],
   "items": [
    {
     "k": "CatType",
     "zh": "猫的品种",
     "tip": "黑猫、暹罗猫、橘猫等",
     "type": "text",
     "def": "",
     "desc": "Sets the type of cat. Types can be ALL_BLACK, BLACK, BRITISH_SHORTHAIR, CALICO, PERSIAN, JELLIE, RAGDOLL, RED, SIAMESE, TABBY or WHITE.",
     "subs": [
      "Cat"
     ]
    },
    {
     "k": "CollarColor",
     "zh": "项圈颜色",
     "tip": "猫和狼戴的项圈颜色",
     "type": "text",
     "def": "",
     "desc": "Sets the color of the cat's collar. Available colors are: BLACK, BLUE, BROWN, CYAN, GRAY, GREEN, LIGHT_BLUE, LIGHT_GRAY, LIME, MAGENTA, ORANGE, PINK, PURPLE, RED, WHITE, or YELLOW.",
     "subs": [
      "Cat"
     ]
    }
   ]
  },
  {
   "id": "Chicken",
   "zh": "鸡",
   "entities": [
    "CHICKEN"
   ],
   "items": [
    {
     "k": "Jockey",
     "zh": "骑乘幼年生物",
     "tip": "让小僵尸骑在它身上",
     "type": "bool",
     "def": false,
     "desc": "Whether or not the chicken has the IsChickenJockey NBT set to 1. If true, the chicken can naturally despawn, drops 10 experience upon death instead of 1-3 and cannot lay eggs. Defaults to false.",
     "subs": [
      "Chicken"
     ]
    }
   ]
  },
  {
   "id": "Cow",
   "zh": "牛 / 哞菇",
   "entities": [
    "COW",
    "MOOSHROOM",
    "CHICKEN",
    "PARROT",
    "PIG",
    "WOLF"
   ],
   "items": [
    {
     "k": "Variant",
     "zh": "变体",
     "tip": "具体外观种类",
     "type": "text",
     "def": "",
     "desc": "The variant to use for the cow entity. Accepts a namespace, if there is a datapack adding more variants. Read more on the subject on the Minecraft Wiki here and here",
     "subs": [
      "Cow",
      "Chicken",
      "Parrot",
      "Pig",
      "Wolfs"
     ]
    }
   ]
  },
  {
   "id": "Creepers",
   "zh": "苦力怕",
   "entities": [
    "CREEPER"
   ],
   "items": [
    {
     "k": "ExplosionRadius",
     "zh": "爆炸半径",
     "tip": "苦力怕自爆的范围",
     "type": "number",
     "def": -1,
     "desc": "Sets the radius/power of the creepers explosion. Negative values are ignored, and the explosion radius remains the creeper's default one. Defaults to -1.",
     "subs": [
      "Creepers"
     ]
    },
    {
     "k": "FuseTicks",
     "zh": "引信时长",
     "tip": "点燃后多久爆炸（游戏刻）",
     "type": "number",
     "def": -1,
     "desc": "Sets the number of ticks it takes for creepers to explode. Negative values are ignored, and the time it takes remains the creeper's default one. Defaults to -1.",
     "subs": [
      "Creepers",
      "TNT"
     ]
    },
    {
     "k": "SuperCharged",
     "zh": "高压状态",
     "tip": "闪电苦力怕，爆炸更强",
     "type": "bool",
     "def": false,
     "desc": "Whether the creeper should spawn as a super charged creeper. Defaults to false.",
     "subs": [
      "Creepers"
     ]
    },
    {
     "k": "PreventSuicide",
     "zh": "禁止自爆",
     "tip": "苦力怕不会自爆",
     "type": "bool",
     "def": false,
     "desc": "Prevents creepers from dying upon exploding. Set mobGriefing gamerule to true for this option to work. Defaults to false.",
     "subs": [
      "Creepers"
     ]
    }
   ]
  },
  {
   "id": "Copper_Golem",
   "zh": "铜傀儡",
   "entities": [
    "COPPER_GOLEM"
   ],
   "items": [
    {
     "k": "WeatheringState",
     "zh": "氧化程度",
     "tip": "铜傀儡的氧化阶段",
     "type": "text",
     "def": "",
     "desc": "The weathering state of the golem. Can be any of these values",
     "subs": [
      "Copper_Golem"
     ]
    },
    {
     "k": "Waxed",
     "zh": "已涂蜡",
     "tip": "阻止继续氧化",
     "type": "bool",
     "def": true,
     "desc": "Whether the copper golem is waxed. Defaults to true.",
     "subs": [
      "Copper_Golem"
     ]
    }
   ]
  },
  {
   "id": "Enderman",
   "zh": "末影人",
   "entities": [
    "ENDERMAN"
   ],
   "items": [
    {
     "k": "PreventTeleport",
     "zh": "禁止传送",
     "tip": "末影人不会瞬移",
     "type": "bool",
     "def": false,
     "desc": "Meant for Endermen but //might// work on other mobs. May break teleport skills! Defaults to false.",
     "subs": [
      "Enderman"
     ]
    },
    {
     "k": "HeldBlock",
     "zh": "手持方块",
     "tip": "末影人手里抱的方块",
     "type": "text",
     "def": "AIR",
     "desc": "Sets the block that the Enderman is carrying. Defaults to AIR.",
     "subs": [
      "Enderman"
     ]
    }
   ]
  },
  {
   "id": "Fox",
   "zh": "狐狸",
   "entities": [
    "FOX"
   ],
   "items": [
    {
     "k": "FoxType",
     "zh": "狐狸种类",
     "tip": "红狐或雪狐",
     "type": "text",
     "def": "",
     "desc": "Determines the type of the fox. Can be RED or SNOW. Defaults to RED.",
     "subs": [
      "Fox"
     ]
    }
   ]
  },
  {
   "id": "Goat",
   "zh": "山羊",
   "entities": [
    "GOAT"
   ],
   "items": [
    {
     "k": "Screaming",
     "zh": "尖叫山羊",
     "tip": "会主动撞生物",
     "type": "bool",
     "def": false,
     "desc": "Sets if this is a screaming goat. A screaming goat makes screaming sounds and rams more often. Defaults to false.",
     "subs": [
      "Goat"
     ]
    }
   ]
  },
  {
   "id": "Hoglin",
   "zh": "疣猪兽",
   "entities": [
    "HOGLIN",
    "ZOGLIN",
    "PIGLIN",
    "PIGLIN_BRUTE"
   ],
   "items": [
    {
     "k": "ImmuneToZombification",
     "zh": "免疫僵尸化",
     "tip": "在下界以外不会变僵尸",
     "type": "bool",
     "def": false,
     "desc": "Whether or not the hoglin is immune to being zombified. Defaults to false.",
     "subs": [
      "Hoglin",
      "Piglin",
      "Piglin Brute"
     ]
    },
    {
     "k": "Huntable",
     "zh": "可被猎杀",
     "tip": "其他生物会不会攻击它",
     "type": "bool",
     "def": true,
     "desc": "Whether the hoglin is able to be hunted by piglins. Defaults to true.",
     "subs": [
      "Hoglin"
     ]
    }
   ]
  },
  {
   "id": "Horses, Donkeys, and Mules",
   "zh": "马 / 驴 / 骡",
   "entities": [
    "HORSE",
    "DONKEY",
    "MULE",
    "SKELETON_HORSE",
    "ZOMBIE_HORSE",
    "LLAMA",
    "TRADER_LLAMA"
   ],
   "items": [
    {
     "k": "HorseArmor",
     "zh": "马铠",
     "tip": "马身上穿的护甲",
     "type": "text",
     "def": "",
     "desc": "Used for horses to set the type of armor they have on. Can be iron, gold, or diamond [armor_type] must be in lower case",
     "subs": [
      "Horses, Donkeys, and Mules"
     ]
    },
    {
     "k": "CarryingChest",
     "zh": "携带箱子",
     "tip": "驴、骡背上的箱子",
     "type": "bool",
     "def": false,
     "desc": "Used for donkeys to set whether they are carrying a chest or not. Defaults to false.",
     "subs": [
      "Horses, Donkeys, and Mules",
      "Llama"
     ]
    },
    {
     "k": "HorseColor",
     "zh": "马毛色",
     "tip": "白、栗、黑等",
     "type": "text",
     "def": "",
     "desc": "Sets color of the horse. Colors must be uppercase,can be any of the Spigot Horse colors.",
     "subs": [
      "Horses, Donkeys, and Mules"
     ]
    },
    {
     "k": "HorseStyle",
     "zh": "马花纹",
     "tip": "无纹、白斑、斑点等",
     "type": "text",
     "def": "",
     "desc": "Sets the style of the horse. Styles can be any of the Spigot Horse Style",
     "subs": [
      "Horses, Donkeys, and Mules"
     ]
    },
    {
     "k": "HorseType",
     "zh": "马的类型",
     "tip": "普通马、驴、骡、骷髅马等",
     "type": "text",
     "def": "",
     "desc": "Defines the type of horse Can be any of the Spigot Horse variants Defaults to HORSE Removed in MC 1.11+, useType instead.",
     "subs": [
      "Horses, Donkeys, and Mules"
     ]
    }
   ]
  },
  {
   "id": "Interaction",
   "zh": "交互实体",
   "entities": [],
   "items": [
    {
     "k": "Height",
     "zh": "高",
     "tip": "交互实体的高度",
     "type": "number",
     "def": 1,
     "desc": "The Height of the Interaction entity. Defaults to 1.",
     "subs": [
      "Interaction"
     ]
    },
    {
     "k": "Width",
     "zh": "宽",
     "tip": "交互实体的宽度",
     "type": "number",
     "def": 1,
     "desc": "The Width of the Interaction entity. Defaults to the value of the Height option.",
     "subs": [
      "Interaction"
     ]
    },
    {
     "k": "Responsive",
     "zh": "可响应",
     "tip": "是否响应交互",
     "type": "bool",
     "def": true,
     "desc": "If the Interaction entity is responsive. Defaults to true.",
     "subs": [
      "Interaction"
     ]
    }
   ]
  },
  {
   "id": "IronGolem",
   "zh": "铁傀儡",
   "entities": [
    "IRON_GOLEM"
   ],
   "items": [
    {
     "k": "PlayerCreated",
     "zh": "玩家建造",
     "tip": "玩家放出来的铁傀儡",
     "type": "bool",
     "def": false,
     "desc": "Acts as if the player built the mob. Defaults to false.",
     "subs": [
      "IronGolem"
     ]
    }
   ]
  },
  {
   "id": "Item",
   "zh": "掉落物实体",
   "entities": [],
   "items": [
    {
     "k": "Item",
     "zh": "物品",
     "tip": "掉落物实体代表什么物品",
     "type": "text",
     "def": "STONE",
     "desc": "The material of the item entity. Defaults to STONE.",
     "subs": [
      "Item"
     ]
    },
    {
     "k": "Amount",
     "zh": "数量",
     "tip": "这堆物品有几个",
     "type": "number",
     "def": 1,
     "desc": "The amount of items in the itemstack. Defaults to 1.",
     "subs": [
      "Item"
     ]
    },
    {
     "k": "CanPickup",
     "zh": "可拾取",
     "tip": "玩家能不能捡起来",
     "type": "bool",
     "def": true,
     "desc": "If the itemstack can be picked up. Defaults to true.",
     "subs": [
      "Item"
     ]
    }
   ]
  },
  {
   "id": "Llama",
   "zh": "羊驼",
   "entities": [
    "LLAMA",
    "TRADER_LLAMA",
    "WOLF"
   ],
   "items": [
    {
     "k": "Color",
     "zh": "颜色",
     "tip": "羊驼、狼等的颜色",
     "type": "text",
     "def": "",
     "desc": "Sets color of the llama. Colors must be uppercase,can be any of the Spigot Llama colors.",
     "subs": [
      "Llama",
      "Wolfs"
     ]
    }
   ]
  },
  {
   "id": "MinecartChest",
   "zh": "运输矿车",
   "entities": [],
   "items": [
    {
     "k": "ChestContents",
     "zh": "箱子内容",
     "tip": "运输矿车里的物品",
     "type": "text",
     "def": "",
     "desc": "The droptable that will be put inside the chest.",
     "subs": [
      "MinecartChest"
     ]
    }
   ]
  },
  {
   "id": "Panda",
   "zh": "熊猫",
   "entities": [
    "PANDA"
   ],
   "items": [
    {
     "k": "MainGene",
     "zh": "显性基因",
     "tip": "熊猫的主要性格",
     "type": "text",
     "def": "NORMAL",
     "desc": "Sets the main gene that the panda can pass on to its offspring. Can be NORMAL, AGGRESSIVE, LAZY, WORRIED, PLAYFUL, WEAK, BROWN. Defaults to NORMAL.",
     "subs": [
      "Panda"
     ]
    },
    {
     "k": "HiddenGene",
     "zh": "隐性基因",
     "tip": "决定后代的隐藏基因",
     "type": "text",
     "def": "NORMAL",
     "desc": "Sets the hidden gene that the panda can pass on to its offspring. Can be NORMAL, AGGRESSIVE, LAZY, WORRIED, PLAYFUL, WEAK, BROWN. Defaults to NORMAL.",
     "subs": [
      "Panda"
     ]
    }
   ]
  },
  {
   "id": "Parrot",
   "zh": "鹦鹉",
   "entities": [
    "PARROT"
   ],
   "items": [
    {
     "k": "FlyingSpeed",
     "zh": "飞行速度",
     "tip": "鹦鹉的飞行速度",
     "type": "number",
     "def": -1,
     "desc": "The flying speed of the parrot. Defaults to -1 (The option is not applied)",
     "subs": [
      "Parrot"
     ]
    }
   ]
  },
  {
   "id": "Piglin",
   "zh": "猪灵",
   "entities": [
    "PIGLIN"
   ],
   "items": [
    {
     "k": "AbleToHunt",
     "zh": "可狩猎",
     "tip": "会不会主动攻击疣猪兽",
     "type": "bool",
     "def": true,
     "desc": "Whether or not the piglin is able to hunt. Defaults to true.",
     "subs": [
      "Piglin"
     ]
    }
   ]
  },
  {
   "id": "Rabbit",
   "zh": "兔子",
   "entities": [
    "RABBIT"
   ],
   "items": [
    {
     "k": "IsKillerBunny",
     "zh": "杀手兔",
     "tip": "会主动攻击玩家的兔子",
     "type": "bool",
     "def": false,
     "desc": "Alias: Angry. Sets the rabbit as the Killer Bunny. Defaults to false.",
     "subs": [
      "Rabbit"
     ]
    },
    {
     "k": "RabbitType",
     "zh": "兔子种类",
     "tip": "普通、杀手兔、Toast 等",
     "type": "text",
     "def": "",
     "desc": "Sets the type of rabbit. Types can be BLACK, BLACK_AND_WHITE, BROWN, GOLD, SALT_AND_PEPPER, THE_KILLER_BUNNY or WHITE",
     "subs": [
      "Rabbit"
     ]
    }
   ]
  },
  {
   "id": "Sheep",
   "zh": "羊",
   "entities": [
    "SHEEP"
   ],
   "items": [
    {
     "k": "Sheared",
     "zh": "已剪毛",
     "tip": "生成时就是剪过毛的状态",
     "type": "bool",
     "def": false,
     "desc": "Whether the Sheep is already sheared. Defaults to false.",
     "subs": [
      "Sheep"
     ]
    }
   ]
  },
  {
   "id": "Silverfish",
   "zh": "蠹虫",
   "entities": [
    "SILVERFISH"
   ],
   "items": [
    {
     "k": "PreventBlockInfection",
     "zh": "禁止感染方块",
     "tip": "蠹虫不会把方块变成虫蚀方块",
     "type": "bool",
     "def": false,
     "desc": "Prevent silverfish from infecting blocks. Defaults to false.",
     "subs": [
      "Silverfish"
     ]
    }
   ]
  },
  {
   "id": "Snow Golem",
   "zh": "雪傀儡",
   "entities": [
    "SNOW_GOLEM"
   ],
   "items": [
    {
     "k": "Derp",
     "zh": "歪南瓜头",
     "tip": "雪傀儡头上的南瓜歪着戴",
     "type": "bool",
     "def": false,
     "desc": "Whether the Snow Golem has its pumpkin already sheared. Defaults to false.",
     "subs": [
      "Snow Golem"
     ]
    },
    {
     "k": "PreventSnowFormation",
     "zh": "不留下雪迹",
     "tip": "走过的路不会积雪",
     "type": "bool",
     "def": false,
     "desc": "Prevent the Snow Golem from creating snow. Defaults to false.",
     "subs": [
      "Snow Golem"
     ]
    }
   ]
  },
  {
   "id": "TNT",
   "zh": "TNT",
   "entities": [],
   "items": [
    {
     "k": "ExplosionYield",
     "zh": "爆炸威力",
     "tip": "TNT 的爆炸强度",
     "type": "number",
     "def": -1,
     "desc": "Determines the strength of the explosion. Defaults to -1 (The normal TNT Explosion Yield is used).",
     "subs": [
      "TNT"
     ]
    },
    {
     "k": "Incendiary",
     "zh": "点燃火焰",
     "tip": "爆炸后留下火焰",
     "type": "bool",
     "def": false,
     "desc": "Whether the explosion is capable of starting fires. Defaults to false.",
     "subs": [
      "TNT"
     ]
    }
   ]
  },
  {
   "id": "Tropical Fish",
   "zh": "热带鱼",
   "entities": [
    "TROPICAL_FISH"
   ],
   "items": [
    {
     "k": "Pattern",
     "zh": "花纹",
     "tip": "热带鱼的图案",
     "type": "text",
     "def": "",
     "desc": "Sets the Shape/Pattern of the fish.",
     "subs": [
      "Tropical Fish"
     ]
    },
    {
     "k": "BodyColor",
     "zh": "身体颜色",
     "tip": "热带鱼的主色",
     "type": "text",
     "def": "",
     "desc": "Sets the Primary Color of the fish.",
     "subs": [
      "Tropical Fish"
     ]
    }
   ]
  },
  {
   "id": "Villagers",
   "zh": "村民",
   "entities": [
    "VILLAGER",
    "WANDERING_TRADER",
    "ZOMBIE_VILLAGER"
   ],
   "items": [
    {
     "k": "HasTrades",
     "zh": "有交易",
     "tip": "生成时自带交易选项",
     "type": "bool",
     "def": false,
     "desc": "Whether the villager can be traded with. Defaults to false.",
     "subs": [
      "Villagers"
     ]
    },
    {
     "k": "Profession",
     "zh": "职业",
     "tip": "农民、铁匠、图书管理员等",
     "type": "text",
     "def": "",
     "desc": "Specifies the Profession of the villager. Villagers without this option will roll a random profession on their initial spawn.",
     "subs": [
      "Villagers",
      "Zombie Villagers"
     ]
    },
    {
     "k": "Level",
     "zh": "职业等级",
     "tip": "决定交易内容多少",
     "type": "number",
     "def": 1,
     "desc": "Villager profession level, levels 1 - 5. Level 1 villagers might switch professions. If you want a villager to hold its profession, give them a level of 2 or higher. Required if setting villager professions.",
     "subs": [
      "Villagers"
     ]
    }
   ]
  },
  {
   "id": "Experience_orb",
   "zh": "经验球",
   "entities": [],
   "items": [
    {
     "k": "Experience",
     "zh": "经验值",
     "tip": "这团经验有多少经验",
     "type": "number",
     "def": 1,
     "desc": "Sets the amount of experience give by the experience orb mob. Defaults to 1.",
     "subs": [
      "Experience_orb"
     ]
    }
   ]
  },
  {
   "id": "Falling Blocks",
   "zh": "下落方块",
   "entities": [],
   "items": [
    {
     "k": "Block",
     "zh": "方块类型",
     "tip": "落沙、铁砧这类下落方块",
     "type": "text",
     "def": "STONE",
     "desc": "Determines the type of the block. Defaults to STONE.",
     "subs": [
      "Falling Blocks"
     ]
    },
    {
     "k": "BlockData",
     "zh": "方块数据",
     "tip": "方块的附加数据值",
     "type": "number",
     "def": 0,
     "desc": "Additional field for inputting blockdata. Defaults to 0.",
     "subs": [
      "Falling Blocks"
     ]
    },
    {
     "k": "DropsItem",
     "zh": "掉落自身方块",
     "tip": "摔碎后变成物品",
     "type": "bool",
     "def": true,
     "desc": "Should the entity be able to drops the falling block's item. Defaults to true.",
     "subs": [
      "Falling Blocks"
     ]
    },
    {
     "k": "HurtsEntities",
     "zh": "砸伤生物",
     "tip": "落下时砸到生物会造成伤害",
     "type": "bool",
     "def": true,
     "desc": "Damages entities on impact. Defaults to true.",
     "subs": [
      "Falling Blocks"
     ]
    },
    {
     "k": "ReplaceSpawnLocationBlock",
     "zh": "替换生成位置方块",
     "tip": "生成时替换脚下方块",
     "type": "bool",
     "def": false,
     "desc": "If the entity should replace the block at its spawn location. Defaults to false.",
     "subs": [
      "Falling Blocks"
     ]
    },
    {
     "k": "UseSpawnLocationType",
     "zh": "沿用生成位置方块",
     "tip": "使用原地点的方块类型",
     "type": "bool",
     "def": false,
     "desc": "If the type of the falling block should be the one at the spawn location. Defaults to false.",
     "subs": [
      "Falling Blocks"
     ]
    }
   ]
  }
 ]
};
