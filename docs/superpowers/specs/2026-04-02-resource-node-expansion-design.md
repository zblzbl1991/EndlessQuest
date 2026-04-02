# 资源建筑扩建设计

**日期**: 2026-04-02  
**状态**: 已实现 v1  
**目标**: 让灵田、灵矿从“唯一建筑升级”变成“可横向扩建的资源节点”，把资源紧张重新拉回宗门经营层，而不是继续依赖赋税和秘境固定结算。

---

## 一、设计结论

第一版不做“多实例建筑列表”，只对 `spiritField` 和 `spiritMine` 引入 `count`。

- `等级` 决定单座效率
- `数量` 决定总吞吐
- `主殿` 决定资源节点上限
- UI 仍然保持单卡片展示，避免建筑页和存档结构膨胀

一句话概括：

**升级负责提效，扩建负责补量。**

---

## 二、当前实现快照

### 2.1 数据结构

文件：[sect.ts](/E:/projects/EndlessQuest/src/types/sect.ts)

```ts
export interface Building {
  type: BuildingType
  level: number
  count: number
  unlocked: boolean
  productionQueue: ProductionQueue
}
```

说明：

- `spiritField` / `spiritMine` 使用真实 `count`
- 其余建筑虽然也带 `count` 字段，但默认只会保持 `0` 或 `1`

### 2.2 初始状态

文件：[initial.ts](/E:/projects/EndlessQuest/src/stores/sectStore/initial.ts)

- `mainHall`: `Lv1 / count 1 / unlocked`
- `spiritField`: `Lv1 / count 1 / unlocked`
- `spiritMine`: `Lv1 / count 1 / unlocked`
- 其他建筑：`Lv0 / count 0 / locked`

### 2.3 资源节点上限

文件：[buildings.ts](/E:/projects/EndlessQuest/src/data/buildings.ts)

当前规则：

- 主殿 `Lv1`: 各 `1` 座
- 主殿 `Lv2-3`: 各 `2` 座
- 主殿 `Lv4-5`: 各 `3` 座
- 主殿 `Lv6+`: 各 `4` 座

### 2.4 扩建成本

文件：[buildings.ts](/E:/projects/EndlessQuest/src/data/buildings.ts)

当前公式：

```ts
spiritFieldExpand = round(140 * nextCount^1.6)
spiritMineExpand  = round(180 * nextCount^1.6)
```

参考值：

| 目标数量 | 灵田扩建 | 灵矿扩建 |
|---|---:|---:|
| 2 | 424 | 546 |
| 3 | 812 | 1044 |
| 4 | 1287 | 1654 |
| 5 | 1839 | 2364 |

### 2.5 单座产率

文件：[buildings.ts](/E:/projects/EndlessQuest/src/data/buildings.ts)

- 灵田单座：`灵气 = 3 + (level - 1) * 2`
- 灵田单座：`灵草 = 0.1 * level`
- 灵矿单座：`灵石 = 0.5 + (level - 1) * 0.5`
- 灵矿单座：`矿材 = 0.05 * level`

总产出：

```ts
总产出 = count × 单座产率(level) × 各类乘区加成
```

### 2.6 仓储上限

当前实现仍然是“按数量整体倍增”的简单版：

```ts
spiritEnergyCap = (500 + spiritFieldLevel * 300) * spiritFieldCount
herbCap         = (200 + spiritFieldLevel * 100) * spiritFieldCount
oreCap          = (200 + spiritMineLevel  * 100) * spiritMineCount
```

这比原提案更直接，优点是实现简单；缺点是多节点后仓储增长偏快，后续可能还要再细调。

---

## 三、已同步的平衡调整

### 3.1 赋税降级为辅助收入

文件：[ResourceEngine.ts](/E:/projects/EndlessQuest/src/systems/economy/ResourceEngine.ts)

```ts
tax = sectLevel * discipleCount * 0.1 / s
```

设计意图：

- 赋税保留“宗门规模感”
- 但不再压过灵矿本身

### 3.2 秘境固定路线奖励下调

文件：[MapGenerator.ts](/E:/projects/EndlessQuest/src/systems/roguelike/MapGenerator.ts)

当前做法：

- 普通路线固定奖励统一乘 `0.65`
- Boss 层固定奖励统一乘 `0.65`

这表示相较旧版本，固定路线结算整体下调 `35%`。

### 3.3 派遣资源效率回落

文件：[missions.ts](/E:/projects/EndlessQuest/src/data/missions.ts)

- `gather_herbs`: `80 -> 60`
- `mine_ores`: `50 -> 36`

设计意图：

- 派遣仍然能补缺口
- 但不再成为比资源建筑更划算的主产线

### 3.4 前两境界突破成本缓和

文件：[realms.ts](/E:/projects/EndlessQuest/src/data/realms.ts)

关键调整：

- 炼气后两段小突破：`150/400 -> 120/300`
- 筑基三小段小突破：`300/800/2000 -> 180/480/1400`
- 炼气 → 筑基大突破：`3000 灵石 + 800 灵气 -> 1800 灵石 + 480 灵气`
- 筑基 → 金丹大突破：`15000 灵石 + 4000 灵气 -> 9600 灵石 + 2400 灵气`

---

## 四、当前设计意图

这套实现现在表达的是一个明确方向：

- 灵石不再主要靠赋税印出来
- 灵气和灵石缺口都能通过宗门扩地来主动解决
- 扩建优先解决“吞吐不够”
- 升级优先解决“单座效率不够”
- 冒险仍然提供高波动收益，但不应继续统治最稳定的基础经济

---

## 五、下一步关注点

这一版已经把结构搭起来了，但还有三件事需要继续看：

1. `灵草/矿材仓储` 在多节点下是否增长过快  
2. `灵草谷固定灵石结算` 是否仍然偏高  
3. `主殿 2 / 4 / 6` 的上限解锁节奏，是否和玩家真实扩建欲望对齐  

下一步配套文档见：[2026-04-03-target-economy-table.md](/E:/projects/EndlessQuest/docs/superpowers/specs/2026-04-03-target-economy-table.md)。
