import { useMemo } from 'react';
import { encode } from 'uqr';

/**
 * Lightweight QR code component — uses `uqr` (pure ESM, no React peer dep issues).
 * Renders a clean SVG QR code.
 */
export default function QRCodeDisplay({ value, size = 160, color = 'currentColor', bg = 'transparent' }) {
  const svgContent = useMemo(() => {
    if (!value) return null;
    try {
      const result = encode(value, { ecc: 'M' });
      const { data, size: modules } = result;
      const cellSize = size / modules;
      const rects = [];

      for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
          if (data[row * modules + col]) {
            rects.push(
              `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}"/>`
            );
          }
        }
      }

      return `<rect width="${size}" height="${size}" fill="${bg}"/>${rects.join('')}`;
    } catch {
      return null;
    }
  }, [value, size, color, bg]);

  if (!svgContent) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR Code"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
