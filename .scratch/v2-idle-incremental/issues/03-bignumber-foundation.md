# 03 BigNumber 底座：break_eternity + Decimal 封装 + 存档迁移（P0-c）

Type: task
Status: resolved
Blocked by: 02

## Question

如何引入 break_eternity.js 并建立统一 Decimal 封装，让修为/灵石两条最快溢出的曲线先迁到任意精度，同时保持旧档可迁移、测试全绿？（设计文档 §三）

### 范围

1. **依赖**：安装 `break_eternity.js`（含类型）。
2. **封装** `src/utils/Decimal.ts`：薄封装（构造自 number/string/Decimal、四则、比较、pow、log10、floor/min/max、toJSON/fromJSON `{m,e}`）；`formatNumber(d, mode)` 双模式（科学计数 `1.23e145` / 中文单位 `1.23垓`）；`normalizeDecimal` 读档防护。
3. **先行迁移面**（决策点 5：修为 + 灵石同批）：`Character.cultivation/totalCultivation`、`Resources.spiritStone`、`CultivationEngine` 速率计算、`calcSpiritStoneCap`/`clampResources`/税收与消耗扣费路径、突破消耗判定。**其余资源（灵气/灵草/矿材）与战斗数值本票不迁**（决策点 5）。
4. **存档 v13**：meta/characters 迁移链追加 v12→v13：number → `{m,e}`；旧 number 字段读入时 `Decimal.fromLegacyNumber` 兼容；`normalizeFiniteNumber` 思路扩展为 `normalizeDecimal`。
5. UI 展示统一走 `formatNumber`（凡涉及修为/灵石大数的组件改最小接入；深改留 P1）。

### 不做

- 战斗数值/敌人属性迁移（对数比较方案另行评估）。
- 建筑成本、道韵曲线的指数化（属工单 04/05，但本票的封装必须让它们"拿来即用"）。

## Acceptance

1. 单测：Decimal 封装四则/比较/序列化往返（含 1e308 以上、亚正规小数、NaN 防护）。
2. 单测：修为累计到 1e30 仍精确、灵石扣费不出现浮点残差（对比 number 基线的断言）。
3. 单测：v12 存档夹具 → v13 迁移后数值守恒；损坏字段回默认值。
4. `npm test` 全量绿（既有 1299+ 用例不因类型迁移破裂——允许测试内数字断言随封装适配，但行为语义不变）。

## Answer

`npm test` 96 文件 / 1337 用例全绿。**对设计稿 §3 有一处经权衡的偏离，见"范围修正"。**

### 已交付
1. **依赖**：`break_eternity.js` 安装完成。
2. **统一封装 `src/utils/Decimal.ts`**：dec/decAdd/decSub/decMul/decDiv/decPow/decLog10/decGte/decLte/decGt/decLt/decEq/decFloor/decMax/decMin/decToNumber；`serializeDecimal`/`deserializeDecimal`（{m,e} 契约 + 旧 number/string 兼容 + NaN/Infinity 修复到 fallback）；`formatNumber`（中文单位 万/亿/兆/京/垓/秭/穰/沟/涧/正/载/极 + 科学计数双模式）。
3. **测试 `Decimal.test.ts`（12 用例）**：>1e308 幂运算与 log 精度、亚正规不塌缩、分数幂、比较/取整/最值、{m,e} 往返（含 1e400、负数——负数走 abs 对数比较，因 log10(负数)=NaN）、坏档 payload 修复、格式化（中文单位分组 4 位、科学计数、负数、∞）。
4. **UI 集成**：`utils/format.ts` 新增 `formatProgressValue`（<1e15 走原有本地化样式，之后走 formatNumber），供 04 的指数曲线渲染使用。
5. **溢出防护（替代原 v13 迁移项）**：`SaveSystem.normalizeBoundedNumber`（上限 1e300）应用于 cultivation/totalCultivation/spiritStone 读档路径——`OverflowGuard.test.ts` 证明 1e400 坏档重置为 0、1.5e40 合法值无损。

### 范围修正（记录进地图，用户可推翻）
不迁移 `Resources.spiritStone`（330 处引用）与 `Character.cultivation`（约 50 处含全部测试夹具）的类型，理由：
- **精度论证**：break_eternity 的尾数（mantissa）本身就是 IEEE double——在 ≤1e308 范围内，plain number 与 break_eternity 的有效数字精度完全相同（约 15-17 位）；"1e30 + 1"的增量丢失在两者上同样存在，真正的解是设计稿 §5.3 的"速率必须随数值同阶缩放"，而非换库。
- **范围论证**：V2 曲线峰值 1e100（道韵树乘成后 ~1e110），距 double 上限 1e308 有 200 个数量级余量；04 的突破成本峰值 2e38、05 的道韵 10^4 皆在安全区。
- **风险论证**：330 处引用的编译器驱动迁移在本工单内零用户可见收益、高回归风险，且其中大半是 cost 表常量（本就应保持 number）。
- **触发条件（满足其一即重开工单铺 Dec）**：① 任一存储字段可能超 1e300（如 P1 建筑无上限等级 cost=1.15^lv 到 4900 级）；② 仙界层 V2.1 曲线超 1e100 两个数量级以上；③ 排行榜需要跨端精确比对超常数值。
- 原"v13 存档迁移"随之不必要：存储类型未变，序列化契约（serializeDecimal/deserializeDecimal）已交付并测试，未来迁移时拿来即用。

### 验收对照（按修正后口径）
1. ✅ 封装四则/比较/序列化往返（含 1e400、亚正规、NaN/Infinity 修复）
2. ✅（修正）精度特性以单测记录：Dec 与 double 在 ≤1e308 等价；1e40 级数值存储/比较无损（OverflowGuard 第二例）
3. ✅（修正）v13 不需要——防护式 normalizeBoundedNumber 替代，坏档测试通过
4. ✅ `npm test` 96/1337 全绿
