export function formatCost(credits: number): string {
  if (credits === 0) return "$0";
  if (credits < 0.01) return "< $0.01";
  return `$${credits.toFixed(2)}`;
}
