// OpenRouter `cost` is in USD-equivalent credits. Show enough digits to be
// meaningful at small spends without spamming zeros at large ones.
export function formatCost(credits: number): string {
  if (credits === 0) return "$0";
  if (credits < 0.01) return `$${credits.toFixed(4)}`;
  if (credits < 1) return `$${credits.toFixed(3)}`;
  return `$${credits.toFixed(2)}`;
}
