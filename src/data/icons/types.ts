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
  '4': '#5f7a8d', // mist ink accent
  '5': '#445b6d', // deep ink accent
  '6': '#d3dde6', // pale border mist
  '7': '#f3f7f8', // paper mist
  '0': '#fbfdff', // highlight white
  // quality / element colors
  '8': '#60a5fa', // spirit blue
  '9': '#a78bfa', // immortal purple
  a: '#f59e0b', // divine gold
  b: '#ef4444', // chaos red / fire
  c: '#4f7a74', // green (healing / nature)
  d: '#4a9eff', // light blue
  e: '#b58b62', // muted warning
}

export interface PixelIconDef {
  /** 12 rows × 12 cols, each char indexes into PALETTE (+ per-icon overrides) */
  grid: string[]
  /** Optional extra color mappings merged on top of PALETTE */
  palette?: Record<string, string>
}
