import { useMemo } from 'react';
import { encode } from 'uqr';

/**
 * QRCodeDisplay — renders a QR code as React SVG elements.
 * uqr.encode() returns { data: boolean[][], size: number }
 */
export default function QRCodeDisplay({ value, size = 160, darkColor = '#000000', lightColor = '#ffffff' }) {
  const cells = useMemo(() => {
    if (!value) return null;
    try {
      const result = encode(value, { ecc: 'M' });
      // result.data is boolean[][] — rows of columns
      return { rows: result.data, modules: result.size };
    } catch (e) {
      console.error('QR encode error:', e);
      return null;
    }
  }, [value]);

  if (!cells) return null;

  const { rows, modules } = cells;
  const cellSize = size / modules;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR Code"
      style={{ display: 'block', borderRadius: 8 }}
    >
      <rect width={size} height={size} fill={lightColor} />
      {rows.map((row, rowIdx) =>
        row.map((isDark, colIdx) =>
          isDark ? (
            <rect
              key={`${rowIdx}-${colIdx}`}
              x={colIdx * cellSize}
              y={rowIdx * cellSize}
              width={cellSize}
              height={cellSize}
              fill={darkColor}
            />
          ) : null
        )
      )}
    </svg>
  );
}
