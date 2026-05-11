/**
 * Placeholder Color Generator
 * Creates colored rectangles as empty state for missing images
 */

export const PLACEHOLDER_COLORS = [
  { name: 'maroon', color: '#633D4D' },      // Pink 100 - Nordstrom Brand Color
  { name: 'forest', color: '#0D4131' },      // Green 100 - Nordstrom Brand Color
  { name: 'rust', color: '#571610' },        // Red 100 - Nordstrom Brand Color
  { name: 'camel', color: '#614E27' },       // Camel 100 - Nordstrom Brand Color
  { name: 'slate', color: '#1B2C6D' },       // Blue 100 - Nordstrom Brand Color
];

/**
 * Get a flat color for a given index
 * Rotates through the available placeholder colors
 */
export function getGradientForIndex(index: number): string {
  const colorObj = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  return colorObj.color;
}

/**
 * Get a flat color based on pillar name (deterministic)
 */
export function getGradientForPillar(pillarName: string): string {
  const pillarHash = pillarName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = pillarHash % PLACEHOLDER_COLORS.length;
  return getGradientForIndex(index);
}

/**
 * Create a data URL for an SVG solid color rectangle
 * Can be used as img src for better compatibility
 */
export function getGradientDataUrl(index: number, width = 800, height = 1000): string {
  const colorObj = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${colorObj.color}" />
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
