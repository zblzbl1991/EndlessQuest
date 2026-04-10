# Add Monster and Equipment Codex System

## Goal
Add a discovery-based codex system that tracks encountered monsters and collected equipment sets, extending the existing technique codex pattern.

## Requirements

### Monster Codex (分层发现)
- **Encounter** (遭遇): Unlock basic info — name, element, boss flag
- **Kill** (击杀): Unlock full data — base stats, affix pool, loot table, skill IDs
- Track 27 enemy templates (24 dungeon + 3 legacy)
- Discovery triggered during combat resolution in EventSystem

### Equipment Codex (套装+品质)
- Track 6 equipment sets × 5 qualities = 30 entries
- Each entry shows: set name, quality, set bonuses, discovered status
- Discovery triggered when equipment of that set+quality is generated/obtained

### UI
- Extend building page with new codex panels (monster + equipment)
- Follow existing CodexPanel pattern: grid layout, `???` for undiscovered, full details for discovered
- Consistent with ink-wash theme

### Persistence
- Add codex data to SaveMeta in IndexedDB meta store
- Migration: existing saves get empty codex (no data loss)

### Data Model
- `monsterCodex: Record<string, 'encountered' | 'killed'>` — keyed by enemy ID
- `equipmentCodex: Record<string, Set<string>>` — keyed by set ID, values are discovered quality strings

## Acceptance Criteria
- [ ] Monster codex tracks encounter/kill state for all 27 enemies
- [ ] Equipment codex tracks 6 sets × 5 qualities
- [ ] Codex data persists across save/load
- [ ] UI panels in buildings page show codex with discovery states
- [ ] Existing saves load without errors (migration)
- [ ] Lint and typecheck pass

## Technical Notes
- Follow `techniqueCodex` pattern (string ID array → Record with richer state)
- Hook into `EventSystem.ts` combat resolution for monster discovery
- Hook into `LootSystem.ts` / `ItemGenerator.ts` for equipment discovery
- Store slice in `sectStore/codexSlice.ts`
- Update `SaveSystem.ts` v9→v10 migration
- Update `SaveMeta` type and initial state
