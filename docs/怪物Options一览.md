# 怪物 Options 全量一览

> 来源：官方 wiki `Mobs → Options`（抓取于 2026-10-21）。
> 共 **145** 个条目，去重后 **126** 个键。同一个键可能出现在多个生物分组下（例如 `Color`）。

| 分组 | 条目数 | 说明 |
|---|---:|---|
| Universal options | 37 | 通用（所有生物都能用） |
| Group specific options | 15 | 按生物大类 |
| Mob specific options | 74 | 按具体生物 |

## Universal options —— 通用（所有生物都能用）

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `AlwaysShowName` | 始终显示名字（等同 CustomNameVisible） | false | Whether the name-tag is always displayed. Equivalent to the NBT-tag CustomNameVisible. Defaults to false. |
| `AttackSpeed` | 攻击速度 | vanilla attack speed of the respective mobs | The attack speed of the mob Defaults to vanilla attack speed of the respective mobs |
| `VisibleByDefault` | 默认可见 | true | Sets whether the mob is visible by default when the mobs spawns or when the mob gets loaded. Defaults to true. |
| `Invisible` | 永久隐身 | false | Sets the permanent invisibility effect on the mob; no need to apply invisibility potion with ~onSpawn trigger. |
| `Collidable` | 是否参与碰撞 | true | Whether the mob has collisions. Collisions in Minecraft are bidirectional, so this would need to be set to fal |
| `DigOutOfGround` | 窒息时上移两格 | false | Teleports the mob two blocks up if it takes SUFFOCATION damage. Defaults to false. |
| `Despawn` | 远离玩家后自然消失 | true | Determines how the mob will despawn. This option should be turned on if you're using a lot of mob spawners or  |
| `FollowRange` | 索敌/跟随范围 | vanilla follow range - 32 | The range in blocks within which a mob will target to attack or track an entity. Defaults to vanilla follow ra |
| `Glowing` | 发光描边 | false | Sets whether the mob is permanently glowing. Defaults to false. |
| `HealOnReload` | 区块重载后回满血 | false | Allows non-despawning mobs to heal once the chunk they are in gets reloaded. Defaults to false. |
| `Hidden` | 隐藏（不参与实体计数等） | false | If true the mob will be left out of command suggestions and the mob browser menu, useful for template mobs and |
| `Invincible` | 无敌 | false | Makes the mob completely invincible to all types of damage. This option cannot be changed by command skills. D |
| `Interactable` | 可被玩家交互 | false | Sets whether the mob can be interacted with. If the mob is an armor stand, it will deny any interaction with t |
| `LockPitch` | 锁定俯仰角 | false | Keeps the mob's head from looking up/down. Defaults to false. |
| `KnockbackResistance` | 击退抗性 | 0 | A percentage of knockback resisted from attacks. This option can be anywhere between 0 and 1. But a mob with 1 |
| `MaxCombatDistance` | 最大交战距离 | 256 | Prevents players that are a number of blocks away from damaging the mob. Setting this option to a number less  |
| `MovementSpeed` | 移动速度 | — | The movement speed of the mob. Most mobs has a default move speed of 0.2 and any value higher than 1 tends to  |
| `NoAI` | 关闭原版 AI | false | Whether the mob should have AI. This option overrides any AI goals specified in AIGoalSelectors. As opposed to |
| `NoDamageTicks` | 受伤无敌帧时长 | 10 | Defines how long in ticks the mob is invulnerable after taking damage. If ImmunityTables is enabled for the mo |
| `NoGravity` | 不受重力 | false | Whether the mob should not have gravity. If set to true, the mob CANNOT have the velocity mechanic used on it. |
| `PassthroughDamage` |  | false | Causes all damage taken to be redirected to the mob's parent, if one exists. A mob's parent is the entity that |
| `PreventItemPickup` | 禁止拾取物品 | true | Prevent mobs from picking up items; Defaults to true. |
| `PreventLeashing` | 禁止被拴绳 | true | Whether to prevent a leash from being placed on the mob. Defaults to true. |
| `PreventMobKillDrops` | 禁止掉落自身掉落物 | false | Prevents a MythicMob's target from dropping loot. Defaults to false. |
| `PreventOtherDrops` | 禁止其他插件/原版掉落 | false | Prevents the mob from dropping its vanilla loot table. Defaults to false. |
| `PreventRandomEquipment` | 禁止随机装备 | false | Prevents the mob from spawning with random equipment. Defaults to false. |
| `PreventRenaming` | 禁止改名 | true | Prevents the mob from being renamed using a nametag. Defaults to true. |
| `PreventSunburn` | 防止日晒燃烧 | false | Prevents the mob from burning in the sun. Defaults to false. |
| `PreventTransformation` | 防止转化（僵尸村民/溺尸等） | true | Sets whether the mob should be prevented from being turned into other entities. Defaults to true. |
| `PreventVanillaDamage` | 免疫原版伤害 | false | Cancels every instance of the mob dealing "regular" vanilla damage, canceling it. Skills that triggers onAttac |
| `RepeatAllSkills` | 技能可重复触发 | false | Whether to repeat HP based skills if a mob heals back above the health threshold. Defaults to false. |
| `ReviveHealth` | 复活后的血量 | — | When the mob's death event gets cancelled (via a Cancelevent mechanic ~onDeath) the one specified is the amoun |
| `Scale` | 体型缩放 | -1 | The scale of the mob. If set to -1, the option is ignored. Defaults to -1. |
| `ShowHealth` | 显示血量 | false | Displays the health of the mob through messages broadcast within a radius and formatting by Mobs.ShowHealth.Ra |
| `Silent` | 静音 | false | Whether a mob should use vanilla sound effects. Defaults to false. |
| `UseThreatTable` | 启用威胁表 | — | Whether the mob should have Threat Tables enabled |
| `RandomizeProperties` | 随机化部分属性 | true | RandomizeProperties is the vanilla feature in charge of giving variations to mobs when they spawn, such as equ |

## Group specific options —— 按生物大类


### Boat & BoatChest

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Type` |  | OAK | The type of the boat entity. Aliases: BoatType. Defaults to OAK |

### Breedable mobs

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Age` | 年龄（幼年/成年计时） | 1 | The age of the mob. Use -1 for Baby and 1 for Adults. Usable on any mob that can age. For example: Sheep, Pigs |
| `AgeLock` | 锁定年龄 | false | Whether the mobs age should be locked in place. Useful for keeping a baby mob from growing up over time. This  |
| `Adult` | 强制成年 | — | Sets adult status of mob. Use if Age does not work. |
| `Baby` | 强制幼年 | — | Sets baby/adult status of mob. Use if Age does not work. |

### Neutral Entities

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Angry` | 愤怒状态 | — | Whether the mob will spawn angry or not. |

### Slimes & Magma Cubes

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `PreventSlimeSplit` | 禁止史莱姆分裂 | false | Prevents slimes and magmacubes from splitting. Default to false. |

### Entities with variable size

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Size` | 尺寸（史莱姆/岩浆怪） | 1to8 (Phantoms is 1 | Sets the size of slimes, magma cubes, and phantoms. Can get VERY big and get exponentially larger with each in |

### Raiders

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `CanJoinRaid` | 可加入袭击 | true | Whether the entity can join a raid. Defaults to true. |
| `PatrolLeader` | 巡逻队长 | false | Whether the entity is the leader of a patrol. Defaults to false. |
| `PatrolSpawnPoint` |  | false | Defaults to false. |

### Tameable Mobs

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Tameable` | 可驯服 | false | Whether players are able to tame the mob. Used for wolves, cats and horses. Defaults to false. |

### Zombies (all variants)

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `PreventJockeyMounts` |  | false | Sets whether the zombie will be prevented from spawning as a jockey. Only works for Zombies. Defaults to false |
| `PreventConversion` |  | false | Prevents the Zombie from being converted into other types of zombies. Defaults to false. |
| `ReinforcementsChance` |  | 0 | Chance for zombies to spawn reinforcements on taking damage. Should be a number between 0 and 1 (0% and 100% c |

## Mob specific options —— 按具体生物


### Armor Stand

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `CanMove` | 可移动 | true and requires PaperSpigot | Sets whether an armor stand can move. Defaults to true and requires PaperSpigot |
| `CanTick` | 参与 tick 更新 | true and requires PaperSpigot | Sets whether an armor stand can tick. Defaults to true and requires PaperSpigot |
| `HasArms` |  | false | Sets whether an armor stand has arms. Defaults to false. |
| `HasBasePlate` |  | true | Sets whether an armor stand has a baseplate. Defaults to true |
| `HasGravity` |  | true | Sets whether the armor stand is affected by gravity. Defaults to true. |
| `ItemBody` |  | — | Designates the Mythic Item that should go in the body/chest slot of an armor stand. |
| `ItemFeet` |  | — | Designates the Mythic Item that should go in the feet slot of an armor stand. |
| `ItemHand` |  | — | Designates the Mythic Item that should go in the main hand slot of an armor stand. |
| `ItemOffhand` |  | — | Designates the Mythic Item that should go in the off hand slot of an armor stand. |
| `ItemHead` |  | — | Designates the Mythic Item that should go in the helmet slot of an armor stand. |
| `ItemLegs` |  | — | Designates the Mythic Item that should go in the leggings slot of an armor stand. |
| `Marker` | 标记实体（无碰撞无体积） | false | Sets the armor stand as a marker. This option prevents the armor stand from being destroyed in game, making it |
| `Small` | 小型（盔甲架等） | false | Sets the armor stand to small variant. Defaults to false. |
| `Pose` | 姿势（盔甲架） | — | Sets the body part's current pose. Default values are 0,0,0 and accepts ranges like #to#. These will go under  |

### Bee

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Anger` |  | 0 | Sets the time in ticks until bee anger ends. If set to 0 the bee will not be angry. Defaults to 0. |
| `HasNectar` |  | false | Whether the bee is carrying pollen. Defaults to false. |
| `HasStung` |  | false | Whether the bee has stung an entity. Defaults to false. |
| `PreventStingerLoss` |  | false | Whether to prevent the bee from losing its stinger once it hits an entity. Defaults to false. |

### Camel

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Saddled` | 已装鞍 | false | Whether the entity is saddled or not. Defaults to false. |
| `Tamed` | 已驯服 | false | Whether the entity is tamed or not. Defaults to false. |

### Cat

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `CatType` |  | — | Sets the type of cat. Types can be ALL_BLACK, BLACK, BRITISH_SHORTHAIR, CALICO, PERSIAN, JELLIE, RAGDOLL, RED, |
| `CollarColor` |  | — | Sets the color of the cat's collar. Available colors are: BLACK, BLUE, BROWN, CYAN, GRAY, GREEN, LIGHT_BLUE, L |

### Cow

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Variant` |  | — | The variant to use for the cow entity. Accepts a namespace, if there is a datapack adding more variants. Read  |

### Chicken

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Jockey` |  | false | Whether or not the chicken has the IsChickenJockey NBT set to 1. If true, the chicken can naturally despawn, d |

### Creepers

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `ExplosionRadius` | 爆炸半径 | -1 | Sets the radius/power of the creepers explosion. Negative values are ignored, and the explosion radius remains |
| `FuseTicks` | 引信时长（苦力怕） | -1 | Sets the number of ticks it takes for creepers to explode. Negative values are ignored, and the time it takes  |
| `SuperCharged` | 闪电苦力怕状态 | false | Whether the creeper should spawn as a super charged creeper. Defaults to false. |
| `PreventSuicide` |  | false | Prevents creepers from dying upon exploding. Set mobGriefing gamerule to true for this option to work. Default |

### Copper_Golem

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `WeatheringState` |  | — | The weathering state of the golem. Can be any of these values |
| `Waxed` |  | true | Whether the copper golem is waxed. Defaults to true. |

### Enderman

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `PreventTeleport` |  | false | Meant for Endermen but //might// work on other mobs. May break teleport skills! Defaults to false. |
| `HeldBlock` |  | AIR | Sets the block that the Enderman is carrying. Defaults to AIR. |

### Experience_orb

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Experience` |  | 1 | Sets the amount of experience give by the experience orb mob. Defaults to 1. |

### Falling Blocks

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Block` |  | STONE | Determines the type of the block. Defaults to STONE. |
| `BlockData` |  | 0 | Additional field for inputting blockdata. Defaults to 0. |
| `DropsItem` |  | true | Should the entity be able to drops the falling block's item. Defaults to true. |
| `HurtsEntities` |  | true | Damages entities on impact. Defaults to true. |
| `ReplaceSpawnLocationBlock` |  | false | If the entity should replace the block at its spawn location. Defaults to false. |
| `UseSpawnLocationType` |  | false | If the type of the falling block should be the one at the spawn location. Defaults to false. |

### Fox

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `FoxType` |  | RED | Determines the type of the fox. Can be RED or SNOW. Defaults to RED. |

### Goat

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Screaming` | 尖叫（幻翼） | false | Sets if this is a screaming goat. A screaming goat makes screaming sounds and rams more often. Defaults to fal |

### Hoglin

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `ImmuneToZombification` |  | false | Whether or not the hoglin is immune to being zombified. Defaults to false. |
| `Huntable` |  | true | Whether the hoglin is able to be hunted by piglins. Defaults to true. |

### Horses, Donkeys, and Mules

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `HorseArmor` |  | — | Used for horses to set the type of armor they have on. Can be iron, gold, or diamond [armor_type] must be in l |
| `CarryingChest` |  | false | Used for donkeys to set whether they are carrying a chest or not. Defaults to false. |
| `HorseColor` |  | — | Sets color of the horse. Colors must be uppercase,can be any of the Spigot Horse colors. |
| `HorseStyle` |  | — | Sets the style of the horse. Styles can be any of the Spigot Horse Style |
| `HorseType` |  | HORSE Removed in MC 1 | Defines the type of horse Can be any of the Spigot Horse variants Defaults to HORSE Removed in MC 1.11+, useTy |

### Interaction

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Height` | 高度 | 1 | The Height of the Interaction entity. Defaults to 1. |
| `Width` | 宽度 | the value of the Height option | The Width of the Interaction entity. Defaults to the value of the Height option. |
| `Responsive` |  | true | If the Interaction entity is responsive. Defaults to true. |

### IronGolem

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `PlayerCreated` |  | false | Acts as if the player built the mob. Defaults to false. |

### Item

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Item` |  | STONE | The material of the item entity. Defaults to STONE. |
| `Amount` |  | 1 | The amount of items in the itemstack. Defaults to 1. |
| `CanPickup` |  | true | If the itemstack can be picked up. Defaults to true. |

### Llama

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Color` | 颜色（羊/马等） | — | Sets color of the llama. Colors must be uppercase,can be any of the Spigot Llama colors. |

### MinecartChest

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `ChestContents` |  | — | The droptable that will be put inside the chest. |

### Panda

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `MainGene` |  | NORMAL | Sets the main gene that the panda can pass on to its offspring. Can be NORMAL, AGGRESSIVE, LAZY, WORRIED, PLAY |
| `HiddenGene` |  | NORMAL | Sets the hidden gene that the panda can pass on to its offspring. Can be NORMAL, AGGRESSIVE, LAZY, WORRIED, PL |

### Parrot

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `FlyingSpeed` | 飞行速度 | -1 (The option is not applied | The flying speed of the parrot. Defaults to -1 (The option is not applied) |

### Piglin

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `AbleToHunt` |  | true | Whether or not the piglin is able to hunt. Defaults to true. |

### Rabbit

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `IsKillerBunny` |  | false | Alias: Angry. Sets the rabbit as the Killer Bunny. Defaults to false. |
| `RabbitType` |  | — | Sets the type of rabbit. Types can be BLACK, BLACK_AND_WHITE, BROWN, GOLD, SALT_AND_PEPPER, THE_KILLER_BUNNY o |

### Sheep

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Sheared` |  | false | Whether the Sheep is already sheared. Defaults to false. |

### Silverfish

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `PreventBlockInfection` |  | false | Prevent silverfish from infecting blocks. Defaults to false. |

### Snow Golem

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Derp` |  | false | Whether the Snow Golem has its pumpkin already sheared. Defaults to false. |
| `PreventSnowFormation` |  | false | Prevent the Snow Golem from creating snow. Defaults to false. |

### TNT

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `ExplosionYield` |  | -1 (The normal TNT Explosion Yield is used | Determines the strength of the explosion. Defaults to -1 (The normal TNT Explosion Yield is used). |
| `Incendiary` |  | false | Whether the explosion is capable of starting fires. Defaults to false. |

### Tropical Fish

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `Pattern` |  | — | Sets the Shape/Pattern of the fish. |
| `BodyColor` |  | — | Sets the Primary Color of the fish. |

### Villagers

| 键名 | 中文 | 默认值 | 说明 |
|---|---|---|---|
| `HasTrades` |  | false | Whether the villager can be traded with. Defaults to false. |
| `Profession` |  | — | Specifies the Profession of the villager. Villagers without this option will roll a random profession on their |
| `Level` |  | — | Villager profession level, levels 1 - 5. Level 1 villagers might switch professions. If you want a villager to |
