# Parallel Development (Worktree) Thinking Guide

> **Purpose**: Checklist for parallel agent development using git worktrees.

---

## Before Starting Parallel Work

- [ ] **Format master first** — Run `npm run format` on master before branching. Agents running format on their own branch can produce 200+ file diffs unrelated to their actual changes.
- [ ] **Identify independent files** — Each parallel task should touch disjoint file sets. If two tasks modify the same file, the merge will conflict.
- [ ] **Check `python` vs `python3`** — Windows systems may only have `python` (not `python3`). Use `python` in all scripts.

---

## During Development

- [ ] **Verify agent output** — Agents may report success but leave features unimplemented. After each agent finishes, read the actual changed files and compare against PRD.
- [ ] **Agent reformats are noise** — If an agent ran `npm run format`, the diff includes all project files. Cherry-pick only functional changes when merging.
- [ ] **Exclude worktree directories from vitest** — Add `.claude/**` to `vitest.config.ts` `test.exclude` to prevent worktree test files from polluting test runs.

---

## After Merge

- [ ] **TypeScript errors after merge** — When merging files from different agents, check that all cross-references are consistent (e.g., if agent A added a type field, agent B's code using that field must handle the new shape).
- [ ] **Run full typecheck** — `npx tsc -b` to catch cross-agent integration issues.
- [ ] **Run full test suite** — `npx vitest run` to catch test pollution from worktrees.

---

## Common Mistakes

1. **Trusting agent completion reports** — Agents say "done" but may have skipped implementation steps. Always verify file contents.
2. **Merging format-only changes** — An agent that reformatted the codebase creates massive diffs. Focus on functional file changes only.
3. **Missing cross-agent type consistency** — If two agents modify related types (e.g., one adds `level` to Character, another uses `character.level`), verify the final merged state is consistent.
4. **Test fixture sync after type changes** — When parallel agents add required fields to shared types, ALL test files (not just the agent's own tests) need updating. Run full `vitest run` after merge, not just the changed agent's tests.
5. **Shared type files are merge conflict magnets** — If multiple agents modify `src/types/character.ts` or `src/types/index.ts`, expect conflicts. Strategy: let one agent own type definitions, others consume them.
6. **`git stash pop` conflicts in tsconfig.tsbuildinfo** — Binary/generated files like `tsconfig.tsbuildinfo` often conflict on stash pop after worktree merge. Use `git checkout --theirs` to resolve.
