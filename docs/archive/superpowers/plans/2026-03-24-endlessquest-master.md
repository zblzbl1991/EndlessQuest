# EndlessQuest Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete xianxia-themed idle roguelike web game with cultivation, sect management, and adventure systems.

**Architecture:** React 18 + Vite + TypeScript SPA with Zustand state management. CSS Modules with ink-wash theme. Systems layer (idle/combat/roguelike/economy) contains pure logic, stores hold state, components render UI. localStorage for frequent data, IndexedDB for structured game data.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, React Router v6, Framer Motion, Vitest, IndexedDB

**Spec:** `docs/superpowers/specs/2026-03-24-endlessquest-design.md`

---

## Phase Breakdown

| Phase | Name | Deliverable | Files Created |
|-------|------|-------------|---------------|
| 1 | Foundation | Running app with themed UI shell, routing, game data definitions | ~20 files |
| 2 | Core Game Loop | Idle engine ticking, resources accumulating, cultivation working | ~15 files |
| 3 | Equipment & Inventory | Equippable gear, inventory UI, enhancement system | ~15 files |
| 4 | Skills & Techniques | Passive techniques, active skills, cultivation page | ~12 files |
| 5 | Sect Management | Buildings, resource production, sect page UI | ~15 files |
| 6 | Disciples | Recruitment, cultivation, dispatch system | ~12 files |
| 7 | Combat Engine | Auto-battle with damage calc, battle UI | ~12 files |
| 8 | Roguelike Adventure | Dungeon events, route selection, run lifecycle | ~18 files |
| 9 | Pets | Capture, leveling, battle integration | ~10 files |
| 10 | Trade System | NPC shop, auction house, trade UI | ~10 files |
| 11 | Save System & Polish | Persistence, offline calc, integration, polish | ~10 files |

**Total estimated: ~150 files**

---

## Phase 1: Foundation

**Detailed plan:** `docs/superpowers/plans/2026-03-24-endlessquest-phase1-foundation.md`

**Deliverable:** A running Vite + React app with:
- Project scaffolding with all tooling configured
- Ink-wash themed UI with CSS variables and components
- 5-page routing with bottom navigation
- All static game data defined (realms, items, skills, buildings, events, enemies)
- Zustand stores scaffolded with TypeScript types
- Main Hall page displaying player info and resources

## Phase 2: Core Game Loop

**Deliverable:** The minimum playable game loop:
- IdleEngine running per-second ticks
- Resource production flowing
- Cultivation (修炼) working — accumulating 修为, breaking through realms
- Main Hall showing real-time resource rates

## Phase 3: Equipment & Inventory

**Deliverable:**
- Item generation and inventory management
- Equipment slots and stat calculation
- Enhancement (+1~+15) and refinement
- Inventory page with gear management

## Phase 4: Skills & Techniques

**Deliverable:**
- Technique system (passive attribute bonuses)
- Active skill system (cooldowns, spirit power cost)
- Cultivation page with technique/skill tabs
- Spirit power economy

## Phase 5: Sect Management

**Deliverable:**
- Building system with upgrade paths
- Resource production from buildings
- Sect page with building management UI
- Building unlock conditions

## Phase 6: Disciples

**Deliverable:**
- Disciple recruitment (聚仙台)
- Disciple cultivation and dispatch
- Disciple management UI in sect page
- Wounded state and recovery

## Phase 7: Combat Engine

**Deliverable:**
- Auto-battle engine with turn-based combat
- Damage calculation with five-element counters
- Battle UI with animations
- Team composition (player + pets + disciple)

## Phase 8: Roguelike Adventure

**Deliverable:**
- Dungeon event generation and routing
- Event types (combat, random, shop, rest, boss)
- Run lifecycle (start, progress, pause, retreat, settle)
- Adventure page with dungeon selection and exploration UI
- Idle mode auto-play

## Phase 9: Pets

**Deliverable:**
- Pet encounter and capture
- Pet leveling and stat growth
- Pet management UI
- Pet skills in combat

## Phase 10: Trade System

**Deliverable:**
- NPC shop with daily refresh
- Auction house with quality tiers
- Trade UI pages

## Phase 11: Save System & Polish

**Deliverable:**
- IndexedDB persistence with versioning
- Offline revenue calculation
- Auto-save system
- Cross-system integration and balance tuning
- UI polish and animation refinement
