# PRD: Enemy Diversity -- Dungeon-Specific Enemy Templates

## Problem

`src/data/enemies.ts` defines only 3 `ENEMY_TEMPLATES` (`wild_spirit_beast`, `cave_demon`, `spirit_boss`) shared across all 6 dungeons. Every dungeon feels the same because combat encounters pull from the same generic pool. Boss fights always use the single `spirit_boss` template.

## Goal

Add 12-18 new enemy templates grouped by dungeon theme so each dungeon has unique regular enemies and a unique boss. Update the enemy selection logic in `EventSystem.ts` to pick enemies based on dungeon context.

## Dungeon Themes & Enemies

### LingCao Valley (灵草谷) -- dungeonId: `lingCaoValley`
Nature/herb spirits, low difficulty.
- `valley_vine_spirit` (蔓藤灵) -- neutral element, basic stats, no affixes
- `valley_herb_guardian` (草灵守卫) -- ice element, higher HP, affixPool: `['shield']`
- **Boss:** `valley_ancient_treant` (古木树灵) -- neutral element, affixPool: `['shield', 'spiritDrain']`, skillIds: `['sword_qi']`

### LuoYun Cave (落云洞) -- dungeonId: `luoYunCave`
Shadows/illusions, medium difficulty.
- `cave_shadow_fiend` (影魇) -- ice element, high spd, affixPool: `['swift']`
- `cave_illusion_weaver` (幻影蛛) -- fire element, balanced, affixPool: `['berserk', 'swift']`
- **Boss:** `cave_void_phantom` (虚空幻影) -- ice element, affixPool: `['swift', 'spiritDrain']`, skillIds: `['ice_blade']`

### Blood Demon Abyss (血魔渊) -- dungeonId: `bloodDemonAbyss`
Blood/demons, high difficulty.
- `abyss_blood_spawn` (血煞) -- fire element, high atk, affixPool: `['berserk']`
- `abyss_demon_soldier` (魔兵) -- fire element, high hp, affixPool: `['shield', 'berserk']`
- **Boss:** `abyss_blood_demon_lord` (血魔领主) -- fire element, affixPool: `['berserk', 'spiritDrain', 'tribulationBane']`, skillIds: `['fire_palm']`

### Dragon Bone Wasteland (龙骨荒原) -- dungeonId: `dragonBoneWasteland`
Dragon/bones, very high difficulty.
- `wasteland_bone_drake` (骨龙崽) -- lightning element, high def, affixPool: `['shield']`
- `wasteland_dragon_skeleton` (龙骸) -- neutral element, high hp/atk, affixPool: `['berserk', 'shield']`
- **Boss:** `wasteland_elder_dragon_lord` (远古龙皇骸骨) -- lightning element, affixPool: `['berserk', 'shield', 'tribulationBane']`, skillIds: `['thunder_strike']`

### Nine Nether Purgatory (九幽炼狱) -- dungeonId: `nineNetherPurgatory`
Ghosts/nether, extreme difficulty.
- `purgatory_wraith` (幽魂) -- ice element, high spd, affixPool: `['swift']`
- `purgatory_nether_hound` (冥犬) -- fire element, high atk, affixPool: `['berserk', 'swift']`
- **Boss:** `purgatory_nether_king` (冥王) -- ice element, affixPool: `['berserk', 'shield', 'spiritDrain', 'tribulationBane']`, skillIds: `['ice_blade', 'fire_palm']`

### Heavenly Tribulation Realm (天劫秘境) -- dungeonId: `heavenlyTribulationRealm`
Lightning/tribulation, ultimate difficulty.
- `tribulation_lightning_elemental` (雷灵) -- lightning element, very high spd, affixPool: `['swift', 'tribulationBane']`
- `tribulation_thunder_golem` (雷岩巨像) -- lightning element, very high hp/def, affixPool: `['shield', 'tribulationBane']`
- **Boss:** `tribulation_heavenly_tribulation_spirit` (天劫之灵) -- lightning element, affixPool: `['berserk', 'shield', 'swift', 'tribulationBane']`, skillIds: `['thunder_strike', 'sword_qi']`

## Stat Scaling Guidelines

New enemy base stats should follow this rough pattern (before layer scaling):

| Difficulty | HP | ATK | DEF | SPD |
|---|---|---|---|---|
| Valley (basic) | 30-60 | 6-12 | 3-6 | 4-8 |
| Cave (medium) | 70-120 | 12-20 | 6-12 | 6-10 |
| Abyss (high) | 130-200 | 20-30 | 10-18 | 8-12 |
| Wasteland (v.high) | 200-300 | 28-40 | 16-24 | 10-14 |
| Purgatory (extreme) | 280-400 | 36-50 | 22-30 | 12-16 |
| Tribulation (ultimate) | 380-500 | 44-60 | 28-36 | 14-18 |

Boss base stats are 1.8x the regular enemy tier (via existing `scaleBossStats`).

## Files to Change

1. **`src/data/enemies.ts`** -- Add 12-18 new `EnemyTemplate` entries to the `ENEMY_TEMPLATES` array. Add a `dungeonId` optional field to `EnemyTemplate` (or create a separate `DUNGEON_ENEMY_MAP` mapping dungeon IDs to enemy template IDs).
2. **`src/systems/roguelike/EventSystem.ts`** -- Update `getNonBossTemplates()` (line ~51) to accept a `dungeonId` parameter and filter to dungeon-specific enemies. Update the boss selection at line ~285 to pick the boss matching the dungeon. The `resolveEvent` function already receives context but needs the `dungeonId` passed through.
3. **`src/systems/roguelike/AutoRunEngine.ts`** -- Pass `dungeonId` through to `resolveEventFn` calls so EventSystem can select dungeon-appropriate enemies.
4. **`src/data/events.ts`** -- No changes needed (dungeon definitions unchanged).
5. **`src/__tests__/loot.test.ts`** -- Update assertions that iterate over all `ENEMY_TEMPLATES` since the array grows.
6. **New: `src/__tests__/enemyDiversity.test.ts`** -- Test that each dungeon maps to correct enemies, bosses are unique per dungeon, stats fall within expected ranges.

## Loot Tables

New enemies should have loot tables following the existing pattern but with dungeon-appropriate reward scaling. Higher-tier dungeons should weight higher-quality equipment drops more heavily.

## Backward Compatibility

- Existing save games are not affected (enemies are not persisted, only generated at runtime).
- The 3 original templates (`wild_spirit_beast`, `cave_demon`, `spirit_boss`) should remain in the array as fallback/legacy entries but can be marked with a comment.
- `getNonBossTemplates()` without `dungeonId` should fall back to the full pool for backward compat.

## Acceptance Criteria

- [ ] 6 new bosses, one per dungeon
- [ ] 12+ new regular enemies, 2-3 per dungeon
- [ ] `resolveEvent('combat', ...)` picks enemies matching the current dungeon
- [ ] `resolveEvent('boss', ...)` picks the boss matching the current dungeon
- [ ] Each dungeon's enemies use appropriate elements and affixes for their theme
- [ ] Existing tests pass (loot tests updated for larger template array)
- [ ] New test file validates dungeon-enemy mapping
- [ ] No save data migration needed
