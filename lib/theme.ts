// Map the original built-in swatches to the family palette without changing
// saved category records. Custom category colors remain available.
const categoryPalette: Record<string, string> = {
  "#297665": "#cf192b",
  "#36796a": "#cf192b",
  "#80a68a": "#706f69",
  "#a6ba98": "#8e8f87",
  "#e1b67c": "#c8b9a1",
  "#8b9fc4": "#b9a9c1",
  "#cd9088": "#d68b83",
};

export function categoryColor(color?: string): string {
  return color ? (categoryPalette[color.toLowerCase()] ?? color) : "#cf192b";
}
