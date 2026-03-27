import type { CSSProperties, ReactNode } from 'react';
import { pixelIcons } from '../../data/icons';
import { PALETTE } from '../../data/icons/types';

export interface PixelIconProps {
  /** Icon name from the pixel icon registry */
  name: string;
  /** Render size in px (default 24) */
  size?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

export function PixelIcon({ name, size = 24, className, style, 'aria-label': ariaLabel }: PixelIconProps): ReactNode {
  const def = pixelIcons[name];
  if (!def) return null;

  const palette = { ...PALETTE, ...def.palette };
  const rects: ReactNode[] = [];

  for (let y = 0; y < def.grid.length; y++) {
    const row = def.grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const fill = palette[ch];
      if (!fill) continue;
      rects.push(
        <rect key={`${x},${y}`} x={x * 2} y={y * 2} width={2} height={2} fill={fill} />
      );
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      className={className}
      style={{ imageRendering: 'pixelated', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      role="img"
      aria-label={ariaLabel ?? name}
    >
      {rects}
    </svg>
  );
}
