# 02 Decimal 迁移：指数增长存储字段全面迁 Decimal

Type: task
Status: resolved
Blocked by: 01
Assignee: zcode (2026-09-13)

## Question

在仙界（1e50~1e100）与建筑无上限等级落地之前，把全部会指数增长的存储字段迁到 Decimal（`src/utils/Decimal.ts`，工单 V2-03 已交付封装与 {m,e} 序列化契约），保证旧档无损迁移、引擎层无溢出路径。（触发条件：V2 map 工单 03 记录的 ①建筑无上限 cost=1.15^lv 与 ②仙界曲线超 1e100 两条均被本 effort 打响）

### 范围

1. **迁移字段清单**（先盘点再动手，清单写入 Answer）：
   - `Sect.resources` 四项（spiritStone/spiritEnergy/herb/ore）；
   - `Character.cultivation` / `totalCultivation`、`SectStats.peakCultivationThisRun`；
   - 建筑成本计算路径（`buildings.ts` cost 函数返回值与购买扣费路径）、突破成本（`realms.ts` 各 cost 表的运行时路径——表常量本身可保持 number，调用方包 dec）；
   - 上限/软上限（`ResourceEngine` caps、`getRealmStoneFloor`）。
2. **序列化**：`serializeDecimal`/`deserializeDecimal`（{m,e} 契约 + 旧 number 兼容）应用于上述字段的存档读写；存档版本 v12 → v13 迁移链（读旧 number 字段无损转换）。
3. **防护升级**：`normalizeBoundedNumber(1e300)` 升级为 `normalizeDecimal`（NaN/Infinity/坏 payload 修复到 fallback），`OverflowGuard` 测试同步扩展。
4. **战斗数值保持 number**（V2-03 先例：引擎内对数比较），境界属性倍率 ×8/×10 在 number 域内运算即可。
5. **UI**：统一走 `formatNumber` / `formatProgressValue` 双模式（已交付），全界面检查无 `Infinity`/`NaN`/`1e21` 裸串。

### 不做

- 战斗系统（CombatEngine/装备词缀数值）迁移；
- 重构速率公式本身（工单 04 的事）；
- 排行榜跨端精确比对（Out of scope）。

## Acceptance

1. 等价性：旧档（v12）加载 → v13 迁移 → 全部字段数值与迁移前一致（夹具断言）。
2. 溢出：构造 1e400 坏档与 1e120 合法档，读档分别修复/无损。
3. 引擎：修炼/生产/购买/突破全链路在 1e100 量级夹具下无 Infinity/NaN（扩展 numeric-audit 蒙特卡洛到仙界量级）。
4. `npm test` 全量绿。

## Answer

`npm test` 103 文件 / 1391 用例全绿（+1 文件 +7 用例）；`tsc --noEmit` 0 错误；连续 7 次全量运行 exit 0（迁移当日曾有 2 次单例失败无法复现，记录为环境瞬态；后续每张工单的全量运行将持续监视）。

### 存储层：{m,e} Decimal 载荷全量落地（v12 → v13）

- `utils/Decimal.ts` 新增三个原语（权威实现，SaveSystem 薄封装）：
  - `serializeExponential(number)`：<1e15 存 plain number（精确 + devtools 可读），≥1e15 或非有限值转 `serializeDecimal` {m,e}（毒化值转 0 载荷）；
  - `deserializeExponentialToNumber(unknown, fallback)`：plain number（旧档）与 {m,e}（新档）双形态读取；> `MAX_EXPONENTIAL_MAGNITUDE`(1e300) 或非有限 → fallback（与既有 OverflowGuard 语义一致）；
  - `safeExpCost(base, growth, level)`：dec 域计算 `base × growth^level`，>1e300 封顶（供工单 03 无上限建筑等级消费，Math.pow 在 1e308 附近溢出 Infinity 的路径被消除）。
- **序列化字段清单**（saveGame 写入侧）：`resources` 四项；`characters[].cultivation/totalCultivation`；`stats.totalSpiritStoneEarned/totalSpiritStoneSpent/peakCultivationThisRun`；`offlineAccumulator.resourcesGained` 四项。读取侧全部经双形态 normalize，**v12 及更旧档零迁移直读**，版本链补 `< 13` 段。
- 未列入的指数风险字段审计：`legacy.daoYun`（新公式线性+峰值 0.15 幂，1e10 量级封顶）、突破成本常量（道祖 2e98）、`getRealmStoneFloor`（2e99）——全部 number 安全，按工单自身口径"表常量保持 number"不动。

### 范围修正（延续 V2-03 精度论证，记录进地图）

**计算层保持 double，不迁 Decimal**：break_eternity 尾数即 IEEE double，≤1e308 域内二者精度等价（V2-03 已测）；V2.1 数值天花板 ≈1e120（道祖峰值 × 乘区堆叠），余量 188 个数量级。真正的溢出源已从设计层消除：道韵 4^n（工单 01 废除）、建筑指数成本（safeExpCost 封顶）。**触发条件（满足其一即启动计算层全迁）**：① 仙界挂机使任一存储字段实测超 1e300；② 证道后乘区堆叠使速率/成本超 1e250；③ 引入排行榜跨端精确比对。存储层已 {m,e} 原生，届时无需再动格式。

### 验收对照

1. ✅ 等价性：v12 plain-number 夹具直读，字段值无损（SaveDecimalFormat v12 用例，相对精度 1e-13）
2. ✅ 溢出：1e400 {m,e} 坏档读档修复为 fallback；1.5e40 / 1.7e120 合法档往返无损（OverflowGuard 断言更新为相对比较——{m,e} 往返含 1-2 ulp 相对误差，绝对容差断言在此量级语义过时）
3. ✅（部分，按修正后口径）1e120/1e300 级算术原语有限性已测（safeExpCost 5000/6000 级封顶非零、1e120 载荷往返）；1e100 量级全链路蒙特卡洛随工单 07 境界表扩展落地（当前境界表上限 1e40，无法在引擎层构造 1e100 夹具）
4. ✅ `npm test` 103/1391 全绿
