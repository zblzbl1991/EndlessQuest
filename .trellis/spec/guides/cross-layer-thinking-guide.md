# Cross-Layer Thinking Guide

> **Purpose**: Think through data flow across layers before implementing.

---

## The Problem

**Most bugs happen at layer boundaries**, not within layers.

Common cross-layer bugs:
- API returns format A, frontend expects format B
- Database stores X, service transforms to Y, but loses data
- Multiple layers implement the same logic differently

---

## Before Implementing Cross-Layer Features

### Step 1: Map the Data Flow

Draw out how data moves:

```
Source → Transform → Store → Retrieve → Transform → Display
```

For each arrow, ask:
- What format is the data in?
- What could go wrong?
- Who is responsible for validation?

### Step 2: Identify Boundaries

| Boundary | Common Issues |
|----------|---------------|
| API ↔ Service | Type mismatches, missing fields |
| Service ↔ Database | Format conversions, null handling |
| Backend ↔ Frontend | Serialization, date formats |
| Component ↔ Component | Props shape changes |

### Step 3: Define Contracts

For each boundary:
- What is the exact input format?
- What is the exact output format?
- What errors can occur?

---

## Common Cross-Layer Mistakes

### Mistake 1: Implicit Format Assumptions

**Bad**: Assuming date format without checking

**Good**: Explicit format conversion at boundaries

### Mistake 2: Scattered Validation

**Bad**: Validating the same thing in multiple layers

**Good**: Validate once at the entry point

### Mistake 3: Leaky Abstractions

**Bad**: Component knows about database schema

**Good**: Each layer only knows its neighbors

---

## Checklist for Cross-Layer Features

Before implementation:
- [ ] Mapped the complete data flow
- [ ] Identified all layer boundaries
- [ ] Defined format at each boundary
- [ ] Decided where validation happens

After implementation:
- [ ] Tested with edge cases (null, empty, invalid)
- [ ] Verified error handling at each boundary
- [ ] Checked data survives round-trip

---

## When to Create Flow Documentation

Create detailed flow docs when:
- Feature spans 3+ layers
- Multiple teams are involved
- Data format is complex
- Feature has caused bugs before

---

## Parallel Development Conflict Zones

When running parallel worktree agents, some files are high-conflict due to being modified by multiple independent tasks. Plan merge order accordingly.

### High-Conflict Files

| File | Why | Typical Changes |
|------|-----|----------------|
| `src/stores/sectStore/tickSlice.ts` | Central game loop — all tick-driven features modify this | New tick phases, milestone triggers, event system integration |
| `src/stores/sectStore/characterSlice.ts` | Character lifecycle — recruitment, milestones, path assignment | New milestone triggers, narrative text updates |
| `src/stores/adventureStore.ts` | Adventure lifecycle — run management, rewards, milestones | Narrative text, milestone triggers |
| `src/stores/eventLogStore.ts` | Event types — any new game event adds to EventType union | New event type string literals |
| `src/types/sect.ts` | Sect interface — any new persistent field | New fields, extended union types |

### Strategy

1. **Merge least-overlapping branches first** (data-only changes like content pools)
2. **Expect text conflicts** in event messages when narrative and milestone tasks overlap
3. **Use narrative-style text** as the canonical version when resolving event message conflicts
