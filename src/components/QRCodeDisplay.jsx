import { useMemo } from 'react';
import { encode } from 'uqr';

/**
 * QRCodeDisplay — renders a QR code as a proper React SVG (no dangerouslySetInnerHTML).
 * Uses uqr to compute the matrix, then maps to <rect> elements.
 */
export default function QRCodeDisplay({ value, size = 160, darkColor = '#000000', lightColor = '#ffffff' }) {
  const cells = useMemo(() => {
    if (!value) return null;
    try {
      const result = encode(value, { ecc: 'M' });
      return { data: result.data, modules: result.size };
    } catch (e) {
      console.error('QR encode error:', e);
      return null;
    }
  }, [value]);

  if (!cells) return null;

  const { data, modules } = cells;
  const cellSize = size / modules;

  const rects = [];
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (data[row * modules + col]) {
        rects.push(
          <rect
            key={`${row}-${col}`}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill={darkColor}
          />
        );
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR Code"
      style={{ display: 'block' }}
    >
      <rect width={size} height={size} fill={lightColor} />
      {rects}
    </svg>
  );
}
