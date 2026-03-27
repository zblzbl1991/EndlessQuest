/**
 * Global pixel palette — single-char keys mapping to CSS colors.
 * Every icon grid references these chars; icons may add per-icon overrides.
 */
export const PALETTE: Record<string, string> = {
  // transparent placeholder (skip in render)
  '.': '',
  // ink-wash core
  '1': '#2c2c2c', // ink (outlines, main dark)
  '2': '#6b6b6b', // gray (shadows)
  '3': '#9ca3af', // light gray (muted elements)
  '4': '#8b4513', // ochre (accent)
  '5': '#a0522d', // dark ochre
  '6': '#c4b5a0', // tan (borders, wood)
  '7': '#f5f0e8', // paper (bg fill)
  '0': '#faf6ef', // white (highlights)
  // quality / element colors
  '8': '#60a5fa', // spirit blue
  '9': '#a78bfa', // immortal purple
  'a': '#f59e0b', // divine gold
  'b': '#ef4444', // chaos red / fire
  'c': '#2d6a4f', // green (healing / nature)
  'd': '#4a9eff', // light blue
  'e': '#e67e22', // orange (warning)
};

export interface PixelIconDef {
  /** 12 rows × 12 cols, each char indexes into PALETTE (+ per-icon overrides) */
  grid: string[];
  /** Optional extra color mappings merged on top of PALETTE */
  palette?: Record<string, string>;
}
