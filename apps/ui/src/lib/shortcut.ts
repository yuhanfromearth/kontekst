import { detectIsMac } from "./platform";

function modName(): string {
  return detectIsMac() ? "Cmd" : "Ctrl";
}

export function shortcutHint(): string {
  const mod = modName();
  return `Single letter/number (a, 1), combination (a+b), or ${mod}+letter/number (${mod.toLowerCase()}+a)`;
}

export function shortcutValidationError(): string {
  const mod = modName();
  return `Invalid shortcut. Only letters, numbers, combinations (a+b), or ${mod}+letter/number (${mod.toLowerCase()}+a) are allowed.`;
}

export function isValidShortcut(sc: string): boolean {
  if (!sc) return true;
  if (/^(cmd|ctrl)\+[a-z0-9]$/i.test(sc)) return true;
  if (/^[a-z0-9](\+[a-z0-9])*$/i.test(sc)) return true;
  return false;
}
